import {roCode} from '../shared/ro-costing.mjs';
import {validateRoDriveUrl,RO_ESSENTIAL_DOCUMENT_KINDS} from '../shared/ro-documents.mjs';

/** Convert an audited private manifest without retaining its local paths or raw metadata. */
export function prepareRoDriveReferences(manifest){
 if(!Array.isArray(manifest?.documents))throw Error('A verified individual-document manifest is required.');
 const references=[],seen=new Map();
 for(const d of manifest.documents){
  if(d.status!=='verified'||!RO_ESSENTIAL_DOCUMENT_KINDS.includes(d.document_kind)||!Array.isArray(d.ro_raw)||!d.ro_raw.length)throw Error('Every document needs a verified essential role and exact RO associations.');
  const link=validateRoDriveUrl(d.webViewLink);
  if(link.fileId!==d.drive_id||d.metadata?.id&&d.metadata.id!==d.drive_id)throw Error('Observed Drive identity differs.');
  const {sha256,bytes}=d.artifact||{};
  if(!/^[a-f0-9]{64}$/.test(sha256||'')||!Number.isSafeInteger(bytes)||bytes<1||bytes>50*1024*1024||d.metadata?.size&&Number(d.metadata.size)!==bytes)throw Error('Verified artifact size or checksum is invalid.');
  if(d.metadata?.permissions?.some(p=>p.type!=='user'||p.role!=='owner'))throw Error('Manifest does not retain owner-only sharing.');
  const name=d.metadata?.name||String(d.artifact.path||'').split(/[\\/]/).at(-1);
  if(!name||name.length>200||/[\x00-\x1f\\/]/.test(name)||!name.toLowerCase().endsWith('.pdf'))throw Error('Essential references require a PDF basename.');
  for(const ro of new Set(d.ro_raw.map(roCode))){
   const id=ro+'\u0000'+link.fileId,reference={ro,name,kind:d.document_kind,driveUrl:link.url,sha256,bytes,reason:'Link individually uploaded source PDF from verified private Drive manifest'};
   const old=seen.get(id);if(old&&JSON.stringify(old)!==JSON.stringify(reference))throw Error('Conflicting exact-RO Drive file associations.');
   if(!old){seen.set(id,reference);references.push(reference);}
  }
 }
 return references;
}
