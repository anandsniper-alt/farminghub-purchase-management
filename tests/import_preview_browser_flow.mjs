// Isolated regression for live QA import errors and stale replacement previews.
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createSeed} from '../shared/seed.mjs';
import {Store} from '../server/store.mjs';
import {makeServer} from '../server/index.mjs';
const out=resolve(process.env.FH_TEST_OUTPUT_ROOT||'test-output','import-preview',new Date().toISOString().replace(/[:.]/g,'-'));mkdirSync(out,{recursive:true});
const seed=createSeed('2026-09-13'),store=new Store(join(out,'test.sqlite'),seed);store.addAccount('u-manager','qa-import@example.test','Isolated-Import-1234');const server=makeServer(store),report={checks:[],out};let browser;
const check=(name,pass)=>{report.checks.push({name,pass});console.log((pass?'PASS ':'FAIL ')+name);};
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const {chromium}=await import(pathToFileURL(resolve('test-output/ui-tools/node_modules/playwright/index.mjs')).href);browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 for(const mode of ['server','review']){
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();page.setDefaultTimeout(6000);
  const root=mode==='server'?'http://127.0.0.1:'+server.address().port:pathToFileURL(resolve('Farming_Hub_Purchase_Management_Clean_Review.html')).href;
  await page.goto(root+'#/shipments');if(mode==='server'){await page.getByLabel(/^Email/).fill('qa-import@example.test');await page.getByLabel(/^Password/).fill('Isolated-Import-1234');await page.getByRole('button',{name:'Sign in',exact:true}).click();}else{await page.evaluate(s=>{localStorage.setItem('fh-purchase-alpha15-clean-schema7',JSON.stringify(s));localStorage.setItem('fh-purchase-alpha15-clean-schema7-user','u-manager');},seed);await page.reload();}
  for(const kind of ['tracking','rate']){
   await page.locator('.tab[data-value='+(kind==='tracking'?'tracking':'rates')+']').click();await page.getByRole('button',{name:kind==='tracking'?'Upload weekly tracking Excel':'Upload weekly rate sheet',exact:true}).click();
   const input=page.locator('#'+kind+'-import-file'),submit=page.locator('#dialog-form button[type=submit]');
   const header=kind==='tracking'?'Ref,Status,ETA':'Port of Loading,Port of Discharge,Volume,O/F USD';const row=kind==='tracking'?'QA-REF,QA update,2026-10-22':'Ningbo,Chennai,1X40HC,3000';
   const upload=async(name,text)=>{await input.setInputFiles({name,mimeType:'text/csv',buffer:Buffer.from(text)});await page.waitForTimeout(150);};
   await page.locator('[name='+ (kind==='tracking'?'statusDate':'weekCode')+']').fill(kind==='tracking'?'2026-09-01':'QA custom week');
   await upload('valid.csv',header+'\n'+row);check(mode+' '+kind+' valid preview enables commit',await submit.isEnabled());
   check(mode+' '+kind+' retains report date/week',await page.locator('[name='+(kind==='tracking'?'statusDate':'weekCode')+']').inputValue()===(kind==='tracking'?'2026-09-01':'QA custom week'));
   await upload('invalid.csv','UNKNOWN,OTHER\na,b');check(mode+' '+kind+' failed replacement clears old file and disables commit',await submit.isDisabled()&&!(await page.locator('#dialog-form').innerText()).includes('Selected: valid.csv')&&(await page.locator('#modal-error').innerText()).includes('headings'));
   await upload('duplicates.csv',header+'\n'+row+'\n'+row);check(mode+' '+kind+' duplicate rows show actionable error and block commit',await submit.isDisabled()&&(await page.locator('#dialog-form').innerText()).includes('repeated in this file'));
   if(kind==='tracking'){await upload('missing-ref.csv',header+'\n,QA update,2026-10-22');check(mode+' missing Ref explanation visible',await submit.isDisabled()&&(await page.locator('#dialog-form').innerText()).includes('Forwarder Ref is required'));}
   await upload('empty.csv',header+'\n'+(kind==='tracking'?',,':',,,'));check(mode+' '+kind+' empty file cannot commit',await submit.isDisabled());
   await upload('recovered.csv',header+'\n'+row);check(mode+' '+kind+' valid replacement recovers',await submit.isEnabled());
   await page.evaluate(()=>{if(!window.qaOriginalFileText){window.qaOriginalFileText=File.prototype.text;File.prototype.text=async function(){if(this.name==='slow.csv')await new Promise(r=>setTimeout(r,600));return window.qaOriginalFileText.call(this);};}});
   await upload('slow.csv',header+'\n'+row);check(mode+' '+kind+' reading replacement disables commit immediately',await submit.isDisabled());await upload('newest.csv',header+'\n'+row);await page.waitForTimeout(700);check(mode+' '+kind+' old read cannot replace latest file',(await page.locator('#dialog-form').innerText()).includes('Selected: newest.csv'));
   await upload('slow.csv',header+'\n'+row);await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.waitForTimeout(700);check(mode+' '+kind+' closed dialog stays closed after late read',await page.getByRole('dialog').count()===0);await page.screenshot({path:join(out,mode+'-'+kind+'.png'),fullPage:true});
  }await context.close();
 }
}catch(e){report.failure=String(e.stack||e);}finally{await browser?.close();await new Promise(r=>server.close(r));store.close();report.status=report.failure||report.checks.some(c=>!c.pass)?'FAIL':'PASS';writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2));console.log(report.status+' '+out);if(report.failure)console.error(report.failure);if(report.status==='FAIL')process.exitCode=1;}
