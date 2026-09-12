/** Isolated upload regression; never reads .env or the live database. */
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Store} from '../server/store.mjs';
import {makeServer} from '../server/index.mjs';
import {createSeed} from '../shared/seed.mjs';
import {MAX_UPLOAD_BYTES} from '../shared/domain.mjs';
const {chromium}=await import(process.env.FH_PLAYWRIGHT_MODULE||'playwright');
const root=resolve(tmpdir()),dir=mkdtempSync(join(root,'fh-upload-browser-')),seed=createSeed('2026-09-11');
const store=new Store(join(dir,'test.sqlite'),seed);store.addAccount('u-admin','upload-admin@example.test','Upload-browser-test-1234');
const server=makeServer(store);let browser;
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],oid=seed.orders[0].id;
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/#/order/'+oid);await page.getByLabel(/^Email/).fill('upload-admin@example.test');await page.getByLabel(/^Password/).fill('Upload-browser-test-1234');await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.locator('[data-action=tab][data-value=documents]').click();await page.getByRole('button',{name:'Upload document',exact:true}).click();
 const dialog=page.getByRole('dialog'),input=dialog.locator('input[type=file]'),submit=dialog.locator('button[type=submit]');assert.equal(await input.getAttribute('multiple'),'');
 let requests=0,firstRequests=0,failSecond=true;
 await page.route('**/api/files',async route=>{
  if(route.request().method()!=='POST')return route.continue();requests++;const p=route.request().postDataJSON();
  if(p.name==='retry-first.txt')firstRequests++;
  if(p.name==='retry-second.txt'&&failSecond){failSecond=false;return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Temporary upload failure; try again.'})});}
  return route.continue();
 });
 // Validate every selected file before sending the first request.
 await input.evaluate((el,max)=>{const dt=new DataTransfer();dt.items.add(new File(['valid'],'small.txt'));dt.items.add(new File([new Uint8Array(max+1)],'too-large.txt'));el.files=dt.files;},MAX_UPLOAD_BYTES);
 await submit.click();await dialog.getByText('too-large.txt: maximum file size is 50 MB.',{exact:true}).waitFor();assert.equal(requests,0);
 await input.setInputFiles([{name:'retry-first.txt',mimeType:'text/plain',buffer:Buffer.from('first response')},{name:'retry-second.txt',mimeType:'text/plain',buffer:Buffer.from('second response')}]);
 const initial=store.read(),documentCount=initial.orders.find(o=>o.id===oid).documents.length;
 await submit.click();await dialog.getByText('Temporary upload failure; try again.',{exact:true}).waitFor();
 assert.equal(store.read().files.length,initial.files.length+1);assert.equal(store.read().orders.find(o=>o.id===oid).documents.length,documentCount);
 assert.equal(await input.evaluate(el=>el.files.length),2);assert.equal(await submit.isEnabled(),true);
 await submit.click();await dialog.waitFor({state:'hidden'});assert.equal(firstRequests,1,'Retry reuses first successful upload');
 const documents=store.read().orders.find(o=>o.id===oid).documents.slice(documentCount);assert.equal(documents.length,2);assert.deepEqual(documents.map(d=>d.name),['retry-first.txt','retry-second.txt']);
 for(const d of documents){assert.ok(Buffer.from(store.fileBytes(d.fileId)).length);await page.getByRole('heading',{name:d.name,exact:true}).waitFor();}
 // A double submission while a file is in flight creates only one workflow response.
 await page.getByRole('button',{name:'Upload document',exact:true}).click();await input.setInputFiles([{name:'double-a.txt',mimeType:'text/plain',buffer:Buffer.from('a')},{name:'double-b.txt',mimeType:'text/plain',buffer:Buffer.from('b')}]);
 await dialog.locator('form').evaluate(form=>{form.requestSubmit();form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});
 await dialog.waitFor({state:'hidden'});assert.equal(store.read().files.filter(f=>f.name.startsWith('double-')).length,2);
 assert.equal(store.read().orders.find(o=>o.id===oid).documents.filter(d=>d.name.startsWith('double-')).length,2);
 await page.getByRole('button',{name:'Upload document',exact:true}).click();await page.setViewportSize({width:390,height:844});const box=await dialog.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=391);
 mkdirSync('test-output',{recursive:true});await page.screenshot({path:'test-output/multiple-upload-mobile.png'});await page.keyboard.press('Escape');
 const review=await browser.newPage();review.on('pageerror',e=>errors.push(e.message));
 await review.goto(pathToFileURL(resolve('Farming_Hub_Purchase_Management_Clean_Review.html')).href+'#/overview');
 // Seed only this isolated review browser to exercise the same multi-file UI/IndexedDB path.
 await review.evaluate(s=>{localStorage.setItem('fh-purchase-alpha15-clean-schema7',JSON.stringify(s));localStorage.setItem('fh-purchase-alpha15-clean-schema7-user','u-admin');},seed);
 await review.goto(pathToFileURL(resolve('Farming_Hub_Purchase_Management_Clean_Review.html')).href+'#/order/'+oid);await review.reload();
 await review.locator('[data-action=tab][data-value=documents]').click();await review.getByRole('button',{name:'Upload document',exact:true}).click();
 await review.locator('input[type=file]').setInputFiles([{name:'review-a.txt',mimeType:'text/plain',buffer:Buffer.from('a')},{name:'review-b.txt',mimeType:'text/plain',buffer:Buffer.from('b')}]);await review.locator('button[type=submit]').click();
 await review.getByRole('heading',{name:'review-a.txt',exact:true}).waitFor();await review.getByRole('heading',{name:'review-b.txt',exact:true}).waitFor();
 assert.deepEqual(errors,[]);console.log('PASS: multiple files, full-selection size validation, partial failure and retry, duplicate-submit guard, stored documents, mobile form and standalone review uploads.');
}finally{
 await browser?.close();await new Promise(r=>server.close(r));store.close();const target=resolve(dir);assert.ok(target.startsWith(root+sep)&&target!==root);rmSync(target,{recursive:true,force:true});
}
