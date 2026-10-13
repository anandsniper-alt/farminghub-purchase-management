import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {Store} from '../server/store.mjs';
import {emptyState,makeServer} from '../server/index.mjs';
import {UtilityPriceStore} from '../server/utility-price-store.mjs';
import {buildUtilityClosing,queryUtilityClosing,UTILITY_CLOSING_COLUMNS} from '../shared/utility-closing.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const source={roll:'HDPE Roll Batchwise on 09.10.2026.xlsx',opening:'Stock Report - As on 30-09-2026.xlsx'};
function evidence(version='closing-fixture-v1'){
 const row=(id,quantity,{opening=false,barcode=id,landedValue=null,...extra}={})=>({id,barcode,quantity,recordId:(opening?'Utility:':'HDPE:')+id,warehouse:opening?'Finished warehouse':'HDPE Warehouse',source:{file:opening?source.opening:source.roll,row:2,sha256:'a'.repeat(64)},originalRate:12,originalValue:quantity===null?null:quantity*12,landedValue,inwardDate:'2026-09-15',...extra});
 const batch=(id,itemId,scope,rate,barcodes,extra={})=>({id,itemId,scope,snapshotDate:'2026-10-09',inwardDate:'2026-09-15',invoiceDate:'2026-09-20',voucher:'INV-1',invoiceRefs:[],beforeCdRate:rate,cdPercent:rate===null?null:0,netGoodsRate:rate,transportRate:rate===null?null:0,landedRate:rate,evidenceStatus:rate===null?'pending':'supported',quantity:scope==='pipeline'?0:barcodes.reduce((sum,r)=>sum+(r.quantity??0),0),pipelineQuantity:scope==='pipeline'?barcodes.reduce((sum,r)=>sum+(r.quantity??0),0):0,barcodes,...extra});
 const batches=[
  batch('stock-a','roll','activeStock',100,[row('A',2,{landedValue:200}),row('B',3,{landedValue:300}),row('negative',-1,{landedValue:-100}),row('missing',null)]),
  batch('stock-b','roll','october',200,[row('C',1,{landedValue:200})],{voucher:'INV-2'}),
  batch('stock-pending','roll','deferred',null,[row('D',4,{inwardDate:'2026-10-02'})]),
  batch('stock-estimate','roll','activeStock',150,[row('E',1,{landedValue:150,inwardDate:'2026-09-21'})],{evidenceStatus:'estimated',invoiceDate:'2026-07-01'}),
  batch('pipeline','roll','pipeline',500,[row('pipeline',20,{landedValue:10000})]),
  batch('history','roll','purchaseHistory',100,[]),
  batch('opening','fg','activeStock',40,[row('FG',5,{opening:true,landedValue:200}),row('primary',2,{opening:true,barcode:'PRIMARY',landedValue:80}),row('shop',3,{opening:true,barcode:'PRIMARY Shop',landedValue:120})],{snapshotDate:'2026-10-01',evidenceStatus:'retained',invoiceDate:null,voucher:null}),
  batch('later-fg','fg','activeStock',40,[row('lateFG',7,{landedValue:280})]),
  batch('later-raw','raw','activeStock',20,[row('lateRaw',9,{landedValue:180})]),
  batch('unreliable-opening','raw','activeStock',null,[row('unreliable',1,{opening:true,warehouse:'LDPE Warehouse'})],{snapshotDate:'2026-10-01'})
 ];
 const summary=list=>{let quantity=0,costedQuantity=0,pendingQuantity=0,value=0,positiveCostedValue=0;for(const b of list)for(const r of b.barcodes){quantity+=r.quantity??0;if(b.landedRate===null)pendingQuantity+=Math.max(0,r.quantity??0);else{costedQuantity+=Math.max(0,r.quantity??0);value+=(r.quantity??0)*b.landedRate;positiveCostedValue+=Math.max(0,r.quantity??0)*b.landedRate;}}return {quantity,costedQuantity,pendingQuantity,value:costedQuantity?value:null,weightedRate:costedQuantity?positiveCostedValue/costedQuantity:null};};
 const items=[['roll','Roll SKU','Rolls','KG'],['fg','Finished SKU','Finished goods','PCS'],['raw','Raw SKU','Raw materials','KG']].map(([id,name,stage,uom])=>{const list=batches.filter(b=>b.itemId===id),stock=list.filter(b=>b.scope==='activeStock'),pipeline=list.filter(b=>b.scope==='pipeline');return {id,name,stage,uom,vendorId:'uncertain',productType:'Test',quality:'Review',candidateVendorIds:['candidate'],stock:summary(stock),pipeline:summary(pipeline),combined:summary([...stock,...pipeline]),batchIds:list.map(b=>b.id)};});
 return {meta:{id:version},suppliers:[{id:'uncertain',name:'Supplier unconfirmed'},{id:'candidate',name:'Candidate supplier'}],items,batches};
}
function fixture(){const dir=mkdtempSync(join(tmpdir(),'fh-closing-')),seed=emptyState();seed.users.push({id:'manager',name:'Manager',role:'MANAGER',active:true,scopes:['UTILITY_DOMESTIC']},{id:'viewer',name:'Viewer',role:'VIEWER',active:true,scopes:['UTILITY_DOMESTIC']},{id:'outsider',name:'Outsider',role:'MANAGER',active:true,scopes:['LAE_IMPORT']},{id:'planner',name:'Planner',role:'PLAN_OPERATOR',active:true,scopes:['UTILITY_DOMESTIC','IMPLEMENTS_PLANNING']});const store=new Store(join(dir,'test.sqlite'),seed),module=new UtilityPriceStore(store);module.import('admin',{dataset:evidence(),requestId:randomUUID()});return {dir,store,module,close(){store.close();rmSync(dir,{recursive:true,force:true});}};}

test('closing eligibility, date grouping and partial cost weights preserve the immutable row evidence',()=>{
 const data=evidence(),before=structuredClone(data),model=buildUtilityClosing(data,hash);
 assert.deepEqual(data,before);assert.deepEqual(model.meta.counts,{items:2,batches:4,barcodes:6});
 const roll=model.itemsById.get('roll');assert.equal(roll.quantity,11);assert.equal(roll.value,850);assert.equal(roll.costedQuantity,7);assert.equal(roll.pendingQuantity,4);assert.equal(roll.weightedRate,850/7);assert.equal(roll.coveragePercent,700/11);assert.equal(roll.snapshotDate,'2026-10-08');assert.deepEqual(roll.candidateVendorIds,['candidate']);
 const sameDate=model.batchesByItem.get('roll').find(b=>b.date==='2026-09-20');assert.equal(sameDate.uom,'KG');assert.equal(sameDate.barcodeCount,3);assert.equal(sameDate.quantity,6);assert.equal(sameDate.value,700);assert.equal(sameDate.weightedRate,700/6);assert.deepEqual(sameDate.originalBatchIds,['stock-a','stock-b']);assert.deepEqual(sameDate.invoiceReferences,['INV-1','INV-2']);
 const estimate=model.batchesByItem.get('roll').find(b=>b.date==='2026-09-21');assert.equal(estimate.dateBasis,'Inward date');assert.equal(model.rowsByBatch.get(estimate.id)[0].costReferenceDate,'2026-07-01');
 const pending=model.batchesByItem.get('roll').find(b=>b.date==='2026-10-02');assert.equal(pending.value,null);assert.equal(pending.weightedRate,null);assert.equal(pending.coveragePercent,0);
 const original=data.batches[0].barcodes[0],derived=model.rowsByBatch.get(sameDate.id).find(r=>r.id==='A');assert.equal(derived.originalRate,original.originalRate);assert.equal(derived.originalValue,original.originalValue);assert.deepEqual(derived.sourceEvidence,original.source);assert.equal(derived.sourceSnapshotDate,'2026-10-09');assert.equal(derived.landedRate,100);assert.equal(derived.value,200);
 assert.equal(model.itemsById.get('fg').snapshotDate,'2026-09-30');assert.equal(model.meta.exceptions.placeholderBarcode.rows,2);assert.equal(model.meta.exceptions.missingQuantity.rows,1);assert.equal(model.meta.exceptions.negativeQuantity.rows,1);assert.equal(model.meta.exceptions.laterNonRollSnapshot.rows,2);assert.equal(model.meta.exceptions.openingRollSourceUnavailable.rows,1);assert.match(model.meta.rollCutoffBasis,/timing not independently verified/);
 assert.deepEqual(buildUtilityClosing({...data,batches:[...data.batches].reverse()},hash).batches.map(b=>b.id).sort(),model.batches.map(b=>b.id).sort());
});

test('every closing data column filters and sorts the whole set before bounded pagination',()=>{
 for(const [level,columns] of Object.entries(UTILITY_CLOSING_COLUMNS))for(const column of columns){
  const rows=Array.from({length:113},(_,n)=>({id:String(n).padStart(3,'0'),name:'n',stage:'Rolls',date:'2026-01-01',barcode:'B'+n,[column.key]:column.type==='number'?n:column.type==='date'?'2026-01-'+String(n%28+1).padStart(2,'0'):'Entry '+String(n).padStart(3,'0')}));
  const filters={[column.key]:column.type==='number'?'>=100':column.type==='date'?'2026-01-25..2026-01-28':'Entry 10'};
  const filtered=queryUtilityClosing(rows,level,{columnFilters:JSON.stringify(filters),sort:column.key,direction:'desc'},{offset:0,limit:2}),expected=rows.filter(row=>column.type==='number'?row[column.key]>=100:column.type==='date'?row[column.key]>='2026-01-25'&&row[column.key]<='2026-01-28':row[column.key].includes('Entry 10')).sort((a,b)=>column.type==='number'?b[column.key]-a[column.key]:b[column.key].localeCompare(a[column.key])||a.id.localeCompare(b.id));
  assert.equal(filtered.total,expected.length,level+' '+column.key);assert.deepEqual(filtered.rows,expected.slice(0,2));assert.equal(filtered.nextOffset,2);
  assert.deepEqual(queryUtilityClosing(rows,level,{columnFilters:JSON.stringify(filters),sort:column.key,direction:'desc'},{offset:2,limit:2}).rows,expected.slice(2,4));
 }
 for(const bad of [{columnFilters:'[]'},{columnFilters:'{'},{columnFilters:{unknown:'x'}},{columnFilters:{quantity:'>=Infinity'}},{columnFilters:{quantity:'8..2'}},{sort:'unknown'},{sort:'quantity',direction:'sideways'}])assert.throws(()=>queryUtilityClosing([],'items',bad));
 assert.throws(()=>queryUtilityClosing([],'batches',{columnFilters:{date:'2026-02-30..2026-03-01'}}));
 assert.deepEqual(queryUtilityClosing([{id:'null',quantity:null},{id:'zero',quantity:0},{id:'one',quantity:1}],'items',{sort:'quantity',direction:'desc'}).rows.map(row=>row.id),['one','zero','null']);
 assert.equal(queryUtilityClosing([{id:'one',quantity:1},{id:'two',quantity:2}],'items',{columnFilters:{quantity:'=1'}}).total,1);
 assert.deepEqual(queryUtilityClosing([{id:'pending',weightedRate:null},{id:'zero',weightedRate:0}],'items',{columnFilters:{weightedRate:'pending'}}).rows.map(row=>row.id),['pending']);
});

test('store closing pages, cached access checks and date-batch remark scopes are durable and atomic',()=>{
 const f=fixture();try{
  const before=f.store.read(),datasets=f.store.db.prepare('SELECT id,digest FROM utility_price_datasets').all();
  assert.equal(f.module.workspace('manager',{closing:'1'}).closingMeta.counts.barcodes,6);
  const items=f.module.items('manager',{closing:'1',sort:'quantity',direction:'desc',limit:1});assert.equal(items.rows[0].id,'roll');assert.equal(items.total,2);assert.equal(items.nextOffset,1);
  const detail=f.module.item('manager',{closing:'1',id:'roll',sort:'date',direction:'desc',limit:1});assert.equal(detail.rows[0].date,'2026-10-02');assert.equal(detail.total,3);
  const batch=f.module.item('manager',{closing:'1',id:'roll'}).rows.find(b=>b.date==='2026-09-20'),page=f.module.batch('manager',{closing:'1',id:batch.id,columnFilters:JSON.stringify({quantity:'>=2'}),sort:'originalValue',direction:'desc',limit:1});assert.equal(page.total,2);assert.equal(page.rows[0].id,'B');assert.equal(page.batch.id,batch.id);
  for(const actor of ['outsider','planner'])for(const read of [()=>f.module.workspace(actor,{closing:'1'}),()=>f.module.items(actor,{closing:'1'}),()=>f.module.item(actor,{closing:'1',id:'roll'}),()=>f.module.batch(actor,{closing:'1',id:batch.id})])assert.throws(read,/commercial price access/);
  assert.throws(()=>f.module.items('manager',{closing:'1',limit:101}),/Invalid limit/);
  assert.throws(()=>f.module.saveRemark('viewer',{targetType:'batch',targetId:batch.id,closing:true,text:'Denied',expectedVersion:0,requestId:randomUUID()}),/editing is not permitted/);
  const input={targetType:'batch',targetId:batch.id,closing:true,datasetId:'closing-fixture-v1',text:'  Apply to these barcodes only\nKeep exact text. ',expectedVersion:0,requestId:randomUUID()},saved=f.module.saveRemark('manager',input);
  assert.equal(saved.text,input.text);assert.deepEqual(saved.history[0].scope.barcodeIds,['A','B','C']);assert.deepEqual(saved.history[0].scope.batchIds,['stock-a','stock-b']);assert.equal(saved.history[0].scope.datasetId,'closing-fixture-v1');assert.deepEqual(saved.history[0].scope.snapshotDates,['2026-10-08']);assert.equal(saved.history[0].actor.id,'manager');assert.ok(saved.history[0].at);
  assert.equal(f.module.saveRemark('manager',input).replayed,true);assert.throws(()=>f.module.saveRemark('manager',{...input,requestId:randomUUID()}),/This remark changed/);
  const sku=f.module.saveRemark('manager',{targetType:'item',targetId:'roll',closing:true,text:'SKU instruction',expectedVersion:0,requestId:randomUUID()});assert.deepEqual(sku.history[0].scope.barcodeIds,['A','B','C','D','E']);assert.equal(f.module.remarks('viewer',{targetType:'item',targetId:page.item.id,closing:'1'}).text,'SKU instruction');
  f.module.saveRemark('manager',{targetType:'batch',targetId:'stock-a',text:'Original batch note',expectedVersion:0,requestId:randomUUID()});
  const inherited=f.module.batch('viewer',{closing:'1',id:batch.id}).sourceRemarks;assert.equal(inherited.length,1);assert.equal(inherited[0].targetId,'stock-a');assert.equal(inherited[0].text,'Original batch note');assert.deepEqual(inherited[0].appliesToBarcodeIds,['A','B']);assert.ok(!inherited[0].appliesToBarcodeIds.includes('C'));
  assert.throws(()=>f.store.db.prepare('UPDATE utility_price_remark_scopes SET scope_json=\'{}\'').run(),/immutable/);
  f.store.db.exec("CREATE TRIGGER test_scope_rollback BEFORE INSERT ON utility_price_remark_scopes BEGIN SELECT RAISE(ABORT,'Scope failure'); END;");
  assert.throws(()=>f.module.saveRemark('manager',{...input,expectedVersion:1,text:'Must not persist',requestId:randomUUID()}),/Scope failure/);assert.equal(f.module.remarks('viewer',input).version,1);f.store.db.exec('DROP TRIGGER test_scope_rollback');
  const second=new Store(join(f.dir,'test.sqlite'));try{assert.deepEqual(new UtilityPriceStore(second).remarks('viewer',input).history[0].scope,saved.history[0].scope);}finally{second.close();}
  f.module.import('admin',{dataset:evidence('closing-fixture-v2'),requestId:randomUUID()});assert.equal(f.module.item('manager',{id:'roll',closing:'1'}).rows.find(b=>b.date==='2026-09-20').id,batch.id);assert.equal(f.module.remarks('viewer',input).history[0].scope.datasetId,'closing-fixture-v1');assert.throws(()=>f.module.saveRemark('manager',{...input,expectedVersion:1,requestId:randomUUID()}),/dataset changed/);
  assert.deepEqual(f.store.read(),before);assert.deepEqual(f.store.db.prepare('SELECT id,digest FROM utility_price_datasets WHERE id=?').all(datasets[0].id),datasets);
 }finally{f.close();}
});

test('closing item and batch HTTP queries use authenticated existing routes and unchanged CSRF protection',async()=>{
 const f=fixture();for(const user of f.store.read().users)f.store.addAccount(user.id,user.id+'@example.test','Isolated-closing-password');const server=makeServer(f.store,{log:()=>{}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;let cookie='';
 const call=async(path,input,token='')=>{const response=await fetch(base+path,{method:input?'POST':'GET',headers:{Origin:base,Cookie:cookie,'Content-Type':'application/json','X-CSRF-Token':token},body:input?JSON.stringify(input):undefined});return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};};
 try{
  assert.equal((await call('/api/utility-prices/items?closing=1')).status,401);
  cookie=(await call('/api/login',{email:'manager@example.test',password:'Isolated-closing-password'})).cookie;
  const items=await call('/api/utility-prices/items?closing=1&sort=quantity&direction=desc&limit=1');assert.equal(items.status,200);assert.equal(items.data.rows[0].id,'roll');
  const item=await call('/api/utility-prices/item?closing=1&id=roll'),batchId=item.data.rows[0].id;
  const batch=await call('/api/utility-prices/batch?closing=1&id='+batchId);assert.equal(batch.status,200);assert.ok(batch.data.rows.length);
  const note={targetType:'batch',targetId:batchId,closing:true,text:'HTTP scoped note',expectedVersion:0,requestId:randomUUID()};assert.equal((await call('/api/utility-prices/remarks',note)).status,403);
  const csrf=(await call('/api/utility-prices/workspace')).data.csrf;assert.equal((await call('/api/utility-prices/remarks',note,csrf)).status,200);
  assert.equal((await call('/api/utility-prices/items?closing=1&sort=arbitrary')).status,400);
 }finally{await new Promise(resolve=>server.close(resolve));f.close();}
});
