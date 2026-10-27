import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {Store} from '../server/store.mjs';
import {emptyState,makeServer} from '../server/index.mjs';
import {RoCostingStore} from '../server/ro-costing-store.mjs';
import {roRecordItemCodes,matchesRoItemCode,compareRoCostingDatesDescending,validateRoRecord,calculateRoCosting} from '../shared/ro-costing.mjs';
import {finalizedPoCostings} from '../shared/arrival-costing.mjs';

const item=(itemCode,id='line')=>({id,itemCode,supplier:'Supplier A',invoice:'CI-1',masterCode:'MASTER-ONLY',masterCodeRaw:'RAW-ONLY',description:'DESCRIPTION-ONLY',model:'MODEL-ONLY',currency:'USD',status:'Verified reference',quantity:1,unit:'PCS',unitPrice:10,usdUnitPrice:10});
const record=(ro,codes)=>validateRoRecord({ro,supplier:'Supplier A',invoices:[{supplier:'Supplier A',invoice:'CI-1',currency:'USD',goods:100,extras:0,face:100}],actuals:{},...(codes===undefined?{}:{purchaseItems:{version:1,rows:codes.map((code,i)=>item(code,'line-'+i))}})});
function setup(){
 const dir=mkdtempSync(join(tmpdir(),'fh-ro-item-')),store=new Store(join(dir,'test.sqlite'),emptyState()),module=new RoCostingStore(store);
 const insert=r=>store.db.prepare('INSERT INTO ro_costings VALUES(?,?,?,?,?,?)').run(r.ro,1,r.supplier,calculateRoCosting(r).status,JSON.stringify(r),'2026-10-27T00:00:00Z');
 return {store,module,insert,close(){store.close();rmSync(dir,{recursive:true,force:true});}};
}

test('shared item-code matcher uses only saved purchase item codes with literal trimmed case-insensitive matching',()=>{
 const r=record('RO-1',['GJ-PW8','CODE%_\\VALUE','ÄBC-2']),before=structuredClone(r);
 for(const query of [' pw8 ','GJ-','%_\\','äbc'])assert.equal(matchesRoItemCode(r,query),true,query);
 for(const query of ['MASTER-ONLY','RAW-ONLY','DESCRIPTION-ONLY','MODEL-ONLY','Supplier A','CI-1','missing',"' OR 1=1 --"])assert.equal(matchesRoItemCode(r,query),false,query);
 for(const missing of [undefined,{},record('RO-NO-ITEMS'),record('RO-EMPTY',[])]){
  assert.equal(matchesRoItemCode(missing,'PW8'),false);assert.equal(matchesRoItemCode(missing,'  '),true);
 }
 for(const invalid of [null,123,[],{},'x'.repeat(121)])assert.throws(()=>matchesRoItemCode(r,invalid),/item code filter/);
 assert.equal(matchesRoItemCode(r,'x'.repeat(120)),false);assert.deepEqual(r,before);
});

test('server item filter precedes total and pagination, matches shared behavior and never duplicates an RO',()=>{
 const f=setup();try{
  const records=[record('RO-000',['OTHER']),...Array.from({length:53},(_,i)=>record('RO-'+String(i+1).padStart(3,'0'),['GJ-PW8','GJ-PW8-SECOND'])),record('RO-100',['CODE%_\\VALUE','ÄBC-2']),record('RO-NONE'),record('RO-EMPTY',[])];
  for(const r of records)f.insert(r);
  const first=f.module.list('admin',{itemCode:' pw8 '});assert.deepEqual(first.rows[0].itemCodes,['GJ-PW8','GJ-PW8-SECOND']);assert.equal(first.total,53);assert.equal(first.rows.length,50);assert.equal(first.rows[0].ro,'RO-001');assert.equal(new Set(first.rows.map(r=>r.ro)).size,50);
  const second=f.module.list('admin',{itemCode:'Pw8',offset:50});assert.equal(second.total,53);assert.deepEqual(second.rows.map(r=>r.ro),['RO-051','RO-052','RO-053']);
  assert.deepEqual(second.rows[0],f.module.list('admin',{roNumber:'RO-051'}).rows[0]);
  for(const query of ['','  ','%','_','\\','äbc','MASTER-ONLY','DESCRIPTION-ONLY','missing',"' OR 1=1 --"]){
   const expected=records.filter(r=>matchesRoItemCode(r,query)).map(r=>r.ro).sort((a,b)=>a.localeCompare(b)),actual=f.module.list('admin',{itemCode:query});
   assert.equal(actual.total,expected.length,query);assert.deepEqual(actual.rows.map(r=>r.ro),expected.slice(0,50),query);
  }
  assert.equal(f.module.list('admin',{itemCode:'pw8',supplier:'Different'}).total,0);
  assert.equal(f.module.list('admin',{itemCode:'pw8',status:'Complete'}).total,0);
  assert.equal(f.module.list('admin',{itemCode:'pw8',q:'RO-051',roNumber:'051'}).total,1);
  for(const invalid of [null,123,'x'.repeat(121)])assert.throws(()=>f.module.list('admin',{itemCode:invalid}),/item code filter/);
  assert.equal(f.store.db.prepare('SELECT count(*) n FROM ro_costings').get().n,records.length);
 }finally{f.close();}
});

test('finalized PO item filtering selects only actual invoice snapshots and retains the entire invoice total',()=>{
 const actor={id:'admin',role:'ADMIN',active:true,scopes:['LAE_IMPORT']},calculation={invoiceUsdMinor:40000,totalMinor:3600000,costPerUsd:90000000},state={vendors:[{id:'v',name:'Supplier A'}],orders:[{id:'po',number:'PO-1',scope:'LAE_IMPORT',vendorId:'v',lines:[{id:'a',code:'CURRENT-MASTER'},{id:'unrelated',code:'UNRELATED-PO-ITEM'}],shipments:[{id:'s',number:'S-1',status:'ARRIVED',actualArrival:'2026-10-20'}],arrivalCostings:[{id:'ci-a',status:'FINAL',shipmentId:'s',roReference:'RO-1',invoiceNumber:'CI-1',lines:[{lineId:'a',code:'SAVED-PW8'},{lineId:'b',code:'OTHER-ITEM'}],calculation},{id:'ci-b',status:'FINAL',shipmentId:'s',roReference:'RO-1',invoiceNumber:'CI-2',lines:[{lineId:'unrelated',code:'UNRELATED-PO-ITEM'}],calculation},{id:'ci-legacy',status:'FINAL',shipmentId:'s',roReference:'RO-1',invoiceNumber:'CI-3',calculation}]}]},before=structuredClone(state);
 const all=finalizedPoCostings(state,actor),filtered=finalizedPoCostings(state,actor,{itemCode:' pw8 '});assert.equal(all.length,3);assert.equal(filtered.length,1);assert.deepEqual(filtered[0],all.find(r=>r.costingId==='ci-a'));assert.equal(filtered[0].totalMinor,3600000);assert.equal(filtered[0].invoiceUsdMinor,40000);
 assert.deepEqual(finalizedPoCostings(state,actor,{itemCode:'current-master'}),[]);
 assert.deepEqual(finalizedPoCostings(state,actor,{itemCode:'unrelated-po'}).map(r=>r.costingId),['ci-b']);
 assert.deepEqual(finalizedPoCostings(state,actor,{itemCode:'pw8',roNumber:'different'}),[]);
 assert.deepEqual(finalizedPoCostings(state,actor,{itemCode:'pw8',status:'Pending'}),[]);
 assert.deepEqual(finalizedPoCostings(state,actor,{itemCode:'  '}),all);
 for(const invalid of [null,123,'x'.repeat(121)])assert.throws(()=>finalizedPoCostings(state,actor,{itemCode:invalid}),/item code filter/);
 assert.deepEqual(state,before);
 const multi=structuredClone(state),base=multi.orders[0].arrivalCostings[0];
 multi.orders[0].arrivalCostings=['9','100','10',''].map((roReference,i)=>({...structuredClone(base),id:'ci-'+i,roReference,boeDate:['2026-09-01','2025-12-31','2026-10-05',''][i],finalizedAt:'2026-10-'+String(24-i)}));
 assert.deepEqual(finalizedPoCostings(multi,actor,{itemCode:'pw8'}).map(r=>r.roReference),['10','9','100','']);
});

test('authenticated RO list API forwards item code filtering and rejects oversized filters',async()=>{
 const f=setup();f.store.addAccount('admin','admin@example.test','Isolated-test-password');f.insert(record('RO-ONE',['GJ-PW8']));f.insert(record('RO-TWO',['OTHER']));const server=makeServer(f.store,{log:()=>{}});
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
  const login=await fetch(base+'/api/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({email:'admin@example.test',password:'Isolated-test-password'})});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
  const get=async itemCode=>fetch(base+'/api/ro-costings?itemCode='+encodeURIComponent(itemCode),{headers:{Cookie:cookie}});
  const response=await get(' pw8 ');assert.equal(response.status,200);const data=await response.json();assert.equal(data.total,1);assert.equal(data.rows[0].ro,'RO-ONE');
  assert.equal((await get('x'.repeat(121))).status,400);assert.equal((await fetch(base+'/api/ro-costings?itemCode=pw8')).status,401);
 }finally{await new Promise(resolve=>server.close(resolve));f.close();}
});


test('item search orders by inward date then BOE fallback before pagination, with undated last',()=>{
 const f=setup();try{
  const rows=[['9999','',''],['1408','2026-05-20',''],['1143','2025-11-11',''],['1411','2026-06-17',''],['1430','2026-06-04',''],['1656','','2026-10-05'],['2','2026-06-17','2026-10-27'],['3','2026-10-05','']].map(([ro,inwardDate,boeDate])=>({...record(ro,['SORT-ITEM']),inwardDate,boeDate}));
  const before=structuredClone(rows);for(const r of rows)f.insert(r);
  const expected=['1656','3','1411','2','1430','1408','1143','9999'];
  const review=[...rows].sort((a,b)=>compareRoCostingDatesDescending(a,b)||a.ro.localeCompare(b.ro));
  assert.deepEqual(review.map(r=>r.ro),expected);
  const first=f.module.list('admin',{itemCode:'sort-item',limit:3});
  assert.deepEqual(first.rows.map(r=>r.ro),expected.slice(0,3));
  assert.deepEqual(f.module.list('admin',{itemCode:'sort-item',offset:3}).rows.map(r=>r.ro),expected.slice(3));
  assert.equal(first.total,8);assert.deepEqual(rows,before);
  assert.deepEqual(f.module.list('admin',{}).rows.map(r=>r.ro),rows.map(r=>r.ro).sort());
 }finally{f.close();}
});


test('RO table item codes retain saved identities, remove exact duplicates and handle missing codes',()=>{
 const source={purchaseItems:{rows:[{itemCode:' SD6 '},{itemCode:'SD6'},{itemCode:'GJ-SD2'},{itemCode:''},{masterCode:'NOT-ITEM'},{itemCode:null},{itemCode:'<code>'}]}};
 const before=structuredClone(source);
 assert.deepEqual(roRecordItemCodes(source),['SD6','GJ-SD2','<code>']);
 assert.deepEqual(roRecordItemCodes({}),[]);assert.deepEqual(source,before);
});
