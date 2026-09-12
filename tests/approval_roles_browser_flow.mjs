/** Standard approval roles after withdrawal of September delegation; isolated data only. */
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Store} from '../server/store.mjs';
import {makeServer} from '../server/index.mjs';
import {createSeed} from '../shared/seed.mjs';
import {execute} from '../shared/domain.mjs';
const out=resolve(process.env.FH_TEST_OUTPUT_ROOT||'test-output','approval-roles',new Date().toISOString().replace(/[:.]/g,'-'));mkdirSync(out,{recursive:true});
let seed=createSeed('2026-09-11');const executive=seed.users.find(u=>u.id==='u-exec'),oid=seed.orders.find(o=>o.status==='PENDING_APPROVAL').id;
const base=seed.bases.find(b=>!seed.orders.find(o=>o.id===oid).lines.some(l=>l.baseId===b.id));
seed=execute(seed,{type:'SAVE_SPEC',payload:{baseId:base.id,version:'ROLE-TEST',description:'Isolated specification',reason:'Standard-role regression'}},executive,{now:'2026-09-12T10:00:00Z'}).state;
const store=new Store(join(out,'test.sqlite'),seed),password='Isolated-approval-test-1234';for(const id of ['u-exec','u-manager','u-product'])store.addAccount(id,id+'@example.test',password);
const server=makeServer(store),report={checks:[],errors:[],out};let browser,context;
const check=(label,ok)=>{assert.ok(ok,label);report.checks.push(label);console.log('PASS '+label);};
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const {chromium}=await import(process.env.FH_PLAYWRIGHT_MODULE||pathToFileURL(resolve('test-output/ui-tools/node_modules/playwright/index.mjs')).href);
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 for(const mode of ['server','review']){
  context=await browser.newContext({viewport:{width:1440,height:1000}});await context.tracing.start({screenshots:true,snapshots:true});const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>report.errors.push(e.message));
  await page.clock.install({time:new Date('2026-09-12T10:00:00Z')});const root=mode==='server'?'http://127.0.0.1:'+server.address().port:pathToFileURL(resolve('Farming_Hub_Purchase_Management_Clean_Review.html')).href;
  await page.goto(root+'#/order/'+oid);
  const role=async id=>{if(mode==='review'){await page.locator('#demo-role').selectOption(id);return;}if(await page.getByRole('button',{name:'Sign out',exact:true}).count())await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.getByLabel(/^Email/).fill(id+'@example.test');await page.getByLabel(/^Password/).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.locator('.sidebar').waitFor();};
  if(mode==='review'){await page.evaluate(s=>{localStorage.setItem('fh-purchase-alpha15-clean-schema7',JSON.stringify(s));localStorage.setItem('fh-purchase-alpha15-clean-schema7-user','u-exec');},seed);await page.reload();}else await role('u-exec');
  check(mode+': September notice removed',await page.getByText(/Temporary approval access:/).count()===0);check(mode+': executive cannot approve PO during September',await page.locator('[data-action=approve-po]').count()===0);
  await role('u-manager');await page.locator('[data-action=approve-po]').click();await page.locator('[data-action=approve-po]').waitFor({state:'hidden'});
  const read=async()=>mode==='server'?store.read():page.evaluate(()=>JSON.parse(localStorage.getItem('fh-purchase-alpha15-clean-schema7')));
  check(mode+': manager issue audited without temporary policy',(await read()).events.some(e=>e.entityId===oid&&e.action==='PO_APPROVED'&&e.actorId==='u-manager'&&!e.approvalPolicy));
  await page.goto(root+'#/product/'+base.id);check(mode+': purchase manager has no technical approval',await page.locator('[data-action=approve-spec]').count()===0);await role('u-exec');check(mode+': executive has no technical approval',await page.locator('[data-action=approve-spec]').count()===0);
  await role('u-product');await page.locator('[data-action=approve-spec]').click();await page.locator('[data-action=approve-spec]').waitFor({state:'hidden'});check(mode+': Product Manager technical approval saved',(await read()).bases.find(b=>b.id===base.id).specifications.some(s=>s.version==='ROLE-TEST'&&s.status==='APPROVED'&&s.approvedBy===seed.users.find(u=>u.id==='u-product').name));
  await page.screenshot({path:join(out,mode+'-approved.png'),fullPage:true});await context.tracing.stop({path:join(out,mode+'-trace.zip')});await context.close();context=null;
 }
 check('No browser runtime errors',report.errors.length===0);report.status='PASS';
}catch(e){report.status='FAIL';report.failure=String(e.stack||e);console.error(report.failure);process.exitCode=1;}
finally{await context?.tracing.stop({path:join(out,'failure-trace.zip')}).catch(()=>{});await browser?.close();await new Promise(r=>server.close(r));store.close();writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2));console.log('Evidence: '+out);}
