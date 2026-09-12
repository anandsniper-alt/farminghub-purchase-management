/** Isolated server/browser regression. Requires Playwright and a Chromium browser.
 * Optional: FH_PLAYWRIGHT_MODULE (module URL), CHROMIUM_PATH (executable).
 * Never reads .env or opens the live database.
 */
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Store} from '../server/store.mjs';
import {makeServer} from '../server/index.mjs';
import {createCleanSeed} from '../shared/clean-seed.mjs';

const {chromium}=await import(process.env.FH_PLAYWRIGHT_MODULE||'playwright');
const root=resolve(tmpdir()),dir=mkdtempSync(join(root,'fh-user-browser-'));
const seed=createCleanSeed();seed.users=[{id:'test-admin',name:'Portal Administrator',role:'ADMIN',scopes:['LAE_IMPORT'],active:true}];
const store=new Store(join(dir,'test.sqlite'),seed);
store.addAccount('test-admin','portal-admin@example.test','Browser-test-admin-1234');
const server=makeServer(store);let browser;
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/#/settings');
 await page.getByLabel(/^Email/).fill('portal-admin@example.test');
 await page.getByLabel(/^Password/).fill('Browser-test-admin-1234');
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.getByRole('cell',{name:'portal-admin@example.test',exact:true}).waitFor();
 await page.getByRole('button',{name:'Create user',exact:true}).click();
 const dialog=page.getByRole('dialog');await dialog.waitFor();
 await dialog.getByLabel('Full name').fill('Portal Test Viewer');
 await dialog.getByLabel('Email address').fill('portal-viewer@example.test');
 await dialog.getByLabel(/^Role/).selectOption('VIEWER');
 await dialog.getByText('Read records in assigned divisions. Cannot create or approve transactions.').waitFor();
 await dialog.getByLabel(/^Password/).fill('Browser-test-viewer-1234');
 await dialog.getByLabel('Confirm password').fill('Different-password-1234');
 await dialog.getByRole('button',{name:'Create user',exact:true}).click();
 await dialog.getByText('Passwords do not match.',{exact:true}).waitFor();
 assert.equal(store.listAccounts().length,1);
 await dialog.getByLabel('Confirm password').fill('Browser-test-viewer-1234');
 await dialog.getByRole('button',{name:'Create user',exact:true}).click();
 await page.getByRole('cell',{name:'portal-viewer@example.test',exact:true}).waitFor();
 assert.equal(await page.getByRole('dialog').count(),0);
 assert.equal(store.listAccounts().length,2);
 mkdirSync('test-output',{recursive:true});await page.screenshot({path:'test-output/user-access-desktop.png',fullPage:true});
 // Duplicate email is actionable, retains form values and does not create a profile.
 await page.getByRole('button',{name:'Create user',exact:true}).click();
 await dialog.getByLabel('Full name').fill('Duplicate Viewer');
 await dialog.getByLabel('Email address').fill('portal-viewer@example.test');
 await dialog.getByLabel(/^Password/).fill('Browser-test-viewer-1234');
 await dialog.getByLabel('Confirm password').fill('Browser-test-viewer-1234');
 await dialog.getByRole('button',{name:'Create user',exact:true}).click();
 await dialog.getByText('Account ID or email already exists.',{exact:true}).waitFor();
 assert.equal(await dialog.getByLabel('Full name').inputValue(),'Duplicate Viewer');
 assert.equal(store.listAccounts().length,2);
 await page.setViewportSize({width:390,height:844});
 const box=await dialog.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=391);
 await page.locator('#toast-root .toast').waitFor({state:'hidden'});
 await page.screenshot({path:'test-output/user-access-mobile-dialog.png'});
 await page.keyboard.press('Escape');
 await page.setViewportSize({width:1440,height:1000});
 await page.getByRole('button',{name:'Sign out',exact:true}).click();
 await page.getByLabel(/^Email/).fill('portal-viewer@example.test');
 await page.getByLabel(/^Password/).fill('Browser-test-viewer-1234');
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.getByRole('heading',{name:'Users & settings',exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Create user',exact:true}).count(),0);
 assert.equal(await page.getByRole('cell',{name:'portal-admin@example.test',exact:true}).count(),0);
 const review=await browser.newPage();review.on('pageerror',e=>errors.push(e.message));
 await review.goto(pathToFileURL(resolve('Farming_Hub_Purchase_Management_Clean_Review.html')).href+'#/settings');
 await review.getByRole('heading',{name:'Users & settings',exact:true}).waitFor();
 assert.equal(await review.getByRole('button',{name:'Create user',exact:true}).count(),0);
 assert.equal(await review.locator('input[type=password]').count(),0);
 assert.deepEqual(errors,[]);
 console.log('PASS: admin creation, password confirmation, duplicate rollback, mobile dialog, new-user login, non-admin visibility and standalone review mode.');
}finally{
 await browser?.close();await new Promise(r=>server.close(r));store.close();
 const target=resolve(dir);assert.ok(target.startsWith(root+sep)&&target!==root);rmSync(target,{recursive:true,force:true});
}
