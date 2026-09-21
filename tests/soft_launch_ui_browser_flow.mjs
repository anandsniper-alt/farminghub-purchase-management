/** Browser regressions for defects reproduced through Ashok's live UI.
 * This isolated fixture is not live QA evidence and never accesses live data. */
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createSeed} from '../shared/seed.mjs';
import {Store} from '../server/store.mjs';
import {makeServer} from '../server/index.mjs';
import {TERMS} from '../shared/domain.mjs';
const out=resolve(process.env.FH_TEST_OUTPUT_ROOT||'test-output','soft-launch-ui',new Date().toISOString().replace(/[:.]/g,'-'));mkdirSync(out,{recursive:true});
const seed=createSeed('2026-09-12');
seed.bases.push({...structuredClone(seed.bases[0]),id:'qa-base-no-erp',code:'QAMISSING',productName:'QA missing brand mappings'});
const template=structuredClone(seed.orders.find(o=>o.status==='DRAFT'));
const make=(id,change={})=>({...structuredClone(template),id,number:'QA-REGRESSION-'+id,numberSource:undefined,serialNumber:1,buyerId:'u-manager',shipments:[],tasks:[{id:'task-'+id,title:'Supplier follow-up',ownerId:'u-manager',due:'2026-09-19'}],...change});
const draft=make('draft');
const pending=make('pending',{status:'PENDING_APPROVAL',serialNumber:2});
const approvedArt={id:'qa-art'};
const issued=make('issued',{status:'ISSUED',serialNumber:3,revisions:[{revision:1,at:'2026-09-12'}],revision:1,confirmation:{revision:1},technicalConfirmation:{revision:1},artwork:{current:approvedArt,pending:null,supplierConfirmed:{artworkId:approvedArt.id}},pi:{status:'APPROVED',date:'2026-09-12',amountMinor:10000,currency:'USD',quantity:10},productionWindowStartedAt:'2026-09-12',preproductionSample:{status:'REJECTED'}});
issued.revisions[0].snapshot={lines:issued.lines.map(l=>({...l,specId:null,specification:null}))};
const shipTemplate=structuredClone(seed.orders.find(o=>o.shipments.length).shipments[0]);
const partial=make('partial',{...issued,id:'partial',number:'QA-REGRESSION-partial',serialNumber:4,preproductionSample:{status:'APPROVED'},productionStartedAt:'2026-09-12',productionCompletedAt:'2026-09-12',bulkQc:{result:'PASS'},shipments:[{...shipTemplate,id:'qa-shipment',number:'QA-SHIP',status:'DEPARTED',bookingStatus:'ON_VESSEL',actualDeparture:'2026-09-12',actualArrival:null,blNumber:null,insurance:null,lines:[{lineId:template.lines[0].id,quantity:1}]}]});
const booking=make('booking',{...partial,id:'booking',number:'QA-REGRESSION-booking',serialNumber:5,shipments:[{...partial.shipments[0],status:'PLANNED',bookingStatus:'PLANNED',actualDeparture:null}]});
const commitment=make('commitment',{...partial,id:'commitment',number:'QA-REGRESSION-commitment',serialNumber:6,productionCompletedAt:null,productionDue:'2026-11-11',baselineProductionDue:'2026-11-11',shipments:[]});
for(const o of [partial,booking])o.paymentTerms=structuredClone(TERMS.find(t=>t.id==='credit60'));
for(const o of [issued,partial,booking,commitment])if(o.pi)o.pi={...o.pi,id:'qa-pi-'+o.id};
seed.orders=[draft,pending,issued,partial,booking,commitment];seed.nextOrderSerial=7;seed.payments=[];seed.events=[];seed.files=[];seed.vendors=seed.vendors.filter(v=>v.kind!=='LOGISTICS');
const store=new Store(join(out,'test.sqlite'),seed);store.addAccount('u-manager','qa-regression@example.test','Isolated-QA-Regression-1234');const server=makeServer(store);
const report={checks:[],errors:[],out};let browser,context,page;
const check=(name,pass)=>{report.checks.push({name,pass});console.log((pass?'PASS ':'FAIL ')+name);};
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const {chromium}=await import(process.env.FH_PLAYWRIGHT_MODULE||pathToFileURL(resolve('test-output/ui-tools/node_modules/playwright/index.mjs')).href);
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 for(const mode of ['server','review']){
  context=await browser.newContext({viewport:{width:1440,height:1000}});page=await context.newPage();page.setDefaultTimeout(7000);page.on('pageerror',e=>report.errors.push(e.message));
  const root=mode==='server'?'http://127.0.0.1:'+server.address().port:pathToFileURL(resolve('Farming_Hub_Purchase_Management_Clean_Review.html')).href;
  await page.goto(root+'#/order/draft');
  if(mode==='server'){await page.getByLabel(/^Email/).fill('qa-regression@example.test');await page.getByLabel(/^Password/).fill('Isolated-QA-Regression-1234');await page.getByRole('button',{name:'Sign in',exact:true}).click();}
  else{await page.evaluate(s=>{localStorage.setItem('fh-purchase-alpha15-clean-schema7',JSON.stringify(s));localStorage.setItem('fh-purchase-alpha15-clean-schema7-user','u-manager');},seed);await page.reload();}
  await page.locator('.current-stage-card').waitFor();
  check(mode+': draft stage does not claim submission',await page.locator('.current-stage-card h2').innerText()==='Draft');
  check(mode+': follow-up displays actual owner',await page.locator('tr').filter({hasText:'Supplier follow-up'}).innerText().then(t=>t.includes('Purchase Manager')&&!t.includes('Unassigned')));
  await page.goto(root+'#/order/pending');await page.locator('.current-stage-card').waitFor();
  check(mode+': pending approval does not claim issued',await page.locator('.current-stage-card h2').innerText()==='Awaiting PO approval');
  await page.goto(root+'#/order/issued');await page.locator('.current-stage-card').waitFor();
  check(mode+': rejected sample is not described as approved',await page.locator('.current-stage-card h2').innerText()==='Pre-production sample rejected');
  await page.locator('.tab[data-value=items]').click();check(mode+': issued missing PLM explains its historical absence',(await page.locator('.spec-text').first().innerText()).includes('not available in this issued revision'));
  check(mode+': missing PLM is not a green approval badge',await page.locator('.badge.amber').filter({hasText:'PLM unavailable'}).count()>0);
  await page.goto(root+'#/order/partial');await page.locator('.head-actions').waitFor();
  check(mode+': existing shipment BL is the required primary action',await page.locator('.head-actions [data-action=bl]').count()===1&&await page.locator('.head-actions [data-action=shipment]').count()===0);
  await page.goto(root+'#/order/booking');await page.locator('.tab[data-value=shipments]').click();await page.locator('.ship-actions [data-action=container-book]').click();
  check(mode+': empty forwarder picker explains setup recovery',(await page.locator('#dialog-form').innerText()).includes('No active logistics provider')&&(await page.locator('#dialog-form').innerText()).includes('Vendor master'));
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:join(out,mode+'-booking.png'),fullPage:true});
  await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.setViewportSize({width:1440,height:1000});
  await page.goto(root+'#/items');await page.getByRole('button',{name:'Add ERP item',exact:true}).click();
  const base=seed.bases.find(b=>b.id==='qa-base-no-erp'),brand=seed.brands.find(b=>b.prefix==='GJ');
  await page.locator('[name=code]').fill('GJ-QA-NEW');await page.locator('[name=name]').fill('QA new ERP item');await page.locator('[name=baseId]').selectOption(base.id);await page.locator('[name=brand]').selectOption(brand.name);await page.locator('[name=category]').selectOption(base.category);
  await page.locator('#dialog-form button[type=submit]').click();await page.getByRole('dialog').waitFor({state:'hidden'});
  await page.locator('.tab[data-value=items]').click();await page.locator('#view-search').fill('GJ-QA-NEW');
  check(mode+': new ERP item is available in the library',await page.locator('tbody').innerText().then(t=>t.includes('GJ-QA-NEW')));
  const saved=mode==='server'?store.read():await page.evaluate(()=>JSON.parse(localStorage.getItem('fh-purchase-alpha15-clean-schema7')));
  const item=saved.items.find(i=>i.code==='GJ-QA-NEW');check(mode+': ERP item saves the PO brand mapping and pending approval',item?.brandPrefix==='GJ'&&item.baseItemCode===base.code&&item.brandDeltaStatus==='PENDING');
  await page.goto(root+'#/product/'+base.id);check(mode+': product offers ERP setup',await page.getByRole('button',{name:'Add ERP item',exact:true}).count()===1);
  await page.goto(root+'#/orders');await page.getByRole('button',{name:'Create purchase order',exact:true}).click();await page.locator('[name=vendorId]').selectOption(base.vendorId);await page.locator('[name=base-0]').selectOption(base.id);await page.locator('[name=qty-0-GJ]').fill('2');await page.locator('[name=qty-0-KD]').evaluate(e=>{e.disabled=false;e.value='3';e.dispatchEvent(new Event('input',{bubbles:true}))});await page.locator('[name=baseprice-0]').fill('10');await page.locator('details.po-terms > summary').click();await page.locator('[name=planningTat]').fill('90');await page.locator('[name=routeId]').selectOption({index:1});
  await page.locator('[name=requestedPortDate]').fill('2026-12-15');if(await page.locator('[name=productionOverrideReason]').count())await page.locator('[name=productionOverrideReason]').fill('QA explicit supplier commitment.');
  const priorOrders=mode==='server'?store.read().orders.length:await page.evaluate(()=>JSON.parse(localStorage.getItem('fh-purchase-alpha15-clean-schema7')).orders.length);
  await page.locator('#dialog-form button[type=submit]').click();await page.waitForTimeout(400);
  const afterOrders=mode==='server'?store.read().orders.length:await page.evaluate(()=>JSON.parse(localStorage.getItem('fh-purchase-alpha15-clean-schema7')).orders.length);console.log(mode+' missing-mapping check: orders '+priorOrders+' -> '+afterOrders+'; '+(await page.locator('#modal-error').count()?await page.locator('#modal-error').innerText():'dialog closed'));
  check(mode+': missing KD mapping cannot silently drop requested quantity',await page.getByRole('dialog').count()===1&&(await page.locator('#modal-error').innerText()).includes('KD ERP item'));
  if(await page.getByRole('dialog').count())await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.goto(root+'#/shipments');await page.locator('.tab[data-value=rates]').click();await page.getByRole('button',{name:'Upload weekly rate sheet',exact:true}).click();
  const header='PORT OF LOADING,PORT OF DISCHARGE,VOLUME,O/F USD,SCHEDULE\n';
  await page.locator('#rate-import-file').setInputFiles({name:'QA-invalid-rate.csv',mimeType:'text/csv',buffer:Buffer.from(header+'Ningbo,Chennai,1X40HC,USD -3000,QA ONLY\n')});
  await page.locator('#dialog-form tbody tr').waitFor();check(mode+': invalid freight preview blocks commit',await page.locator('#dialog-form button[type=submit]').isDisabled()&&(await page.locator('#dialog-form').innerText()).includes('REJECTED'));
  await page.locator('#rate-import-file').setInputFiles({name:'QA-valid-rate.csv',mimeType:'text/csv',buffer:Buffer.from(header+'Ningbo,Chennai,1X40HC,"USD 3,001.25",QA ONLY\n')});
  await page.waitForFunction(()=>document.querySelector('#dialog-form')?.innerText.includes('QA-valid-rate.csv'));
  check(mode+': grouped USD rate keeps its full benchmark',(await page.locator('#dialog-form tbody').innerText()).replaceAll(',','').includes('3121.25')&&await page.locator('#dialog-form button[type=submit]').isEnabled());
  await page.screenshot({path:join(out,mode+'-freight-preview.png'),fullPage:true});await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.goto(root+'#/order/commitment');await page.locator('.tab[data-value=overview]').click();await page.getByRole('button',{name:'Update commitment',exact:true}).click();await page.locator('[name=date]').fill('2026-11-18');await page.locator('[name=reason]').selectOption('Payment processing');await page.locator('[name=remarks]').fill('QA commitment audit cause');await page.locator('#dialog-form button[type=submit]').click();await page.getByRole('dialog').waitFor({state:'hidden'});await page.locator('.tab[data-value=history]').click();await page.locator('.timeline-event').filter({hasText:'COMMITMENT UPDATED'}).locator('summary').click();
  const history=await page.locator('.timeline-event').filter({hasText:'COMMITMENT UPDATED'}).innerText();check(mode+': commitment audit keeps reason and original baseline',history.includes('Payment processing')&&history.includes('2026-11-11')&&history.includes('2026-11-18'));
  const usedItem=seed.items.find(i=>i.id===issued.lines[0].itemId),oldIssuedCode=issued.lines[0].code;await page.goto(root+'#/product/'+usedItem.baseId);const usedRow=page.locator('tr').filter({hasText:usedItem.code}).first();check(mode+': PLM product exposes Item Master identity correction',await usedRow.getByRole('button',{name:'Edit item master',exact:true}).count()===1);await usedRow.getByRole('button',{name:'Edit item master',exact:true}).click();check(mode+': item and brand codes are editable',await page.locator('[name=code]').isEditable()&&await page.locator('[name=brand]').isEnabled()&&await page.locator('[name=identityReason]').count()===1);await page.locator('[name=code]').fill(usedItem.code+'-FIX');await page.locator('[name=identityReason]').fill('Correct legacy ERP item code from Item Master.');await page.locator('#dialog-form button[type=submit]').click();await page.getByRole('dialog').waitFor({state:'hidden'});const correctedState=mode==='server'?store.read():await page.evaluate(()=>JSON.parse(localStorage.getItem('fh-purchase-alpha15-clean-schema7')),null);check(mode+': Item Master correction saves without rewriting issued PO',correctedState.items.find(i=>i.id===usedItem.id)?.code===usedItem.code+'-FIX'&&correctedState.orders.find(o=>o.id==='issued').lines[0].code===oldIssuedCode);
  await context.close();context=null;
 }
 check('No browser runtime errors',report.errors.length===0);
}catch(e){report.failure=String(e.stack||e);console.error(report.failure);}
finally{await context?.close();await browser?.close();await new Promise(r=>server.close(r));store.close();report.status=report.failure||report.checks.some(c=>!c.pass)?'FAIL':'PASS';writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2));console.log('Evidence: '+out);if(report.status==='FAIL')process.exitCode=1;}
