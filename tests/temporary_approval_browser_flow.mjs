/** Isolated server/review approval UI and expiry checks. Never uses .env/live data. */
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Store} from '../server/store.mjs';
import {makeServer} from '../server/index.mjs';
import {createSeed} from '../shared/seed.mjs';
import {execute,temporaryApprovalsActive} from '../shared/domain.mjs';

assert.ok(temporaryApprovalsActive(),'Run during the delegated approval window');
const out=resolve('test-output/temporary-approvals',new Date().toISOString().replace(/[:.]/g,'-'));mkdirSync(out,{recursive:true});
let seed=createSeed('2026-09-11');const exec=seed.users.find(u=>u.id==='u-exec'),oid=seed.orders.find(o=>o.status==='PENDING_APPROVAL').id;
const base=seed.bases.find(b=>!seed.orders.find(o=>o.id===oid).lines.some(l=>l.baseId===b.id));
for(const version of ['DELEGATION-APPROVE','DELEGATION-REJECT'])seed=execute(seed,{type:'SAVE_SPEC',payload:{baseId:base.id,version,description:'Isolated technical specification',reason:'Test approval delegation'}},exec,{now:'2026-09-12T10:00:00Z'}).state;
const store=new Store(join(out,'test.sqlite'),seed),password='Isolated-approval-test-1234';store.addAccount(exec.id,'executive@example.test',password);
const server=makeServer(store),report={checks:[],errors:[],out};let browser,context;
const check=(label,ok)=>{assert.ok(ok,label);report.checks.push(label);console.log('PASS '+label);};
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const {chromium}=await import(process.env.FH_PLAYWRIGHT_MODULE||pathToFileURL(resolve('test-output/ui-tools/node_modules/playwright/index.mjs')).href);
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 for(const mode of ['server','review']){
  context=await browser.newContext({viewport:{width:1440,height:1000}});await context.tracing.start({screenshots:true,snapshots:true});const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>report.errors.push(e.message));
  const root=mode==='server'?'http://127.0.0.1:'+server.address().port:pathToFileURL(resolve('Farming_Hub_Purchase_Management_Clean_Review.html')).href;
  await page.clock.install({time:new Date('2026-09-30T18:29:50Z')});await page.goto(root+'#/order/'+oid);
  if(mode==='server'){await page.getByLabel(/^Email/).fill('executive@example.test');await page.getByLabel(/^Password/).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();}
  else{await page.evaluate(s=>{localStorage.setItem('fh-purchase-alpha15-clean-schema7',JSON.stringify(s));localStorage.setItem('fh-purchase-alpha15-clean-schema7-user','u-exec');},seed);await page.reload();}
  await page.locator('[data-action=approve-po]').waitFor();check(mode+': executive sees PO approval and expiry notice',await page.getByText(/Temporary approval access:/).count()===1);
  await page.clock.setSystemTime(new Date('2026-09-30T18:30:00Z'));await page.locator('[data-action=approve-po]').waitFor({state:'hidden'});check(mode+': open page removes approval controls at IST expiry',await page.getByText(/Temporary approval access:/).count()===0);
  await page.clock.setSystemTime(new Date('2026-09-12T10:00:00Z'));await page.locator('[data-action=approve-po]').waitFor();
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:join(out,mode+'-mobile.png'),fullPage:true});check(mode+': mobile notice remains inside viewport',await page.getByText(/Temporary approval access:/).evaluate(el=>el.getBoundingClientRect().right<=innerWidth));await page.setViewportSize({width:1440,height:1000});
  await page.locator('[data-action=approve-po]').click();await page.locator('[data-action=approve-po]').waitFor({state:'hidden'});
  const read=async()=>mode==='server'?store.read():page.evaluate(()=>JSON.parse(localStorage.getItem('fh-purchase-alpha15-clean-schema7')));
  check(mode+': executive approval persisted with policy and real actor',(await read()).events.some(e=>e.entityId===oid&&e.action==='PO_APPROVED'&&e.actorId==='u-exec'&&e.approvalPolicy?.id==='DEC-014'));
  await page.goto(root+'#/product/'+base.id);await page.locator('[data-action=approve-spec]').first().waitFor();await page.locator('[data-action=approve-spec][data-spec="'+seed.bases.find(b=>b.id===base.id).specifications.find(s=>s.version==='DELEGATION-APPROVE').id+'"]').click();
  await page.waitForFunction(()=>document.querySelectorAll('[data-action=approve-spec]').length===1);
  check(mode+': executive technical approval persisted',(await read()).bases.find(b=>b.id===base.id).specifications.some(s=>s.version==='DELEGATION-APPROVE'&&s.status==='APPROVED'&&s.approvedBy===exec.name));
  await page.locator('[data-action=reject-spec]').click();await page.locator('#dialog-form [name=remarks]').fill('Isolated rejection reason');await page.locator('#dialog-form [type=submit]').click();await page.getByRole('dialog').waitFor({state:'hidden'});
  check(mode+': executive rejection retained remarks',(await read()).bases.find(b=>b.id===base.id).specifications.some(s=>s.version==='DELEGATION-REJECT'&&s.status==='REJECTED'&&s.rejectionRemarks==='Isolated rejection reason'));
  await page.screenshot({path:join(out,mode+'-plm.png'),fullPage:true});await context.tracing.stop({path:join(out,mode+'-trace.zip')});await context.close();context=null;
 }
 check('No browser runtime errors',report.errors.length===0);report.status='PASS';
}catch(e){report.status='FAIL';report.failure=String(e.stack||e);console.error(report.failure);process.exitCode=1;}
finally{await context?.tracing.stop({path:join(out,'failure-trace.zip')}).catch(()=>{});await browser?.close();await new Promise(r=>server.close(r));store.close();writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2));console.log('Evidence: '+out);}
