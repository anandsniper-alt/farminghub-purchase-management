import test from 'node:test';
import assert from 'node:assert/strict';
import {createSeed} from '../shared/seed.mjs';
import {execute,paymentTermAmounts,paymentSchedule,initialPaymentStatus,advanceChangePreview} from '../shared/domain.mjs';
import {EditVersions} from '../server/concurrency.mjs';
import {Store} from '../server/store.mjs';

function fixture(){
 let state=createSeed('2026-10-09'),seq=0;
 const o=state.orders.find(o=>o.pi?.status==='APPROVED'&&o.artwork.current);
 state.orders=[o];state.payments=[];o.currency='USD';o.lines=[{...o.lines[0],quantity:100,unitPriceMinor:10000}];
 o.pi.amountMinor=1000000;o.paymentTerms={name:'5 / 15 / 80',steps:[{name:'First advance',percent:5,trigger:'PI',days:0},{name:'Before loading',percent:15,trigger:'SHIPMENT',days:0},{name:'Final balance',percent:80,trigger:'BL',days:0}]};
 o.shipments=[];o.paymentAuthorizations=[];o.productionWindowStartedAt=null;o.productionStartedAt=null;o.productionCompletedAt=null;o.amendment=null;o.manualClosed=null;
 o.confirmation={revision:o.revision};o.technicalConfirmation={revision:o.revision};o.artwork.pending=null;o.artwork.supplierConfirmed={artworkId:o.artwork.current.id};
 const manager=state.users.find(u=>u.role==='MANAGER'),executive=state.users.find(u=>u.role==='EXECUTIVE'),file=state.files.find(f=>f.orderIds.includes(o.id));o.buyerId=executive.id;
 const run=(type,payload,actor=manager)=>{const r=execute(state,{type,payload:{orderId:o.id,...payload}},actor,{now:'2026-10-09T10:00:00Z',id:()=>`variance-${++seq}`});state=r.state;return r.result;};
 const pay=(amount='1000',extra={},actor=manager)=>run('COMPLETE_INITIAL_PAYMENT',{termIndex:0,reference:'ADVANCE-'+seq,date:'2026-10-09',currency:'USD',amount,inrRate:'90',fileId:file.id,confirmChange:true,changeReason:'Supplier agreed revised advance',...extra},actor);
 return {get state(){return state;},get o(){return state.orders[0];},run,pay,manager,executive,file};
}
const amounts=f=>paymentTermAmounts(f.o.paymentTerms,1000000,'USD');
test('5 percent uses only the PI advance; exact payment needs no variance approval',()=>{
 const f=fixture();assert.deepEqual(amounts(f),[50000,150000,800000]);f.pay('500',{confirmChange:false,changeReason:''});
 assert.deepEqual(amounts(f),[50000,150000,800000]);assert.equal(f.o.paymentTermsChanges,undefined);assert.equal(initialPaymentStatus(f.state,f.o).complete,true);
});
for(const [amount,expected] of [['1000',[100000,150000,750000]],['250',[25000,150000,825000]]])test('approved advance '+amount+' adjusts only final balance and retains history',()=>{
 const f=fixture(),snapshots=structuredClone(f.o.revisions),masters=structuredClone(f.state.paymentTermTemplates);f.pay(amount);
 assert.deepEqual(amounts(f),expected);assert.deepEqual(f.o.revisions,snapshots);assert.deepEqual(f.state.paymentTermTemplates,masters);
 const h=f.o.paymentTermsChanges[0];assert.deepEqual(h.beforeAmounts,[50000,150000,800000]);assert.deepEqual(h.afterAmounts,expected);assert.equal(h.status,'ACCEPTED');assert.equal(h.actorId,f.manager.id);
 assert.equal(f.state.events.filter(e=>e.action==='ORDER_PAYMENT_TERMS_CHANGED').length,1);
 assert.equal(f.state.payments[0].allocations[0].expectedMinor,expected[0]);
});
test('executive cannot self-approve a variance even with confirmation',()=>{
 const f=fixture(),before=structuredClone(f.state);assert.throws(()=>f.pay('1000',{},f.executive),/Manager|role/);assert.deepEqual(f.state,before);
});
test('approval requires both reason and explicit boolean confirmation',()=>{
 for(const extra of [{confirmChange:false},{confirmChange:'true'},{changeReason:' '}]){const f=fixture(),before=structuredClone(f.state);assert.throws(()=>f.pay('1000',extra),/Confirm|reason/);assert.deepEqual(f.state,before);}
});
test('cannot overpay after retaining intermediate instalments or use an invalid advance',()=>{
 const f=fixture(),before=structuredClone(f.state);
 for(const extra of [{amount:'8500.01'},{termIndex:1},{termIndex:99},{amount:'0'}])assert.throws(()=>f.pay('1000',extra));assert.deepEqual(f.state,before);
});
test('foreign remittance uses PO-currency equivalent for approved variance',()=>{
 const f=fixture();f.pay('2000',{currency:'CNY',invoiceRate:'0.5'});assert.deepEqual(amounts(f),[100000,150000,750000]);assert.equal(f.state.payments[0].amountMinor,200000);
});
test('partial bank payment is retained when approving the remaining advance',()=>{
 const f=fixture();f.run('AUTHORIZE_PAYMENT',{termIndex:0});f.run('RECORD_PAYMENT',{reference:'PART',date:'2026-10-09',currency:'USD',amount:'200',inrRate:'90',fileId:f.file.id,allocations:[{orderId:f.o.id,termIndex:0,amount:'200',invoiceRate:'1'}]});
 const old=structuredClone(f.state.payments[0]);f.pay('800');assert.deepEqual(amounts(f),[100000,150000,750000]);assert.deepEqual(f.state.payments[0],old);assert.equal(initialPaymentStatus(f.state,f.o).complete,true);
});
test('voiding a varied advance reopens the accepted amount without erasing its approval',()=>{
 const f=fixture(),p=f.pay();f.run('VOID_PAYMENT',{paymentId:p.id,remarks:'Incorrect bank reference'});assert.equal(initialPaymentStatus(f.state,f.o).complete,false);assert.deepEqual(amounts(f),[100000,150000,750000]);f.pay('1000',{reference:'CORRECTED'});assert.equal(f.o.paymentTermsChanges.length,1);assert.equal(initialPaymentStatus(f.state,f.o).complete,true);
});
test('multiple PI advances are paid separately, not summed by the selected-advance command',()=>{
 const f=fixture();f.o.paymentTerms.steps[1].trigger='PI';f.pay('500');assert.equal(initialPaymentStatus(f.state,f.o).complete,false);assert.equal(paymentSchedule(f.state,f.o)[1].reported,0);f.pay('1500',{termIndex:1});assert.equal(initialPaymentStatus(f.state,f.o).complete,true);
});
test('all-PI stage mistake needs explicit correction, with original snapshot preserved',()=>{
 const f=fixture();f.o.paymentTerms.steps.forEach(s=>s.trigger='PI');assert.throws(()=>f.pay(),/final payment is saved as a PI/);
 const revised=structuredClone(f.o.paymentTerms);revised.steps[1].trigger='SHIPMENT';revised.steps[2].trigger='BL';
 f.run('REVISE_ORDER_PAYMENT_TERMS',{paymentTerms:revised,confirmChange:true,changeReason:'Correct supplier-agreed stages'});f.pay();assert.deepEqual(amounts(f),[100000,150000,750000]);assert.equal(f.o.paymentTermsChanges.length,2);
});
test('recorded milestone identities and already paid final amounts cannot be rewritten',()=>{
 const f=fixture();f.pay();const revised=structuredClone(f.o.paymentTerms);revised.steps[0].trigger='SHIPMENT';assert.throws(()=>f.run('REVISE_ORDER_PAYMENT_TERMS',{paymentTerms:revised,confirmChange:true,changeReason:'Test'}),/recorded payment milestone/);
 const g=fixture();g.state.payments.push({id:'existing',status:'REPORTED',allocations:[{id:'existing-allocation',orderId:g.o.id,termIndex:2,shipmentId:null,expectedMinor:800000,realizedMinor:null}]});assert.throws(()=>g.pay(),/already recorded/);
});
test('rounding retains exact intermediate cents and approval revokes stale authorizations',()=>{
 const f=fixture();f.o.lines[0].unitPriceMinor=10001;const before=paymentTermAmounts(f.o.paymentTerms,1000100,'USD');f.run('AUTHORIZE_PAYMENT',{termIndex:0});f.pay('1000');
 const after=paymentTermAmounts(f.o.paymentTerms,1000100,'USD');assert.equal(after[1],before[1]);assert.equal(after.reduce((a,b)=>a+b),1000100);assert.ok(f.o.paymentAuthorizations[0].revokedAt);assert.equal(f.o.paymentAuthorizations.at(-1).amountMinor,100000);
});
test('fixed advances support variance and exact zero final balance',()=>{
 const f=fixture();f.o.paymentTerms.steps=[{name:'First advance',type:'FIXED',amount:'500',currency:'USD',trigger:'PI',days:0},{name:'Before loading',type:'FIXED',amount:'1500',currency:'USD',trigger:'SHIPMENT',days:0},{name:'Final balance',type:'BALANCE',trigger:'BL',days:0}];f.pay('8500');assert.deepEqual(amounts(f),[850000,150000,0]);
});
test('missing evidence and invalid bank charges roll back term changes and payment together',()=>{
 for(const extra of [{fileId:'missing'},{bankCharges:'invalid'}]){const f=fixture(),before=structuredClone(f.state);assert.throws(()=>f.pay('1000',extra));assert.deepEqual(f.state,before);}
});
test('bank allocation cannot bypass variance approval on percentage advances',()=>{
 const f=fixture();f.run('AUTHORIZE_PAYMENT',{termIndex:0});assert.throws(()=>f.run('RECORD_PAYMENT',{reference:'BYPASS',date:'2026-10-09',currency:'USD',amount:'1000',inrRate:'90',fileId:f.file.id,allocations:[{orderId:f.o.id,termIndex:0,amount:'1000',invoiceRate:'1'}]}),/outstanding/);
});
test('stale payment or terms edits conflict, and duplicate approved-remittance requests replay once',()=>{
 const f=fixture(),store=new Store(':memory:',f.state);
 try{
  const before=store.read(),token=store.editContext(before,f.manager.id),termsCommand={type:'REVISE_ORDER_PAYMENT_TERMS',payload:{orderId:f.o.id}};
  const command={type:'COMPLETE_INITIAL_PAYMENT',payload:{orderId:f.o.id,termIndex:0,reference:'RETRY',date:'2026-09-26',currency:'USD',amount:'1000',inrRate:'90',fileId:f.file.id,confirmChange:true,changeReason:'Supplier approval'}};
  store.transact(command,f.manager.id,before.revision,'variance-retry-0001',token);
  const again=store.transact(command,f.manager.id,before.revision,'variance-retry-0001',token);
  assert.equal(again.replayed,true);assert.equal(again.state.payments.length,1);assert.equal(again.state.orders[0].paymentTermsChanges.length,1);
  assert.throws(()=>store.editVersions.assert(store.read(),termsCommand,f.manager.id,before.revision,token),e=>e.code==='CONFLICT');
 }finally{store.close();}
});
