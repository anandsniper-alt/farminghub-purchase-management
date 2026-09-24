import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createServer} from 'node:http';
import {Store} from '../server/store.mjs';
import {makeServer} from '../server/index.mjs';
import {execute} from '../shared/domain.mjs';
import {domesticPreviewState} from '../scripts/prepare-domestic-preview.mjs';
const out=resolve('test-output/bom-picker',new Date().toISOString().replace(/[:.]/g,'-'));mkdirSync(out,{recursive:true});
let seed=domesticPreviewState();const manager=seed.users.find(u=>u.role==='MANAGER');
seed=execute(seed,{type:'DOMESTIC_SAVE_VENDOR',payload:{code:'LOCAL-QA',name:'Local test supplier',country:'India'}},manager).state;
seed.files.push({id:'local-quote-file',scope:'LAE_DOMESTIC',name:'quote.csv',orderIds:[]});
seed=execute(seed,{type:'DOMESTIC_IMPORT_PRICES',payload:{vendorId:seed.vendors.at(-1).id,quoteDate:'2026-09-23',quoteReference:'LOCAL-QUOTE',reason:'Local test fixture',sourceHash:'a'.repeat(64),fileId:'local-quote-file',rows:[{'Item code':seed.domesticItems[0].code,'Item Description':seed.domesticItems[0].description,UOM:seed.domesticItems[0].uom,'Rate (before GST)':'10.25'}]}},manager).state;
seed.domesticItems.at(-1).active=false;
const store=new Store(join(out,'test.sqlite'),seed);store.addAccount(manager.id,'picker@example.test','Picker-test-only-1234');
const server=makeServer(store),preview=readFileSync('test-output/Domestic_BOM_Preview.html'),review=createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(preview);});
const reports=[];let browser;
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));await new Promise(r=>review.listen(0,'127.0.0.1',r));
 const {chromium}=await import(pathToFileURL(resolve(process.env.FH_PLAYWRIGHT_MODULE||'../ui-tools/node_modules/playwright/index.mjs')).href);
 browser=await chromium.launch({headless:true,executablePath:process.env.FH_BROWSER_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 for(const mode of ['server','review']){
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),checks=[],errors=[];page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
  const check=(name,ok=true)=>{assert.ok(ok,name);checks.push(name);};
  if(mode==='review')await context.addInitScript(s=>{if(!localStorage.getItem('fh-domestic-preview-v1'))localStorage.setItem('fh-domestic-preview-v1',JSON.stringify(s));localStorage.setItem('fh-domestic-preview-v1-user',s.users.find(u=>u.role==='MANAGER').id);},seed);
  await page.goto('http://127.0.0.1:'+(mode==='server'?server:review).address().port+'/#/domestic/sets');
  if(mode==='server'){await page.locator('[name=email]').fill('picker@example.test');await page.locator('[name=password]').fill('Picker-test-only-1234');await page.locator('[type=submit]').click();}
  await page.locator('.domestic-assembly-card').filter({has:page.getByRole('heading',{name:'CS1',exact:true})}).getByRole('link',{name:'Open assembly',exact:true}).click();
  const bomUrl=page.url();await page.getByRole('button',{name:'Edit BOM',exact:true}).click();
  check('Active purchased items only in assembly picker',await page.locator('.domestic-picker-item').count()===36&&await page.locator('[data-choice^="set:"]').count()===0);
  check('Empty BOM explains click to add',(await page.locator('#domestic-selected-rows').innerText()).includes('Choose items'));
  await page.locator('.domestic-picker-item img').evaluateAll(images=>images.forEach(i=>i.loading='eager'));
  await page.waitForFunction(()=>[...document.querySelectorAll('.domestic-picker-item img')].every(i=>i.complete&&i.naturalWidth>0));
  check('All 33 source picture cells load in picker',await page.locator('.domestic-picker-item img').count()===33);
  const first=page.locator('.domestic-picker-item').nth(0),second=page.locator('.domestic-picker-item').nth(1),third=page.locator('.domestic-picker-item').nth(2);
  await first.locator('img').click();check('Clicking picture adds a row',await page.locator('[name=quantity-0]').count()===1);
  check('Quantity and price can stay unknown',await page.locator('[name=quantity-0]').inputValue()===''&&await page.locator('[name=rate-0]').inputValue()==='');
  // The row stays focusable but cannot be added again, including repeated keyboard activation.
  await first.focus();await page.keyboard.press('Enter');await page.keyboard.press('Space');check('Repeated clicks and keyboard do not duplicate',await page.locator('#domestic-selected-rows tr').count()===1);
  await page.getByRole('button',{name:'Edit quantities & prices',exact:true}).click();check('Edit shortcut focuses quantity',await page.locator('[name=quantity-0]').evaluate(el=>el===document.activeElement));
  await page.locator('[name=quantity-0]').fill('2');await page.locator('[name=quote-0]').selectOption({index:1});check('Supplier quote still fills the selected row',await page.locator('[name=rate-0]').inputValue()==='10.25');
  await page.locator('[name=notes]').fill('Keep my unsaved notes');await page.locator('[name=reason]').fill('LOCAL QA picture selection');await page.locator('[name=compositionConfirmed]').check();
  await page.locator('#domestic-picker-search').fill(seed.domesticItems[1].code);check('Search by code',await page.locator('.domestic-picker-item:visible').evaluateAll((rows,code)=>rows.length>0&&rows.every(row=>row.dataset.search.includes(code.toLowerCase())),seed.domesticItems[1].code));await second.focus();await page.keyboard.press('Enter');
  check('Add keeps filter, notes, reason, confirmation and previous price',await page.locator('#domestic-picker-search').inputValue()===seed.domesticItems[1].code&&await page.locator('[name=notes]').inputValue()==='Keep my unsaved notes'&&await page.locator('[name=reason]').inputValue()==='LOCAL QA picture selection'&&await page.locator('[name=compositionConfirmed]').isChecked()&&await page.locator('[name=rate-0]').inputValue()==='10.25'&&await page.locator('[name=quote-0]').inputValue()!=='');
  await page.locator('[name=quantity-1]').fill('1');await page.locator('[name=rate-1]').fill('8');await page.locator('#domestic-picker-search').fill('');await third.click();await page.locator('[data-action=domestic-remove-row][data-index="2"]').click();
  check('Removing row retains other edits and enables re-add',await third.getAttribute('aria-disabled')==='false'&&await page.locator('[name=rate-1]').inputValue()==='8');
  await page.locator('#domestic-picker-segment').selectOption('TUBES');check('Segment filter',await page.locator('.domestic-picker-item:visible').evaluateAll(rows=>rows.length>0&&rows.every(row=>row.dataset.segment==='TUBES')));
  await page.locator('#domestic-picker-search').fill('no-such-component');check('No-match guidance',await page.locator('#domestic-picker-empty').isVisible());
  await page.locator('#domestic-picker-search').fill('');await page.locator('#domestic-picker-segment').selectOption('');
  await page.locator('#domestic-selected-rows .domestic-picture').first().click();await page.getByRole('button',{name:'Close picture',exact:true}).click();check('Picture zoom preserves quantity and price',await page.locator('[name=quantity-0]').inputValue()==='2'&&await page.locator('[name=rate-1]').inputValue()==='8');
  await page.locator('[name=rate-0]').fill('12.50');check('Manual rate clears quote association',await page.locator('[name=quote-0]').inputValue()==='');
  check('Cost uses existing integer totals',(await page.locator('#domestic-bom-total').innerText()).includes('33.00'));
  await page.locator('[name=rate-0]').fill('-1');await page.getByRole('button',{name:'Save BOM revision',exact:true}).click();check('Invalid rate blocks save without losing selection',await page.locator('#dialog-form').count()===1&&await page.locator('#domestic-selected-rows tr').count()===2);await page.locator('[name=rate-0]').fill('12.50');await page.locator('[name=quote-0]').selectOption({index:1});
  await page.getByRole('button',{name:'Save BOM revision',exact:true}).click();await page.locator('#dialog-form').waitFor({state:'detached'});await page.reload();await page.locator('.domestic-total').waitFor();check('Saved quote cost survives reload',(await page.locator('.domestic-total').innerText()).includes('28.50'));
  await page.getByRole('button',{name:'Edit BOM',exact:true}).click();await page.locator('[name=rate-0]').fill('12.50');await page.locator('.domestic-picker-item').nth(2).click();await page.locator('[data-action=domestic-remove-row][data-index="2"]').click();check('Adding or removing never restores a cleared saved quote',await page.locator('[name=quote-0]').inputValue()===''&&await page.locator('[name=rate-0]').inputValue()==='12.50');await page.locator('[name=reason]').fill('LOCAL QA manual repricing');await page.getByRole('button',{name:'Save BOM revision',exact:true}).click();await page.locator('#dialog-form').waitFor({state:'detached'});check('Manual rate revision saves correctly',(await page.locator('.domestic-total').innerText()).includes('33.00'));
  await page.getByRole('button',{name:'Revision history',exact:true}).click();check('Prior revision retained',await page.locator('.domestic-history').count()===2);await page.getByRole('button',{name:'Close dialog',exact:true}).click();
  await page.getByRole('button',{name:'Edit BOM',exact:true}).click();check('Existing selections marked added',await page.locator('.domestic-picker-item[aria-disabled=true]').count()===2);await page.locator('[name=rate-0]').fill('999');await page.getByRole('button',{name:'Cancel',exact:true}).click();check('Cancel does not change saved cost',(await page.locator('.domestic-total').innerText()).includes('33.00'));
  await page.getByRole('link',{name:'Item Master',exact:true}).click();check('BOM rate edits do not change Item Master',await page.locator('[data-domestic-row] td:last-child').evaluateAll(cells=>cells.every(cell=>cell.textContent==='Pending')));
  await page.getByRole('link',{name:'Model BOMs',exact:true}).click();await page.getByRole('link',{name:'Open BOM',exact:true}).first().click();await page.getByRole('button',{name:'Edit BOM',exact:true}).click();await page.locator('#domestic-picker-segment').selectOption('assemblies');check('Model can pick saved assemblies',await page.locator('.domestic-picker-item:visible').count()===6);await page.locator('.domestic-picker-item[data-choice^="set:"][aria-disabled=false]').first().click();check('Assembly rates remain calculated',await page.locator('#domestic-selected-rows tr').count()===4&&await page.locator('[name=rate-3]').count()===0);await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.goto(bomUrl);await page.getByRole('button',{name:'Edit BOM',exact:true}).click();await page.locator('#domestic-picker-search').fill('frame');await page.locator('.modal').evaluate(async el=>{await Promise.all(el.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{})));});await page.screenshot({path:join(out,mode+'-desktop.png'),fullPage:true});
  for(const width of [390,320]){await page.setViewportSize({width,height:844});check('Mobile '+width+' viewport fits',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&document.querySelector('.modal').getBoundingClientRect().right<=innerWidth));await page.locator('.domestic-picker-item:visible[aria-disabled=false]').first().click();check('Mobile '+width+' item tap works',await page.locator('#domestic-selected-count').innerText()===(width===390?'3 items':'4 items'));check('Mobile '+width+' save remains visible',await page.getByRole('button',{name:'Save BOM revision',exact:true}).isVisible());await page.locator('.modal').evaluate(async el=>{await Promise.all(el.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{})));});await page.screenshot({path:join(out,mode+'-'+width+'.png'),fullPage:true});}
  check('No browser runtime errors',errors.length===0);reports.push({mode,checks,errors});await context.close();
 }
 writeFileSync(join(out,'report.json'),JSON.stringify(reports,null,2));console.log(JSON.stringify({out,checks:reports.reduce((n,r)=>n+r.checks.length,0),reports}));
}finally{await browser?.close();await new Promise(r=>server.close(r));await new Promise(r=>review.close(r));store.close();}
