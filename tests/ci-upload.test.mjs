import test from 'node:test';import assert from 'node:assert/strict';
import {createSeed} from '../shared/seed.mjs';
import {execute,paymentSchedule,allocationsFor,major} from '../shared/domain.mjs';
import {ciBalance,ciAdvanceAvailable,ciDispatchReadiness,ciReadiness,suggestedCiPolicy} from '../shared/ci-payments.mjs';
import {createCiPaymentsUI} from '../web/ci-payments.mjs';
import {orderJourney,orderProgress} from '../shared/order-progress.mjs';
const seed=createSeed('2026-10-15');let seq=0;
function fixture(){let state=structuredClone(seed);const id=state.orders[0].id;const manager=state.users.find(u=>u.role==='MANAGER'),executive=state.users.find(u=>u.role==='EXECUTIVE');const o=()=>state.orders.find(o=>o.id===id),ship=()=>o().shipments[0];
 delete ship().actualDeparture;delete ship().actualArrival;delete ship().blNumber;delete ship().blDate;delete ship().insurance;ship().status='RELEASED';ship().bookingStatus='RELEASED';
 o().documents=o().documents.filter(d=>d.type!=='COMMERCIAL_INVOICE');
 const run=(type,p={},actor=manager)=>{const out=execute(state,{type,payload:{orderId:id,...p}},actor,{now:'2026-10-15T09:30:00.000Z',id:()=>`full-ci-${++seq}`});state=out.state;return out.result;};
 const evidence=()=>{const file={id:`proof-${++seq}`,scope:'LAE_IMPORT',orderIds:[id],name:'CI-proof.pdf'};state.files.push(file);return file.id;};
 const payload=(rule='BEFORE_SHIPMENT',amount='50000')=>({type:'COMMERCIAL_INVOICE',invoiceNumber:'FULL-CI-'+(++seq),invoiceDate:'2026-10-15',shipmentId:ship().id,fileIds:[evidence()],ciSettlement:{amount,currency:o().currency,advance:'0',policy:{rule,days:0,reason:'Supplier agreed test terms',confirm:true}}});
 const upload=(rule,amount,actor=manager)=>run('ATTACH_DOCUMENT',payload(rule,amount),actor).id;
 const c=id=>o().commercialInvoices.find(c=>c.id===id),m=id=>paymentSchedule(state,o()).find(m=>m.ciId===id);
 const approve=id=>run('APPROVE_COMMERCIAL_INVOICE',{ciId:id,confirm:true});
 const authorize=id=>run('AUTHORIZE_PAYMENT',{termIndex:m(id).index,shipmentId:ship().id});
 const pay=(id,amount,date='2026-10-15')=>run('RECORD_PAYMENT',{reference:'FULL-BANK-'+(++seq),date,currency:o().currency,amount,inrRate:'85',fileId:evidence(),allocations:[{orderId:o().id,termIndex:m(id).index,shipmentId:ship().id,amount}]});
 const dispatch=()=>run('DISPATCH_SHIPMENT',{shipmentId:ship().id,date:'2026-10-15',vessel:'Test vessel',voyage:'V1',remarks:'Forwarder confirmed loaded',reason:'Shipping / forwarder'});
 return {get state(){return state},o,ship,c,m,run,evidence,payload,upload,approve,authorize,pay,dispatch,manager,executive};}

test('one upload atomically creates CI value, auto advance and proposed terms without an enable step',()=>{
 const f=fixture(),available=ciAdvanceAvailable(f.state,f.o()),originalPayments=structuredClone(f.state.payments),p=f.payload();p.fileIds.push(f.evidence());
 const id=f.run('ATTACH_DOCUMENT',p).id;
 assert.equal(f.o().ciPaymentPolicy.pendingApproval,true);assert.equal(f.o().commercialInvoices.length,1);assert.equal(f.c(id).amountMinor,5000000);assert.equal(ciBalance(f.state,f.o(),f.c(id)).advance,available);assert.equal(ciBalance(f.state,f.o(),f.c(id)).balance,5000000-available);
 assert.equal(f.o().documents.filter(d=>d.invoiceNumber===p.invoiceNumber).length,2);assert.deepEqual(f.state.payments,originalPayments);
 assert.throws(()=>f.authorize(id),/Approve this Commercial Invoice/);f.approve(id);assert.equal(f.o().ciPaymentPolicy.pendingApproval,false);assert.equal(f.m(id).eligible,true);
});
test('before-shipment balance is payable before departure and blocks departure until fully recorded',()=>{
 const f=fixture(),id=f.upload();f.approve(id);assert.equal(f.ship().actualDeparture,undefined);assert.match(ciDispatchReadiness(f.state,f.o(),f.ship()),/outstanding CI/);assert.throws(f.dispatch,/outstanding CI/);
 assert.ok(orderJourney(f.state,f.o()).shipments[0].blockers.some(s=>s.includes('outstanding CI')));
 f.authorize(id);const balance=ciBalance(f.state,f.o(),f.c(id)).balance;f.pay(id,'100');assert.throws(f.dispatch,/outstanding CI/);f.authorize(id);f.pay(id,major(balance-10000));assert.equal(ciDispatchReadiness(f.state,f.o(),f.ship()),'');f.dispatch();assert.equal(f.ship().actualDeparture,'2026-10-15');assert.equal(f.ship().blNumber,undefined);
});
test('after-BL and sailing stages release only after their actual event, with final BL still mandatory for standard terms',()=>{
 for(const rule of ['FINAL_BL','SAILING']){const f=fixture(),id=f.upload(rule);f.approve(id);assert.throws(()=>f.authorize(id),/actual vessel departure/);assert.equal(ciDispatchReadiness(f.state,f.o(),f.ship()),'');f.dispatch();
 if(rule==='FINAL_BL'){assert.throws(()=>f.authorize(id),/final BL/);f.run('RECORD_BL',{shipmentId:f.ship().id,number:'FINAL-BL-'+seq,date:'2026-10-15',fileId:f.evidence(),telexStatus:'ORIGINAL_BL'});}
 f.authorize(id);f.pay(id,major(ciBalance(f.state,f.o(),f.c(id)).balance));assert.equal(ciBalance(f.state,f.o(),f.c(id)).balance,0);}
});
test('bad amount or missing release terms rolls back invoice and policy together',()=>{
 for(const change of [p=>p.ciSettlement.amount='0',p=>p.ciSettlement.policy.rule='',p=>p.ciSettlement.policy.days=1,p=>p.ciSettlement.policy.confirm=false,p=>p.ciSettlement.currency='CNY',p=>p.shipmentId='missing',p=>p.invoiceDate='2026-12-01']){
 const f=fixture(),p=f.payload();change(p);const before=structuredClone(f.state);assert.throws(()=>f.run('ATTACH_DOCUMENT',p));assert.deepEqual(f.state,before);}
});
test('auto advance caps at CI amount and cannot be spent twice across invoices',()=>{
 const f=fixture(),available=ciAdvanceAvailable(f.state,f.o()),a=f.upload('BEFORE_SHIPMENT','1000');assert.equal(ciBalance(f.state,f.o(),f.c(a)).balance,0);assert.equal(ciAdvanceAvailable(f.state,f.o()),available-100000);
 const b=f.upload('BEFORE_SHIPMENT','50000');assert.equal(ciBalance(f.state,f.o(),f.c(b)).advance,available-100000);assert.equal(ciAdvanceAvailable(f.state,f.o()),0);
 f.run('CANCEL_COMMERCIAL_INVOICE',{ciId:a,reason:'Duplicate invoice'});assert.equal(ciAdvanceAvailable(f.state,f.o()),100000);assert.throws(()=>f.approve(b),/Additional PI advance/);
 f.run('SAVE_COMMERCIAL_INVOICE',{ciId:b,documentId:f.c(b).documentId,amount:'50000',advanceMode:'AUTO'});f.approve(b);assert.equal(ciBalance(f.state,f.o(),f.c(b)).advance,available);
});
test('executive may propose terms with CI but cannot approve policy or release payment',()=>{
 const f=fixture(),id=f.upload('BEFORE_SHIPMENT','50000',f.executive);assert.equal(f.o().ciPaymentPolicy.pendingApproval,true);
 assert.throws(()=>f.run('APPROVE_COMMERCIAL_INVOICE',{ciId:id,confirm:true},f.executive),/manager/);
 assert.throws(()=>f.run('AUTHORIZE_PAYMENT',{termIndex:f.m(id).index,shipmentId:f.ship().id},f.executive),/authorization/);f.approve(id);f.authorize(id);
});
test('mixed original terms require an explicit balance stage and old paid balances cannot be silently reassigned',()=>{
 const f=fixture();f.o().paymentTerms.steps=[{trigger:'PI',percent:10},{trigger:'SHIPMENT',percent:20},{trigger:'BL',percent:70,days:120}];assert.equal(suggestedCiPolicy(f.state,f.o()).rule,'');
 f.state.payments.push({id:'old-balance',status:'REPORTED',allocations:[{id:'old-a',orderId:f.o().id,termIndex:1,expectedMinor:100}]});const p=f.payload(),before=structuredClone(f.state);assert.throws(()=>f.run('ATTACH_DOCUMENT',p),/legacy balance/);assert.deepEqual(f.state,before);
});
test('upload screen exposes amount, automatic advance, balance and all three release stages before opt-in',()=>{
 const f=fixture(),host={context:()=>({state:f.state,user:f.manager}),esc:String,field:(name,label,value,type,opts)=>JSON.stringify({name,label,value,type,opts}),note:String,button:()=>'',badge:()=>'',ph:()=>'',dt:String};const ui=createCiPaymentsUI(host),html=ui.uploadFields(f.o());
 for(const text of ['CI total','PI advance automatically adjusted','Outstanding CI balance','BEFORE_SHIPMENT','FINAL_BL','SAILING'])assert.ok(html.includes(text),text);
 assert.ok(ui.page(f.o()).includes('Optional: propose CI settlement'));
 assert.match(html,/name="ciSettlementEnabled" data-ci-toggle/);assert.doesNotMatch(html,/name="ciSettlementEnabled"[^>]*checked/);
 const values={ciAmount:'123',ciRule:'FINAL_BL',ciDays:'0',ciReason:'Agreed',ciConfirm:'on'};
 assert.equal(ui.uploadPayload(f.o(),values),undefined);assert.equal(ui.uploadPayload(f.o(),{...values,ciSettlementEnabled:'on'}).amount,'123');
});

test('post-arrival progress reconciles approved CI value rather than the old PI total',()=>{
 const f=fixture(),id=f.upload();f.approve(id);f.authorize(id);f.pay(id,major(ciBalance(f.state,f.o(),f.c(id)).balance));
 f.ship().status='ARRIVED';f.ship().actualDeparture='2026-10-15';f.ship().actualArrival='2026-10-15';
 assert.equal(orderProgress(f.state,f.o(),f.manager).title,'Review receipts and the remaining balance');
 for(const payment of f.state.payments)for(const a of payment.allocations)if(a.orderId===f.o().id)a.realizedMinor=a.expectedMinor;
 assert.equal(orderProgress(f.state,f.o(),f.manager).title,'Complete final arrival costing');
 const paid=f.state.payments.flatMap(p=>p.allocations).find(a=>a.ciId===id);paid.realizedMinor-=100;
 assert.equal(orderProgress(f.state,f.o(),f.manager).title,'Review receipts and the remaining balance');
});
