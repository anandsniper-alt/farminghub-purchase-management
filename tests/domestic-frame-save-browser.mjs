import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createServer} from 'node:http';
import {Store} from '../server/store.mjs';
import {makeServer} from '../server/index.mjs';
import {domesticPreviewState} from '../scripts/prepare-domestic-preview.mjs';

// Only synthetic, isolated workspaces. Never accepts a production URL.
const out=resolve('test-output/domestic-frame-save',new Date().toISOString().replace(/[:.]/g,'-'));mkdirSync(out,{recursive:true});
const reports=[];let browser;
try{
 const {chromium}=await import(pathToFileURL(resolve(process.env.FH_PLAYWRIGHT_MODULE||'../ui-tools/node_modules/playwright/index.mjs')).href);
 browser=await chromium.launch({headless:true,executablePath:process.env.FH_BROWSER_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 for(const mode of ['server','review'])for(const role of ['MANAGER','EXECUTIVE']){
  const seed=domesticPreviewState(),user=seed.users.find(u=>u.role===role),label=mode+'-'+role,store=new Store(join(out,label+'.sqlite'),seed),html=readFileSync('test-output/Domestic_BOM_Preview.html');
  store.addAccount(user.id,'frame@example.test','Frame-test-only-1234');const server=mode==='server'?makeServer(store):createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const ctx=await browser.newContext({viewport:{width:1440,height:900}}),page=await ctx.newPage(),checks=[],errors=[];page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
  const check=(name,ok=true)=>{assert.ok(ok,label+': '+name);checks.push(name);};
  if(mode==='review')await ctx.addInitScript(({seed,role})=>{if(!localStorage.getItem('fh-domestic-preview-v1'))localStorage.setItem('fh-domestic-preview-v1',JSON.stringify(seed));localStorage.setItem('fh-domestic-preview-v1-user',seed.users.find(u=>u.role===role).id);},{seed,role});
  const base='http://127.0.0.1:'+server.address().port,state=async()=>mode==='server'?store.read():page.evaluate(()=>JSON.parse(localStorage.getItem('fh-domestic-preview-v1'))),saved=async id=>(await state()).domesticBoms.find(b=>b.id===id);
  try{
   await page.goto(base+'/#/domestic/sets');if(mode==='server'){await page.locator('[name=email]').fill('frame@example.test');await page.locator('[name=password]').fill('Frame-test-only-1234');await page.locator('[type=submit]').click();}
   const initial=await state();await page.getByRole('button',{name:'Add assembly BOM',exact:true}).click();check('Frame is the default assembly type',await page.locator('[name=assemblyType]').inputValue()==='FRAME');await page.locator('[name=name]').fill('Local QA frame assembly');await page.getByRole('button',{name:'Create assembly',exact:true}).click();await page.getByRole('heading',{name:/Edit BOM/}).waitFor();
   const bom=(await state()).domesticBoms.at(-1);check('Create opens the new frame editor with its assigned reference',bom.assemblyType==='FRAME'&&/^FH-LAE-D-BOM-\d+$/.test(bom.code)&&page.url().endsWith(bom.id));
   const parts=['FH-LAE-D-IT-9','FH-LAE-D-IT-6','FH-LAE-D-IT-5'].map(code=>seed.domesticItems.find(i=>i.code===code));for(const item of parts)await page.locator('.domestic-picker-select[data-choice="'+item.id+'"]').click();
   await page.locator('[name=quantity-0]').fill('1');await page.locator('[name=quantity-1]').fill('4');await page.locator('[name=notes]').fill('Local QA frame, bushes and clamps');const save=page.getByRole('button',{name:'Save BOM revision',exact:true});await save.click();
   check('Missing reason gives a persistent message beside Save',await page.locator('#domestic-save-guidance.has-error').innerText()==='Enter a reason for this revision before saving.');check('Missing reason focuses its field without losing selected parts',await page.locator('[name=reason]').evaluate(el=>document.activeElement===el)&&await page.locator('#domestic-selected-rows tr').count()===3);check('Rejected save made no revision',(await saved(bom.id)).revision===1);
   for(const width of [390,320]){await page.setViewportSize({width,height:844});check('Save and its explanation fit '+width,await page.locator('#domestic-save-guidance').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight;})&&await save.isVisible());check('No page overflow at '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
   await page.locator('[name=reason]').fill('   ');await save.click();check('Whitespace-only reason is rejected visibly',await page.locator('#domestic-save-guidance.has-error').isVisible());
   await page.locator('[name=reason]').fill('Initial assembly parts, quantities and rates pending');await save.click();await page.locator('#dialog-form').waitFor({state:'detached'});let b=await saved(bom.id);check('Partial frame saved as Draft without guessed prices or quantities',b.revision===2&&b.status==='DRAFT'&&b.lines.length===3&&b.lines[2].quantityMilli===null&&b.lines.every(l=>l.rateMinor===null));
   await page.reload();await page.getByRole('button',{name:'Edit BOM',exact:true}).click();check('Reload restores saved parts and quantities',await page.locator('[name=quantity-1]').inputValue()==='4'&&await page.locator('[name=quantity-2]').inputValue()==='');await page.locator('[name=quantity-2]').fill('2');await page.locator('[name=reason]').fill('Complete local QA frame rates');await page.locator('[name=quantity-1]').fill('1.5');await save.click();check('Invalid PCS quantity names the item in the footer',(await page.locator('#domestic-save-guidance.has-error').innerText()).includes(parts[1].code+' — Check the quantity.'));check('Invalid quantity does not save',(await saved(bom.id)).revision===2);await page.locator('[name=quantity-1]').fill('4');
   await page.locator('[name=rate-0]').fill('100.001');await save.click();check('Too many price decimals are explained',(await page.locator('#domestic-save-guidance.has-error').innerText()).includes(parts[0].code+' — Check the price.'));
   for(const [n,rate]of ['100','2.50','1.25'].entries())await page.locator('[name=rate-'+n+']').fill(rate);await page.locator('[name=compositionConfirmed]').check();await page.setViewportSize({width:1440,height:900});await save.click();await page.locator('#dialog-form').waitFor({state:'detached'});b=await saved(bom.id);check('Completed frame becomes Costed with exact total',b.status==='COSTED'&&b.lines.reduce((a,l)=>a+l.quantityMilli*l.rateMinor/1000,0)===11250);check('Previous draft and change reason remain in history',b.history.length===2&&b.history.at(-1).lines[2].quantityMilli===null&&b.history.at(-1).reason==='Complete local QA frame rates');await page.screenshot({path:join(out,label+'-saved.png'),fullPage:true});
   for(const frame of seed.domesticBoms.filter(b=>b.assemblyType==='FRAME')){await page.goto(base+'/#/domestic/'+frame.id);await page.getByRole('button',{name:'Edit BOM',exact:true}).click();await page.locator('.domestic-picker-select[data-choice="'+parts[0].id+'"]').click();await page.locator('[name=reason]').fill('Local QA pending frame selection');await save.click();await page.locator('#dialog-form').waitFor({state:'detached'});check('Existing frame saves pending selection '+frame.name,(await saved(frame.id)).lines.length===1&&(await saved(frame.id)).status==='DRAFT');}
   for(const key of ['orders','vendors','items','priceLists','payments','domesticItems','domesticPriceLists'])check('Unrelated '+key+' unchanged',JSON.stringify((await state())[key])===JSON.stringify(initial[key]));check('No JavaScript errors',errors.length===0);reports.push({mode,role,status:'PASS',checks,errors});
  }catch(e){reports.push({mode,role,status:'FAIL',checks,errors,error:e.message});await page.screenshot({path:join(out,label+'-failure.png'),fullPage:true});throw e;}
  finally{await ctx.close();await new Promise(r=>server.close(r));store.close();}
 }
 console.log(JSON.stringify({status:'PASS',checks:reports.reduce((n,r)=>n+r.checks.length,0),evidence:out}));
}finally{await browser?.close();writeFileSync(join(out,'report.json'),JSON.stringify(reports,null,2));}
