import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Store} from '../server/store.mjs';
import {makeServer} from '../server/index.mjs';
import {createSeed} from '../shared/seed.mjs';
const out=resolve(process.env.FH_TEST_OUTPUT_ROOT||'test-output','presentation-release',new Date().toISOString().replace(/[:.]/g,'-'));mkdirSync(out,{recursive:true});
const seed=createSeed('2026-09-12'),store=new Store(join(out,'test.sqlite'),seed);store.addAccount('u-manager','manager@example.test','Presentation-test-1234');
const server=makeServer(store),report={checks:[],errors:[],writes:[],out};let browser,context,page;
const check=(name,ok=true)=>{assert.ok(ok,name);report.checks.push(name);console.log('PASS '+name);};
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const {chromium}=await import(pathToFileURL(resolve('test-output/ui-tools/node_modules/playwright/index.mjs')).href);browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 for(const mode of ['server','review']){
  context=await browser.newContext({viewport:{width:1440,height:1000}});await context.tracing.start({screenshots:true,snapshots:true});page=await context.newPage();page.setDefaultTimeout(12000);
  page.on('pageerror',e=>report.errors.push(e.message));page.on('request',r=>{if(/\/api\/(commands|users|files)/.test(r.url())&&r.method()!=='GET')report.writes.push(r.url());});
  await page.addInitScript(()=>{window.presentationAnimations=[];const run=Element.prototype.animate;Element.prototype.animate=function(frames,options){window.presentationAnimations.push(options.duration);return run.call(this,frames,options);};});
  const root=mode==='server'?'http://127.0.0.1:'+server.address().port:pathToFileURL(resolve('Farming_Hub_Purchase_Management_Clean_Review.html')).href;
  await page.goto(root+'#/orders');
  if(mode==='server'){await page.getByLabel(/^Email/).fill('manager@example.test');await page.getByLabel(/^Password/).fill('Presentation-test-1234');await page.getByRole('button',{name:'Sign in',exact:true}).click();}
  else{await page.evaluate(s=>{localStorage.setItem('fh-purchase-alpha15-clean-schema7',JSON.stringify(s));localStorage.setItem('fh-purchase-alpha15-clean-schema7-user','u-manager');},seed);await page.reload();}
  await page.locator('#order-sort').waitFor();const read=()=>mode==='server'?store.read():page.evaluate(()=>JSON.parse(localStorage.getItem('fh-purchase-alpha15-clean-schema7')));const before=await read();
  check(mode+': Minimal defaults on',await page.locator('body').getAttribute('data-preview-theme')==='minimal');
  check(mode+': production has no sample-theme label or replay button',!(await page.locator('.theme-lab').innerText()).includes('THEME LAB')&&await page.locator('.theme-replay').count()===0);
  const show=page.getByRole('button',{name:'Show page guides',exact:true});check(mode+': Show page guides visible and enabled',await show.isVisible()&&await show.isEnabled());await show.click();check(mode+': page explanations restore',await page.locator('.page-head .subtitle').isVisible());await page.getByRole('button',{name:'Hide page guides',exact:true}).click();
  await page.getByRole('button',{name:'Current',exact:true}).click();check(mode+': Current retains full explanations',await page.locator('.page-head .subtitle').isVisible());await page.reload();await page.locator('#order-sort').waitFor();check(mode+': appearance choice survives reload',await page.locator('body').getAttribute('data-preview-theme')==='current');await page.getByRole('button',{name:'Minimal',exact:true}).click();
  const launch=page.getByRole('button',{name:'Guide me with Farming Hub',exact:true});await launch.click();await page.locator('.support-tour[open]').waitFor();
  check(mode+': mascot assets load',await page.locator('.support-mascot').evaluate(async e=>{await e.decode();return e.naturalWidth>0;}));check(mode+': visible dock remains in tour',await launch.isVisible());await page.getByRole('button',{name:'Next',exact:true}).click();check(mode+': next explanation uses pointing pose',await page.locator('.support-mascot').getAttribute('data-pose')==='pointing');await page.keyboard.press('Escape');
  const draft=seed.orders.find(o=>o.status==='DRAFT');await page.goto(root+'#/order/'+draft.id);await page.locator('.current-stage-card').waitFor();await launch.click();check(mode+': order help uses actual available next action',(await page.locator('#support-title').innerText()).startsWith('Next: '));await page.getByRole('button',{name:'Take me there',exact:true}).click();check(mode+': Take me there closes without submitting',await page.locator('.support-tour[open]').count()===0);
  if(await page.locator('.preview-actions>summary').count())await page.locator('.preview-actions>summary').click();await page.locator('main [data-action=note]').first().click();await page.locator('#dialog-form').waitFor();await page.locator('[name=remarks]').fill('Preserve this unsaved note');await launch.click();await page.keyboard.press('Escape');check(mode+': form stays open with unsaved input',await page.locator('[name=remarks]').inputValue()==='Preserve this unsaved note');await page.keyboard.press('Escape');
  check(mode+': page and modal animations run',await page.evaluate(()=>window.presentationAnimations.includes(280)&&window.presentationAnimations.includes(240)));
  await page.emulateMedia({reducedMotion:'reduce'});const count=await page.evaluate(()=>window.presentationAnimations.length);await page.goto(root+'#/orders');await page.locator('#order-sort').waitFor();await launch.click();check(mode+': reduced motion suppresses guide/page animation',await page.evaluate(n=>window.presentationAnimations.length===n,count));await page.keyboard.press('Escape');
  for(const width of [390,320]){await page.setViewportSize({width,height:844});const boxes=await page.locator('.theme-lab button,.support-launcher').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().toJSON()));check(mode+': controls fit '+width,boxes.every(b=>b.x>=0&&b.right<=width+1));await launch.click();check(mode+': page has no horizontal overflow at '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));check(mode+': guide opens at '+width,await page.locator('.support-tour[open]').isVisible());await page.keyboard.press('Escape');}
  check(mode+': stored business data unchanged',JSON.stringify(before)===JSON.stringify(await read()));await page.screenshot({path:join(out,mode+'-mobile.png'),fullPage:true});await context.tracing.stop({path:join(out,mode+'-trace.zip')});await context.close();context=null;
 }
 check('No runtime errors',report.errors.length===0);check('No business write requests',report.writes.length===0);report.status='PASS';
}catch(e){report.status='FAIL';report.failure=String(e.stack||e);console.error(report.failure);await page?.screenshot({path:join(out,'failure.png'),fullPage:true}).catch(()=>{});process.exitCode=1;}
finally{await context?.tracing.stop({path:join(out,'failure-trace.zip')}).catch(()=>{});await browser?.close();await new Promise(r=>server.close(r));store.close();writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2));console.log('Evidence: '+out);}
