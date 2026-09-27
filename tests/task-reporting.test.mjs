import test from 'node:test';
import assert from 'node:assert/strict';
import {taskDay,taskState,taskDailySummary,taskBrandSummary,taskEfforts,taskMatches} from '../shared/task-reporting.mjs';
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
