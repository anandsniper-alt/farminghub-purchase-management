/** Approval-control window and current-session enforcement; isolated native server/review. */
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Store} from '../server/store.mjs';
import {makeServer} from '../server/index.mjs';
import {createSeed} from '../shared/seed.mjs';
import {APPROVAL_STAGES} from '../shared/domain.mjs';
const out=resolve(process.env.FH_TEST_OUTPUT_ROOT||'test-output','approval-controls',new Date().toISOString().replace(/[:.]/g,'-'));mkdirSync(out,{recursive:true});
const seed=createSeed('2026-09-11'),target=seed.orders.find(o=>o.artwork.current);target.artwork.pending={...target.artwork.current,id:'controls-test-artwork',label:'Test artwork revision'};
const base=seed.bases.find(b=>b.specifications?.length);base.specifications.push({...base.specifications[0],id:'controls-test-spec',status:'PENDING',version:'CONTROLS-TEST'});
const store=new Store(join(out,'test.sqlite'),seed),password='Isolated-controls-test-1234';for(const id of ['u-admin','u-manager'])store.addAccount(id,id+'@example.test',password);
const server=makeServer(store),report={checks:[],errors:[],out};let browser,context,page;
const check=(label,ok=true)=>{assert.ok(ok,label);report.checks.push(label);console.log('PASS '+label);};
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const {chromium}=await import(process.env.FH_PLAYWRIGHT_MODULE||pathToFileURL(resolve('test-output/ui-tools/node_modules/playwright/index.mjs')).href);browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 for(const mode of ['server','review']){
  context=await browser.newContext({viewport:{width:1440,height:1000}});await context.tracing.start({screenshots:true,snapshots:true});page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>report.errors.push(e.message));const root=mode==='server'?'http://127.0.0.1:'+server.address().port:pathToFileURL(resolve('Farming_Hub_Purchase_Management_Clean_Review.html')).href;
  await page.goto(root+'#/settings');
  const role=async id=>{if(mode==='review'){await page.locator('#demo-role').selectOption(id);return;}if(await page.getByRole('button',{name:'Sign out',exact:true}).count())await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.getByLabel(/^Email/).fill(id+'@example.test');await page.getByLabel(/^Password/).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.locator('.sidebar').waitFor();};
  if(mode==='review'){await page.evaluate(s=>{localStorage.setItem('fh-purchase-alpha15-clean-schema7',JSON.stringify(s));localStorage.setItem('fh-purchase-alpha15-clean-schema7-user','u-admin');},seed);await page.reload();}else await role('u-admin');
  const read=async()=>mode==='server'?store.read():page.evaluate(()=>JSON.parse(localStorage.getItem('fh-purchase-alpha15-clean-schema7')));
  const open=()=>page.getByRole('button',{name:'Manage approval controls',exact:true}).click();const dialog=page.getByRole('dialog');await open();
  check(mode+': all 13 approval stages listed',await dialog.locator('fieldset').count()===APPROVAL_STAGES.length);check(mode+': Viewer and Administrator are not editable role grants',await dialog.locator('input[value=VIEWER],input[value=ADMIN]').count()===0);
  await dialog.locator('[name=approval-APPROVE_ARTWORK][value=MANAGER]').check();await dialog.getByRole('button',{name:'Cancel',exact:true}).click();check(mode+': cancel does not save policy',!(await read()).approvalControls);
  await open();await dialog.locator('[name=approval-APPROVE_ARTWORK][value=MANAGER]').check();await dialog.locator('[name=approval-REJECT_SPEC][value=MANAGER]').check();
  await dialog.getByRole('button',{name:'Save approval controls',exact:true}).click();check(mode+': reason is required',await dialog.locator('[name=remarks]').evaluate(el=>!el.checkValidity()));await dialog.locator('[name=remarks]').fill('Temporary artwork coverage and technical rejection review');await dialog.getByRole('button',{name:'Save approval controls',exact:true}).click();check(mode+': explicit confirmation required',!(await read()).approvalControls);await dialog.locator('[name=confirm]').check();
  await page.setViewportSize({width:390,height:844});const box=await dialog.boundingBox();check(mode+': form fits mobile',box.x>=0&&box.x+box.width<=391);await page.screenshot({path:join(out,mode+'-mobile-controls.png')});
  await dialog.getByRole('button',{name:'Save approval controls',exact:true}).click();await dialog.waitFor({state:'hidden'});check(mode+': change persists with admin audit',(await read()).approvalControls.stages.APPROVE_ARTWORK.includes('MANAGER')&&(await read()).events.at(-1).actorId==='u-admin');
  await page.setViewportSize({width:1440,height:1000});await page.reload();await open();check(mode+': saved choices survive reload',await dialog.locator('[name=approval-APPROVE_ARTWORK][value=MANAGER]').isChecked());await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
  await role('u-manager');check(mode+': non-admin has no controls entry',await page.locator('[data-action=approval-controls]').count()===0);
  await page.goto(root+'#/product/'+base.id);check(mode+': rejection grant is independent of technical approval',await page.locator('[data-action=reject-spec][data-spec=controls-test-spec]').count()===1&&await page.locator('[data-action=approve-spec][data-spec=controls-test-spec]').count()===0);
  await page.goto(root+'#/order/'+target.id);await page.locator('.tab[data-value=items]').click();await page.getByRole('button',{name:'Approve artwork',exact:true}).first().click();await page.getByRole('button',{name:'Approve artwork',exact:true}).waitFor({state:'hidden'});check(mode+': Manager artwork approval records policy revision',(await read()).events.some(e=>e.action==='ARTWORK_APPROVED'&&e.actorId==='u-manager'&&e.approvalControl?.revision===1));
  await role('u-admin');await page.goto(root+'#/settings');await open();await dialog.getByRole('button',{name:'Restore standard roles',exact:true}).click();check(mode+': restoring form alone does not save',!(await dialog.locator('[name=approval-APPROVE_ARTWORK][value=MANAGER]').isChecked())&&(await read()).approvalControls.revision===1);await dialog.locator('[name=remarks]').fill('Restore standard approval roles');await dialog.locator('[name=confirm]').check();await dialog.getByRole('button',{name:'Save approval controls',exact:true}).click();await dialog.waitFor({state:'hidden'});check(mode+': restoration appends history and retains completed approval',(await read()).approvalControls.revision===2&&(await read()).events.filter(e=>e.action==='APPROVAL_CONTROLS_UPDATED').length===2&&(await read()).orders.find(o=>o.id===target.id).artwork.current.id==='controls-test-artwork');
  await role('u-manager');await page.goto(root+'#/product/'+base.id);check(mode+': restored role removes technical rejection',await page.locator('[data-action=reject-spec][data-spec=controls-test-spec]').count()===0);
  await context.tracing.stop({path:join(out,mode+'-trace.zip')});await context.close();context=null;
 }
 check('No browser runtime errors',report.errors.length===0);report.status='PASS';
}catch(e){report.status='FAIL';report.failure=String(e.stack||e);console.error(report.failure);if(page)await page.screenshot({path:join(out,'failure.png'),fullPage:true}).catch(()=>{});process.exitCode=1;}
finally{await context?.tracing.stop({path:join(out,'failure-trace.zip')}).catch(()=>{});await browser?.close();await new Promise(r=>server.close(r));store.close();writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2));console.log('Evidence: '+out);}
