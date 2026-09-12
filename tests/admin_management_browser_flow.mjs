/** Isolated admin management checks; no .env or live business records. */
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Store} from '../server/store.mjs';
import {makeServer} from '../server/index.mjs';
import {createCleanSeed} from '../shared/clean-seed.mjs';
const out=resolve(process.env.FH_TEST_OUTPUT_ROOT||'test-output','admin-management',new Date().toISOString().replace(/[:.]/g,'-'));mkdirSync(out,{recursive:true});
const seed=createCleanSeed(),store=new Store(join(out,'test.sqlite'),seed),password='Isolated-admin-test-1234';
for(const id of ['u-admin','u-exec'])store.addAccount(id,id+'@example.test',password);
const server=makeServer(store),report={checks:[],errors:[],out};let browser,context;
const check=(label,ok=true)=>{assert.ok(ok,label);report.checks.push(label);console.log('PASS '+label);};
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const {chromium}=await import(process.env.FH_PLAYWRIGHT_MODULE||pathToFileURL(resolve('test-output/ui-tools/node_modules/playwright/index.mjs')).href);
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 for(const mode of ['server','review']){
  context=await browser.newContext({viewport:{width:1440,height:1000}});await context.tracing.start({screenshots:true,snapshots:true});const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>report.errors.push(e.message));
  const root=mode==='server'?'http://127.0.0.1:'+server.address().port:pathToFileURL(resolve('Farming_Hub_Purchase_Management_Clean_Review.html')).href;
  await page.goto(root+'#/settings');
  if(mode==='server'){await page.getByLabel(/^Email/).fill('u-admin@example.test');await page.getByLabel(/^Password/).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();}
  else{await page.evaluate(s=>{localStorage.setItem('fh-purchase-alpha15-clean-schema7',JSON.stringify(s));localStorage.setItem('fh-purchase-alpha15-clean-schema7-user','u-admin');},seed);await page.reload();}
  const edit=page.locator('[data-action=change-role][data-user="u-exec"]');await edit.waitFor();check(mode+': cannot edit own admin role',await page.locator('[data-action=change-role][data-user="u-admin"]').count()===0);
  await edit.click();const dialog=page.getByRole('dialog');await dialog.getByLabel(/^Role/).selectOption('MANAGER');await dialog.getByLabel('Reason for role change').fill('Temporary staffing assignment');
  await page.setViewportSize({width:390,height:844});const box=await dialog.boundingBox();check(mode+': role form fits mobile viewport',box.x>=0&&box.x+box.width<=391);await page.screenshot({path:join(out,mode+'-role-mobile.png')});
  await dialog.getByRole('button',{name:'Save role',exact:true}).click();await dialog.waitFor({state:'hidden'});
  const read=async()=>mode==='server'?store.read():page.evaluate(()=>JSON.parse(localStorage.getItem('fh-purchase-alpha15-clean-schema7')));
  check(mode+': executive promoted with audit',(await read()).users.find(u=>u.id==='u-exec').role==='MANAGER'&&(await read()).events.some(e=>e.action==='USER_ROLE_CHANGED'&&e.actorId==='u-admin'));
  await page.setViewportSize({width:1440,height:1000});await edit.click();await dialog.getByLabel(/^Role/).selectOption('VIEWER');await dialog.getByLabel('Reason for role change').fill('Read-only assignment');await dialog.getByRole('button',{name:'Save role',exact:true}).click();await dialog.waitFor({state:'hidden'});check(mode+': demotion saved',(await read()).users.find(u=>u.id==='u-exec').role==='VIEWER');
  if(mode==='server'){await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.getByLabel(/^Email/).fill('u-exec@example.test');await page.getByLabel(/^Password/).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.locator('.sidebar').waitFor();}
  else{await page.locator('#demo-role').selectOption('u-exec');}
  check(mode+': non-admin sees no role editing',await page.locator('[data-action=change-role]').count()===0);
  await context.tracing.stop({path:join(out,mode+'-trace.zip')});await context.close();context=null;
 }
 check('No browser runtime errors',report.errors.length===0);report.status='PASS';
}catch(e){report.status='FAIL';report.failure=String(e.stack||e);console.error(report.failure);process.exitCode=1;}
finally{await context?.tracing.stop({path:join(out,'failure-trace.zip')}).catch(()=>{});await browser?.close();await new Promise(r=>server.close(r));store.close();writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2));console.log('Evidence: '+out);}
