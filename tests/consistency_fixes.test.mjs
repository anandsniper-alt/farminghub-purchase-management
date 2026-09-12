import test from 'node:test';
import assert from 'node:assert/strict';
import {createSeed} from '../shared/seed.mjs';
import {createCleanSeed} from '../shared/clean-seed.mjs';
import {execute,productionReferenceDaysForOrderInput} from '../shared/domain.mjs';
import {scopedState} from '../server/index.mjs';

test('division projection filters prices, complaints and shipping history without mutating storage',()=>{
 const s=createCleanSeed('2026-09-12'),base=s.bases.find(b=>b.vendorId),item=s.items.find(i=>i.baseId===base.id);
 s.complaints=[{id:'complaint',itemId:item.id,baseId:base.id}];s.shippingImports=[{id:'batch',rows:[{raw:{Ref:'private'}}]}];
 const original=structuredClone(s),restricted={id:'utility-viewer',role:'VIEWER',active:true,scopes:['UTILITY_DOMESTIC']};
 const out=scopedState(s,restricted);
 for(const collection of ['orders','items','bases','vendors','priceLists','complaints','freightRates','freightImports','shippingImports','vendorImports','plmTemplates'])assert.deepEqual(out[collection],[],collection);
 const allowed=scopedState(s,{...restricted,scopes:['LAE_IMPORT']});
 for(const collection of ['priceLists','complaints','freightRates','freightImports','shippingImports'])assert.deepEqual(allowed[collection],s[collection],collection);
 assert.deepEqual(s,original);
});

test('a shared supplier cannot expose prices or complaints belonging to another division',()=>{
 const s=createCleanSeed(),base=s.bases.find(b=>b.vendorId),item=s.items.find(i=>i.baseId===base.id),actor=s.users.find(u=>u.role==='MANAGER');
 s.bases.push({...base,id:'other-base',scope:'UTILITY_DOMESTIC'});s.items.push({...item,id:'other-item',baseId:'other-base',scope:'UTILITY_DOMESTIC'});
 s.priceLists.push({id:'private-price',vendorId:base.vendorId,baseId:'other-base',itemId:'other-item'});
 s.complaints=[{id:'private-complaint',baseId:'other-base',itemId:'other-item'}];
 const out=scopedState(s,actor);assert.ok(out.vendors.some(v=>v.id===base.vendorId));assert.ok(!out.priceLists.some(p=>p.id==='private-price'));assert.deepEqual(out.complaints,[]);
});

test('tracking import checks every matched order before committing the batch',()=>{
 const s=createSeed('2026-09-12'),actor=s.users.find(u=>u.role==='EXECUTIVE'),template=s.orders.find(o=>o.shipments.length),ship=template.shipments[0];
 s.orders=['owned','other','outside'].map((id,i)=>({...structuredClone(template),id,serialNumber:i+1,buyerId:i===1?'another-executive':actor.id,scope:i===2?'UTILITY_DOMESTIC':'LAE_IMPORT',shipments:[{...structuredClone(ship),id:'ship-'+id,forwarderRef:'REF-'+id}]}));
 s.files.push({id:'tracking-proof',name:'tracking.csv',scope:'LAE_IMPORT',orderIds:[]});
 const rows=ids=>ids.map(id=>({Ref:'REF-'+id,Status:'SHIPPER LOADED CARGO',ETD:'15.09.2026',ETA:'28.09.2026'}));
 const run=(ids,u=actor)=>execute(s,{type:'COMMIT_TRACKING_IMPORT',payload:{rows:rows(ids),filename:'tracking.csv',sourceFileId:'tracking-proof'}},u);
 const original=structuredClone(s);
 for(const ids of [['owned','other'],['owned','outside']])assert.throws(()=>run(ids),e=>e.code==='FORBIDDEN');
 assert.deepEqual(s,original);assert.equal(run(['owned']).result.matched,1);
 assert.equal(run(['owned','other'],s.users.find(u=>u.role==='MANAGER')).result.matched,2);
});

test('ordinary item save cannot forge brand approval or write another division',()=>{
 const s=createCleanSeed(),actor=s.users.find(u=>u.role==='EXECUTIVE'),i=s.items.find(i=>s.bases.find(b=>b.id===i.baseId)?.vendorId);
 const payload={...i,brandDeltaStatus:'APPROVED'};
 const out=execute(s,{type:'SAVE_ITEM',payload},actor);assert.equal(out.state.items.find(x=>x.id===i.id).brandDeltaStatus,'PENDING');
 const original=structuredClone(s);s.bases.find(b=>b.id===i.baseId).scope='UTILITY_DOMESTIC';
 assert.throws(()=>execute(s,{type:'SAVE_ITEM',payload},actor),e=>e.code==='FORBIDDEN');
 s.bases.find(b=>b.id===i.baseId).scope=original.bases.find(b=>b.id===i.baseId).scope;i.scope='UTILITY_DOMESTIC';
 assert.throws(()=>execute(s,{type:'SAVE_ITEM',payload},actor),e=>e.code==='FORBIDDEN');
 assert.throws(()=>execute(s,{type:'ADD_COMPLAINT',payload:{itemId:i.id,severity:'MINOR',summary:'Test'}},actor),e=>e.code==='FORBIDDEN');
});

test('vendor normalized identity cannot collide or change via composite fields',()=>{
 const s=createCleanSeed(),actor=s.users.find(u=>u.role==='MANAGER'),v=s.vendors.find(v=>v.vendorSerial&&v.fixedSupplierCode);
 const original=structuredClone(s);
 assert.throws(()=>execute(s,{type:'SAVE_VENDOR',payload:{...v,id:undefined,code:'UNIQUE-RAW-CODE'}},actor),/already exists/);
 assert.throws(()=>execute(s,{type:'SAVE_VENDOR',payload:{...v,vendorSerial:'V999'}},actor),/Persistent vendor code/);
 assert.deepEqual(s,original);
 assert.equal(execute(s,{type:'SAVE_VENDOR',payload:{...v,name:'Updated supplier name'}},actor).state.vendors.find(x=>x.id===v.id).code,v.code);
});

test('supplier price writes reject foreign bases and mismatched item references',()=>{
 const s=createCleanSeed(),actor=s.users.find(u=>u.role==='EXECUTIVE'),b=s.bases.find(b=>b.vendorId),other=s.items.find(i=>i.baseId!==b.id),p={vendorId:b.vendorId,baseId:b.id,currency:'USD',unitPrice:'10',effectiveDate:'2026-09-12'};
 // Pick an active supplier/base for the command's existing prerequisites.
 s.vendors.find(v=>v.id===b.vendorId).status='ACTIVE';
 assert.throws(()=>execute(s,{type:'SAVE_PRICE_LIST',payload:{...p,itemId:other.id}},actor),e=>e.code==='FORBIDDEN');
 b.scope='UTILITY_DOMESTIC';assert.throws(()=>execute(s,{type:'SAVE_PRICE_LIST',payload:p},actor),e=>e.code==='FORBIDDEN');
});

test('production reference remains item maximum, supplier fallback, then 30 days',()=>{
 const s={items:[{id:'a',productionDays:20},{id:'b',productionDays:45}],vendors:[{id:'v',productionDays:35}]};
 assert.equal(productionReferenceDaysForOrderInput(s,{vendorId:'v',lines:[{itemId:'a'},{itemId:'b'}]}),45);
 assert.equal(productionReferenceDaysForOrderInput(s,{vendorId:'v',lines:[]}),35);
 assert.equal(productionReferenceDaysForOrderInput(s,{vendorId:'missing',lines:[]}),30);
});
