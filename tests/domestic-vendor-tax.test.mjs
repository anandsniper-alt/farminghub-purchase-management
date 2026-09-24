import test from 'node:test';
import assert from 'node:assert/strict';
import {domesticPreviewState} from '../scripts/prepare-domestic-preview.mjs';
import {execute} from '../shared/domain.mjs';
const run=(s,type,p,role='MANAGER')=>execute(s,{type,payload:p},s.users.find(u=>u.role===role)).state;
const create={code:'TAX-TEST',name:'Test supplier',country:'India',gstin:'27abcde1234f1z5',pan:'abcde1234f'};
test('Domestic supplier tax details normalize, update with reason, and retain audit history',()=>{
 let s=run(domesticPreviewState(),'DOMESTIC_SAVE_VENDOR',create);let v=s.vendors.find(v=>v.code===create.code);assert.equal(v.gstin,'27ABCDE1234F1Z5');assert.equal(v.pan,'ABCDE1234F');
 const id=v.id;s=run(s,'DOMESTIC_UPDATE_VENDOR_TAX',{vendorId:id,gstin:'',pan:'ABCDE1234F',reason:'GST not supplied'});v=s.vendors.find(v=>v.id===id);assert.equal(v.gstin,'');assert.equal(v.pan,'ABCDE1234F');assert.equal(v.code,create.code);
 assert.match(JSON.stringify(s.events),/DOMESTIC_VENDOR_TAX_UPDATED/);
});
test('Domestic tax validation rejects malformed and mismatched IDs without changing source state',()=>{
 const s=domesticPreviewState(),before=JSON.stringify(s);
 for(const values of [{gstin:'bad'},{pan:'123'},{pan:'AAAAA1234A'},{gstin:12}])assert.throws(()=>run(s,'DOMESTIC_SAVE_VENDOR',{...create,...values}));
 assert.equal(JSON.stringify(s),before);
 let saved=run(s,'DOMESTIC_SAVE_VENDOR',create);const vendorId=saved.vendors.find(v=>v.code===create.code).id;
 assert.throws(()=>run(saved,'DOMESTIC_UPDATE_VENDOR_TAX',{vendorId,gstin:'',pan:'',reason:''}));
 assert.throws(()=>run(saved,'DOMESTIC_UPDATE_VENDOR_TAX',{vendorId,gstin:'',pan:'',reason:'Update'},'EXECUTIVE'));
 const blank=run(s,'DOMESTIC_SAVE_VENDOR',{code:'NO-TAX',name:'Unregistered supplier',country:'India'});assert.equal(blank.vendors.find(v=>v.code==='NO-TAX').gstin,'');
});
