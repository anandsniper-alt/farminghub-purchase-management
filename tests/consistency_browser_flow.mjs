/** Confirmed consistency bugs: native server and isolated standalone review. */
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Store} from '../server/store.mjs';
import {makeServer} from '../server/index.mjs';
import {createSeed} from '../shared/seed.mjs';
import {orderStatus,STATUS_LABELS} from '../shared/domain.mjs';

const out=resolve(process.env.FH_TEST_OUTPUT_ROOT||'test-output','consistency-fixes',new Date().toISOString().replace(/[:.]/g,'-'));mkdirSync(out,{recursive:true});
const seed=createSeed('2026-09-12'),draft=seed.orders.find(o=>o.status==='DRAFT'),orders=[];
let o={...structuredClone(draft),status:'ISSUED',shipments:[],confirmation:null,pi:null,technicalConfirmation:null,artwork:{current:null,pending:null,supplierConfirmed:null},preproductionSample:null,productionWindowStartedAt:null,productionStartedAt:null,productionCompletedAt:null,manualClosed:null};
const add=(status,change={})=>{Object.assign(o,change);const row={...structuredClone(o),id:'stage-'+status,number:'TEST-'+status,serialNumber:orders.length+1};assert.equal(orderStatus(row),status);orders.push(row);};
add('DRAFT',{status:'DRAFT'});add('PENDING_APPROVAL',{status:'PENDING_APPROVAL'});add('AWAITING_ACK',{status:'ISSUED'});add('AWAITING_PI',{confirmation:{revision:o.revision}});add('PI_REVIEW',{pi:{status:'VERIFIED'}});add('AWAITING_SPEC_CONFIRM',{pi:{status:'APPROVED'}});add('AWAITING_ARTWORK_CONFIRM',{technicalConfirmation:{revision:o.revision}});add('AWAITING_PAYMENT',{artwork:{current:{id:'art'},pending:null,supplierConfirmed:{artworkId:'art'}}});add('PRODUCTION_LEAD_TIME',{productionWindowStartedAt:'2026-09-12'});add('READY_FOR_PRODUCTION',{preproductionSample:{status:'APPROVED'}});add('IN_PRODUCTION',{productionStartedAt:'2026-09-12'});add('READY_TO_SHIP',{productionCompletedAt:'2026-09-12'});
const ship={...structuredClone(seed.orders.find(x=>x.shipments.length).shipments[0]),id:'fixture-shipment',status:'DEPARTED',actualDeparture:'2026-09-12',actualArrival:null,lines:o.lines.map(l=>({lineId:l.id,quantity:l.quantity}))};
add('IN_TRANSIT',{shipments:[ship]});add('PARTIAL_ARRIVAL',{shipments:[{...ship,actualArrival:'2026-09-12',lines:ship.lines.map(l=>({...l,quantity:1}))}]});add('PORT_ARRIVED',{shipments:[{...ship,actualArrival:'2026-09-12'}]});add('SHORT_CLOSED',{manualClosed:{at:'2026-09-12'}});
seed.orders=orders;seed.nextOrderSerial=orders.length+1;seed.payments=[];seed.costs=[];seed.events=[];
for(const item of seed.items.filter(i=>i.baseId))item.brandPrefix=item.code.slice(0,2);
const base=seed.bases.find(b=>seed.items.some(i=>i.baseId===b.id&&i.brandPrefix==='GJ'));seed.vendors.find(v=>v.id===base.vendorId).productionDays=30;base.productionDays=99;for(const item of seed.items.filter(i=>i.baseId===base.id))item.productionDays=47;
const store=new Store(join(out,'test.sqlite'),seed),password='Isolated-consistency-1234';store.addAccount('u-manager','manager@example.test',password);
const server=makeServer(store),report={checks:[],errors:[],out};let browser,context,page;
const check=(label,ok=true)=>{assert.ok(ok,label);report.checks.push(label);console.log('PASS '+label);};
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const {chromium}=await import(pathToFileURL(resolve('test-output/ui-tools/node_modules/playwright/index.mjs')).href);browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 for(const mode of ['server','review']){
  context=await browser.newContext({viewport:{width:1440,height:1000}});await context.tracing.start({screenshots:true,snapshots:true});page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>report.errors.push(e.message));
  const root=mode==='server'?'http://127.0.0.1:'+server.address().port:pathToFileURL(resolve('Farming_Hub_Purchase_Management_Clean_Review.html')).href;
  if(mode==='server')await page.route('**/api/bootstrap',r=>r.fulfill({status:503,contentType:'application/json',body:'{"error":"Temporary failure"}'}));
  await page.goto(root+'#/orders');
  if(mode==='server'){
   await page.getByRole('heading',{name:'Unable to load workspace'}).waitFor();check('Server failure shows a retry screen instead of a misleading login',await page.locator('#login-form').count()===0);
   await page.unroute('**/api/bootstrap');await page.getByRole('button',{name:'Try again',exact:true}).click();await page.getByLabel(/^Email/).fill('manager@example.test');await page.getByLabel(/^Password/).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();
  }else{await page.evaluate(s=>{localStorage.setItem('fh-purchase-alpha15-clean-schema7',JSON.stringify(s));localStorage.setItem('fh-purchase-alpha15-clean-schema7-user','u-manager');},seed);await page.reload();}
  await page.locator('#order-sort').waitFor();const before=mode==='server'?store.read():await page.evaluate(()=>JSON.parse(localStorage.getItem('fh-purchase-alpha15-clean-schema7')));
  await page.getByRole('button',{name:'Board',exact:true}).click();
  const ids=await page.locator('.board-card').evaluateAll(es=>es.map(e=>e.dataset.id));check(mode+': every derived stage appears once in Board',ids.length===orders.length&&new Set(ids).size===orders.length&&orders.every(o=>ids.includes(o.id)));
  for(const status of ['AWAITING_ACK','PI_REVIEW','AWAITING_SPEC_CONFIRM','AWAITING_ARTWORK_CONFIRM','AWAITING_PAYMENT','PRODUCTION_LEAD_TIME']){await page.locator('#status-filter').selectOption(status);check(mode+': filtered '+status+' remains visible',await page.locator('.board-card').count()===1&&(await page.locator('.board-card').innerText()).includes(STATUS_LABELS[status]));}
  await page.goto(root+'#/overview');await page.locator('.pipeline-bars').waitFor();const counts=await page.locator('.pipeline-bars .bar-line>b').allTextContents();check(mode+': Overview stage totals account for every visible order',counts.map(Number).reduce((a,b)=>a+b,0)===orders.length);
  await page.goto(root+'#/vendors');await page.getByRole('heading',{name:'Vendor code master',exact:true}).waitFor();check(mode+': populated Vendor master renders in the browser',await page.locator('tbody tr').count()>0);
  await page.setViewportSize({width:1440,height:450});check(mode+': short sidebar can scroll',await page.locator('.sidebar').evaluate(el=>getComputedStyle(el).overflowY==='auto'&&el.scrollHeight>el.clientHeight));
  const last=page.locator('.sidebar [data-action=nav]').last();await last.scrollIntoViewIfNeeded();const box=await last.boundingBox();check(mode+': final navigation item is reachable',box.y>=0&&box.y+box.height<=451);await page.setViewportSize({width:1440,height:1000});
  await page.goto(root+'#/orders');await page.getByRole('button',{name:'Create purchase order',exact:true}).click();await page.locator('[name=vendorId]').selectOption(base.vendorId);await page.locator('[data-plan="0"][data-key=baseId]').selectOption(base.id);
  const commitment=page.locator('[name=productionDays]');check(mode+': no ordered quantity uses the server supplier fallback',await commitment.inputValue()==='30');
  await page.locator('[name=notes]').fill('Preserve this unsaved test note');const qty=page.locator('[data-plan="0"][data-brand=GJ]');await qty.fill('2');
  check(mode+': quantity input shows the actual item reference',await commitment.locator('../..').innerText().then(t=>t.includes('Selected item reference: 47 days')));
  check(mode+': differing commitment exposes the override reason',await page.locator('[name=productionOverrideReason]').isVisible());check(mode+': hint update preserves focused quantity and unsaved notes',await qty.evaluate(el=>el===document.activeElement)&&await page.locator('[name=notes]').inputValue()==='Preserve this unsaved test note');
  await qty.fill('0');check(mode+': removing quantities restores supplier fallback and removes unnecessary override',await page.locator('[name=productionOverrideReason]').count()===0);
  await page.keyboard.press('Escape');const after=mode==='server'?store.read():await page.evaluate(()=>JSON.parse(localStorage.getItem('fh-purchase-alpha15-clean-schema7')));check(mode+': view and hint checks leave stored business data unchanged',JSON.stringify(before)===JSON.stringify(after));
  await page.screenshot({path:join(out,mode+'.png'),fullPage:true});await context.tracing.stop({path:join(out,mode+'-trace.zip')});await context.close();context=null;
 }
 check('No browser runtime errors',report.errors.length===0);report.status='PASS';
}catch(e){report.status='FAIL';report.failure=String(e.stack||e);console.error(report.failure);await page?.screenshot({path:join(out,'failure.png'),fullPage:true}).catch(()=>{});process.exitCode=1;}
finally{await context?.tracing.stop({path:join(out,'failure-trace.zip')}).catch(()=>{});await browser?.close();await new Promise(r=>server.close(r));store.close();writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2));console.log('Evidence: '+out);}
