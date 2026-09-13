// Isolated browser regression for the live mascot/pagination pointer obstruction.
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createSeed} from '../shared/seed.mjs';
import {Store} from '../server/store.mjs';
import {makeServer} from '../server/index.mjs';
const out=resolve(process.env.FH_TEST_OUTPUT_ROOT||'test-output','mascot-pagination',new Date().toISOString().replace(/[:.]/g,'-'));mkdirSync(out,{recursive:true});
const seed=createSeed('2026-09-13'),base=seed.bases[0];
seed.bases=Array.from({length:31},(_,i)=>({...structuredClone(base),id:'qa-page-'+i,code:'QAPAGE'+i}));seed.orders=[];
const store=new Store(join(out,'test.sqlite'),seed);store.addAccount('u-manager','qa-pagination@example.test','Isolated-Pagination-1234');const server=makeServer(store);
const report={checks:[],out};let browser;
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const {chromium}=await import(pathToFileURL(resolve('test-output/ui-tools/node_modules/playwright/index.mjs')).href);
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 for(const mode of ['server','review']){
  const context=await browser.newContext(),page=await context.newPage();page.setDefaultTimeout(5000);
  const root=mode==='server'?'http://127.0.0.1:'+server.address().port:pathToFileURL(resolve('Farming_Hub_Purchase_Management_Clean_Review.html')).href;
  await page.goto(root+'#/items');
  if(mode==='server'){await page.getByLabel(/^Email/).fill('qa-pagination@example.test');await page.getByLabel(/^Password/).fill('Isolated-Pagination-1234');await page.getByRole('button',{name:'Sign in',exact:true}).click();}
  else{await page.evaluate(s=>{localStorage.setItem('fh-purchase-alpha15-clean-schema7',JSON.stringify(s));localStorage.setItem('fh-purchase-alpha15-clean-schema7-user','u-manager');},seed);await page.reload();}
  for(const theme of ['current','minimal'])for(const width of [1440,390]){
   await page.setViewportSize({width,height:width===390?844:1000});await page.locator('[data-theme='+theme+']').click();await page.goto(root+'#/items');await page.locator('.tab[data-value=bases]').click();
   const name=mode+' '+theme+' '+width;let failure;
   try{await page.locator('.pagination').getByRole('button',{name:'Next',exact:true}).click({timeout:2500});await page.locator('.pagination').filter({hasText:'16–30 of 31'}).waitFor();await page.locator('.pagination').getByRole('button',{name:'Previous',exact:true}).click({timeout:2500});await page.locator('.pagination').filter({hasText:'1–15 of 31'}).waitFor();}catch(e){failure=e.message;}
   const dock=await page.locator('.support-dock').isVisible();report.checks.push({name,pass:!failure&&dock,failure});console.log((failure?'FAIL ':'PASS ')+name);await page.screenshot({path:join(out,mode+'-'+theme+'-'+width+'.png'),fullPage:true});
  }
  await context.close();
 }
}catch(e){report.failure=String(e.stack||e);}
finally{await browser?.close();await new Promise(r=>server.close(r));store.close();report.status=report.failure||report.checks.some(c=>!c.pass)?'FAIL':'PASS';writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2));console.log(report.status+' '+out);if(report.status==='FAIL')process.exitCode=1;}
