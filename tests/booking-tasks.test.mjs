import test from 'node:test';
import assert from 'node:assert/strict';
import {createSeed} from '../shared/seed.mjs';
import {addDays,ensureBookingTasks,flagsFor} from '../shared/domain.mjs';
import {taskMatches,taskState} from '../shared/task-reporting.mjs';
import {scopedState} from '../server/index.mjs';
import {scmPreviewState} from '../scripts/prepare-scm-preview.mjs';

const TODAY='2026-11-24';
const REMINDER='Container booking · ';
const isReminder=task=>task.title.startsWith(REMINDER);

test('booking and cancellation close only the matching plan reminder; direct invoice bookings generate none',()=>{
 createSeed(TODAY,({state,create,order,run,pi,pay,confirmArtwork,produce})=>{
  const orderId=create('Booking reminder test','GJPW12',100,'245.00',45);
  const planned=addDays(TODAY,-4),booked=addDays(TODAY,-3),etd=addDays(TODAY,2);
  pi(orderId,addDays(TODAY,-42));
  pay(orderId,0,null,addDays(TODAY,-41));
  confirmArtwork(orderId,addDays(TODAY,-40));
  produce(orderId,addDays(TODAY,-40),addDays(TODAY,-5));
  const lines=[{lineId:order(orderId).lines[0].id,quantity:10}];
  const plan=(number,scmPlan=false)=>run('ADD_SHIPMENT',{orderId,number,lines,etd,eta:etd,scmPlan},planned).id;
  const scmPlan=plan('SCM loading plan',true),legacyPlan=plan('Legacy loading plan'),cancelled=plan('Cancelled plan'),pending=plan('Still waiting',true);
  const getReminder=number=>order(orderId).tasks.find(t=>t.title===REMINDER+number);
  assert.equal(getReminder('SCM loading plan').bookingShipmentId,scmPlan);
  assert.equal(getReminder('Still waiting').bookingShipmentId,pending);

  // A previously saved plan has the original task shape. A same-title manual task also exists.
  delete getReminder('SCM loading plan').bookingShipmentId;
  run('ADD_FOLLOWUP',{orderId,title:REMINDER+'SCM loading plan',due:planned},planned);
  const manualId=state().events.at(-1).newValue.id;
  const invoice=(number,shipmentId)=>run('SCM_BOOK_INVOICE',{
   number,bookingRef:'Booking-'+number,forwarderId:'demo-forwarder',date:booked,etd,eta:etd,
   members:[{orderId,lines,...(shipmentId?{shipmentId}:{})}]
  },booked);
  invoice('TEST-CI-PLAN',scmPlan);
  invoice('TEST-CI-DIRECT');
  run('BOOK_CONTAINER',{orderId,shipmentId:legacyPlan,forwarderId:'demo-forwarder',forwarderRef:'Booking-legacy',date:booked,freightUsd:'100'},booked);
  run('CANCEL_SHIPMENT',{orderId,shipmentId:cancelled,remarks:'Space returned to forwarder.'},booked);

  for(const number of ['SCM loading plan','Legacy loading plan','Cancelled plan']){
   const task=getReminder(number);
   assert.equal(taskState(task,booked),'SYSTEM_CLOSED');
   assert.equal(taskState(task,planned),'OVERDUE');
  }
  assert.equal(getReminder('CI TEST-CI-DIRECT'),undefined);
  const tasks=order(orderId).tasks;
  const manual=tasks.find(t=>t.id===manualId),supplier=tasks.find(t=>t.title==='Supplier follow-up'),waiting=getReminder('Still waiting');
  assert.deepEqual([manual,supplier,waiting].map(t=>t.completedAt),[null,null,null]);
  const flags=new Set(flagsFor(state(),order(orderId),TODAY).map(f=>f.id));
  assert.ok([manual,supplier,waiting].every(t=>flags.has(orderId+'-'+t.id)));
  assert.ok(['SCM loading plan','Legacy loading plan','Cancelled plan'].every(number=>!flags.has(orderId+'-'+getReminder(number).id)));
 });
});

test('all ten booked cycles on demo PO 1 stay out of overdue tasks, including a saved demo from before the fix',()=>{
 const stored=scmPreviewState(TODAY,{tenCycles:true}),po=stored.orders[0];
 const invoices=stored.scm.invoices.filter(i=>i.members.some(m=>m.orderId===po.id));
 assert.equal(stored.orders.length,10);
 assert.equal(invoices.length,10);
 assert.equal(po.shipments.length,10);
 assert.equal(po.tasks.filter(isReminder).length,0);

 const oldReminders=po.shipments.map(s=>({
  id:'legacy-booking-'+s.id,title:REMINDER+s.number,createdAt:s.at,
  due:addDays(s.baselineEtd,-stored.settings.bookingLeadDays),ownerId:po.buyerId,recurring:false,completedAt:null
 }));
 const manual={...oldReminders[0],id:'manual-note',recurring:false};
 const supplier=po.tasks.find(t=>t.title==='Supplier follow-up');
 po.tasks.push(...oldReminders,manual);
 stored.events.push({entityType:'order',entityId:po.id,action:'TASK_CREATED',newValue:{id:manual.id}});
 assert.equal(oldReminders.filter(t=>taskMatches(t,'OVERDUE',TODAY)).length,10);
 const before=structuredClone(stored);
 const projected=scopedState(stored,stored.users.find(u=>u.role==='ADMIN'));
 assert.deepEqual(stored,before);
 assert.equal(ensureBookingTasks(stored),true);
 assert.equal(ensureBookingTasks(stored),false);

 for(const review of [stored,projected]){
  const shown=review.orders.find(o=>o.id===po.id);
  for(const old of oldReminders){
   const task=shown.tasks.find(t=>t.id===old.id);
   const invoice=invoices.find(i=>i.members.some(m=>m.shipmentId===task.bookingShipmentId));
   assert.equal(task.completedAt,invoice.at);
   assert.equal(taskState(task,TODAY),'SYSTEM_CLOSED');
  }
  assert.ok(!flagsFor(review,shown,TODAY).some(f=>oldReminders.some(t=>f.id===po.id+'-'+t.id)));
  assert.deepEqual(shown.tasks.find(t=>t.id===manual.id),manual);
  assert.deepEqual(shown.tasks.find(t=>t.id===supplier.id),supplier);
 }
});
