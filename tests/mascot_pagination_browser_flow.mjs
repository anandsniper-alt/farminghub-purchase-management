// Isolated browser regression for the live mascot/pagination pointer obstruction.
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createSeed} from '../shared/seed.mjs';
import {Store} from '../server/store.mjs';
import {makeServer} from '../server/index.mjs';
import assert from 'node:assert/strict';
const out=resolve(process.env.FH_TEST_OUTPUT_ROOT||'test-output','mascot-pagination',new Date().toISOString().replace(/[:.]/g,'-'));mkdirSync(out,{recursive:true});
const seed=createSeed('2026-09-13'),base=seed.bases[0];
seed.bases=Array.from({length:31},(_,i)=>({...structuredClone(base),id:'qa-page-'+i,code:'QAPAGE'+i}));seed.orders=[];
const store=new Store(join(out,'test.sqlite'),seed);store.addAccount('u-manager','qa-pagination@example.test','Isolated-Pagination-1234');const server=makeServer(store);
const report={checks:[],out};let browser;
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const {chromium}=await import(pathToFileURL(resolve('test-output/ui-tools/node_modules/playwright/index.mjs')).href);
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 for(const mode of ['server','review']){
  const context=await browser.newContext({hasTouch:true,isMobile:true}),page=await context.newPage();page.setDefaultTimeout(5000);
  const root=mode==='server'?'http://127.0.0.1:'+server.address().port:pathToFileURL(resolve('Farming_Hub_Purchase_Management_Clean_Review.html')).href;
  await page.goto(root+'#/items');
  if(mode==='server'){await page.getByLabel(/^Email/).fill('qa-pagination@example.test');await page.getByLabel(/^Password/).fill('Isolated-Pagination-1234');await page.getByRole('button',{name:'Sign in',exact:true}).click();}
  else{await page.evaluate(s=>{localStorage.setItem('fh-purchase-alpha15-clean-schema7',JSON.stringify(s));localStorage.setItem('fh-purchase-alpha15-clean-schema7-user','u-manager');},seed);await page.reload();}
  for(const theme of ['current','minimal'])for(const width of [1440,390]){
   await page.setViewportSize({width,height:width===390?844:1000});await page.locator('[data-theme='+theme+']').click();await page.goto(root+'#/items');await page.locator('.tab[data-value=bases]').click();
   const name=mode+' '+theme+' '+width;let failure;
   try{await page.locator('.pagination').getByRole('button',{name:'Next',exact:true}).click({timeout:2500});await page.locator('.pagination').filter({hasText:'16–30 of 31'}).waitFor();await page.locator('.pagination').getByRole('button',{name:'Previous',exact:true}).click({timeout:2500});await page.locator('.pagination').filter({hasText:'1–15 of 31'}).waitFor();}catch(e){failure=e.message;}
   const dock=await page.locator('.support-dock').isVisible();report.checks.push({name,pass:!failure&&dock,failure});console.log((failure?'FAIL ':'PASS ')+name);await page.screenshot({path:join(out,mode+'-'+theme+'-'+width+'.png'),fullPage:true});
   const launcher=page.locator('.support-launcher'),pill=page.locator('.support-dock'),tour=page.locator('.support-tour');
   const verify=async(label,run)=>{await run();report.checks.push({name:name+' '+label,pass:true});};
   await verify('horizontal drag snaps left without opening guide',async()=>{
    await launcher.focus();await page.keyboard.press('ArrowRight');const start=await pill.boundingBox();
    await page.mouse.move(start.x+start.width/2,start.y+start.height/2);await page.mouse.down();
    await page.mouse.move(30,start.y-120,{steps:12});const moving=await pill.boundingBox();assert.equal(moving.y,start.y);
    await page.mouse.up();assert.equal(await pill.getAttribute('data-side'),'left');assert.equal(await tour.isVisible(),false);
    assert.ok((await pill.boundingBox()).x<=20);
   });
   await verify('left preference survives reload and guide top layer',async()=>{
    await page.reload();await launcher.waitFor();assert.equal(await pill.getAttribute('data-side'),'left');
    await launcher.click();await tour.waitFor();assert.equal(await pill.getAttribute('data-side'),'left');
    await launcher.click();await tour.waitFor({state:'hidden'});assert.equal(await pill.getAttribute('data-side'),'left');
   });
   await verify('keyboard switches corners and still opens guide',async()=>{
    await launcher.focus();await page.keyboard.press('ArrowRight');assert.equal(await pill.getAttribute('data-side'),'right');
    await page.keyboard.press('Enter');await tour.waitFor();await page.keyboard.press('Escape');await tour.waitFor({state:'hidden'});
    await launcher.focus();await page.keyboard.press('ArrowLeft');assert.equal(await pill.getAttribute('data-side'),'left');
   });
   await verify('touch swipe right snaps and tap opens guide',async()=>{
    await launcher.tap();await tour.waitFor();await page.getByRole('button',{name:'Close guide',exact:true}).tap();await tour.waitFor({state:'hidden'});
    const cdp=await context.newCDPSession(page),r=await pill.boundingBox(),y=r.y+r.height/2;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y,id:1,force:1}]});
    for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:r.x+r.width/2+(width-25-r.x-r.width/2)*i/8,y,id:1,force:1}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert.equal(await pill.getAttribute('data-side'),'right');assert.equal(await tour.isVisible(),false);
    // Chromium suppresses taps briefly after a target moves under a touch gesture.
    await page.waitForTimeout(2100);await launcher.tap();await tour.waitFor();await page.getByRole('button',{name:'Close guide',exact:true}).tap();await tour.waitFor({state:'hidden'});await cdp.detach();
   });
   await verify('narrow resize retains corner within viewport',async()=>{
    await page.setViewportSize({width:320,height:640});const r=await pill.boundingBox();assert.ok(r.x>=0&&r.x+r.width<=320);assert.ok(r.y>=0&&r.y+r.height<=640);
    await page.setViewportSize({width,height:width===390?844:1000});
   });
  }
  await context.close();
 }
}catch(e){report.failure=String(e.stack||e);}
finally{await browser?.close();await new Promise(r=>server.close(r));store.close();report.status=report.failure||report.checks.some(c=>!c.pass)?'FAIL':'PASS';writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2));console.log(report.status+' '+out);if(report.status==='FAIL')process.exitCode=1;}
