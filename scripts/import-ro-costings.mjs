/** Private, resumable import through the same authenticated API as the UI.
 * Credentials are read from FH_RO_IMPORT_EMAIL / FH_RO_IMPORT_PASSWORD.
 * No raw mail, local paths or document bodies enter static assets or Git.
 */
import {readFileSync,realpathSync,statSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,relative,isAbsolute,dirname} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {validateRoRecord,calculateRoCosting} from '../shared/ro-costing.mjs';
import {planRoImport} from './ro-import-plan.mjs';
import {isDeepStrictEqual} from 'node:util';
import {validateRoDriveUrl,RO_ESSENTIAL_DOCUMENT_KINDS} from '../shared/ro-documents.mjs';

const [url,inputFile,libraryRoot]=process.argv.slice(2);
if(!url||!inputFile||!libraryRoot)throw Error('Usage: node scripts/import-ro-costings.mjs <site-url> <prepared-private-json> <RO-library-root>');
const target=new URL(url);if(target.protocol!=='https:'&&!['127.0.0.1','localhost','[::1]'].includes(target.hostname))throw Error('Use HTTPS for a remote import.');
if(!process.env.FH_RO_IMPORT_EMAIL||!process.env.FH_RO_IMPORT_PASSWORD)throw Error('Set the private import email and password environment variables.');
const payload=JSON.parse(readFileSync(inputFile,'utf8')),root=realpathSync(libraryRoot),records=payload.records.map(e=>validateRoRecord(e.record));
if(!records.length||records.length>30)throw Error('Import 1–30 RO costings per reviewed batch.');
if(new Set(records.map(r=>r.ro)).size!==records.length)throw Error('Duplicate exact RO identity.');
const mode=payload.mode||'record';
let cookie='',csrf='';
async function call(path,data,key){const res=await fetch(new URL(path,target),{redirect:'error',method:data?'POST':'GET',headers:{Origin:target.origin,Cookie:cookie,'X-CSRF-Token':csrf,'Content-Type':'application/json',...(key?{'Idempotency-Key':key}:{})},body:data?JSON.stringify(data):undefined});const result=await res.json();if(!res.ok)throw Error(result.error||'Import failed.');if(path==='/api/login')cookie=res.headers.get('set-cookie')?.split(';')[0]||'';return result;}
const key=(kind,data)=>'ro-'+kind+'-'+createHash('sha256').update(JSON.stringify(data)).digest('hex');
const report={at:new Date().toISOString(),mode,records:[],documents:[],driveDocuments:[],essentialDocumentGaps:[],snapshots:[],complete:false};
// Keep each attempt's pre-write snapshots; reruns must not erase recovery evidence.
const reportFile=resolve(dirname(inputFile),'ro-website-import-'+key('batch',{site:target.origin,payload})+'-'+randomUUID()+'.json');
const saveReport=()=>{mkdirSync(dirname(reportFile),{recursive:true,mode:0o700});writeFileSync(reportFile,JSON.stringify(report,null,2),{mode:0o600});};
async function documents(ro){
 const rows=[];let offset=0;
 for(;;){const page=await call('/api/ro-costings/documents?ro='+encodeURIComponent(ro)+'&offset='+offset);rows.push(...page.rows);offset+=page.rows.length;if(offset>=page.total)return rows;if(!page.rows.length)throw Error('Document pagination ended prematurely.');}
}
async function verifyDocument(id,sha256){
 const res=await fetch(new URL('/api/ro-costings/files/'+encodeURIComponent(id),target),{redirect:'error',headers:{Cookie:cookie}});
 if(!res.ok)throw Error('Document read-back failed.');
 const bytes=Buffer.from(await res.arrayBuffer());
 if(createHash('sha256').update(bytes).digest('hex')!==sha256)throw Error('Stored document checksum differs.');
}
try{
 await call('/api/login',{email:process.env.FH_RO_IMPORT_EMAIL,password:process.env.FH_RO_IMPORT_PASSWORD});csrf=(await call('/api/bootstrap')).csrf;
 report.health=await call('/api/health');
 if(report.health.status!=='ok')throw Error('Target storage is not healthy.');
 if(!['127.0.0.1','localhost','[::1]'].includes(target.hostname)&&(!/^[a-f0-9]{40}$/i.test(payload.expectedReleaseSha||'')||report.health.releaseSha!==payload.expectedReleaseSha))throw Error('Set expectedReleaseSha to the verified deployed candidate before a remote import.');
 const plans=[],files=new Map(),preparedDocuments=[];
 const driveDocuments=(payload.driveDocuments||[]).map(doc=>{
  if(!records.some(r=>r.ro===doc.ro)||!RO_ESSENTIAL_DOCUMENT_KINDS.includes(doc.kind)||typeof doc.name!=='string'||!doc.name.toLowerCase().endsWith('.pdf')||doc.name.length>200||/[\x00-\x1f\\/]/.test(doc.name)||!/^[a-f0-9]{64}$/.test(doc.sha256)||!Number.isSafeInteger(doc.bytes)||doc.bytes<1||doc.bytes>50*1024*1024||typeof doc.reason!=='string'||!doc.reason.trim()||doc.reason.length>2000)throw Error('Invalid essential Drive reference or exact RO association.');
  return {...doc,driveUrl:validateRoDriveUrl(doc.driveUrl).url};
 });
 const sourceLibrary=payload.sourceLibrary?{...payload.sourceLibrary,driveUrl:validateRoDriveUrl(payload.sourceLibrary.driveUrl,{library:true}).url}:null;
 if(sourceLibrary){report.sourceLibraryBefore=(await call('/api/ro-costings/source-library')).sourceLibrary;saveReport();sourceLibrary.skip=report.sourceLibraryBefore?.name===sourceLibrary.name&&report.sourceLibraryBefore?.driveUrl===sourceLibrary.driveUrl;if(typeof sourceLibrary.name!=='string'||!sourceLibrary.name.trim()||sourceLibrary.name.length>200||typeof sourceLibrary.reason!=='string'||!sourceLibrary.reason.trim()||sourceLibrary.reason.length>2000||(!sourceLibrary.skip&&sourceLibrary.expectedSequence!==(report.sourceLibraryBefore?.sequence||0)))throw Error('Review the source library name, reason and current sequence.');}
 // Snapshot and preflight the entire bounded batch before the first write.
 for(const record of records){
  let detail=null;try{detail=await call('/api/ro-costings/record?ro='+encodeURIComponent(record.ro));}catch(e){if(e.message!=='RO costing not found.')throw e;}
  const list=detail?await documents(record.ro):[];files.set(record.ro,list);
  report.snapshots.push({ro:record.ro,before:detail,documents:list});saveReport();
  const creation=payload.records.find(e=>e.record.ro===record.ro).creationRecord;
  if(creation){const checked=validateRoRecord(creation);if(checked.ro!==record.ro||!isDeepStrictEqual(checked.worksheetComparison,record.worksheetComparison))throw Error('Creation record differs from its exact RO comparison patch.');}
  plans.push(planRoImport(!detail&&creation?creation:record,detail,mode));
 }
 const driveInputs=new Map();
 for(const doc of driveDocuments){const fileId=validateRoDriveUrl(doc.driveUrl).fileId,key=doc.ro+'\u0000'+fileId,metadata={name:doc.name,sha256:doc.sha256,kind:doc.kind,bytes:doc.bytes};if(driveInputs.has(key)&&!isDeepStrictEqual(driveInputs.get(key),metadata))throw Error('Conflicting duplicate Drive inputs.');driveInputs.set(key,metadata);const old=files.get(doc.ro).find(f=>f.storage==='google-drive'&&validateRoDriveUrl(f.driveUrl).fileId===fileId);if(old&&(old.name!==doc.name||old.sha256!==doc.sha256||old.kind!==doc.kind||old.bytes!==doc.bytes))throw Error('Existing Drive reference conflicts with the reviewed manifest.');}
 const localInputRoles=new Map();
 for(const doc of payload.documents||[]){
  if(!['Commercial invoice','Inward BOE','Importer copy'].includes(doc.kind)||!doc.name?.toLowerCase().endsWith('.pdf'))throw Error('Upload only individually reviewed essential PDF documents.');
  if(!records.some(r=>r.ro===doc.ro))throw Error('Document RO is outside this import.');
  const path=realpathSync(doc.libraryPath),rel=relative(root,path);if(rel.startsWith('..')||isAbsolute(rel)||rel.split(/[\\/]/)[0]!==doc.ro)throw Error('Document is outside its exact RO library folder.');
  const stats=statSync(path);if(!stats.isFile()||!stats.size||stats.size>50*1024*1024)throw Error('Document must be a non-empty file up to 50 MB.');
  const bytes=readFileSync(path),hash=createHash('sha256').update(bytes).digest('hex');if(hash!==doc.sha256)throw Error('Document checksum failed.');
  if(bytes.subarray(0,5).toString()!=='%PDF-')throw Error('Essential document is not a PDF.');
  const localKey=doc.ro+'\u0000'+hash;if(localInputRoles.has(localKey)&&localInputRoles.get(localKey)!==doc.kind)throw Error('Duplicate input bytes have conflicting reviewed roles.');localInputRoles.set(localKey,doc.kind);
  const matches=files.get(doc.ro).filter(f=>f.storage!=='google-drive'&&f.sha256===hash);
  const existing=matches.find(f=>f.kind===doc.kind)||matches[0];
  const reclassify=existing&&existing.kind!==doc.kind;
  if(reclassify&&(typeof doc.classificationReason!=='string'||!doc.classificationReason.trim()))throw Error('Existing matching document needs an explicit reviewed classification reason before import.');
  if(reclassify&&(!Number.isSafeInteger(doc.expectedClassificationSequence)||doc.expectedClassificationSequence!==existing.classificationSequence))throw Error('Reviewed document classification sequence differs.');
  preparedDocuments.push({doc,path,hash,existing,reclassify});
 }
 const writes=plans.filter(p=>p.action!=='skipped');
 if(writes.length){const input={records:writes.map(({record,expectedRevision})=>({record,expectedRevision})),reason:payload.reason||'Add reviewed worksheet references without changing actuals'};await call('/api/ro-costings/import',input,key('record-batch',input));}
 for(const plan of plans){const detail=await call('/api/ro-costings/record?ro='+encodeURIComponent(plan.record.ro));if(!isDeepStrictEqual(detail.record,plan.record))throw Error('Record read-back differs for '+plan.record.ro+'.');const w=detail.record.worksheetComparison;report.records.push({ro:plan.record.ro,action:plan.action,status:calculateRoCosting(detail.record).status,worksheetStatus:w?.status||'Pending',aiReference:w?.ai.rate!=null,sureshReference:w?.suresh.rate!=null,revision:detail.revision,verified:true});saveReport();}
 for(const {doc,path,hash,existing,reclassify} of preparedDocuments){
  const bytes=readFileSync(path);if(createHash('sha256').update(bytes).digest('hex')!==hash)throw Error('Document changed after preflight.');
  const input={ro:doc.ro,name:doc.name,kind:doc.kind,base64:bytes.toString('base64'),sha256:hash};
  if(reclassify){const classification={id:existing.id,sha256:hash,kind:doc.kind,reason:doc.classificationReason,expectedSequence:doc.expectedClassificationSequence};await call('/api/ro-costings/document-classification',classification,key('classification',classification));}
  const duplicate=report.documents.find(d=>d.ro===doc.ro&&d.sha256===hash);
  if(duplicate&&duplicate.kind!==doc.kind)throw Error('Duplicate input bytes have conflicting reviewed roles.');
  const out=existing||duplicate||await call('/api/ro-costings/files',input,key('document',{ro:doc.ro,name:doc.name,kind:doc.kind,hash}));
  const stored=(await documents(doc.ro)).find(f=>f.id===out.id);if(!stored||stored.sha256!==hash||stored.kind!==doc.kind)throw Error('Document metadata read-back differs.');
  await verifyDocument(out.id,hash);report.documents.push({ro:doc.ro,name:doc.name,kind:doc.kind,sha256:hash,id:out.id,action:reclassify?'reclassified':existing||duplicate?'skipped':'created',verified:true});saveReport();
 }
 for(const doc of driveDocuments){
  const out=await call('/api/ro-costings/drive-documents',doc,key('drive-document',doc));
  const stored=(await documents(doc.ro)).find(f=>f.id===out.id);
  if(!stored||stored.storage!=='google-drive'||stored.sha256!==doc.sha256||stored.kind!==doc.kind||stored.bytes!==doc.bytes)throw Error('Drive reference read-back differs.');
  validateRoDriveUrl(stored.driveUrl);
  report.driveDocuments.push({ro:doc.ro,id:out.id,driveUrl:stored.driveUrl,sha256:doc.sha256,kind:doc.kind,verifiedMetadata:true,driveBytesVerifiedInThisRun:false});saveReport();
 }
 if(sourceLibrary){const {skip,...input}=sourceLibrary;const saved=skip?report.sourceLibraryBefore:await call('/api/ro-costings/source-library',input,key('source-library',input));const current=(await call('/api/ro-costings/source-library')).sourceLibrary;if(!isDeepStrictEqual(saved,current)||current.driveUrl!==sourceLibrary.driveUrl||current.name!==sourceLibrary.name)throw Error('Source library read-back differs.');report.sourceLibrary=current;saveReport();}
 for(const plan of plans){const detail=await call('/api/ro-costings/record?ro='+encodeURIComponent(plan.record.ro));if(!isDeepStrictEqual(detail.record,plan.record))throw Error('Final record read-back differs for '+plan.record.ro+'.');const d=detail.importantDocuments;report.essentialDocumentGaps.push({ro:plan.record.ro,commercialInvoiceMissing:!d.commercialInvoices.length,inwardBoeMissing:!d.inwardBoe.length,importerCopyMissing:!d.importerCopies.length});}
 report.counts={created:report.records.filter(r=>r.action==='created').length,updated:report.records.filter(r=>r.action==='updated').length,skipped:report.records.filter(r=>r.action==='skipped').length,pending:report.records.filter(r=>r.status==='Pending').length,worksheetPending:report.records.filter(r=>r.worksheetStatus==='Pending').length,worksheetAiReferences:report.records.filter(r=>r.aiReference).length,worksheetSureshReferences:report.records.filter(r=>r.sureshReference).length,documentsCreated:report.documents.filter(d=>d.action==='created').length,documentsSkipped:report.documents.filter(d=>d.action==='skipped').length,documentsReclassified:report.documents.filter(d=>d.action==='reclassified').length,driveReferencesVerified:report.driveDocuments.length};
 report.complete=true;saveReport();console.log(JSON.stringify(report.counts));
}catch(error){report.error=error.message;throw error;}finally{if(cookie)await call('/api/logout',{}).catch(()=>{});saveReport();}
