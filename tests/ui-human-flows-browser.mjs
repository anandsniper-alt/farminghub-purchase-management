/** Browser checks for the repaired purchase, planning, and stock forms. */
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,sep,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {Store} from '../server/store.mjs';
import {makeServer} from '../server/index.mjs';
import {ImplementsStore} from '../server/implements-store.mjs';
import {ProductionStore} from '../server/production-store.mjs';
import {PlanningStore} from '../server/planning-store.mjs';
import {createCleanSeed} from '../shared/clean-seed.mjs';
import {blankState,ensureMonthly,createOrders} from '../shared/implements/domain.mjs';
import {applyOrderEvent,orderProgress} from '../shared/implements/procurement.mjs';

const {chromium}=await import(pathToFileURL(resolve(process.env.FH_PLAYWRIGHT_MODULE||'test-output/ui-tools/node_modules/playwright/index.mjs')).href);
const mode=process.env.FH_BROWSER_MODE||'server';
assert.ok(['server','review'].includes(mode),'FH_BROWSER_MODE must be server or review');
const dir=mkdtempSync(join(tmpdir(),'fh-ui-human-flows-'));
const seed=createCleanSeed(),password='Synthetic-human-flow-password';
seed.users.push({id:'ui-planner',name:'Browser Planner',role:'PLAN_OPERATOR',scopes:['IMPLEMENTS_PLANNING'],active:true});
const base=seed.bases.find(b=>b.id==='base-bs20');
assert.ok(base,'purchase fixture base');
const supplier=seed.vendors.find(v=>v.id===base.vendorId),otherSupplier=seed.vendors.find(v=>v.id==='vendor-v31');
supplier.productionDays=25;
for(const item of seed.items.filter(i=>i.baseId===base.id))item.productionDays=47;
const store=new Store(join(dir,'test.sqlite'),seed);
store.addAccount('u-admin','ui-admin@example.test',password);
store.addAccount('ui-planner','ui-planner@example.test',password);
const source=new ImplementsStore(store);
const month='2026-10';
const impl=ensureMonthly(blankState({version:'ui-test',models:[{
 id:'S2.V58',series:'Leader',name:'Leader',configuration:'S2-V-ELITE-7FT-48-MS-OB-CEN',frame:'V',size:'7FT',blades:48,speed:'MS',bladeOrientation:'OB',gearboxOrientation:'CEN',revision:1,bomAvailable:true,salesConfirmed:true,
 lines:[{partId:'bolt',ppm:4},{partId:'oil',ppm:1.125}],fabrication:[{partId:'fp',code:'FP1',name:'Patta',ppm:1,weight:2.2}],fabricationCode:'FAB-S2V58',fabricationSupplier:'supplier',costs:{},history:[]
}],parts:[{id:'bolt',code:'IMP-1',name:'Bolt',uom:'pcs',fabricated:false,supplier:'supplier'},{id:'oil',code:'IMP-2',name:'Oil',uom:'ltr',fabricated:false,supplier:'supplier'}],suppliers:[{id:'supplier',name:'Synthetic supplier'}]}),month);
impl.stock={bolt:{qty:100},oil:{qty:20},'fab:S2.V58':{qty:10}};
impl.plan={'S2.V58':5};impl.monthlyPlans[month]={...impl.plan};
source.save({state:impl,expectedRevision:0,requestId:randomUUID(),message:'Synthetic browser fixture'},'u-admin');
const production=new ProductionStore(store,source),planning=new PlanningStore(store,source);
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Calcutta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
production.command('u-admin',{type:'CREATE_BATCH',modelId:'S2.V58',quantity:3,month,date:today(),reason:'Synthetic browser batch',expectedRevision:source.read().revision,expectedProductionRevision:production.revision(),requestId:randomUUID()});
const batchId=production.page('u-admin').rows[0].id;
const server=makeServer(store,{log:()=>{}});
let browser,context,page;
const check=(name,condition)=>{assert.ok(condition,name);console.log('PASS '+mode+' '+name);};
const login=async(email)=>{
 await page.goto(origin+'/#/home');
 await page.getByLabel(/^Email/).fill(email);
 await page.getByLabel(/^Password/).fill(password);
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.locator('.workspace').waitFor();
};
let origin;
const chainOnly=process.env.FH_CHAIN_ONLY==='1';
if(chainOnly&&mode!=='server')throw Error('Chain-only checks require server mode.');
async function chain(){
  await page.setViewportSize({width:1440,height:900});
  const poState=source.read();
  poState.plan={'S2.V58':100};poState.monthlyPlans[month]={...poState.plan};
  const po=createOrders(poState,['oil'],{date:today()})[0];
  assert.ok(po?.lines.some(line=>line.key==='oil'&&line.orderQty>=6),'synthetic PO has room for correction chain');
  poState.orders.push(po);
  source.save({state:poState,expectedRevision:poState.revision,requestId:randomUUID(),message:'Synthetic correction PO'},'u-admin');
  const poActor=store.userProfile('u-admin');
  const seedEvent=input=>{const state=source.read();applyOrderEvent(state,{id:randomUUID(),poId:po.id,date:today(),...input},{actor:poActor});source.save({state,expectedRevision:state.revision,requestId:randomUUID(),message:'Synthetic purchase lifecycle'},'u-admin');};
  for(const type of ['APPROVE','ISSUE'])seedEvent({type,reason:'Synthetic purchase lifecycle'});
  seedEvent({type:'ACKNOWLEDGE',reason:'Six units delivered',reference:'PO-CHAIN-UI',lines:[{key:'oil',qty:6}]});
  const poUrl=origin+'/implements/#/orders/'+encodeURIComponent(po.id);
  const openCorrection=async()=>{
   await page.goto(poUrl);
   await page.getByText(/Lifecycle history/).click();
   const buttons=page.getByRole('button',{name:'Correct receipt quantity'});
   check('only latest receipt exposes correction control',await buttons.count()===1);
   await buttons.click();
   return page.locator('#dialog-form');
  };
  let latest=source.read().procurement.events.at(-1),balance=source.read().stock.oil.qty;
  for(const qty of [5,4,5]){
   const correction=await openCorrection();
   const cells=correction.locator('table tbody tr').first().locator('td');
   check('correction shows immutable original and latest saved quantity',Number((await cells.nth(1).innerText()).split(' ')[0])===6&&Number((await cells.nth(2).innerText()).split(' ')[0])===latest.lines[0].qty);
   check('correction input starts at latest saved quantity',Number(await correction.locator('[name=line-0]').inputValue())===latest.lines[0].qty);
   if(qty===4){mkdirSync('test-output/ui-repairs',{recursive:true});await page.screenshot({path:'test-output/ui-repairs/chain-second-correction.png'});}
   await correction.locator('[name=line-0]').fill(String(qty));
   await correction.locator('[name=reason]').fill('Corrected delivery evidence for '+qty+' units');
   await correction.locator('button[type=submit]').click();await correction.waitFor({state:'hidden'});
   const saved=source.read(),next=saved.procurement.events.at(-1),delta=qty-latest.lines[0].qty;
   check('receipt chain links latest event and applies only its delta',next.correctionOf===latest.id&&next.deltas[0].delta===delta&&saved.stock.oil.qty===balance+delta&&orderProgress(saved,po.id).lines.find(line=>line.key==='oil').acknowledged===qty);
   latest=next;balance=saved.stock.oil.qty;
  }
  check('original receipt remains unchanged after correction chain',source.read().procurement.events.find(event=>event.reference==='PO-CHAIN-UI'&&event.type==='ACKNOWLEDGE').lines[0].qty===6);
  production.command('u-admin',{type:'ADJUST_STOCK',key:'oil',qty:balance,date:today(),reference:'COUNT-PO-UI',reason:'Physical count includes delivery',expectedRevision:source.read().revision,expectedProductionRevision:production.revision(),requestId:randomUUID()});
  await page.reload();
  let correction=await openCorrection();
  await correction.locator('[name=line-0]').fill('4');
  await correction.locator('[name=stockAlreadyReconciled]').check();
  await correction.locator('[name=reason]').fill('Recorded physical count already includes corrected delivery');
  await correction.locator('button[type=submit]').click();await Promise.race([correction.waitFor({state:'hidden'}),page.waitForFunction(()=>Boolean(document.querySelector('#dialog-error')?.textContent?.trim()))]);if((await page.locator('#dialog-error').innerText()).trim())throw Error('Counted correction form: '+await page.locator('#dialog-error').innerText());
  latest=source.read().procurement.events.at(-1);
  check('counted correction links latest and preserves stock',latest.correctionOf===source.read().procurement.events.at(-2).id&&latest.stockAlreadyReconciled===true&&source.read().stock.oil.qty===balance);
  correction=await openCorrection();
  check('later correction carries mandatory counted-stock choice',await correction.locator('[name=stockAlreadyReconciled]').isChecked()&&await correction.locator('[name=stockAlreadyReconciled]').isDisabled()&&await correction.locator('[name=line-0]').inputValue()==='4');
  await correction.locator('[name=line-0]').fill('5');
  await correction.locator('[name=reason]').fill('Final received quantity after count');
  await correction.locator('button[type=submit]').click();await correction.waitFor({state:'hidden'});
  check('reconciled correction chain changes PO total without double adding stock',source.read().stock.oil.qty===balance&&source.read().procurement.events.at(-1).stockAlreadyReconciled===true&&source.read().procurement.events.at(-1).correctionOf===latest.id&&orderProgress(source.read(),po.id).lines.find(line=>line.key==='oil').acknowledged===5);
}
try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 origin=`http://127.0.0.1:${server.address().port}`;
 browser=await chromium.launch({headless:true,executablePath:process.env.FH_BROWSER_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 context=await browser.newContext({viewport:{width:1440,height:960}});
 page=await context.newPage();page.setDefaultTimeout(15000);
 if(mode==='server')await login('ui-admin@example.test');
 else{
  const review=pathToFileURL(resolve(process.env.FH_REVIEW_HTML||'Farming_Hub_Purchase_Management_Clean_Review.html')).href;
  origin=review;
  await page.goto(review+'#/orders');
  await page.evaluate(s=>{localStorage.setItem('fh-purchase-alpha15-clean-schema7',JSON.stringify(s));localStorage.setItem('fh-purchase-alpha15-clean-schema7-user','u-admin');},seed);
  await page.reload();
 }
 if(chainOnly)await chain();
 else{
 await page.goto(origin+'#/orders');
 await page.getByRole('button',{name:'Create purchase order',exact:true}).click();
 let form=page.locator('#dialog-form');
 await form.locator('[name=vendorId]').selectOption(supplier.id);
 await form.locator('[data-plan="0"][data-key=baseId]').selectOption(base.id);
 await form.locator('[name=qty-0-GJ]').fill('2');
 await form.locator('[name=baseprice-0]').fill('10');
 await form.locator('[name=priceListFxRate]').fill('7.2');
 check('untouched production days follows selected item reference',await form.locator('[name=productionDays]').inputValue()==='47'&&await form.locator('[name=productionOverrideReason]').count()===0);
 const before={vendor:await form.locator('[name=vendorId]').inputValue(),qty:await form.locator('[name=qty-0-GJ]').inputValue(),fx:await form.locator('[name=priceListFxRate]').inputValue()};
 page.once('dialog',dialog=>dialog.dismiss());
 await form.locator('[name=vendorId]').selectOption(otherSupplier.id);
 check('cancel supplier switch preserves item quantity and FX',await form.locator('[name=vendorId]').inputValue()===before.vendor&&await form.locator('[name=qty-0-GJ]').inputValue()===before.qty&&await form.locator('[name=priceListFxRate]').inputValue()===before.fx);
 page.once('dialog',dialog=>dialog.accept());
 await form.locator('[name=vendorId]').selectOption(otherSupplier.id);
 check('confirm supplier switch clears incompatible values',await form.locator('[name=vendorId]').inputValue()===otherSupplier.id&&await form.locator('[name=qty-0-GJ]').inputValue()==='0'&&await form.locator('[name=priceListFxRate]').inputValue()==='');
 await page.close();page=await context.newPage();page.setDefaultTimeout(15000);
 await page.goto(origin+'#/orders');
 await page.getByRole('button',{name:'Create purchase order',exact:true}).click();
 form=page.locator('#dialog-form');
 await form.locator('[name=vendorId]').selectOption(supplier.id);
 await form.locator('[data-plan="0"][data-key=baseId]').selectOption(base.id);
 await form.locator('[name=qty-0-GJ]').fill('2');
 await form.locator('[name=baseprice-0]').fill('10');
 await form.locator('[name=priceListFxRate]').fill('7.2');
 await page.setViewportSize({width:390,height:900});
 const qty=form.locator('[name=qty-0-GJ]');await qty.focus();await qty.press('Enter');
 check('narrow worksheet keyboard advances focus',await qty.evaluate(el=>document.activeElement!==el));
 await form.locator('button[type=submit]').click();
 if(mode==='server'){
  await page.waitForURL(/#\/order\//);
  const saved=store.read().orders.find(o=>o.vendorId===supplier.id&&o.lines.some(l=>l.quantity===2));
  check('saved order keeps untouched item reference days',saved?.productionDays===47&&!saved.productionOverrideReason);
  const openDocument=async(name)=>{
   await page.locator('[data-action=tab][data-value=documents]').click();
   await page.getByRole('button',{name:'Upload document',exact:true}).click();
   const modal=page.locator('#dialog-form');
   await modal.locator('[name=type]').selectOption('OTHER');
   await modal.locator('input[type=file]').setInputFiles({name,mimeType:'text/plain',buffer:Buffer.from('Synthetic evidence for '+name)});
   return modal;
  };
  let uploadForm=await openDocument('lost-response.txt'),uploadPosts=0,uploadStatus;
  await page.route('**/api/files',async route=>{
   if(route.request().method()!=='POST')return route.continue();
   uploadPosts++;const response=await route.fetch();uploadStatus=response.status();await route.abort('failed');
  });
  await uploadForm.locator('button[type=submit]').click();await uploadForm.waitFor({state:'hidden'});
  check('lost evidence response recovered and attached once',uploadStatus===201&&uploadPosts===1&&store.read().files.filter(f=>f.name==='lost-response.txt').length===1&&store.read().orders.find(o=>o.id===saved.id).documents.some(d=>d.name==='lost-response.txt'));
  await page.unroute('**/api/files');
  uploadForm=await openDocument('held-response.txt');let heldUpload;
  await page.route('**/api/files',async route=>{if(route.request().method()==='POST'){heldUpload=route;return;}await route.continue();});
  await uploadForm.locator('button[type=submit]').click();
  await page.locator('#modal-error.visible').waitFor({timeout:42000});
  check('held evidence upload releases save with selected file intact',await uploadForm.locator('button[type=submit]').isEnabled()&&await uploadForm.locator('input[type=file]').evaluate(el=>el.files.length===1)&&store.read().files.filter(f=>f.name==='held-response.txt').length===0);
  await heldUpload?.abort('failed').catch(()=>{});await page.unroute('**/api/files');
  await uploadForm.locator('button[type=submit]').click();await uploadForm.waitFor({state:'hidden'});
  check('held evidence retry attaches one file',store.read().files.filter(f=>f.name==='held-response.txt').length===1&&store.read().orders.find(o=>o.id===saved.id).documents.some(d=>d.name==='held-response.txt'));
 }else{
  await page.waitForURL(/#\/order\//);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('fh-purchase-alpha15-clean-schema7')).orders.at(-1));
  check('review order keeps untouched item reference days',saved?.productionDays===47&&!saved.productionOverrideReason);
 }
 await context.close();context=null;
 if(mode==='review')process.exitCode=0;
 else{
  context=await browser.newContext({viewport:{width:1440,height:960}});page=await context.newPage();page.setDefaultTimeout(15000);
  await login('ui-planner@example.test');
  await page.goto(origin+'/planning/#/new?month=2026-11');
  await page.locator('#plan-editor').waitFor();
  await page.getByLabel('Machines planned for S2.V58').fill('3');
  await page.locator('#plan-editor [name=note]').fill('Three confirmed machines');
  await page.locator('#plan-editor button[value=SAVE_DRAFT]').click();
  await page.locator('#plan-submit').waitFor();
  check('draft details identify saver and direct next step',await page.getByText('Saved by Browser Planner').count()>0&&await page.locator('#plan-submit button[value=SUBMIT]').isVisible());
  await page.setViewportSize({width:390,height:900});
  await page.locator('#plan-submit [name=note]').fill('Ready for manager review');
  await page.locator('#plan-submit [name=note]').press('Tab');
  check('narrow draft submit keyboard reaches action',await page.locator('#plan-submit button[value=SUBMIT]').evaluate(el=>document.activeElement===el));
  await page.locator('#plan-submit button[value=SUBMIT]').click();
  await page.getByRole('heading',{name:/Awaiting approval/}).waitFor();
  check('direct draft submit stores pending without changing approved plan',planning.read('ui-planner').requests.some(r=>r.status==='PENDING'&&r.plan['S2.V58']===3)&&source.read().monthlyPlans['2026-11']?.['S2.V58']!==3);
  await context.close();context=null;

  context=await browser.newContext({viewport:{width:1440,height:960}});page=await context.newPage();page.setDefaultTimeout(15000);
  await login('ui-admin@example.test');
  const stageUrl=origin+'/production/#/stage?id='+encodeURIComponent(batchId)+'&type=COMPLETE_BATCH';
  await page.goto(stageUrl);await page.locator('#deduction-preview').waitFor();
  const stage=page.locator('form[data-form=stage]');
  await stage.locator('[name=completeQuantity]').fill('1');
  const previewRow=()=>page.locator('#deduction-preview tr').filter({hasText:'Bolt'}).locator('td').last().innerText();
  check('first partial preview uses whole batch basis and one-machine deduction',(await previewRow()).trim()==='4 pcs'&&await page.locator('#deduction-preview').innerText().then(t=>t.includes('12 pcs')));
  await stage.locator('[name=reason]').fill('First machine completed');
  await stage.locator('[name=confirmDeduction]').check();
  await stage.locator('button[type=submit]').click();
  await page.waitForURL(/#\/batch\?/);
  check('first partial result matches deduction preview',source.read().stock.bolt.qty===96&&source.read().stock.oil.qty===18.875);
  await page.goto(stageUrl);await stage.locator('[name=completeQuantity]').fill('1');
  check('second partial preview deducts only current tranche',(await previewRow()).trim()==='4 pcs');
  await stage.locator('[name=reason]').fill('Second machine completed');await stage.locator('[name=confirmDeduction]').check();await stage.locator('button[type=submit]').click();await page.waitForURL(/#\/batch\?/);
  check('second partial result matches cumulative server stock',source.read().stock.bolt.qty===92&&source.read().stock.oil.qty===17.75);
  await page.setViewportSize({width:390,height:900});
  await page.goto(origin+'/production/#/stock-entry?adjust=yes&key=bolt');
  const stockForm=page.locator('form[data-form=stock]');await stockForm.locator('[name=qty]').fill('90');
  check('physical count preview replaces stock',await page.locator('#stock-entry-preview').innerText().then(t=>t.includes('Change -2')&&t.includes('Result 90')));
  await stockForm.locator('[name=reason]').fill('Physical count checked');await stockForm.locator('[name=reference]').fill('COUNT-UI-1');await stockForm.locator('button[type=submit]').click();
  await page.waitForURL(/#\/stock$/);check('physical count saved exact balance',source.read().stock.bolt.qty===90);
  await page.goto(origin+'/production/#/stock-entry?key=bolt');await stockForm.locator('[name=qty]').fill('5');
  check('delivery preview adds quantity',await page.locator('#stock-entry-preview').innerText().then(t=>t.includes('Change +5')&&t.includes('Result 95')));
  await stockForm.locator('[name=stockAlreadyReconciled]').check();
  check('included-count preview leaves balance unchanged',await page.locator('#stock-entry-preview').innerText().then(t=>t.includes('Change +0')&&t.includes('Result 90')));
  await stockForm.locator('[name=stockNotIncludedInCount]').check();
  check('excluded-count choice restores addition and clears incompatible choice',!(await stockForm.locator('[name=stockAlreadyReconciled]').isChecked())&&await page.locator('#stock-entry-preview').innerText().then(t=>t.includes('Change +5')&&t.includes('Result 95')));
  await stockForm.locator('[name=stockNotIncludedInCount]').uncheck();
  await stockForm.locator('[name=reason]').fill('Delivery checked against count');
  await stockForm.locator('[name=reference]').fill('RECEIPT-UI-1');
  await stockForm.locator('button[type=submit]').click();
  await stockForm.locator('.form-error').getByText(/same.day|count/i).waitFor();
  check('ordinary same-day receipt is blocked without count resolution',source.read().stock.bolt.qty===90);
  await stockForm.locator('[name=stockNotIncludedInCount]').check();
  await stockForm.locator('[name=reconciliationReason]').fill('Delivery arrived after the physical count and was excluded.');
  await stockForm.locator('button[type=submit]').click();
  await page.waitForURL(/#\/stock$/);
  check('excluded-count receipt adds stock once',source.read().stock.bolt.qty===95);
  await page.goto(origin+'/production/#/stock-entry?key=bolt');
  await stockForm.locator('[name=qty]').fill('3');
  await stockForm.locator('[name=reference]').fill('RECEIPT-UI-2');
  await stockForm.locator('[name=reason]').fill('Earlier delivery documented after count');
  await stockForm.locator('[name=stockAlreadyReconciled]').check();
  await stockForm.locator('[name=reconciliationReason]').fill('Delivery was included in the saved physical count.');
  check('included-count receipt preview keeps current balance',await page.locator('#stock-entry-preview').innerText().then(t=>t.includes('Change +0')&&t.includes('Result 95')));
  await stockForm.locator('button[type=submit]').click();
  await page.waitForURL(/#\/stock$/);
  check('included-count receipt saves zero stock delta',source.read().stock.bolt.qty===95&&production.page('u-admin',{kind:'movements',key:'bolt'}).rows.some(r=>r.reference==='RECEIPT-UI-2'&&r.delta===0));
  await chain();
  await context.close();context=null;
 }
 }
}finally{
 await context?.close();await browser?.close();await new Promise(resolve=>server.close(resolve));store.close();
 if(dir.startsWith(tmpdir()+sep))rmSync(dir,{recursive:true,force:true});
}
