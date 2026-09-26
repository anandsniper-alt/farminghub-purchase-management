import test from 'node:test';
import assert from 'node:assert/strict';
import {createSaveRecovery} from '../web/concurrency.mjs';

test('Domestic conflict review links to the saved PO without changing current entries',async()=>{
 const box={innerHTML:''},before={user:{id:'manager'},state:{domesticOrders:[{id:'po-1',number:'FH-LAE-D-PO-1',status:'DRAFT'}]}},latest=structuredClone(before);
 latest.state.domesticOrders[0].status='ISSUED';
 const original=globalThis.document;globalThis.document={querySelector:s=>s==='#save-conflict'?box:null};let adopted=false;
 try{const recovery=createSaveRecovery({context:()=>before,fetchLatest:async()=>latest,adopt:()=>adopted=true,esc:s=>s});
  assert.equal(await recovery.action('review-save-conflict'),true);
  assert.match(box.innerHTML,/href="#\/domestic\/po-po-1"/);
  assert.equal(adopted,false);assert.equal(before.state.domesticOrders[0].status,'DRAFT');
 }finally{globalThis.document=original;}
});
