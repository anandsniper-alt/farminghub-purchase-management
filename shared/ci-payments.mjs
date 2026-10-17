import {ensure,toMinor,canPerformApproval,canEdit,allocationsFor,documentReferenceKey,addDays} from './domain.mjs';

export const CI_RULES = Object.freeze({BEFORE_SHIPMENT:'Before shipment / vessel departure',FINAL_BL:'After final BL',SAILING:'After confirmed sailing'});
const isCiRule=rule=>typeof rule==='string'&&Object.hasOwn(CI_RULES,rule);
export const ciEnabled = o => o.ciPaymentPolicy?.version===1;
export const ciInvoices = o => (o.commercialInvoices||[]).filter(c=>c.status!=='CANCELLED');
const sum = rows => rows.reduce((n,x)=>n+x,0);
const activePayments = (state,o,c) => allocationsFor(state,o.id).filter(a=>a.ciId===c.id);
const advanceRows = (state,o) => allocationsFor(state,o.id).filter(a=>!a.ciId&&o.paymentTerms.steps[a.termIndex]?.trigger==='PI');
export function ciAdvanceAvailable(state,o,exceptId=null){
 return sum(advanceRows(state,o).map(a=>a.expectedMinor))-sum(ciInvoices(o).filter(c=>c.id!==exceptId).flatMap(c=>c.advanceApplications.map(a=>a.amountMinor)));
}
export function ciBalance(state,o,c){
 const advance=sum(c.advanceApplications.map(a=>a.amountMinor)),payments=activePayments(state,o,c);
 const reported=sum(payments.map(a=>a.expectedMinor)),realized=sum(payments.map(a=>a.realizedMinor||0));
 return {advance,reported,realized,balance:Math.max(0,c.amountMinor-advance-reported)};
}
// A recorded bank payment freezes the reviewed invoice adjustment. Newly freed
// advance stays available for explicit reconciliation; it never rewrites a paid
// invoice or requires a fictitious reversal of the real remittance.
const needsAdvanceRefresh=(state,o,c)=>c.advanceMode==='AUTO'&&!activePayments(state,o,c).length&&ciAdvanceAvailable(state,o)>0&&ciBalance(state,o,c).balance>0;
function validAdvance(state,o,c){
 const rows=advanceRows(state,o),invoices=ciInvoices(o);
 return c.advanceApplications.every(a=>{
  const source=rows.find(x=>x.id===a.allocationId);
  return source&&sum(invoices.flatMap(i=>i.advanceApplications.filter(x=>x.allocationId===a.allocationId).map(x=>x.amountMinor)))<=source.expectedMinor;
 });
}
export function ciLegacyBalance(state,o){return allocationsFor(state,o.id).some(a=>!a.ciId&&o.paymentTerms.steps[a.termIndex]?.trigger!=='PI');}
export function suggestedCiPolicy(state,o){
 if(ciEnabled(o))return o.ciPaymentPolicy;
 const supplier=state.vendors.find(v=>v.id===o.vendorId)?.ciPaymentDefault;if(supplier&&isCiRule(supplier.rule))return supplier;
 const steps=o.paymentTerms.steps.filter(s=>s.trigger!=='PI'),triggers=[...new Set(steps.map(s=>s.trigger))];
 const rule=triggers.length===1?({SHIPMENT:'BEFORE_SHIPMENT',BL:'FINAL_BL'})[triggers[0]]||'':'';
 return {rule,days:rule==='FINAL_BL'?Math.max(0,...steps.map(s=>s.days||0)):0};
}
function prepareCiPolicy(state,o,p,ctx,log){
 if(ciEnabled(o))return;
 ensure(!ciLegacyBalance(state,o),'This PO has recorded legacy balance payments. Reconcile those payments before changing its settlement workflow.');
 ensure(o.pi?.status==='APPROVED'&&o.pi.revision===o.revision&&!o.amendment,'Approve the current PI and resolve pending revisions before recording CI settlement.');
 const proposed=p.policy||{};ensure(isCiRule(proposed.rule),'Choose the supplier-agreed CI balance payment stage.');
 const days=Number(proposed.days);ensure(Number.isSafeInteger(days)&&days>=0&&days<=365,'Credit days must be 0–365.');
 ensure(proposed.rule!=='BEFORE_SHIPMENT'||days===0,'Before-shipment terms must have zero credit days.');
 ensure(proposed.confirm===true&&String(proposed.reason||'').trim(),'Confirm the proposed CI balance terms and enter the supplier agreement.');
 o.ciPaymentPolicy={version:1,rule:proposed.rule,days,pendingApproval:true,at:ctx.now,by:ctx.user.name,reason:String(proposed.reason).trim()};
 for(const a of o.paymentAuthorizations)if(!a.revokedAt&&o.paymentTerms.steps[a.termIndex]?.trigger!=='PI')Object.assign(a,{revokedAt:ctx.now,revokedBy:ctx.user.name,revocationReason:'CI balance terms awaiting manager review'});
 log('CI_PAYMENT_POLICY_PROPOSED','CI balance terms proposed with invoice entry; manager approval required.',null,o.ciPaymentPolicy);
}
export function ciDispatchReadiness(state,o,s){
 if(!ciEnabled(o))return '';
 if(o.ciPaymentPolicy.pendingApproval)return 'Review and approve the CI balance payment terms before vessel departure.';
 const invoices=ciInvoices(o).filter(c=>c.shipmentId===s.id);
 if(!invoices.length)return 'Record the Commercial Invoice value and advance adjustment for this shipment.';
 const docs=o.documents.filter(d=>d.type==='COMMERCIAL_INVOICE'&&d.status==='FINAL'&&d.shipmentId===s.id);
 if(docs.some(d=>!invoices.some(c=>documentReferenceKey(c.number)===documentReferenceKey(d.invoiceNumber))))return 'Record settlement values for every Commercial Invoice on this shipment.';
 if(o.ciPaymentPolicy.rule==='BEFORE_SHIPMENT'){
  if(invoices.some(c=>c.status!=='APPROVED'||c.orderRevision!==o.revision||!validAdvance(state,o,c)))return 'Approve the current CI value and PI advance adjustment before shipment.';
  if(invoices.some(c=>ciBalance(state,o,c).balance>0))return 'Record the outstanding CI balance payment before shipment.';
 }
 return '';
}
export function ciReadiness(state,o,c){
 const s=o.shipments.find(s=>s.id===c.shipmentId&&s.status!=='CANCELLED');
 const rule=o.ciPaymentPolicy?.rule;
 let reason='';
 if(!ciEnabled(o))reason='Enable CI settlement for this PO.';
 else if(o.pi?.status!=='APPROVED'||o.pi.revision!==o.revision)reason='Approve the PI for the current PO revision.';
 else if(o.amendment)reason='Resolve the pending PO revision first.';
 else if(c.status!=='APPROVED'||c.orderRevision!==o.revision)reason='Approve this Commercial Invoice for the current PO revision.';
 else if(o.ciPaymentPolicy.pendingApproval)reason='Approve the proposed CI payment terms.';
 else if(!isCiRule(rule))reason='Review the CI release rule.';
 else if(!s)reason='Select an active shipment.';
 else if(!validAdvance(state,o,c))reason='Review the PI advance allocation; its source payment changed.';
 else if(needsAdvanceRefresh(state,o,c))reason='Additional PI advance is available. Edit and save this CI to refresh its automatic advance adjustment.';
 else if(rule!=='BEFORE_SHIPMENT'&&!s.actualDeparture)reason='Confirm actual vessel departure with supporting remarks.';
 else if(rule==='FINAL_BL'&&!(s.blNumber&&s.blDate))reason='Record the final BL before authorizing the CI balance.';
 else if(rule==='SAILING'&&!s.departureOutcome?.remarks)reason='Record vessel departure confirmation remarks / evidence.';
 const releaseDate=s?(rule==='BEFORE_SHIPMENT'?c.date:rule==='FINAL_BL'?s.blDate:s.actualDeparture):null;
 return {eligible:!reason,reason,releaseDate,due:releaseDate?addDays(releaseDate,o.ciPaymentPolicy?.days||0):null};
}
export function ciFingerprint(state,o,c){
 const s=o.shipments.find(s=>s.id===c.shipmentId),b=ciBalance(state,o,c);
 const history=state.payments.filter(p=>p.allocations.some(a=>a.orderId===o.id&&a.ciId===c.id)).map(p=>[p.id,p.status,p.allocations.filter(a=>a.ciId===c.id).map(a=>[a.id,a.expectedMinor])]);
 return JSON.stringify([o.revision,o.pi?.id,o.ciPaymentPolicy,c.id,c.version,c.status,c.amountMinor,c.advanceApplications,b.reported,history,s?.actualDeparture,s?.blNumber,s?.blDate]);
}
export function ciSchedule(state,o){
 if(!ciEnabled(o))return [];
 return ciInvoices(o).map(c=>{
  const b=ciBalance(state,o,c),ready=ciReadiness(state,o,c),fingerprint=ciFingerprint(state,o,c);
  return {name:'CI '+c.number+' balance',index:c.termIndex,key:c.termIndex+':'+c.shipmentId,trigger:'CI',ciId:c.id,
   shipmentId:c.shipmentId,shipmentLabel:o.shipments.find(s=>s.id===c.shipmentId)?.number,
   amount:c.amountMinor-b.advance,reported:b.reported,paid:b.realized,due:ready.due,awaiting:ready.reason||CI_RULES[o.ciPaymentPolicy.rule],
   eligible:ready.eligible,reason:ready.reason,days:o.ciPaymentPolicy.days,ciFingerprint:fingerprint,
   authorized:ready.eligible&&o.paymentAuthorizations.some(a=>!a.revokedAt&&a.termIndex===c.termIndex&&a.shipmentId===c.shipmentId&&a.ciFingerprint===fingerprint)};
 });
}
export function requireCiPayment(state,o,m,date=null){
 if(!m?.ciId)return;
 const c=ciInvoices(o).find(c=>c.id===m.ciId);ensure(c,'Commercial Invoice no longer available.');
 const ready=ciReadiness(state,o,c);ensure(ready.eligible,ready.reason);
 if(date&&o.ciPaymentPolicy.rule==='BEFORE_SHIPMENT'){const s=o.shipments.find(s=>s.id===c.shipmentId);ensure(!s.actualDeparture||date<=s.actualDeparture,'Before-shipment payment date cannot be after vessel departure.');}
 if(date){ensure(date>=c.date,'Payment date cannot precede the Commercial Invoice date.');ensure(date>=ready.releaseDate,'Payment date cannot precede the required shipment / BL event.');}
}
function reserveAdvance(state,o,amount,exceptId){
 ensure(amount<=ciAdvanceAvailable(state,o,exceptId),'PI advance exceeds the unallocated advance available on this PO.');
 let remaining=amount;const applications=[];
 for(const a of advanceRows(state,o)){
  const used=sum(ciInvoices(o).filter(c=>c.id!==exceptId).flatMap(c=>c.advanceApplications.filter(x=>x.allocationId===a.id).map(x=>x.amountMinor)));
  const take=Math.min(remaining,Math.max(0,a.expectedMinor-used));
  if(take){applications.push({allocationId:a.id,paymentId:a.payment.id,piId:a.piId,amountMinor:take});remaining-=take;}
 }
 ensure(!remaining,'Advance source cannot cover this adjustment.');return applications;
}
export const CI_COMMANDS=['CONFIGURE_CI_PAYMENTS','SAVE_COMMERCIAL_INVOICE','APPROVE_COMMERCIAL_INVOICE','CANCEL_COMMERCIAL_INVOICE'];
export function applyCiPayment(state,o,type,p,ctx,{log}){
 const manager=()=>ensure(canPerformApproval(ctx.user,'AUTHORIZE_PAYMENT',o.scope,ctx.now,state,o),'Payment manager approval is required.','FORBIDDEN');
 ensure(o.scope==='LAE_IMPORT','CI settlement is available for LAE Import.');
 ensure(!o.manualClosed,'Reopen / review the closed order before changing payment terms.');
 if(type==='CONFIGURE_CI_PAYMENTS'){
  manager();ensure(o.pi?.status==='APPROVED'&&o.pi.revision===o.revision&&!o.amendment,'An approved current PI and no pending PO revision are required.');
  ensure(p.supplierDefault!==true,'CI settlement is configured for this PO only; supplier defaults remain unchanged.');
  ensure(isCiRule(p.rule),'Select a CI balance release rule.');
  const days=Number(p.days);ensure(Number.isSafeInteger(days)&&days>=0&&days<=365,'Credit days must be 0–365.');
  ensure(p.rule!=='BEFORE_SHIPMENT'||days===0,'Before-shipment terms must have zero credit days.');
  ensure(p.confirm===true&&String(p.reason||'').trim(),'Confirm the workflow and enter the supplier-agreed reason.');
  ensure(!allocationsFor(state,o.id).some(a=>!a.ciId&&o.paymentTerms.steps[a.termIndex]?.trigger!=='PI'),'This PO already has legacy balance payments. Keep its existing workflow; use an unpaid PO for CI settlement testing.');
  ensure(!allocationsFor(state,o.id).some(a=>a.ciId),'CI balance payments already exist; retain the agreed release rule.');
  const old=o.ciPaymentPolicy||null;
  o.ciPaymentPolicy={version:1,rule:p.rule,days,at:ctx.now,by:ctx.user.name,reason:String(p.reason).trim()};
  for(const a of o.paymentAuthorizations)if(!a.revokedAt&&o.paymentTerms.steps[a.termIndex]?.trigger!=='PI')Object.assign(a,{revokedAt:ctx.now,revokedBy:ctx.user.name,revocationReason:'CI settlement policy reviewed'});
  log('CI_PAYMENT_POLICY_CONFIGURED','CI balance replaces PO-based balance milestones for this PO; advance history retained.',old,o.ciPaymentPolicy);return {id:o.id};
 }
 // CI entry itself proposes the settlement workflow; no hidden opt-in is needed.
 const c=(o.commercialInvoices||[]).find(c=>c.id===p.ciId);
 if(type==='SAVE_COMMERCIAL_INVOICE'){
  ensure(canEdit(ctx.user,o),'Purchase edit access is required.','FORBIDDEN');
  prepareCiPolicy(state,o,p,ctx,log);
  ensure(o.pi?.status==='APPROVED'&&o.pi.revision===o.revision&&!o.amendment,'Approve the current PI and resolve pending revisions before entering a CI.');
  if(p.ciId)ensure(c&&c.status!=='CANCELLED','Active Commercial Invoice not found.');
  if(c)ensure(!activePayments(state,o,c).length,'Payments already exist for this CI. Correct the payment record before changing its invoice or advance.');
  const doc=o.documents.find(d=>d.id===p.documentId&&d.type==='COMMERCIAL_INVOICE'&&d.status==='FINAL');
  ensure(doc?.invoiceNumber&&doc.invoiceDate&&doc.shipmentId,'Upload a numbered, dated Commercial Invoice linked to a shipment first.');
  ensure(o.shipments.some(s=>s.id===doc.shipmentId&&s.status!=='CANCELLED'),'Select an active shipment.');
  ensure(doc.invoiceDate<=ctx.now.slice(0,10),'Commercial Invoice date cannot be in the future.');
  ensure(state.files.some(f=>f.id===doc.fileId&&f.orderIds.includes(o.id)),'Commercial Invoice evidence is unavailable.');
  ensure(!ciInvoices(o).some(x=>x.id!==c?.id&&documentReferenceKey(x.number)===documentReferenceKey(doc.invoiceNumber)),'This Commercial Invoice already has a settlement record. Edit that record instead.');
  ensure(!p.currency||p.currency===o.currency,'CI currency must match this PO; cross-currency CIs need a separate agreed conversion workflow.');
  const amount=toMinor(p.amount),advance=p.advanceMode==='AUTO'?Math.min(amount,Math.max(0,ciAdvanceAvailable(state,o,c?.id))):toMinor(p.advance||'0');ensure(amount>0&&advance>=0&&advance<=amount,'Enter a positive CI value and an advance adjustment between zero and that value.');
  const costing=(o.arrivalCostings||[]).find(x=>x.status==='FINAL'&&x.shipmentId===doc.shipmentId&&x.invoiceKey===documentReferenceKey(doc.invoiceNumber));
  ensure(!costing||costing.declaredInvoiceMinor===amount,'CI value must match the finalized arrival invoice costing.');
  const old=c?structuredClone(c):null;
  const next={id:c?.id||ctx.id(),termIndex:c?.termIndex||100000+(o.commercialInvoices||[]).length,version:(c?.version||0)+1,
   documentId:doc.id,number:doc.invoiceNumber,date:doc.invoiceDate,currency:o.currency,shipmentId:doc.shipmentId,amountMinor:amount,
   advanceMode:p.advanceMode==='AUTO'?'AUTO':'MANUAL',advanceApplications:reserveAdvance(state,o,advance,c?.id),status:'RECEIVED',orderRevision:o.revision,at:ctx.now,by:ctx.user.name,remarks:String(p.remarks||'').trim()};
  if(c){(o.commercialInvoiceHistory??=[]).push(old);Object.assign(c,next);delete c.approvedAt;delete c.approvedBy;}else(o.commercialInvoices??=[]).push(next);
  log('COMMERCIAL_INVOICE_SAVED','CI settlement saved for manager review; PI advance reserved once.',old,next);return {id:next.id};
 }
 ensure(ciEnabled(o),'Record the CI settlement first.');
 manager();ensure(c&&c.status!=='CANCELLED','Active Commercial Invoice not found.');
 if(type==='APPROVE_COMMERCIAL_INVOICE'){
  ensure(p.confirm===true,'Confirm the CI value, shipment and advance adjustment.');
  ensure(o.pi?.status==='APPROVED'&&o.pi.revision===o.revision&&!o.amendment,'Approve the current PI and resolve pending revisions first.');
  // A nonfinancial PO amendment may make a paid invoice's revision stale. Its
  // approved value and reservations remain immutable; review only its continued
  // applicability to the new revision instead of inventing payment reversals.
  const reconfirm=c.status==='APPROVED'&&Number.isSafeInteger(c.orderRevision)&&c.orderRevision<o.revision;
  ensure(reconfirm||c.status==='RECEIVED'&&c.orderRevision===o.revision,'Save the CI against the current PO revision before approval.');
  ensure(validAdvance(state,o,c),'The reserved advance is no longer available. Review the CI.');
  ensure(!needsAdvanceRefresh(state,o,c),'Additional PI advance is available. Edit and save this CI before approval.');
  ensure(o.shipments.some(s=>s.id===c.shipmentId&&s.status!=='CANCELLED'),'Shipment is no longer active.');
  const old=reconfirm?structuredClone(c):null;
  if(reconfirm){(o.commercialInvoiceHistory??=[]).push(old);c.orderRevision=o.revision;c.version++;}
  if(o.ciPaymentPolicy.pendingApproval){o.ciPaymentPolicy.pendingApproval=false;o.ciPaymentPolicy.approvedAt=ctx.now;o.ciPaymentPolicy.approvedBy=ctx.user.name;log('CI_PAYMENT_POLICY_APPROVED','CI balance release terms approved with invoice review.',null,o.ciPaymentPolicy);}
  c.status='APPROVED';c.approvedAt=ctx.now;c.approvedBy=ctx.user.name;
  log(reconfirm?'COMMERCIAL_INVOICE_RECONFIRMED':'COMMERCIAL_INVOICE_APPROVED',reconfirm?'Unchanged Commercial Invoice reconfirmed for the current PO revision; recorded payments and advance reservations retained.':'Commercial Invoice value and PI advance adjustment approved.',old,c);
 }else{
  ensure(!activePayments(state,o,c).length,'Correct / void the CI payments before cancelling its settlement.');
  ensure(String(p.reason||'').trim(),'Enter the cancellation reason.');
  const old=structuredClone(c);c.status='CANCELLED';c.cancelledAt=ctx.now;c.cancellationReason=String(p.reason).trim();
  log('COMMERCIAL_INVOICE_CANCELLED','CI settlement cancelled; advance reservation released. Invoice document retained.',old,c);
 }
 return {id:c.id};
}
