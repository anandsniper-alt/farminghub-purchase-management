/** Synthetic browser acceptance: category selection must never silently lose PO quantities. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createServer} from 'node:http';
import {createSeed} from '../shared/seed.mjs';
import {Store} from '../server/store.mjs';
import {makeServer} from '../server/index.mjs';
import {orderTotal} from '../shared/domain.mjs';
import {ensureRecordReferences} from '../shared/references.mjs';

const state=createSeed(),a=state.bases.find(b=>b.code==='PW12'),b=state.bases.find(b=>b.code==='BC10');
for(const item of state.items)if(item.baseId)item.brandPrefix=state.brands.find(brand=>brand.name===item.brand)?.prefix||'';
const extra={...structuredClone(a),id:'category-demo-z',code:'DEMO-Z',productName:'Zebra weeder'};
const other={...structuredClone(a),id:'category-other-supplier',code:'OTHER',vendorId:state.vendors[1].id,category:'OTHER SUPPLIER ONLY'};
const missing={...structuredClone(a),id:'category-missing',code:'NO-CATEGORY',category:'',productName:'Legacy item without category'};
const inactive={...structuredClone(a),id:'category-inactive',code:'INACTIVE',category:'INACTIVE ONLY',lifecycleStatus:'INACTIVE'};
state.bases.push(extra,other,missing,inactive);
state.items.push({...structuredClone(state.items.find(i=>i.baseId===a.id&&i.brandPrefix==='GJ')),id:'category-demo-sku',code:'GJ-DEMO-Z',baseId:extra.id});
state.priceLists=state.priceLists.filter(p=>![a.id,b.id].includes(p.baseId));
for(const base of [a,b])state.priceLists.push({id:'category-price-'+base.id,vendorId:a.vendorId,baseId:base.id,currency:'USD',unitPriceMinor:10000,effectiveDate:'2026-01-01',status:'APPROVED',revision:1});
ensureRecordReferences(state);
const store=new Store(':memory:',state),server=makeServer(store);
store.addAccount('u-manager','category@example.test','Isolated-category-test-2026');
const key='fh-category-review',html=readFileSync('Farming_Hub_Purchase_Management_Clean_Review.html','utf8').replace("window.FH_MODE='clean';","window.FH_MODE='clean';window.FH_REVIEW_STORE="+JSON.stringify(key)+';window.FH_INITIAL_STATE='+JSON.stringify(state).replaceAll('</script','<\\/script')+';');
const review=createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(html);});
const dir='test-output/po-category';mkdirSync(dir,{recursive:true});
const report={checks:[],errors:[]};let browser,page,success=false;
const check=(name,value)=>{assert.ok(value,name);report.checks.push(name);console.log('PASS '+name);};
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));await new Promise(r=>review.listen(0,'127.0.0.1',r));
 const urls={server:'http://127.0.0.1:'+server.address().port,review:'http://127.0.0.1:'+review.address().port};writeFileSync(dir+'/preview.json',JSON.stringify(urls,null,2));
 const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
 browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 for(const mode of ['server','review']){
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>report.errors.push(mode+': '+e.message));
  await page.goto(urls[mode]+'/#/orders');
  if(mode==='server'){await page.locator('[name=email]').fill('category@example.test');await page.locator('[name=password]').fill('Isolated-category-test-2026');await page.locator('#login-form [type=submit]').click();}
  const input=n=>page.locator('#dialog-form [name="'+n+'"]');
  const options=()=>input('base-0').locator('option').evaluateAll(opts=>opts.filter(o=>o.value).map(o=>({value:o.value,text:o.textContent})));
  await page.locator('[data-action=new-order]').first().click();await input('vendorId').selectOption(a.vendorId);await input('priceListCurrency').selectOption('USD');await input('currency').selectOption('USD');
  check(mode+': category between row number and item',JSON.stringify(await page.locator('.po-item-sheet th').allTextContents()).startsWith('["#","Item category","Item"'));
  const cats=await input('item-category-0').locator('option').allTextContents();check(mode+': categories scoped to active bases of chosen supplier',cats.includes('Uncategorised')&&!cats.includes('OTHER SUPPLIER ONLY')&&!cats.includes('INACTIVE ONLY'));
  await input('item-category-0').selectOption(a.category);check(mode+': category shows only matching supplier items',JSON.stringify((await options()).map(o=>o.value))===JSON.stringify([a.id,extra.id]));
  check(mode+': item selector receives keyboard focus',await input('base-0').evaluate(e=>e===document.activeElement));
  await input('base-0').selectOption(a.id);await input('qty-0-GJ').fill('10');await input('qty-0-KD').fill('2');await input('baseprice-0').fill('101.25');
  check(mode+': quantities and price calculate correctly',(await page.locator('[data-po-total]').innerText()).includes('1,215.00'));
  page.once('dialog',d=>d.dismiss());await input('item-category-0').selectOption(b.category);
  check(mode+': cancelling category change preserves item, quantities and price',await input('item-category-0').inputValue()===a.category&&await input('base-0').inputValue()===a.id&&await input('qty-0-GJ').inputValue()==='10'&&await input('baseprice-0').inputValue()==='101.25');
  await input('item-category-0').selectOption('');check(mode+': All categories retains selected line and expands options',(await options()).length===6&&await input('qty-0-KD').inputValue()==='2');
  await page.locator('[data-action=add-base-plan]').click();await input('item-category-1').selectOption(a.category);
  check(mode+': previously selected item cannot be added twice',await input('base-1').locator('option[value="'+a.id+'"]').count()===0);
  await page.locator('[data-action=pick-po-item][data-base="'+b.id+'"]').click();check(mode+': catalogue respects category-filtered blank rows',await input('base-1').inputValue()===''&&await input('item-category-1').inputValue()===a.category&&await input('base-2').inputValue()===b.id);
  await page.locator('[data-action=remove-base-plan][data-index="1"]').click();await input('qty-1-GJ').fill('3');
  await input('qty-0-GJ').focus();await page.keyboard.press('ArrowDown');check(mode+': keyboard quantity navigation preserved',await input('qty-1-GJ').evaluate(e=>e===document.activeElement));
  page.once('dialog',d=>d.accept());await input('item-category-1').selectOption(a.category);
  check(mode+': confirmed category change clears only affected row',await input('base-1').inputValue()===''&&await input('qty-1-GJ').inputValue()==='0'&&await input('baseprice-1').inputValue()==='0.00'&&await input('qty-0-GJ').inputValue()==='10');
  await input('item-category-1').selectOption('Uncategorised');check(mode+': legacy uncategorised item remains findable',await input('base-1').locator('option[value="'+missing.id+'"]').count()===1);
  await page.locator('[data-action=remove-base-plan][data-index="1"]').click();await input('item-category-0').selectOption(a.category);
  await input('item-category-0').scrollIntoViewIfNeeded();await page.screenshot({path:dir+'/'+mode+'-desktop.png'});
  await page.setViewportSize({width:390,height:844});await input('item-category-0').scrollIntoViewIfNeeded();check(mode+': worksheet scrolls without page overflow',await page.locator('.po-sheet-scroll').evaluate(e=>e.scrollWidth>e.clientWidth)&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));check(mode+': mobile category meets 44px control minimum',await input('item-category-0').evaluate(e=>e.getBoundingClientRect().height>=44));await page.screenshot({path:dir+'/'+mode+'-mobile.png'});await page.setViewportSize({width:1440,height:1000});
  await page.locator('.po-terms>summary').click();await input('planningTat').fill('90');if(await input('productionOverrideReason').count())await input('productionOverrideReason').fill('Synthetic supplier agreement');await input('notes').fill('Category acceptance '+mode);
  await page.locator('#dialog-form [type=submit]').click();await page.locator('#dialog-form').waitFor({state:'hidden'});
  const saved=mode==='server'?store.read():await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key),order=saved.orders.find(o=>o.notes==='Category acceptance '+mode);
  check(mode+': saved brand lines and total are unchanged',order?.lines.length===2&&orderTotal(order)===121500&&order.lines.every(l=>l.baseId===a.id));
  await page.locator('[data-action=edit-draft]').first().click();check(mode+': reopening draft restores category and values',await input('item-category-0').inputValue()===a.category&&await input('qty-0-KD').inputValue()==='2'&&await input('baseprice-0').inputValue()==='101.25');
  check(mode+': existing draft supplier remains locked',await input('vendorId').isDisabled());
  await page.locator('.modal-head [data-action=close]').click();await page.goto(urls[mode]+'/#/orders');await page.locator('[data-action=new-order]').first().click();
  await input('item-category-0').selectOption(a.category);await input('base-0').selectOption(a.id);await input('qty-0-GJ').fill('3');
  await input('vendorId').selectOption(other.vendorId);check(mode+': switching supplier resets rows and category choices',await input('base-0').inputValue()===''&&await input('item-category-0').inputValue()===''&&await input('item-category-0').locator('option').allTextContents().then(x=>x.includes(other.category)&&!x.includes(a.category)));
  await context.close();
 }
 check('No browser runtime errors',report.errors.length===0);success=true;
}catch(e){report.failure=e.message;await page?.screenshot({path:dir+'/failure.png'}).catch(()=>{});throw e;}
finally{writeFileSync(dir+'/report.json',JSON.stringify(report,null,2));await browser?.close();if(!success||!process.argv.includes('--preview')){await new Promise(r=>server.close(r));await new Promise(r=>review.close(r));store.close();}}
