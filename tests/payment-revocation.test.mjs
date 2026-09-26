import test from 'node:test';
import assert from 'node:assert/strict';
import {createSeed} from '../shared/seed.mjs';
import {execute,paymentSchedule} from '../shared/domain.mjs';
import {EditVersions} from '../server/concurrency.mjs';

function fixture(){
 let state=createSeed('2026-09-11');const o=state.orders.find(o=>o.pi?.status==='APPROVED'&&o.artwork.current);
 state.orders=[o];state.payments=[];o.shipments=[];o.paymentAuthorizations=[];
 o.paymentTerms={name:'Two advances',steps:[{name:'Advance 1',type:'FIXED',amount:'100',currency:'USD',trigger:'PI',days:0},{name:'Advance 2',type:'FIXED',amount:'100',currency:'USD',trigger:'PI',days:0},{name:'Balance',type:'BALANCE',trigger:'BL',days:0}]};
 o.confirmation={revision:o.revision};o.technicalConfirmation={revision:o.revision};o.artwork.pending=null;o.artwork.supplierConfirmed={artworkId:o.artwork.current.id};
 const manager=state.users.find(u=>u.role==='MANAGER'),file=state.files.find(f=>f.orderIds.includes(o.id));let seq=0;
 const run=(type,payload={},actor=manager)=>{const r=execute(state,{type,payload:{orderId:o.id,...payload}},actor,{now:'2026-09-26T15:00:00Z',id:()=>`revoke-${++seq}`});state=r.state;return r.result;};
 run('AUTHORIZE_PAYMENT',{termIndex:0});run('AUTHORIZE_PAYMENT',{termIndex:1});
 return {get state(){return state;},get o(){return state.orders[0];},run,manager,file};
}
test('revoke each unpaid advance with audit history and allow fresh reauthorization',()=>{
 const f=fixture(),original=structuredClone(f.o.paymentAuthorizations);
 f.run('REVOKE_PAYMENT_AUTHORIZATION',{termIndex:0,remarks:'Authorized by mistake'});
 assert.deepEqual(paymentSchedule(f.state,f.o).slice(0,2).map(m=>m.authorized),[false,true]);
 assert.equal(f.o.paymentAuthorizations.length,2);assert.equal(f.o.paymentAuthorizations[0].at,original[0].at);assert.equal(f.o.paymentAuthorizations[0].revocationReason,'Authorized by mistake');
 assert.equal(f.state.events.at(-1).action,'PAYMENT_AUTHORIZATION_REVOKED');assert.equal(f.state.events.at(-1).actorId,f.manager.id);
 f.run('REVOKE_PAYMENT_AUTHORIZATION',{termIndex:1,remarks:'Authorized by mistake'});
 assert.equal(paymentSchedule(f.state,f.o).some(m=>m.authorized),false);
 f.run('AUTHORIZE_PAYMENT',{termIndex:0});assert.equal(f.o.paymentAuthorizations.length,3);assert.equal(paymentSchedule(f.state,f.o)[0].authorized,true);
});
test('reason, current authorization, configured approval role and division are enforced',()=>{
 const f=fixture(),before=structuredClone(f.state);
 assert.throws(()=>f.run('REVOKE_PAYMENT_AUTHORIZATION',{termIndex:0}),/reason/);
 assert.throws(()=>f.run('REVOKE_PAYMENT_AUTHORIZATION',{termIndex:7,remarks:'Mistake'}),/currently authorized/);
 const exec=f.state.users.find(u=>u.role==='EXECUTIVE');assert.throws(()=>f.run('REVOKE_PAYMENT_AUTHORIZATION',{termIndex:0,remarks:'Mistake'},exec),/access/);
 assert.deepEqual(f.state,before);
 f.state.approvalControls={revision:1,stages:{AUTHORIZE_PAYMENT:[]}};
 assert.throws(()=>f.run('REVOKE_PAYMENT_AUTHORIZATION',{termIndex:0,remarks:'Mistake'}),/access/);
});
test('active partial payment blocks revocation; VOID permits it without deleting payment history',()=>{
 const f=fixture();const p=f.run('RECORD_PAYMENT',{reference:'REVOCATION-FIXTURE',date:'2026-09-26',currency:'USD',amount:'10',inrRate:'90',fileId:f.file.id,allocations:[{orderId:f.o.id,termIndex:0,amount:'10',invoiceRate:'1'}]});
 assert.throws(()=>f.run('REVOKE_PAYMENT_AUTHORIZATION',{termIndex:0,remarks:'Mistake'}),/already recorded/);
 f.run('REVOKE_PAYMENT_AUTHORIZATION',{termIndex:1,remarks:'Other unpaid advance'});
 f.run('VOID_PAYMENT',{paymentId:p.id,remarks:'Synthetic fixture correction'});f.run('REVOKE_PAYMENT_AUTHORIZATION',{termIndex:0,remarks:'Mistake'});
 assert.equal(f.state.payments[0].status,'VOID');assert.equal(paymentSchedule(f.state,f.o)[0].authorized,false);
 assert.throws(()=>f.run('RECORD_PAYMENT',{reference:'NOT-AUTHORIZED',date:'2026-09-26',currency:'USD',amount:'10',inrRate:'90',fileId:f.file.id,allocations:[{orderId:f.o.id,termIndex:0,amount:'10',invoiceRate:'1'}]}),/authoriz/i);
});
test('concurrent payment invalidates the saved revocation view',()=>{
 const f=fixture(),versions=new EditVersions(),revision=f.state.revision,token=versions.issue(f.state,f.manager.id),command={type:'REVOKE_PAYMENT_AUTHORIZATION',payload:{orderId:f.o.id,termIndex:0,remarks:'Mistake'}};
 f.run('RECORD_PAYMENT',{reference:'CONCURRENT',date:'2026-09-26',currency:'USD',amount:'10',inrRate:'90',fileId:f.file.id,allocations:[{orderId:f.o.id,termIndex:0,amount:'10',invoiceRate:'1'}]});
 assert.throws(()=>versions.assert(f.state,command,f.manager.id,revision,token),/changed/);
});
