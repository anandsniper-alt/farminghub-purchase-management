import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LAE_FLOW_PHASES,LAE_FLOW_NODES,LAE_FLOW_EDGES,LAE_FLOW_FINDINGS} from '../shared/lae-flow-map.mjs';
import {createLaeFlowUI} from '../web/lae-flow-map.mjs';

test('flow catalogue has valid, traceable nodes and no orphan connection or finding',()=>{
 const ids=new Set(LAE_FLOW_NODES.map(n=>n.id));assert.equal(ids.size,LAE_FLOW_NODES.length);
 for(const phase of LAE_FLOW_PHASES)assert.ok(LAE_FLOW_NODES.some(n=>n.phase===phase.id),phase.id);
 for(const n of LAE_FLOW_NODES){assert.ok(LAE_FLOW_PHASES.some(p=>p.id===n.phase));assert.ok(n.source&&n.needs.length&&n.steps.length&&n.output,n.id);}
 for(const e of LAE_FLOW_EDGES){assert.ok(ids.has(e.from),e.from);assert.ok(ids.has(e.to),e.to);assert.notEqual(e.from,e.to);}
 for(const f of LAE_FLOW_FINDINGS){assert.ok(f.observed&&f.workaround&&f.recommendation&&f.source);assert.ok(f.nodes.every(id=>ids.has(id)));}
 for(const id of ['vendor','sku','terms','draft','pi','advance','plan','ro','residual','vessel','arrival','invoice-cost','references','warehouse'])assert.ok(ids.has(id),id);
});
test('process map is role scoped and renders no protected order data for an out-of-division user',()=>{
 const context={state:{vendors:[]},user:{id:'other',role:'VIEWER',scopes:['LAE_DOMESTIC']},ui:{}};
 const ui=createLaeFlowUI({context:()=>context,empty:s=>s,visibleOrders:()=>{throw Error('Must not access order data');}});
 assert.equal(ui.page(),'LAE Import access is required.');
});
test('source evidence for central loading audit findings still matches the implemented branches',()=>{
 const s=readFileSync(new URL('../shared/domain.mjs',import.meta.url),'utf8');
 const section=name=>s.split("type==='"+name+"'){")[1]?.split(' }else if')[0]||'';
 assert.match(section('ADD_SHIPMENT'),/dPlanShipment/);assert.match(section('PLAN_LOADING'),/dPlanShipment/);
 assert.match(section('PLAN_RO_LOADING'),/RO number is already recorded/);
 assert.match(section('DISPATCH_SHIPMENT'),/shippingDocReadiness/);assert.doesNotMatch(section('DISPATCH_SHIPMENT'),/blDraftVerifiedAt|s\.qc\?\.result/);
 assert.match(section('ARRIVE_SHIPMENT'),/not a warehouse receipt or financial settlement/);
});
