/** Synthetic server/review bulk delete, restore and serial regression; no live records. */
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Store} from '../server/store.mjs';
import {makeServer} from '../server/index.mjs';
import {createSeed} from '../shared/seed.mjs';
const out=resolve(process.env.FH_TEST_OUTPUT_ROOT||'test-output','bulk-orders',new Date().toISOString().replace(/[:.]/g,'-'));mkdirSync(out,{recursive:true});
const seed=createSeed('2026-09-11'),template=seed.orders.find(o=>o.status==='DRAFT');
for(let i=0;i<14;i++){const o=structuredClone(template);o.id='bulk-test-'+i;o.number='BULK-TEST-'+i;delete o.serialNumber;seed.orders.push(o);}
const store=new Store(join(out,'test.sqlite'),seed),password='Isolated-bulk-test-1234';for(const id of ['u-admin','u-exec'])store.addAccount(id,id+'@example.test',password);
const server=makeServer(store),report={checks:[],errors:[],out};let browser,context;
const check=(label,ok=true)=>{assert.ok(ok,label);report.checks.push(label);console.log('PASS '+label);};
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const {chromium}=await import(process.env.FH_PLAYWRIGHT_MODULE||pathToFileURL(resolve('test-output/ui-tools/node_modules/playwright/index.mjs')).href);
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 for(const mode of ['server','review']){
  context=await browser.newContext({viewport:{width:1440,height:1000}});await context.tracing.start({screenshots:true,snapshots:true});const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>report.errors.push(e.message));
  const root=mode==='server'?'http://127.0.0.1:'+server.address().port:pathToFileURL(resolve('Farming_Hub_Purchase_Management_Clean_Review.html')).href;
  await page.goto(root+'#/orders');
  if(mode==='server'){await page.getByLabel(/^Email/).fill('u-admin@example.test');await page.getByLabel(/^Password/).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();}
  else{await page.evaluate(s=>{localStorage.setItem('fh-purchase-alpha15-clean-schema7',JSON.stringify(s));localStorage.setItem('fh-purchase-alpha15-clean-schema7-user','u-admin');},seed);await page.reload();}
  await page.locator('#order-visibility').waitFor();const read=async()=>mode==='server'?store.read():page.evaluate(()=>JSON.parse(localStorage.getItem('fh-purchase-alpha15-clean-schema7')));
  const initial=await read(),a=initial.orders[0],b=initial.orders[12];check(mode+': stable serial column visible',await page.getByRole('columnheader',{name:'S.No.',exact:true}).count()===1);
  await page.getByLabel('Select all orders on this page',{exact:true}).check();check(mode+': select all affects current page only',await page.getByRole('button',{name:'Delete selected (12)',exact:true}).count()===1);await page.getByLabel('Select all orders on this page',{exact:true}).uncheck();
  await page.locator('[data-order-select="'+a.id+'"]').check();check(mode+': checkbox does not navigate away',page.url().endsWith('#/orders'));await page.getByRole('button',{name:'Next',exact:true}).click();await page.locator('[data-order-select="'+b.id+'"]').check();await page.getByRole('button',{name:'Delete selected (2)',exact:true}).click();const dialog=page.getByRole('dialog');
  check(mode+': confirmation lists selected orders across pages',(await dialog.innerText()).includes(a.number)&&(await dialog.innerText()).includes(b.number));await dialog.getByRole('button',{name:'Cancel',exact:true}).click();check(mode+': cancel does not delete',(await read()).orders.every(o=>!o.deletedAt));
  await page.getByRole('button',{name:'Delete selected (2)',exact:true}).click();await dialog.getByLabel('Reason for deletion').fill('Isolated test deletion');await dialog.getByRole('button',{name:'Delete orders',exact:true}).click();await dialog.getByText('Confirm the selected orders.',{exact:true}).waitFor();check(mode+': explicit confirmation required',(await read()).orders.every(o=>!o.deletedAt));await dialog.getByLabel('I confirm these 2 selected orders.').check();
  await page.setViewportSize({width:390,height:844});const box=await dialog.boundingBox();check(mode+': bulk confirmation fits mobile',box.x>=0&&box.x+box.width<=391);await page.screenshot({path:join(out,mode+'-delete-mobile.png')});await dialog.getByRole('button',{name:'Delete orders',exact:true}).click();await dialog.waitFor({state:'hidden'});await page.setViewportSize({width:1440,height:1000});
  const deleted=await read();check(mode+': exactly selected records deleted',deleted.orders.filter(o=>o.deletedAt).length===2);check(mode+': financial history and original serials retained',JSON.stringify(deleted.payments)===JSON.stringify(initial.payments)&&deleted.orders.every((o,i)=>o.serialNumber===initial.orders[i].serialNumber));
  await page.goto(root+'#/orders');check(mode+': active list excludes deleted PO',await page.locator('[data-order-select="'+a.id+'"]').count()===0);await page.locator('#order-visibility').selectOption('deleted');await page.getByRole('heading',{name:'Deleted orders',exact:true}).waitFor();await page.locator('tr[data-id="'+a.id+'"] .code-link').click();await page.getByRole('button',{name:'Restore order',exact:true}).waitFor();check(mode+': deleted detail is read-only',await page.locator('[data-action=approve-po],[data-action=approve-pi],[data-action=document],[data-action=payment]').count()===0);await page.screenshot({path:join(out,mode+'-deleted-detail.png'),fullPage:true});
  await page.goto(root+'#/payments');check(mode+': retained order remains in settlement table',await page.locator('tr[data-id="'+a.id+'"] .badge').filter({hasText:'Deleted'}).count()===1);
  await page.goto(root+'#/orders');await page.locator('#order-visibility').selectOption('deleted');await page.getByLabel('Select all orders on this page',{exact:true}).check();await page.getByRole('button',{name:'Restore selected (2)',exact:true}).click();await dialog.getByLabel('Reason for restoration').fill('Restore original test records');await dialog.getByLabel('I confirm these 2 selected orders.').check();await dialog.getByRole('button',{name:'Restore orders',exact:true}).click();await dialog.waitFor({state:'hidden'});check(mode+': restore retains original serials and snapshots',(await read()).orders.every((o,i)=>!o.deletedAt&&o.serialNumber===initial.orders[i].serialNumber&&JSON.stringify(o.revisions)===JSON.stringify(initial.orders[i].revisions)));
  await page.locator('#order-visibility').selectOption('active');await page.locator('[data-order-select="'+a.id+'"]').check();await page.getByRole('textbox',{name:'Search orders',exact:true}).fill('NO-MATCH');check(mode+': filter clears hidden selections',await page.locator('[data-action=delete-orders]').count()===0);
  if(mode==='server'){await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.getByLabel(/^Email/).fill('u-exec@example.test');await page.getByLabel(/^Password/).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.locator('.sidebar').waitFor();}else await page.locator('#demo-role').selectOption('u-exec');
  check(mode+': non-admin has no delete or restore selectors',await page.locator('#order-visibility,[data-order-select],[data-action=delete-orders],[data-action=restore-orders]').count()===0);
  await context.tracing.stop({path:join(out,mode+'-trace.zip')});await context.close();context=null;
 }
 check('No runtime errors',report.errors.length===0);report.status='PASS';
}catch(e){report.status='FAIL';report.failure=String(e.stack||e);console.error(report.failure);process.exitCode=1;}
finally{await context?.tracing.stop({path:join(out,'failure-trace.zip')}).catch(()=>{});await browser?.close();await new Promise(r=>server.close(r));store.close();writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2));console.log('Evidence: '+out);}
