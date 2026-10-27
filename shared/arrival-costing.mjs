import {createRoSupplierDirectory,normalizeRoItemCodeFilter,matchesRoItemCode,compareRoCostingDatesDescending} from './ro-costing.mjs';
/** Invoice costing after port arrival. Monetary amounts are integer minor units. */
import {scopeAllowed,ensure,text,toMinor,toRate,dateValid,documentReferenceKey,proportionalSlices,canEdit,canPerformApproval} from './domain.mjs';

export const ARRIVAL_COST_FIELDS=[['supplierPayment','Supplier payment'],['bcd','BCD'],['sws','SWS'],['oceanFreight','Ocean freight'],['insurance','Insurance'],['clearance','Clearance'],['miscellaneous','Miscellaneous'],['inlandFreight','Inland freight'],['linerCharges','Liner charges']];
// Review context only: invoices and bank records have different allocation scopes.
// This never changes entered amounts or adds a finalization requirement.
export function arrivalCostReconciliation(state,o,c){
 const amounts=(o.arrivalCostings||[]).map(x=>x.costs?.supplierPayment),known=amounts.filter(Number.isSafeInteger);
 const total=known.length?known.reduce((sum,value)=>sum+value,0):null,supplierCostMinor=Number.isSafeInteger(total)?total:null;
 const payments=(state.payments||[]).filter(p=>p.status!=='VOID'&&(p.allocations||[]).some(a=>a.orderId===o.id));
 let bankPrincipalMinor=payments.length?0:null;
 for(const p of payments){
  const weights=p.allocations.map(a=>a.remitMinor);
  if(!Number.isSafeInteger(p.inrMinor)||p.inrMinor<0||weights.some(n=>!Number.isSafeInteger(n)||n<0)||!weights.some(n=>n>0)||!Number.isSafeInteger(weights.reduce((a,b)=>a+b,0))){bankPrincipalMinor=null;break;}
  const slices=proportionalSlices(p.inrMinor,weights);
  bankPrincipalMinor+=p.allocations.reduce((sum,a,index)=>sum+(a.orderId===o.id?slices[index]:0),0);
 }
 if(!Number.isSafeInteger(bankPrincipalMinor))bankPrincipalMinor=null;
 const supplierDifferenceMinor=supplierCostMinor!==null&&bankPrincipalMinor!==null?supplierCostMinor-bankPrincipalMinor:null;
 const gstDifferenceMinor=Number.isSafeInteger(c.gstMinor)&&Number.isSafeInteger(c.boeTotals?.gst)?c.gstMinor-c.boeTotals.gst:null;
 return {supplierCostMinor,bankPrincipalMinor,supplierDifferenceMinor,supplierCostIncomplete:known.length!==amounts.length,gstDifferenceMinor};
}
export function arrivalInvoiceOptions(o,sid){const seen=new Set();return (o.documents||[]).filter(d=>d.type==='COMMERCIAL_INVOICE'&&d.shipmentId===sid&&text(d.invoiceNumber)).filter(d=>{const key=documentReferenceKey(d.invoiceNumber);if(seen.has(key))return false;seen.add(key);return true;});}
const acSafe=n=>{ensure(Number.isSafeInteger(n)&&n>=0,'Cost or quantity exceeds the supported precision.');return n;};
const acSum=xs=>xs.reduce((a,b)=>acSafe(a+b),0);
const acRound=(n,d)=>{ensure(d>0n,'A positive invoice value is required.');return acSafe(Number((n+d/2n)/d));};
export function arrivalCostCalculation(c){
 const weights=c.lines.map(l=>acSafe(l.quantity*l.unitPriceMinor)),invoiceMinor=acSum(weights);
 ensure(invoiceMinor>0,'Enter at least one positive invoice line.');
 const invoiceUsdMinor=acRound(BigInt(invoiceMinor)*1000000n,BigInt(c.currencyPerUsd));
 ensure(invoiceUsdMinor>0,'USD invoice value rounds to zero. Check the currency and exchange rate.');
 const missing=ARRIVAL_COST_FIELDS.filter(([k])=>c.costs[k]==null).map(([,label])=>label);
 const totalMinor=missing.length?null:acSum(ARRIVAL_COST_FIELDS.map(([k])=>acSafe(c.costs[k])));
 const usdSlices=proportionalSlices(invoiceUsdMinor,weights),costSlices=totalMinor===null?null:proportionalSlices(totalMinor,weights);
 return {invoiceMinor,invoiceUsdMinor,totalMinor,missing,costPerUsd:totalMinor===null?null:acRound(BigInt(totalMinor)*1000000n,BigInt(invoiceUsdMinor)),lines:c.lines.map((l,i)=>({...l,invoiceMinor:weights[i],usdMinor:usdSlices[i],landedMinor:costSlices?.[i]??null,unitCostInr:costSlices?acRound(BigInt(costSlices[i])*10000n,BigInt(l.quantity)):null}))};
}
export function arrivalCostingStatus(o){
 const shipments=(o.shipments||[]).filter(s=>s.status!=='CANCELLED'),records=o.arrivalCostings||[],gaps=[];
 if(acSum(shipments.filter(s=>s.actualArrival).flatMap(s=>s.lines.map(l=>l.quantity)))!==acSum(o.lines.map(l=>l.quantity)))gaps.push('All order quantities must arrive before the final costing stage is complete.');
 if(!shipments.length)return {complete:false,gaps:['No arrived shipment yet.']};
 for(const s of shipments){if(!s.actualArrival){gaps.push(s.number+': port arrival pending.');continue;}const invoices=arrivalInvoiceOptions(o,s.id);if(!invoices.length)gaps.push(s.number+': add a numbered commercial invoice.');for(const d of invoices)if(!records.some(c=>c.shipmentId===s.id&&c.invoiceKey===documentReferenceKey(d.invoiceNumber)&&c.status==='FINAL'))gaps.push(d.invoiceNumber+': final costing pending.');for(const l of s.lines){const qty=acSum(records.filter(c=>c.shipmentId===s.id&&c.status==='FINAL').flatMap(c=>c.lines.filter(x=>x.lineId===l.lineId).map(x=>x.quantity)));if(qty!==l.quantity)gaps.push(s.number+': invoice quantities do not fully cover '+(o.lines.find(x=>x.id===l.lineId)?.code||'the shipment')+'.');}}
 return {complete:!gaps.length,gaps};
}
function acEvidence(state,o,ids,label){ensure(Array.isArray(ids)&&ids.length>0&&ids.length<=50,'Upload '+label+'.');const distinct=[...new Set(ids)];ensure(distinct.length===ids.length,'Duplicate evidence selection.');for(const id of ids)ensure(state.files.some(f=>f.id===id&&f.scope===o.scope&&f.orderIds.includes(o.id)),label+' must belong to this order.');return [...ids];}
function acBoeCheck(state,o,c,finalizing=false){
 const peers=(state.orders||[]).flatMap(order=>(order.arrivalCostings||[]).filter(x=>!(order.id===o.id&&x.id===c.id)&&x.boeKey===c.boeKey));
 for(const k of ['bcd','sws','gst']){const total=c.boeTotals[k];if(total==null)continue;for(const other of peers)if(other.boeTotals[k]!=null&&(finalizing||other.status==='FINAL'))ensure(other.boeTotals[k]===total,'This Bill of Entry already has a different '+k.toUpperCase()+' total. Review its other invoice allocations.');const value=k==='gst'?c.gstMinor:c.costs[k];const used=acSum(peers.map(x=>(k==='gst'?x.gstMinor:x.costs[k])||0));ensure(acSafe(used+(value||0))<=total,'Allocated '+k.toUpperCase()+' exceeds the Bill of Entry total across invoices.');}
}
function acValidate(state,o,c,finalizing=false){
 const s=o.shipments.find(s=>s.id===c.shipmentId&&s.status!=='CANCELLED');ensure(s?.actualArrival,'Record actual India-port arrival before costing this shipment.');
 ensure(arrivalInvoiceOptions(o,s.id).some(d=>documentReferenceKey(d.invoiceNumber)===c.invoiceKey),'Select a numbered commercial invoice attached to this shipment.');
 const peers=(o.arrivalCostings||[]).filter(x=>x.id!==c.id);ensure(!peers.some(x=>x.shipmentId===s.id&&x.invoiceKey===c.invoiceKey),'This invoice already has a costing. Open that record instead.');
 for(const l of c.lines){const allocated=s.lines.find(x=>x.lineId===l.lineId);ensure(allocated,'Invoice item is not in this shipment.');const used=acSum(peers.filter(x=>x.shipmentId===s.id).flatMap(x=>x.lines.filter(y=>y.lineId===l.lineId).map(y=>y.quantity)));ensure(acSafe(used+l.quantity)<=allocated.quantity,'Invoice quantities exceed the shipment. Review other invoice costings.');}
 acBoeCheck(state,o,c,finalizing);return arrivalCostCalculation(c);
}
export function applyArrivalCosting(state,type,p,ctx,o,{event,attach}){
 const {user,now,id}=ctx,records=o.arrivalCostings||(o.arrivalCostings=[]),old=records.find(c=>c.id===p.costingId);
 if(type==='SAVE_ARRIVAL_COSTING'){
  ensure(canEdit(user,o),'Purchase edit access is required.','FORBIDDEN');ensure(!p.costingId||old,'Costing record not found.');ensure(!old||old.status==='PROVISIONAL','Reopen the finalized costing with a reason before changing it.');
  const c={id:old?.id||id(),shipmentId:old?.shipmentId||p.shipmentId,invoiceNumber:old?.invoiceNumber||text(p.invoiceNumber),currency:o.currency,status:'PROVISIONAL',revision:(old?.revision||0)+1,history:old?.history||[],boeNumber:text(p.boeNumber),boeDate:text(p.boeDate),roReference:text(p.roReference),remarks:text(p.remarks),allocationNote:text(p.allocationNote),priceReason:text(p.priceReason),actualsConfirmed:false,updatedAt:now,updatedBy:user.name};
  c.invoiceKey=documentReferenceKey(c.invoiceNumber);ensure(c.invoiceKey&&c.invoiceNumber.length<=120,'Select a supplier invoice number.');ensure(documentReferenceKey(c.boeNumber)&&c.boeNumber.length<=120,'Enter the Bill of Entry number.');ensure(dateValid(c.boeDate)&&c.boeDate<=now.slice(0,10),'Enter a valid Bill of Entry date, not in the future.');c.boeKey=JSON.stringify([documentReferenceKey(c.boeNumber),c.boeDate]);ensure(c.roReference.length<=120&&[c.remarks,c.allocationNote,c.priceReason].every(v=>v.length<=2000),'Reference or remarks are too long.');
  c.currencyPerUsd=c.currency==='USD'?1000000:toRate(p.currencyPerUsd);c.fxDate=c.currency==='USD'?null:text(p.fxDate);c.fxSource=c.currency==='USD'?'USD invoice':text(p.fxSource);if(c.currency!=='USD'){ensure(dateValid(c.fxDate)&&c.fxDate<=now.slice(0,10),'Enter the supplier-agreed USD conversion date.');ensure(c.fxSource&&c.fxSource.length<=500,'Enter the source of the supplier-agreed USD conversion.');}
  ensure(Array.isArray(p.lines)&&p.lines.length>0&&p.lines.length<=500,'Add 1 to 500 invoice lines.');const seen=new Set();c.lines=p.lines.map(l=>{const original=o.lines.find(x=>x.id===l.lineId);ensure(original&&!seen.has(l.lineId),'Select each invoice item once.');seen.add(l.lineId);const quantity=Number(l.quantity);ensure(Number.isSafeInteger(quantity)&&quantity>0,'Invoice quantity must be a positive whole number.');const unitPriceMinor=toMinor(l.unitPrice);ensure(unitPriceMinor>0,'Invoice unit price must be positive.');if(unitPriceMinor!==original.unitPriceMinor)ensure(c.priceReason,'Explain the invoice price difference from the PO.');return {lineId:original.id,itemId:original.itemId,code:original.code,name:original.name,quantity,unitPriceMinor};});
  const amount=v=>text(v)===''?null:toMinor(v);c.costs=Object.fromEntries(ARRIVAL_COST_FIELDS.map(([k])=>[k,amount(p.costs?.[k])]));c.gstMinor=amount(p.gst);c.boeTotals=Object.fromEntries(['bcd','sws','gst'].map(k=>[k,amount(p.boeTotals?.[k])]));c.declaredInvoiceMinor=toMinor(p.invoiceAmount);c.boeFileIds=acEvidence(state,o,p.boeFileIds,'the inward Bill of Entry');c.supportFileIds=p.supportFileIds?.length?acEvidence(state,o,p.supportFileIds,'cost/payment evidence'):[];
  const calc=acValidate(state,o,c);ensure(calc.invoiceMinor===c.declaredInvoiceMinor,'Invoice line total must equal the commercial invoice amount.');c.calculation=calc;
  const previous=old?structuredClone(old):null;if(old)records[records.indexOf(old)]=c;else records.push(c);for(const fid of c.boeFileIds)if(!o.documents.some(d=>d.fileId===fid&&d.type==='BILL_OF_ENTRY'&&d.shipmentId===c.shipmentId))attach(fid,'BILL_OF_ENTRY',c.shipmentId);for(const fid of c.supportFileIds)if(!o.documents.some(d=>d.fileId===fid&&d.type==='COST_EVIDENCE'&&d.shipmentId===c.shipmentId))attach(fid,'COST_EVIDENCE',c.shipmentId);delete o.costingCompletedAt;event('ARRIVAL_COSTING_SAVED','Invoice arrival costing saved as provisional.',previous,c);return {id:c.id};
 }
 ensure(canPerformApproval(user,type,o.scope,now,state,o),'An allowed costing approver is required.','FORBIDDEN');ensure(old,'Costing record not found.');
 if(type==='FINALIZE_ARRIVAL_COSTING'){
  const settlements=(o.commercialInvoices||[]).filter(c=>c.status!=='CANCELLED'&&c.shipmentId===old.shipmentId&&documentReferenceKey(c.number)===documentReferenceKey(old.invoiceNumber));
  ensure(settlements.every(c=>c.amountMinor===old.declaredInvoiceMinor),'Arrival invoice amount differs from the active CI settlement. Reconcile the invoice amount before finalizing.');
  ensure(old.status==='PROVISIONAL','Only a provisional costing can be finalized.');const calc=acValidate(state,o,old,true);ensure(!calc.missing.length,'Enter actual amounts (or confirmed zero) for: '+calc.missing.join(', '));ensure(calc.totalMinor>0&&old.costs.supplierPayment>0,'Confirm the actual supplier payment amount.');ensure(old.gstMinor!==null&&Object.values(old.boeTotals).every(v=>v!==null),'Confirm GST and all Bill of Entry totals, including zero where applicable.');ensure(old.supportFileIds.length,'Attach the payment and expense supporting evidence.');acEvidence(state,o,old.boeFileIds,'the inward Bill of Entry');acEvidence(state,o,old.supportFileIds,'cost/payment evidence');ensure(p.confirmActuals===true,'Confirm that all amounts are actual, complete and allocated only once to this invoice.');ensure(old.allocationNote,'Explain the payment/expense allocation basis before finalizing.');const previous=structuredClone(old);old.status='FINAL';old.actualsConfirmed=true;old.finalizedAt=now;old.finalizedBy=user.name;old.calculation=calc;old.revision++;if(arrivalCostingStatus(o).complete)o.costingCompletedAt=now;event('ARRIVAL_COSTING_FINALIZED','Actual invoice landed cost finalized; GST excluded and evidence retained.',previous,old);return {id:old.id};
 }
 ensure(type==='REOPEN_ARRIVAL_COSTING'&&old.status==='FINAL','Select a finalized costing to reopen.');ensure(text(p.reason)&&text(p.reason).length<=2000,'Enter the reason for reopening.');const previous=structuredClone(old),{history,...snapshot}=previous;old.history.push({...snapshot,reopenedAt:now,reopenedBy:user.name,reopenReason:text(p.reason)});old.status='PROVISIONAL';old.actualsConfirmed=false;old.revision++;delete old.finalizedAt;delete old.finalizedBy;delete o.costingCompletedAt;event('ARRIVAL_COSTING_REOPENED','Final costing reopened for a documented correction.',previous,{id:old.id,reason:text(p.reason)});return {id:old.id};
}


// A read-only view of finalized PO invoices. Never copy these amounts into
// ro_costings: that would create a second, independently editable financial record.
export function finalizedPoCostings(state,actor,{q='',status='',ro=null,supplier:filterSupplier='',roNumber='',itemCode=''}={}){
 const itemQuery=normalizeRoItemCodeFilter(itemCode);
 if(!state||!scopeAllowed(actor,'LAE_IMPORT')||status==='Pending')return [];
 const query=String(q).trim().toLowerCase(),rows=[],directory=createRoSupplierDirectory(state.vendors||[]);
 for(const order of state.orders||[]){
  if(order.scope!=='LAE_IMPORT'||order.deletedAt||order.testData)continue;
  const supplier=(state.vendors||[]).find(v=>v.id===order.vendorId)?.name||'';
  if(!directory.matches({supplier},filterSupplier))continue;
  for(const costing of order.arrivalCostings||[]){
   if(costing.status!=='FINAL')continue;
   // Invoice lines retain the issued item-code snapshot; unrelated PO lines and
   // later item-master corrections must not select this invoice.
   if(itemQuery&&!matchesRoItemCode({purchaseItems:{rows:(costing.lines||[]).map(line=>({itemCode:line.code}))}},itemCode))continue;
   const shipment=(order.shipments||[]).find(s=>s.id===costing.shipmentId);
   if(!shipment||shipment.status==='CANCELLED'||!shipment.actualArrival)continue;
   const reference=String(costing.roReference||'').trim();
   if(roNumber&&!reference.toLowerCase().includes(roNumber.trim().toLowerCase()))continue;
   // Match only an explicit saved reference; a forwarder reference is not an RO.
   if(ro!==null&&reference!==ro)continue;
   if(query&&![reference,order.number,supplier,costing.invoiceNumber,costing.boeNumber,shipment.number].some(v=>String(v||'').toLowerCase().includes(query)))continue;
   const calculation=costing.calculation;
   rows.push({orderId:order.id,orderNumber:order.number,costingId:costing.id,
    roReference:reference,supplier,shipmentNumber:shipment.number,invoiceNumber:costing.invoiceNumber,
    boeNumber:costing.boeNumber,boeDate:costing.boeDate,finalizedAt:costing.finalizedAt,
    invoiceUsdMinor:calculation?.invoiceUsdMinor??null,totalMinor:calculation?.totalMinor??null,
    costPerUsd:calculation?.costPerUsd??null,gstMinor:costing.gstMinor??null,
    href:'#/order/'+encodeURIComponent(order.id)+'?tab=costing&costing='+encodeURIComponent(costing.id)});
  }
 }
 return rows.sort((a,b)=>(itemQuery?compareRoCostingDatesDescending(a,b):0)||String(b.finalizedAt||'').localeCompare(String(a.finalizedAt||''))||a.orderNumber.localeCompare(b.orderNumber)||a.costingId.localeCompare(b.costingId));
}
