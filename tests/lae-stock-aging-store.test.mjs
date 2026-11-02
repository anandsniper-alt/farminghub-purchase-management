import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash,randomUUID} from 'node:crypto';
import {Store} from '../server/store.mjs';
import {LaeStockAgingStore} from '../server/lae-stock-aging-store.mjs';
import {LaeStockStore} from '../server/lae-stock-store.mjs';
import {emptyState,makeServer} from '../server/index.mjs';

const row=(id,more={})=>({id,planKey:'p1',productGroup:'Pumps',masterCode:'WP1',brandCode:'GJ-WP1',itemName:'Synthetic pump',unit:'pcs',warehouse:'Synthetic warehouse',quantity:10,importDate:'2026-08-01',originalInrUnit:100,revisedInrUnit:110,quantityOnly:false,...more});
const snapshot=(rows=[row('r1')])=>({schemaVersion:1,stockDate:'2026-10-31',costDate:'2026-10-31',metadata:{source:'synthetic-only',stockHash:'a'.repeat(64),forecastHash:'b'.repeat(64)},rows,plans:[{id:'p1',productGroup:'Pumps',masterCode:'WP1',unit:'pcs',quantities:{TNWL:5,HYD:5,NORTH:0,FH:0}}]});
const input=(revision=0,s=snapshot())=>({expectedRevision:revision,reason:'Synthetic approved review',snapshot:s});
const fixture=()=>{
 const dir=mkdtempSync(join(tmpdir(),'lae-aging-store-')),state=emptyState();
 state.users.push({id:'reader',name:'Reader',role:'VIEWER',scopes:['LAE_IMPORT']},{id:'other',name:'Other',role:'VIEWER',scopes:['LAE_DOMESTIC']},{id:'inactive',name:'Inactive',role:'ADMIN',scopes:['LAE_IMPORT'],active:false});
 const store=new Store(join(dir,'synthetic.sqlite'),state),aging=new LaeStockAgingStore(store);
 return {store,aging,filename:join(dir,'synthetic.sqlite'),close(){store.close();rmSync(dir,{recursive:true,force:true});}};
};
const counts=db=>Object.fromEntries(['workspace','audit_events','lae_aging_snapshots','lae_aging_events','lae_aging_active','request_receipts'].map(t=>[t,db.prepare(`SELECT count(*) AS n FROM ${t}`).get().n]));

test('brand policy persists and reads exact allocations without changing workspace or disclosing private metadata',()=>{
 const f=fixture();try{
  const s=snapshot([row('gj',{allocationBrand:'GJ-WP1'}),row('kd',{allocationBrand:'KD-WP1',brandCode:'KD-WP1',quantity:4})]);s.allocationPolicy='brand-first-v1';s.plans[0].brandQuantities={'GJ-WP1':{TNWL:5,HYD:0,NORTH:0,FH:0},'KD-WP1':{TNWL:0,HYD:5,NORTH:0,FH:0}};s.metadata.privatePath='E:\\private\\allocation.xlsx';
  const before=f.store.read();f.aging.import('admin',input(0,s),randomUUID());const a=f.aging.read('reader',{view:'allocated',divisions:'HYD'});
  assert.equal(a.snapshot.allocationPolicy,'brand-first-v1');assert.equal(a.summary[0].quantity,4);assert.ok(a.drilldown.rows.every(r=>r.brandCode==='KD-WP1'&&r.forecastBrand==='KD-WP1'));assert.equal(a.snapshot.metadata.privatePath,undefined);assert.deepEqual(f.store.read(),before);
  a.allocation.plans[0].brandControls[0].divisions.TNWL.plannedQuantity=999;assert.equal(f.aging.read('reader',{view:'allocated',divisions:'HYD'}).allocation.plans[0].brandControls[0].divisions.TNWL.plannedQuantity,5);
 }finally{f.close();}
});

test('stored classification filters remain read-only and cache each selection separately',()=>{
 const f=fixture();try{
  const source=snapshot([row('one',{quantity:3,engine:'170F',grade:'PRIME',vendor:'V01'}),row('two',{quantity:7,engine:'173F',grade:'REGAL',vendor:'V02'})]);
  f.aging.import('admin',input(0,source),randomUUID());const before=counts(f.store.db),workspace=f.store.read();
  const q={engine:'170F',grade:'PRIME',vendor:'V01',display:'quantity',sort:'61-120',direction:'desc',view:'allocated',divisions:'TNWL,HYD'};
  const a=f.aging.read('reader',q);assert.equal(a.summary[0].quantity,3);assert.equal(a.summary[0].knownValueInr,330);
  const b=f.aging.read('reader',{...q,engine:'173F',grade:'REGAL',vendor:'V02'});assert.equal(b.summary[0].quantity,7);
  assert.deepEqual(f.aging.read('reader',q),a);assert.deepEqual(counts(f.store.db),before);assert.deepEqual(f.store.read(),workspace);
  assert.throws(()=>f.aging.read('other',q),/access|scope|permission/i);
 }finally{f.close();}
});

test('aging snapshot is independent, forecast-scoped, immutable and preserves original evidence',()=>{
 const f=fixture();try{
  new LaeStockStore(f.store);
  f.store.db.prepare('INSERT INTO lae_stock_snapshots VALUES(?,?,?,?,?,?)').run('legacy','c'.repeat(64),'{}','2026-09-30','admin','Synthetic legacy sentinel');
  const legacy=f.store.db.prepare('SELECT * FROM lae_stock_snapshots').all();
  const before=f.store.read(),source=snapshot([row('r1',{originalRo:'',priceRo:'1595',provenance:{originalQuantity:10,sourceSheet:'Synthetic'}})]),unchanged=structuredClone(source);
  assert.equal(f.aging.read('reader').empty,true);
  assert.throws(()=>f.aging.read('reader',{basis:'invalid'}),/basis/);
  source.metadata={...source.metadata,planPeriod:'November 2026 to April 2027',planBasis:'Approved forecast',stockScope:'Forecast products only',forecastPeriod:'E:\\private\\input.xlsx',privatePath:'E:\\private\\input.xlsx'};
  unchanged.metadata=structuredClone(source.metadata);
  const result=f.aging.import('admin',input(0,source),randomUUID());
  assert.equal(result.revision,1);assert.equal(result.contentHash,createHash('sha256').update(JSON.stringify(source)).digest('hex'));
  assert.deepEqual(JSON.parse(f.store.db.prepare('SELECT payload FROM lae_aging_snapshots').get().payload),unchanged);
  assert.deepEqual(source,unchanged);assert.deepEqual(f.store.read(),before);
  assert.deepEqual(f.aging.read('reader').snapshot.metadata,{planPeriod:'November 2026 to April 2027',planBasis:'Approved forecast',stockScope:'Forecast products only'});
  assert.deepEqual(f.store.db.prepare('SELECT * FROM lae_stock_snapshots').all(),legacy);
  for(const table of ['lae_aging_snapshots','lae_aging_events'])for(const statement of [`DELETE FROM ${table}`,`UPDATE ${table} SET reason='changed'`])assert.throws(()=>f.store.db.exec(statement),/immutable/);
  const invalid=snapshot([row('outside',{planKey:'not-in-forecast'})]);assert.throws(()=>f.aging.import('admin',input(1,invalid),randomUUID()),/forecast linkage/);
  assert.equal(f.aging.read('reader').snapshot.revision,1);
 }finally{f.close();}
});

test('import retries are actor-bound, revision-guarded, deduplicated and atomic including receipt failure',()=>{
 const f=fixture();try{
  const payload=input(),key=randomUUID(),first=f.aging.import('admin',payload,key);
  assert.deepEqual(f.aging.import('admin',payload,key),first);
  assert.throws(()=>f.aging.import('admin',{...payload,reason:'Changed request'},key),/different content/);
  assert.throws(()=>f.aging.import('admin',payload,randomUUID()),/changed/);
  assert.throws(()=>f.aging.import('admin',input(1)),/idempotency key/);
  const same=f.aging.import('admin',input(1),randomUUID());assert.equal(same.unchanged,true);assert.equal(same.revision,1);assert.equal(counts(f.store.db).lae_aging_events,1);
  const before=counts(f.store.db),changed=input(1,snapshot([row('r1',{quantity:20})]));
  assert.throws(()=>f.aging.import('admin',{...changed,contentHash:'0'.repeat(64)},randomUUID()),/hash/);assert.deepEqual(counts(f.store.db),before);
  const save=f.store.requestSave;f.store.requestSave=()=>{throw Error('Synthetic receipt failure');};
  assert.throws(()=>f.aging.import('admin',changed,randomUUID()),/receipt failure/);f.store.requestSave=save;
  assert.deepEqual(counts(f.store.db),before);assert.equal(f.aging.read('reader').summary[0].quantity,10);
  const next=f.aging.import('admin',changed,randomUUID());assert.equal(next.revision,2);assert.equal(f.aging.read('reader').summary[0].quantity,20);
  const restored=f.aging.import('admin',input(2),randomUUID());assert.equal(restored.revision,3);assert.equal(counts(f.store.db).lae_aging_snapshots,2);
  assert.equal(f.aging.read('reader').summary[0].quantity,10);assert.equal(counts(f.store.db).lae_aging_events,3);
 }finally{f.close();}
});

test('queries are bounded and read-only; cached data cannot bypass changed access or be mutated by callers',()=>{
 const f=fixture();try{
  const rows=Array.from({length:201},(_,i)=>row('r'+i));f.aging.import('admin',input(0,snapshot(rows)),randomUUID());
  const before=counts(f.store.db),report=f.aging.read('reader',{pageSize:'2',page:'2'});
  assert.equal(report.drilldown.rows.length,2);assert.equal(report.drilldown.total,201);assert.equal(report.summary[0].quantity,2010);
  report.drilldown.rows[0].quantity=999;report.summary[0].quantity=999;
  assert.equal(f.aging.read('reader',{pageSize:'2',page:'2'}).summary[0].quantity,2010);
  assert.throws(()=>f.aging.read('reader',{pageSize:'201'}),/page/);
  assert.throws(()=>f.aging.read('reader',{basis:'warehouse'}),/basis/);
  assert.throws(()=>f.aging.read('reader',{exportAll:'true'}),/filter/);
  assert.throws(()=>f.aging.read('other'),/access/);assert.throws(()=>f.aging.read('inactive'),/access/);
  assert.throws(()=>f.aging.import('reader',input(1),randomUUID()),/administrator/);
  assert.deepEqual(counts(f.store.db),before);
  const state=f.store.read();state.users.find(u=>u.id==='reader').scopes=['LAE_DOMESTIC'];f.store.db.prepare('UPDATE workspace SET payload=?').run(JSON.stringify(state));
  assert.throws(()=>f.aging.read('reader',{pageSize:'2',page:'2'}),/access/);
 }finally{f.close();}
});

test('a second store sees imported revisions and rejects corrupt payload or active history',()=>{
 const f=fixture(),connection=new Store(f.filename);try{
  const second=new LaeStockAgingStore(connection);f.aging.import('admin',input(),randomUUID());assert.equal(second.read('reader').snapshot.revision,1);
  f.aging.import('admin',input(1,snapshot([row('r1',{quantity:11})])),randomUUID());assert.equal(second.read('reader').summary[0].quantity,11);
  f.store.db.exec('UPDATE lae_aging_active SET revision=99');assert.throws(()=>second.read('reader'),/integrity/);
  f.store.db.exec('UPDATE lae_aging_active SET revision=2');
  f.store.db.exec('DROP TRIGGER lae_aging_snapshots_no_update');f.store.db.prepare('UPDATE lae_aging_snapshots SET payload=? WHERE id=(SELECT snapshot_id FROM lae_aging_active)').run(JSON.stringify(snapshot()));
  assert.throws(()=>new LaeStockAgingStore(f.store).read('reader'),/integrity/);
 }finally{connection.close();f.close();}
});

test('HTTP reads and imports enforce login, scope, origin, CSRF, revision and durable retry identity',async()=>{
 const f=fixture(),server=makeServer(f.store,{log:()=>{}});
 for(const id of ['admin','reader','other'])f.store.addAccount(id,id+'@example.test','Synthetic-only-password');
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 try{
  const login=async id=>{const response=await fetch(base+'/api/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({email:id+'@example.test',password:'Synthetic-only-password'})});const cookie=response.headers.get('set-cookie').split(';')[0],session=await(await fetch(base+'/api/session',{headers:{Cookie:cookie}})).json();return {Cookie:cookie,Origin:base,'X-CSRF-Token':session.csrf,'Content-Type':'application/json','Idempotency-Key':randomUUID()};};
  const admin=await login('admin'),reader=await login('reader'),other=await login('other'),endpoint=base+'/api/lae-stock-aging',post=(headers,body=input())=>fetch(endpoint+'/import',{method:'POST',headers,body:JSON.stringify(body)});
  assert.equal((await fetch(endpoint)).status,401);assert.equal((await fetch(endpoint,{headers:other})).status,403);
  const empty=await(await fetch(endpoint,{headers:reader})).json();assert.equal(empty.snapshot,null);assert.equal(empty.empty,true);
  assert.equal((await fetch(endpoint+'?basis=invalid',{headers:reader})).status,400);
  assert.equal((await post(reader)).status,403);assert.equal((await post({...admin,Origin:'http://not-allowed.test'})).status,403);assert.equal((await post({...admin,'X-CSRF-Token':'invalid'})).status,403);
  const first=await post(admin);assert.equal(first.status,200);const receipt=await first.json();assert.deepEqual(await(await post(admin)).json(),receipt);
  assert.equal((await post({...admin,'Idempotency-Key':randomUUID()})).status,409);
  const response=await fetch(endpoint+'?pageSize=1',{headers:reader}),report=await response.json();assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);assert.equal(report.drilldown.rows.length,1);
  assert.equal((await fetch(endpoint+'?pageSize=10000',{headers:reader})).status,400);
  assert.equal((await fetch(base+'/shared/lae-stock-aging-allocation.mjs')).status,200);
 }finally{await new Promise(resolve=>server.close(resolve));f.close();}
});
