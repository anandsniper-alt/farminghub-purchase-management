/** AUD-22: isolated synthetic records; never reads .env or a live database. */
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Store} from '../server/store.mjs';
import {makeServer} from '../server/index.mjs';
import {createSeed} from '../shared/seed.mjs';
import {execute,TERMS,isoDay,orderTotal,major,financials} from '../shared/domain.mjs';

const {chromium}=await import(pathToFileURL(resolve(process.env.FH_PLAYWRIGHT_MODULE||'test-output/ui-tools/node_modules/playwright/index.mjs')).href);
const day=isoDay(),at=day+'T08:00:00.000Z',dir=mkdtempSync(join(tmpdir(),'fh-test-data-browser-'));
let seed=createSeed(day);
seed={...seed,orders:[],payments:[],files:[],events:[],costs:[],imports:[],revision:0};
const admin=seed.users.find(u=>u.role==='ADMIN');
const run=(type,payload)=>{const result=execute(seed,{type,payload},admin,{now:at,id:randomUUID});seed=result.state;return result.result;};
const order=id=>seed.orders.find(o=>o.id===id);
const file=orderIds=>{const id=randomUUID();seed.files.push({id,name:'Synthetic evidence.txt',mime:'text/plain',size:36,orderIds,scope:'LAE_IMPORT',uploadedAt:at,uploadedBy:admin.name,demoContent:'Synthetic browser regression evidence.'});return id;};
const evidence=(type,id,extra={})=>run(type,{orderId:id,fileId:file([id]),remarks:'Synthetic supplier evidence',...extra});
const item=seed.items.find(i=>i.code==='GJPW12'),base=seed.bases.find(b=>b.id===item.baseId);
function issued(quantity){
 const id=run('CREATE_ORDER',{vendorId:base.vendorId,buyerId:seed.users.find(u=>u.role==='EXECUTIVE').id,currency:'USD',priceListCurrency:'USD',paymentTerms:TERMS.find(t=>t.id==='credit60'),productionDays:30,productionOverrideReason:'Synthetic supplier agreement',planningTat:60,routeId:seed.routes[0].id,requestedPortDate:day,lines:[{itemId:item.id,quantity,unitPrice:'100',specId:base.specifications[0].id}]}).id;
 run('SUBMIT_ORDER',{orderId:id});run('APPROVE_ORDER',{orderId:id});
 evidence('CONFIRM_SUPPLIER',id,{channel:'EMAIL'});
 evidence('RECORD_PI',id,{number:'SYNTHETIC-PI-'+quantity,date:day,currency:'USD',amount:major(orderTotal(order(id))),quantity,termsConfirmed:true,commitmentConfirmed:true});
 run('VERIFY_PI',{orderId:id});run('APPROVE_PI',{orderId:id});
 return id;
}
function shipped(quantity,label){
 const id=issued(quantity);
 evidence('CONFIRM_TECHNICAL',id,{channel:'EMAIL'});evidence('SUBMIT_ARTWORK',id);run('APPROVE_ARTWORK',{orderId:id});evidence('CONFIRM_ARTWORK',id);
 run('RECORD_PREPRODUCTION_SAMPLE',{orderId:id,remarks:'Synthetic sample'});run('APPROVE_PREPRODUCTION_SAMPLE',{orderId:id,result:'APPROVED',remarks:'Synthetic approval'});
 run('START_PRODUCTION',{orderId:id,date:day,remarks:'Synthetic start'});run('RECORD_BULK_QC',{orderId:id,result:'PASS',remarks:'Synthetic QC'});run('COMPLETE_PRODUCTION',{orderId:id,date:day,remarks:'Synthetic completion'});
 const sid=run('ADD_SHIPMENT',{orderId:id,number:label,containerType:'40HC',origin:'NINGBO',destination:'CHENNAI',etd:day,eta:day,lines:[{lineId:order(id).lines[0].id,quantity}]}).id;
 run('BOOK_CONTAINER',{orderId:id,shipmentId:sid,forwarderId:seed.vendors.find(v=>v.kind==='LOGISTICS'&&v.status==='ACTIVE').id,forwarderRef:label+'-RO',date:day,freightUsd:'100',remarks:'Synthetic booking'});
 run('RELEASE_CONTAINER',{orderId:id,shipmentId:sid,container:label+'-CONTAINER',date:day,remarks:'Synthetic release'});
 for(const type of ['COMMERCIAL_INVOICE','PACKING_LIST'])evidence('ATTACH_DOCUMENT',id,{shipmentId:sid,type,invoiceNumber:label+'-CI',invoiceDate:day});
 run('DISPATCH_SHIPMENT',{orderId:id,shipmentId:sid,date:day,vessel:'SYNTHETIC',voyage:'TEST',remarks:'Synthetic departure'});
 evidence('RECORD_BL',id,{shipmentId:sid,number:label+'-BL',date:day});
 run('AUTHORIZE_PAYMENT',{orderId:id,termIndex:0,shipmentId:sid});
 return {id,sid};
}
const real=shipped(10,'REAL-ACTIVE-LOAD'),deleted=shipped(20,'REAL-DELETED-LOAD'),sample=shipped(30,'SAMPLE-LOAD'),deletedSample=issued(40);
const mixed=run('RECORD_PAYMENT',{reference:'MIXED-BANK-5000',date:day,currency:'USD',amount:'5000',inrRate:'85',fileId:file([real.id,deleted.id,sample.id]),allocations:[[real,'1000'],[deleted,'2000'],[sample,'2000']].map(([o,amount])=>({orderId:o.id,termIndex:0,shipmentId:o.sid,amount,invoiceRate:'1'}))});
run('RECORD_PAYMENT',{reference:'SAMPLE-ONLY-BANK-1000',date:day,currency:'USD',amount:'1000',inrRate:'85',fileId:file([sample.id]),allocations:[{orderId:sample.id,termIndex:0,shipmentId:sample.sid,amount:'1000',invoiceRate:'1'}]});
run('DELETE_ORDERS',{orderIds:[deleted.id,deletedSample],remarks:'Synthetic retained historical orders'});
const retainedPayments=structuredClone(seed.payments),retainedSampleRevisions=structuredClone(order(sample.id).revisions);
run('MARK_ORDER_TEST_DATA',{orderId:sample.id,reason:'Synthetic sample excluded from business totals'});
run('MARK_ORDER_TEST_DATA',{orderId:deletedSample,reason:'Synthetic deleted sample excluded from business totals'});
assert.deepEqual(seed.payments,retainedPayments);assert.deepEqual(order(sample.id).revisions,retainedSampleRevisions);
assert.equal(financials(seed,order(sample.id)).reported,300000);assert.equal(financials(seed,order(deleted.id)).reported,200000);
const numbers=Object.fromEntries([real,deleted,sample].map(o=>[o.id,order(o.id).number]));
const store=new Store(join(dir,'test.sqlite'),seed),password='Synthetic-test-data-browser-2026';
store.addAccount(admin.id,'test-data-admin@example.test',password);
const before=store.read(),server=makeServer(store,{log:()=>{}}),failures=[],errors=[];
let browser,page;
const check=async(name,fn)=>{try{await fn();console.log('PASS '+name);}catch(error){failures.push({name,error:error.message});console.error('FAIL '+name+': '+error.message);}};
const noActions=async actions=>assert.deepEqual(await page.locator(actions.map(a=>'[data-action="'+a+'"]').join(',')).evaluateAll(es=>es.map(e=>e.dataset.action)),[]);
try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,...(process.env.FH_BROWSER_PATH?{executablePath:process.env.FH_BROWSER_PATH}:{})});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/#/payments');await page.getByLabel(/^Email/).fill('test-data-admin@example.test');await page.getByLabel(/^Password/).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByRole('heading',{name:'Payments & settlement',exact:true}).waitFor();
 const register=page.locator('.panel').filter({has:page.getByRole('heading',{name:'Remittance register',exact:true})}),settlements=page.locator('.panel').filter({has:page.getByRole('heading',{name:'Order-by-order settlement',exact:true})});
 await check('mixed bank row shows business 3000, original 5000 and test portion 2000',async()=>{const row=register.locator('tbody tr').filter({hasText:'MIXED-BANK-5000'});assert.equal(await row.count(),1);const money=await row.locator('td').nth(3).innerText();assert.match(money,/^\$3,000\.00/);assert.match(money,/Full bank total \$5,000\.00 · Test data portion \$2,000\.00/);assert.equal(await row.locator('a[href="#/order/'+sample.id+'"]').count(),0);assert.equal(await row.locator('a[href="#/order/'+deleted.id+'"]').count(),1);assert.equal(await register.getByText('SAMPLE-ONLY-BANK-1000',{exact:true}).count(),0);});
 await check('payment KPIs exclude sample allocations and include deleted legitimate order',async()=>{for(const [label,expected]of [['Recorded remittances','1'],['Awaiting supplier receipt','2'],['Arrived, not settled','0'],['Orders with payments','2']])assert.equal(await page.locator('.kpi').filter({has:page.locator('.kpi-top span').getByText(label,{exact:true})}).locator('.kpi-value').innerText(),expected,label);});
 await check('settlement table retains deleted legitimate value and excludes both samples',async()=>{assert.equal(await settlements.locator('tbody tr').count(),2);const deletedRow=settlements.locator('tr[data-id="'+deleted.id+'"]');assert.equal(await deletedRow.count(),1);assert.match(await deletedRow.innerText(),/Deleted/);assert.equal(await deletedRow.locator('td').nth(2).innerText(),'$2,000.00');assert.equal(await deletedRow.locator('td').nth(4).innerText(),'$2,000.00');assert.equal(await settlements.locator('tr[data-id="'+sample.id+'"],tr[data-id="'+deletedSample+'"]').count(),0);});

 await page.goto(origin+'/#/order/'+sample.id);await page.getByRole('heading',{name:new RegExp(numbers[sample.id])}).waitFor();
 await check('sample detail retains full obligation and classification explanation',async()=>{assert.match(await page.locator('main').innerText(),/Test data · read-only/);assert.match(await page.locator('main').innerText(),/Synthetic sample excluded from business totals/);assert.match(await page.locator('.detail-summary').innerText(),/\$3,000\.00/);});
 for(const [tab,label,actions]of [
  ['finance','sample PI and payment history stays visible without edit actions',['order-payment-terms','pi','verify-pi','approve-pi','payment','receipt','authorize-payment','revoke-payment-authorization','cost']],
  ['items','sample product and artwork actions are read-only',['edit-lines','artwork','approve-artwork','confirm-artwork','technical','approve-spec','submit-artwork','record-supplier-artwork','record-preproduction-sample']],
  ['shipments','sample shipping actions are read-only',['shipment','book-container','release-container','dispatch','bl','arrival','shipment-update','document','tracking-milestone','cancel-shipment']],
  ['documents','sample documents remain visible without upload actions',['document','upload-document']],
  ['history','sample original audit history and classification remain visible without note actions',['note']]
 ]){
  await page.locator('.tab[data-value="'+tab+'"]').click();
  await check(label,async()=>{await noActions(actions);const readActions=new Set(['nav','open-order','tab','print','file']);assert.deepEqual(await page.locator('main [data-action]').evaluateAll(es=>[...new Set(es.map(e=>e.dataset.action))]).then(actions=>actions.filter(a=>!readActions.has(a))),[],'Only navigation, print and original evidence actions are allowed');if(tab==='finance'){const allocationPanel=page.locator('.panel').filter({has:page.getByRole('heading',{name:'Bank payment allocations',exact:true})});assert.equal(await allocationPanel.locator('tbody tr').count(),2);assert.match(await allocationPanel.innerText(),/MIXED-BANK-5000/);assert.match(await allocationPanel.innerText(),/SAMPLE-ONLY-BANK-1000/);assert.match(await allocationPanel.innerText(),/\$2,000\.00/);}if(tab==='history'){const text=await page.locator('.timeline').innerText();assert.match(text,/ORDER MARKED TEST DATA/);assert.match(text,/PAYMENT REPORTED/);assert.match(text,/SHIPMENT PLANNED/);}if(tab==='documents')assert.ok(await page.getByRole('button',{name:/Open|Download|Receipt|PI/}).count()>0,'Original evidence remains accessible');});
 }
 await page.goto(origin+'/#/order/'+deletedSample);await page.getByRole('heading',{name:'Retained order record',exact:true}).waitFor();
 await check('deleted sample retains history, visible test classification and no restore action',async()=>{await noActions(['restore-orders','note','document']);assert.match(await page.locator('main').innerText(),/test data/i);assert.match(await page.locator('main').innerText(),/Synthetic deleted sample excluded from business totals/);assert.match(await page.locator('.timeline').innerText(),/ORDER MARKED TEST DATA/);});

 await page.goto(origin+'/#/loading');await page.getByRole('heading',{name:'Loading & shipping',exact:true}).waitFor();
 await check('loading workspace excludes marked sample and preserves active business shipment',async()=>{const rows=page.getByRole('region',{name:'Loading records',exact:true});assert.match(await rows.innerText(),/REAL-ACTIVE-LOAD/);assert.doesNotMatch(await rows.innerText(),/SAMPLE-LOAD|REAL-DELETED-LOAD/);assert.equal(await rows.locator('tbody tr').count(),1);assert.equal(await page.getByRole('link',{name:'All records · 1',exact:true}).count(),1);});
 await check('browser inspection preserves original payment and transaction history',async()=>{assert.deepEqual(store.read(),before);assert.deepEqual(store.read().payments,retainedPayments);assert.equal(store.read().payments.find(p=>p.id===mixed.id).amountMinor,500000);assert.deepEqual(errors,[]);});
 assert.deepEqual(failures,[],'AUD-22 browser regression failures');
}finally{
 await browser?.close();if(server.listening)await new Promise(resolve=>server.close(resolve));store.close();
 if(resolve(dir).startsWith(resolve(tmpdir())+sep))rmSync(dir,{recursive:true,force:true});
}
