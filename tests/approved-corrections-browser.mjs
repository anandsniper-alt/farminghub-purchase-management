/** Synthetic browser acceptance only. Never reads .env, credentials or operational data. */
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createServer} from 'node:http';
import {Store} from '../server/store.mjs';
import {makeServer} from '../server/index.mjs';
import {createSeed} from '../shared/seed.mjs';
import {loadingPdf,loadingSnapshot} from '../web/container-export.mjs';
import {solvePacking,PACKING_PRESETS} from '../shared/container-packing.mjs';

const mode=process.env.FH_BROWSER_MODE||'server';assert.ok(['server','review'].includes(mode));
const nodeModules=process.env.FH_PLAYWRIGHT_MODULE||'C:/Users/Designers 4/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const {chromium}=await import(pathToFileURL(resolve(nodeModules)).href);
mkdirSync('test-output',{recursive:true});const dir=mkdtempSync(resolve('test-output/approved-ui-'));
const seed=createSeed('2026-10-15'),originalOrders=structuredClone(seed.orders),password='Synthetic-correction-browser-1234';
// The historical sample seed predates explicit prefixes; supply its documented brand mapping in the isolated fixture.
for(const item of seed.items.filter(i=>i.baseId))item.brandPrefix ||= seed.brands.find(b=>b.name===item.brand)?.prefix;
const store=new Store(join(dir,'synthetic.sqlite'),seed);store.addAccount('u-admin','approved-ui@example.test',password);
const application=makeServer(store,{log:()=>{}}),hook='window.__correctionUI={context:()=>({state,user,ui}),showDialog,onInput,onChange,onClick,onSubmit,closeModal,previewAttachment,printPO,ciPaymentsUI};\n';
const anchor="start().catch(e=>{$('#app')";
const instrument=source=>{assert.equal(source.split(anchor).length,2,'Unique isolated app hook');return source.replace(anchor,hook+anchor);};
const server=createServer((req,res)=>{
 if(req.url==='/app.mjs'){res.setHeader('Content-Type','text/javascript');return res.end(instrument(readFileSync('web/app.mjs','utf8')));}
 if(req.url==='/__approved_review.html'){res.setHeader('Content-Type','text/html');return res.end(instrument(readFileSync(process.env.FH_REVIEW_HTML||'Farming_Hub_Purchase_Management_Clean_Review.html','utf8')));}
 if(req.url==='/__po_form_checks.mjs'){res.setHeader('Content-Type','text/javascript');return res.end(readFileSync('tests/po-form.browser.mjs'));}
 application.emit('request',req,res);
});
const report={mode,checks:[],errors:[],environment:'Isolated synthetic SQLite and browser review storage'};
let browser,context,page;const check=(label,value=true)=>{assert.ok(value,label);report.checks.push(label);console.log('PASS '+mode+' '+label);};
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:process.env.FH_BROWSER_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>report.errors.push(e.message));
 const requests=[];page.on('request',r=>requests.push(new URL(r.url()).pathname));
 const url=origin+(mode==='review'?'/__approved_review.html':'/');await page.goto(url+'#/orders');
 if(mode==='server'){await page.getByLabel(/^Email/).fill('approved-ui@example.test');await page.getByLabel(/^Password/).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();}
 else{await page.evaluate(s=>{localStorage.setItem('fh-purchase-alpha15-clean-schema7',JSON.stringify(s));localStorage.setItem('fh-purchase-alpha15-clean-schema7-user','u-admin');},seed);await page.reload();}
 await page.waitForFunction(()=>window.__correctionUI?.context().state);
 check('new heavy preview/report modules are absent from initial network requests',!requests.some(p=>/\/(file-preview|xlsx-preview|loading-report)\.mjs|\/vendor\/pdfjs\//.test(p)));
 check('review environment marker follows actual mode',mode==='review'?await page.getByText('Browser review workspace',{exact:false}).count()>0:await page.getByText('Local test / review environment',{exact:false}).count()===0);
 for(const view of ['stock-aging','current-stock-costing','order-management']){await page.goto(url+'#/'+view);check('preserved '+view+' route renders',await page.locator('.content').innerText().then(t=>!t.includes('Workspace could not start')&&!t.includes('Module unavailable')));}
 const order=seed.orders.find(o=>o.revisions.length);
 await page.goto(url+'#/order/'+order.id);await page.locator('.order-journey').waitFor();check('separate payment and shipment journey remains visible',await page.getByRole('heading',{name:'Payment & shipment progress'}).isVisible());
 await page.evaluate(id=>window.__correctionUI.showDialog('document',{id,docType:'COMMERCIAL_INVOICE'}),order.id);
 const form=page.locator('#dialog-form'),toggle=form.locator('[name=ciSettlementEnabled]');
 if(await toggle.count()){
  check('ordinary CI evidence does not silently select settlement',!await toggle.isChecked()&&await form.locator('[name=ciAmount]').isDisabled()&&!await form.locator('[name=ciAmount]').evaluate(e=>e.required)&&!await form.locator('[name=shipmentId]').evaluate(e=>e.required));
  await toggle.check();check('explicit CI opt-in enables value and agreed terms',await form.locator('[name=ciAmount]').isEnabled()&&await form.locator('[name=ciAmount]').evaluate(e=>e.required)&&await form.locator('[name=shipmentId]').evaluate(e=>e.required));
  await toggle.uncheck();check('clearing opt-in restores evidence-only upload',await form.locator('[name=ciAmount]').isDisabled()&&await form.getByRole('button',{name:'Save document',exact:true}).isVisible());
 }
 await page.evaluate(()=>window.__correctionUI.closeModal());
 await page.evaluate(id=>{const o=window.__correctionUI.context().state.orders.find(o=>o.id===id);window.__ciOriginal={id,commercialInvoices:o.commercialInvoices,ciPaymentPolicy:o.ciPaymentPolicy,shipments:o.shipments};if(!o.shipments.length)o.shipments=[{id:'synthetic-ci-shipment',number:'SYNTHETIC',status:'PLANNED',lines:[]}];o.ciPaymentPolicy={version:1,rule:'FINAL_BL',days:0};o.commercialInvoices=[{id:'synthetic-ci',number:'EXIST-CI',shipmentId:o.shipments[0].id,date:'2026-10-15',status:'APPROVED',amountMinor:100,advanceApplications:[]}];window.__correctionUI.showDialog('document',{id,docType:'COMMERCIAL_INVOICE'});},order.id);
 await page.locator('#dialog-form [name=invoiceNumber]').fill(' exist - ci ');await page.locator('#dialog-form [name=shipmentId]').selectOption({index:1});await page.locator('#dialog-form [name=invoiceDate]').fill('2026-10-15');
 check('additional CI evidence keeps value, advance and payments unchanged',await page.locator('[data-ci-existing-note]').isVisible()&&await page.locator('[name=ciAmount]').isDisabled()&&await page.evaluate(()=>window.__correctionUI.ciPaymentsUI.uploadPayload(window.__correctionUI.context().state.orders.find(o=>o.id===window.__ciOriginal.id),Object.fromEntries(new FormData(document.getElementById('dialog-form'))))===undefined));
 await page.evaluate(()=>{window.__correctionUI.closeModal();Object.assign(window.__correctionUI.context().state.orders.find(o=>o.id===window.__ciOriginal.id),window.__ciOriginal);delete window.__ciOriginal;});
 await page.evaluate(()=>window.__correctionUI.showDialog('new-order'));
 const field=n=>page.locator('#dialog-form [name="'+n+'"]');await field('priceListCurrency').selectOption('CNY');await field('currency').selectOption('USD');await field('priceListFxRate').fill('0.15');
 check('unusual manual rate displays a nonblocking direction advisory',await page.locator('[data-po-fx-review]').isVisible()&&await page.locator('[data-po-fx-review]').innerText().then(t=>t.includes('1 USD = 0.15')&&t.includes('does not prevent saving')));
 await field('priceListFxRate').fill('6.78');check('advisory clears without changing entered rate',!await page.locator('[data-po-fx-review]').isVisible()&&await field('priceListFxRate').inputValue()==='6.78');
 await page.evaluate(()=>window.__correctionUI.closeModal());
 const results=await page.evaluate(async()=>{const {runPoFormChecks}=await import('/__po_form_checks.mjs');return runPoFormChecks(window.__correctionUI);});
 for(const result of results)check(result);
 await page.evaluate(()=>window.__correctionUI.closeModal());
 for(const [name,text,type]of [['preview.csv','Item,Value\n"<script>",=1+1','text/csv'],['preview.txt','<img src=x onerror=alert(1)>','text/plain']]){
  await page.evaluate(({name,text,type})=>window.__correctionUI.previewAttachment({name,load:async()=>new Blob([text],{type})}),{name,text,type});
  check(name+' preview renders literal evidence and keeps separate download',await page.locator('dialog.fh-file-preview').isVisible()&&await page.locator('dialog.fh-file-preview [data-download]').isEnabled()&&await page.locator('.fh-file-body').innerText().then(t=>t.includes(name.endsWith('csv')?'=1+1':'<img'))&&await page.locator('.fh-file-body script,.fh-file-body img').count()===0);
  await page.keyboard.press('Escape');await page.locator('dialog.fh-file-preview').waitFor({state:'detached'});
 }
 await page.evaluate(async()=>{const zip=new JSZip();zip.file('xl/workbook.xml','<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheets><sheet name="Review" sheetId="1" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="r1"/></sheets></workbook>');zip.file('xl/_rels/workbook.xml.rels','<Relationships><Relationship Id="r1" Target="worksheets/sheet1.xml"/></Relationships>');zip.file('xl/worksheets/sheet1.xml','<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Saved worksheet value</t></is></c></row></sheetData></worksheet>');const blob=await zip.generateAsync({type:'blob'});await window.__correctionUI.previewAttachment({name:'preview.xlsx',load:async()=>blob});});
 await page.getByRole('table',{name:'Worksheet content'}).waitFor();check('XLSX viewer loads on demand and shows cached content',await page.locator('.fh-xlsx-sheet').innerText().then(t=>t.includes('Saved worksheet value')));await page.keyboard.press('Escape');
 await page.evaluate(async()=>{const zip=new JSZip();zip.file('word/document.xml','<document xmlns="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><body><p><r><t>Saved Word content</t></r></p></body></document>');const blob=await zip.generateAsync({type:'blob'});await window.__correctionUI.previewAttachment({name:'preview.docx',load:async()=>blob});});
 check('DOCX preview shows read-only text',await page.locator('.fh-file-word').innerText().then(t=>t.includes('Saved Word content')));await page.keyboard.press('Escape');
 await page.evaluate(()=>{const bytes=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jP1cAAAAASUVORK5CYII='),c=>c.charCodeAt(0));return window.__correctionUI.previewAttachment({name:'preview.png',load:async()=>new Blob([bytes],{type:'image/png'})});});
 await page.locator('.fh-file-image').waitFor();await page.waitForFunction(()=>document.querySelector('.fh-file-image')?.complete);check('bounded image evidence previews successfully',await page.locator('.fh-file-image').evaluate(e=>e.complete&&e.naturalWidth===1));await page.keyboard.press('Escape');
 await page.evaluate(()=>{const b=new Uint8Array(33),v=new DataView(b.buffer);b.set([137,80,78,71,13,10,26,10]);v.setUint32(8,13);b.set([73,72,68,82],12);v.setUint32(16,100000);v.setUint32(20,100000);return window.__correctionUI.previewAttachment({name:'oversized.png',load:async()=>new Blob([b],{type:'image/png'})});});
 check('oversized decoded image is rejected before src assignment while download stays available',await page.locator('.fh-file-body').innerText().then(t=>t.includes('dimensions exceed'))&&await page.locator('.fh-file-body img').count()===0&&await page.locator('[data-download]').isEnabled());await page.keyboard.press('Escape');
 const pdfReport=loadingSnapshot({reference:'SYNTHETIC-PDF'},solvePacking(PACKING_PRESETS[0],[{id:'part',code:'SYNTHETIC',po:'SYNTHETIC',quantity:1,unitsPerPackage:1,length:100,width:100,height:100,weight:1,rotation:'FIXED',maxLayers:1,topLoad:0}]));
 const pdf=Buffer.from(await loadingPdf(pdfReport)).toString('base64');await page.evaluate(base64=>window.__correctionUI.previewAttachment({name:'preview.pdf',load:async()=>new Blob([Uint8Array.from(atob(base64),c=>c.charCodeAt(0))],{type:'application/pdf'})}),pdf);
 await page.locator('.fh-file-body canvas').waitFor();check('PDF preview loads its local worker on demand and bounds the rendered canvas',await page.locator('.fh-file-body canvas').evaluate(e=>e.width>0&&e.height>0&&e.width<=4096&&e.height<=4096&&e.width*e.height<8.1e6));await page.keyboard.press('Escape');
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.__correctionUI.showDialog('new-order'));check('mobile dialog stays inside viewport',await page.locator('.modal').evaluate(e=>e.getBoundingClientRect().right<=innerWidth+1&&e.getBoundingClientRect().left>=0));await page.screenshot({path:join(dir,mode+'-mobile.png')});
 if(mode==='server')check('original operational-style synthetic orders stay unchanged',JSON.stringify(store.read().orders.slice(0,originalOrders.length))===JSON.stringify(originalOrders));
 check('no browser runtime errors',report.errors.length===0);
}catch(error){report.failure=error.stack;await page?.screenshot({path:join(dir,'failure.png')}).catch(()=>{});throw error;}
finally{writeFileSync(join(dir,'report.json'),JSON.stringify(report,null,2));await context?.close();await browser?.close();await new Promise(r=>server.close(r));store.close();console.log('Report '+dir);}
