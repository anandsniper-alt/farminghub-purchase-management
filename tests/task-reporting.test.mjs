import test from 'node:test';
import assert from 'node:assert/strict';
import {taskDay,taskState,taskDailySummary,taskBrandSummary,taskEfforts,taskMatches,taskScmFollowups} from '../shared/task-reporting.mjs';
import {execute} from '../shared/domain.mjs';
import {scmPreviewState} from '../scripts/prepare-scm-preview.mjs';
import {createTasksUI} from '../web/tasks.mjs';
test('task reporting uses India midnight and distinguishes past completion from future events',()=>{
 assert.equal(taskDay('2026-09-25T20:00:00Z'),'2026-09-26');
 assert.equal(taskState({due:'2026-09-25',completedAt:'2026-09-26T10:00:00Z'},'2026-09-25'),'TODAY');
 assert.equal(taskState({due:'2026-09-25',createdAt:'2026-09-27T10:00:00Z'},'2026-09-26'),'NOT_CREATED');
});
test('daily plan, actual completion, late recovery and system closures are separate',()=>{
 const rows=[{due:'2026-09-26',completedAt:'2026-09-25T10:00:00Z'}, {due:'2026-09-26'}, {due:'2026-09-26',completedAt:'2026-09-27T10:00:00Z'}, {due:'2026-09-25',completedAt:'2026-09-26T10:00:00Z'}, {due:'2026-09-24'}, {due:'2026-09-26',systemClosed:true,completedAt:'2026-09-26T10:00:00Z'}, {due:'2026-09-26',createdAt:'2026-09-27T10:00:00Z'}].map(t=>({t}));
 assert.deepEqual(taskDailySummary(rows,'2026-09-26'),{planned:3,onTime:1,completed:1,pending:3,overdue:1,rating:33});
 assert.equal(taskDailySummary([],'2026-09-26').rating,null);
 assert.equal(rows.filter(({t})=>taskMatches(t,'PLAN','2026-09-26')).length,3);
 assert.equal(rows.filter(({t})=>taskMatches(t,'ONTIME','2026-09-26')).length,1);
 assert.equal(rows.filter(({t})=>taskMatches(t,'DONE_TODAY','2026-09-26')).length,1);
 assert.equal(taskMatches({due:'2026-09-26',systemClosed:true,completedAt:'2026-09-26'},'OPEN','2026-09-26'),false);
});
test('brand summary preserves quantities and names without changing order lines',()=>{
 const order={lines:[{brandPrefix:'GJ',code:'GJ-A',name:'Pump',quantity:2},{brandPrefix:'TT',code:'TT-A',quantity:4},{brandPrefix:'GJ',code:'GJ-B',quantity:3}]},before=structuredClone(order),summary=taskBrandSummary(order);
 assert.deepEqual(summary.map(g=>[g.brand,g.quantity,g.items.length]),[['GJ',5,2],['TT',4,1]]);assert.deepEqual(order,before);
});
test('effort log counts only recorded follow-ups and interactions in permitted orders',()=>{
 const events=['FOLLOWUP_COMPLETED','INTERACTION','TASK_CREATED','PORT_ARRIVAL'].map(action=>({action,entityType:'order',entityId:'a',at:'2026-09-26T10:00:00Z',actorId:'manager'}));
 events.push({...events[0],entityId:'outside'},{...events[0],at:'2026-09-25T10:00:00Z'});
 assert.equal(taskEfforts(events,['a'],'2026-09-26').length,2);
});

test('SCM follows invoice and RO links across the ten-cycle review, with one logged effort per source note',()=>{
 const date='2026-11-24',day='2026-11-25',nextDue='2026-11-27',now=date+'T20:00:00Z';
 let state=scmPreviewState(date,{tenCycles:true});
 assert.equal(state.orders.length,10);
 const manager=state.users.find(u=>u.id==='u-manager');
 const assignee=state.users.find(u=>u.id==='u-admin');
 const invoice=number=>state.scm.invoices.find(i=>i.number===number);
 const ro=number=>state.scm.ros.find(r=>r.number===number);
 const split=state.orders.find(o=>o.id===invoice('DEMO-CI-A01').members[0].orderId);
 const otherSupplier=state.orders.find(o=>o.id===invoice('DEMO-CI-B01').members[0].orderId);
 const sameSupplier=state.orders.find(o=>o.vendorId===split.vendorId&&o.productionCompletedAt&&!o.shipments.length);
 assert.equal(state.scm.invoices.filter(i=>i.members.some(m=>m.orderId===split.id)).length,10);
 const run=(type,payload)=>{const result=execute(state,{type,payload},manager,{now});state=result.state;return result.result;};
 const follow=(owner,remarks)=>{
  const tasksBefore=state.orders.map(o=>o.tasks);
  const {id}=run('SCM_FOLLOWUP',{...owner,date,remarks});
  assert.deepEqual(state.orders.map(o=>o.tasks),tasksBefore);
  return id;
 };
 run('ADD_FOLLOWUP',{orderId:split.id,title:'Confirm supplier spares packing',due:day});
 run('ADD_NOTE',{orderId:split.id,remarks:'Supplier sent the drawings.'});
 const invoiceLines=[split,sameSupplier].map(o=>({orderId:o.id,lineId:o.lines[0].id,quantity:5}));
 const {invoiceId}=run('SCM_BOOK_INVOICE',{number:'TEST-MULTI-PO',bookingRef:'TEST-MULTI-BOOK',forwarderId:'demo-forwarder',date,etd:date,eta:day,destination:'Chennai',
  members:invoiceLines.map(({orderId,lineId,quantity})=>({orderId,lines:[{lineId,quantity}]}))});
 assert.throws(()=>follow({invoiceId,nextDue:'2026-11-23'},'Invalid date'),/cannot precede the follow-up date/);
 assert.throws(()=>follow({invoiceId,nextDue:'invalid'},'Invalid date'),/valid YYYY-MM-DD/);
 assert.throws(()=>follow({invoiceId,assignedOwnerId:'u-viewer'},'Invalid owner'),/active Purchase owner/);
 const invoiceNote=follow({invoiceId,nextDue,assignedOwnerId:assignee.id},'Supplier confirmed <packing>.');
 const ro301Note=follow({roId:ro('DEMO-RO-301').id},'Confirmed revised schedule with the forwarder.');
 const earlyRo302Note=follow({roId:ro('DEMO-RO-302').id},'First update before the additional invoice was loaded.');
 run('SCM_RELEASE_INVOICE',{invoiceId,date,reference:'TEST-MULTI-RELEASE'});
 run('SCM_LOAD_INVOICE',{invoiceId,date,roNumber:'DEMO-RO-302',containers:[{number:'TEST-MULTI-CONTAINER',packingList:'TEST-MULTI-PACKING-LIST',lines:invoiceLines}]});
 const ro302Note=follow({roId:ro('DEMO-RO-302').id},'Second update after loading the additional invoice.');
 const orderIds=state.orders.map(o=>o.id);
 const expected=new Map([
  [invoiceNote,[split.id,sameSupplier.id]],
  [ro301Note,[split.id,otherSupplier.id]],
  [earlyRo302Note,[split.id,sameSupplier.id]],
  [ro302Note,[split.id,sameSupplier.id]],
 ]);
 const efforts=(ids=orderIds,selectedDay=day)=>taskEfforts(state.events,ids,selectedDay,state.scm);
 assert.equal(efforts().length,5);
 assert.equal(efforts().filter(e=>e.action==='INTERACTION').length,1);
 assert.equal(efforts(orderIds,date).filter(e=>e.action==='SCM_FOLLOWUP').length,0,'effort uses the audit time in India');
 const invoiceEffort=efforts().find(e=>e.scmFollowup?.note.id===invoiceNote);
 assert.deepEqual([invoiceEffort.newValue.ownerId,invoiceEffort.newValue.nextDue,invoiceEffort.newValue.assignedOwnerId,invoiceEffort.actorId],
  [invoiceId,nextDue,assignee.id,manager.id]);
 const roEffort=efforts().find(e=>e.scmFollowup?.note.id===ro301Note);
 assert.equal(roEffort.scmFollowup.note.assignedOwnerId,manager.id);
 assert.equal(roEffort.scmFollowup.note.nextDue,undefined);
 for(const [id,orders] of expected){
  assert.equal(state.events.filter(e=>e.action==='SCM_FOLLOWUP'&&e.newValue.id===id).length,id===earlyRo302Note?1:2);
  const grouped=efforts().filter(e=>e.scmFollowup?.note.id===id);
  assert.equal(grouped.length,1);
  assert.deepEqual(grouped[0].scmFollowup.orderIds,orders);
  assert.equal(grouped[0].actorId,manager.id);
  for(const orderId of orderIds){
   const count=Number(orders.includes(orderId));
   assert.equal(taskScmFollowups(state.scm,[orderId]).filter(row=>row.note.id===id).length,count);
   assert.equal(efforts([orderId]).filter(e=>e.scmFollowup?.note.id===id).length,count);
  }
 }
 const escape=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
 const ui={taskFilters:{day,supplier:'',order:'',manager:'',status:'OPEN',sort:'due',flag:''}};
 const view=createTasksUI({context:()=>({state,user:manager,ui}),visibleOrders:()=>state.orders,
  esc:escape,dt:escape,head:()=>'',ph:(title,sub='')=>`<h2>${title}</h2>${sub}`,button:label=>label,badge:label=>label,canEdit:()=>true,allFlags:()=>[],flagList:()=>''});
 const history=view.scmHistory(split);
 assert.equal(history.match(/Confirmed revised schedule with the forwarder\./g)?.length,1);
 assert.match(history,/Supplier confirmed &lt;packing&gt;\.<\/td><td>2026-11-27<\/td><td>Demo Administrator/);
 assert.doesNotMatch(history,/<packing>/);
 assert.match(view.scmHistory(otherSupplier),/Confirmed revised schedule with the forwarder\./);
 assert.doesNotMatch(view.scmHistory(otherSupplier),/Supplier confirmed/);
 assert.match(view.page(),/View recorded efforts \(5\)/);
 assert.match(view.page(),/4 SCM follow-ups/);
 assert.match(view.page(),/Confirm supplier spares packing/);
 ui.taskFilters.supplier=otherSupplier.vendorId;
 ui.taskFilters.order=otherSupplier.id;
 const filtered=view.page();
 assert.match(filtered,/View recorded efforts \(1\)/);
 assert.match(filtered,/Confirmed revised schedule with the forwarder\./);
 assert.doesNotMatch(filtered,/Supplier confirmed &lt;packing&gt;\./);
});

test('cancelled booking retains its original invoice follow-up and never adds it to the replacement invoice',()=>{
 const old={id:'old',date:'2026-11-20',remarks:'Called about the original booking',by:'Historical recorder'};
 const next={id:'next',date:'2026-11-21',remarks:'Confirmed the replacement booking'};
 const scm={invoices:[
  {id:'original',number:'CI X',members:[{orderId:'po1'}],followups:[old],cancelledAt:'2026-11-21'},
  {id:'replacement',number:'CI X',members:[{orderId:'po2'}],followups:[next],replacesInvoiceId:'original'},
 ],ros:[]};
 assert.deepEqual(taskScmFollowups(scm,['po1']).map(row=>[row.ownerId,row.note]),[['original',old]]);
 assert.deepEqual(taskScmFollowups(scm,['po2']).map(row=>[row.ownerId,row.note]),[['replacement',next]]);
 const history=createTasksUI({context:()=>({state:{scm}}),esc:String,dt:String}).scmHistory({id:'po1'});
 assert.match(history,/Historical recorder<\/td><td>Called about the original booking<\/td><td>—<\/td><td>Not recorded/);
});
