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
import {blankState,ensureMonthly,createOrders} from '../shared/implements/domain.mjs';
import {technicalWorkspace,technicalIssues} from '../shared/bom-management.mjs';
const fixture=()=>{
 const s=ensureMonthly(blankState({version:'test',parts:[{id:'p',code:'IMP-1',name:'Bolt',category:'Fasteners',uom:'pcs',rate:123456.78,supplier:'v',fabricated:false,priceHistory:[{secret:'purchase-price-history'}],source:'secret-price-source'},{id:'grease',code:'IMP-2',name:'Grease',uom:'kg',rate:258.75,supplier:'v'}],suppliers:[{id:'v',name:'Confidential supplier'}],models:[{id:'S2.V58',series:'Leader',name:'Leader',configuration:'S2-V-ELITE-7FT-48-MS-OB-CEN',frame:'V',size:'7FT',blades:48,speed:'MS',bladeOrientation:'OB',gearboxOrientation:'CEN',salesConfirmed:true,revision:1,history:[{secret:'financial-model-history'}],notes:'secret-cost-note',bomAvailable:true,lines:[{partId:'p',ppm:4,source:'secret-source-rate'}],fabrication:[{partId:'fp',name:'Namaste patta',code:'FP1',drawingCode:'FP10',ppm:4,weight:2.2,source:'secret-weight-rate'},{partId:'source-row-33',name:'Shield',ppm:1,weight:null}],fabricationCode:'FAB-1',fabricationSupplier:'v',syntaxWeight:2.2,costs:{Assembly:1500}}]}));
 s.settings.fabricationRate=125;s.settings.fabricationTransportRate=1.5;s.plan={'S2.V58':1};s.monthlyPlans[s.activeMonth]=s.plan;s.orders=createOrders(s,['p'],{date:'2026-10-02',quantityOnly:false});s.priceImports=[{secret:'price-import-history'}];s.sourceFlags=[{secret:'cost-comparison'}];return s;
};
async function setup(){const dir=mkdtempSync(join(tmpdir(),'fh-bom-')),s=emptyState();s.users.push({id:'production',name:'Production',role:'BOM_REVIEWER',active:true,scopes:['BOM_MANAGEMENT','IMPLEMENTS_DOMESTIC','LAE_IMPORT','LAE_DOMESTIC']},{id:'viewer',name:'Viewer',role:'VIEWER',active:true,scopes:['BOM_MANAGEMENT']},{id:'manager',name:'Technical manager',role:'MANAGER',active:true,scopes:['BOM_MANAGEMENT']},{id:'purchase',name:'Purchase',role:'MANAGER',active:true,scopes:['IMPLEMENTS_DOMESTIC']});
 const store=new Store(join(dir,'test.sqlite'),s);for(const u of s.users)store.addAccount(u.id,u.id+'@example.test','Isolated-review-password');
 const source=new ImplementsStore(store);source.save({state:fixture(),message:'Isolated fixture',expectedRevision:0,requestId:randomUUID()},'admin');const module=new BomManagementStore(store,source),server=makeServer(store,{log:()=>{}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const call=async(path,session={},data)=>{const res=await fetch(base+path,{method:data?'POST':'GET',redirect:'manual',headers:{Origin:base,Cookie:session.cookie||'','X-CSRF-Token':session.csrf||'','Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});return {status:res.status,data:res.headers.get('content-type')?.includes('application/json')?await res.json():await res.text(),cookie:res.headers.get('set-cookie')?.split(';')[0]};};
 const login=async id=>{const r=await call('/api/login',{}, {email:id+'@example.test',password:'Isolated-review-password'}),b=await call('/api/bootstrap',{cookie:r.cookie});return {cookie:r.cookie,csrf:b.data.csrf};};
 const command=(actor,type,extra={})=>module.command(actor,{type,modelId:'S2.V58',expectedRevision:source.read().revision,expectedReviewRevision:module.revision(),requestId:randomUUID(),reason:'Physical specification checked',...extra});
 return {dir,store,source,module,call,login,command,close:async()=>{await new Promise(r=>server.close(r));store.close();rmSync(dir,{recursive:true,force:true});}};
}
const secrets=['123456.78','purchase-price-history','secret-price-source','financial-model-history','secret-cost-note','secret-source-rate','secret-weight-rate','price-import-history','cost-comparison','Confidential supplier','flag-financial-note'];
test('production role cannot retrieve costs through workspace, purchase APIs, static purchasing module or exports even with accidental purchase scopes',async()=>{const f=await setup();try{const reviewer=await f.login('production'),purchase=await f.login('purchase');
 assert.equal((await f.call('/api/bom-management/workspace')).status,401);
 assert.equal((await f.call('/api/bom-management/workspace',purchase)).status,403);
 const data=await f.call('/api/bom-management/workspace',reviewer);assert.equal(data.status,200);assert.equal(data.data.models[0].lines[0].ppm,4);assert.equal(data.data.canApprove,false);assert.equal(data.data.canReview,true);const raw=JSON.stringify(data.data);for(const value of secrets)assert.ok(!raw.includes(value),value);
 for(const key of ['rate','costs','priceHistory','history','supplier','settings','orders','sourceFlags'])assert.ok(!Object.hasOwn(data.data.models[0],key)&&!Object.hasOwn(data.data.parts[0],key),key);
 for(const path of ['/api/implements/workspace','/implements/','/implements/app.mjs','/shared/implements/costing.mjs','/api/ro-costings'])assert.equal((await f.call(path,reviewer)).status,403,path);
 for(const path of ['/api/implements/export/items','/api/implements/export/costing','/api/implements/export/xlsx','/api/admin/recovery'])assert.equal((await f.call(path,reviewer,{})).status,403,path);
 const bootstrap=await f.call('/api/bootstrap',reviewer);for(const key of ['orders','items','vendors','costs','payments','priceLists','domesticItems','domesticPriceLists'])assert.equal(bootstrap.data.state[key].length,0,key);
 for(const kind of ['bom','syntax','flags','reviews']){const exported=await f.call('/api/bom-management/export/'+kind,reviewer,{});assert.equal(exported.status,200);for(const value of secrets)assert.ok(!exported.data.includes(value),kind+' '+value);}
 assert.equal((await f.call('/bom/app.mjs',reviewer)).status,200);assert.equal((await f.call('/bom/assets/parts/photos/hex-bolt.jpg',reviewer)).status,200);
 }finally{await f.close();}});
test('corrections remain pending, approval is authoritative and atomic, and all financial records and other modules are preserved',async()=>{const f=await setup();try{const main=f.store.read(),before=f.source.read();
 f.command('production','SUBMIT_CORRECTION',{draft:{lines:[{partId:'p',ppm:6},{partId:'grease',ppm:.225}]}});assert.deepEqual(f.source.read(),before);const review=f.module.records()[0];assert.equal(review.status,'PENDING');
 assert.throws(()=>f.command('production','APPROVE',{reviewId:review.id}),/administrator or BOM manager/);
 f.command('manager','APPROVE',{reviewId:review.id});const after=f.source.read();assert.equal(after.models[0].lines[0].ppm,6);assert.equal(after.models[0].lines[1].ppm,.225);assert.equal(after.models[0].revision,2);assert.deepEqual(after.models[0].costs,before.models[0].costs);for(const key of Object.keys(before))if(!['revision','audit','models'].includes(key))assert.deepEqual(after[key],before[key],key);assert.deepEqual(f.store.read(),main);assert.equal(f.module.records()[0].status,'APPROVED');assert.ok(!JSON.stringify(f.module.read('production')).includes('secret'));
 assert.throws(()=>f.command('manager','APPROVE',{reviewId:review.id}),/no longer pending/);
 assert.throws(()=>f.store.db.exec('DELETE FROM bom_review_events'),/append-only/);
 }finally{await f.close();}});
test('price fields and payload tampering are rejected, CSRF is required, and read-only users cannot submit checks',async()=>{const f=await setup();try{const before=f.source.read();
 for(const draft of [{rate:1},{costs:{Assembly:1}},{syntax:{rate:1}},{lines:[{partId:'p',ppm:4,rate:1}]},{fabrication:[{partId:'fp',name:'Patta',ppm:4,weight:2.2,rate:1}]},{lines:[{partId:'p',ppm:4.5}]},{newModelId:'S2.V99'}])assert.throws(()=>f.command('production','SUBMIT_CORRECTION',{draft}));
 assert.deepEqual(f.source.read(),before);assert.equal(f.module.records().length,0);
 const reviewer=await f.login('production');assert.equal((await f.call('/api/bom-management/commands',{cookie:reviewer.cookie},{type:'MARK_CHECKED'})).status,403);
 assert.throws(()=>f.command('viewer','MARK_CHECKED'),/cannot submit/);
 const changed=structuredClone(before);changed.models[0].costs.Assembly=1;assert.throws(()=>f.source.save({state:changed,expectedRevision:before.revision,requestId:randomUUID(),message:'Injected cost'},'manager',{technical:true}),/financial/);
 assert.deepEqual(f.source.read(),before);
 }finally{await f.close();}});
test('stale technical proposals fail without partial updates; price-only changes do not erase proposed technical corrections',async()=>{const f=await setup();try{
 f.command('production','SUBMIT_CORRECTION',{draft:{syntax:{size:'6FT'}}});const review=f.module.records()[0];let s=f.source.read();s.parts[0].rate=99;f.source.save({state:s,expectedRevision:s.revision,requestId:randomUUID(),message:'Price change'},'admin');f.command('manager','APPROVE',{reviewId:review.id});assert.equal(f.source.read().parts[0].rate,99);
 f.command('production','SUBMIT_CORRECTION',{draft:{syntax:{size:'5FT'}}});const pending=f.module.records()[0];s=f.source.read();s.models[0].blades=42;f.source.save({state:s,expectedRevision:s.revision,requestId:randomUUID(),message:'Different technical change'},'admin');const before=f.source.read(),revision=f.module.revision();assert.throws(()=>f.command('manager','APPROVE',{reviewId:pending.id}),/changed since submission/);assert.deepEqual(f.source.read(),before);assert.equal(f.module.revision(),revision);f.command('manager','REJECT',{reviewId:pending.id});assert.equal(f.module.records()[0].status,'REJECTED');
 }finally{await f.close();}});
test('checking records are idempotent and tied to technical data; changed payload retries and stale revisions fail',async()=>{const f=await setup();try{const input={type:'MARK_CHECKED',modelId:'S2.V58',reason:'Physical quantities checked',expectedRevision:f.source.read().revision,expectedReviewRevision:0,requestId:randomUUID()};f.module.command('production',input);f.module.command('production',input);assert.equal(f.module.records().length,1);assert.equal(f.module.read('production').reviews[0].current,true);assert.throws(()=>f.module.command('production',{...input,reason:'Changed retry'}),/changed/);
 let s=f.source.read();s.parts[0].rate=999;f.source.save({state:s,expectedRevision:s.revision,requestId:randomUUID(),message:'Price only'},'admin');assert.equal(f.module.read('production').reviews[0].current,true);s=f.source.read();s.parts[0].name='Changed bolt';f.source.save({state:s,expectedRevision:s.revision,requestId:randomUUID(),message:'Name correction'},'admin');assert.equal(f.module.read('production').reviews[0].current,false);
 }finally{await f.close();}});
test('new syntax is proposed, approved and retained with pending charges; fabricated PPM does not multiply set weight and shield stays excluded',async()=>{const f=await setup();try{
 f.command('production','SUBMIT_CORRECTION',{modelId:'',draft:{newModelId:'S2.V99',syntax:{series:'Leader',size:'5FT',frame:'V',speed:'SS',blades:36,configuration:'S2-V-ELITE-5FT-36-SS-OB-CEN',bladeOrientation:'OB',gearboxOrientation:'CEN',salesConfirmed:false}}});const review=f.module.records()[0];f.command('manager','APPROVE',{reviewId:review.id});const newModel=f.source.read().models.find(m=>m.id==='S2.V99');assert.equal(newModel.revision,1);assert.ok(Object.values(newModel.costs).every(v=>v===null));assert.equal(newModel.bomAvailable,false);
 f.command('production','SUBMIT_CORRECTION',{draft:{fabrication:[{partId:'fp',name:'Namaste patta',code:'FP1',drawingCode:'FP10',ppm:8,weight:2.2},{partId:'source-row-33',name:'Shield',code:'',drawingCode:'',ppm:1,weight:null}]}});f.command('manager','APPROVE',{reviewId:f.module.records()[0].id});const model=technicalWorkspace(f.source.read()).models[0];assert.equal(model.fabrication[0].weight,2.2);assert.equal(model.fabrication[0].ppm,8);assert.equal(model.fabrication[1].excluded,true);assert.ok(!technicalIssues(model).some(x=>x.message.includes('Shield')));
 }finally{await f.close();}});

test('technical source flags expose numeric quantities only and never raw financial comparison or notes',()=>{
 const s=fixture();s.reviewFlags=[{id:'quantity',model:'S2.V58',category:'PPM difference',part:'IMP-1',name:'Bolt',old:2,new:4,confirmedPpm:4,status:'Unresolved',reason:'flag-financial-note',relatedFindings:[{rate:123456.78}]},{id:'price',model:'S2.V58',category:'Price comparison',name:'flag-financial-note',old:123456.78,new:999}];
 const data=technicalWorkspace(s);assert.equal(data.sourceFlags.length,1);assert.equal(data.sourceFlags[0].oldPpm,2);assert.equal(data.sourceFlags[0].confirmed,false);for(const value of secrets)assert.ok(!JSON.stringify(data).includes(value),value);
 s.reviewFlags[0].old='price 123456.78';assert.equal(technicalWorkspace(s).sourceFlags[0].oldPpm,null);
});

test('checking history is bounded, cursor pages do not duplicate records and model/status filters apply on the server',async()=>{const f=await setup();try{
 for(let i=0;i<205;i++){const record={id:'fixture-'+i,modelId:i%2?'S2.V58':'S1.V14',status:i%3?'CHECKED':'PENDING',kind:'CHECK',createdBy:{name:'Isolated fixture'},createdAt:'2026-10-02',reason:'Technical check fixture'};f.store.db.prepare('INSERT INTO bom_review_records VALUES(?,?)').run(record.id,JSON.stringify(record));}
 const a=f.module.reviewPage('production'),b=f.module.reviewPage('production',{before:a.next}),c=f.module.reviewPage('production',{before:b.next});assert.equal(a.rows.length,100);assert.equal(b.rows.length,100);assert.equal(c.rows.length,5);assert.equal(c.next,null);assert.equal(new Set([...a.rows,...b.rows,...c.rows].map(r=>r.id)).size,205);
 const filtered=f.module.reviewPage('production',{modelId:'S2.V58',status:'PENDING'});assert.ok(filtered.rows.every(r=>r.modelId==='S2.V58'&&r.status==='PENDING'));assert.equal(f.module.read('production').reviews.length,100);assert.throws(()=>f.module.reviewPage('production',{before:-1}));assert.throws(()=>f.module.reviewPage('purchase'));
 }finally{await f.close();}});
