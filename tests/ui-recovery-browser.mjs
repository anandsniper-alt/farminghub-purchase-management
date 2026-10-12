import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,sep,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Store} from '../server/store.mjs';
import {makeServer} from '../server/index.mjs';
import {createCleanSeed} from '../shared/clean-seed.mjs';

const {chromium}=await import(pathToFileURL(resolve(process.env.FH_PLAYWRIGHT_MODULE||'test-output/ui-tools/node_modules/playwright/index.mjs')).href);
const dir=mkdtempSync(join(tmpdir(),'fh-ui-recovery-'));
const seed=createCleanSeed();
seed.users=[
 {id:'browser-admin',name:'Browser Admin',role:'ADMIN',scopes:['LAE_IMPORT'],active:true},
 {id:'browser-viewer',name:'Browser Viewer',role:'VIEWER',scopes:['LAE_IMPORT'],active:true}
];
const store=new Store(join(dir,'test.sqlite'),seed);
const password='Synthetic-browser-only-2026';
store.addAccount('browser-admin','browser-admin@example.test',password);
store.addAccount('browser-viewer','browser-viewer@example.test',password);
const server=makeServer(store,{log:()=>{}});
let browser,context,page;
const check=(name,value)=>{assert.ok(value,name);console.log('PASS '+name);};
const openCreate=async(email,name)=>{
 await page.getByRole('button',{name:'Create user',exact:true}).first().click();
 const dialog=page.getByRole('dialog');
 await dialog.getByLabel('Full name').fill(name);
 await dialog.getByLabel('Email address').fill(email);
 await dialog.getByLabel(/^Password/).fill(password);
 await dialog.getByLabel('Confirm password').fill(password);
 return dialog;
};
const submit=dialog=>dialog.locator('button[type=submit]').click();
try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`;
 browser=await chromium.launch({headless:true,executablePath:process.env.FH_BROWSER_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 context=await browser.newContext({viewport:{width:1440,height:960}});
 page=await context.newPage();page.setDefaultTimeout(15000);
 await page.goto(origin+'/#/settings');
 await page.getByLabel(/^Email/).fill('browser-admin@example.test');
 await page.getByLabel(/^Password/).fill(password);
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.getByRole('heading',{name:'Users & settings',exact:true}).waitFor();

 // A wrong account must neither acquire the expired draft nor replace its cookie.
 let dialog=await openCreate('reauth@example.test','Reauth Draft');
 const oldCookie=(await context.cookies(origin)).find(c=>c.name==='fh_session')?.value;
 store.db.prepare('UPDATE sessions SET expires_at=? WHERE account_id=?').run(Date.now()-1,'browser-admin');
 await submit(dialog);await dialog.locator('#session-recovery').waitFor();
 await dialog.locator('[name=reauthEmail]').fill('browser-viewer@example.test');
 await dialog.locator('[name=reauthPassword]').fill(password);
 await dialog.getByRole('button',{name:'Sign in again'}).click();
 await dialog.getByText('This form belongs to Browser Admin. Sign in with that account to continue.').waitFor();
 check('wrong account leaves cookie unchanged',(await context.cookies(origin)).find(c=>c.name==='fh_session')?.value===oldCookie);
 check('wrong account preserves draft',await dialog.locator('[name=name]').inputValue()==='Reauth Draft');
 await dialog.locator('[name=reauthEmail]').fill('browser-admin@example.test');
 await dialog.locator('[name=reauthPassword]').fill(password);
 await dialog.getByRole('button',{name:'Sign in again'}).click();
 await dialog.getByText('Signed in again').waitFor();
 await submit(dialog);await dialog.waitFor({state:'hidden'});
 check('reauth saves once',store.listAccounts().filter(a=>a.email==='reauth@example.test').length===1);

 // The server commits, but the browser never receives the response.
 dialog=await openCreate('lost-response@example.test','Lost Response Draft');
 let posts=0,committedStatus;
 await page.route('**/api/users',async route=>{
  if(route.request().method()!=='POST')return route.continue();
  posts++;const response=await route.fetch();committedStatus=response.status();await route.abort('failed');
 });
 await submit(dialog);await dialog.waitFor({state:'hidden'});
 check('lost response recovered from receipt',committedStatus===201&&posts===1&&store.listAccounts().filter(a=>a.email==='lost-response@example.test').length===1);
 await page.unroute('**/api/users');

 // An unanswered POST releases the form after the bounded wait and keeps its request key.
 dialog=await openCreate('timeout@example.test','Timeout Draft');
 let heldRoute;
 await page.route('**/api/users',async route=>{if(route.request().method()==='POST'){heldRoute=route;return;}await route.continue();});
 await submit(dialog);
 await dialog.locator('#modal-error.visible').waitFor({timeout:24000});
 check('timeout releases form with unchanged draft',await dialog.locator('[name=name]').inputValue()==='Timeout Draft'&&await dialog.locator('button[type=submit]').isEnabled()&&store.listAccounts().filter(a=>a.email==='timeout@example.test').length===0);
 await heldRoute?.abort('failed').catch(()=>{});
 await page.unroute('**/api/users');
 await submit(dialog);await dialog.waitFor({state:'hidden'});
 check('timeout retry saves once',store.listAccounts().filter(a=>a.email==='timeout@example.test').length===1);

 // Rendered region labels must have unique targets at both widths.
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});
  await page.reload();
  await page.getByRole('heading',{name:'Users & settings',exact:true}).waitFor();
  const duplicates=await page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return ids.filter((id,i)=>ids.indexOf(id)!==i);});
  check(`unique dynamic ids at ${width}px`,duplicates.length===0);
 }
}finally{
 await browser?.close();await new Promise(resolve=>server.close(resolve));store.close();
 if(dir.startsWith(tmpdir()+sep))rmSync(dir,{recursive:true,force:true});
}
