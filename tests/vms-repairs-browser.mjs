/** Current regression checks using synthetic local records; never uses live credentials or data. */
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {createSeed} from '../shared/seed.mjs';
import {execute} from '../shared/domain.mjs';
import {Store} from '../server/store.mjs';
import {makeServer} from '../server/index.mjs';
const out=resolve('test-output/vms-repairs',new Date().toISOString().replace(/[:.]/g,'-'));mkdirSync(out,{recursive:true});
let seed=createSeed('2026-09-11');const manager=seed.users.find(u=>u.role==='MANAGER'),vendorId=seed.vendors[0].id,password=randomUUID()+'Test1!';
for(const [title,occurredAt,due] of [['Older open action','2026-09-10','2026-09-11'],['Newest contact','2026-09-12','2026-09-14']])seed=execute(seed,{type:'VMS_ADD_INTERACTION',payload:{vendorId,type:'VISIT',title,notes:title,occurredAt,nextFollowUpAt:due}},manager).state;
const latest=seed.vendors[0].crm.interactions.at(-1);seed=execute(seed,{type:'VMS_UPDATE_FOLLOWUP',payload:{vendorId,interactionId:latest.id,nextFollowUpAt:latest.nextFollowUpAt,completed:true,remarks:'Outcome visible in history'}},manager).state;
const store=new Store(join(out,'test.sqlite'),seed);store.addAccount(manager.id,'repairs@example.test',password);
const server=makeServer(store),review=createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(readFileSync('test-output/Domestic_BOM_Preview.html'));});let browser;const reports=[];
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));await new Promise(r=>review.listen(0,'127.0.0.1',r));
 const {chromium}=await import(pathToFileURL(resolve(process.env.FH_PLAYWRIGHT_MODULE||'../ui-tools/node_modules/playwright/index.mjs')).href);browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 for(const mode of ['server','review']){
  const ctx=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await ctx.newPage(),checks=[],errors=[];page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
  const check=(name,value)=>{assert.ok(value,name);checks.push(name);};
  await ctx.addInitScript(()=>{const interval=window.setInterval;window.setInterval=(fn,ms,...args)=>{if(ms===30000)window.__syncTick=fn;return interval(fn,ms,...args);};});
  if(mode==='review')await ctx.addInitScript(({seed,id})=>{if(!localStorage.getItem('fh-domestic-preview-v1')){localStorage.setItem('fh-domestic-preview-v1',JSON.stringify(seed));localStorage.setItem('fh-domestic-preview-v1-user',id);}},{seed,id:manager.id});
  const origin='http://127.0.0.1:'+(mode==='server'?server:review).address().port;
  await page.goto(origin);if(mode==='server'){await page.getByLabel('Email').fill('repairs@example.test');await page.getByLabel('Password').fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();}
  const profile=async()=>{await page.goto(origin+'/#/vms/'+vendorId);await page.getByRole('heading',{name:seed.vendors[0].name,exact:true}).waitFor();};
  const history=()=>page.locator('.panel').filter({has:page.getByRole('heading',{name:'Interactions & follow-ups',exact:true})});
  const open=async title=>{await page.getByRole('button',{name:'Record visit',exact:true}).click();await page.locator('[name=title]').fill(title);await page.locator('[name=notes]').fill('Synthetic visit regression');};
  const save=()=>page.locator('#dialog-form button[type=submit]').click();
  await profile();check('history sorted by visit date',(await history().locator('tbody tr').first().innerText()).includes('Newest contact'));check('completion outcome visible',(await history().innerText()).includes('Outcome visible in history'));
  await open('Historical visit without action');check('VISIT selected',await page.locator('[name=type]').inputValue()==='VISIT');check('no mandatory artificial reminder',await page.locator('[name=nextFollowUpAt]').inputValue()===''&&!(await page.locator('[name=nextFollowUpAt]').evaluate(e=>e.required)));await page.locator('[name=occurredAt]').fill('2026-09-09');await save();await page.getByRole('dialog').waitFor({state:'hidden'});check('historical visit saved',(await history().innerText()).includes('Historical visit without action'));check('explicit no-follow-up status',(await history().innerText()).includes('No follow-up'));
  await page.goto(origin+'/#/vms/module/followups');await page.locator('main').getByText('Older open action',{exact:true}).waitFor();check('older open action survives newer completion',(await page.locator('main').innerText()).includes('Older open action'));
  if(mode==='server'){
   await profile();await ctx.setOffline(true);for(let i=1;i<=3;i++){await open('Offline visit '+i);await save();await page.getByRole('dialog').waitFor({state:'hidden'});}check('three independent visits queued',await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('fh-vms-outbox-v1:')).length)===3);
   await ctx.setOffline(false);await page.waitForFunction(()=>!Object.keys(localStorage).some(k=>k.startsWith('fh-vms-outbox-v1:')));check('three visits retained exactly once',store.read().vendors[0].crm.interactions.filter(i=>i.title.startsWith('Offline visit ')).length===3);
   await page.goto(origin+'/#/vms/module/settings');const guides=page.locator('[name=showPageGuides]');await guides.waitFor();const before=await guides.isChecked();await guides.setChecked(!before);await page.evaluate(()=>window.__syncTick());check('idle sync preserves unsaved preference',await guides.isChecked()===!before);
   await profile();await open('Invalid date with attachment');await page.locator('[name=occurredAt]').fill('2099-01-01');await page.locator('[name=vmsFiles]').setInputFiles({name:'invalid.txt',mimeType:'text/plain',buffer:Buffer.from('Test')});const files=store.read().files.length;await save();await page.locator('#modal-error.visible').waitFor();check('invalid date rejected before evidence upload',store.read().files.length===files);await page.getByRole('button',{name:'Cancel',exact:true}).click();
   let dropped=false;await page.route('**/api/commands',async route=>{if(!dropped&&route.request().postDataJSON()?.type==='VMS_ADD_INTERACTION'){dropped=true;await route.fetch();await route.abort('failed');}else await route.continue();});
   await open('Attached visit lost response');await page.locator('[name=vmsFiles]').setInputFiles({name:'saved.txt',mimeType:'text/plain',buffer:Buffer.from('Retained evidence')});await save();await page.locator('#modal-error.visible').waitFor();await save();await page.getByRole('dialog').waitFor({state:'hidden'});await page.unroute('**/api/commands');check('attached retry reconciles without duplicate',store.read().vendors[0].crm.interactions.filter(i=>i.title==='Attached visit lost response').length===1);
   check('orders and payments unchanged',JSON.stringify(store.read().orders)===JSON.stringify(seed.orders)&&JSON.stringify(store.read().payments)===JSON.stringify(seed.payments));
  }
  await profile();await page.screenshot({path:join(out,mode+'-history.png'),fullPage:true});await page.setViewportSize({width:390,height:844});await open('Mobile visit');check('mobile dialog fits',await page.getByRole('dialog').evaluate(e=>e.getBoundingClientRect().right<=innerWidth+1));await page.screenshot({path:join(out,mode+'-mobile.png')});check('no browser runtime errors',errors.length===0);reports.push({mode,checks,errors});await ctx.close();
 }
}finally{writeFileSync(join(out,'report.json'),JSON.stringify(reports,null,2));await browser?.close();await new Promise(r=>server.close(r));await new Promise(r=>review.close(r));store.close();console.log(JSON.stringify({out,reports},null,2));}
