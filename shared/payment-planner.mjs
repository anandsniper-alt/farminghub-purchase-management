import {ensure,text,scopeAllowed,canApprove,dateValid,isoDay,toRate,convertMinor,orderTotal,paymentSchedule,allocationsFor,isBusinessOrder} from './domain.mjs';
import {ciEnabled,ciInvoices} from './ci-payments.mjs';
import {processGateAllowed} from './process-exemptions.mjs';

const CURRENCIES=['USD','CNY','INR'];
export const PAYMENT_PLANNER_COMMANDS=['SAVE_PAYMENT_PLAN_RATE','SAVE_PAYMENT_PLAN_DATE'];
const sum=values=>{const total=values.reduce((n,v)=>{ensure(Number.isSafeInteger(v),'Payment plan amount is not an exact minor-unit integer.');return n+BigInt(v);},0n);const value=Number(total);ensure(Number.isSafeInteger(value),'Payment plan total exceeds the supported range.');return value;};
const monthValid=v=>typeof v==='string'&&/^(?:19\d{2}|[2-9]\d{3})-(?:0[1-9]|1[0-2])$/.test(v);
const planDateValid=v=>typeof v==='string'&&dateValid(v)&&v>='1900-01-01';
const supportedRate=entry=>Number.isSafeInteger(entry?.rate)&&entry.rate>0;
const issued=o=>!['DRAFT','PENDING_APPROVAL','CANCELLED'].includes(o.status);
const visible=(o,user)=>o.scope==='LAE_IMPORT'&&scopeAllowed(user,o.scope)&&isBusinessOrder(o)&&issued(o);
export function paymentPlannerMilestoneKey(m){return String(m.index)+':'+(m.shipmentId||'')+(m.ciId?':ci:'+m.ciId:'');}
export function paymentPlannerDateKey(orderId,milestoneKey){return JSON.stringify([orderId,milestoneKey]);}
export function paymentPlannerMilestoneFingerprint(o,m){
 const step=o.paymentTerms.steps[m.index],invoice=m.ciId?(o.commercialInvoices||[]).find(c=>c.id===m.ciId):null;
 return JSON.stringify([o.revision,o.currency,paymentPlannerMilestoneKey(m),m.trigger,m.amount,m.name,m.days,step?[step.name,step.type,step.percent,step.amount,step.currency,step.trigger,step.days]:null,m.ciId?[o.ciPaymentPolicy?.version,o.ciPaymentPolicy?.rule,o.ciPaymentPolicy?.days,invoice?.version]:null]);
}

function readiness(o,m){
 const blockers=[];
 if(o.deletedAt)blockers.push('Deleted PO: restore it before any payment action.');
 if(o.pi?.status!=='APPROVED')blockers.push('Approve the PI before payment.');
 if(m.ciId){if(!m.eligible)blockers.push(m.reason||'Complete the CI payment readiness checks.');}
 else if(m.trigger==='PI'){
  for(const [stage,label] of [['CONFIRM','Supplier PO acknowledgement'],['SPEC_CONFIRM','Supplier technical specification confirmation'],['ARTWORK','Approved artwork and supplier artwork confirmation']])if(!processGateAllowed(o,stage,'PAYMENT'))blockers.push(label+' is required before payment.');
 }else if(!m.shipmentId)blockers.push('Allocate a shipment before this payment.');
 if(m.trigger==='BL'){
  const s=o.shipments.find(s=>s.id===m.shipmentId&&s.status!=='CANCELLED');
  if(!text(s?.blNumber)||!dateValid(s?.blDate))blockers.push('Record the final BL for this shipment before payment.');
 }
 return [...new Set(blockers)];
}

function acknowledgement(allocations){
 return {
  awaitingAcknowledgementMinor:sum(allocations.filter(a=>a.realizedMinor===null||a.realizedMinor===undefined).map(a=>a.expectedMinor)),
  acknowledgementDifferenceMinor:sum(allocations.filter(a=>a.realizedMinor!==null&&a.realizedMinor!==undefined).map(a=>sum([a.expectedMinor,-a.realizedMinor]))),
  awaitingAcknowledgementCount:allocations.filter(a=>a.realizedMinor===null||a.realizedMinor===undefined).length
 };
}

function statusFor(row,asOf){
 if(row.futureMinor===0)return row.overpaidMinor?'OVERPAID':row.awaitingAcknowledgementCount?'AWAITING_ACKNOWLEDGEMENT':row.acknowledgementDifferenceMinor?'RECEIPT_DIFFERENCE':'SETTLED';
 if(!row.effectiveDate)return 'UNSCHEDULED';
 if(!row.ready)return 'BLOCKED';
 if(!row.authorized)return 'AWAITING_AUTHORIZATION';
 return row.effectiveDate<asOf?'OVERDUE':'PLANNED';
}

/** Currency totals deliberately have no mixed-currency grand total. */
export function paymentPlannerTotals(rows){
 return [...new Set(rows.map(r=>r.currency))].sort().map(currency=>{
  const selected=rows.filter(r=>r.currency===currency);
  const out={currency,rowCount:selected.length};
  for(const field of ['amountMinor','reportedMinor','realizedMinor','futureMinor','awaitingAcknowledgementMinor','acknowledgementDifferenceMinor','overpaidMinor'])out[field]=sum(selected.map(r=>r[field]));
  out.unscheduledMinor=sum(selected.filter(r=>!r.effectiveDate).map(r=>r.futureMinor));
  out.deletedExposureMinor=sum(selected.filter(r=>r.deletedExposure).map(r=>r.futureMinor));
  return out;
 });
}

export function paymentPlannerMonths(rows,rates={}){
 const groups=new Map();
 for(const row of rows){
  if(!row.month||!row.futureMinor)continue;
  const key=row.month+'|'+row.currency;
  if(!groups.has(key))groups.set(key,{month:row.month,currency:row.currency,amountMinor:0,rowCount:0});
  const group=groups.get(key);group.amountMinor=sum([group.amountMinor,row.futureMinor]);group.rowCount++;
 }
 return [...groups.values()].sort((a,b)=>a.month.localeCompare(b.month)||a.currency.localeCompare(b.currency)).map(group=>{
  const entry=Object.hasOwn(rates,group.month)?rates[group.month]:null;
  const rate=group.currency==='USD'&&supportedRate(entry)?entry.rate:null;
  let estimatedInrMinor=group.currency==='INR'?group.amountMinor:null,conversionError=null;
  if(rate)try{estimatedInrMinor=convertMinor(group.amountMinor,rate);}catch(e){conversionError=e.message;}
  return {...group,rate,rateRemarks:rate?text(entry.remarks):'',estimatedInrMinor,missingRate:group.currency==='USD'&&!rate,unsupportedCurrency:!CURRENCIES.includes(group.currency),conversionError};
 });
}

/** Read-only projection of contractual obligations and reported bank cash. */
export function paymentPlanner(state,user,{asOf=isoDay()}={}){
 ensure(dateValid(asOf),'Payment planner reference date must be YYYY-MM-DD.');
 ensure(scopeAllowed(user,'LAE_IMPORT'),'LAE Import access is required for the payment planner.','FORBIDDEN');
 const plan=state.settings?.paymentPlanner||{},rates=plan.rates||{},dates=plan.dates||{},rows=[],commitments=[],warnings=[];
 for(const o of state.orders.filter(o=>visible(o,user))){
  const vendor=state.vendors.find(v=>v.id===o.vendorId),allocations=allocationsFor(state,o.id),schedule=paymentSchedule(state,o);
  const identity={orderId:o.id,orderNumber:o.number,number:o.number,vendorId:o.vendorId,supplier:vendor?.name||o.vendorId,vendorName:vendor?.name||o.vendorId,currency:o.currency,deletedExposure:!!o.deletedAt};
  if(!CURRENCIES.includes(o.currency))warnings.push({orderId:o.id,code:'UNSUPPORTED_CURRENCY',message:'PO currency is unsupported; retain its amount separately and review it.'});
  for(const m of schedule){
   const milestoneKey=paymentPlannerMilestoneKey(m),dateKey=paymentPlannerDateKey(o.id,milestoneKey),override=Object.hasOwn(dates,dateKey)?dates[dateKey]:null;
   const currentOverride=override?.fingerprint===paymentPlannerMilestoneFingerprint(o,m);
   const dueDate=planDateValid(m.due)?m.due:null,plannedDate=currentOverride&&planDateValid(override?.date)?override.date:null,effectiveDate=plannedDate||dueDate;
   if(m.due&&!dueDate)warnings.push({orderId:o.id,milestoneKey,code:'INVALID_DUE_DATE',message:'Invalid contractual due date remains unscheduled.'});
   if(override?.date&&!currentOverride)warnings.push({orderId:o.id,milestoneKey,code:'STALE_PLANNED_DATE',message:'The PO revision or payment obligation changed. Review and save the planning date again.'});
   else if(override?.date&&!plannedDate)warnings.push({orderId:o.id,milestoneKey,code:'INVALID_PLANNED_DATE',message:'Invalid saved planning date was ignored.'});
   const matched=allocations.filter(a=>m.ciId?a.ciId===m.ciId:!a.ciId&&a.termIndex===m.index&&(m.trigger==='PI'||a.shipmentId===m.shipmentId));
   const reportedMinor=sum(matched.map(a=>a.expectedMinor)),realizedMinor=sum(matched.map(a=>a.realizedMinor??0)),amountMinor=sum([m.amount]);
   const blockers=readiness(o,m),futureMinor=Math.max(0,sum([amountMinor,-reportedMinor])),overpaidMinor=Math.max(0,sum([reportedMinor,-amountMinor]));
   const row={...identity,id:dateKey,dateKey,milestoneKey,name:m.name,trigger:m.trigger,termIndex:m.index,shipmentId:m.shipmentId,shipmentLabel:m.shipmentLabel||null,ciId:m.ciId||null,dueDate,plannedDate,effectiveDate,month:effectiveDate?.slice(0,7)||null,planRemarks:text(override?.remarks),amountMinor,reportedMinor,realizedMinor,futureMinor,overpaidMinor,...acknowledgement(matched),authorized:!!m.authorized,ready:!blockers.length,blockers,awaiting:m.awaiting||null};
   row.status=statusFor(row,asOf);rows.push(row);
   if(overpaidMinor)warnings.push({orderId:o.id,milestoneKey,code:'OVERPAID_MILESTONE',message:'Reported remittances exceed this milestone; the excess is shown separately and does not create a negative cash plan.'});
   if(row.acknowledgementDifferenceMinor)warnings.push({orderId:o.id,milestoneKey,code:'SUPPLIER_RECEIPT_DIFFERENCE',message:'Acknowledged supplier receipts differ from reported remittances. Review settlement separately; this difference is not an authorized future payment.',currency:o.currency,amountMinor:row.acknowledgementDifferenceMinor});
  }
  if(ciEnabled(o)){
   const invoices=ciInvoices(o),grossInvoicesMinor=sum(invoices.map(c=>c.amountMinor)),appliedAdvanceMinor=sum(invoices.flatMap(c=>c.advanceApplications.map(a=>a.amountMinor))),advanceMinor=sum(schedule.filter(m=>m.trigger==='PI').map(m=>m.amount)),reportedAdvanceMinor=sum(allocations.filter(a=>!a.ciId&&o.paymentTerms.steps[a.termIndex]?.trigger==='PI').map(a=>a.expectedMinor));
   const totalMinor=sum([orderTotal(o)]),grossUninvoicedMinor=Math.max(0,sum([totalMinor,-grossInvoicesMinor])),unappliedAdvanceMinor=Math.max(0,sum([Math.max(advanceMinor,reportedAdvanceMinor),-appliedAdvanceMinor])),unappliedReportedAdvanceMinor=Math.max(0,sum([reportedAdvanceMinor,-appliedAdvanceMinor])),unreconciledAdvanceMinor=Math.max(0,sum([unappliedAdvanceMinor,-grossUninvoicedMinor])),unreconciledPaidAdvanceMinor=Math.max(0,sum([unappliedReportedAdvanceMinor,-grossUninvoicedMinor])),amountMinor=Math.max(0,sum([grossUninvoicedMinor,-unappliedAdvanceMinor])),overInvoicedMinor=Math.max(0,sum([grossInvoicesMinor,-totalMinor]));
   if(amountMinor||grossUninvoicedMinor||overInvoicedMinor||unreconciledAdvanceMinor)commitments.push({...identity,id:paymentPlannerDateKey(o.id,'CI_UNINVOICED'),name:'Uninvoiced PO commitment',kind:'CI_UNINVOICED',milestoneKey:null,amountMinor,futureMinor:amountMinor,reportedMinor:0,realizedMinor:0,awaitingAcknowledgementMinor:0,awaitingAcknowledgementCount:0,acknowledgementDifferenceMinor:0,overpaidMinor:0,grossUninvoicedMinor,unappliedAdvanceMinor,unappliedReportedAdvanceMinor,unreconciledAdvanceMinor,unreconciledPaidAdvanceMinor,appliedAdvanceMinor,overInvoicedMinor,status:'ESTIMATE',dueDate:null,plannedDate:null,effectiveDate:null,month:null,ready:false,authorized:false,blockers:['Record and review the actual Commercial Invoice before payment.'],reason:'PO value not covered by recorded Commercial Invoices, less advance already represented in the plan. Actual future CI values and advance reconciliation can change this estimate.'});
   if(unreconciledAdvanceMinor)warnings.push({orderId:o.id,code:'UNRECONCILED_PI_ADVANCE',currency:o.currency,amountMinor:unreconciledAdvanceMinor,unreconciledPaidAdvanceMinor,message:'Review unapplied advance against recorded invoices; gross obligations may overlap. This includes scheduled or reported PI advance beyond the remaining uninvoiced PO value. Approved CI obligations were not automatically reduced.'});
   if(overInvoicedMinor)warnings.push({orderId:o.id,code:'CI_EXCEEDS_PO',message:'Recorded CI values exceed the PO value. Existing CI obligations remain visible; no negative commitment or automatic credit was created.'});
   if(allocations.some(a=>!a.ciId&&o.paymentTerms.steps[a.termIndex]?.trigger!=='PI'))warnings.push({orderId:o.id,code:'LEGACY_CI_PAYMENT',message:'Legacy balance payments coexist with CI mode; review their allocation before using the estimate.'});
  }
  const unmatched=allocations.filter(a=>!schedule.some(m=>m.ciId?a.ciId===m.ciId:!a.ciId&&m.index===a.termIndex&&(m.trigger==='PI'||m.shipmentId===a.shipmentId)));
  if(unmatched.length){
   warnings.push({orderId:o.id,code:'UNMATCHED_PAYMENT',message:'Retained remittances do not match a current milestone; review the original payment history.',currency:o.currency,reportedMinor:sum(unmatched.map(a=>a.expectedMinor)),...acknowledgement(unmatched)});
   for(const a of unmatched){
    const ack=acknowledgement([a]);
    rows.push({...identity,id:JSON.stringify([o.id,'PAYMENT_RECONCILIATION',a.payment.id,a.id]),dateKey:null,milestoneKey:null,name:'Retained remittance '+(a.payment.reference||a.payment.id),trigger:'RECONCILIATION',kind:'PAYMENT_RECONCILIATION',termIndex:a.termIndex,shipmentId:a.shipmentId||null,shipmentLabel:null,ciId:a.ciId||null,paymentId:a.payment.id,allocationId:a.id,dueDate:null,plannedDate:null,effectiveDate:null,month:null,planRemarks:'',amountMinor:0,reportedMinor:sum([a.expectedMinor]),realizedMinor:sum([a.realizedMinor??0]),futureMinor:0,overpaidMinor:0,...ack,authorized:false,ready:false,blockers:['This retained payment does not match a current obligation. Review its original payment history.'],awaiting:null,status:ack.awaitingAcknowledgementCount?'AWAITING_ACKNOWLEDGEMENT':ack.acknowledgementDifferenceMinor?'RECEIPT_DIFFERENCE':'PAYMENT_RECONCILIATION'});
    if(ack.acknowledgementDifferenceMinor)warnings.push({orderId:o.id,code:'SUPPLIER_RECEIPT_DIFFERENCE',message:'A retained remittance has a supplier receipt difference. Review the original payment history before any settlement.',currency:o.currency,paymentId:a.payment.id,amountMinor:ack.acknowledgementDifferenceMinor});
   }
  }
 }
 rows.sort((a,b)=>(a.effectiveDate||'9999-99-99').localeCompare(b.effectiveDate||'9999-99-99')||String(a.orderNumber).localeCompare(String(b.orderNumber),undefined,{numeric:true})||String(a.milestoneKey||a.id).localeCompare(String(b.milestoneKey||b.id)));
 const months=paymentPlannerMonths(rows,rates);
 return {asOf,rows,commitments,months,unscheduled:rows.filter(r=>!r.effectiveDate&&r.futureMinor>0),totals:paymentPlannerTotals(rows),warnings};
}

export function applyPaymentPlannerCommand(state,type,p,ctx,{event,findOrder}){
 ensure(PAYMENT_PLANNER_COMMANDS.includes(type),'Unsupported payment planner command.');
 ensure(canApprove(ctx.user,'LAE_IMPORT'),'Purchase Manager or Admin access is required for payment planning.','FORBIDDEN');
 ensure(p&&typeof p==='object'&&!Array.isArray(p),'Provide a payment planning object.');
 const remarks=text(p.remarks);ensure(remarks.length>=3&&remarks.length<=2000&&!/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(remarks),'Enter a meaningful planning reason (3–2000 characters).');
 const plan=state.settings.paymentPlanner??={rates:{},dates:{}};plan.rates??={};plan.dates??={};
 const metadata={remarks,updatedAt:ctx.now,updatedBy:ctx.user.name,updatedById:ctx.user.id};
 if(type==='SAVE_PAYMENT_PLAN_RATE'){
  ensure(Object.keys(p).every(k=>['month','rate','remarks'].includes(k)),'Supply only month, rate and remarks.');
  ensure(monthValid(p.month),'Choose a valid planning month YYYY-MM from 1900 onwards.');
  ensure(text(p.rate).length<=32,'Planning exchange rate exceeds the supported length.');
  const rate=toRate(p.rate),old=Object.hasOwn(plan.rates,p.month)?structuredClone(plan.rates[p.month]):null,next={rate,...metadata};
  plan.rates[p.month]=next;event('settings','paymentPlanner','PAYMENT_PLAN_RATE_SAVED','Monthly estimated INR per USD planning rate saved.',old,{month:p.month,...next});return {month:p.month,rate};
 }
 ensure(Object.keys(p).every(k=>['orderId','milestoneKey','date','remarks'].includes(k)),'Supply only order, milestone, planning date and remarks.');
 ensure(typeof p.orderId==='string'&&p.orderId.length>0&&p.orderId.length<=200,'Select a valid order.');
 const o=findOrder(p.orderId);ensure(o.scope==='LAE_IMPORT'&&issued(o),'Select an issued LAE Import business order.');
 ensure(typeof p.milestoneKey==='string'&&p.milestoneKey.length>0&&p.milestoneKey.length<=500,'Select a current payment milestone.');
 const milestone=paymentSchedule(state,o).find(m=>paymentPlannerMilestoneKey(m)===p.milestoneKey);ensure(milestone,'Payment milestone no longer exists. Refresh the planner.');
 ensure(p.date===''||planDateValid(p.date),'Planning date must be a valid YYYY-MM-DD date from 1900 onwards, or empty to restore the contractual due date.');
 const dateKey=paymentPlannerDateKey(o.id,p.milestoneKey),old=Object.hasOwn(plan.dates,dateKey)?structuredClone(plan.dates[dateKey]):null,next={orderId:o.id,milestoneKey:p.milestoneKey,fingerprint:paymentPlannerMilestoneFingerprint(o,milestone),date:p.date,...metadata};
 if(p.date)plan.dates[dateKey]=next;else delete plan.dates[dateKey];
 event('order',o.id,'PAYMENT_PLAN_DATE_SAVED','Planning date saved separately from contractual terms and payment authorization.',old,next);return {id:o.id,milestoneKey:p.milestoneKey,date:p.date};
}
