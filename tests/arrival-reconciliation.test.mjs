import test from 'node:test';
import assert from 'node:assert/strict';
import {arrivalCostReconciliation} from '../shared/arrival-costing.mjs';
import {createArrivalCostingUI} from '../web/arrival-costing.mjs';

function fixture(){
 const c={id:'cost',invoiceNumber:'CI',shipmentId:'ship',status:'PROVISIONAL',costs:{supplierPayment:67},gstMinor:40,boeTotals:{gst:100},calculation:{lines:[],missing:[]},boeFileIds:[],supportFileIds:[],history:[]};
 const o={id:'o',number:'PO-1',scope:'LAE_IMPORT',shipments:[{id:'ship',number:'SHP-1'}],arrivalCostings:[c]};
 const state={orders:[o],files:[],payments:[{status:'ACKNOWLEDGED',inrMinor:101,bankChargesMinor:99,allocations:[{orderId:'other',remitMinor:1},{orderId:'o',remitMinor:2}]}]};
 return {state,o,c};
}
test('review compares exact PO bank principal allocations and keeps shared GST distinct',()=>{
 const {state,o,c}=fixture(),before=structuredClone(state),r=arrivalCostReconciliation(state,o,c);
 assert.equal(r.bankPrincipalMinor,67);assert.equal(r.supplierDifferenceMinor,0);assert.equal(r.gstDifferenceMinor,-60);assert.deepEqual(state,before);
 state.payments.push({...state.payments[0],status:'VOID'});assert.equal(arrivalCostReconciliation(state,o,c).bankPrincipalMinor,67);
});
test('missing bank evidence and partial supplier costs stay pending instead of zero',()=>{
 const {state,o,c}=fixture();state.payments=[];o.arrivalCostings.push({costs:{supplierPayment:null}});
 const r=arrivalCostReconciliation(state,o,c);assert.equal(r.bankPrincipalMinor,null);assert.equal(r.supplierDifferenceMinor,null);assert.equal(r.supplierCostIncomplete,true);
 state.payments=[{inrMinor:100,allocations:[{orderId:'o'}]}];assert.equal(arrivalCostReconciliation(state,o,c).bankPrincipalMinor,null);
});
test('final review displays bank and GST reconciliation prompts without changing data',()=>{
 const {state,o,c}=fixture();c.costs.supplierPayment=80;const before=structuredClone(state);
 const ui=createArrivalCostingUI({context:()=>({state}),esc:v=>String(v??''),note:v=>v,field:()=>'',button:()=>''});
 const modal=ui.modal('arrival-cost-finalize',{id:o.id,costing:c.id});
 assert.match(modal.body,/Recorded bank principal allocated to this PO/);assert.match(modal.body,/differs from full Bill of Entry GST/);assert.match(modal.body,/partial invoice costings/);assert.deepEqual(state,before);
});
