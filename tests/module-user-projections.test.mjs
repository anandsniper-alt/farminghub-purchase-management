import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Store} from '../server/store.mjs';
import {emptyState,makeServer} from '../server/index.mjs';
import {ImplementsStore} from '../server/implements-store.mjs';
import {BomManagementStore} from '../server/bom-management-store.mjs';
import {PlanningStore} from '../server/planning-store.mjs';
import {blankState,ensureMonthly} from '../shared/implements/domain.mjs';
import {createNavigation} from '../web/navigation.mjs';

const managerScopes=['UTILITY_DOMESTIC','IMPLEMENTS_DOMESTIC','BOM_MANAGEMENT','PRODUCTION_MANAGEMENT'];
const plannerScopes=['IMPLEMENTS_PLANNING',...managerScopes,'LAE_IMPORT','LAE_DOMESTIC'];
const sidebar=user=>createNavigation({context:()=>({user,ui:{view:'home'}}),esc:String,icon:()=>'',logo:'/logo.png'}).sidebar();
async function fixture(){
 const dir=mkdtempSync(join(tmpdir(),'fh-module-projection-')),seed=emptyState();
 seed.users.push({id:'manager',name:'Cross-module manager',role:'MANAGER',active:true,scopes:managerScopes},{id:'planner',name:'Monthly planner',role:'PLAN_OPERATOR',active:true,scopes:plannerScopes});
 const store=new Store(join(dir,'test.sqlite'),seed);
 for(const actor of seed.users)store.addAccount(actor.id,actor.id+'@example.test','Isolated-projection-password');
 const source=new ImplementsStore(store),state=ensureMonthly(blankState({version:'test',parts:[{id:'bolt',code:'IMP-1',name:'Bolt',uom:'pcs',rate:99887,supplier:'private-vendor',fabricated:false}],suppliers:[{id:'private-vendor',name:'Private supplier sentinel'}],models:[{id:'S2.V12',name:'Leader',series:'Leader',configuration:'Test model',frame:'L',size:'6FT',blades:42,speed:'SS',salesConfirmed:true,bomAvailable:true,revision:1,lines:[{partId:'bolt',ppm:2}],fabrication:[],costs:{Assembly:1500},history:[]}]}),'2026-10');
 state.plan={'S2.V12':3};state.monthlyPlans[state.activeMonth]={...state.plan};
 source.save({state,expectedRevision:0,requestId:randomUUID(),message:'Isolated projection fixture'},'admin');
 const server=makeServer(store,{log:()=>{}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const call=async(path,cookie='',data)=>{const response=await fetch(base+path,{method:data?'POST':'GET',headers:{Origin:base,Cookie:cookie,'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};};
 const login=async id=>(await call('/api/login','',{email:id+'@example.test',password:'Isolated-projection-password'})).cookie;
 return {store,source,call,login,close:async()=>{await new Promise(resolve=>server.close(resolve));store.close();rmSync(dir,{recursive:true,force:true});}};
}

test('real BOM, Production and Planning responses preserve manager navigation grants without changing stored profiles',async()=>{
 const f=await fixture();try{
  const cookie=await f.login('manager'),before=f.store.read();
  for(const path of ['/api/bom-management/workspace','/api/production/workspace','/api/planning/workspace']){
   const result=await f.call(path,cookie);assert.equal(result.status,200,path);
   assert.deepEqual(result.data.user.scopes,managerScopes,path);
   assert.deepEqual(Object.keys(result.data.user).sort(),['id','name','role','scopes'],path);
   const navigation=sidebar(result.data.user);
   for(const destination of ['price-workings','implements-purchase','bom-management','production-stock','monthly-planning'])assert.ok(navigation.includes('value="'+destination+'"'),path+' '+destination);
  }
  assert.deepEqual(f.store.read(),before);
 }finally{await f.close();}
});

test('Planning response preserves planner grants while role enforcement keeps navigation and data cost-free',async()=>{
 const f=await fixture();try{
  const cookie=await f.login('planner'),before=f.store.read(),result=await f.call('/api/planning/workspace',cookie);
  assert.equal(result.status,200);assert.deepEqual(result.data.user.scopes,plannerScopes);
  assert.equal(result.data.canSubmit,true);assert.equal(result.data.canApprove,false);
  const navigation=sidebar(result.data.user);assert.ok(navigation.includes('value="monthly-planning"'));
  for(const destination of ['price-workings','implements-purchase','bom-management','production-stock','vms'])assert.ok(!navigation.includes('value="'+destination+'"'),destination);
  for(const secret of ['99887','Private supplier sentinel','Assembly','private-vendor'])assert.ok(!JSON.stringify(result.data).includes(secret),secret);
  for(const path of ['/api/bom-management/workspace','/api/production/workspace','/api/implements/workspace','/api/utility-prices/workspace'])assert.equal((await f.call(path,cookie)).status,403,path);
  assert.deepEqual(f.store.read(),before);
 }finally{await f.close();}
});

test('workspace navigation grants never widen persisted BOM or Planning actor snapshots',async()=>{
 const f=await fixture();try{
  const bom=new BomManagementStore(f.store,f.source),planning=new PlanningStore(f.store,f.source),before=f.store.read();
  bom.command('manager',{type:'MARK_CHECKED',modelId:'S2.V12',expectedRevision:f.source.read().revision,expectedReviewRevision:0,requestId:randomUUID(),reason:'Physical specification checked'});
  assert.deepEqual(bom.records()[0].createdBy.scopes,['BOM_MANAGEMENT']);
  const saved=planning.command('planner',{type:'SAVE_DRAFT',month:'2026-11',plan:{'S2.V12':4},expectedVersion:0,requestId:randomUUID(),note:'Confirmed monthly demand'}).record;
  assert.deepEqual(Object.keys(saved.owner).sort(),['id','name','role']);
  assert.deepEqual(Object.keys(saved.history[0].by).sort(),['id','name','role']);
  const event=JSON.parse(f.store.db.prepare('SELECT payload FROM implements_plan_events').get().payload);
  assert.deepEqual(Object.keys(event.by).sort(),['id','name','role']);
  assert.deepEqual(f.store.read(),before);
 }finally{await f.close();}
});
