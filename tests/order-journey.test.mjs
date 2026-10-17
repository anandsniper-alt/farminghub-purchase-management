import test from 'node:test';
import assert from 'node:assert/strict';
import {createSeed} from '../shared/seed.mjs';
import {execute,paymentSchedule,major,formatMoney} from '../shared/domain.mjs';
import {orderProgress,orderJourney} from '../shared/order-progress.mjs';
import {renderOrderJourney} from '../web/order-journey.mjs';

const seed=createSeed('2026-10-14');
const fresh=()=>structuredClone(seed);
function prepare(state,number='FH-LAE-I-PO-3'){
 const o=state.orders.find(o=>o.number===number),s=o.shipments[0];
 s.trackingMilestones=[{key:'FACTORY_LOADING',status:'COMPLETED',actualDate:'2026-10-01'},{key:'INLAND_ORIGIN',status:'IN_PROGRESS'}];
 return {o,s,user:state.users.find(u=>u.role==='MANAGER')};
}
function record(state,o,s,user){
 let serial=0;const ctx={now:'2026-10-14T10:00:00Z',id:()=>`journey-test-${++serial}`};
 state=execute(state,{type:'AUTHORIZE_PAYMENT',payload:{orderId:o.id,termIndex:1,shipmentId:s.id}},user,ctx).state;
 const m=paymentSchedule(state,state.orders.find(x=>x.id===o.id)).find(m=>m.index===1&&m.shipmentId===s.id);
 state.files.push({id:'journey-proof',name:'Test bank evidence',scope:o.scope,orderIds:[o.id]});
 return execute(state,{type:'RECORD_PAYMENT',payload:{reference:'JOURNEY-TEST-BANK',date:'2026-10-14',currency:'USD',amount:major(m.amount),inrRate:'85',fileId:'journey-proof',allocations:[{orderId:o.id,termIndex:1,shipmentId:s.id,amount:major(m.amount)}]}},user,ctx).state;
}
test('before-shipment payment clears only its financial blocker; production, loading and documents remain',()=>{
 const state=fresh(),{o,s,user}=prepare(state);o.paymentTerms.steps[1].trigger='SHIPMENT';
 const saved=structuredClone(o);assert.equal(orderProgress(state,o,user).title,'Complete the before-shipment payment');
 const before=orderJourney(state,o);assert.ok(before.shipments[0].blockers.some(b=>b.includes('payment outstanding')));
 const nextState=record(state,o,s,user),after=nextState.orders.find(x=>x.id===o.id);
 assert.deepEqual(after.shipments,saved.shipments);assert.equal(after.productionCompletedAt,saved.productionCompletedAt);assert.deepEqual(after.bulkQc,saved.bulkQc);
 for(const doc of saved.documents)assert.ok(after.documents.some(d=>JSON.stringify(d)===JSON.stringify(doc)));
 assert.equal(orderProgress(nextState,after,user).action,'dispatch');
 assert.ok(!orderJourney(nextState,after).shipments[0].blockers.some(b=>b.includes('payment outstanding')));
 assert.equal(orderJourney(nextState,after).shipments[0].stages.find(s=>s.key==='vessel').status,'Pending');
 assert.deepEqual(state.orders.find(x=>x.id===o.id),saved);
});
test('against-BL balance never blocks vessel departure and late payment never restarts shipping',()=>{
 const before=fresh(),prepared=prepare(before);assert.equal(orderProgress(before,prepared.o,prepared.user).action,'dispatch');
 assert.equal(orderJourney(before,prepared.o).payments[1].stage,'After final BL');
 assert.ok(!orderJourney(before,prepared.o).shipments[0].blockers.some(b=>b.includes('payment outstanding')));
 const state=fresh(),{o,s,user}=prepare(state,'FH-LAE-I-PO-1'),snapshot=structuredClone(s);
 const updated=record(state,o,s,user),after=updated.orders.find(x=>x.id===o.id);
 assert.deepEqual(after.shipments[0],snapshot);assert.equal(orderProgress(updated,after,user).action,'arrival');
 const lane=orderJourney(updated,after);assert.equal(lane.payments[1].status,'Recorded');assert.equal(lane.payments[1].receiptStatus,'Receipt / balance pending');
});

test('pending artwork blocks both dispatch guidance and authoritative vessel confirmation',()=>{
 const state=fresh(),{o,s,user}=prepare(state);o.artwork.pending={id:'future-artwork',label:'Future proposal'};
 const before=structuredClone(state);
 assert.equal(orderJourney(state,o).shipments.find(x=>x.id===s.id).blockers.some(b=>b.includes('artwork')),true);
 assert.equal(orderProgress(state,o,user).title,'Artwork approval is required');
 assert.throws(()=>execute(state,{type:'DISPATCH_SHIPMENT',payload:{orderId:o.id,shipmentId:s.id,date:'2026-10-14',vessel:'Synthetic vessel',voyage:'V1',remarks:'Pending artwork must block loading',reason:'Shipping / forwarder'}},user,{now:'2026-10-14T10:00:00Z',id:()=>crypto.randomUUID()}),/Approved artwork/);
 assert.deepEqual(state,before);
});
test('a recorded departure takes precedence over stale booking status in next-step advice',()=>{
 const state=fresh(),{o,s,user}=prepare(state,'FH-LAE-I-PO-1');s.bookingStatus='BOOKED';delete s.blNumber;delete s.blDate;delete s.insurance;
 assert.equal(orderProgress(state,o,user).action,'bl');assert.equal(orderJourney(state,o).shipments[0].stages.find(x=>x.key==='vessel').status,'Completed');
});
test('each partial shipment keeps its own payment gate, progress and completed dates',()=>{
 const state=fresh(),{o,user}=prepare(state,'FH-LAE-I-PO-7');o.paymentTerms.steps[1].trigger='SHIPMENT';
 for(const s of o.shipments){delete s.actualDeparture;delete s.actualArrival;s.bookingStatus='RELEASED';s.status='PLANNED';}
 const updated=record(state,o,o.shipments[0],user),after=updated.orders.find(x=>x.id===o.id),lane=orderJourney(updated,after);
 assert.ok(!lane.shipments[0].blockers.some(b=>b.includes('payment outstanding')));assert.ok(lane.shipments[1].blockers.some(b=>b.includes('payment outstanding')));
 after.shipments[1].status='CANCELLED';assert.equal(orderJourney(updated,after).shipments.length,1);
});
test('tracking does not replace formal vessel confirmation; exact document blockers remain visible',()=>{
 const state=fresh(),{o,s}=prepare(state);s.trackingMilestones.push({key:'ON_VESSEL',status:'COMPLETED',actualDate:'2026-10-02'});
 o.documents=o.documents.filter(d=>d.type!=='PACKING_LIST');
 const lane=orderJourney(state,o).shipments[0];assert.equal(lane.stages.find(s=>s.key==='vessel').status,'Pending');assert.match(lane.guidance,/reports vessel loading/);assert.ok(lane.blockers.some(b=>b.includes('packing list')));
});
test('read-only journey preserves all source records and escapes user content',()=>{
 const state=fresh(),{o}=prepare(state);o.shipments[0].number='<img onerror=alert(1)>';o.paymentTerms.steps[1].name='<script>alert(1)</script>';
 const original=structuredClone(state),esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
 const html=renderOrderJourney(state,o,{esc,dt:x=>x,formatMoney,badge:v=>'<span>'+esc(v)+'</span>'});
 assert.match(html,/Payment & shipment progress/);assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<script>'));assert.deepEqual(state,original);
});
