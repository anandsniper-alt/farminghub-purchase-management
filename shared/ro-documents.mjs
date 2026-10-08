import {RuleError} from './domain.mjs';
export const RO_FORWARDING_AGENTS=['Yasuda','World Gates','Future Consol'];
export const RO_AGENT_DOCUMENT_TYPES=['Forwarding agent invoice','Forwarding agent proforma (provisional)','Forwarding agent debit note'];
export const RO_ESSENTIAL_DOCUMENT_KINDS=['Commercial invoice','Inward BOE','Importer copy'];
/** Only canonical Drive resource URLs; no arbitrary host, redirect or download URL. */
export function validateRoDriveUrl(value,{library=false}={}){
 if(typeof value!=='string'||value.length>600||value.trim()!==value)throw new RuleError('Provide a canonical private Google Drive link.');
 const pattern=library?/^https:\/\/drive\.google\.com\/(?:drive\/folders\/([A-Za-z0-9_-]{10,200})|file\/d\/([A-Za-z0-9_-]{10,200})\/view)(?:\?usp=(?:drivesdk|sharing))?$/:/^https:\/\/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]{10,200})\/view(?:\?usp=(?:drivesdk|sharing))?$/;
 const match=value.match(pattern);if(!match)throw new RuleError('Use a Google Drive file view link'+(library?' or folder link':'')+'.');
 const url=new URL(value);return {url:url.origin+url.pathname,fileId:match[1]||match[2],resource:url.pathname.startsWith('/drive/')?'folder':'file'};
}
/** Build previews only from an already accepted private file-view URL. */
export function roDrivePreviewUrl(value){return 'https://drive.google.com/file/d/'+validateRoDriveUrl(value).fileId+'/preview';}
export function forwardingAgentDocument(kind=''){
 for(const agent of RO_FORWARDING_AGENTS)for(const type of RO_AGENT_DOCUMENT_TYPES)if(kind===`${type} — ${agent}`)return {agent,type};
 return null;
}
/** A named party must be the issuer, not merely the recipient of another agent's bill. */
export function importantRoDocuments(record,files=[]){
 const commercialInvoices=[],forwarderInvoices=[],inwardBoe=[],otherBoe=[],importerCopies=[];
 // One byte-identical document/role/RO card can offer local and Drive access.
 // The paginated archive and immutable stored metadata remain untouched.
 const cards=[],byDigest=new Map();
 for(const file of files){
  const key=/^[a-f0-9]{64}$/i.test(file.sha256||'')?[file.ro||record.ro||'',file.kind,file.sha256.toLowerCase()].join('\u0000'):null;
  const old=key?byDigest.get(key):null,links=file.storage==='google-drive'?[{id:file.id,url:file.driveUrl,name:file.name}]:[];
  if(old){const retained=cards[old.index],driveReferences=[...(retained.driveReferences||[]),...links];
   const primary=retained.storage==='google-drive'&&file.storage!=='google-drive'?file:retained;
   cards[old.index]={...primary,...(driveReferences.length?{driveReferences,driveUrl:driveReferences[0].url}:{})};
  }else{const card={...file,...(links.length?{driveReferences:links}:{})};cards.push(card);if(key)byDigest.set(key,{index:cards.length-1});}
 }
 for(const file of cards){
  if(/^Commercial invoice(?:$| \()/i.test(file.kind||''))commercialInvoices.push(file);
  else if(forwardingAgentDocument(file.kind))forwarderInvoices.push({...file,agent:forwardingAgentDocument(file.kind).agent});
  else if(file.kind==='Inward BOE')inwardBoe.push(file);
  else if(file.kind==='Importer copy')importerCopies.push(file);
  else if(file.kind==='Assessed BOE'){
   const reference=String(record.boe||'');
   if(reference&&file.name.startsWith(reference))inwardBoe.push(file);
   else otherBoe.push(file);
  }
 }
 const matched=new Set((record.invoices||[]).map(i=>i.sha256).filter(Boolean));
 commercialInvoices.sort((a,b)=>Number(matched.has(b.sha256))-Number(matched.has(a.sha256))||a.name.localeCompare(b.name));
 return {commercialInvoices,forwarderInvoices,inwardBoe,otherBoe,importerCopies};
}
