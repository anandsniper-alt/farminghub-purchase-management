/** Synthetic planner/import browser checks. No environment file or production writes. */
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Store} from '../server/store.mjs';
import {makeServer} from '../server/index.mjs';
import {createSeed} from '../shared/seed.mjs';
import {execute} from '../shared/domain.mjs';

const {chromium}=await import(pathToFileURL(resolve(process.env.FH_PLAYWRIGHT_MODULE||'test-output/ui-tools/node_modules/playwright/index.mjs')).href);
const mode=process.env.FH_BROWSER_MODE||'server';
assert.ok(['server','review'].includes(mode));
const dir=mkdtempSync(join(tmpdir(),'fh-container-browser-')),password='Synthetic-container-password';
let seed=createSeed('2026-09-11');seed.orders=seed.orders.slice(0,1);seed.payments=[];
const o=seed.orders[0];o.pi.status='APPROVED';o.productionStartedAt='2026-09-01';o.shipments=[];o.manualClosed=false;
let id=0;
seed=execute(seed,{type:'PLAN_LOADING',payload:{loadingMode:'SINGLE_ORDER',vendorId:o.vendorId,orderId:o.id,etd:'2026-10-15',eta:'2026-10-30',origin:'CHINA',destination:'CHENNAI',containerType:'20GP',remarks:'Synthetic packing test',orders:[{orderId:o.id,lines:[{lineId:o.lines[0].id,quantity:8}]}]}},seed.users.find(u=>u.role==='MANAGER'),{now:'2026-10-12T12:00:00Z',id:()=>`packing-${++id}`}).state;
const store=new Store(join(dir,'test.sqlite'),seed);store.addAccount('u-admin','container@example.test',password);
const before=JSON.stringify(store.read()),server=makeServer(store,{log:()=>{}});
let browser,context,page,origin;const errors=[],writes=[];
const check=(label,condition)=>{assert.ok(condition,label);console.log('PASS '+mode+' '+label);};
const openImport=async()=>{await page.locator('[data-cp=import]').click();return page.locator('dialog.cp-import');};
const file=async(dialog,text,name='packing.csv')=>dialog.locator('[data-pi-file]').setInputFiles({name,mimeType:'text/csv',buffer:Buffer.from(text)});
const code=seed.orders[0].lines[0].code,po=seed.orders[0].number;
const csv=dimensions=>['Item code,PO number,Product quantity,Package count,Units per package,Length mm,Width mm,Height mm,Gross kg per package,Total line CBM',[code,po,8,4,2,...dimensions].join(',')].join('\n');
try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${server.address().port}/`;
 browser=await chromium.launch({headless:true,executablePath:process.env.FH_BROWSER_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 context=await browser.newContext({viewport:{width:1440,height:1000}});page=await context.newPage();page.setDefaultTimeout(15000);
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()==='POST'&&/\/api\/(commands|files)/.test(r.url()))writes.push(r.url());});
 if(mode==='server'){
  await page.goto(origin+'#/loading');await page.getByLabel(/^Email/).fill('container@example.test');await page.getByLabel(/^Password/).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();
 }else{
  origin=pathToFileURL(resolve('Farming_Hub_Purchase_Management_Clean_Review.html')).href;
  await page.goto(origin+'#/loading');await page.evaluate(s=>{localStorage.setItem('fh-purchase-alpha15-clean-schema7',JSON.stringify(s));localStorage.setItem('fh-purchase-alpha15-clean-schema7-user','u-admin');},seed);await page.reload();
 }
 await page.getByRole('link',{name:'3D load planner',exact:true}).first().click();await page.locator('#container-planner').waitFor();
 check('saved loading identity opens a linked planning scenario',await page.locator('.cp-items tbody tr').count()===1&&await page.locator('.cp-items tbody tr td').nth(1).textContent()==='8');
 await page.locator('[data-cp=calculate]').click();await page.locator('[data-cp-results] table').waitFor();
 check('missing measurements preserve all eight units as pending',await page.locator('[data-cp-results]').innerText().then(t=>t.includes('8')&&t.includes('length needed')));
 let dialog=await openImport();
 await file(dialog,csv([1000,1000,500,10,2]));await dialog.locator('[data-pi-select]').waitFor();await dialog.locator('[data-pi-select]').check();
 // A same-route shell render must retain the modal, reviewed selections and confirmation state.
 await page.evaluate(()=>document.querySelector('[data-action=mobile]').click());
 check('shell rerender preserves the open reviewed import',await dialog.locator('[data-pi-select]').isChecked());
 await dialog.locator('[data-pi=close]').first().click();check('cancel selected import requires explicit discard',await dialog.locator('[data-pi-discard]').isVisible());
 await dialog.locator('[data-pi=keep]').click();await dialog.locator('[data-pi-confirm]').check();await dialog.locator('[data-pi=apply]').click();
 await dialog.waitFor({state:'hidden'});
 check('import keeps PO quantity and resets stacking conservatively',await page.locator('[data-cp-field=length]').inputValue()==='1000'&&await page.locator('[data-cp-field=maxLayers]').inputValue()==='1'&&await page.locator('[data-cp-field=rotation]').inputValue()==='FIXED');
 await page.locator('[data-cp=calculate]').click();await page.locator('[data-cp-summary]').getByText('Units placed',{exact:true}).waitFor();
 check('known geometry loads four packages and eight units',await page.locator('[data-cp-scene-status]').textContent().then(t=>t.includes('4 packages'))&&await page.locator('[data-cp-results]').innerText().then(t=>t.includes('4 / 4')));
 await page.locator('canvas.cp-canvas').focus();await page.keyboard.press('ArrowLeft');await page.keyboard.press('+');await page.keyboard.press('Home');
 await page.locator('[data-cp=compare]').click();await page.locator('[data-cp-comparison] tbody tr').first().waitFor();check('container comparison exposes three reference options',await page.locator('[data-cp-comparison] tbody tr').count()===3);
 await page.locator('[data-cp=save]').click();
 check('draft saves privately in browser storage',await page.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith('fh-3d-load-v1:'))));
 await page.reload();await page.locator('#container-planner').waitFor();check('reload restores captured dimensions against the same source plan',await page.locator('[data-cp-field=length]').inputValue()==='1000');
 dialog=await openImport();await file(dialog,csv(['','','','',2]));await dialog.locator('[data-pi-select]').check();await dialog.locator('[data-pi-confirm]').check();await dialog.locator('[data-pi=apply]').click();await dialog.waitFor({state:'hidden'});
 check('CBM-only import clears stale geometry and package weights',await page.locator('[data-cp-field=length]').inputValue()===''&&await page.locator('[data-cp-field=weight]').inputValue()==='');
 await page.locator('[data-cp=calculate]').click();await page.locator('[data-cp-results] table').waitFor();check('CBM does not manufacture a box or loaded units',await page.locator('[data-cp-scene-status]').textContent().then(t=>t.includes('0 packages')));
 await page.evaluate(()=>{location.hash='#/orders';});await page.locator('dialog.cp-discard').waitFor();await page.locator('[data-keep]').click();check('keep editing preserves the changed scenario',await page.locator('#container-planner').isVisible()&&await page.locator('[data-cp-field=length]').inputValue()==='');
 await page.evaluate(()=>{location.hash='#/orders';});await page.locator('[data-discard]').click();await page.locator('#container-planner').waitFor({state:'hidden'});
 await page.goto(origin+'#/loading');await page.getByRole('link',{name:'3D load planner',exact:true}).first().click();await page.locator('#container-planner').waitFor();
 await page.setViewportSize({width:390,height:900});await page.emulateMedia({reducedMotion:'reduce'});
 check('mobile planner stays within the viewport',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 dialog=await openImport();await file(dialog,csv([1000,1000,500,10,2]));await dialog.locator('[data-pi-select]').check();
 check('mobile import keeps its footer reachable and table internally scrollable',await dialog.evaluate(d=>d.getBoundingClientRect().width<=innerWidth&&d.querySelector('.cp-import-foot').getBoundingClientRect().bottom<=innerHeight+1&&d.querySelector('.table-wrap').scrollWidth>d.querySelector('.table-wrap').clientWidth));
 await page.evaluate(()=>{window.packingReloadBlocked=false;const e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);window.packingReloadBlocked=e.defaultPrevented;});check('reload protection covers an open import',await page.evaluate(()=>window.packingReloadBlocked));
 await dialog.locator('[data-pi=close]').first().click();await dialog.locator('[data-pi=discard]').click();
 // Exercise the workbook reader in both module and standalone builds, including hostile structures.
 const workbooks=await page.evaluate(async code=>{
  const wb='<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Packing" sheetId="1" r:id="rId1"/></sheets></workbook>';
  const rel='<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>';
  const pack=async xml=>{const z=new JSZip();z.file('xl/workbook.xml',wb);z.file('xl/_rels/workbook.xml.rels',rel);z.file('xl/worksheets/sheet1.xml',xml);return z.generateAsync({type:'base64'});};
  const hostile=new JSZip();hostile.file('xl/workbook.xml','A'.repeat(27*1024*1024),{createFolders:false});
  const forged=await hostile.generateAsync({type:'uint8array',compression:'DEFLATE'}),view=new DataView(forged.buffer,forged.byteOffset,forged.byteLength);
  for(let i=0;i<forged.length-30;i++){const sig=view.getUint32(i,true);if(sig===0x04034b50)view.setUint32(i+22,1,true);if(sig===0x02014b50)view.setUint32(i+24,1,true);}
  return {forged:btoa(String.fromCharCode(...forged)),valid:await pack('<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Item code</t></is></c><c r="B1" t="inlineStr"><is><t>Product quantity</t></is></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>'+code+'</t></is></c><c r="B2"><f>1+1</f><v>2</v></c></row></sheetData></worksheet>'),duplicate:await pack('<worksheet><sheetData><row r="1"><c r="A1"><v>1</v></c><c r="A1"><v>2</v></c></row></sheetData></worksheet>'),entity:await pack('<!DOCTYPE worksheet [<!ENTITY x "unsafe">]><worksheet/>')};
 },code);
 dialog=await openImport();
 const uploadWorkbook=async(kind)=>dialog.locator('[data-pi-file]').setInputFiles({name:kind+'.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(workbooks[kind],'base64')});
 await uploadWorkbook('valid');await dialog.locator('[data-pi-rows]').getByText(/Workbook contains formulas/).waitFor();
 check('XLSX exposes cached formula values for review',await dialog.locator('[data-pi-rows]').innerText().then(t=>t.includes('2 units')&&t.includes('formulas')));
 await uploadWorkbook('duplicate');await dialog.locator('[data-pi-notice]').getByText(/duplicate cell references/).waitFor();
 check('XLSX rejects duplicate cell references',await dialog.locator('[data-pi-select]').count()===0);
 await uploadWorkbook('entity');await dialog.locator('[data-pi-notice]').getByText(/Unsupported workbook XML/).waitFor();
 check('XLSX rejects XML entity declarations',await dialog.locator('[data-pi-select]').count()===0);
  await uploadWorkbook('forged');await dialog.locator('[data-pi-notice]').getByText(/expands beyond the permitted size/).waitFor();
  check('XLSX stops actual decompression despite forged size metadata',await dialog.locator('[data-pi-select]').count()===0);
 await dialog.locator('[data-pi=close]').first().click();
 mkdirSync('test-output/container-planner',{recursive:true});await page.screenshot({path:'test-output/container-planner/'+mode+'-mobile.png',fullPage:true});
 check('planner/import leave original server records byte-equivalent',JSON.stringify(store.read())===before);
 check('planner/import issue no business-write requests',writes.length===0);
 check('no browser runtime errors',errors.length===0);
}finally{
 await context?.close();await browser?.close();await new Promise(resolve=>server.close(resolve));store.close();
 if(dir.startsWith(tmpdir()+sep))rmSync(dir,{recursive:true,force:true});
}
