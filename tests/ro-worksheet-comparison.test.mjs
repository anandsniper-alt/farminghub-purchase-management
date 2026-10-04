import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {validateRoRecord,calculateRoCosting,worksheetComparisonSummary} from '../shared/ro-costing.mjs';
import {importantRoDocuments} from '../shared/ro-documents.mjs';
import {RoCostingStore} from '../server/ro-costing-store.mjs';
import {Store} from '../server/store.mjs';
import {emptyState,makeServer} from '../server/index.mjs';
import {createRoCostingUI} from '../web/ro-costing.mjs';

const fixture=()=>({ro:'SYNTHETIC-RO',supplier:'Synthetic supplier',invoices:[{supplier:'Synthetic supplier',invoice:'SYNTHETIC-CI',currency:'USD',goods:100,extras:0,face:100}],actuals:{supplierInr:9000,bankNet:100,forwarderNet:500,otherNet:0,bcd:300,sws:30,currencyConfirmed:true,expenseCoverage:'Complete',confirmation:'Synthetic verified fixture only.'}});
const side=()=>({rate:99.123456789,totalInr:null,goodsUsd:100,basis:'Accepted historical pooled reference; no invented total.',formula:'=(D28-D21)/G18',rows:[{label:'Actual tax source',value:300,unit:'INR',cell:'D28',formula:'=D26+D27',basis:'Source cached amount'},{label:'Calculated GST deduction',value:-18,unit:'INR',cell:'D21',formula:'=D19*18%',basis:'Retain source formula independently'},{label:'Unknown charge',value:null,unit:'INR',cell:'D22',formula:'',basis:'Missing source amount'},{label:'Confirmed nil charge',value:0,unit:'INR',cell:'D23',formula:'',basis:'Explicit source zero'}]});
const comparison=()=>({version:1,status:'Historical reference',basis:'Source worksheet reference, not actual payment verification.',reviewedOn:'2026-10-04',source:'Synthetic test source',selectedWorkingIds:['SYNTHETIC:1'],ai:side(),suresh:{...side(),rate:101.987654321},workings:[{id:'SYNTHETIC:1',invoice:'SYNTHETIC-CI',supplier:'Synthetic supplier',status:'Historical reference',basis:'Invoice source working',source:{file:'synthetic.xlsx',sheet:'Synthetic invoice ',sha256:'a'.repeat(64)},ai:side(),suresh:side()}]});

test('legacy record shape and verified actual calculation survive comparison round trips',()=>{
 const legacy=validateRoRecord(fixture());assert.equal(Object.hasOwn(legacy,'worksheetComparison'),false);
 assert.deepEqual(validateRoRecord(JSON.parse(JSON.stringify(legacy))),legacy);
 const withReference=validateRoRecord({...legacy,worksheetComparison:comparison()});
 assert.deepEqual(calculateRoCosting(withReference),calculateRoCosting(legacy));
 assert.deepEqual(withReference.actuals,legacy.actuals);
 assert.equal(withReference.worksheetComparison.ai.rate,99.123456789);
 assert.equal(withReference.worksheetComparison.ai.totalInr,null);
 assert.equal(withReference.worksheetComparison.workings[0].suresh.rows[1].value,-18);
 assert.equal(withReference.worksheetComparison.workings[0].suresh.rows[2].value,null);
 assert.equal(withReference.worksheetComparison.workings[0].suresh.rows[3].value,0);
 assert.equal(withReference.worksheetComparison.workings[0].suresh.formula,'=(D28-D21)/G18');
 assert.deepEqual(validateRoRecord(JSON.parse(JSON.stringify(withReference))),withReference);
 for(const key of ['supplierInr','bankNet','forwarderNet','otherNet','bcd','sws']){
  const missing=structuredClone(withReference);missing.actuals[key]=null;assert.equal(calculateRoCosting(missing).rate,null);
 }
});

test('worksheet references reject bad identities, rates, bounds, paths and unlabelled completion',()=>{
 const check=mutate=>{const c=comparison();mutate(c);assert.throws(()=>validateRoRecord({...fixture(),worksheetComparison:c}));};
 check(c=>c.selectedWorkingIds=['missing']);check(c=>c.workings.push(c.workings[0]));check(c=>c.selectedWorkingIds.push('SYNTHETIC:1'));
 check(c=>c.ai.rate=Infinity);check(c=>c.ai.rate=-1);check(c=>c.suresh.rate=0);check(c=>c.ai.totalInr=-1);
 check(c=>c.workings[0].source.file='C:\\private\\source.xlsx');check(c=>c.workings[0].source.file='/tmp/source.xlsx');
 check(c=>c.workings[0].source.sha256='wrong');check(c=>c.status='Complete');check(c=>c.status='Pending');
 check(c=>c.reviewedOn='2026-02-31');check(c=>c.workings[0].ai.rows=Array(601).fill(side().rows[0]));
 check(c=>c.workings[0].ai.rows=Array.from({length:50},()=>({...side().rows[0],basis:'x'.repeat(4000)})));
 const pending=comparison();pending.status='Pending';pending.selectedWorkingIds=[];pending.ai.rate=null;pending.suresh.rate=null;
 assert.equal(validateRoRecord({...fixture(),worksheetComparison:pending}).worksheetComparison.ai.rate,null);
});

test('important evidence recognises only explicitly labelled importer copies and preserves other classifications',()=>{
 const files=[{id:'ci',name:'ci.pdf',kind:'Commercial invoice'},{id:'boe',name:'123-inward.pdf',kind:'Assessed BOE'},{id:'dta',name:'456-dta.pdf',kind:'Assessed BOE'},{id:'importer',name:'importer.pdf',kind:'Importer copy'},{id:'ooc',name:'OOC.pdf',kind:'Out of Charge'},{id:'agent',name:'agent.pdf',kind:'Forwarding agent invoice — Yasuda'}];
 const original=structuredClone(files),grouped=importantRoDocuments({boe:'123'},files);
 assert.deepEqual(grouped.importerCopies.map(f=>f.id),['importer']);assert.deepEqual(grouped.inwardBoe.map(f=>f.id),['boe']);assert.deepEqual(grouped.otherBoe.map(f=>f.id),['dta']);
 assert.equal(grouped.forwarderInvoices.length,1);assert.deepEqual(files,original);
});

test('SQLite persists comparisons, keeps older-editor omission, revisions and actual isolation',()=>{
 const dir=mkdtempSync(join(tmpdir(),'fh-worksheet-')),store=new Store(join(dir,'synthetic.sqlite'),emptyState()),module=new RoCostingStore(store);
 try{
  const record=validateRoRecord({...fixture(),worksheetComparison:comparison()});
  module.import('admin',{records:[{record,expectedRevision:0}],reason:'Synthetic reference import'},randomUUID());
  const first=module.detail('admin',record.ro);assert.deepEqual(first.record.worksheetComparison,record.worksheetComparison);
  assert.deepEqual(module.list('admin').rows[0].worksheetComparison,worksheetComparisonSummary(record));
  const oldEditor=fixture();module.import('admin',{records:[{record:oldEditor,expectedRevision:1}],reason:'Older editor actual correction'},randomUUID());
  const next=module.detail('admin',record.ro);assert.deepEqual(next.record.worksheetComparison,record.worksheetComparison);assert.deepEqual(next.cost,calculateRoCosting(fixture()));assert.equal(next.history.length,2);
  assert.throws(()=>module.import('admin',{records:[{record,expectedRevision:1}],reason:'Stale import'},randomUUID()),/changed/);
  assert.throws(()=>store.db.exec('DELETE FROM ro_costing_events'),/append-only/);
 }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});

const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function hostFor(record,sandbox){
 const files=[{id:'ci',name:'synthetic.pdf',kind:'Commercial invoice'},{id:'agent',name:'archived-agent.pdf',kind:'Forwarding agent invoice — Yasuda'}];
 const entry={record,revision:1,history:[]},context={user:{id:'admin',role:'ADMIN',scopes:['LAE_IMPORT']},ui:{view:'ro-costings',orderId:record.ro},sandbox};
 const stored={['synthetic:ro-costings:admin']:JSON.stringify({[record.ro]:entry})};
 globalThis.localStorage={getItem:k=>stored[k],setItem:(k,v)=>stored[k]=v};globalThis.window={FH_RO_REVIEW_DOCUMENTS:{[record.ro]:files}};globalThis.requestAnimationFrame=()=>{};
 const detail={...entry,cost:calculateRoCosting(record),importantDocuments:importantRoDocuments(record,files),documents:{rows:files,total:files.length,offset:0}};
 const host={context:()=>context,api:async()=>context.ui.orderId?detail:{total:1,rows:[{ro:record.ro,supplier:record.supplier,invoices:record.invoices.map(i=>i.invoice),documents:1,...calculateRoCosting(record),worksheetComparison:worksheetComparisonSummary(record)}]},esc:escape,field:()=>'',button:()=>'<button>Action</button>',head:(a,b,c)=>`<h1>${b}</h1><p>${c}</p>`,ph:(a,b,c='')=>`<h2>${a}</h2><p>${b}</p>${c}`,note:s=>`<p>${s}</p>`,badge:s=>`<span>${escape(s)}</span>`,showDialog:()=>{},render:()=>{},closeModal:()=>{},toast:()=>{},csv:()=>{},reviewStore:'synthetic'};
 return {host,context};
}
for(const sandbox of [false,true])test(`reference rendering preserves separate source formulas and actual status (${sandbox?'standalone':'server'})`,async()=>{
 const record=validateRoRecord({...fixture(),worksheetComparison:comparison()});record.actuals.bankNet=null;
 record.worksheetComparison.workings[0].suresh.rows[0].formula='=<script>synthetic</script>';
 const {host,context}=hostFor(record,sandbox),ui=createRoCostingUI(host);await ui.action('ro-refresh',{});
 const html=ui.page();assert.match(html,/Worksheet AI workings/);assert.match(html,/Suresh original workings/);assert.match(html,/Historical reference/);assert.match(html,/Verified actual AI INR \/ USD/);assert.match(html,/Actual bank charges is missing/);
 assert.match(html,/=&lt;script&gt;synthetic&lt;\/script&gt;/);assert.doesNotMatch(html,/<script>/);assert.match(html,/\(D28-D21\)\/G18/);assert.match(html,/Importer copy/);assert.match(html,/Retained document archive/);assert.match(html,/archived-agent.pdf/);assert.doesNotMatch(html.split('<summary>Retained document archive')[0],/archived-agent.pdf/);
 context.ui.orderId='';await ui.action('ro-refresh',{});const list=ui.page();assert.match(list,/Worksheet AI INR \/ USD/);assert.match(list,/Worksheet Suresh INR \/ USD/);assert.match(list,/Historical reference/);assert.match(list,/Verified actual AI INR \/ USD/);
});

test('standalone archive pagination stays local and legacy imports retain comparison evidence',async()=>{
 const record=validateRoRecord({...fixture(),worksheetComparison:comparison()}),{host,context}=hostFor(record,true);
 host.api=async()=>{throw Error('Standalone review must not call the server.');};
 window.FH_RO_REVIEW_DOCUMENTS[record.ro]=Array.from({length:101},(_,n)=>({id:'synthetic-'+n,name:'synthetic-'+n+'.pdf',kind:'Supporting document',bytes:12}));
 const elements={'ro-document-list':{},'ro-import-preview':{}};globalThis.document={getElementById:id=>elements[id]};
 const ui=createRoCostingUI(host);await ui.action('ro-refresh',{});await ui.action('ro-doc-page',{offset:100});assert.match(elements['ro-document-list'].innerHTML,/synthetic-100.pdf/);assert.doesNotMatch(elements['ro-document-list'].innerHTML,/synthetic-99.pdf/);
 context.ui.modal='ro-import';const prepared=JSON.stringify({records:[{record:fixture(),expectedRevision:1}]});
 await ui.change({name:'file',files:[{size:prepared.length,text:async()=>prepared}]});
 const FormDataOriginal=globalThis.FormData;globalThis.FormData=class{constructor(form){return new Map(Object.entries(form));}};
 try{await ui.submit('ro-import',{}, {reason:'Synthetic older-editor import'});}finally{globalThis.FormData=FormDataOriginal;}
 const saved=JSON.parse(localStorage.getItem('synthetic:ro-costings:admin'))[record.ro];assert.equal(saved.revision,2);assert.deepEqual(saved.record.worksheetComparison,record.worksheetComparison);
});

test('exact combined RO identifiers retain interior spaces through expenses, persistence and routing',async()=>{
 const ro='SYNTHETIC-A - SYNTHETIC-B',input={...fixture(),ro,expenses:[{document_no:'SYNTHETIC-EXPENSE',ros:[ro]}]},record=validateRoRecord(input);
 assert.equal(record.ro,ro);assert.deepEqual(record.expenses[0].ros,[ro]);
 for(const invalid of [' '+ro,ro+' ',ro+'\t',ro+'\n','SYNTHETIC\tA','SYNTHETIC/A','SYNTHETIC\\A','SYNTHETIC\x7fA'])assert.throws(()=>validateRoRecord({...input,ro:invalid}),/exact RO/);
 const dir=mkdtempSync(join(tmpdir(),'fh-joint-ro-')),store=new Store(join(dir,'synthetic.sqlite'),emptyState()),module=new RoCostingStore(store),server=makeServer(store,{log:()=>{}});
 try{
  store.addAccount('admin','synthetic@example.test','Synthetic-local-test-password');
  module.import('admin',{records:[{record,expectedRevision:0}],reason:'Preserve synthetic combined identity'},randomUUID());
  assert.equal(module.detail('admin',ro).record.ro,ro);assert.equal(module.list('admin').rows[0].ro,ro);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
  const login=await fetch(base+'/api/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({email:'synthetic@example.test',password:'Synthetic-local-test-password'})});assert.equal(login.status,200);
  const cookie=login.headers.get('set-cookie').split(';')[0],response=await fetch(base+'/api/ro-costings/record?ro='+encodeURIComponent(ro),{headers:{Cookie:cookie}});assert.equal(response.status,200);
  const detail=await response.json();assert.equal(detail.record.ro,ro);assert.deepEqual(detail.record.expenses[0].ros,[ro]);
  const {host,context}=hostFor(record,true),ui=createRoCostingUI(host);context.ui.orderId='';await ui.action('ro-refresh',{});assert.ok(ui.page().includes('href="#/ro-costings/'+encodeURIComponent(ro)+'"'));
 }finally{if(server.listening)await new Promise(resolve=>server.close(resolve));store.close();rmSync(dir,{recursive:true,force:true});}
});
