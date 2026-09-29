import {chromium} from '../../ui-tools/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';import {createServer} from 'node:http';
import {Store} from '../server/store.mjs';import {makeServer} from '../server/index.mjs';import {createSeed} from '../shared/seed.mjs';
import {domesticPreviewState} from '../scripts/prepare-domestic-preview.mjs';
const state=createSeed('2026-09-11'),domestic=domesticPreviewState();for(const [k,v]of Object.entries(domestic))if(k.startsWith('domestic'))state[k]=v;
for(const u of state.users)if(!u.scopes.includes('LAE_DOMESTIC'))u.scopes.push('LAE_DOMESTIC');
const store=new Store(join(mkdtempSync(join(tmpdir(),'fh-hig-')),'qa.sqlite'),state);store.addAccount('u-manager','preview@example.test','isolated-hig-testing-123');
const server=makeServer(store),review=createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(readFileSync('Farming_Hub_Purchase_Management_Clean_Review.html'));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));await new Promise(r=>review.listen(0,'127.0.0.1',r));
const dir='test-output/hig-review';mkdirSync(dir,{recursive:true});let browser;const report=[];
try{browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 for(const [mode,srv]of [['server',server],['review',review]]){
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
  if(mode==='review')await page.addInitScript(s=>{localStorage.setItem('fh-purchase-alpha15-clean-schema7',JSON.stringify(s));localStorage.setItem('fh-purchase-alpha15-clean-schema7-user','u-manager');},state);
  const base='http://127.0.0.1:'+srv.address().port+'/';await page.goto(base+'#/tasks');
  if(mode==='server'){await page.locator('[name=email]').fill('preview@example.test');await page.locator('[name=password]').fill('isolated-hig-testing-123');await page.locator('[type=submit]').click();}
  await page.locator('#main-content').waitFor();
  assert.equal(await page.evaluate(()=>window.gsap?.version),'3.15.0');checks.push('Pinned local GSAP loaded');
  await page.evaluate(()=>{window.qaMotion=[];const fromTo=gsap.fromTo;gsap.fromTo=function(target,...args){window.qaMotion.push(target.className);return fromTo.call(this,target,...args);};});
  const before=mode==='server'?JSON.stringify(store.read()):await page.evaluate(()=>localStorage.getItem('fh-purchase-alpha15-clean-schema7'));
  const routes=['home','order-management','overview','orders','order/'+state.orders[0].id,'tasks','loading','payments','shipments','documents','vendors','items','prices','plm','settings','vms/module/dashboard','vms/module/vendors','vms/module/followups','domestic/models','domestic/sets','domestic/items','domestic/vendors','domestic/prices','domestic/orders'];
  for(const width of [1440,390]){await page.setViewportSize({width,height:1000});for(const route of routes){await page.goto(base+'#/'+route);await page.locator('#main-content').waitFor();await page.waitForTimeout(60);const overflow=await page.evaluate(()=>({page:document.documentElement.scrollWidth,view:innerWidth}));assert.ok(overflow.page<=overflow.view+1,mode+' '+route+' '+width+' overflow '+JSON.stringify(overflow));assert.ok(await page.locator('main h1').count(),route+' heading');checks.push(route+' @ '+width);if(['tasks','overview','vendors','domestic/models','loading'].includes(route))await page.screenshot({path:dir+'/'+mode+'-'+route.replaceAll('/','-')+'-'+width+'.png'});}}
  await page.setViewportSize({width:1440,height:1000});await page.goto(base+'#/tasks');await page.getByLabel('Supplier',{exact:true}).waitFor();checks.push('Task filter accessible labels');
  const contrast=await page.locator('.subtitle,.panel-footer,.task-filters .field>span,.badge,.sidebar summary').evaluateAll(els=>els.filter(e=>e.getClientRects().length).map(el=>{
   const rgb=s=>s.match(/[\d.]+/g).map(Number),lum=c=>c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
   let bg=[255,255,255];for(let p=el;p;p=p.parentElement){const c=rgb(getComputedStyle(p).backgroundColor);if(c.length===3||c[3]===1){bg=c;break;}}
   const a=lum(rgb(getComputedStyle(el).color)),b=lum(bg);return {label:el.textContent.slice(0,45),ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
  }));assert.ok(contrast.length);for(const c of contrast)assert.ok(c.ratio>=4.5,JSON.stringify(c));checks.push('Sampled task labels and statuses meet 4.5:1 text contrast');
  await page.locator('.skip-link').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#main-content').evaluate(e=>e===document.activeElement),true);checks.push('Skip navigation');
  const regions=page.locator('.table-wrap');assert.ok(await regions.count());assert.equal(await regions.first().getAttribute('tabindex'),'0');checks.push('Keyboard-scrollable tables');
  await page.goto(base+'#/vendors');const opener=page.locator('[data-action=vendor-edit]').first();await opener.click();await page.locator('#modal-title').waitFor();await page.waitForTimeout(70);
  assert.equal(await page.locator('#app').evaluate(e=>e.inert),true);assert.equal(await page.locator('#modal-title').evaluate(e=>e===document.activeElement),true);checks.push('Dialog focus and background isolation');
  const input=page.locator('#dialog-form [name=name]');await input.fill('HIG unsaved example');await page.keyboard.press('Escape');await page.getByRole('button',{name:'Keep editing',exact:true}).click();assert.equal(await input.inputValue(),'HIG unsaved example');checks.push('Escape protects entered values');
  await page.locator('#modal-root [data-action=close]').first().click();await page.getByRole('button',{name:'Keep editing',exact:true}).waitFor();await page.getByRole('button',{name:'Keep editing',exact:true}).click();
  const tabOrder=await page.locator('.modal').evaluate(box=>[...box.querySelectorAll('button:not(:disabled),input:not(:disabled):not([type=hidden]),select:not(:disabled),textarea:not(:disabled),a[href],summary,[tabindex="0"]')].filter(e=>e.getClientRects().length).map(e=>{e.dataset.qaFocus=String(Math.random());return e.dataset.qaFocus;}));
  await page.locator('[data-qa-focus="'+tabOrder.at(-1)+'"]').focus();await page.keyboard.press('Tab');assert.equal(await page.locator('[data-qa-focus="'+tabOrder[0]+'"]').evaluate(e=>e===document.activeElement),true);checks.push('Visible-only dialog focus loop');
  await page.locator('#modal-root [data-action=close]').first().click();await page.getByRole('button',{name:'Discard changes',exact:true}).click();await page.locator('.modal').waitFor({state:'detached'});await page.waitForTimeout(80);assert.equal(await page.locator('#app').evaluate(e=>e.inert),false);assert.equal(await opener.evaluate(e=>e===document.activeElement),true);checks.push('Explicit discard and focus return');
  assert.ok(await page.evaluate(()=>qaMotion.some(c=>c.includes('content'))&&qaMotion.some(c=>c.includes('modal'))));
  await page.waitForTimeout(320);assert.equal(await page.locator('#main-content').evaluate(e=>e.style.opacity+e.style.transform),'');checks.push('GSAP transitions restore original inline styles');
  await page.evaluate(()=>{gsap.globalTimeline.timeScale(.1);location.hash='#/overview';});await page.getByRole('heading',{name:'Overview',exact:true}).waitFor();await page.waitForTimeout(60);assert.ok(await page.evaluate(()=>gsap.getTweensOf(document.querySelector('main.content')).length>0));
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>gsap.globalTimeline.getChildren().length),0);assert.equal(await page.locator('#main-content').evaluate(e=>e.style.opacity+e.style.transform),'');
  const motionCount=await page.evaluate(()=>qaMotion.length);await page.goto(base+'#/tasks');await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>qaMotion.length),motionCount);assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);checks.push('Reduced motion stops GSAP mid-transition and prevents new motion');
  await page.goto(base+'#/domestic/'+state.domesticBoms.find(b=>b.kind==='MODEL').id);await page.locator('[data-action=domestic-bom]').first().click();await page.locator('#dialog-form').waitFor();await page.waitForTimeout(100);
  await page.locator('#modal-root [data-action=close]').first().click();await page.locator('.modal').waitFor({state:'detached'});checks.push('Unchanged BOM closes without discard prompt');
  await page.locator('[data-action=domestic-bom]').first().click();await page.waitForTimeout(100);await page.locator('[data-action=domestic-remove-row]:visible').first().click();await page.keyboard.press('Escape');await page.getByRole('button',{name:'Keep editing',exact:true}).click();checks.push('Button-only BOM row removal is protected');
  await page.locator('#modal-root [data-action=close]').first().click();await page.getByRole('button',{name:'Discard changes',exact:true}).click();await page.locator('.modal').waitFor({state:'detached'});
  await page.goto(base+'#/domestic/items');await page.locator('[data-action=domestic-item][data-id]').first().click();await page.locator('[name=description]').fill('Unsaved identification description');
  const picture=page.locator('#modal-root [data-action=domestic-picture]').first();await picture.click();await page.locator('#domestic-inline-picture').waitFor();await page.keyboard.press('Escape');await page.locator('#domestic-inline-picture').waitFor({state:'detached'});assert.equal(await page.locator('.unsaved-notice').count(),0);assert.equal(await page.locator('[name=description]').inputValue(),'Unsaved identification description');checks.push('Nested picture Escape preserves the item edit');
  await page.locator('#modal-root [data-action=close]').first().click();await page.getByRole('button',{name:'Discard changes',exact:true}).click();await page.locator('.modal').waitFor({state:'detached'});
  await page.setViewportSize({width:720,height:700});await page.goto(base+'#/tasks');await page.locator('#main-content').waitFor();assert.ok(await page.getByLabel('Supplier',{exact:true}).isVisible());checks.push('Narrow viewport with accessible controls');
  const after=mode==='server'?JSON.stringify(store.read()):await page.evaluate(()=>localStorage.getItem('fh-purchase-alpha15-clean-schema7'));assert.equal(after,before);assert.deepEqual(errors,[]);report.push({mode,checks,errors,businessChanges:0});await page.close();
 }
 writeFileSync(dir+'/browser.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(e){for(const ctx of browser?.contexts()||[])for(const p of ctx.pages())await p.screenshot({path:dir+'/failure.png',fullPage:true});throw e;}finally{await browser?.close();await new Promise(r=>server.close(r));await new Promise(r=>review.close(r));store.close();}
