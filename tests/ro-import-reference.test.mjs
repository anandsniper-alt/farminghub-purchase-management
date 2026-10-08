import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readdirSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {planRoImport} from '../scripts/ro-import-plan.mjs';
import {validateRoRecord,calculateRoCosting} from '../shared/ro-costing.mjs';
import {emptyState,makeServer} from '../server/index.mjs';
import {Store} from '../server/store.mjs';
import {RoCostingStore} from '../server/ro-costing-store.mjs';

const ro='5589 - 5595',side={rate:98.123456789,totalInr:null,goodsUsd:100,basis:'Accepted pooled source reference'};
const comparison={version:1,status:'Historical reference',ai:side,suresh:{...side,rate:101.987654321},selectedWorkingIds:[],workings:[]};
const reference=()=>validateRoRecord({ro,supplier:'Synthetic incoming supplier',worksheetComparison:comparison,actuals:{}});
const actual=()=>validateRoRecord({ro,supplier:'Preserved supplier',invoices:[{supplier:'Preserved supplier',invoice:'Synthetic CI',currency:'USD',goods:100,extras:0,face:100}],actuals:{supplierInr:9000,bankNet:1,forwarderNet:2,otherNet:3,bcd:4,sws:5,expenseCoverage:'Complete',currencyConfirmed:true,confirmation:'Synthetic confirmed source'},notes:'Preserve existing actual notes'});

test('reference plan retains every existing actual field, rejects conflicting sources and fabricated new actuals',()=>{
 const existing={record:actual(),revision:7},before=structuredClone(existing),plan=planRoImport(reference(),existing,'worksheetComparison');
 assert.equal(plan.expectedRevision,7);assert.equal(plan.action,'updated');
 assert.deepEqual(plan.record,{...existing.record,worksheetComparison:reference().worksheetComparison});
 assert.deepEqual(calculateRoCosting(plan.record),calculateRoCosting(existing.record));assert.deepEqual(existing,before);
 assert.equal(planRoImport(reference(),{record:plan.record,revision:8},'worksheetComparison').action,'skipped');
 assert.throws(()=>planRoImport({...reference(),worksheetComparison:{...comparison,ai:{...side,rate:99}}},{record:plan.record,revision:8},'worksheetComparison'),/Conflicting/);
 assert.throws(()=>planRoImport({...reference(),actuals:{supplierInr:500}},null,'worksheetComparison'),/actual payments/);
 assert.throws(()=>planRoImport(reference(),existing),/already differs/);
});

test('purchase references are additive, retry-safe and cannot replace reviewed items or actuals',()=>{
 const purchaseItems={version:1,basis:'Synthetic original purchase rows',reviewedOn:'2026-10-08',rows:[{id:'line-1',supplier:'Preserved supplier',invoice:'Synthetic CI',itemCode:'GJ-TEST',masterCode:'TEST',description:'Synthetic item',quantity:2,unit:'pcs',currency:'USD',unitPrice:50,usdUnitPrice:50,status:'Verified reference',source:{file:'synthetic.xlsx',sheet:'Purchases',row:'2'}}]};
 const incoming=validateRoRecord({...reference(),purchaseItems}),existing={record:actual(),revision:7};
 const plan=planRoImport(incoming,existing,'purchaseReferences');
 assert.equal(plan.action,'updated');assert.deepEqual(plan.record.actuals,existing.record.actuals);assert.deepEqual(plan.record.invoices,existing.record.invoices);
 assert.deepEqual(plan.record.purchaseItems,incoming.purchaseItems);assert.deepEqual(calculateRoCosting(plan.record),calculateRoCosting(existing.record));
 assert.equal(planRoImport(incoming,{record:plan.record,revision:8},'purchaseReferences').action,'skipped');
 const changed=structuredClone(incoming);changed.purchaseItems.rows[0].quantity=3;
 assert.throws(()=>planRoImport(changed,{record:plan.record,revision:8},'purchaseReferences'),/Conflicting existing purchase/);
 assert.throws(()=>planRoImport(reference(),existing,'purchaseReferences'),/require purchaseItems/);
 const legacy=planRoImport(reference(),{record:plan.record,revision:8},'worksheetComparison');assert.deepEqual(legacy.record.purchaseItems,incoming.purchaseItems);
});

test('authenticated reference import preserves actuals/history, verifies bytes, skips same-RO hash duplicates and retains attempt snapshots',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'fh-reference-import-')),store=new Store(join(dir,'db.sqlite'),emptyState()),module=new RoCostingStore(store);
 store.addAccount('admin','synthetic@example.test','Synthetic-test-only-password');
 module.import('admin',{records:[{record:actual(),expectedRevision:0}],reason:'Synthetic baseline'});
 const before=module.detail('admin',ro),main=JSON.stringify(store.read()),server=makeServer(store,{log:()=>{}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const library=join(dir,'library');mkdirSync(join(library,ro),{recursive:true});
 const bytes=Buffer.from('%PDF-1.4\nSynthetic isolated document\n'),hash=createHash('sha256').update(bytes).digest('hex'),path=join(library,ro,'invoice.pdf');writeFileSync(path,bytes);
 const input=join(dir,'payload.json'),payload={mode:'worksheetComparison',reason:'Synthetic additive references',records:[{record:reference()}],documents:[{ro,kind:'Commercial invoice',name:'invoice.pdf',sha256:hash,libraryPath:path}]};
 writeFileSync(input,JSON.stringify(payload));
 const run=()=>promisify(execFile)(process.execPath,[resolve('scripts/import-ro-costings.mjs'),'http://127.0.0.1:'+server.address().port,input,library],{env:{...process.env,FH_RO_IMPORT_EMAIL:'synthetic@example.test',FH_RO_IMPORT_PASSWORD:'Synthetic-test-only-password'}});
 try{
  await run();const updated=module.detail('admin',ro);
  assert.deepEqual(updated.record.actuals,before.record.actuals);assert.equal(updated.revision,2);assert.equal(updated.history.length,2);assert.deepEqual(updated.cost,before.cost);assert.equal(JSON.stringify(store.read()),main);
  payload.documents[0].name='same-bytes-alternate-name.pdf';writeFileSync(input,JSON.stringify(payload));await run();
  assert.equal(module.detail('admin',ro).revision,2);assert.equal(module.documents('admin',ro).total,1);
  const reports=readdirSync(dir).filter(n=>n.startsWith('ro-website-import-')).map(n=>JSON.parse(readFileSync(join(dir,n))));
  assert.equal(reports.length,2);assert.ok(reports.every(r=>r.complete&&r.documents[0].verified));
  const first=reports.find(r=>r.counts.updated===1),retry=reports.find(r=>r.counts.skipped===1);
  assert.deepEqual(first.snapshots[0].before.record,before.record);assert.equal(retry.counts.documentsSkipped,1);
  assert.equal(first.counts.pending,0);assert.equal(first.counts.worksheetPending,0);assert.equal(first.counts.worksheetAiReferences,1);assert.equal(first.counts.worksheetSureshReferences,1);
  assert.deepEqual(first.essentialDocumentGaps,[{ro,commercialInvoiceMissing:false,inwardBoeMissing:true,importerCopyMissing:true}]);
  const document=module.documents('admin',ro).rows[0],classification={id:document.id,sha256:hash,kind:'Inward BOE',reason:'Synthetic explicit page-scope review',expectedSequence:0};
  const classified=module.classify('admin',classification,'synthetic-classification-key');
  assert.deepEqual(module.classify('admin',classification,'synthetic-classification-key'),classified);
  assert.throws(()=>module.classify('admin',{...classification,kind:'Importer copy'},'synthetic-stale-classification'),/changed/);
  assert.throws(()=>module.classify('admin',{...classification,sha256:'0'.repeat(64),expectedSequence:classified.sequence},'synthetic-wrong-checksum'),/checksum/);
  assert.deepEqual(Buffer.from(module.download('admin',document.id).body),bytes);assert.equal(module.detail('admin',ro).revision,2);
  payload.documents[0].classificationReason='Synthetic original invoice source verified';payload.documents[0].expectedClassificationSequence=classified.sequence;
  writeFileSync(input,JSON.stringify(payload));await run();
  assert.equal(module.documents('admin',ro).rows[0].kind,'Commercial invoice');assert.equal(module.documents('admin',ro).rows[0].originalKind,'Commercial invoice');
  const classificationReport=readdirSync(dir).filter(n=>n.startsWith('ro-website-import-')).map(n=>JSON.parse(readFileSync(join(dir,n)))).find(r=>r.counts?.documentsReclassified===1);assert.ok(classificationReport);
  const newRecord={...reference(),ro:'NEW-SYNTHETIC',supplier:'New synthetic supplier'};
  payload.records.push({record:{ro:newRecord.ro,worksheetComparison:newRecord.worksheetComparison},creationRecord:newRecord});
  payload.driveDocuments=[{ro:newRecord.ro,name:'synthetic-private.pdf',kind:'Inward BOE',driveUrl:'https://drive.google.com/file/d/syntheticFileId12345/view',sha256:hash,bytes:bytes.length,reason:'Synthetic verified individual Drive PDF'}];
  payload.sourceLibrary={name:'Synthetic learning package',driveUrl:'https://drive.google.com/file/d/syntheticLearning12345/view',reason:'Synthetic verified learning package',expectedSequence:0};
  writeFileSync(input,JSON.stringify(payload));await run();await run();
  assert.equal(module.detail('admin',newRecord.ro).revision,1);assert.equal(module.detail('admin',newRecord.ro).record.supplier,'New synthetic supplier');assert.equal(module.detail('admin',newRecord.ro).record.actuals.supplierInr,null);
  assert.equal(module.documents('admin',newRecord.ro).total,1);assert.equal(module.sourceLibrary('admin').sequence,1);
  const driveReport=readdirSync(dir).filter(n=>n.startsWith('ro-website-import-')).map(n=>JSON.parse(readFileSync(join(dir,n)))).find(r=>r.counts?.created===1);
  assert.equal(driveReport.counts.pending,1);assert.equal(driveReport.counts.worksheetPending,0);assert.equal(driveReport.driveDocuments[0].driveBytesVerifiedInThisRun,false);assert.equal(driveReport.essentialDocumentGaps.find(g=>g.ro===newRecord.ro).inwardBoeMissing,false);
  // Existing external metadata must not masquerade as a locally stored body.
  mkdirSync(join(library,newRecord.ro));const newPath=join(library,newRecord.ro,'inward.pdf');writeFileSync(newPath,bytes);
  payload.documents.push({ro:newRecord.ro,name:'inward.pdf',kind:'Inward BOE',sha256:hash,libraryPath:newPath});writeFileSync(input,JSON.stringify(payload));await run();
  assert.equal(module.documents('admin',newRecord.ro).total,2);const combined=module.detail('admin',newRecord.ro).importantDocuments.inwardBoe;assert.equal(combined.length,1);assert.equal(combined[0].storage,'local');assert.ok(combined[0].driveUrl);assert.deepEqual(Buffer.from(module.download('admin',combined[0].id).body),bytes);
  // A conflict anywhere in the preflighted batch must prevent creating another RO.
  payload.records=[{record:{...reference(),ro:'NEVER-CREATED-SYNTHETIC'}},{record:{...reference(),worksheetComparison:{...comparison,ai:{...side,rate:199}}}}];payload.documents=[];payload.driveDocuments=[];delete payload.sourceLibrary;
  writeFileSync(input,JSON.stringify(payload));await assert.rejects(run(),/Conflicting existing/);
  assert.throws(()=>module.detail('admin','NEVER-CREATED-SYNTHETIC'),/not found/);assert.equal(module.detail('admin',ro).revision,2);
  payload.records=[{record:{...reference(),ro:'NEVER-CREATED-SYNTHETIC'}}];const d={...payload.driveDocuments[0],ro:'NEVER-CREATED-SYNTHETIC',name:'synthetic.pdf',kind:'Commercial invoice',driveUrl:'https://drive.google.com/file/d/syntheticDuplicate123/view',sha256:hash,bytes:bytes.length,reason:'Synthetic reviewed duplicate test'};payload.driveDocuments=[d,{...d,kind:'Inward BOE'}];
  writeFileSync(input,JSON.stringify(payload));await assert.rejects(run(),/Conflicting duplicate Drive/);assert.throws(()=>module.detail('admin','NEVER-CREATED-SYNTHETIC'),/not found/);
 }finally{await new Promise(r=>server.close(r));store.close();rmSync(dir,{recursive:true,force:true});}
});
