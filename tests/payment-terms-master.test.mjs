import test from 'node:test';import assert from 'node:assert/strict';
import {createSeed} from '../shared/seed.mjs';import {execute,paymentTermsFor} from '../shared/domain.mjs';
const make=()=>{const state=createSeed('2026-09-11');return {state,user:state.users.find(u=>u.role==='MANAGER')};};
const supplier={kind:'SUPPLIER',name:'QA 15/85',active:true,reason:'Isolated master test',steps:[{name:'Advance',percent:15,trigger:'PI',days:0},{name:'Balance',percent:85,trigger:'BL',days:60}]};
test('versioned terms master separates vendor types and never rewrites existing orders',()=>{
 const {state,user}=make(),before=structuredClone(state.orders);
 const a=execute(state,{type:'SAVE_PAYMENT_TERMS',payload:supplier},user);
 const term=paymentTermsFor(a.state).find(t=>t.name===supplier.name);assert.equal(term.revision,1);
 const b=execute(a.state,{type:'SAVE_PAYMENT_TERMS',payload:{kind:'LOGISTICS',name:'QA Net 30 freight',description:'Pay 30 days from freight invoice',reason:'Service agreement'}},user);
 assert.equal(paymentTermsFor(b.state,'LOGISTICS').length,1);assert.ok(!paymentTermsFor(b.state).some(t=>t.kind==='LOGISTICS'));
 const c=execute(b.state,{type:'SAVE_PAYMENT_TERMS',payload:{...supplier,id:term.id,active:false}},user);
 assert.ok(!paymentTermsFor(c.state).some(t=>t.id===term.id));assert.equal(paymentTermsFor(c.state,'SUPPLIER',true).find(t=>t.id===term.id).revision,2);
 assert.deepEqual(c.state.orders,before);assert.equal(c.state.events.filter(e=>e.action==='PAYMENT_TERMS_SAVED').length,3);
});
test('terms master rejects invalid totals, cross-type edits, duplicates and unauthorized users',()=>{
 const {state,user}=make();
 const run=(payload,actor=user)=>execute(state,{type:'SAVE_PAYMENT_TERMS',payload},actor);
 assert.throws(()=>run({...supplier,steps:[{name:'Advance',percent:90,trigger:'PI'}]}),/100/);
 assert.throws(()=>run({...supplier,reason:''}),/reason/);
 assert.throws(()=>run(supplier,{...user,role:'EXECUTIVE'}),/access/);
 assert.throws(()=>run({kind:'LOGISTICS',id:paymentTermsFor(state)[0].id,name:'Wrong type',reason:'Test',description:'Test'}),/not found/);
 assert.throws(()=>run({...supplier,name:paymentTermsFor(state)[0].name}),/already exists/);
});
test('new supplier templates are accepted by vendor defaults while logistics templates are rejected',()=>{
 const {state,user}=make(),saved=execute(state,{type:'SAVE_PAYMENT_TERMS',payload:supplier},user).state,t=paymentTermsFor(saved).find(t=>t.name===supplier.name);
 const payload={code:'QA-TERM-SUP',name:'QA supplier',kind:'SUPPLIER',status:'ACTIVE',defaultTerms:t.id};
 const result=execute(saved,{type:'SAVE_VENDOR',payload},user);assert.equal(result.state.vendors.find(v=>v.code===payload.code).defaultTerms,t.id);
 assert.throws(()=>execute(saved,{type:'SAVE_VENDOR',payload:{...payload,kind:'LOGISTICS',logisticsTermsId:t.id}},user),/not supplier/);
});

test('inactive defaults are retained on existing suppliers but cannot be assigned elsewhere',()=>{
 const {state,user}=make();let current=execute(state,{type:'SAVE_PAYMENT_TERMS',payload:supplier},user).state;
 const term=paymentTermsFor(current).find(t=>t.name===supplier.name);
 current=execute(current,{type:'SAVE_VENDOR',payload:{code:'QA-DEFAULT',name:'Existing default',kind:'SUPPLIER',status:'ACTIVE',defaultTerms:term.id}},user).state;
 const vendor=current.vendors.find(v=>v.code==='QA-DEFAULT');
 current=execute(current,{type:'SAVE_PAYMENT_TERMS',payload:{...supplier,id:term.id,active:false}},user).state;
 const saved=execute(current,{type:'SAVE_VENDOR',payload:{...vendor,name:'Unrelated name correction'}},user).state;
 assert.equal(saved.vendors.find(v=>v.id===vendor.id).defaultTerms,term.id);
 assert.throws(()=>execute(current,{type:'SAVE_VENDOR',payload:{code:'QA-NEW',name:'New supplier',kind:'SUPPLIER',status:'ACTIVE',defaultTerms:term.id}},user),/invalid/);
 const other=current.vendors.find(v=>v.kind==='SUPPLIER'&&v.id!==vendor.id);
 assert.throws(()=>execute(current,{type:'SAVE_VENDOR',payload:{...other,defaultTerms:term.id}},user),/invalid/);
});
test('new POs require an active choice for inactive defaults without rewriting saved drafts',()=>{
 const {state,user}=make();let current=execute(state,{type:'SAVE_PAYMENT_TERMS',payload:supplier},user).state;
 const term=paymentTermsFor(current).find(t=>t.name===supplier.name);
 const item=current.items.find(i=>i.code==='GJPW12'),base=current.bases.find(b=>b.id===item.baseId);
 const vendor=current.vendors.find(v=>v.id===base.vendorId);
 current=execute(current,{type:'SAVE_VENDOR',payload:{...vendor,defaultTerms:term.id}},user).state;
 const payload={vendorId:vendor.id,currency:'USD',priceListCurrency:'USD',productionDays:30,productionOverrideReason:'Synthetic commitment',lines:[{itemId:item.id,quantity:10,unitPrice:'100.00',specId:base.specifications[0].id}]};
 const draft=execute(current,{type:'CREATE_ORDER',payload},user);current=draft.state;
 const stored=structuredClone(current.orders.find(o=>o.id===draft.result.id).paymentTerms);
 current=execute(current,{type:'SAVE_PAYMENT_TERMS',payload:{...supplier,id:term.id,active:false}},user).state;
 assert.throws(()=>execute(current,{type:'CREATE_ORDER',payload},user),/inactive/);
 assert.throws(()=>execute(current,{type:'CREATE_ORDER',payload:{...payload,paymentTerms:term}},user),/inactive/);
 const active=paymentTermsFor(current)[0];
 const created=execute(current,{type:'CREATE_ORDER',payload:{...payload,paymentTerms:active}},user);
 assert.equal(created.state.orders.find(o=>o.id===created.result.id).paymentTerms.id,active.id);
 const custom={name:'Explicit order agreement',steps:[{name:'Full advance',percent:100,trigger:'PI',days:0}]};
 const tailored=execute(current,{type:'CREATE_ORDER',payload:{...payload,paymentTerms:custom}},user);
 assert.deepEqual(tailored.state.orders.find(o=>o.id===tailored.result.id).paymentTerms,custom);
 const edited=execute(current,{type:'EDIT_DRAFT',payload:{orderId:draft.result.id,notes:'Unrelated draft correction'}},user);
 assert.deepEqual(edited.state.orders.find(o=>o.id===draft.result.id).paymentTerms,stored);
});
