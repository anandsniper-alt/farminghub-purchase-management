import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createServer} from 'node:http';
import {Store} from '../server/store.mjs';
import {emptyState,makeServer} from '../server/index.mjs';
import {RoCostingStore} from '../server/ro-costing-store.mjs';
import {validateRoRecord} from '../shared/ro-costing.mjs';

const out=resolve('test-output/ro-costing/browser');mkdirSync(out,{recursive:true});
const {chromium}=await import(pathToFileURL(process.env.FH_PLAYWRIGHT_MODULE).href);
const state=emptyState(),fixture=validateRoRecord({ro:'RO-TEST-A',supplier:'Test supplier',invoices:[{supplier:'Test supplier',invoice:'CI-TEST',currency:'USD',goods:100,extras:0,face:100}],actuals:{}});
const store=new Store(join(mkdtempSync(join(tmpdir(),'fh-ro-browser-')),'test.sqlite'),state),module=new RoCostingStore(store);
store.addAccount('admin','review@example.test','Isolated-browser-test-password');module.import('admin',{records:[{record:fixture,expectedRevision:0}],reason:'Isolated test fixture'});
const baseline=JSON.stringify(store.read()),server=makeServer(store,{log:()=>{}}),review=createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(readFileSync('Farming_Hub_Purchase_Management_Clean_Review.html'));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));await new Promise(r=>review.listen(0,'127.0.0.1',r));
let browser;const report=[];
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 for(const [mode,srv] of [['server',server],['review',review]]){
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
  if(mode==='review')await page.addInitScript(({state,fixture})=>{const key='fh-ro-browser-isolated';window.FH_REVIEW_STORE=key;localStorage.setItem(key,JSON.stringify(state));localStorage.setItem(key+'-user','admin');localStorage.setItem(key+':ro-costings:admin',JSON.stringify({[fixture.ro]:{record:fixture,revision:1}}));}, {state,fixture});
  const base='http://127.0.0.1:'+srv.address().port;
  await page.goto(base+'/#/ro-costings');
  if(mode==='server'){await page.getByLabel('Email').fill('review@example.test');await page.getByLabel('Password').fill('Isolated-browser-test-password');await page.locator('#login-form [type=submit]').click();}
  await page.getByRole('link',{name:'RO-TEST-A',exact:true}).click();await page.getByRole('button',{name:'Edit workings',exact:true}).click();
  assert.equal(await page.locator('[name=ro]').inputValue(),'RO-TEST-A');
  await page.getByRole('button',{name:'Add supplier invoice',exact:true}).click();await page.keyboard.press('Escape');await page.getByRole('button',{name:'Keep editing',exact:true}).click();assert.equal(await page.locator('[data-ro-invoice]').count(),2);
  await page.locator('#modal-root [data-action=close]').first().click();await page.getByRole('button',{name:'Discard changes',exact:true}).click();await page.locator('.modal').waitFor({state:'detached'});
  await page.getByRole('button',{name:'Edit workings',exact:true}).click();await page.locator('[name=supplierInr]').fill('9000');for(const key of ['bankNet','forwarderNet','otherNet','bcd','sws'])await page.locator('[name='+key+']').fill('0');
  await page.locator('[name=expenseCoverage]').selectOption('Complete');await page.locator('[name=currencyConfirmed]').check();await page.locator('[name=confirmation]').fill('Isolated test: actual payment and explicit nil expenses verified.');await page.locator('[name=reason]').fill('Verify complete-cost save.');await page.getByRole('button',{name:'Save workings',exact:true}).click();await page.locator('.modal').waitFor({state:'detached'});await page.locator('.arrival-results').waitFor();
  assert.match(await page.locator('.arrival-results').innerText(),/90\.00/);assert.match(await page.locator('main').innerText(),/Complete/);
  await page.screenshot({path:join(out,mode+'-desktop.png'),fullPage:true});await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:join(out,mode+'-mobile.png'),fullPage:true});
  await page.getByRole('button',{name:'Edit workings',exact:true}).click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.keyboard.press('Escape');await page.locator('.modal').waitFor({state:'detached'});
  assert.deepEqual(errors,[]);report.push({mode,checks:['RO route and accessible controls','invoice row changes protected','actual costing saved with currency confirmation','blank-to-explicit-zero handling','390px page and modal fit','no browser errors'],errors});await page.close();
 }
 assert.equal(JSON.stringify(store.read()),baseline);
 // Read-only screenshots of the user's locally imported data, never synthetic edits.
 if(process.env.FH_RO_IMPORT_EMAIL){const page=await browser.newPage({viewport:{width:1440,height:1000}});await page.goto('http://127.0.0.1:8878/#/ro-costings');await page.getByLabel('Email').fill(process.env.FH_RO_IMPORT_EMAIL);await page.getByLabel('Password').fill(process.env.FH_RO_IMPORT_PASSWORD);await page.locator('#login-form [type=submit]').click();await page.getByRole('link',{name:'1547',exact:true}).waitFor();assert.match(await page.locator('main').innerText(),/30 RO records/);await page.screenshot({path:join(out,'actual-ro-list.png'),fullPage:true});await page.getByRole('link',{name:'1547',exact:true}).click();await page.getByRole('button',{name:'Edit workings',exact:true}).waitFor();await page.screenshot({path:join(out,'actual-ro-1547.png'),fullPage:true});await page.close();}
 writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser?.close();await new Promise(r=>server.close(r));await new Promise(r=>review.close(r));store.close();}
