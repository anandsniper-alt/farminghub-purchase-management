/** Three complete UI workflows against an isolated native server. No .env/live data. */
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Store} from '../server/store.mjs';
import {makeServer} from '../server/index.mjs';
import {createCleanSeed} from '../shared/clean-seed.mjs';
import {execute,managerWorkflowStages,orderStatus,financials,shipmentTotals} from '../shared/domain.mjs';

const managerRelaxed=process.argv.includes('--manager-relaxed');
const managerOnly=managerRelaxed||process.argv.includes('--manager-only');
const secondManager=process.argv.includes('--second-manager'),managerId=secondManager?'u-second-manager':'u-manager';
const out=resolve(process.env.FH_TEST_OUTPUT_ROOT||'test-output',managerRelaxed?'manager-relaxed-workflows':managerOnly?'manager-only-workflows':'three-workflows',new Date().toISOString().replace(/[:.]/g,'-'));mkdirSync(out,{recursive:true});
let seed=createCleanSeed();
if(secondManager){assert.ok(managerRelaxed,'Second account requires configured Manager workflow');seed.users.push({...seed.users.find(u=>u.id==='u-manager'),id:managerId,name:'Second isolated Manager'});}
// Explicit test precondition: Admin has configured Manager approval coverage; workflow accounts remain Manager-only.
if(managerRelaxed){const stages=managerWorkflowStages(seed);seed=execute(seed,{type:'SAVE_APPROVAL_CONTROLS',payload:{stages,remarks:'Isolated configured Manager workflow test',confirm:true}},seed.users.find(u=>u.role==='ADMIN')).state;}
// Test fixture masters only; workflow writes use UI. Manager-only adds an explicit denied API probe.
if(!seed.vendors.some(v=>v.kind==='LOGISTICS'&&v.status==='ACTIVE'))seed.vendors.push({id:'test-forwarder',code:'TEST-LOGISTICS',name:'Isolated Test Forwarder',kind:'LOGISTICS',status:'ACTIVE',scopes:['LAE_IMPORT'],country:'China'});
const store=new Store(join(out,'test.sqlite'),seed),password='Isolated-workflow-test-1234';
for(const u of seed.users.filter(u=>!managerOnly||u.id===managerId))store.addAccount(u.id,u.id+'@example.test',password);
const report={started:new Date().toISOString(),environment:'Isolated local native server; clean seed and synthetic users',workflows:[],errors:[],networkFailures:[],out};
const server=makeServer(store);let browser,context,page,current;
const delegated=false;assert.ok(!process.argv.includes('--delegated'),'Temporary executive delegation was removed; use --executive for manager/product handoffs.');
const executiveOnly=delegated||process.argv.includes('--executive');
assert.ok(!(managerOnly&&executiveOnly),'Select either --manager-only or --executive.');
const scenarios=executiveOnly?[{id:delegated?'WF-DELEGATED':'WF-EXEC',title:delegated?'Purchase Executive completes all operational and approval steps':'Assigned Purchase Executive workflow under current approval policy',currency:'USD',terms:'10-20-70-bl120',quantity:15,unitPrice:100,multiple:true,shipments:[15],operator:'exec'}]:[
 {id:'WF-A',title:'Standard USD purchase, one shipment, advance and BL balance',currency:'USD',terms:'30-70',quantity:10,unitPrice:100,multiple:false,shipments:[10]},
 {id:'WF-B',title:'CNY purchase, multiple attachments, advance/shipment/BL payments',currency:'CNY',terms:'10-20-70-bl120',quantity:20,unitPrice:100,multiple:true,shipments:[20]},
 {id:'WF-C',title:'USD credit purchase, two partial shipments and separate settlement',currency:'USD',terms:'credit60',quantity:12,unitPrice:100,multiple:true,shipments:[5,7]}
];
function check(label,condition=true){assert.ok(condition,label);current.checks.push(label);console.log('PASS '+current.id+': '+label);}
async function action(name){const button=page.getByRole('button',{name,exact:true}).first(),kind=await button.getAttribute('data-action');const previous=['submit-po','approve-po','verify-pi','approve-pi','approve-artwork'].includes(kind)?await button.elementHandle():null;await button.click();if(previous)await page.waitForFunction(el=>!el.isConnected,previous);}
async function fill(name,value){const input=page.locator('#dialog-form [name="'+name+'"]');await input.evaluate(e=>{for(let p=e.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;});await input.fill(String(value));}
async function select(name,value){const input=page.locator('#dialog-form [name="'+name+'"]');await input.evaluate(e=>{for(let p=e.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;});await input.selectOption(value);}
async function submit(){await page.locator('#dialog-form button[type=submit]').click();await page.getByRole('dialog').waitFor({state:'hidden',timeout:20000});}
async function files(label){const count=current.multiple?2:1;await page.locator('#dialog-form input[type=file]').setInputFiles(Array.from({length:count},(_,i)=>({name:current.id+'-'+label+'-'+(i+1)+'.txt',mimeType:'text/plain',buffer:Buffer.from('ISOLATED TEST EVIDENCE ONLY: '+current.id+' '+label+' '+(i+1))})));}
async function login(role){if(managerOnly)assert.equal(role,'manager','Manager-only run cannot switch accounts');if(await page.getByRole('button',{name:'Sign out',exact:true}).count())await action('Sign out');await page.getByLabel(/^Email/).fill((role==='manager'?managerId:'u-'+role)+'@example.test');await page.getByLabel(/^Password/).fill(password);await action('Sign in');await page.locator('.sidebar').waitFor();current.roles.add(role);current.activeRole=role;}
async function screenshot(label){await page.screenshot({path:join(out,current.id+'-'+label+'.png'),fullPage:true});}
async function overview(){await page.locator('.tab[data-action=tab][data-value=overview]').click();}
async function response(button,label){await action(button);await files(label);await fill('remarks','Isolated test: '+label);await submit();}
function order(){return store.read().orders.find(o=>o.number===current.id+'-TEST');}
async function settleOutstanding(){
 await page.locator('.tab[data-action=tab][data-value=finance]').click();
 // Select only allocated milestones; settle BL balances after final BL is recorded.
 const {paymentSchedule}=await import('../shared/domain.mjs');
 const payable=(s,o)=>paymentSchedule(s,o).filter(m=>m.reported<m.amount&&(m.trigger==='PI'||m.shipmentId)&&(m.trigger!=='BL'||o.shipments.find(x=>x.id===m.shipmentId)?.blDate));
 const needsAuthorization=payable(store.read(),order()).filter(m=>!m.authorized);
 if(current.operator==='exec'&&needsAuthorization.length&&!false){check('Executive cannot authorize payment milestones',await page.locator('[data-action=authorize-payment]').count()===0);await login('manager');await page.locator('.tab[data-value=finance]').click();}
 for(const m of needsAuthorization)await page.locator('[data-action=authorize-payment][data-term="'+m.index+'"][data-shipment="'+(m.shipmentId||'')+'"]').click();
 if(current.operator==='exec'&&current.activeRole!=='exec'){await login('exec');await page.locator('.tab[data-value=finance]').click();}
 for(let safety=0;safety<10;safety++){
  const s=store.read(),o=s.orders.find(o=>o.id===order().id),due=payable(s,o).find(m=>m.authorized);
  if(!due)break;
  await action('Record bank payment');
  await select('currency',current.currency);
  const options=await page.locator('[name="aterm-0"] option').allTextContents();
  const matching=await page.locator('[name="aterm-0"] option').evaluateAll(os=>os.map(o=>({value:o.value,label:o.textContent})));
  const option=matching.find(x=>x.value===due.key);assert.ok(option,'Authorized milestone has a UI option: '+due.key+' / '+options.join(', '));
  await select('aterm-0',option.value);
  const amount=((due.amount-due.reported)/100).toFixed(2);await fill('amount',amount);await fill('aamount-0',amount);await fill('arate-0','1');await fill('inrRate',current.currency==='CNY'?'12':'85');await fill('reference',current.id+'-PAY-'+(++current.paymentSerial));await files('payment-'+current.paymentSerial);await fill('remarks','Isolated test milestone remittance.');await submit();
  check('Bank remittance '+current.paymentSerial+' saved for '+due.name);
 }
 await overview();
}
async function recordManagerBoundary(){
 const before=store.read(),o=order();
 check('Purchase Manager can submit artwork but cannot see Approve artwork',!!o.artwork.pending&&await page.getByRole('button',{name:'Approve artwork',exact:true}).count()===0);
 const denial=await page.evaluate(async orderId=>{const b=await fetch('/api/bootstrap').then(r=>r.json());const r=await fetch('/api/commands',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':b.csrf},body:JSON.stringify({type:'APPROVE_ARTWORK',payload:{orderId},expectedRevision:b.state.revision})});return {status:r.status,body:await r.json(),role:b.user.role};},o.id);
 check('Authenticated MANAGER artwork approval is rejected by server',denial.role==='MANAGER'&&denial.status===403&&/Product Manager/i.test(denial.body.error));
 check('Denied approval leaves the complete workspace unchanged',JSON.stringify(store.read())===JSON.stringify(before));
 check('Production has not started without approved artwork',!order().productionWindowStartedAt&&!order().artwork.current);
 const state=store.read(),events=state.events.filter(e=>e.entityId===o.id);
 check('Every order workflow audit event belongs to Purchase Manager',events.length>0&&events.every(e=>e.actorId===managerId));
 check('Only Purchase Manager account used',current.roles.size===1&&current.roles.has('manager'));
 current.blocker={command:'APPROVE_ARTWORK',httpStatus:denial.status,message:denial.body.error,requiredRole:'PRODUCT_MANAGER or ADMIN',unreached:['Supplier artwork acknowledgement','Production lead-time start','Sample/bulk production/QC','Shipment booking through port arrival','Final financial settlement']};
 current.summary={orderNumber:o.number,status:orderStatus(o),piStatus:o.pi.status,pendingArtwork:!!o.artwork.pending,productionStarted:!!o.productionWindowStartedAt};
 current.status='BLOCKED_BY_ROLE';current.roles=[...current.roles];await screenshot('manager-artwork-blocked');
 console.log('BLOCKED '+current.id+': '+denial.body.error);
 writeFileSync(join(out,'report.json'),JSON.stringify(report,(_,v)=>v instanceof Set?[...v]:v,2));
}
async function workflow(config){
 current={...config,checks:[],roles:new Set(),paymentSerial:0,status:'RUNNING'};report.workflows.push(current);console.log('START '+current.id+' '+current.title);
 await page.goto(origin+'/#/orders');await login(managerOnly?'manager':'exec');await action('Create purchase order');
 await select('vendorId','vendor-v30');await select('buyerId','u-exec');await select('priceListCurrency',config.currency);await select('currency',config.currency);await select('base-0','base-bs20');await fill('qty-0-GJ',config.quantity);await fill('baseprice-0',config.unitPrice);await select('terms',config.terms);await fill('planningTat','75');await fill('number',current.id+'-TEST');
 if(await page.locator('[name=productionOverrideReason]').count())await fill('productionOverrideReason','Isolated test product commitment.');
 await fill('notes','ISOLATED BROWSER TEST. No real purchase or payment.');await submit();check('Draft created from Base Item and brand quantity',order().lines.length===1);
 await action('Submit for approval');check(managerOnly?'Purchase Manager can approve submitted PO':'Executive PO approval visibility follows the current policy',!!await page.getByRole('button',{name:'Approve & issue',exact:true}).count()===managerOnly);
 if(!delegated)await login('manager');await action('Approve & issue');check('Authorized actor issued immutable PO revision',order().revisions.length===1);check('Missing approved PLM remains an explicit warning',await page.getByText('PLM specification not available',{exact:false}).count()>0);
 if(current.operator==='exec')await login('exec');
 await response('Supplier PO acknowledgement','supplier-response');check('Supplier acknowledgement retains selected files',order().confirmation.fileIds.length===(config.multiple?2:1));
 await action('Record supplier PI');await fill('number',current.id+'-PI');await files('pi');await page.locator('[name=termsConfirmed]').check();await page.locator('[name=commitmentConfirmed]').check();await submit();await action('Verify PI');
 if(current.operator==='exec'&&!false){check('Executive verifies PI but cannot give final approval',order().pi.verifiedBy==='Purchase Executive'&&await page.getByRole('button',{name:'Approve PI',exact:true}).count()===0);await login('manager');}
 await action('Approve PI');check('PI received, verified and approved',order().pi.status==='APPROVED');
 if(current.operator==='exec')await login('exec');
 await response('Technical specification confirmation','technical-response');
 if(managerOnly)check('Purchase Manager records supplier technical confirmation',order().technicalConfirmation?.revision===order().revision);
 await response('Submit artwork','artwork');
 if(managerOnly&&!managerRelaxed){await recordManagerBoundary();return;}
 if(current.operator==='exec'&&!false)check('Executive submits artwork but cannot approve it',await page.getByRole('button',{name:'Approve artwork',exact:true}).count()===0);if(!delegated&&!managerRelaxed)await login('product');await action('Approve artwork');await login(current.operator||'manager');await response('Supplier artwork confirmation','artwork-response');check('Artwork approval and supplier artwork acknowledgement complete',!!order().artwork.supplierConfirmed);
 if(await page.getByRole('button',{name:'Complete payment',exact:true}).count()){
  await action('Complete payment');await select('currency',config.currency);const advance=config.terms==='30-70'?0.3:0.1;await fill('amount',(config.quantity*config.unitPrice*advance).toFixed(2));await fill('invoiceRate','1');await fill('inrRate',config.currency==='CNY'?'12':'85');await fill('reference',current.id+'-ADV');await files('advance');await fill('remarks','Isolated test initial remittance.');await submit();
 }
 check('Production lead time starts after applicable payment/commercial gates',!!order().productionWindowStartedAt);await screenshot('commercial');
 await response('Record sample completion','sample');await action('Approve pre-production sample');await fill('remarks','Isolated sample approved.');await submit();
 await action('Start bulk production');await fill('remarks','Isolated bulk production start.');await submit();await response('Record bulk QC','bulk-qc');await action('Complete production');await fill('remarks','Isolated production completed after QC.');await submit();check('Sample approval, bulk QC PASS and production completed',order().bulkQc.result==='PASS'&&!!order().productionCompletedAt);
 for(const [index,quantity] of config.shipments.entries()){
  const seq=index+1;await overview();await action('Plan shipment');await fill('number',current.id+'-SHIP-'+seq);await fill('shipqty-0',quantity);await submit();
  // Use shipment cards so the second shipment does not accidentally target the first one.
  await page.locator('[data-action=tab][data-value=shipments]').click();
  let sh=order().shipments.at(-1);const clickShip=async a=>{await page.locator('[data-action="'+a+'"][data-shipment="'+sh.id+'"]').first().click();};
  await clickShip('container-book');await page.locator('[name=forwarderId]').selectOption({index:1});await fill('forwarderRef',current.id+'-REF-'+seq);await fill('freightUsd','3800');await page.locator('[name=rateRouteKey]').selectOption({index:1});await fill('remarks','Isolated container booking.');await submit();
  await clickShip('container-release');await fill('container',current.id.replace('-','')+'C'+seq+'1234567');await fill('remarks','Isolated empty-container release.');await submit();
  await clickShip('tracking-milestone');await select('milestone','INLAND_ORIGIN');await select('status','COMPLETED');await fill('actualDate',new Date().toISOString().slice(0,10));await fill('location','Test inland origin');await fill('remarks','Isolated inland departure.');await submit();
  for(const type of ['COMMERCIAL_INVOICE','PACKING_LIST']){await clickShip('document');await select('type',type);await select('shipmentId',sh.id);await files(type.toLowerCase()+'-'+seq);await submit();}
  // Shipment-triggered obligations must be reported before vessel loading.
  await settleOutstanding();await page.locator('[data-action=tab][data-value=shipments]').click();
  await clickShip('dispatch');await fill('vessel','ISOLATED TEST VESSEL');await fill('voyage',current.id+'-'+seq);await fill('remarks','Isolated vessel loading.');await submit();
  await clickShip('bl');await fill('number',current.id+'-BL-'+seq);await files('final-bl-'+seq);await fill('remarks','Isolated final BL verified.');await submit();
  await clickShip('insurance');await fill('masterPolicy','TEST-MASTER-POLICY');await fill('declarationNumber',current.id+'-INS-'+seq);await fill('insuredValue',quantity*config.unitPrice);await files('insurance-'+seq);await fill('remarks','Isolated shipment insurance record.');await submit();
  await clickShip('arrival');await fill('remarks','Isolated Chennai port arrival.');await submit();
  check('Shipment '+seq+' completed booking → release → tracking → CI/PL → vessel → BL → insurance → arrival',!!order().shipments.find(s=>s.id===sh.id).actualArrival);
  if(index<config.shipments.length-1)check('Partial arrival leaves the order open',orderStatus(order())!=='PORT_ARRIVED');
  await settleOutstanding();
 }
 // Record actual supplier realization separately from reported bank remittances.
 await page.locator('.tab[data-action=tab][data-value=finance]').click();
 const payments=store.read().payments.filter(p=>p.allocations.some(a=>a.orderId===order().id));
 for(const p of payments)for(const a of p.allocations){await page.locator('[data-action=receipt][data-payment="'+p.id+'"][data-allocation="'+a.id+'"]').click();await fill('realizedAmount',(a.expectedMinor/100).toFixed(2));await fill('supplierRate','1');await files('realization-'+p.reference);await fill('remarks','Isolated supplier receipt acknowledgement.');await submit();}
 const final=order(),state=store.read(),finance=financials(state,final);check('All quantities arrived at India port',orderStatus(final)==='PORT_ARRIVED'&&shipmentTotals(final).arrived===config.quantity);check('Supplier realizations settle original-order balance',finance.balance===0&&finance.pending===0);
 check('Every recorded evidence file has a retained body',final.documents.every(d=>store.fileBytes(d.fileId)?.length>0));if(delegated){check('Only Purchase Executive performed the complete workflow',current.roles.size===1&&current.roles.has('exec'));for(const type of ['APPROVE_ORDER','APPROVE_PI','APPROVE_ARTWORK','AUTHORIZE_PAYMENT'])check('Executive delegation audited for '+type,state.events.some(e=>e.entityId===final.id&&e.actorId==='u-exec'&&e.approvalPolicy?.command===type));}else if(managerRelaxed){check('Only Purchase Manager performed all workflow actions',current.roles.size===1&&current.roles.has('manager'));check('All order audit events identify Purchase Manager',state.events.filter(e=>e.entityId===final.id).every(e=>e.actorId===managerId));}else check('All three operational roles participated',['exec','manager','product'].every(r=>current.roles.has(r)));
 if(current.operator==='exec'){
  const actions=['SUPPLIER_CONFIRMED','PI_RECORDED','PI_VERIFIED','TECHNICAL_SPEC_CONFIRMED','ARTWORK_SUBMITTED','ARTWORK_SUPPLIER_CONFIRMED','INITIAL_PAYMENT_COMPLETED','PREPRODUCTION_SAMPLE_COMPLETED','PRODUCTION_STARTED','BULK_QC_RECORDED','PAYMENT_REPORTED','LOADED_ON_VESSEL','BL_RECORDED','SHIPMENT_INSURED','PORT_ARRIVAL','SUPPLIER_RECEIPT'];
  for(const action of actions)check('Audit confirms Executive performed '+action,state.events.some(e=>e.entityId===final.id&&e.action===action&&e.actorId==='u-exec'));
  check('Every uploaded document is attributed to Purchase Executive',final.documents.every(d=>d.uploadedBy==='Purchase Executive'));
 }
 await overview();await screenshot('complete');current.summary={orderNumber:final.number,status:orderStatus(final),quantity:config.quantity,shipments:final.shipments.length,payments:payments.length,documents:final.documents.length,balanceMinor:finance.balance,financialStatus:finance.status};current.status='PASS';current.roles=[...current.roles];
 writeFileSync(join(out,'report.json'),JSON.stringify(report,(_,v)=>v instanceof Set?[...v]:v,2));
}
let origin;
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;
 const {chromium}=await import(process.env.FH_PLAYWRIGHT_MODULE||pathToFileURL(resolve('test-output/ui-tools/node_modules/playwright/index.mjs')).href);
 browser=await chromium.launch({headless:process.env.FH_HEADED!=='1',executablePath:process.env.CHROMIUM_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 context=await browser.newContext({viewport:{width:1500,height:1100}});await context.tracing.start({screenshots:true,snapshots:true});page=await context.newPage();page.setDefaultTimeout(12000);
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.url().includes('/api/')&&r.status()>=400)report.networkFailures.push({status:r.status(),path:new URL(r.url()).pathname});});
 for(const s of scenarios)await workflow(s);
 assert.deepEqual(report.errors,[]);if(managerOnly&&!managerRelaxed){const denied=report.networkFailures.filter(x=>x.status===403&&x.path==='/api/commands');const loginPrompts=report.networkFailures.filter(x=>x.status===401&&x.path==='/api/bootstrap');assert.equal(denied.length,scenarios.length);assert.equal(loginPrompts.length,1,'Initial unauthenticated bootstrap shows login');assert.equal(report.networkFailures.length,denied.length+loginPrompts.length,'No unexpected API failures');}if(managerRelaxed)assert.ok(report.networkFailures.every(x=>x.status===401&&x.path==='/api/bootstrap'),'No unexpected API failures');report.status=managerOnly&&!managerRelaxed?'BLOCKED_BY_ROLE':'PASS';report.verificationStatus='PASS';console.log(JSON.stringify({status:report.status,workflows:report.workflows.map(w=>w.summary),out},null,2));
}catch(e){report.status='FAIL';report.failure=String(e.stack||e);if(current){current.status='FAIL';current.failure=e.message;}console.error(report.failure);if(page){await page.screenshot({path:join(out,'failure.png'),fullPage:true}).catch(()=>{});writeFileSync(join(out,'failure-page.txt'),await page.locator('body').innerText().catch(()=>''));}process.exitCode=1;
}finally{report.finished=new Date().toISOString();writeFileSync(join(out,'report.json'),JSON.stringify(report,(_,v)=>v instanceof Set?[...v]:v,2));await context?.tracing.stop({path:join(out,'trace.zip')}).catch(()=>{});await browser?.close();await new Promise(r=>server.close(r));store.close();console.log('Evidence: '+out);}
