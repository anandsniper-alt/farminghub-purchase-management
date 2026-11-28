import {spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {approvedSpec,orderTotal,RuleError,scopeAllowed} from '../shared/domain.mjs';
import {softwareReference} from '../shared/references.mjs';
import {COMPANY} from '../shared/company-profile.mjs';
import {poAllocationSummary,poCurrencyAmounts,poPrintHtml,poPrintOptions,poPrintSource} from '../web/po-print.mjs';

const logo='data:image/png;base64,'+readFileSync(new URL('../web/assets/farming-hub-logo.png',import.meta.url)).toString('base64');
const maxInputBytes=4*1024*1024;
const maxOutputBytes=24*1024*1024;
let activeRenders=0;

export function purchaseOrderDownload(state,actor,encodedId,searchParams,format){
 let id;
 try{id=decodeURIComponent(encodedId);}catch{throw new RuleError('Order not found.','NOT_FOUND');}
 const order=state.orders.find(row=>row.id===id&&row.scope==='LAE_IMPORT');
 // The retained detail continues to permit scoped reads after recoverable deletion.
 if(!order||!scopeAllowed(actor,order.scope))throw new RuleError('Order not found.','NOT_FOUND');

 const requested=searchParams.getAll('revision');
 if(requested.length>1||(requested.length&&!/^(0|[1-9]\d{0,15})$/.test(requested[0])))throw new RuleError('Select a valid purchase order revision.');
 const revisionIndex=requested.length?Number(requested[0]):undefined;
 if(revisionIndex!==undefined&&!Number.isSafeInteger(revisionIndex))throw new RuleError('Select a valid purchase order revision.');
 const revisions=order.revisions||[];
 const selectedIndex=revisionIndex??revisions.length-1;
 const selected=revisions[selectedIndex];
 if((revisionIndex!==undefined||revisions.length||!['DRAFT','PENDING_APPROVAL'].includes(order.status))&&!selected?.snapshot){
  throw new RuleError('The saved purchase order revision is unavailable.','NOT_FOUND');
 }

 const reference=softwareReference(state,'orders',order.id);
 const data=poPrintSource(order,{revisionIndex,reference,demo:state.demo,
  vendor:!selected?state.vendors.find(row=>row.id===order.vendorId&&row.scopes?.some(scope=>scopeAllowed(actor,scope))):undefined,
  specificationForLine:line=>{
   const base=state.bases.find(row=>row.id===line.baseId);
   return base&&scopeAllowed(actor,base.scope)?approvedSpec(state,line.baseId,line.specId):undefined;
  }});
 const number=String(data.snapshot.number||reference||'Purchase-Order').normalize('NFKC')
  .replace(/[^A-Za-z0-9._-]+/g,'-').slice(0,120).replace(/^[._-]+|[._-]+$/g,'');
 const revisionNumber=Number.isSafeInteger(data.revision)&&data.revision>=0?data.revision:selectedIndex;
 const suffix=data.issued?`rev-${revisionNumber}`:'draft';
 const payload=format==='pdf'?poPrintHtml(data,poPrintOptions(data.snapshot,logo)):JSON.stringify(workbookData(data));
 if(Buffer.byteLength(payload)>maxInputBytes)throw new RuleError('The purchase order is too large to download.');
 return {payload,filename:`${number||'Purchase-Order'}-${suffix}.${format}`};
}

function workbookData({snapshot:s,...data}){
 const allocation=poAllocationSummary(s),dual=poCurrencyAmounts(s),options=poPrintOptions(s);
 const currency=s.currency||'',currencies=dual?['CNY','USD']:[currency];
 // Store scaled integers as strings so JSON and the writer never round converted values again.
 const scaled=(value,places=2)=>value==null?null:[String(value),places];
 return {
  company:COMPANY.name,number:s.number||'Unnumbered draft',status:data.issued?'ISSUED':'DRAFT / NOT ISSUED',
  revision:data.revision,date:data.date,actor:data.actor,reference:data.reference,demo:data.demo,
  vendorName:s.vendor?.name,vendorCode:s.vendor?.code,incoterm:s.incoterm,arrival:s.requestedPortDate,
  terms:options.terms,currency,currencies,fx:dual?.rateText||options.fx,mismatch:dual?.mismatch,
  remarks:s.notes,manifest:s.attachments?.flatMap(d=>d.name?[d.name+(d.fileId?' / '+d.fileId:'')]:[])||[],
  quantity:allocation.quantity,totals:currencies.map(c=>scaled(dual?dual.totals[c]:s.totalMinor??allocation.value)),
  lines:allocation.rows.map(({line,allocations,remaining},i)=>({
   code:line.code,name:line.name,category:line.category,quantity:line.quantity,base:line.baseItemCode||line.baseCode,
   specification:line.specification?.description,packaging:line.artworkNotes,remaining,
   nativeUnit:scaled(line.unitPriceMinor),allocations:allocations.map(a=>[a.quantity,scaled(a.value)]),
   prices:currencies.map(c=>{
    const converted=dual?.rows[i][c];
    if(!dual)return [scaled(line.unitPriceMinor),scaled(orderTotal({lines:[line]}))];
    return converted?[c===currency?scaled(line.unitPriceMinor):scaled(converted.unit,4),scaled(converted.amount)]:[null,null];
   })
  })),
  allocation:{centres:allocation.centres.map(c=>[c.id,c.name,c.quantity,scaled(c.value)]),
   legacyCentre:s.costCenter,errors:allocation.errors,allocatedQuantity:allocation.allocatedQuantity,
   allocatedValue:scaled(allocation.allocatedValue),total:scaled(s.totalMinor??allocation.value),
   valueMismatch:(s.totalMinor??allocation.value)!==allocation.value}
 };
}

export const renderPurchaseOrderPdf=(input,options)=>renderDownload(input,'pdf',options);
export const renderPurchaseOrderXlsx=(input,options)=>renderDownload(input,'xlsx',options);

async function renderDownload(input,format,{signal}={}){
 if(signal?.aborted)throw signal.reason;
 const failureMessage=format==='pdf'?'The purchase order PDF could not be prepared. Try again or use Print PO.':'The purchase order Excel file could not be prepared. Try again.';
 if(activeRenders>=2)throw new RuleError('Purchase order downloads are being prepared. Try again shortly.','DOWNLOAD_UNAVAILABLE');
 const script=fileURLToPath(new URL(`./purchase-order-${format}.py`,import.meta.url));
 activeRenders++;
 try{
  return await new Promise((resolve,reject)=>{
   const child=spawn(process.env.FH_PYTHON||'python3',[script],{windowsHide:true,stdio:['pipe','pipe','ignore'],signal,timeout:25_000,killSignal:'SIGKILL'});
   const chunks=[];
   let length=0,spawnFailed=false;
   child.stdout.on('data',chunk=>{
    length+=chunk.length;
    if(length>maxOutputBytes)child.kill('SIGKILL');
    else chunks.push(chunk);
   });
   child.stdin.on('error',()=>{});
   child.on('error',()=>{spawnFailed=true;});
   child.on('close',code=>{
    if(spawnFailed||code!==0||length>maxOutputBytes){
     reject(new RuleError(failureMessage,'DOWNLOAD_UNAVAILABLE'));
     return;
    }
    resolve(Buffer.concat(chunks,length));
   });
   child.stdin.end(input,'utf8');
  });
 }finally{activeRenders--;}
}
