import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {validateRoRecord,calculateRoCosting,calculateRoPurchaseItems} from '../shared/ro-costing.mjs';
import {Store} from '../server/store.mjs';
import {emptyState,makeServer} from '../server/index.mjs';
import {RoCostingStore} from '../server/ro-costing-store.mjs';

const side=rate=>({rate,goodsUsd:100,totalInr:rate*100,basis:'Synthetic before-GST worksheet',rows:[]});
const row=(id='line-1')=>({id,supplier:'Supplier',invoice:'CI-1',itemCode:'GJ-X',masterCode:'X',masterCodeRaw:'WRONG',description:'Synthetic machine',model:'X1',productGroup:'Test machines',quantity:4,unit:'pcs',currency:'USD',unitPrice:25,usdUnitPrice:25,status:'Verified reference',source:{file:'synthetic.xlsx',sheet:'Purchases',row:'2',sha256:'a'.repeat(64)},flags:['Master code corrected from verified source']});
const fixture=()=>({ro:'RO-TEST',supplier:'Supplier',invoices:[{supplier:'Supplier',invoice:'CI-1',currency:'USD',goods:100,extras:0,face:100}],actuals:{},worksheetComparison:{version:1,status:'Provisional reference',basis:'Synthetic provisional costing',reviewedOn:'2026-10-08',source:'Synthetic source',selectedWorkingIds:['selected'],ai:side(112),suresh:side(111),workings:[{id:'selected',invoice:'CI-1',supplier:'Supplier',status:'Provisional reference',source:{file:'synthetic.xlsx'},ai:side(113),suresh:side(111)},{id:'alternative',invoice:'CI-1',supplier:'Supplier',status:'Historical reference',source:{file:'old.xlsx'},ai:side(90),suresh:side(90)}]},purchaseItems:{version:1,basis:'Purchase quantities only',reviewedOn:'2026-10-08',rows:[row()]}});

test('purchase lines use explicit selected reference then verified actual; quantities never alter invoice actuals',()=>{
 const original=fixture(),record=validateRoRecord(original),before=calculateRoCosting(record),result=calculateRoPurchaseItems(record);
 assert.equal(result.rows[0].rate,112);assert.equal(result.rows[0].rateStatus,'Provisional reference');assert.equal(result.rows[0].usdLineTotal,100);assert.equal(result.rows[0].inrUnitCost,2800);assert.equal(result.knownTotalInr,11200);assert.equal(result.differencePercent,0);assert.equal(result.totalQuantity,4);assert.equal(result.rows[0].masterCodeRaw,'WRONG');assert.deepEqual(calculateRoCosting(record),before);assert.deepEqual(validateRoRecord(JSON.parse(JSON.stringify(record))),record);
 record.purchaseItems.rows[0].workingId='selected';assert.equal(calculateRoPurchaseItems(record).rows[0].rate,113);
 record.actuals={supplierInr:9000,bankNet:100,forwarderNet:500,otherNet:0,bcd:300,sws:30,expenseCoverage:'Complete',currencyConfirmed:true,confirmation:'Synthetic complete actuals'};
 const verified=calculateRoPurchaseItems(record);assert.equal(verified.rows[0].rate,99.3);assert.equal(verified.rows[0].rateStatus,'Verified actual');assert.equal(verified.knownTotalInr,9930);assert.equal(record.worksheetComparison.ai.rate,112);
});

test('partial product coverage never creates free goods or a false complete subtotal',()=>{
 const record=fixture();record.purchaseItems.rows.push({...row('missing'),currency:'UNKNOWN',unitPrice:800,usdUnitPrice:null,quantity:2,status:'Pending'});
 let result=calculateRoPurchaseItems(record);assert.equal(result.completeInr,false);assert.equal(result.completeUsd,false);assert.equal(result.pendingItems,1);assert.equal(result.rows[1].inrUnitCost,null);assert.equal(result.knownTotalInr,11200);assert.equal(result.differencePercent,null);
 record.purchaseItems.rows[1].unit='kg';assert.equal(calculateRoPurchaseItems(record).totalQuantity,null);
 record.worksheetComparison.status='Partial reference';assert.equal(calculateRoPurchaseItems(record).rows[0].rate,null);record.worksheetComparison.status='Pending';record.worksheetComparison.ai.rate=null;record.worksheetComparison.suresh.rate=null;result=calculateRoPurchaseItems(record);assert.equal(result.rows[0].rate,null);assert.equal(result.rows[0].inrUnitCost,null);assert.equal(result.rows[0].usdUnitPrice,25);
});

test('purchase references reject duplicate identities, invalid links, currency guessing and oversized data',()=>{
 const check=mutate=>{const record=fixture();mutate(record);assert.throws(()=>validateRoRecord(record));};
 check(r=>r.purchaseItems.rows.push(row()));check(r=>r.purchaseItems.rows[0].quantity=-1);check(r=>r.purchaseItems.rows[0].usdUnitPrice=26);check(r=>r.purchaseItems.rows[0].currency='CNY');check(r=>r.purchaseItems.rows[0].workingId='alternative');check(r=>r.purchaseItems.rows[0].source.file='C:\\private\\source.xlsx');check(r=>r.purchaseItems.rows[0].source.sha256='invalid');check(r=>r.purchaseItems.rows[0].status='Complete');check(r=>r.purchaseItems.rows=Array.from({length:501},(_,n)=>row('id-'+n)));
 const conflict=fixture();Object.assign(conflict.purchaseItems.rows[0],{currency:'CONFLICT',usdBasis:'Explicit temporary USD-column approval; CNY footer unresolved',status:'Provisional reference'});assert.equal(validateRoRecord(conflict).purchaseItems.rows[0].usdUnitPrice,25);
 const free=fixture();Object.assign(free.purchaseItems.rows[0],{currency:'FOC',unitPrice:0,usdUnitPrice:null,status:'Pending'});assert.equal(calculateRoPurchaseItems(free).rows[0].inrUnitCost,null);
});

test('protected item references survive older editors, atomic conflicts and API detail without list leakage',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'fh-ro-items-')),store=new Store(join(dir,'synthetic.sqlite'),emptyState()),module=new RoCostingStore(store),server=makeServer(store,{log:()=>{}});
 try{
  const record=validateRoRecord(fixture()),baseline=JSON.stringify(store.read());module.import('admin',{records:[{record,expectedRevision:0}],reason:'Synthetic item import'},randomUUID());
  const oldEditor=structuredClone(record);delete oldEditor.purchaseItems;delete oldEditor.worksheetComparison;module.import('admin',{records:[{record:oldEditor,expectedRevision:1}],reason:'Legacy save must retain source lines'},randomUUID());
  assert.deepEqual(module.detail('admin',record.ro).record.purchaseItems,record.purchaseItems);assert.equal(Object.hasOwn(module.list('admin').rows[0],'purchaseItems'),false);assert.equal(module.detail('admin',record.ro).history.length,2);
  assert.throws(()=>module.import('admin',{records:[{record:{...record,ro:'ANOTHER'},expectedRevision:0},{record,expectedRevision:1}],reason:'Synthetic stale import'},randomUUID()),/changed/);assert.equal(module.list('admin').total,1);assert.equal(JSON.stringify(store.read()),baseline);
  store.addAccount('admin','synthetic@example.test','Synthetic-local-test-password');await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
  assert.equal((await fetch(base+'/api/ro-costings/record?ro=RO-TEST')).status,401);
  const login=await fetch(base+'/api/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({email:'synthetic@example.test',password:'Synthetic-local-test-password'})});const cookie=login.headers.get('set-cookie').split(';')[0];
  const response=await fetch(base+'/api/ro-costings/record?ro=RO-TEST',{headers:{Cookie:cookie}});assert.equal(response.status,200);assert.deepEqual((await response.json()).record.purchaseItems,record.purchaseItems);
 }finally{if(server.listening)await new Promise(r=>server.close(r));store.close();rmSync(dir,{recursive:true,force:true});}
});
