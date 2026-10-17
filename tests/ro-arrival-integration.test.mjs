import test from 'node:test';
import assert from 'node:assert/strict';
import {finalizedPoCostings} from '../shared/arrival-costing.mjs';
import {createRoCostingUI} from '../web/ro-costing.mjs';

const actor={id:'manager',role:'MANAGER',scopes:['LAE_IMPORT'],active:true};
function fixture(){return {vendors:[{id:'vendor',name:'Supplier'}],orders:[{
 id:'order',number:'PO-39',scope:'LAE_IMPORT',vendorId:'vendor',
 shipments:[{id:'shipment',number:'SHP-1',status:'ARRIVED',actualArrival:'2026-10-14',forwarderRef:'45631'}],
 arrivalCostings:[{id:'cost',shipmentId:'shipment',status:'FINAL',roReference:'RO-123',invoiceNumber:'INV-1',boeNumber:'BOE-1',boeDate:'2026-10-14',finalizedAt:'2026-10-14T10:00:00Z',gstMinor:48292300,calculation:{invoiceUsdMinor:8580000,totalMinor:428904200,costPerUsd:49988834}}]
}]};}
test('projects exact saved final amounts without changing or recalculating source data',()=>{
 const state=fixture(),before=structuredClone(state),rows=finalizedPoCostings(state,actor);
 assert.equal(rows.length,1);assert.equal(rows[0].totalMinor,428904200);assert.equal(rows[0].costPerUsd,49988834);
 assert.equal(rows[0].href,'#/order/order?tab=costing&costing=cost');assert.deepEqual(state,before);
});
test('only current finalized, arrived business invoices in the authorized scope are shown',()=>{
 assert.deepEqual(finalizedPoCostings(undefined,actor),[]);assert.deepEqual(finalizedPoCostings(null,actor),[]);
 for(const change of [s=>s.orders[0].deletedAt='now',s=>s.orders[0].testData={},s=>s.orders[0].scope='LAE_DOMESTIC',s=>s.orders[0].arrivalCostings[0].status='PROVISIONAL',s=>s.orders[0].shipments[0].status='CANCELLED',s=>delete s.orders[0].shipments[0].actualArrival]){
  const state=fixture();change(state);assert.equal(finalizedPoCostings(state,actor).length,0);
 }
 assert.equal(finalizedPoCostings(fixture(),{...actor,scopes:['LAE_DOMESTIC']}).length,0);
 assert.equal(finalizedPoCostings(fixture(),{...actor,active:false}).length,0);
});
test('filters by PO, invoice, RO, supplier and status; never guesses missing RO references',()=>{
 for(const q of ['po-39','inv-1','ro-123','supplier','boe-1'])assert.equal(finalizedPoCostings(fixture(),actor,{q}).length,1);
 assert.equal(finalizedPoCostings(fixture(),actor,{status:'Pending'}).length,0);
 assert.equal(finalizedPoCostings(fixture(),actor,{status:'Complete'}).length,1);
 assert.equal(finalizedPoCostings(fixture(),actor,{ro:'RO-123'}).length,1);
 assert.equal(finalizedPoCostings(fixture(),actor,{ro:'45631'}).length,0);
 const state=fixture();state.orders[0].arrivalCostings[0].roReference='';assert.equal(finalizedPoCostings(state,actor)[0].roReference,'');
});
test('multiple invoices and identical references stay separate without double-counted totals',()=>{
 const state=fixture(),c=state.orders[0].arrivalCostings[0];state.orders[0].arrivalCostings.push({...c,id:'cost-2',invoiceNumber:'INV-2'});
 const rows=finalizedPoCostings(state,actor,{ro:'RO-123'});assert.equal(rows.length,2);assert.notEqual(rows[0].href,rows[1].href);
 assert.ok(rows.every(r=>r.totalMinor===c.calculation.totalMinor));
});
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
async function renderHarness(state=fixture()){
 const ctx={state,user:actor,ui:{view:'ro-costings',orderId:null},sandbox:false};let apiCalls=0;
 const ui=createRoCostingUI({context:()=>ctx,api:async()=>{apiCalls++;return {total:1,rows:[{ro:'Legacy-RO',supplier:'Existing supplier',invoices:['OLD-INV'],goodsUsd:100,rate:90,status:'Complete',documents:2}],sourceLibrary:null};},esc,
 field:(name,label)=>`<label>${esc(label)}<input name="${name}"></label>`,button:(label,action,data={})=>`<button data-action="${action}" data-offset="${data.offset??''}">${label}</button>`,head:()=>'',ph:(title,sub)=>`<h2>${esc(title)}</h2><p>${esc(sub)}</p>`,note:esc,badge:esc,render:()=>{},showDialog:()=>{},closeModal:()=>{},toast:()=>{},csv:()=>{}});
 ui.page();await new Promise(resolve=>setImmediate(resolve));return {ui,ctx,apiCalls};
}
test('RO list renders source link, exact amounts and legacy records; escapes references',async()=>{
 const state=fixture();state.orders[0].arrivalCostings[0].roReference='<img onerror=alert(1)>';
 const {ui}=await renderHarness(state),html=ui.page();
 assert.match(html,/Finalized PO costings/);assert.match(html,/42,89,042\.00/);assert.match(html,/49\.9888/);
 assert.match(html,/tab=costing&amp;costing=cost/);assert.match(html,/Legacy-RO/);
 assert.match(html,/&lt;img onerror=alert\(1\)&gt;/);assert.doesNotMatch(html,/<img onerror/);
 state.orders[0].arrivalCostings[0].status='PROVISIONAL';assert.doesNotMatch(ui.page(),/Open final costing/);
});
test('PO list pagination is independent of existing RO pagination',async()=>{
 const state=fixture(),base=state.orders[0].arrivalCostings[0];
 state.orders[0].arrivalCostings=Array.from({length:51},(_,i)=>({...base,id:'cost-'+String(i).padStart(2,'0')}));
 const {ui}=await renderHarness(state);assert.equal((ui.page().match(/Open final costing/g)||[]).length,50);
 await ui.action('ro-po-page',{offset:50});assert.equal((ui.page().match(/Open final costing/g)||[]).length,1);
 assert.match(ui.page(),/Legacy-RO/);
});
