/** Whole-order item filtering must never discard entered or saved PO lines. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createServer} from 'node:http';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createSeed} from '../shared/seed.mjs';
import {Store} from '../server/store.mjs';
import {makeServer} from '../server/index.mjs';
import {orderTotal} from '../shared/domain.mjs';
import {ensureRecordReferences} from '../shared/references.mjs';

const state=createSeed(),a=state.bases.find(b=>b.code==='PW12'),b=state.bases.find(b=>b.code==='BC10');
state.orders=[];state.payments=[];state.events=[];
b.vendorId=a.vendorId;
for(const item of state.items)if(item.baseId)item.brandPrefix=state.brands.find(brand=>brand.name===item.brand)?.prefix||'';
const other={...structuredClone(a),id:'group-other-supplier',code:'OTHER',vendorId:state.vendors.find(v=>v.id!==a.vendorId&&v.kind==='SUPPLIER').id,category:'OTHER SUPPLIER ONLY'};
const missing={...structuredClone(a),id:'group-missing',code:'NO-CATEGORY',category:'',productName:'Legacy item without category'};
const inactive={...structuredClone(a),id:'group-inactive',code:'INACTIVE',category:'INACTIVE ONLY',lifecycleStatus:'INACTIVE'};
state.bases.push(other,missing,inactive);
state.priceLists=state.priceLists.filter(p=>![a.id,b.id].includes(p.baseId));
for(const base of [a,b])state.priceLists.push({id:'group-price-'+base.id,vendorId:a.vendorId,baseId:base.id,currency:'USD',unitPriceMinor:10000,effectiveDate:'2026-01-01',status:'APPROVED',revision:1});
ensureRecordReferences(state);
const store=new Store(':memory:',state),server=makeServer(store,{log:()=>{}});
const password='Synthetic-product-group-2026';
store.addAccount('u-manager','group@example.test',password);store.addAccount('u-viewer','group-viewer@example.test',password);
const key='fh-product-group-review',html=readFileSync('Farming_Hub_Purchase_Management_Clean_Review.html','utf8').replace("window.FH_MODE='clean';","window.FH_MODE='clean';window.FH_REVIEW_STORE="+JSON.stringify(key)+';window.FH_INITIAL_STATE='+JSON.stringify(state).replaceAll('</script','<\\/script')+';');
const review=createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(html);});
const dir='test-output/po-product-group';mkdirSync(dir,{recursive:true});
const report={checks:[],errors:[]};let browser,page;
const check=(name,value)=>{assert.ok(value,name);report.checks.push(name);console.log('PASS '+name);};
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));await new Promise(r=>review.listen(0,'127.0.0.1',r));
 const urls={server:'http://127.0.0.1:'+server.address().port,review:'http://127.0.0.1:'+review.address().port};
 const {chromium}=await import(pathToFileURL(resolve(process.env.FH_PLAYWRIGHT_MODULE)).href);
 browser=await chromium.launch({headless:true,executablePath:process.env.FH_BROWSER_PATH});
 for(const mode of ['server','review']){
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>report.errors.push(mode+': '+e.message));
  await page.goto(urls[mode]+'/#/orders');
  if(mode==='server'){await page.locator('[name=email]').fill('group@example.test');await page.locator('[name=password]').fill(password);await page.locator('#login-form [type=submit]').click();}
  const input=n=>page.locator('#dialog-form [name="'+n+'"]');
  const group=()=>input('poProductGroup');
  const options=i=>input('base-'+i).locator('option').evaluateAll(opts=>opts.filter(o=>o.value).map(o=>o.value));
  const visibleGroups=()=>page.locator('[data-po-catalog-row]:visible').evaluateAll(rows=>rows.map(r=>r.dataset.productGroup));
  await page.locator('[data-action=new-order]').first().click();await input('vendorId').selectOption(a.vendorId);await input('priceListCurrency').selectOption('USD');await input('currency').selectOption('USD');
  check(mode+': separate Product group defaults to All product groups',await group().inputValue()===''&&await group().locator('option:checked').innerText()==='All product groups'&&await input('item-category-0').count()===1);
  const groups=await group().locator('option').allTextContents();check(mode+': groups scoped to active supplier bases, including uncategorised',groups.includes('Uncategorised')&&!groups.includes(other.category)&&!groups.includes(inactive.category));
  await group().selectOption(a.category);
  check(mode+': group filters catalogue and all blank item selectors',(await visibleGroups()).every(x=>x===a.category)&&JSON.stringify(await options(0))===JSON.stringify([a.id]));
  check(mode+': filter keeps keyboard focus',await group().evaluate(e=>e===document.activeElement));
  await input('base-0').selectOption(a.id);await input('qty-0-GJ').fill('10');await input('qty-0-KD').fill('2');await input('baseprice-0').fill('101.25');
  await group().selectOption(b.category);
  check(mode+': changing group keeps selected item, category, quantities, price and total',await input('base-0').inputValue()===a.id&&await input('item-category-0').inputValue()===a.category&&await input('qty-0-GJ').inputValue()==='10'&&await input('qty-0-KD').inputValue()==='2'&&await input('baseprice-0').inputValue()==='101.25'&&(await page.locator('[data-po-total]').innerText()).includes('1,215.00'));
  await page.locator('[data-action=add-base-plan]').click();check(mode+': whole-order filter also applies to added rows',JSON.stringify(await options(1))===JSON.stringify([b.id]));
  await input('base-1').selectOption(b.id);await input('qty-1-GJ').fill('3');await input('baseprice-1').fill('50.00');
  page.once('dialog',dialog=>dialog.dismiss());await input('vendorId').selectOption(other.vendorId);
  check(mode+': cancelling mistaken supplier switch preserves group and mixed quantities',await input('vendorId').inputValue()===a.vendorId&&await group().inputValue()===b.category&&await input('qty-0-GJ').inputValue()==='10'&&await input('qty-1-GJ').inputValue()==='3');
  await page.locator('#po-item-search').fill('no match');check(mode+': search combines with group and shows empty state',await page.locator('[data-po-catalog-empty]').isVisible()&&(await visibleGroups()).length===0);
  await page.locator('#po-item-search').fill('');await group().selectOption('');
  check(mode+': reset restores catalogue without losing mixed-category rows',(await visibleGroups()).includes(a.category)&&(await visibleGroups()).includes(b.category)&&await input('base-0').inputValue()===a.id&&await input('base-1').inputValue()===b.id&&(await page.locator('[data-po-total]').innerText()).includes('1,365.00'));
  await page.locator('.modal-foot [data-action=close]').click();await page.getByRole('button',{name:'Keep editing',exact:true}).click();check(mode+': mistaken close preserves mixed dirty form',await input('qty-0-GJ').inputValue()==='10'&&await input('qty-1-GJ').inputValue()==='3');
  await group().selectOption(b.category);await group().scrollIntoViewIfNeeded();await page.screenshot({path:dir+'/'+mode+'-desktop.png'});
  await page.setViewportSize({width:390,height:844});await group().scrollIntoViewIfNeeded();check(mode+': mobile control is 44px and page fits',await group().evaluate(e=>e.getBoundingClientRect().height>=44)&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:dir+'/'+mode+'-mobile.png'});await page.setViewportSize({width:1440,height:1000});
  await page.locator('.po-terms>summary').click();await input('planningMode').selectOption('MANUAL');await input('planningTat').fill('90');await input('planningOverrideReason').fill('Synthetic supplier planning agreement');if(await input('productionOverrideReason').count())await input('productionOverrideReason').fill('Synthetic supplier production agreement');await input('notes').fill('Product group acceptance '+mode);
  await page.locator('#dialog-form [type=submit]').click();await page.locator('#dialog-form').waitFor({state:'hidden'});
  const saved=mode==='server'?store.read():await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key),order=saved.orders.find(o=>o.notes==='Product group acceptance '+mode);
  check(mode+': filtered save retains every mixed-category brand line and total',order?.lines.length===3&&orderTotal(order)===136500&&order.lines.some(l=>l.baseId===a.id)&&order.lines.some(l=>l.baseId===b.id)&&!Object.hasOwn(order,'poProductGroup'));
  const history=JSON.stringify(order.history);await page.locator('[data-action=edit-draft]').first().click();check(mode+': reopened mixed draft shows All product groups and original values',await group().inputValue()===''&&await input('qty-0-KD').inputValue()==='2'&&await input('qty-1-GJ').inputValue()==='3'&&await input('vendorId').isDisabled());
  await group().selectOption(a.category);await group().selectOption(b.category);
  const unchanged=mode==='server'?store.read():await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);check(mode+': changing filter never writes saved order or history',JSON.stringify(unchanged.orders.find(o=>o.id===order.id))===JSON.stringify(order)&&JSON.stringify(unchanged.orders.find(o=>o.id===order.id).history)===history);
  await page.locator('.modal-foot [data-action=close]').click();if(await page.getByRole('button',{name:'Discard changes',exact:true}).isVisible())await page.getByRole('button',{name:'Discard changes',exact:true}).click();
  await page.goto(urls[mode]+'/#/orders');await page.locator('[data-action=new-order]').first().click();await input('vendorId').selectOption(a.vendorId);await group().selectOption(a.category);await input('vendorId').selectOption(other.vendorId);check(mode+': changing empty supplier resets group and scopes choices',await group().inputValue()===''&&(await group().locator('option').allTextContents()).includes(other.category)&&!(await group().locator('option').allTextContents()).includes(a.category));
  await context.close();
 }
 const context=await browser.newContext();page=await context.newPage();await page.goto(urls.server+'/#/orders');await page.locator('[name=email]').fill('group-viewer@example.test');await page.locator('[name=password]').fill(password);await page.locator('#login-form [type=submit]').click();await page.locator('.workspace').waitFor();check('viewer receives no order creation or edit grant',await page.locator('[data-action=new-order],[data-action=edit-draft]').count()===0);await context.close();
 check('No browser runtime errors',report.errors.length===0);
}catch(error){report.failure=error.message;await page?.screenshot({path:dir+'/failure.png'}).catch(()=>{});throw error;}
finally{writeFileSync(dir+'/report.json',JSON.stringify(report,null,2));await browser?.close();await new Promise(r=>server.close(r));await new Promise(r=>review.close(r));store.close();}
