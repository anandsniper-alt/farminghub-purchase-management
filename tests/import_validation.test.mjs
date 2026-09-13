import test from 'node:test';
import assert from 'node:assert/strict';
import {previewTrackingImport,previewRateImport} from '../shared/shipping.mjs';
import {createSeed} from '../shared/seed.mjs';
import {execute} from '../shared/domain.mjs';
const tracking=eta=>({Ref:'QA-REF',Status:'QA update',ETA:eta});
const rate=(value,volume='1X40HC')=>({'Port of Loading':'Ningbo','Port of Discharge':'Chennai',Volume:volume,'O/F USD':value});
test('tracking batch rejects duplicate normalized references, including identical rows',()=>{
 const state={orders:[{id:'o',vendorId:'v',shipments:[{id:'s',forwarderRef:'QA-REF'}]}],vendors:[]};
 for(const rows of [[tracking('2026-10-22'),tracking('2026-10-24')],[tracking('2026-10-22'),tracking('2026-10-22')]]){
  const result=previewTrackingImport(state,rows);assert.ok(result.every(r=>r.result==='REJECTED'&&r.errors.some(e=>e.includes('one row per Ref'))));
 }
 assert.equal(previewTrackingImport(state,[tracking('2026-10-22')])[0].result,'MATCHED');
});
test('freight batch rejects duplicate route/container, preserves distinct containers and later correction batches',()=>{
 const state={freightRates:[]};assert.ok(previewRateImport(state,[rate('3000'),rate('4000')],'W1').every(r=>r.result==='REJECTED'));
 assert.ok(previewRateImport(state,[rate('3000'),rate('2000','1X20GP')],'W1').every(r=>r.result==='READY'));
 state.freightRates=[{weekCode:'W1',routeKey:'NINGBO|CHENNAI|1X40HC'}];const correction=previewRateImport(state,[rate('4000')],'W1')[0];assert.equal(correction.result,'READY');assert.match(correction.warnings.join(' '),/correction snapshot/);
});
test('authoritative import commands reject duplicate and empty normalized batches without changing state',()=>{
 const s=createSeed('2026-09-13'),user=s.users.find(u=>u.role==='MANAGER'),before=JSON.stringify(s);
 for(const [type,rows,message] of [['COMMIT_TRACKING_IMPORT',[tracking('2026-10-22'),tracking('2026-10-24')],/rejected/],['COMMIT_FREIGHT_RATE_IMPORT',[rate('3000'),rate('4000')],/rejected/],['COMMIT_TRACKING_IMPORT',[{Ref:'',Status:''}],/no usable/],['COMMIT_FREIGHT_RATE_IMPORT',[{'Port of Loading':'','O/F USD':''}],/no usable/]]){
  assert.throws(()=>execute(s,{type,payload:{rows,weekCode:'W1'}},user),message);assert.equal(JSON.stringify(s),before);
 }
});
