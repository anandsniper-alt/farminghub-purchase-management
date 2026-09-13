import test from 'node:test';
import assert from 'node:assert/strict';
import {createSeed} from '../shared/seed.mjs';
import {execute} from '../shared/domain.mjs';
test('commitment changes retain selected cause without changing the original baseline',()=>{
 const state=createSeed('2026-09-12'),o=state.orders[0],user=state.users.find(u=>u.role==='MANAGER');
 Object.assign(o,{status:'ISSUED',productionStartedAt:'2026-09-01',productionCompletedAt:null,productionDue:'2026-11-01',baselineProductionDue:'2026-11-01'});
 const payload={orderId:o.id,date:'2026-11-08',reason:'Payment processing',remarks:'QA selected payment cause'};
 const result=execute(state,{type:'UPDATE_COMMITMENT',payload},user,{now:'2026-09-12T12:00:00Z'});
 const updated=result.state.orders.find(x=>x.id===o.id),event=result.state.events.at(-1);
 assert.equal(updated.baselineProductionDue,'2026-11-01');assert.equal(updated.productionDue,'2026-11-08');assert.equal(event.newValue.reason,'Payment processing');assert.equal(event.oldValue.baseline,'2026-11-01');
 const legacy=execute(state,{type:'UPDATE_COMMITMENT',payload:{...payload,reason:undefined}},user,{now:'2026-09-12T12:00:00Z'});assert.equal(legacy.state.events.at(-1).newValue.reason,null);
 assert.throws(()=>execute(state,{type:'UPDATE_COMMITMENT',payload:{...payload,reason:'INVALID'}},user),/reason/i);
});
