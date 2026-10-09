import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Store} from '../server/store.mjs';
import {emptyState,makeServer} from '../server/index.mjs';
import {ImplementsStore} from '../server/implements-store.mjs';
import {PlanningStore} from '../server/planning-store.mjs';
import {blankState,ensureMonthly,calculateMRP} from '../shared/implements/domain.mjs';
import {technicalWorkspace} from '../shared/bom-management.mjs';
function setup(){
 const dir=mkdtempSync(join(tmpdir(),'fh-planning-')),main=emptyState();main.users.push(...[
  {id:'planner',name:'Planner One',role:'PLAN_OPERATOR',scopes:['IMPLEMENTS_PLANNING','IMPLEMENTS_DOMESTIC','LAE_IMPORT','BOM_MANAGEMENT','PRODUCTION_MANAGEMENT']},
  {id:'planner2',name:'Planner Two',role:'PLAN_OPERATOR',scopes:['IMPLEMENTS_PLANNING']},
  {id:'manager',name:'Purchase Manager',role:'MANAGER',scopes:['IMPLEMENTS_DOMESTIC']},
  {id:'executive',name:'Purchase Executive',role:'EXECUTIVE',scopes:['IMPLEMENTS_DOMESTIC','IMPLEMENTS_PLANNING']},
  {id:'technical',name:'Technical Manager',role:'MANAGER',scopes:['BOM_MANAGEMENT']},
  {id:'viewer',name:'Viewer',role:'VIEWER',scopes:['IMPLEMENTS_PLANNING']}
 ].map(u=>({...u,active:true})));
 const store=new Store(join(dir,'test.sqlite'),main),source=new ImplementsStore(store);
 for(const u of main.users)store.addAccount(u.id,u.id+'@example.test','Isolated-planning-password');
 const state=ensureMonthly(blankState({version:'test',parts:[{id:'bolt',code:'IMP-1',name:'Bolt',rate:99887,supplier:'v',category:'Fasteners',fabricated:false}],suppliers:[{id:'v',name:'Confidential supplier'}],models:['S2.V12','S2.V50'].map((id,i)=>({id,name:'Leader',series:'Leader',configuration:'Test '+id,frame:'L',size:i?'7FT':'6FT',blades:42,speed:'SS',salesConfirmed:!i,bomAvailable:true,revision:4,lines:[{partId:'bolt',ppm:2}],fabrication:[],fabricationCode:'',fabricationSupplier:'',costs:{Assembly:1500},history:[]}))}),'2026-10');
 state.plan={'S2.V12':3};state.monthlyPlans['2026-10']={...state.plan};state.stock={bolt:{qty:5,asOf:'2026-10-09'}};source.save({state,expectedRevision:0,requestId:randomUUID(),message:'Isolated fixture'},'admin');
 const module=new PlanningStore(store,source);
 const command=(actor,type,extra={})=>module.command(actor,{type,expectedVersion:0,requestId:randomUUID(),note:'Confirmed monthly demand',month:'2026-11',plan:{'S2.V12':4},...extra});
 return {dir,store,source,module,command,close(){store.close();rmSync(dir,{recursive:true,force:true});}};
}
test('draft and submitted monthly plans are separate; approval changes only the selected month and is safely replayed',()=>{const f=setup();try{
 const before=f.source.read(),technical=technicalWorkspace(before),draft=f.command('planner','SAVE_DRAFT',{note:'Monthly demand\nReviewed with production'}).record;
 assert.deepEqual(f.source.read(),before);assert.equal(draft.status,'DRAFT');assert.equal(draft.note,'Monthly demand\nReviewed with production');
 const pending=f.command('planner','SUBMIT',{id:draft.id,expectedVersion:1,plan:{'S2.V12':7,'S2.V50':2}}).record;assert.equal(pending.status,'PENDING');assert.deepEqual(f.source.read(),before);
 const input={type:'APPROVE',id:pending.id,expectedVersion:2,requestId:randomUUID(),note:'Purchase demand approved'};
 const approved=f.module.command('manager',input).record,after=f.source.read();assert.equal(approved.status,'APPROVED');assert.deepEqual(after.monthlyPlans['2026-11'],{'S2.V12':7,'S2.V50':2});assert.deepEqual(after.plan,before.plan);
 for(const k of Object.keys(before))if(!['monthlyPlans','revision','audit'].includes(k))assert.deepEqual(after[k],before[k],k);assert.deepEqual(technicalWorkspace(after).models,technical.models);
 assert.equal(calculateMRP(after,'2026-11').rows[0].demand,18);
 assert.equal(f.module.command('manager',input).replayed,true);assert.deepEqual(f.source.read(),after);assert.throws(()=>f.module.command('manager',{...input,note:'Changed payload'}),/Request or account access/);
 assert.throws(()=>f.store.db.prepare('DELETE FROM implements_plan_events').run(),/append-only/);
}finally{f.close();}});
test('owners retain their own requests; costs and suppliers never appear in planning projections; executives cannot approve',()=>{const f=setup();try{
 const r=f.command('planner','SUBMIT').record;assert.equal(f.module.read('planner2').total,0);assert.throws(()=>f.module.detail('planner2',r.id),/Plan not found/);assert.equal(f.module.read('manager').total,1);assert.equal(f.module.read('planner').requests.length,1);
 const raw=JSON.stringify(f.module.read('planner'));for(const secret of ['99887','Confidential supplier','Assembly','fabrication','costs','stock','priceHistory'])assert(!raw.includes(secret),secret);
 assert.throws(()=>f.command('executive','APPROVE',{id:r.id,expectedVersion:1}),/Purchase Manager or Administrator/);assert.throws(()=>f.command('planner','APPROVE',{id:r.id,expectedVersion:1}),/Purchase Manager or Administrator/);
 assert.throws(()=>f.command('viewer','SUBMIT'),/Plan entry access/);assert.throws(()=>f.module.read('technical'),/Monthly plan entry access/);
 assert.throws(()=>f.command('manager','SAVE_DRAFT',{id:r.id,expectedVersion:1}),/Only the owner/);
}finally{f.close();}});
test('stale approved-month baseline blocks overwrite; manager returns and owner resubmits current quantities',()=>{const f=setup();try{
 const r=f.command('planner','SUBMIT',{month:'2026-10',plan:{'S2.V12':7}}).record;
 const next=f.source.read();next.plan={'S2.V12':5};next.monthlyPlans['2026-10']={...next.plan};f.source.save({state:next,expectedRevision:next.revision,requestId:randomUUID(),message:'Existing manager changes month'},'manager');const baseline=f.source.read();
 assert.throws(()=>f.command('manager','APPROVE',{id:r.id,expectedVersion:1}),/monthly plan changed/);assert.deepEqual(f.source.read(),baseline);assert.equal(f.module.detail('planner',r.id).status,'PENDING');
 const returned=f.command('manager','RETURN',{id:r.id,expectedVersion:1}).record;assert.equal(returned.status,'RETURNED');
 const submitted=f.command('planner','SUBMIT',{id:r.id,expectedVersion:2,month:'2026-10',plan:{'S2.V12':8}}).record;assert.deepEqual(submitted.baselinePlan,{'S2.V12':5});
 f.command('admin','APPROVE',{id:r.id,expectedVersion:3});assert.deepEqual(f.source.read().plan,{'S2.V12':8});assert.equal(f.module.detail('planner',r.id).history.length,4);
}finally{f.close();}});
test('validation and production safeguards roll back without touching stock, BOM or historical costs',()=>{const f=setup();try{
 const before=f.source.read();for(const plan of [{'UNKNOWN':2},{'S2.V12':1.5},{'S2.V12':-1},{'S2.V12':100001},{}])assert.throws(()=>f.command('planner','SUBMIT',{plan}));assert.throws(()=>f.command('planner','SUBMIT',{costs:{Assembly:0}}),/Invalid planning command/);
 assert.deepEqual(f.source.read(),before);const next=f.source.read();next.productionConsumed={'2026-11':{'S2.V12':3}};f.store.db.prepare('UPDATE implements_workspace SET payload=? WHERE id=1').run(JSON.stringify(next));
 const r=f.command('planner','SUBMIT',{plan:{'S2.V50':1}}).record;assert.throws(()=>f.command('admin','APPROVE',{id:r.id,expectedVersion:1}),/already completed/);assert.deepEqual(f.source.read(),next);
}finally{f.close();}});
test('planner HTTP access, CSRF, authentication and commercial denial remain server authoritative',async()=>{const f=setup(),server=makeServer(f.store,{log:()=>{}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;let cookie='',csrf='';
 async function call(path,input){const res=await fetch(base+path,{redirect:'manual',method:input?'POST':'GET',headers:{Origin:base,Cookie:cookie,'X-CSRF-Token':csrf,'Content-Type':'application/json'},body:input?JSON.stringify(input):undefined});return {status:res.status,value:res.headers.get('content-type')?.includes('json')?await res.json():await res.text(),cookie:res.headers.get('set-cookie')?.split(';')[0]};}
 try{assert.equal((await call('/api/planning/workspace')).status,401);const l=await call('/api/login',{email:'planner@example.test',password:'Isolated-planning-password'});cookie=l.cookie;
 const boot=await call('/api/bootstrap');assert.equal(boot.value.state.users.length,1);assert.equal(boot.value.state.users[0].id,'planner');assert.equal(boot.value.state.orders.length,0);for(const [key,value] of Object.entries(boot.value.state))if(Array.isArray(value)&&key!=='users')assert.equal(value.length,0,key+' must not expose seeded master data');
 const view=await call('/api/planning/workspace');assert.equal(view.status,200);assert.equal(view.value.canApprove,false);assert.equal((await call('/planning/')).status,200);
 for(const path of ['/implements/','/api/implements/workspace','/bom/','/api/bom-management/workspace','/production/','/api/production/workspace','/api/ro-costings','/api/landing-prices','/api/landing-prices/export.xlsx','/api/landing-prices/export.pdf'])assert.equal((await call(path)).status,403,path);
 const input={type:'SUBMIT',month:'2026-11',plan:{'S2.V12':4},note:'Monthly plan',requestId:randomUUID(),expectedVersion:0};assert.equal((await call('/api/planning/commands',input)).status,403);csrf=view.value.csrf;assert.equal((await call('/api/planning/commands',input)).status,200);
 }finally{await new Promise(r=>server.close(r));f.close();}
});
