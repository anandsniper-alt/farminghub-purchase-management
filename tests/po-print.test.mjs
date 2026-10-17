import test from 'node:test';
import assert from 'node:assert/strict';
import {poPrintSource,poAllocationSummary,renderPoPrint} from '../web/po-print.mjs';

const line=(code,quantity,price,allocations)=>({code,name:'Sample item',quantity,unitPriceMinor:price,costCenterAllocations:allocations.map(([costCenterId,quantity])=>({costCenterId,quantity}))});
const fixture=()=>({number:'TEST-PO',status:'DRAFT',currency:'USD',costCenterIds:['TN','AP','HR'],lines:[line('A',3,12345,[['TN',2],['AP',1]]),line('B',2,999,[['TN',1],['HR',1]])],revisions:[],createdAt:'2026-10-14',requestedPortDate:'2026-12-18'});
test('allocation values use each PO line price and reconcile in integer minor units',()=>{
 const order=fixture(),before=JSON.stringify(order),a=poAllocationSummary(order);
 assert.deepEqual(a.centres.map(c=>[c.id,c.quantity,c.value]),[['TN',3,25689],['AP',1,12345],['HR',1,999]]);
 assert.equal(a.allocatedQuantity,5);assert.equal(a.allocatedValue,39033);assert.equal(a.value,39033);assert.deepEqual(a.errors,[]);assert.equal(JSON.stringify(order),before);
});
test('selected issued revision retains its prices and splits after current PO changes',()=>{
 const order=fixture(),snapshot=structuredClone(order);order.revisions=[{revision:0,snapshot,actor:'Approver',at:'2026-10-14'},{revision:1,snapshot:{...structuredClone(snapshot),lines:[line('C',1,500,[['HR',1]])]}}];
 order.lines[0].unitPriceMinor=1;order.lines[0].costCenterAllocations=[{costCenterId:'HR',quantity:3}];
 const source=poPrintSource(order,{revisionIndex:0});assert.equal(source.snapshot,snapshot);assert.equal(source.issued,true);assert.equal(poAllocationSummary(source.snapshot).allocatedValue,39033);
 assert.equal(poPrintSource(order).revision,1);
});
test('legacy snapshots never borrow present-day allocations or technical descriptions',()=>{
 const order=fixture();const old={number:'OLD',currency:'USD',costCenter:'Tamil Nadu',lines:[{code:'OLD',quantity:4,unitPriceMinor:100}]};order.revisions=[{revision:0,snapshot:old}];
 const source=poPrintSource(order,{specificationForLine:()=>({description:'NEW MASTER'})}),a=poAllocationSummary(source.snapshot);
 assert.equal(a.centres.length,0);assert.equal(a.allocatedValue,0);assert.ok(a.errors.length);assert.equal(source.snapshot.lines[0].specification,undefined);
 const html=renderPoPrint(source);assert.match(html,/Item-level cost-centre allocations were not recorded/);assert.doesNotMatch(html,/Fully allocated|NEW MASTER/);
});
test('missing and mismatched allocations are shown without inventing quantity splits',()=>{
 const order=fixture();order.lines[0].costCenterAllocations=[{costCenterId:'TN',quantity:1}];
 const a=poAllocationSummary(order);assert.equal(a.rows[0].remaining,2);assert.ok(a.errors.length);assert.match(renderPoPrint(poPrintSource(order)),/2 unallocated/);assert.doesNotMatch(renderPoPrint(poPrintSource(order)),/Fully allocated/);
});
test('total mismatches, zero centres, escaping and missing specifications render clearly',()=>{
 const order=fixture();order.lines[0].name='<script>bad()</script>';order.costCenterIds.push('AP');
 const source=poPrintSource(order,{vendor:{name:'A & B <Ltd>'}});source.snapshot.totalMinor=1;
 const html=renderPoPrint(source,{terms:'Pay <30%>'});assert.match(html,/A &amp; B &lt;Ltd&gt;/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>|Fully allocated/);assert.match(html,/Recorded PO total differs/);
 const zero=fixture();zero.lines[1].costCenterAllocations=[{costCenterId:'TN',quantity:2}];assert.equal(poAllocationSummary(zero).centres.find(c=>c.id==='HR').value,0);
});
test('technical annexure retains recorded specifications and packaging requirements',()=>{
 const order=fixture(),source=poPrintSource(order,{specificationForLine:()=>({version:2,description:'Engine 170F\nTank capacity 6 litres'})});source.snapshot.lines[0].artworkNotes='Use approved decal';
 const html=renderPoPrint(source);assert.match(html,/Engine 170F\nTank capacity 6 litres/);assert.match(html,/Use approved decal/);assert.match(html,/Specification details/);assert.match(html,/DRAFT \/ NOT ISSUED/);
});


test('technical details follow the issued revision, link each ERP item, and precede allocations',()=>{
 const order=fixture();order.lines[0].category='WATER PUMP';order.lines[0].baseCode='WP9';
 const frozen={...structuredClone(order),lines:order.lines.map(l=>({...l,specification:{version:'1',description:'154F engine\nThreaded fuel tank cover\nOil alarm with conductive device'},artworkNotes:'Customized carton and brand decal'}))};
 order.revisions=[{revision:0,snapshot:frozen}];order.lines[0].name='Changed master description';
 const before=JSON.stringify(order),html=renderPoPrint(poPrintSource(order,{specificationForLine:()=>({description:'NEW MASTER SPEC'})}));
 assert.ok(html.indexOf('02 / Technical specifications')<html.indexOf('03 / Cost-centre allocation'));
 assert.match(html,/Base model: WP9/);assert.match(html,/154F engine\nThreaded fuel tank cover\nOil alarm with conductive device/);assert.match(html,/Customized carton and brand decal/);
 assert.doesNotMatch(html,/NEW MASTER SPEC|Changed master description|Technical<br>version/);assert.equal(JSON.stringify(order),before);
});
test('legacy missing specifications stay explicitly missing; arbitrary markup stays literal',()=>{
 const order=fixture();order.lines[0].artworkNotes='<img src=x onerror=alert(1)>';order.lines[0].name='Pump';
 let html=renderPoPrint(poPrintSource(order));assert.match(html,/Technical specifications not recorded in this draft/);assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);assert.doesNotMatch(html,/<img src=x/);
 order.revisions=[{snapshot:structuredClone(order)}];html=renderPoPrint(poPrintSource(order,{specificationForLine:()=>({description:'Not historical'})}));assert.match(html,/Technical specifications not recorded in this issued revision/);assert.doesNotMatch(html,/Not historical/);
});
