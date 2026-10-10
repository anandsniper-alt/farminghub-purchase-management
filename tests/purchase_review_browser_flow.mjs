/** Isolated acceptance for planning and explicit approval review. No production access. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createServer} from 'node:http';
import {createSeed} from '../shared/seed.mjs';
import {ensureRecordReferences} from '../shared/references.mjs';
import {Store} from '../server/store.mjs';
import {makeServer} from '../server/index.mjs';
const state=createSeed(),draft=state.orders.find(o=>o.status==='DRAFT'),pending=state.orders.find(o=>o.status==='PENDING_APPROVAL'),piOrder=state.orders.find(o=>o.pi);
for(const item of state.items)if(item.baseId)item.brandPrefix=state.brands.find(b=>b.name===item.brand)?.prefix||'';
draft.planningTat=null;piOrder.pi.status='VERIFIED';
const proofId='approval-preview-proof',proof=readFileSync('web/assets/farming-hub-logo.png');state.files.push({id:proofId,name:'Synthetic approval picture.png',mime:'image/png',orderIds:[piOrder.id],scope:'LAE_IMPORT'});piOrder.pi.fileIds=[...(piOrder.pi.fileIds||[]),piOrder.pi.fileId,proofId].filter(Boolean);
ensureRecordReferences(state);
const store=new Store(':memory:',state),server=makeServer(store),key='fh-purchase-review-test';
store.db.prepare('INSERT INTO file_bodies VALUES(?,?)').run(proofId,proof);
store.addAccount('u-manager','review@example.test','Isolated-review-test-2026');
const html=readFileSync('Farming_Hub_Purchase_Management_Clean_Review.html','utf8').replace("window.FH_MODE='clean';","window.FH_MODE='clean';window.FH_REVIEW_STORE="+JSON.stringify(key)+';window.FH_INITIAL_STATE='+JSON.stringify(state).replaceAll('</script','<\\/script')+';');
const review=createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(html);});
const dir='test-output/purchase-review';mkdirSync(dir,{recursive:true});
const report={checks:[],errors:[]};let browser,page;
const check=(name,value)=>{assert.ok(value,name);report.checks.push(name);console.log('PASS '+name);};
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));await new Promise(r=>review.listen(0,'127.0.0.1',r));
 const urls={server:'http://127.0.0.1:'+server.address().port,review:'http://127.0.0.1:'+review.address().port};
 const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
 browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 for(const mode of ['server','review']){
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>report.errors.push(mode+': '+e.message));
  const input=n=>page.locator('#dialog-form [name="'+n+'"]'),submit=()=>page.locator('#dialog-form [type=submit]').click(),close=()=>page.locator('.modal-head [data-action=close]').click();
  const read=async()=>mode==='server'?store.read():page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
  const visit=async id=>{await page.goto(urls[mode]+'/#/order/'+id);await page.locator('[data-action=print]').first().waitFor();};
  await page.goto(urls[mode]+'/#/orders');
  if(mode==='server'){await page.locator('[name=email]').fill('review@example.test');await page.locator('[name=password]').fill('Isolated-review-test-2026');await page.locator('#login-form [type=submit]').click();}
  await visit(draft.id);await page.locator('[data-action=submit-po]').first().click();
  check(mode+': missing planning opens visible review and edit action',await page.locator('#dialog-form [data-action=edit-draft]').count()===1&&await page.locator('#dialog-form [type=submit]').count()===0);
  await page.locator('#dialog-form [data-action=edit-draft]').click();await page.locator('.po-terms>summary').click();
  check(mode+': missing legacy total defaults to standard calculation',await input('planningMode').inputValue()==='STANDARD'&&Number(await input('planningTat').inputValue())>0);
  await input('routeId').selectOption('route-ningbo');await input('planningBufferDays').fill('3');
  const days=Number(await input('productionDays').inputValue());
  check(mode+': standard planning recomputes without manual total',Number(await input('planningTat').inputValue())===days+22+3&&await input('planningTat').evaluate(e=>e.readOnly));
  await input('routeId').selectOption('route-shekou');check(mode+': route change updates total',Number(await input('planningTat').inputValue())===days+29+3);
  await input('planningMode').selectOption('MANUAL');await input('planningTat').fill(String(days+40));
  check(mode+': manual override makes reason mandatory',await input('planningOverrideReason').isVisible()&&await input('planningOverrideReason').evaluate(e=>e.required));
  await submit();check(mode+': missing override reason prevents save',await page.locator('#dialog-form').count()===1);
  await input('planningOverrideReason').fill('Agreed expedited route and buffer');await submit();await page.locator('#dialog-form').waitFor({state:'hidden'});
  let saved=(await read()).orders.find(o=>o.id===draft.id);check(mode+': saved override retains standard basis and reason',saved.planningTat===days+40&&saved.planningBasis.totalDays===days+32&&saved.planningOverrideReason==='Agreed expedited route and buffer');
  await page.locator('[data-action=submit-po]').first().click();check(mode+': submission preview contains all order lines',await page.locator('#dialog-form tbody tr').count()===draft.lines.length);
  await close();check(mode+': cancelling review does not submit order',(await read()).orders.find(o=>o.id===draft.id).status==='DRAFT');
  await visit(pending.id);await page.locator('[data-action=approve-po]').first().click();
  check(mode+': opening approval does not issue PO',(await read()).orders.find(o=>o.id===pending.id).status==='PENDING_APPROVAL');
  await input('decision').selectOption('APPROVE');await submit();check(mode+': unchecked review blocks approval',(await page.locator('#modal-error').innerText()).includes('Review the details'));
  await input('reviewConfirmed').check();
  if(mode==='server'){
   store.transact({type:'ADD_FOLLOWUP',payload:{orderId:pending.id,title:'Concurrent supplier clarification',due:'2027-01-01'}},'u-manager',store.read().revision,'review-concurrency-check');
   await submit();await page.locator('[data-action=review-save-conflict]').click();await page.locator('[data-review-save]').check();await page.locator('[data-action=continue-save-conflict]').click();
   check('server: stale approval reload resets decision and confirmation',await input('decision').inputValue()===''&&!await input('reviewConfirmed').isChecked());
   await input('decision').selectOption('APPROVE');await input('reviewConfirmed').check();
  }
  await page.screenshot({path:dir+'/'+mode+'-po-review.png'});await submit();await page.locator('#dialog-form').waitFor({state:'hidden'});
  check(mode+': explicit approval creates issued revision',(await read()).orders.find(o=>o.id===pending.id).status==='ISSUED');
  if(mode==='review')await page.evaluate(async({id,bytes})=>{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('fh-purchase-alpha10-clean-files',1);r.onupgradeneeded=()=>r.result.createObjectStore('files');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});await new Promise((resolve,reject)=>{const t=db.transaction('files','readwrite');t.objectStore('files').put(new Blob([new Uint8Array(bytes)],{type:'image/png'}),id);t.oncomplete=resolve;t.onerror=()=>reject(t.error);});db.close();},{id:proofId,bytes:[...proof]});
  await visit(piOrder.id);await page.locator('[data-action=approve-pi]').first().click();
  check(mode+': PI review shows comparison and evidence actions',(await page.locator('#dialog-form').innerText()).includes('Supplier PI')&&await page.locator('[data-action=preview-review-file]').count()>0);
  await page.locator('[data-action=preview-review-file]').first().click();await page.locator('#approval-document-preview').filter({hasText:/unavailable|failed|access/i}).waitFor();
  check(mode+': missing synthetic document is explained without pretending it was reviewed',await page.locator('#approval-document-preview').isVisible());
  await page.locator('[data-action=preview-review-file][data-file="'+proofId+'"]').click();await page.waitForFunction(()=>document.querySelector('#approval-document-preview img')?.naturalWidth>0);
  check(mode+': supporting image renders from protected evidence',await page.locator('#approval-document-preview img').isVisible());
  await input('decision').selectOption('RETURN');await input('reviewConfirmed').check();await submit();check(mode+': return requires reason',(await page.locator('#modal-error').innerText()).includes('reason'));
  await input('remarks').fill('Supplier to correct invoice details');await page.setViewportSize({width:390,height:844});
  check(mode+': approval review has no mobile page overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:dir+'/'+mode+'-pi-mobile.png'});
  await submit();await page.locator('#dialog-form').waitFor({state:'hidden'});saved=(await read()).orders.find(o=>o.id===piOrder.id);
  check(mode+': PI return preserves evidence and value',saved.pi.status==='REVERIFY'&&saved.pi.amountMinor===piOrder.pi.amountMinor&&saved.pi.fileId===piOrder.pi.fileId);
  await context.close();
 }
 check('No browser runtime errors',report.errors.length===0);
}catch(e){report.failure=e.stack;await page?.screenshot({path:dir+'/failure.png'}).catch(()=>{});throw e;}
finally{writeFileSync(dir+'/report.json',JSON.stringify(report,null,2));await browser?.close();await new Promise(r=>server.close(r));await new Promise(r=>review.close(r));store.close();}
