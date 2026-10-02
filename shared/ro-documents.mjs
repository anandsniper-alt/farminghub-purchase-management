export const RO_FORWARDING_AGENTS=['Yasuda','World Gates','Future Consol'];
export const RO_AGENT_DOCUMENT_TYPES=['Forwarding agent invoice','Forwarding agent proforma (provisional)','Forwarding agent debit note'];
export function forwardingAgentDocument(kind=''){
 for(const agent of RO_FORWARDING_AGENTS)for(const type of RO_AGENT_DOCUMENT_TYPES)if(kind===`${type} — ${agent}`)return {agent,type};
 return null;
}
/** A named party must be the issuer, not merely the recipient of another agent's bill. */
export function importantRoDocuments(record,files=[]){
 const commercialInvoices=[],forwarderInvoices=[],inwardBoe=[],otherBoe=[];
 for(const file of files){
  if(/^Commercial invoice(?:$| \()/i.test(file.kind||''))commercialInvoices.push(file);
  else if(forwardingAgentDocument(file.kind))forwarderInvoices.push({...file,agent:forwardingAgentDocument(file.kind).agent});
  else if(file.kind==='Inward BOE')inwardBoe.push(file);
  else if(file.kind==='Assessed BOE'){
   const reference=String(record.boe||'');
   if(reference&&file.name.startsWith(reference))inwardBoe.push(file);
   else otherBoe.push(file);
  }
 }
 const matched=new Set((record.invoices||[]).map(i=>i.sha256).filter(Boolean));
 commercialInvoices.sort((a,b)=>Number(matched.has(b.sha256))-Number(matched.has(a.sha256))||a.name.localeCompare(b.name));
 return {commercialInvoices,forwarderInvoices,inwardBoe,otherBoe};
}
