import test from 'node:test';
import assert from 'node:assert/strict';
import {createSeed} from '../shared/seed.mjs';
import {execute,planningEstimate,issueReadiness,orderTotal} from '../shared/domain.mjs';
import {orderProgress} from '../shared/order-progress.mjs';
import {approvalReviewCommand} from '../web/approval-review.mjs';
const fixture=()=>{let state=createSeed();const user=state.users.find(x=>x.role==='MANAGER');return {get state(){return state;},user,run(type,payload,actor=user){const r=execute(state,{type,payload},actor);state=r.state;return r.result;}};};
const create=f=>{const o=f.state.orders.find(x=>x.status==='DRAFT');return {vendorId:o.vendorId,buyerId:f.user.id,currency:o.currency,priceListCurrency:o.currency,lines:o.lines,paymentTerms:o.paymentTerms,productionDays:90,productionOverrideReason:'Agreed fixture production period',routeId:'route-ningbo',planningMode:'STANDARD',planningBufferDays:3,requestedPortDate:'2027-06-01'};};
test('standard estimate uses known production + route + explicit buffer; missing route is pending',()=>{
 const f=fixture(),p=create(f);assert.deepEqual(planningEstimate(f.state,p),{productionDays:90,transitDays:22,bufferDays:3,totalDays:115});
 assert.equal(planningEstimate(f.state,{...p,routeId:'missing'}),null);
 const {id}=f.run('CREATE_ORDER',{...p,planningTat:999});const o=f.state.orders.find(x=>x.id===id);
 assert.equal(o.planningTat,115);assert.equal(o.planningMode,'STANDARD');assert.ok(!issueReadiness(f.state,o).some(x=>/planning/i.test(x)));
 f.run('EDIT_DRAFT',{orderId:id,planningMode:'STANDARD',planningBufferDays:0,routeId:'route-shekou'});assert.equal(f.state.orders.find(x=>x.id===id).planningTat,119);
});
test('manual override requires reason and invalid buffers fail without mutation',()=>{
 const f=fixture(),p=create(f),before=structuredClone(f.state);
 assert.throws(()=>f.run('CREATE_ORDER',{...p,planningMode:'MANUAL',planningTat:100}),/Explain.*override/);
 for(const planningBufferDays of [-1,0.5,4000])assert.throws(()=>f.run('CREATE_ORDER',{...p,planningBufferDays}),/buffer/);
 assert.deepEqual(f.state,before);
 const {id}=f.run('CREATE_ORDER',{...p,planningMode:'MANUAL',planningTat:100,planningOverrideReason:'Agreed expedited shipment'});
 const o=f.state.orders.find(x=>x.id===id);assert.equal(o.planningTat,100);assert.equal(o.planningStandardDays,115);assert.equal(o.planningOverrideReason,'Agreed expedited shipment');
});
test('legacy recorded totals are preserved and missing planning still exposes submit review',()=>{
 const f=fixture(),o=f.state.orders.find(x=>x.status==='DRAFT'),original=o.planningTat;
 f.run('EDIT_DRAFT',{orderId:o.id,notes:'Unrelated edit'});assert.equal(f.state.orders.find(x=>x.id===o.id).planningTat,original);
 const missing={...o,planningTat:null};assert.equal(orderProgress(f.state,missing,f.user).action,'submit-po');
 assert.ok(issueReadiness(f.state,missing).some(x=>/Total planned days/.test(x)));
});
test('PI return uses current approval roles, keeps evidence and audit, and cannot undo approved payments',()=>{
 const f=fixture(),o=f.state.orders.find(x=>x.pi);o.pi.status='VERIFIED';const old=structuredClone(o.pi),before=structuredClone(f.state);
 assert.throws(()=>f.run('RETURN_PI',{orderId:o.id,remarks:'Mismatch'},f.state.users.find(x=>x.role==='VIEWER')),/approval access/);
 assert.throws(()=>f.run('RETURN_PI',{orderId:o.id,remarks:''}),/reason/);assert.deepEqual(f.state,before);
 f.run('RETURN_PI',{orderId:o.id,remarks:'Supplier must correct the document'});
 const current=f.state.orders.find(x=>x.id===o.id);assert.equal(current.pi.status,'REVERIFY');assert.equal(current.pi.fileId,old.fileId);assert.equal(current.pi.amountMinor,old.amountMinor);
 assert.equal(f.state.events.at(-1).action,'PI_RETURNED');assert.throws(()=>f.run('RETURN_PI',{orderId:o.id,remarks:'Again'}),/verified PI/);
 current.pi.status='APPROVED';assert.throws(()=>f.run('RETURN_PI',{orderId:o.id,remarks:'Undo'}),/verified PI/);
});
test('approval form never submits on opening; explicit confirmation and return reason are mandatory',()=>{
 const d={id:'po',approvalAction:'approve-po'},form=new FormData();
 assert.throws(()=>approvalReviewCommand(d,form),/Review the details/);form.set('reviewConfirmed','on');assert.throws(()=>approvalReviewCommand(d,form),/Choose approve/);
 form.set('decision','RETURN');assert.throws(()=>approvalReviewCommand(d,form),/reason/);form.set('remarks','Wrong quantity');
 assert.deepEqual(approvalReviewCommand(d,form),{type:'RETURN_ORDER',payload:{orderId:'po',remarks:'Wrong quantity'}});
 assert.equal(approvalReviewCommand({...d,approvalAction:'approve-pi'},form).type,'RETURN_PI');form.set('decision','APPROVE');assert.equal(approvalReviewCommand(d,form).type,'APPROVE_ORDER');
});

test('standard edits cannot silently bypass override rules and issued planning basis stays fixed',()=>{
 const f=fixture(),{id}=f.run('CREATE_ORDER',create(f));
 assert.throws(()=>f.run('EDIT_DRAFT',{orderId:id,planningTat:1}),/planning basis/);
 f.run('EDIT_DRAFT',{orderId:id,productionDays:80,productionOverrideReason:'Supplier expedited production',planningMode:'STANDARD',planningBufferDays:3});
 let o=f.state.orders.find(x=>x.id===id);assert.equal(o.planningTat,105);assert.equal(o.productionDays,80);
 f.run('SUBMIT_ORDER',{orderId:id});f.run('APPROVE_ORDER',{orderId:id});o=f.state.orders.find(x=>x.id===id);
 const snapshot=structuredClone(o.revisions.at(-1));assert.equal(snapshot.snapshot.planningTat,105);assert.equal(snapshot.snapshot.planningBasis.transitDays,22);
 f.state.routes.find(x=>x.id==='route-ningbo').transitDays=99;
 assert.deepEqual(o.revisions.at(-1),snapshot);
 assert.throws(()=>f.run('EDIT_DRAFT',{orderId:id,planningMode:'STANDARD'}),/controlled revisions/);
});
