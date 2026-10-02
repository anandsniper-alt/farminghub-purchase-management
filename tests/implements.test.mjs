import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Store} from '../server/store.mjs';
import {emptyState,makeServer} from '../server/index.mjs';
import {ImplementsStore} from '../server/implements-store.mjs';
import {blankState,ensureMonthly,createOrders} from '../web/implements/domain.mjs';
import {calculateModelCost} from '../web/implements/costing.mjs';
import {saveSalesList,activateSalesList} from '../web/implements/sales-pricing.mjs';
const fixture=()=>{
 const s=ensureMonthly(blankState({version:'test',parts:[{id:'IMP-1',code:'IMP-1',name:'Bolt',category:'Fastener',uom:'pcs',rate:10,supplier:'v',fabricated:false}],suppliers:[{id:'v',name:'Supplier'}],models:[{id:'S2.V58',name:'Leader',series:'Leader',size:'7 FT',blades:48,revision:1,history:[],bomAvailable:true,lines:[{partId:'IMP-1',ppm:4}],fabrication:[{partId:'f',name:'Patta set',ppm:2,weight:2.77},{partId:'source-row-33',name:'Shield',ppm:1,weight:null}],costs:{Assembly:2},fabricationCode:'',fabricationSupplier:'v'}]}));s.settings.fabricationRate=125;s.settings.fabricationTransportRate=1.5;return s;
};
async function setup(){
 const dir=mkdtempSync(join(tmpdir(),'fh-implements-')),s=emptyState();s.users.push({id:'manager',name:'Manager',role:'MANAGER',scopes:['IMPLEMENTS_DOMESTIC'],active:true},{id:'viewer',name:'Viewer',role:'VIEWER',scopes:['IMPLEMENTS_DOMESTIC'],active:true},{id:'other',name:'Import only',role:'MANAGER',scopes:['LAE_IMPORT'],active:true});
 const store=new Store(join(dir,'test.sqlite'),s);for(const u of s.users)store.addAccount(u.id,u.id+'@example.test','Isolated-test-password');
 const mod=new ImplementsStore(store),server=makeServer(store,{log:()=>{}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const call=async(path,session={},data)=>{const res=await fetch(base+path,{method:data?'POST':'GET',redirect:'manual',headers:{Origin:base,Cookie:session.cookie||'','X-CSRF-Token':session.csrf||'','Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});return {status:res.status,data:res.headers.get('content-type')?.includes('application/json')?await res.json():await res.text(),cookie:res.headers.get('set-cookie')?.split(';')[0]};};
 const login=async id=>{const r=await call('/api/login',{}, {email:id+'@example.test',password:'Isolated-test-password'});const b=await call('/api/bootstrap',{cookie:r.cookie});return {cookie:r.cookie,csrf:b.data.csrf};};
 return {base,dir,store,mod,call,login,close:async()=>{await new Promise(r=>server.close(r));store.close();rmSync(dir,{recursive:true,force:true});}};
}
const payload=(state,message='Reviewed update')=>({state,expectedRevision:state.revision,requestId:randomUUID(),message});
test('transport-inclusive PO prices are server verified and retained in snapshots',async()=>{
 const f=await setup();try{
  const input=fixture();Object.assign(input.parts[0],{rate:3723,transportPercent:5,transportInCost:true});input.models[0].lines[0].ppm=1;
  let s=f.mod.save(payload(input),'admin');s.plan={'S2.V58':2};s.monthlyPlans[s.activeMonth]=s.plan;s.settings.bufferPercent=0;s.orders=createOrders(s,['IMP-1'],{date:'2026-10-02',quantityOnly:false});
  assert.equal(s.orders[0].total,7818.3);const bad=structuredClone(s);bad.orders[0].lines[0].purchaseBaseRate=1;assert.throws(()=>f.mod.save(payload(bad),'admin'),/match|reconcile/);
  s=f.mod.save(payload(s),'admin');const snapshot=structuredClone(s.orders);s.parts[0].rate=4000;s=f.mod.save(payload(s),'admin');assert.deepEqual(s.orders,snapshot);assert.equal(calculateModelCost(s,'S2.V58').rows[0].rate,4200);
 }finally{await f.close();}
});
test('sales snapshots use server-verified costs and current-list changes retain their reason',async()=>{
 const f=await setup();try{
  let s=f.mod.save(payload(fixture()),'admin');saveSalesList(s,{name:'October prices',month:'2026-10',kind:'current',rows:[{modelId:'S2.V58',price:1000}]},{id:'sales-test'});
  const bad=structuredClone(s);bad.sales.lists[0].rows[0].fabricationCost=1;assert.throws(()=>f.mod.save(payload(bad),'admin'),/BOM calculation/);
  s=f.mod.save(payload(s),'admin');assert.equal(s.sales.lists.length,1);
  const noReason=structuredClone(s);noReason.sales.currentId='sales-test';assert.throws(()=>f.mod.save(payload(noReason),'admin'),/reason/);
  activateSalesList(s,'sales-test','Reviewed October selling prices');s=f.mod.save(payload(s),'admin');assert.equal(s.sales.currentId,'sales-test');
  const changed=structuredClone(s);changed.sales.lists[0].name='Rewrite';assert.throws(()=>f.mod.save(payload(changed),'admin'),/history/);
 }finally{await f.close();}
});
test('Implements isolates existing data; server validates scope, CSRF, initial import, revisions and retry identity',async()=>{
 const f=await setup();try{
  const baseline=f.store.read(),admin=await f.login('admin'),manager=await f.login('manager'),viewer=await f.login('viewer'),other=await f.login('other');
  assert.equal((await f.call('/api/implements/workspace')).status,401);
  assert.equal((await f.call('/implements/app.mjs')).status,401);
  assert.equal((await f.call('/api/implements/workspace',other)).status,403);
  assert.equal((await f.call('/implements/app.mjs',other)).status,403);
  assert.equal((await f.call('/implements/app.mjs',manager)).status,200);
  assert.equal((await f.call('/api/implements/workspace',viewer,payload(fixture()))).status,403);
  assert.equal((await f.call('/api/implements/workspace',manager,payload(fixture()))).status,403);
  assert.equal((await f.call('/api/implements/workspace',{cookie:admin.cookie},payload(fixture()))).status,403);
  const demo=fixture();demo.demo=true;assert.equal((await f.call('/api/implements/workspace',admin,payload(demo))).status,400);
  const p=payload(fixture()),first=await f.call('/api/implements/workspace',admin,p);assert.equal(first.status,200);assert.equal(first.data.state.revision,1);
  assert.equal((await f.call('/api/implements/workspace',admin,p)).status,200);assert.equal(f.mod.read().revision,1);
  assert.equal((await f.call('/api/implements/workspace',admin,{...p,message:'Altered retry'})).status,409);
  assert.equal((await f.call('/api/implements/workspace',manager,payload(fixture()))).status,409);
  const next=first.data.state;next.settings.fabricationRate=130;assert.equal((await f.call('/api/implements/workspace',manager,payload(next))).status,200);
  assert.equal(f.mod.read().settings.fabricationRate,130);assert.deepEqual(f.store.read(),baseline);
  assert.equal(f.store.db.prepare('SELECT count(*) n FROM implements_events').get().n,2);
  assert.throws(()=>f.store.db.exec('DELETE FROM implements_events'),/append-only/);
 }finally{await f.close();}
});
test('full recovery download requires admin and preserves both workspaces with verifiable checksum',async()=>{
 const f=await setup();try{
  const admin=await f.login('admin'),viewer=await f.login('viewer');f.mod.save(payload(fixture()),'admin');
  assert.equal((await f.call('/api/admin/recovery',viewer,{})).status,403);
  const res=await fetch(f.base+'/api/admin/recovery',{method:'POST',headers:{Origin:f.base,Cookie:admin.cookie,'X-CSRF-Token':admin.csrf,'Content-Type':'application/json'},body:'{}'});
  assert.equal(res.status,200);const bytes=Buffer.from(await res.arrayBuffer());assert.equal(bytes.length,Number(res.headers.get('content-length')));
  const {createHash}=await import('node:crypto');assert.equal(createHash('sha256').update(bytes).digest('hex'),res.headers.get('x-backup-sha256'));
  const file=join(f.dir,'recovered.sqlite');writeFileSync(file,bytes);const db=new DatabaseSync(file,{readOnly:true});
  try{assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');assert.deepEqual(JSON.parse(db.prepare('SELECT payload FROM workspace').get().payload),f.store.read());assert.deepEqual(JSON.parse(db.prepare('SELECT payload FROM implements_workspace').get().payload),f.mod.read());assert.equal(db.prepare('SELECT count(*) n FROM implements_events').get().n,1);}finally{db.close();}
 }finally{await f.close();}
});
test('Implements preserves snapshots and history; rejects tampered prices and invalid quantities',async()=>{
 const f=await setup();try{
  let s=f.mod.save(payload(fixture()),'admin');assert.equal(calculateModelCost(s,'S2.V58').fabricationTotal,350.41);
  s.plan={'S2.V58':2};s.monthlyPlans[s.activeMonth]=s.plan;s.orders=createOrders(s,['IMP-1'],{date:'2026-10-01',quantityOnly:false});
  const bad=structuredClone(s);bad.orders[0].lines[0].rate=1;bad.orders[0].lines[0].amount=9;bad.orders[0].total=9;assert.throws(()=>f.mod.save(payload(bad),'admin'),/match|reconcile/);
  s=f.mod.save(payload(s),'admin');assert.equal(s.orders[0].lines[0].orderQty,9);
  const saved=JSON.stringify(s.orders);s.parts[0].rate=25;s=f.mod.save(payload(s),'manager');assert.equal(JSON.stringify(s.orders),saved);
  const tampered=structuredClone(s);tampered.orders=[];assert.throws(()=>f.mod.save(payload(tampered),'admin'),/history/);
  const invalid=structuredClone(s);invalid.models[0].lines[0].ppm=-1;assert.throws(()=>f.mod.save(payload(invalid),'admin'),/non-negative/);
  const removed=structuredClone(s);removed.models=[];removed.plan={};removed.monthlyPlans={};assert.throws(()=>f.mod.save(payload(removed),'admin'));
 }finally{await f.close();}
});
