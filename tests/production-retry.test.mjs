import test from 'node:test';
import assert from 'node:assert/strict';
import {pendingProductionCommand} from '../web/production/pending-command.mjs';
test('lost response and refreshed stock reuse the original production receipt without duplicate stock',async()=>{
 let revision=1,stock=0,first=true;const receipts=new Map(),sent=[];
 const save=pendingProductionCommand(async input=>{sent.push(input);if(!receipts.has(input.requestId)){stock+=input.qty;receipts.set(input.requestId,{stock});}if(first){first=false;throw Error('Lost response');}return receipts.get(input.requestId);},()=>({expectedRevision:revision,expectedProductionRevision:revision}),()=>{},()=>String(receipts.size+1));
 const input={type:'RECEIVE_STOCK',key:'bolt',qty:5,reason:'Demo receipt'};await assert.rejects(save(input),/Lost response/);revision=2;await assert.rejects(save({...input,qty:6}),/previous save/);await save(input);assert.equal(stock,5);assert.deepEqual(sent[1],sent[0]);assert.equal(sent[1].expectedRevision,1);
});
test('a definite conflict allows corrected production entries with refreshed revisions',async()=>{
 let revision=1,first=true;const sent=[];const save=pendingProductionCommand(async input=>{sent.push(input);if(first){first=false;throw Object.assign(Error('Conflict'),{status:409});}return {};},()=>({expectedRevision:revision,expectedProductionRevision:revision}),()=>{},()=>String(sent.length+1));
 await assert.rejects(save({qty:5}),/Conflict/);revision=2;await save({qty:6});assert.equal(sent[1].expectedRevision,2);assert.notEqual(sent[0].requestId,sent[1].requestId);
});
