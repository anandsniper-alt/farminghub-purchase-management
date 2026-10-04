import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {Store} from '../server/store.mjs';
import {emptyState,makeServer} from '../server/index.mjs';
import {RoCostingStore} from '../server/ro-costing-store.mjs';
import {validateRoRecord} from '../shared/ro-costing.mjs';

const out=resolve('test-output/ro-costing/browser');mkdirSync(out,{recursive:true});
const {chromium}=await import(pathToFileURL(process.env.FH_PLAYWRIGHT_MODULE).href);
const referenceSide={rate:99.123456789,totalInr:null,goodsUsd:100,basis:'Synthetic accepted pooled reference; actual payments remain independent.',formula:'=(D28-D21)/G18',rows:[{label:'Synthetic source GST deduction',value:-18,unit:'INR',cell:'D21',formula:'=D19*18%',basis:'Original cached source value'},{label:'Missing expense',value:null,unit:'INR',cell:'D22',formula:'',basis:'Source missing'}]};
const comparison={version:1,status:'Historical reference',basis:'Synthetic reference only',reviewedOn:'2026-10-04',source:'Synthetic worksheet audit',selectedWorkingIds:['test-working'],ai:referenceSide,suresh:{...referenceSide,rate:101.987654321},workings:[{id:'test-working',invoice:'CI-TEST',supplier:'Test supplier',status:'Historical reference',source:{file:'synthetic-'+ 'x'.repeat(160)+'.xlsx',sheet:'Source sheet',sha256:'a'.repeat(64)},ai:referenceSide,suresh:referenceSide}]};
const state=emptyState(),fixture=validateRoRecord({ro:'RO-TEST-A',supplier:'Test supplier',invoices:[{supplier:'Test supplier',invoice:'CI-TEST',currency:'USD',goods:100,extras:0,face:100}],actuals:{},worksheetComparison:comparison});
const store=new Store(join(mkdtempSync(join(tmpdir(),'fh-ro-browser-')),'test.sqlite'),state),module=new RoCostingStore(store);
store.addAccount('admin','review@example.test','Isolated-browser-test-password');module.import('admin',{records:[{record:fixture,expectedRevision:0}],reason:'Isolated test fixture'});
const evidence=Buffer.from('%PDF-1.4\nSynthetic isolated invoice'),evidenceHash=createHash('sha256').update(evidence).digest('hex');
const localDocument=module.upload('admin',{ro:fixture.ro,name:'synthetic-commercial-invoice.pdf',kind:'Commercial invoice',base64:evidence.toString('base64'),sha256:evidenceHash});
module.linkDriveDocument('admin',{ro:fixture.ro,name:'synthetic-commercial-invoice.pdf',kind:'Commercial invoice',driveUrl:'https://drive.google.com/file/d/syntheticFileId12345/view',sha256:evidenceHash,bytes:evidence.length,reason:'Synthetic private reference only'});
module.saveSourceLibrary('admin',{name:'Synthetic costing learnings',driveUrl:'https://drive.google.com/drive/folders/syntheticFolderId12345',reason:'Synthetic private reference only',expectedSequence:0});
const driveFiles=module.documents('admin',fixture.ro).rows,sourceLibrary=module.sourceLibrary('admin');
const baseline=JSON.stringify(store.read()),server=makeServer(store,{log:()=>{}}),review=createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(readFileSync('Farming_Hub_Purchase_Management_Clean_Review.html'));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));await new Promise(r=>review.listen(0,'127.0.0.1',r));
let browser;const report=[];
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 for(const [mode,srv] of [['server',server],['review',review]]){
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
  if(mode==='review')await page.addInitScript(({state,fixture,driveFiles,sourceLibrary})=>{const key='fh-ro-browser-isolated';window.FH_REVIEW_STORE=key;window.FH_RO_REVIEW_DOCUMENTS={[fixture.ro]:driveFiles};window.FH_RO_SOURCE_LIBRARY=sourceLibrary;localStorage.setItem(key,JSON.stringify(state));localStorage.setItem(key+'-user','admin');localStorage.setItem(key+':ro-costings:admin',JSON.stringify({[fixture.ro]:{record:fixture,revision:1}}));}, {state,fixture,driveFiles,sourceLibrary});
  const base='http://127.0.0.1:'+srv.address().port;
  await page.goto(base+'/#/ro-costings');
  if(mode==='server'){await page.getByLabel('Email').fill('review@example.test');await page.getByLabel('Password').fill('Isolated-browser-test-password');await page.locator('#login-form [type=submit]').click();}
  await page.getByRole('link',{name:'RO-TEST-A',exact:true}).waitFor();
  assert.equal(await page.getByRole('link',{name:'Open source library in Google Drive',exact:true}).getAttribute('href'),sourceLibrary.driveUrl);
  assert.match(await page.locator('main').innerText(),/99\.1235/);assert.match(await page.locator('main').innerText(),/101\.9877/);
  await page.getByRole('link',{name:'RO-TEST-A',exact:true}).click();
  const driveLink=page.locator('#ro-important-documents').getByRole('link',{name:'Open in Google Drive',exact:true}).first();
  assert.equal(await driveLink.getAttribute('href'),'https://drive.google.com/file/d/syntheticFileId12345/view');assert.equal(await driveLink.getAttribute('rel'),'noopener noreferrer');
  assert.equal(await page.locator('#ro-important-documents .table-wrap').first().locator('tbody tr').count(),1);
  assert.equal(await page.locator('#ro-important-documents').getByRole('link',{name:'View PDF',exact:true}).getAttribute('href'),(mode==='review'?'/__ro-review/files/':'/api/ro-costings/files/')+localDocument.id+'?view=1');
  const sourceDisclosure=page.locator('summary').filter({hasText:'CI-TEST · Test supplier'});await sourceDisclosure.focus();await page.keyboard.press('Enter');
  assert.equal(await sourceDisclosure.evaluate(el=>el.parentElement.open),true);assert.match(await page.locator('main').innerText(),/Suresh original workings/);assert.match(await page.locator('main').innerText(),/=D19\*18%/);
  await page.getByRole('button',{name:'Edit workings',exact:true}).click();
  assert.equal(await page.locator('[name=ro]').inputValue(),'RO-TEST-A');
  await page.getByRole('button',{name:'Add supplier invoice',exact:true}).click();await page.keyboard.press('Escape');await page.getByRole('button',{name:'Keep editing',exact:true}).click();assert.equal(await page.locator('[data-ro-invoice]').count(),2);
  await page.locator('#modal-root [data-action=close]').first().click();await page.getByRole('button',{name:'Discard changes',exact:true}).click();await page.locator('.modal').waitFor({state:'detached'});
  await page.getByRole('button',{name:'Edit workings',exact:true}).click();await page.locator('[name=supplierInr]').fill('9000');for(const key of ['bankNet','forwarderNet','otherNet','bcd','sws'])await page.locator('[name='+key+']').fill('0');
  await page.locator('[name=expenseCoverage]').selectOption('Complete');await page.locator('[name=currencyConfirmed]').check();await page.locator('[name=confirmation]').fill('Isolated test: actual payment and explicit nil expenses verified.');await page.locator('[name=reason]').fill('Verify complete-cost save.');await page.getByRole('button',{name:'Save workings',exact:true}).click();await page.locator('.modal').waitFor({state:'detached'});await page.locator('.arrival-results').filter({hasText:'Verified actual AI INR / USD'}).waitFor();
  assert.match(await page.locator('.arrival-results').filter({hasText:'Verified actual AI INR / USD'}).innerText(),/90\.00/);assert.match(await page.locator('main').innerText(),/Complete/);
  assert.match(await page.locator('main').innerText(),/99\.1235/);assert.match(await page.locator('main').innerText(),/101\.9877/);
  await page.screenshot({path:join(out,mode+'-desktop.png'),fullPage:true});await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:join(out,mode+'-mobile.png'),fullPage:true});
  await page.getByRole('button',{name:'Edit workings',exact:true}).click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.keyboard.press('Escape');await page.locator('.modal').waitFor({state:'detached'});
  await page.setViewportSize({width:320,height:700});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)){await page.screenshot({path:join(out,mode+'-320-overflow.png'),fullPage:true});console.log(await page.evaluate(()=>Array.from(document.querySelectorAll('body *')).filter(el=>el.getBoundingClientRect().right>innerWidth&&!el.closest('.table-wrap')&&!el.closest('.sidebar')).map(el=>({tag:el.tagName,cls:el.className,right:el.getBoundingClientRect().right,text:el.textContent.slice(0,150)}))));}assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.getByRole('button',{name:'All RO costings',exact:true}).click();await page.getByRole('link',{name:'RO-TEST-A',exact:true}).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);report.push({mode,checks:['RO route and accessible controls','protected essential Drive reference and source-library links','independent worksheet AI/Suresh references retained through actual save','keyboard source disclosure and original formulas','invoice row changes protected','actual costing saved with currency confirmation','blank-to-explicit-zero handling','390px page and modal fit','320px detail and register fit','reduced motion','no browser errors'],errors});await page.close();
 }
 assert.equal(JSON.stringify(store.read()),baseline);
 // Read-only screenshots of the user's locally imported data, never synthetic edits.
 if(process.env.FH_RO_IMPORT_EMAIL){const page=await browser.newPage({viewport:{width:1440,height:1000}});await page.goto('http://127.0.0.1:8878/#/ro-costings');await page.getByLabel('Email').fill(process.env.FH_RO_IMPORT_EMAIL);await page.getByLabel('Password').fill(process.env.FH_RO_IMPORT_PASSWORD);await page.locator('#login-form [type=submit]').click();await page.getByRole('link',{name:'1547',exact:true}).waitFor();assert.match(await page.locator('main').innerText(),/30 RO records/);await page.screenshot({path:join(out,'actual-ro-list.png'),fullPage:true});await page.getByRole('link',{name:'1547',exact:true}).click();await page.getByRole('button',{name:'Edit workings',exact:true}).waitFor();await page.screenshot({path:join(out,'actual-ro-1547.png'),fullPage:true});await page.close();}
 writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser?.close();await new Promise(r=>server.close(r));await new Promise(r=>review.close(r));store.close();}
