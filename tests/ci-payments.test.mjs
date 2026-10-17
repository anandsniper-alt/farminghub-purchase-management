import test from 'node:test';
import assert from 'node:assert/strict';
import {createSeed} from '../shared/seed.mjs';
import {execute,paymentSchedule,allocationsFor,major,orderTotal} from '../shared/domain.mjs';
import {ciBalance,ciInvoices,ciAdvanceAvailable,ciReadiness} from '../shared/ci-payments.mjs';
import {orderJourney} from '../shared/order-progress.mjs';
const seed=createSeed('2026-10-15');let serial=0;
function fixture(rule='FINAL_BL'){
 let state=structuredClone(seed);const id=state.orders[0].id,user=state.users.find(u=>u.role==='MANAGER');
 const o=()=>state.orders.find(o=>o.id===id),shipmentId=o().shipments[0].id;
 const run=(type,p={},actor=user)=>{const out=execute(state,{type,payload:{orderId:id,...p}},actor,{now:'2026-10-15T09:30:00.000Z',id:()=>`ci-test-${++serial}`});state=out.state;return out.result;};
 run('CONFIGURE_CI_PAYMENTS',{rule,days:0,confirm:true,reason:'Local test agreement'});
 const save=(amount='50000',advance='10000',documentId=o().documents.find(d=>d.type==='COMMERCIAL_INVOICE').id)=>run('SAVE_COMMERCIAL_INVOICE',{amount,advance,documentId}).id;
 const approve=ciId=>run('APPROVE_COMMERCIAL_INVOICE',{ciId,confirm:true});
 const milestone=ciId=>paymentSchedule(state,o()).find(m=>m.ciId===ciId);
 const authorize=ciId=>run('AUTHORIZE_PAYMENT',{termIndex:milestone(ciId).index,shipmentId});
 const pay=(ciId,amount,extra={})=>{
  const f={id:`proof-${++serial}`,scope:'LAE_IMPORT',orderIds:[id],name:'Bank evidence'};state.files.push(f);
  return run('RECORD_PAYMENT',{reference:`BANK-${serial}`,date:'2026-10-15',currency:'USD',amount,inrRate:'85',fileId:f.id,allocations:[{orderId:id,termIndex:milestone(ciId).index,shipmentId,amount}],...extra});
 };
 return {get state(){return state},o,run,user,save,approve,authorize,pay,milestone,shipmentId};
}
test('CI obligation uses actual CI value less recorded advance, not PO percentage',()=>{
 const f=fixture(),id=f.save();f.approve(id);const m=f.milestone(id);
 assert.equal(m.amount,4000000);assert.notEqual(m.amount,orderTotal(f.o())*.7);
 assert.deepEqual(paymentSchedule(f.state,f.o()).map(m=>m.trigger),['PI','CI']);
 assert.equal(ciAdvanceAvailable(f.state,f.o()),837500);
});
test('standard rule blocks authorization before final BL; sailing rule permits it',()=>{
 for(const rule of ['FINAL_BL','SAILING']){const f=fixture(rule),id=f.save();f.approve(id);delete f.o().shipments[0].blNumber;delete f.o().shipments[0].blDate;
  if(rule==='FINAL_BL')assert.throws(()=>f.authorize(id),/final BL/);else{f.authorize(id);assert.equal(f.milestone(id).authorized,true);f.pay(id,'40000');assert.equal(ciBalance(f.state,f.o(),ciInvoices(f.o())[0]).balance,0);assert.equal(f.o().shipments[0].blNumber,undefined);}
 }
});
test('sailing needs actual departure evidence and approved CI; tracking alone cannot release payment',()=>{
 const f=fixture('SAILING'),id=f.save();assert.throws(()=>f.authorize(id),/Approve this Commercial Invoice/);f.approve(id);
 delete f.o().shipments[0].actualDeparture;assert.throws(()=>f.authorize(id),/actual vessel departure/);
 f.o().shipments[0].actualDeparture='2026-10-01';f.o().shipments[0].departureOutcome={};assert.throws(()=>f.authorize(id),/confirmation remarks/);
});
test('partial payments reduce balance and require fresh authorization without restarting shipping',()=>{
 const f=fixture(),id=f.save();f.approve(id);f.authorize(id);const shipment=structuredClone(f.o().shipments);
 f.pay(id,'10000');assert.equal(f.milestone(id).amount-f.milestone(id).reported,3000000);assert.equal(f.milestone(id).authorized,false);
 assert.throws(()=>f.pay(id,'100'),/not authorized/);f.authorize(id);f.pay(id,'30000');
 assert.equal(ciBalance(f.state,f.o(),ciInvoices(f.o())[0]).balance,0);assert.deepEqual(f.o().shipments,shipment);
 assert.equal(orderJourney(f.state,f.o()).payments.find(m=>m.ciId===id).status,'Recorded');assert.throws(()=>f.authorize(id),/no unpaid amount/);
});
test('overpayment and backdated payment are rejected atomically',()=>{
 const f=fixture(),id=f.save();f.approve(id);f.authorize(id);const count=f.state.payments.length;
 assert.throws(()=>f.pay(id,'40000.01'),/outstanding amount/);assert.equal(f.state.payments.length,count);
 assert.throws(()=>f.pay(id,'1',{date:'2026-09-01'}),/cannot precede/);
 assert.throws(()=>f.pay(id,'1',{residualSettlement:true,settlementReason:'test'}),/overpayments/);
});
test('advance cannot be allocated twice across CIs or lost by voiding its payment',()=>{
 const f=fixture(),first=f.save();const doc=structuredClone(f.o().documents.find(d=>d.type==='COMMERCIAL_INVOICE'));doc.id='second-doc';doc.invoiceNumber='CI-SECOND';f.o().documents.push(doc);
 assert.throws(()=>f.save('20000','9000',doc.id),/unallocated advance/);
 const second=f.save('20000','8375',doc.id);assert.equal(ciAdvanceAvailable(f.state,f.o()),0);
 const source=ciInvoices(f.o())[0].advanceApplications[0].paymentId;
 assert.throws(()=>f.run('VOID_PAYMENT',{paymentId:source,remarks:'test'}),/reserved for a CI/);
 f.run('CANCEL_COMMERCIAL_INVOICE',{ciId:second,reason:'Correction'});assert.equal(ciAdvanceAvailable(f.state,f.o()),837500);
 assert.throws(()=>f.save('20000','0'),/already has a settlement/);assert.ok(first);
});
test('editing a CI invalidates approval and authorization; paid CIs are protected',()=>{
 const f=fixture(),id=f.save();f.approve(id);f.authorize(id);const c=ciInvoices(f.o())[0];
 f.run('SAVE_COMMERCIAL_INVOICE',{ciId:id,documentId:c.documentId,amount:'45000',advance:'10000'});assert.equal(f.milestone(id).authorized,false);assert.equal(ciInvoices(f.o())[0].status,'RECEIVED');
 f.approve(id);f.authorize(id);f.pay(id,'1000');
 assert.throws(()=>f.run('SAVE_COMMERCIAL_INVOICE',{ciId:id,documentId:c.documentId,amount:'45000',advance:'10000'}),/Payments already exist/);
 assert.throws(()=>f.run('CANCEL_COMMERCIAL_INVOICE',{ciId:id,reason:'test'}),/Correct \/ void/);
});
test('policy changes invalidate authorization; ordinary executive cannot approve',()=>{
 const f=fixture(),id=f.save();f.approve(id);f.authorize(id);
 f.run('CONFIGURE_CI_PAYMENTS',{rule:'SAILING',days:30,confirm:true,reason:'Agreed credit'});assert.equal(f.milestone(id).authorized,false);assert.equal(f.milestone(id).due,'2026-10-30');
 const exec=f.state.users.find(u=>u.role==='EXECUTIVE');
 assert.throws(()=>f.run('CONFIGURE_CI_PAYMENTS',{rule:'SAILING',days:0,confirm:true,reason:'x'},exec),/manager/);
 assert.throws(()=>f.run('APPROVE_COMMERCIAL_INVOICE',{ciId:id,confirm:true},exec),/manager/);
});
test('legacy balance payments prevent silent conversion, and old milestones remain intact',()=>{
 const state=structuredClone(seed),o=state.orders[0],user=state.users.find(u=>u.role==='MANAGER');state.payments.push({id:'legacy',status:'REPORTED',allocations:[{id:'legacy-allocation',orderId:o.id,termIndex:1,shipmentId:o.shipments[0].id,expectedMinor:10,realizedMinor:null}]});
 assert.throws(()=>execute(state,{type:'CONFIGURE_CI_PAYMENTS',payload:{orderId:o.id,rule:'FINAL_BL',days:0,confirm:true,reason:'test'}},user),/legacy balance payments/);
 assert.equal(o.ciPaymentPolicy,undefined);assert.ok(paymentSchedule(state,o).some(m=>m.trigger==='BL'));
});
test('currency mismatch, future CI, cancelled shipment and invalid adjustments are rejected',()=>{
 const f=fixture(),doc=f.o().documents.find(d=>d.type==='COMMERCIAL_INVOICE');
 assert.throws(()=>f.run('SAVE_COMMERCIAL_INVOICE',{documentId:doc.id,amount:'1',currency:'CNY'}),/currency/);
 assert.throws(()=>f.save('1','2'),/positive CI value/);assert.throws(()=>f.save('0','0'),/positive CI value/);
 doc.invoiceDate='2026-12-01';assert.throws(()=>f.save(),/future/);doc.invoiceDate='2026-10-01';f.o().shipments[0].status='CANCELLED';assert.throws(()=>f.save(),/active shipment/);
});
test('voided CI payment reopens only its CI balance and requires reauthorization',()=>{
 const f=fixture(),id=f.save();f.approve(id);f.authorize(id);const result=f.pay(id,'40000');
 f.run('VOID_PAYMENT',{paymentId:result.id,remarks:'Wrong bank entry'});
 assert.equal(ciBalance(f.state,f.o(),ciInvoices(f.o())[0]).balance,4000000);
 assert.equal(f.milestone(id).authorized,false);
 f.authorize(id);assert.equal(f.milestone(id).authorized,true);
});
