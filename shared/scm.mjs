import {normalizedDocumentReference as refKey} from './references.mjs';

export const SCM_STAGES = ['SHIPPING_DOCS','SAILING','BL','INDIA_ARRIVAL','COST_CAPTURE'];
export const SCM_RO_NUMBER_MAX_LENGTH = 120;
const clean = value => typeof value === 'string' ? value.trim() : '';
const lineKey = (orderId,lineId) => JSON.stringify([orderId,lineId]);

export function scmInvoiceDocumentReady(order,shipmentId,number){
 return (order.documents||[]).some(d=>d.type==='COMMERCIAL_INVOICE'&&d.shipmentId===shipmentId&&d.status==='FINAL'&&refKey(d.invoiceNumber)===refKey(number));
}

export function scmInvoiceCostReady(order,shipment,number){
 if(!shipment)return false;
 const final=(order.arrivalCostings||[]).find(c=>c.status==='FINAL'&&c.shipmentId===shipment.id&&c.invoiceKey===refKey(number));
 return !!final && shipment.lines.every(l=>final.lines.filter(x=>x.lineId===l.lineId).reduce((sum,x)=>sum+x.quantity,0)===l.quantity);
}

export function sharedScmOrders(state,orderIds){
 const selected=new Set(orderIds),out=[];
 for(const inv of state.scm?.invoices||[]){
  if(inv.cancelledAt||!inv.members.some(m=>selected.has(m.orderId)))continue;
  const ro=state.scm.ros.find(r=>r.id===inv.roId);
  if(ro?.stages.at(-1)?.stage==='COST_CAPTURE')continue;
  const invoices=ro?state.scm.invoices.filter(i=>i.roId===ro.id):[inv];
  for(const member of invoices.flatMap(i=>i.members)){
   if(!selected.has(member.orderId))out.push(state.orders.find(o=>o.id===member.orderId)?.number||member.orderId);
  }
 }
 return [...new Set(out)];
}

// Each command is applied to the domain transaction's private copy. Projection commands
// use the same accounting, evidence, authorization and date rules as historical POs.
export function applyScmCommand(state,type,p,ctx,services){
 const {check,find,plan,finishBookingTask,run,actual,log,evidence,attach,checkDate} = services;
 const records = state.scm ||= {invoices:[],ros:[]};
 const {invoices,ros} = records;
 const required = (v,label) => {
  const value=clean(v);
  check(value && value.length<=160 && !/[\x00-\x1f\x7f]/u.test(value) && refKey(value),label+' is required (maximum 160 characters).');
  return value;
 };
 const rows = (v,label) => {check(Array.isArray(v)&&v.length,label+' required.');return v;};
 const qty = value => {const n=Number(value);check(Number.isSafeInteger(n)&&n>0,'Enter a positive whole quantity.');return n;};
 const getInvoice = id => {const inv=invoices.find(i=>i.id===id);check(inv&&!inv.cancelledAt,'Select an active SCM invoice.');return inv;};
 const getRo = id => {const ro=ros.find(r=>r.id===id);check(ro,'Select an SCM RO.');return ro;};
 const roInvoices = ro => invoices.filter(i=>i.roId===ro.id);
 const details = inv => inv.members.map(m=>{
  const order=find(m.orderId),shipment=order.shipments.find(s=>s.id===m.shipmentId);
  check(shipment?.scmInvoiceId===inv.id && shipment.status!=='CANCELLED','The linked invoice shipment is unavailable.');
  return {order,shipment};
 });
 const project = (all,cmd,data) => {
  for(const inv of all)for(const {order,shipment} of details(inv))run(cmd,{...data,orderId:order.id,shipmentId:shipment.id});
 };
 const event = (list,summary,data) => {
  const orders=new Set(list.flatMap(i=>i.members.map(m=>m.orderId)));
  for(const id of orders)log(find(id),type,summary,null,structuredClone(data));
 };
 const stamp = {at:ctx.now,by:ctx.user.name};
 if(type==='SCM_BOOK_INVOICE'){
  const number=required(p.number,'Commercial invoice number'),bookingRef=required(p.bookingRef,'Booking reference');
  check(number.length<=120,'Invoice number must be 120 characters or fewer.');
  check(state.vendors.some(v=>v.id===p.forwarderId&&v.kind==='LOGISTICS'&&v.status==='ACTIVE'),'Select an active forwarding agent.');
  checkDate(p.etd,'ETD');checkDate(p.eta,'ETA');check(p.eta>=p.etd,'ETA cannot precede ETD.');
  const inv={id:ctx.id(),number,bookingRef,forwarderId:p.forwarderId,bookedAt:p.date,etd:p.etd,eta:p.eta,origin:clean(p.origin),destination:clean(p.destination),members:[],insurance:null,roId:null,followups:[],...stamp};
  const seen=new Set();
  for(const m of rows(p.members,'PO allocations')){
   const o=find(m.orderId);
   check(o.scope==='LAE_IMPORT' && o.revisions.length && !o.amendment && !o.manualClosed && o.productionCompletedAt && o.bulkQc?.result==='PASS','Select an issued open LAE import PO with production completed, bulk QC passed and no pending amendment.');
   actual(p.date,'Booking date',String(o.productionCompletedAt).slice(0,10));
   check(!seen.has(o.id),'Combine lines of one PO in one invoice allocation.');seen.add(o.id);
   inv.vendorId ||= o.vendorId;
   check(o.vendorId===inv.vendorId,'A commercial invoice must have a single supplier.');
   const allocated=new Map();
   for(const l of rows(m.lines,'Invoice lines')){
    check(o.lines.some(x=>x.id===l.lineId)&&!allocated.has(l.lineId),'Invalid or repeated PO line.');
    allocated.set(l.lineId,qty(l.quantity));
   }
   const lines=[...allocated].map(([lineId,quantity])=>({lineId,quantity}));
   const previous=invoices.filter(i=>i.vendorId===o.vendorId&&refKey(i.number)===refKey(number));
   check(previous.every(i=>i.cancelledAt),'This supplier invoice already has an SCM booking.');
   if(previous.length)inv.replacesInvoiceId=previous.at(-1).id;
   let s;
   if(m.shipmentId){
    s=o.shipments.find(x=>x.id===m.shipmentId);
    check(s && s.status==='PLANNED' && (!s.bookingStatus || s.bookingStatus==='PLANNED') && !s.scmInvoiceId && !s.roGroupId && !s.forwarderRef && !s.actualDeparture,'Choose an unbooked, ungrouped loading plan.');
    check(s.lines.length===allocated.size && s.lines.every(l=>allocated.get(l.lineId)===l.quantity),'Invoice quantities must match the saved loading plan.');
   }else s=plan(o,{number:'CI '+number+(previous.length?' (rebook '+previous.length+')':''),lines,etd:p.etd,eta:p.eta,origin:inv.origin,destination:inv.destination});
   check(!(o.documents||[]).some(d=>d.type==='COMMERCIAL_INVOICE'&&d.shipmentId===s.id&&refKey(d.invoiceNumber)!==refKey(number)),'This plan already belongs to a different commercial invoice.');
   Object.assign(s,{scmInvoiceId:inv.id,forwarderId:p.forwarderId,bookingDate:p.date,bookingStatus:'BOOKED',status:'BOOKED',etd:p.etd,eta:p.eta});
   if(m.shipmentId)finishBookingTask(o,s,'Container booked against invoice '+number);
   inv.members.push({orderId:o.id,shipmentId:s.id,lines});
  }
  const memberIds=new Set([...inv.members,...invoices.filter(i=>i.cancelledAt&&i.vendorId===inv.vendorId&&refKey(i.number)===refKey(number)).flatMap(i=>i.members)].map(m=>lineKey(m.orderId,m.shipmentId)));
  check(!state.orders.some(o=>o.vendorId===inv.vendorId&&(o.documents||[]).some(d=>d.type==='COMMERCIAL_INVOICE'&&refKey(d.invoiceNumber)===refKey(number)&&!memberIds.has(lineKey(o.id,d.shipmentId)))),'This supplier invoice already belongs to a different shipment.');
  invoices.push(inv);
  if(p.fileId){
   actual(p.invoiceDate,'Invoice date');check(p.invoiceDate<=p.date,'Invoice date cannot follow booking.');
   project([inv],'ATTACH_DOCUMENT',{type:'COMMERCIAL_INVOICE',invoiceNumber:number,invoiceDate:p.invoiceDate,fileId:p.fileId});
  }
  event([inv],'Commercial invoice booked for production-complete PO lines.',inv);
  return {id:inv.id,invoiceId:inv.id};
 }
 if(type==='SCM_CANCEL_INVOICE'){
  const inv=getInvoice(p.invoiceId),remarks=clean(p.remarks);
  check(!inv.roId,'Loaded invoices cannot be cancelled.');
  check(remarks&&remarks.length<=2000,'Enter the reason for cancelling this booking.');
  for(const {order,shipment} of details(inv)){
   check(!(order.paymentAuthorizations||[]).some(a=>!a.revokedAt&&a.shipmentId===shipment.id),'Revoke the active shipment payment authorization before cancelling this booking.');
  }
  project([inv],'CANCEL_SHIPMENT',{remarks});
  Object.assign(inv,{cancelledAt:ctx.now,cancelledBy:ctx.user.name,cancelReason:remarks});
  event([inv],'Invoice booking cancelled; its reserved PO quantities were released.',{invoiceId:inv.id,remarks});
  return {invoiceId:inv.id};
 }
 if(type==='SCM_INVOICE_DOCUMENT'){
  const inv=getInvoice(p.invoiceId);
  actual(p.invoiceDate,'Invoice date');
  check(p.invoiceDate<=inv.bookedAt,'Invoice date cannot follow booking.');
  check(!inv.roId || !getRo(inv.roId).stages.length,'Shipping documents already verified.');
  for(const {order,shipment} of details(inv)){
   const existing=order.documents.filter(d=>d.type==='COMMERCIAL_INVOICE'&&d.status==='FINAL'&&d.shipmentId===shipment.id);
   const f=evidence(p.fileId,order.id);
   if(existing.length){
    check(existing.some(d=>refKey(d.invoiceNumber)===refKey(inv.number)&&d.invoiceDate===p.invoiceDate&&d.fileId===f.id),'This shipment has different final commercial invoice evidence.');
    continue;
   }
   run('ATTACH_DOCUMENT',{type:'COMMERCIAL_INVOICE',invoiceNumber:inv.number,invoiceDate:p.invoiceDate,fileId:f.id,orderId:order.id,shipmentId:shipment.id});
  }
  return {invoiceId:inv.id};
 }
 if(type==='SCM_RELEASE_INVOICE'){
  const inv=getInvoice(p.invoiceId),reference=required(p.reference,'Container release reference');
  check(!inv.releasedAt,'Container release is already recorded.');actual(p.date,'Container release date',inv.bookedAt);
  for(const {shipment:s} of details(inv))Object.assign(s,{releaseDate:p.date,bookingStatus:'RELEASED',status:'RELEASED'});
  Object.assign(inv,{releasedAt:p.date,releaseRef:reference});
  event([inv],'Container release recorded for invoice '+inv.number+'.',{invoiceId:inv.id,date:p.date,reference});
  return {invoiceId:inv.id};
 }
 if(type==='SCM_LOAD_INVOICE'){
  const inv=getInvoice(p.invoiceId),number=required(p.roNumber,'Forwarder RO number');
  check(number.length<=SCM_RO_NUMBER_MAX_LENGTH,'Forwarder RO number must be 120 characters or fewer.');
  check(inv.releasedAt&&!inv.roId,'Release this invoice first; each invoice can be loaded once.');
  actual(p.date,'Loading date',inv.releasedAt);
  let ro=ros.find(r=>refKey(r.number)===refKey(number));
  if(ro){
   roInvoices(ro).forEach(details);
   check(!ro.stages.length,'This RO already advanced to shipping documents.');
   check(ro.forwarderId===inv.forwarderId,'All invoices on an RO must use the same forwarding agent.');
   check(!ro.destination || !inv.destination || refKey(ro.destination)===refKey(inv.destination),'All invoices on an RO must use the same destination.');
  }else{
   check(!state.orders.some(o=>(o.shipments||[]).some(s=>[s.roNumber,s.forwarderRef].some(n=>refKey(n)===refKey(number)))),'RO number is already used by historical shipping records.');
   ro={id:ctx.id(),number,forwarderId:inv.forwarderId,destination:inv.destination,blNumber:null,containers:[],stages:[],followups:[],...stamp};ros.push(ro);
  }
  const expected=new Map(inv.members.flatMap(m=>m.lines.map(l=>[lineKey(m.orderId,l.lineId),l.quantity])));
  const seen=new Set(),linked=details(inv);
  for(const c of rows(p.containers,'Container packing lists')){
   const containerNo=required(c.number,'Container number'),ck=refKey(containerNo),packingList=required(c.packingList,'Packing list reference'),pk=refKey(packingList);
   check(!seen.has(ck),'Combine packing lines for each container.');seen.add(ck);
   let stored=ro.containers.find(x=>refKey(x.number)===ck);
   check(!ro.containers.some(x=>refKey(x.number)!==ck && refKey(x.packingList)===pk),'Each container must have a separate packing list.');
   if(stored)check(refKey(stored.packingList)===pk,'Use the same packing list for all invoices in this container.');
   else{stored={number:containerNo,packingList,lines:[]};ro.containers.push(stored);}
   const lineIds=new Set(),orderIds=new Set();
   for(const l of rows(c.lines,'Container packing lines')){
    const key=lineKey(l.orderId,l.lineId),n=qty(l.quantity);
    check(expected.has(key)&&!lineIds.has(key)&&n<=expected.get(key),'Packing line exceeds or differs from its invoiced PO line.');
    expected.set(key,expected.get(key)-n);lineIds.add(key);orderIds.add(l.orderId);
    stored.lines.push({invoiceId:inv.id,orderId:l.orderId,lineId:l.lineId,quantity:n});
   }
   const fileId=c.packingListFileId || stored.packingListFileId;
   if(fileId){
    const allOwners=new Set(stored.lines.map(l=>l.orderId)),meta=state.files.find(f=>f.id===fileId&&f.scope==='LAE_IMPORT');
    // A later invoice can add another PO to a previously documented container.
    // Preserve its earlier file and require a shared final list at document verification.
    const shared=meta&&[...allOwners].every(oid=>meta.orderIds.includes(oid));
    check(!c.packingListFileId||shared,'The container packing list must belong to all POs packed into it.');
    if(stored.packingListFileId&&(!shared||stored.packingListFileId!==fileId)){
     (stored.previousPackingListFileIds||=[]).push(stored.packingListFileId);
     delete stored.packingListFileId;
    }
    if(shared){
     stored.packingListFileId=fileId;
     for(const {order,shipment} of linked.filter(x=>orderIds.has(x.order.id)))attach(order,evidence(fileId,order.id),'PACKING_LIST',shipment.id);
    }
   }
  }
  check([...expected.values()].every(v=>v===0),'Pack exactly the invoice quantities across the container lists.');
  Object.assign(inv,{roId:ro.id,loadedAt:p.date});
  for(const {order,shipment} of linked){
   const containers=ro.containers.filter(c=>c.lines.some(l=>l.invoiceId===inv.id&&l.orderId===order.id));
   Object.assign(shipment,{roGroupId:ro.id,scmRoId:ro.id,roNumber:ro.number,forwarderRef:ro.number,container:containers.map(c=>c.number).join(', ')});
  }
  event([inv],'Invoice loaded against RO '+ro.number+'.',{invoiceId:inv.id,roId:ro.id,date:p.date,containers:ro.containers.filter(c=>seen.has(refKey(c.number)))});
  return {invoiceId:inv.id,roId:ro.id};
 }
 if(type==='SCM_FOLLOWUP'){
  check(!!p.roId!==!!p.invoiceId,'Choose one invoice or RO for this follow-up.');
  const owner=p.roId?getRo(p.roId):getInvoice(p.invoiceId),group=p.roId?roInvoices(owner):[owner];
  check(p.roId||!owner.roId,'Enter follow-ups against the RO after loading.');
  const linked=group.flatMap(details);
  check(linked.length,'No purchase orders are linked to this follow-up.');
  actual(p.date,'Follow-up date',p.roId?group.map(i=>i.loadedAt).sort()[0]:owner.bookedAt);
  const remarks=clean(p.remarks);check(remarks&&remarks.length<=4000,'Enter follow-up remarks (maximum 4000 characters).');
  const nextDue=p.nextDue??'';
  if(nextDue!==''){
   checkDate(nextDue,'Next follow-up due date');
   check(nextDue>=p.date,'Next follow-up due date cannot precede the follow-up date.');
  }
  const assignedId=p.assignedOwnerId??'',assigned=assignedId===''?ctx.user:state.users.find(user=>user.id===assignedId);
  check(assigned&&assigned.active!==false&&linked.every(({order})=>services.canEdit(assigned,order)),
   'Select an active Purchase owner who can update every linked PO.');
  const note={id:ctx.id(),date:p.date,remarks,...(nextDue!==''?{nextDue}:{}),assignedOwnerId:assigned.id,assignedOwner:assigned.name,...stamp};
  owner.followups.push(note);
  event(group,'SCM follow-up recorded.',{ownerId:owner.id,...note});return {id:note.id};
 }
 if(type==='SCM_INSURE_INVOICE'){
  const inv=getInvoice(p.invoiceId),ro=getRo(inv.roId);
  check(!inv.insurance && ro.blNumber,'Record the final BL before invoice insurance.');check(Number(p.insuredValue)>0,'Enter the insured invoice value.');
  const reference=required(p.reference,'Insurance declaration');
  project([inv],'RECORD_INSURANCE',{...p,declarationNumber:reference});
  const members=details(inv);
  inv.insurance={...structuredClone(members[0].shipment.insurance),reference,date:p.date};
  for(const {shipment} of members){
   shipment.insurance.scmInvoiceId=inv.id;
   // The declared amount covers the invoice. A shipment from each contributing PO
   // needs proof of coverage, while the amount is stored once on their shared invoice.
   if(members.length>1)delete shipment.insurance.insuredValueMinor;
  }
  event([inv],'Insurance declaration recorded for invoice '+inv.number+'.',{invoiceId:inv.id,reference,date:p.date});
  return {invoiceId:inv.id};
 }
 if(type==='SCM_RO_STAGE'){
  const ro=getRo(p.roId),group=roInvoices(ro);
  check(group.length,'Load an invoice first.');group.forEach(details);
  check(SCM_STAGES[ro.stages.length]===p.stage && SCM_STAGES.includes(p.stage),'Record the next RO stage exactly once.');
  const floor=ro.stages.at(-1)?.date || group.map(i=>i.loadedAt).sort().at(-1);
  actual(p.date,'RO stage date',floor);
  const reference=clean(p.reference),remarks=clean(p.remarks);
  check(reference.length<=160 && remarks.length<=4000,'Reference or remarks are too long.');
  if(p.stage==='SHIPPING_DOCS'){
   for(const inv of group)for(const {order,shipment} of details(inv)){
    check(scmInvoiceDocumentReady(order,shipment.id,inv.number),'Attach the numbered invoice '+inv.number+' to its PO shipment before verifying documents.');
    const containers=ro.containers.filter(c=>c.lines.some(l=>l.invoiceId===inv.id&&l.orderId===order.id));
    for(const c of containers){
     const f=c.packingListFileId || p.packingListFiles?.find(x=>refKey(x.number)===refKey(c.number))?.fileId;
     check(f,'Attach the separate packing list for container '+c.number+'.');
     const file=evidence(f,order.id);
     check(!ro.containers.some(other=>other!==c&&other.packingListFileId===f),'Each container requires separate packing list evidence.');
     if(!order.documents.some(d=>d.type==='PACKING_LIST'&&d.shipmentId===shipment.id&&d.fileId===f))attach(order,file,'PACKING_LIST',shipment.id);
     c.packingListFileId=f;
    }
   }
   if(reference||p.fileId){
    check(reference&&p.fileId,'Provide both the draft BL number and its evidence.');
    project(group,'RECORD_BL_DRAFT',{...p,number:reference,remarks});
   }
  }else if(p.stage==='SAILING')project(group,'DISPATCH_SHIPMENT',p);
  else if(p.stage==='BL'){
   required(reference,'Final BL number');
   check(!ros.some(other=>other!==ro&&refKey(other.blNumber)===refKey(reference))&&!state.orders.some(o=>(o.shipments||[]).some(s=>s.scmRoId!==ro.id&&refKey(s.blNumber)===refKey(reference))),'The BL already belongs to another shipping record.');
   project(group,'RECORD_BL',{...p,number:reference});ro.blNumber=reference;
  }else if(p.stage==='INDIA_ARRIVAL'){
   check(group.every(i=>i.insurance&&i.insurance.date<=p.date),'Complete insurance for every invoice by the arrival date.');
   project(group,'ARRIVE_SHIPMENT',p);
  }else{
   for(const inv of group)for(const {order,shipment} of details(inv)){
    check(scmInvoiceCostReady(order,shipment,inv.number),'Finalize actual costing for all quantities of '+inv.number+' on '+order.number+' first.');
   }
  }
  const stage={stage:p.stage,date:p.date,reference,remarks,...stamp};
  for(const k of ['vessel','voyage','reason','fileId'])if(p[k])stage[k]=p[k];
  ro.stages.push(stage);event(group,'RO '+ro.number+' completed '+p.stage.replaceAll('_',' ').toLowerCase()+'.',{roId:ro.id,...stage});return {roId:ro.id};
 }
 check(false,'Unknown SCM command.');
}

// A forwarder status is a report, never verification of an official BL, sailing or arrival.
export function recordScmTrackingReport(state,row,batch,ctx,log){
 const matched=state.orders.find(o=>o.id===row.match.orderId)?.shipments.find(s=>s.id===row.match.shipmentId);
 if(!matched?.scmRoId)return false;
 const ro=state.scm.ros.find(r=>r.id===matched.scmRoId),n=row.normalized;
 const report={id:ctx.id(),date:batch.statusDate,remarks:n.statusText||'',etd:n.etd,eta:n.eta,reportedBlNumber:n.blNo||'',sourceFileId:batch.sourceFileId,sourceRow:n.sourceRow,at:ctx.now,by:ctx.user.name};
 (ro.trackingReports||=[]).push(report);
 batch.matched++;batch.affectedRos=(batch.affectedRos||0)+1;
 batch.rows.push({roId:ro.id,ref:ro.number,row:n.sourceRow,result:'MATCHED',change:row.change,raw:row.raw,warnings:row.warnings});
 for(const orderId of new Set((row.matches||[row.match]).map(m=>m.orderId))){
  log(state.orders.find(o=>o.id===orderId),'SCM_FORWARDER_REPORT','Forwarder report received on RO '+ro.number+'.',null,{roId:ro.id,reportId:report.id});
 }
 return true;
}
