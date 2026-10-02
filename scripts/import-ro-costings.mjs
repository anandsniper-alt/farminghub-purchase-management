/** Private, resumable import through the same authenticated API as the UI.
 * Credentials are read from FH_RO_IMPORT_EMAIL / FH_RO_IMPORT_PASSWORD.
 * No raw mail, local paths or document bodies enter static assets or Git.
 */
import {readFileSync,realpathSync,statSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,relative,isAbsolute,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {validateRoRecord,calculateRoCosting} from '../shared/ro-costing.mjs';

const [url,inputFile,libraryRoot]=process.argv.slice(2);
if(!url||!inputFile||!libraryRoot)throw Error('Usage: node scripts/import-ro-costings.mjs <site-url> <prepared-private-json> <RO-library-root>');
const target=new URL(url);if(target.protocol!=='https:'&&!['127.0.0.1','localhost','[::1]'].includes(target.hostname))throw Error('Use HTTPS for a remote import.');
if(!process.env.FH_RO_IMPORT_EMAIL||!process.env.FH_RO_IMPORT_PASSWORD)throw Error('Set the private import email and password environment variables.');
const payload=JSON.parse(readFileSync(inputFile,'utf8')),root=realpathSync(libraryRoot),records=payload.records.map(e=>validateRoRecord(e.record));
if(!records.length||records.length>30)throw Error('Import 1–30 RO costings per reviewed batch.');
let cookie='',csrf='';
async function call(path,data,key){const res=await fetch(new URL(path,target),{redirect:'error',method:data?'POST':'GET',headers:{Origin:target.origin,Cookie:cookie,'X-CSRF-Token':csrf,'Content-Type':'application/json',...(key?{'Idempotency-Key':key}:{})},body:data?JSON.stringify(data):undefined});const result=await res.json();if(!res.ok)throw Error(result.error||'Import failed.');if(path==='/api/login')cookie=res.headers.get('set-cookie')?.split(';')[0]||'';return result;}
const key=(kind,data)=>'ro-'+kind+'-'+createHash('sha256').update(JSON.stringify(data)).digest('hex');
const report={at:new Date().toISOString(),records:[],documents:[],complete:false};
const reportFile=resolve(dirname(inputFile),'ro-website-import-result.json');
const saveReport=()=>{mkdirSync(dirname(reportFile),{recursive:true});writeFileSync(reportFile,JSON.stringify(report,null,2));};
try{
 await call('/api/login',{email:process.env.FH_RO_IMPORT_EMAIL,password:process.env.FH_RO_IMPORT_PASSWORD});csrf=(await call('/api/bootstrap')).csrf;
 for(const record of records){
  let existing=null;try{existing=(await call('/api/ro-costings/record?ro='+encodeURIComponent(record.ro))).record;}catch(e){if(e.message!=='RO costing not found.')throw e;}
  if(existing){if(JSON.stringify(existing)!==JSON.stringify(record))throw Error('RO '+record.ro+' already differs. Review it in the module; import will not overwrite it.');}
  else await call('/api/ro-costings/import',{records:[{record,expectedRevision:0}],reason:payload.reason||'Import reviewed RO document costing refresh'},key('record',record));
  report.records.push({ro:record.ro,status:calculateRoCosting(record).status});saveReport();
 }
 for(const doc of payload.documents||[]){
  if(!records.some(r=>r.ro===doc.ro))throw Error('Document RO is outside this import.');
  const path=realpathSync(doc.libraryPath),rel=relative(root,path);if(rel.startsWith('..')||isAbsolute(rel)||rel.split(/[\\/]/)[0]!==doc.ro)throw Error('Document is outside its exact RO library folder.');
  const stats=statSync(path);if(!stats.isFile()||!stats.size||stats.size>50*1024*1024)throw Error('Document must be a non-empty file up to 50 MB.');
  const bytes=readFileSync(path),hash=createHash('sha256').update(bytes).digest('hex');if(hash!==doc.sha256)throw Error('Document checksum failed.');
  const input={ro:doc.ro,name:doc.name,kind:doc.kind,base64:bytes.toString('base64'),sha256:hash};
  const out=await call('/api/ro-costings/files',input,key('document',{ro:doc.ro,name:doc.name,hash}));report.documents.push({ro:doc.ro,name:doc.name,sha256:hash,id:out.id});saveReport();
 }
 report.complete=true;saveReport();console.log('Imported '+report.records.length+' RO costings and '+report.documents.length+' separate documents. Final actuals remain pending as recorded.');
}finally{if(cookie)await call('/api/logout',{}).catch(()=>{});saveReport();}
