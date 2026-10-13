import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Store} from '../server/store.mjs';
import {emptyState,makeServer} from '../server/index.mjs';
import {UtilityPriceStore,validateUtilityDataset} from '../server/utility-price-store.mjs';

const summary=(quantity,rate)=>({quantity,costedQuantity:rate===null?0:quantity,pendingQuantity:rate===null?quantity:0,value:rate===null?null:quantity*rate,weightedRate:quantity&&rate!==null?rate:null});
function dataset(version='test-v1',barcodeCount=2){const barcodes=Array.from({length:barcodeCount},(_,n)=>({id:'barcode-'+n,barcode:'ROLL-'+n,quantity:1,warehouse:'Test',originalRate:73,originalValue:73,source:'fixture.csv',sourceHash:'a'.repeat(64),sourceRow:n+2}));
 const item={id:'item-1',vendorId:'supplier-1',stage:'Finished',productType:'Roll',quality:'HD',uom:'kg',name:'Confirmed roll',stock:summary(barcodeCount,99),pipeline:summary(3,99),combined:summary(barcodeCount+3,99),batchIds:['stock-1','pipeline-1']};
 const batch={id:'stock-1',itemId:'item-1',scope:'stock',snapshotDate:'2026-10-01',inwardDate:'2026-09-10',invoiceDate:'2026-09-08',voucher:'INV-1',invoiceRefs:['INV-1'],beforeCdRate:100,cdPercent:3,netGoodsRate:97,transportRate:2,landedRate:99,evidenceStatus:'verified',quantity:barcodeCount,pipelineQuantity:0,barcodes,sourceRefs:[],notes:[]};
 return {meta:{id:version,snapshotDate:'2026-10-01',limitations:['Synthetic isolated fixture']},suppliers:[{id:'supplier-1',name:'Supplier One'},{id:'supplier-2',name:'Supplier Two'}],items:[item,{...item,id:'item-2',vendorId:'supplier-2',stage:'Raw',quality:'LD',name:'Pending roll',stock:summary(4,null),pipeline:summary(0,null),combined:summary(4,null),batchIds:['pending-1']}],batches:[batch,{...batch,id:'pipeline-1',scope:'pipeline',voucher:'INV-2',quantity:0,pipelineQuantity:3,barcodes:[]},{...batch,id:'pending-1',itemId:'item-2',voucher:'INV-3',quantity:4,pipelineQuantity:0,beforeCdRate:null,cdPercent:null,netGoodsRate:null,transportRate:null,landedRate:null,evidenceStatus:'pending',barcodes:[]}]};}
function fixture(){const dir=mkdtempSync(join(tmpdir(),'fh-utility-prices-')),seed=emptyState();seed.users.push(...[
 ['manager','MANAGER',['UTILITY_DOMESTIC']],['executive','EXECUTIVE',['UTILITY_DOMESTIC']],['product','PRODUCT_MANAGER',['UTILITY_DOMESTIC']],['viewer','VIEWER',['UTILITY_DOMESTIC']],['outsider','MANAGER',['LAE_IMPORT']],['technical','BOM_REVIEWER',['UTILITY_DOMESTIC']],['production','PRODUCTION_OPERATOR',['UTILITY_DOMESTIC']],['planner','PLAN_OPERATOR',['UTILITY_DOMESTIC']]
 ].map(([id,role,scopes])=>({id,name:id,role,scopes,active:true})));const store=new Store(join(dir,'isolated.sqlite'),seed);for(const user of seed.users)store.addAccount(user.id,user.id+'@example.test','Isolated-utility-test-password');const module=new UtilityPriceStore(store);return {dir,store,module,import(data=dataset(),extra={}){return module.import('admin',{dataset:data,requestId:randomUUID(),...extra});},close(){store.close();rmSync(dir,{recursive:true,force:true});}};}
test('empty workspace is safe; all Utility read and remark paths enforce current commercial roles and scope',()=>{const f=fixture();try{
 assert.equal(f.module.workspace('viewer').meta,null);assert.equal(f.module.items('viewer').total,0);assert.equal(f.module.workspace('viewer').canWrite,false);f.import();
 for(const actor of ['manager','executive','product','viewer','admin'])assert.equal(f.module.items(actor).total,2);
 for(const actor of ['outsider','technical','production','planner','unknown'])for(const read of [()=>f.module.workspace(actor),()=>f.module.items(actor),()=>f.module.item(actor,{id:'item-1'}),()=>f.module.batch(actor,{id:'stock-1'}),()=>f.module.remarks(actor,{targetType:'item',targetId:'item-1'})])assert.throws(read,/Utility commercial price access/);
 assert.throws(()=>f.module.saveRemark('viewer',{targetType:'item',targetId:'item-1',text:'Denied',expectedVersion:0,requestId:randomUUID()}),/editing is not permitted/);assert.throws(()=>f.module.import('manager',{dataset:dataset(),requestId:randomUUID()}),/Administrator access/);
}finally{f.close();}});
test('immutable import reconciles evidence and filters bounded item, batch and barcode pages without converting missing prices to zero',()=>{const f=fixture();try{
 const before=f.store.read(),data=dataset('large-test',113),result=f.import(data);assert.deepEqual(f.store.read(),before);assert.equal(result.counts.barcodes,113);assert.equal(f.module.workspace('manager').meta.counts.items,2);
 assert.equal(f.module.items('manager',{vendor:'supplier-2',stage:'Raw',type:'Roll',quality:'LD',status:'pending',search:'pending'}).total,1);assert.equal(f.module.items('manager',{status:'unknown'}).total,0);
 const page=f.module.items('manager',{limit:'1'});assert.equal(page.rows.length,1);assert.equal(page.nextOffset,1);assert.equal(f.module.items('manager',{offset:1,limit:1}).nextOffset,null);
 const pending=f.module.item('manager',{id:'item-2'});assert.equal(pending.item.stock.value,null);assert.equal(pending.batches[0].landedRate,null);assert.equal(pending.item.stock.pendingQuantity,4);
 const item=f.module.item('manager',{id:'item-1',limit:1});assert.equal(item.total,2);assert.equal(item.batches.length,1);assert(!JSON.stringify(item).includes('ROLL-'));
 const first=f.module.batch('manager',{id:'stock-1',limit:100}),second=f.module.batch('manager',{id:'stock-1',offset:100,limit:100});assert.equal(first.total,113);assert.equal(first.barcodes.length,100);assert.equal(second.barcodes.length,13);assert.equal(new Set([...first.barcodes,...second.barcodes].map(row=>row.id)).size,113);assert(!('barcodes' in first.batch));
 for(const bad of [{limit:101},{limit:0},{offset:-1},{offset:'1.1'},{limit:'bad'}])assert.throws(()=>f.module.items('manager',bad),/Invalid/);
 for(const table of ['datasets','items','batches','barcodes'])assert.throws(()=>f.store.db.prepare('DELETE FROM utility_price_'+table).run(),/immutable/);
 const conflict=structuredClone(data);conflict.meta.limitations.push('Different');assert.throws(()=>f.import(conflict),/different immutable evidence/);assert.equal(f.module.workspace('manager').datasetId,'large-test');
}finally{f.close();}});
test('bad input and inconsistent controls roll back atomically without activating a partial dataset',()=>{const f=fixture();try{
 f.import();const invalid=[];let d=dataset('bad');d.items[0].stock.quantity++;invalid.push(d);d=dataset('bad');d.batches[0].barcodes[0].quantity=999;invalid.push(d);d=dataset('bad');d.batches[0].landedRate=100;invalid.push(d);d=dataset('bad');d.items.push(structuredClone(d.items[0]));invalid.push(d);d=dataset('bad');d.items[0].vendorId='missing';invalid.push(d);d=dataset('bad');d.batches[0].beforeCdRate='100';invalid.push(d);d=dataset('bad');d.batches[0].cdPercent=101;invalid.push(d);d=dataset('bad');d.batches[0].barcodes.push(structuredClone(d.batches[0].barcodes[0]));invalid.push(d);
 for(const data of invalid){assert.throws(()=>f.import(data));assert.equal(f.module.workspace('manager').datasetId,'test-v1');assert.equal(f.store.db.prepare('SELECT count(*) n FROM utility_price_datasets').get().n,1);}
 d=dataset('bad-identity');d.items[0].name='Different item sharing identity';assert.throws(()=>f.import(d),/stable item identity/);assert.equal(f.store.db.prepare('SELECT count(*) n FROM utility_price_datasets').get().n,1);
}finally{f.close();}});
test('stage and value order uses recorded pending value; signed movements preserve positive-only weighted denominators and scoped totals',()=>{const f=fixture();try{
 const data=dataset('signed-sort');data.items[0].stage='Raw materials';data.items[1].stage='Raw materials';data.items[1].stock.sourceValue=1000;
 const negative={...data.batches[0].barcodes[0],id:'negative',barcode:'RETURN-1',quantity:-1,originalValue:-73};data.batches[0].barcodes.push(negative);data.batches[0].quantity=1;
 Object.assign(data.items[0].stock,{quantity:1,value:99,costedQuantity:2,positiveQuantity:2,positiveCostedValue:198});Object.assign(data.items[0].combined,{quantity:4,value:396,costedQuantity:5,positiveQuantity:5,positiveCostedValue:495,weightedRate:99});
 const deferred={...data.batches[0],id:'deferred',scope:'deferred',quantity:1000,pipelineQuantity:0,barcodes:[]};data.batches.push(deferred);data.items[0].batchIds.push(deferred.id);data.items[0].deferred=summary(1000,99);
 f.import(data);const rows=f.module.items('manager').rows;assert.equal(rows[0].id,'item-2');assert.equal(f.module.workspace('manager').vendors[0].id,'supplier-2');assert.equal(rows[1].stock.weightedRate,99);assert.equal(rows[1].stock.quantity,1);assert.equal(rows[1].combined.quantity,4);assert.equal(rows[1].batchCount,3);assert(!('batchIds' in rows[1]));
 const second=new Store(join(f.dir,'isolated.sqlite'));try{const other=new UtilityPriceStore(second),input={targetType:'batch',targetId:'stock-1',text:'Durable two-connection note',expectedVersion:0,requestId:randomUUID()};other.saveRemark('manager',input);assert.equal(f.module.saveRemark('manager',input).replayed,true);assert.throws(()=>f.module.saveRemark('executive',{...input,requestId:randomUUID()}),/This remark changed/);}finally{second.close();}
}finally{f.close();}});
test('remarks preserve exact user text and actor-bound receipts, reject stale edits, and survive immutable dataset activation',()=>{const f=fixture();try{
 f.import();const input={targetType:'item',targetId:'item-1',text:'  Reviewed\nKeep source costs.  ',expectedVersion:0,requestId:randomUUID(),datasetId:'test-v1'},saved=f.module.saveRemark('manager',input);assert.equal(saved.version,1);assert.equal(saved.text,input.text);assert.equal(f.module.saveRemark('manager',input).replayed,true);assert.throws(()=>f.module.saveRemark('manager',{...input,text:'Changed retry'}),/Request identity/);
 assert.throws(()=>f.module.saveRemark('executive',{...input,requestId:randomUUID()}),/This remark changed/);assert.equal(f.module.remarks('viewer',input).version,1);assert.throws(()=>f.module.saveRemark('manager',{...input,landedRate:0}),/Only remark text/);
 f.import(dataset('test-v2'));assert.equal(f.module.remarks('manager',input).text,input.text);assert.equal(f.module.remarks('manager',input).history[0].dataset_id,'test-v1');assert.throws(()=>f.module.saveRemark('manager',{...input,expectedVersion:1,requestId:randomUUID()}),/dataset changed/);
 const batchInput={targetType:'batch',targetId:'stock-1',text:'Batch reviewed',expectedVersion:0,requestId:randomUUID()};assert.equal(f.module.saveRemark('executive',batchInput).version,1);assert.equal(f.module.remarks('manager',input).version,1);
 for(let n=1;n<4;n++)f.module.saveRemark('manager',{...batchInput,text:'Revision '+n,expectedVersion:n,requestId:randomUUID()});assert.equal(f.module.remarks('manager',{...batchInput,limit:2}).history.length,2);assert.equal(f.module.remarks('manager',{...batchInput,limit:2}).nextOffset,2);
 assert.throws(()=>f.store.db.prepare('UPDATE utility_price_remarks SET text=\'overwrite\'').run(),/immutable/);
 const current=f.store.read();current.users.find(user=>user.id==='manager').scopes=[];f.store.db.prepare('UPDATE workspace SET payload=? WHERE id=1').run(JSON.stringify(current));assert.throws(()=>f.module.saveRemark('manager',input),/Utility commercial price access/);
}finally{f.close();}});
test('Utility HTTP routes protect reads, unknown exports, static costs and all writes with login, Origin and CSRF',async()=>{const f=fixture();f.import();const server=makeServer(f.store,{log:()=>{}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;let cookie='',csrf='';
 const call=async(path,input,{origin=base,token=csrf}={})=>{const response=await fetch(base+path,{redirect:'manual',method:input?'POST':'GET',headers:{Origin:origin,Cookie:cookie,'X-CSRF-Token':token,'Content-Type':'application/json'},body:input?JSON.stringify(input):undefined});return {status:response.status,cookie:response.headers.get('set-cookie')?.split(';')[0],body:response.headers.get('content-type')?.includes('json')?await response.json():await response.text()};};
 try{
  for(const path of ['/api/utility-prices/workspace','/api/utility-prices/items','/api/utility-prices/item?id=item-1','/api/utility-prices/batch?id=stock-1','/api/utility-prices/remarks?targetType=item&targetId=item-1','/api/utility-prices/export.xlsx','/price-workings/app.mjs'])assert.equal((await call(path)).status,401,path);
  cookie=(await call('/api/login',{email:'technical@example.test',password:'Isolated-utility-test-password'})).cookie;
  for(const path of ['/api/utility-prices/workspace','/api/utility-prices/items','/api/utility-prices/export.xlsx','/price-workings/','/shared/utility-prices.mjs'])assert.equal((await call(path)).status,403,path);
  cookie=(await call('/api/login',{email:'manager@example.test',password:'Isolated-utility-test-password'})).cookie;const workspace=await call('/api/utility-prices/workspace');assert.equal(workspace.status,200);csrf=workspace.body.csrf;
  const remark={targetType:'item',targetId:'item-1',text:'HTTP note',expectedVersion:0,requestId:randomUUID()};assert.equal((await call('/api/utility-prices/remarks',remark,{token:''})).status,403);assert.equal((await call('/api/utility-prices/remarks',remark,{origin:'https://other.example'})).status,403);assert.equal((await call('/api/utility-prices/remarks',remark)).status,200);assert.equal((await call('/api/utility-prices/remarks',{...remark,requestId:randomUUID()})).status,409);
  assert.equal((await call('/api/utility-prices/import',{dataset:dataset('http-v2'),requestId:randomUUID()})).status,403);assert.equal((await call('/api/utility-prices/items?limit=101')).status,400);assert.equal((await call('/api/utility-prices/export.xlsx')).status,404);
  cookie=(await call('/api/login',{email:'admin@example.test',password:'Isolated-utility-test-password'})).cookie;csrf=(await call('/api/utility-prices/workspace')).body.csrf;assert.equal((await call('/api/utility-prices/import',{dataset:dataset('http-v2'),requestId:randomUUID()})).status,200);
 }finally{await new Promise(resolve=>server.close(resolve));f.close();}
});

 test('summary reconciliation rejects nonnumeric optional controls instead of accepting NaN comparisons',()=>{
 for(const field of ['positiveQuantity','positiveCostedValue','coveragePercent'])for(const value of ['not-a-number','100',{},[],Infinity,NaN]){
  const input=dataset('invalid-optional');input.items[0].stock[field]=value;assert.throws(()=>validateUtilityDataset(input),/finite/);
 }
 const input=dataset('wrong-coverage');input.items[0].stock.coveragePercent=50;assert.throws(()=>validateUtilityDataset(input),/reconcile/);
 });
