import test from 'node:test';
import assert from 'node:assert/strict';
import {createSeed} from '../shared/seed.mjs';
import {execute,paymentTermsSummary,paymentTermAmounts,paymentSchedule,paymentTermsFor,orderTotal,major,initialPaymentStatus,TERMS,proportionalSlices} from '../shared/domain.mjs';
const advance=(amount='5000',trigger='PI')=>({name:'Advance',type:'FIXED',amount,currency:'USD',trigger,days:0});
const balance=(days=0)=>({name:'Balance against telex',type:'BALANCE',trigger:'BL',days});
const terms=steps=>({name:'Agreed fixed advances',steps});
test('one or two fixed advances leave an exact remaining balance',()=>{
 assert.deepEqual(paymentTermAmounts(terms([advance(),balance()]),2000000,'USD'),[500000,1500000]);
 assert.deepEqual(paymentTermAmounts(terms([advance(),advance('5000','SHIPMENT'),balance(60)]),2000000,'USD'),[500000,500000,1000000]);
 assert.deepEqual(paymentTermAmounts(terms([advance(),balance()]),500000,'USD'),[500000,0]);assert.match(paymentTermsSummary(terms([advance(),balance(60)])),/BL date \+ 60 days/);
});
test('mixed percentages use the whole order value and round once; legacy rounding is unchanged',()=>{
 const t=terms([{name:'First',percent:3,trigger:'PI',days:0},advance('5','SHIPMENT'),balance()]);
 assert.deepEqual(paymentTermAmounts(t,10001,'USD'),[300,500,9201]);
 for(const t of TERMS)for(const total of [1,101,1234567])assert.deepEqual(paymentTermAmounts(t,total,'USD'),proportionalSlices(total,t.steps.map(s=>s.percent)));
});
test('invalid currency, excess advances, missing balance, invalid precision and ambiguous balance are rejected',()=>{
 for(const [t,total,currency,pattern]of [[terms([advance(),balance()]),400000,'USD',/exceed/],[terms([advance(),balance()]),900000,'CNY',/currency/],[terms([advance()]),900000,'USD',/Remaining balance/],[terms([balance(),advance()]),900000,'USD',/final/],[terms([advance('0'),balance()]),900000,'USD',/greater/],[terms([advance('1.001'),balance()]),900000,'USD',/decimals/],[terms([advance(),{...balance(),days:-1}]),900000,'USD',/Credit days/]])assert.throws(()=>paymentTermAmounts(t,total,currency),pattern);
});
test('master persists typed values and revisions without changing existing POs or payments',()=>{
 const state=createSeed('2026-09-11'),user=state.users.find(u=>u.role==='MANAGER'),before=structuredClone(state);
 const payload={...terms([advance(),advance('5000','SHIPMENT'),balance(60)]),kind:'SUPPLIER',active:true,reason:'Supplier agreement'};
 const saved=execute(state,{type:'SAVE_PAYMENT_TERMS',payload},user).state,t=paymentTermsFor(saved).find(t=>t.name===payload.name);
 assert.equal(t.steps[0].amount,'5000.00');assert.equal(t.steps[2].type,'BALANCE');assert.equal(t.revision,1);
 const changed=execute(saved,{type:'SAVE_PAYMENT_TERMS',payload:{...payload,id:t.id,steps:[advance('6000'),balance()]}},user).state;
 assert.deepEqual(changed.orders,before.orders);assert.deepEqual(changed.payments,before.payments);
 assert.throws(()=>execute(state,{type:'SAVE_PAYMENT_TERMS',payload},state.users.find(u=>u.role==='EXECUTIVE')),/access/);
});
function fixture(){let state=createSeed('2026-09-11');const o=state.orders.find(o=>o.pi?.status==='APPROVED'&&o.artwork.current);state.orders=[o];state.payments=[];
 o.currency='USD';o.paymentTerms=terms([advance('100'),advance('100','SHIPMENT'),balance(60)]);o.shipments=[];o.paymentAuthorizations=[];o.productionWindowStartedAt=null;o.productionStartedAt=null;o.productionCompletedAt=null;
 o.confirmation={revision:o.revision};o.technicalConfirmation={revision:o.revision};o.artwork.pending=null;o.artwork.supplierConfirmed={artworkId:o.artwork.current.id};
 const user=state.users.find(u=>u.role==='MANAGER'),file=state.files.find(f=>f.orderIds.includes(o.id));let seq=0;
 const run=(type,payload={})=>{const x=execute(state,{type,payload:{orderId:o.id,...payload}},user,{now:'2026-09-26T10:00:00Z',id:()=>`typed-${++seq}`});state=x.state;return x.result;};
 return {get state(){return state;},get o(){return state.orders[0];},run,file};}
test('fixed initial payment, second advance and credit remain separate; receipts and void restore balances',()=>{
 const f=fixture();assert.equal(initialPaymentStatus(f.state,f.o).complete,false);
 const pay=f.run('COMPLETE_INITIAL_PAYMENT',{reference:'FIRST-FIXED',date:'2026-09-26',currency:'USD',amount:'100',inrRate:'90',fileId:f.file.id});
 assert.equal(initialPaymentStatus(f.state,f.o).complete,true);assert.equal(paymentSchedule(f.state,f.o)[0].reported,10000);
 const payment=f.state.payments.find(p=>p.id===pay.id);
 f.run('ACKNOWLEDGE_PAYMENT',{paymentId:pay.id,allocationId:payment.allocations[0].id,realizedAmount:'100',supplierRate:'1',fileId:f.file.id,remarks:'Supplier receipt'});
 assert.equal(paymentSchedule(f.state,f.o)[0].paid,10000);
 f.run('VOID_PAYMENT',{paymentId:pay.id,remarks:'Trial correction'});
 assert.equal(paymentSchedule(f.state,f.o)[0].reported,0);assert.equal(initialPaymentStatus(f.state,f.o).complete,false);
 f.run('COMPLETE_INITIAL_PAYMENT',{reference:'REPLACEMENT',date:'2026-09-26',currency:'USD',amount:'100',inrRate:'90',fileId:f.file.id});
 assert.equal(initialPaymentStatus(f.state,f.o).complete,true);
});
test('fixed shipment advances are divided across shipments and never repeated in full',()=>{
 const f=fixture(),o=f.o,line=o.lines[0];
 o.shipments=[{id:'ship-a',number:'A',status:'PLANNED',lines:[{lineId:line.id,quantity:1}],etd:'2026-09-26',blDate:'2026-09-26'},{id:'ship-b',number:'B',status:'PLANNED',lines:[{lineId:line.id,quantity:1}],etd:'2026-09-27',blDate:'2026-09-27'}];
 const rows=paymentSchedule(f.state,o);
 assert.equal(rows.filter(m=>m.index===1).reduce((n,m)=>n+m.amount,0),10000);
 assert.equal(rows.reduce((n,m)=>n+m.amount,0),orderTotal(o));
 assert.equal(rows.find(m=>m.index===2&&m.shipmentId==='ship-a').due,'2026-11-25');
});
test('typed allocation cannot overpay an authorized milestone',()=>{
 const f=fixture();f.run('AUTHORIZE_PAYMENT',{termIndex:0});
 assert.throws(()=>f.run('RECORD_PAYMENT',{reference:'TOO-MUCH',date:'2026-09-26',currency:'USD',amount:'101',inrRate:'90',fileId:f.file.id,allocations:[{orderId:f.o.id,termIndex:0,amount:'101',invoiceRate:'1'}]}),/outstanding/);
 assert.equal(f.state.payments.length,0);
});
test('PO creation and edits reject insufficient totals and currency mismatch atomically',()=>{
 const state=createSeed('2026-09-11'),user=state.users.find(u=>u.role==='MANAGER'),item=state.items.find(i=>i.code==='GJPW12'),base=state.bases.find(b=>b.id===item.baseId);
 const payload={vendorId:base.vendorId,currency:'USD',priceListCurrency:'USD',productionDays:30,productionOverrideReason:'Fixture',paymentTerms:terms([advance(),balance()]),lines:[{itemId:item.id,quantity:100,unitPrice:'100',specId:base.specifications[0].id}]};
 const saved=execute(state,{type:'CREATE_ORDER',payload},user),id=saved.result.id;
 assert.deepEqual(paymentTermAmounts(saved.state.orders.find(o=>o.id===id).paymentTerms,1000000,'USD'),[500000,500000]);
 assert.throws(()=>execute(saved.state,{type:'EDIT_DRAFT',payload:{orderId:id,lines:[{...payload.lines[0],quantity:10}]}},user),/exceed/);
 assert.throws(()=>execute(state,{type:'CREATE_ORDER',payload:{...payload,paymentTerms:terms([{...advance(),currency:'INR'},balance()])}},user),/currency/);
 assert.equal(saved.state.orders.find(o=>o.id===id).lines[0].quantity,100);
});
test('paid typed terms cannot be amended into a different obligation; voided advance blocks later stages',()=>{
 const f=fixture();const p=f.run('COMPLETE_INITIAL_PAYMENT',{reference:'LOCKED',date:'2026-09-26',currency:'USD',amount:'100',inrRate:'90',fileId:f.file.id});
 assert.throws(()=>f.run('PROPOSE_AMENDMENT',{reason:'New terms',paymentTerms:terms([advance('200'),balance()])}),/Recorded payments/);
 f.run('VOID_PAYMENT',{paymentId:p.id,remarks:'Correct fixture'});
 for(const command of ['RECORD_PREPRODUCTION_SAMPLE','APPROVE_PREPRODUCTION_SAMPLE','START_PRODUCTION','COMPLETE_PRODUCTION'])assert.throws(()=>f.run(command,{date:'2026-09-26',remarks:'Must be blocked'}),/initial advance/);
});
