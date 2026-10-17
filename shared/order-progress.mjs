import {CI_RULES,ciEnabled,ciInvoices,ciDispatchReadiness} from './ci-payments.mjs';
import {processGateAllowed,processGateDone,pendingProcessExemptions} from './process-exemptions.mjs';
import {arrivalCostingStatus} from './arrival-costing.mjs';
import {canEdit,canPerformApproval,approvalRoles,issueReadiness,initialPaymentStatus,shipmentTotals,paymentSchedule,financials,orderTotal,hasValueTerms,formatMoney} from './domain.mjs';
import {shippingDocReadiness} from './shipping.mjs';

/** Read-only navigation advice. Domain commands remain the authority for every save. */
export function orderProgress(state,o,user){
 const edit=canEdit(user,o),quantities=shipmentTotals(o),pay=initialPaymentStatus(state,o);
 const approval=command=>canPerformApproval(user,command,o.scope,null,state,o);
 const names={MANAGER:'Purchase Manager',EXECUTIVE:'Purchase Executive',PRODUCT_MANAGER:'Product Manager'};
 const waitFor=command=>[...approvalRoles(state,command).map(r=>names[r]||r),'Admin'].join(' / ');
 const advice=(step,title,checks,action=null,label='',data={},allowed=edit,role=null)=>({step,title,checks,action:allowed?action:null,label,data,blocked:!allowed&&!!action,reason:!allowed&&action?'Ask '+(role?waitFor(role):'the assigned Purchase Executive or Purchase Manager')+' to complete this step.':'',complete:false});
 if(o.deletedAt)return advice(0,'Order is deleted',['Ask Admin to restore this order before making changes.'],null);
 if(o.amendment)return advice(2,'Review the proposed change',['Compare the new quantities, prices and terms with the issued PO.','Check the reason. Approval creates a new revision; earlier issued copies stay unchanged.'],'approve-amendment','Review revision',{},approval('APPROVE_AMENDMENT'),'APPROVE_AMENDMENT');
 if(o.status==='DRAFT'){const gaps=issueReadiness(state,o);return advice(1,gaps.length?'Complete the purchase order':'Check and submit the purchase order',gaps.length?gaps:['Check the supplier, item, quantity and invoice currency against the supplier quote.','Check the agreed exchange rate/date, unit prices, total and payment terms.','Submit only after these details match.'],'submit-po','Submit for approval');}
 if(o.status==='PENDING_APPROVAL')return advice(2,'PO approval is required',['Check the supplier quote, item quantities, currency, total and payment terms.','Issue only if the PO is correct. Use Return for correction if needed.'],'approve-po','Approve & issue',{},approval('APPROVE_ORDER'),'APPROVE_ORDER');
 if(!o.revisions.length)return advice(2,'Check the order status',['No issued PO was found. Ask your Purchase Manager to review the order before recording supplier documents.']);
 if(o.manualClosed)return advice(12,'Order was short closed',['Unfulfilled quantities remain in history.','Open PI & payments to check outstanding receipts or balances.'],'tab','Review payments',{value:'finance'},true);
 const nextCommercial='PAYMENT';
 if(!processGateAllowed(o,'CONFIRM',o.pi?.status!=='APPROVED'?'PI_RECORD':(!processGateDone(o,'SPEC_CONFIRM')&&!processGateAllowed(o,'SPEC_CONFIRM',nextCommercial)?'TECHNICAL':nextCommercial)))return advice(3,'Get the supplier to confirm the PO',['Send the current issued PO to the supplier.','Check that the reply refers to this PO and revision.','Attach the supplier reply; do not use an internal message as supplier confirmation.'],'supplier','Supplier PO acknowledgement');
 if(!o.pi)return advice(4,'Record the supplier PI',['PI means the supplier proforma invoice.','Enter the number and date exactly as shown on the PI.','Check supplier, currency, quantity and total, then attach the PI.'],'pi','Record supplier PI');
 if(['RECEIVED','REVERIFY'].includes(o.pi.status))return advice(4,'Compare the PI with this PO',['Check the PI number and supplier.','Match currency, quantity, total, payment terms and delivery commitment.','If they differ, replace the PI or request a controlled PO revision.'],'verify-pi','Verify PI');
 if(o.pi.status==='VERIFIED')return advice(4,'PI approval is required',['The PI has been checked.','An allowed approver must review it before payments and production can continue.'],'approve-pi','Approve PI',{},approval('APPROVE_PI'),'APPROVE_PI');
 if(o.pi.status!=='APPROVED')return advice(4,'Review the PI status',['Ask the Purchase Manager to review this PI. Do not skip approval.']);
 if(!processGateAllowed(o,'SPEC_CONFIRM',!processGateDone(o,'ARTWORK')&&!processGateAllowed(o,'ARTWORK',nextCommercial)?'ARTWORK':nextCommercial))return advice(5,'Confirm the product specifications',['Send the correct technical details for this PO revision.','Attach the supplier confirmation and explain what was confirmed.'],'technical-confirm','Technical specification confirmation');
 if(!processGateAllowed(o,'ARTWORK',nextCommercial)&&o.artwork?.pending)return advice(5,'Artwork approval is required',['Review the submitted label, packaging and branding.','Do not send unapproved artwork for production.'],'approve-artwork','Approve artwork',{},approval('APPROVE_ARTWORK'),'APPROVE_ARTWORK');
 if(!processGateAllowed(o,'ARTWORK',nextCommercial)&&!o.artwork?.current)return advice(5,'Submit the artwork',['Attach the correct label, packaging and branding files.','Check the item and brand before submitting for approval.'],'artwork','Submit artwork');
 if(!processGateAllowed(o,'ARTWORK',nextCommercial)&&o.artwork.supplierConfirmed?.artworkId!==o.artwork.current?.id)return advice(5,'Get the supplier to confirm the artwork',['Send the current approved artwork.','Attach the supplier reply confirming that exact artwork version.'],'artwork-confirm','Supplier artwork confirmation');
 if(pay.required&&!pay.complete)return advice(6,'Record the advance payment',['Record only a payment already made by your bank. This software does not transfer money.','Check the bank reference, payment currency, amount and bank exchange rate.','Attach the SWIFT/bank proof. Supplier receipt is recorded separately.'],'initial-payment','Complete payment',{},approval('COMPLETE_INITIAL_PAYMENT'),'COMPLETE_INITIAL_PAYMENT');
 if(!o.productionWindowStartedAt)return advice(6,'Review production readiness',['Commercial confirmations are recorded, but the production lead-time start is missing. Ask the Purchase Manager to review this order.']);
 if(!processGateAllowed(o,'SAMPLE','PRODUCTION')&&(!o.preproductionSample||o.preproductionSample.status==='REJECTED'))return advice(7,o.preproductionSample?'Record a corrected sample':'Record sample completion',['Get evidence that the pre-production sample is complete.','Check the item and required changes. A rejected sample must be corrected.'],'preprod-sample','Record sample completion');
 if(o.preproductionSample?.status==='COMPLETED'&&!['CONFIRM','SPEC_CONFIRM','ARTWORK'].every(stage=>processGateDone(o,stage)))return advice(7,'Finish deferred work before sample QC approval',['Complete the supplier acknowledgement, specification confirmation and artwork confirmation.','Pre-production sample QC is the mandatory boundary; exemptions cannot carry past it.'],'tab','Open pending processes',{value:'processes'},true);
 if(!processGateAllowed(o,'SAMPLE','PRODUCTION'))return advice(7,'Review the pre-production sample',['Compare the sample with the approved specifications and artwork.','Approve only when acceptable; record issues if it must be corrected.'],'approve-preprod-sample','Approve pre-production sample',{},approval('APPROVE_PREPRODUCTION_SAMPLE'),'APPROVE_PREPRODUCTION_SAMPLE');
 if(!o.productionStartedAt)return advice(8,'Start bulk production',['The sample must be approved first.','Record the supplier-confirmed production start and expected completion dates.'],'start-production','Start bulk production');
 if(!o.productionCompletedAt&&!processGateAllowed(o,'BULK_QC','COMPLETE_PRODUCTION'))return advice(8,'Record the bulk quality check',['QC means quality check. Inspect the actual production against the agreed requirements.','Attach evidence. Record issues honestly; production completion requires PASS.'],'bulk-qc','Record bulk QC');
 if(!o.productionCompletedAt&&!processGateAllowed(o,'READY','RELEASE')&&!processGateAllowed(o,'READY','DISPATCH'))return advice(8,'Confirm production completion',['Confirm production is actually complete and bulk QC has passed.','Enter the actual completion date and explain any delay.'],'complete-production','Complete production');
 const active=o.shipments.filter(s=>s.status!=='CANCELLED'),ship=active.find(s=>!s.actualArrival);
 if(!ship&&quantities.allocated<quantities.required)return advice(9,'Plan the remaining shipment',['Allocate only the remaining PO quantity.','Check container, origin, destination, planned departure and arrival.'],'shipment','Plan shipment');
 if(ship){const data={shipment:ship.id};
  if(!ship.actualDeparture&&ship.bookingStatus==='PLANNED')return advice(9,'Book the container',['Check shipment '+ship.number+' and its quantities.','Record the forwarder booking reference and agreed freight.'],'container-book','Book container',data);
  if(!ship.actualDeparture&&ship.bookingStatus==='BOOKED')return advice(9,'Confirm container release',['Confirm the container is released for shipment '+ship.number+'.','Check container and seal numbers against the forwarder documents.'],'container-release','Container released',data);
  if(!ship.actualDeparture){
   const inland=(ship.trackingMilestones||[]).some(m=>['FACTORY_LOADING','INLAND_ORIGIN','RAIL_RIVER_STATION','RAIL_RIVER_TRANSIT','ORIGIN_PORT'].includes(m.key)&&(m.actualDate||m.status==='COMPLETED'));
   if(!inland)return advice(10,'Record movement to the origin port',['Use the forwarder update for shipment '+ship.number+'.','Enter actual movement only when confirmed; keep estimated dates separate.'],'tracking-milestone','Update inland tracking',data);
   const missing=shippingDocReadiness(o,ship);if(missing.length)return advice(10,'Add the shipping documents',['Check the document belongs to shipment '+ship.number+'.','Commercial invoices need a supplier invoice number and date.','Match invoice and packing-list quantities to the shipment.'],'document','Upload '+missing[0].replaceAll('_',' ').toLowerCase(),{...data,docType:missing[0]});
   const ciBlock=ciDispatchReadiness(state,o,ship);if(ciBlock)return advice(10,'Review the CI balance before shipment',[ciBlock],'tab','Review CI & payments',{value:'finance'},true);
   if(paymentSchedule(state,o).some(m=>m.trigger==='SHIPMENT'&&m.shipmentId===ship.id&&m.reported<m.amount))return advice(10,'Complete the before-shipment payment',['Open PI & payments. Check the authorized obligation for this shipment.','Record bank evidence and allocate the amount to this original PO.'],'tab','Review payments',{value:'finance'},true);
   return advice(10,'Confirm loaded on vessel',['Factory container loading and inland movement are separate from ocean departure. Their saved updates remain recorded.','Confirm shipment '+ship.number+' is actually on the vessel, then enter the vessel, voyage and actual departure date.'],'dispatch','Loaded on vessel',data);
  }
  if(!processGateAllowed(o,'BL',ship.insurance?.insuredAt?'ARRIVAL':'INSURANCE',ship.id))return advice(11,'Verify the final bill of lading',['BL means bill of lading, the shipping document.','Check vessel, container, ports and shipment details against the final BL.'],'bl','Final BL / verify',data);
  if(!processGateAllowed(o,'INSURANCE','ARRIVAL',ship.id))return advice(11,'Record shipment insurance',['Check the shipment and insured value against the policy.','Attach the insurance evidence and record its date.'],'insurance','Complete insurance',data);
  return advice(11,'Confirm arrival at the Indian port',['Confirm actual arrival for shipment '+ship.number+'.','Use the actual date and explain any delay. Other shipments may still be outstanding.'],'arrival','India port arrival',data);
 }
 const f=financials(state,o),invoices=ciInvoices(o),ciBasis=ciEnabled(o);
 if(ciBasis&&(o.ciPaymentPolicy.pendingApproval||!invoices.length||invoices.some(c=>c.status!=='APPROVED'||c.orderRevision!==o.revision)||o.shipments.filter(s=>s.status!=='CANCELLED').some(s=>ciDispatchReadiness(state,o,s))))return advice(12,'Review the Commercial Invoice settlement',['Record and approve the CI value and advance adjustment for every shipment.','Resolve any unpaid before-shipment balance or missing invoice settlement.'],'tab','Review CI & payments',{value:'finance'},true);
 const settlementBalance=ciBasis?invoices.reduce((n,c)=>n+c.amountMinor,0)-f.realized:f.balance;
 if(f.pending||settlementBalance!==0)return advice(12,'Review receipts and the remaining balance',['Port arrival does not settle the payment balance.','Record the amount the supplier actually received.',ciBasis?'Reconcile receipts against the approved CI total, including the PI advance; unused advances and receipt differences remain for review.':'Resolve shortages or excess on this original order with supporting evidence.'],'tab','Review payments',{value:'finance'},true);
 if(pendingProcessExemptions(o).length)return advice(13,'Finish the deferred processes',['Approved exemptions allowed selected work to proceed. The skipped work is still pending.','Open each pending process, add the actual confirmations or evidence, and complete its normal approval.'],'tab','Open pending processes',{value:'processes'},true);
 const costing=arrivalCostingStatus(o);if(!costing.complete)return advice(13,'Complete final arrival costing',['Upload the inward Bill of Entry and match each commercial invoice to the arrived shipment.','Enter supplier payment, actual duties and net expenses. GST stays separate.','Review each product cost; keep missing actuals provisional and finalize after confirmation.'],'tab','Open final costing',{value:'costing'},true);
 return {...advice(13,'Order, payment and costing checks complete',[ciBasis?'All allocated quantities have arrived and recorded supplier receipts balance to the approved Commercial Invoices.':'All allocated quantities have arrived and recorded supplier receipts balance to the order.','Keep the issued PO, invoices, bank evidence and shipment documents for review.']),complete:quantities.arrived>=quantities.required&&quantities.required>0};
}

/** Independent saved progress lanes. Reporting a bank payment never advances or clears a shipment. */
export function orderJourney(state,o){
 const terms=paymentSchedule(state,o),initial=initialPaymentStatus(state,o),quantities=shipmentTotals(o);
 const payments=terms.map(m=>({...m,outstanding:Math.max(0,m.amount-m.reported),stage:({PI:'Advance / PI',SHIPMENT:'Before vessel departure',BL:'After final BL',CI:'CI balance · '+(CI_RULES[o.ciPaymentPolicy?.rule]||'review payment terms')})[m.trigger]||m.trigger,
  status:m.reported>=m.amount?'Recorded':m.reported>0?'Partly recorded':'Pending',receiptStatus:m.paid>=m.amount?'Received':'Receipt / balance pending'}));
 const make=(key,label,done,date,detail='')=>({key,label,status:done?'Completed':'Pending',date:date||null,detail});
 const shipments=(o.shipments||[]).filter(s=>s.status!=='CANCELLED').map(s=>{
  const tracking=s.trackingMilestones||[],missing=shippingDocReadiness(o,s),inlandKeys=['INLAND_ORIGIN','RAIL_RIVER_STATION','RAIL_RIVER_TRANSIT','ORIGIN_PORT'];
  const movement=tracking.filter(m=>['FACTORY_LOADING',...inlandKeys].includes(m.key)),movementRecorded=movement.some(m=>m.actualDate||m.status==='COMPLETED');
  const track=(key,label)=>{const rows=tracking.filter(m=>key==='inland'?inlandKeys.includes(m.key):m.key===key),done=rows.filter(m=>m.actualDate||m.status==='COMPLETED'),date=done.map(m=>m.actualDate).filter(Boolean).sort().at(-1);const status=!rows.length?'Not recorded':key==='inland'?'Updates recorded':done.length?'Completed':rows.some(m=>m.status==='DELAYED')?'Delayed':rows.some(m=>m.status==='IN_PROGRESS')?'In progress':'Planned';return {key,label,status,date:date||null,detail:rows.map(m=>m.key.replaceAll('_',' ').toLowerCase()+': '+String(m.status||'Recorded').replaceAll('_',' ')).join('; ')};};
  const stages=[make('container','Container release',!!s.actualDeparture||['RELEASED','ON_VESSEL','ARRIVED'].includes(s.bookingStatus),s.releaseDate),track('FACTORY_LOADING','Factory loading'),track('inland','Inland movement'),make('documents','Commercial invoice & packing list',!missing.length,null,missing.map(x=>x.replaceAll('_',' ').toLowerCase()).join(', ')),make('vessel','Loaded on vessel',!!s.actualDeparture,s.actualDeparture),make('bl','Final BL',!!(s.blNumber&&s.blDate),s.blDate,s.blNumber||''),make('insurance','Insurance declaration',!!s.insurance?.insuredAt,s.insurance?.insuredAt),make('arrival','India port arrival',!!s.actualArrival,s.actualArrival)];
  const blockers=[];let next='Shipment arrived';
  if(!s.actualDeparture){
   next='Confirm loaded on vessel';
   const pi=o.pi;
   if(!(pi?.status==='APPROVED'&&pi.revision===o.revision&&pi.currency===o.currency&&pi.amountMinor===orderTotal(o)&&pi.quantity===quantities.required&&pi.termsConfirmed&&pi.commitmentConfirmed))blockers.push('Approve a matching PI for the current PO revision.');
   if(hasValueTerms(o.paymentTerms)&&!initial.complete)blockers.push('Complete the current advance payment.');
   if(!o.productionCompletedAt)blockers.push('Confirm production completion.');
   if(o.bulkQc?.result!=='PASS')blockers.push('Record bulk QC as PASS.');
   if(s.bookingStatus!=='RELEASED')blockers.push('Book and release this container.');
   if(o.confirmation?.revision!==o.revision)blockers.push('Confirm the current PO with the supplier.');
   if(o.technicalConfirmation?.revision!==o.revision)blockers.push('Obtain current technical confirmation.');
   if(!(o.artwork?.current&&!o.artwork.pending&&o.artwork.supplierConfirmed?.artworkId===o.artwork.current.id))blockers.push('Complete current artwork approval and supplier confirmation.');
   blockers.push(...missing.map(type=>'Upload the final '+type.replaceAll('_',' ').toLowerCase()+' for this shipment.'));
   for(const m of payments.filter(m=>m.trigger==='SHIPMENT'&&m.shipmentId===s.id&&m.outstanding>0))blockers.push(m.name+': '+formatMoney(m.outstanding,o.currency)+' before-shipment payment outstanding.');
   const ciBlock=ciDispatchReadiness(state,o,s);if(ciBlock)blockers.push(ciBlock);
   if(!s.container)blockers.push('Record the container number.');
  }else if(!s.blNumber||!s.blDate){next='Record final BL';blockers.push('Enter the final BL number, date and evidence for this shipment.');}
  else if(!s.insurance?.insuredAt){next='Record insurance declaration';blockers.push('Enter the shipment insurance declaration and evidence.');}
  else if(!s.actualArrival){next='Confirm India port arrival';blockers.push('Record the actual India port arrival date when confirmed.');}
  const reportedVessel=!s.actualDeparture&&tracking.some(m=>m.key==='ON_VESSEL');
  return {id:s.id,number:s.number,quantity:s.lines.reduce((n,l)=>n+l.quantity,0),stages,blockers,next,arrived:!!s.actualArrival,
   guidance:!s.actualDeparture?(reportedVessel?'A tracking update reports vessel loading. Confirm actual vessel departure using the Loaded on vessel action.':movementRecorded?'Factory / inland updates are saved. Vessel departure still needs its own confirmation.':'Record confirmed factory / inland updates for the route; these do not confirm vessel departure.'):'Departure and completed documents stay recorded when later payments are entered.'};
 });
 return {production:{status:o.productionCompletedAt?'Completed':o.productionStartedAt?'In progress':'Pending',date:o.productionCompletedAt||o.productionStartedAt||null},payments,shipments,unallocated:Math.max(0,quantities.required-quantities.allocated)};
}
