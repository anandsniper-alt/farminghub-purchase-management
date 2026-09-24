import test from 'node:test';
import assert from 'node:assert/strict';
import {domesticPreviewState} from '../scripts/prepare-domestic-preview.mjs';
import {execute} from '../shared/domain.mjs';
const run=(s,type,p,role='MANAGER')=>execute(s,{type,payload:p},s.users.find(u=>u.role===role)).state;
const create={code:'ADDRESS-TEST',name:'Address test supplier',country:'India',address:'  12 Test Street\r\nChennai, Tamil Nadu 600001  ',gstin:'27ABCDE1234F1Z5',pan:'ABCDE1234F'};
test('supplier address creation and reasoned updates retain unrelated fields and audit',()=>{
 let s=run(domesticPreviewState(),'DOMESTIC_SAVE_VENDOR',create),v=s.vendors.find(v=>v.code===create.code);assert.equal(v.address,'12 Test Street\nChennai, Tamil Nadu 600001');const id=v.id;
 s=run(s,'DOMESTIC_UPDATE_VENDOR_ADDRESS',{vendorId:id,address:'New Street\nCoimbatore 641001',reason:'Relocated supplier'});v=s.vendors.find(v=>v.id===id);assert.equal(v.address,'New Street\nCoimbatore 641001');assert.equal(v.gstin,create.gstin);assert.equal(v.pan,create.pan);assert.equal(v.code,create.code);assert.match(JSON.stringify(s.events),/DOMESTIC_VENDOR_ADDRESS_UPDATED/);
});
test('supplier address validation and scope permissions reject atomic writes',()=>{
 const s=run(domesticPreviewState(),'DOMESTIC_SAVE_VENDOR',create),vendorId=s.vendors.find(v=>v.code===create.code).id,before=JSON.stringify(s);
 for(const address of [12,'x'.repeat(1501),'bad\u0000address'])assert.throws(()=>run(s,'DOMESTIC_UPDATE_VENDOR_ADDRESS',{vendorId,address,reason:'Test'}));
 assert.throws(()=>run(s,'DOMESTIC_UPDATE_VENDOR_ADDRESS',{vendorId,address:'New',reason:''}));
 for(const role of ['EXECUTIVE','VIEWER'])assert.throws(()=>run(s,'DOMESTIC_UPDATE_VENDOR_ADDRESS',{vendorId,address:'New',reason:'Test'},role));
 const isolated=structuredClone(s);isolated.vendors.find(v=>v.id===vendorId).scopes=['LAE_IMPORT'];assert.throws(()=>run(isolated,'DOMESTIC_UPDATE_VENDOR_ADDRESS',{vendorId,address:'New',reason:'Test'}));
 assert.equal(JSON.stringify(s),before);const cleared=run(s,'DOMESTIC_UPDATE_VENDOR_ADDRESS',{vendorId,address:'',reason:'Address awaiting confirmation'});assert.equal(cleared.vendors.find(v=>v.id===vendorId).address,'');
});
test('PIN/mobile validate and address-only clients preserve existing contact details',()=>{let s=run(domesticPreviewState(),'DOMESTIC_SAVE_VENDOR',{...create,pinCode:'600001',phone:'+91 9876543210'});const vendorId=s.vendors.find(v=>v.code===create.code).id;for(const bad of [{pinCode:'123'},{pinCode:'000000'},{phone:'not a number'}])assert.throws(()=>run(s,'DOMESTIC_UPDATE_VENDOR_ADDRESS',{vendorId,address:'Test',reason:'Update',...bad}));s=run(s,'DOMESTIC_UPDATE_VENDOR_ADDRESS',{vendorId,address:'Updated address',reason:'Address only'});const v=s.vendors.find(v=>v.id===vendorId);assert.equal(v.pinCode,'600001');assert.equal(v.phone,'+91 9876543210');});
