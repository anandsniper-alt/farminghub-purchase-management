import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createSeed} from '../shared/seed.mjs';
import {execute,paymentTermsFor,TERMS} from '../shared/domain.mjs';
const fixture=()=>{const state=createSeed('2026-09-11');return {state,user:state.users.find(u=>u.role==='MANAGER')};};
const input={code:'QA-LOGISTICS',name:'Isolated logistics fixture',kind:'LOGISTICS',status:'ACTIVE',defaultBillingCurrency:'USD',defaultPaymentMethod:'TT',logisticsPaymentTerms:'Pay within 30 days of service invoice'};
test('logistics terms are independent of supplier defaults and remain auditable',()=>{
 const {state,user}=fixture(),before=structuredClone(state.orders);
 const created=execute(state,{type:'SAVE_VENDOR',payload:input},user);
 const vendor=created.state.vendors.find(v=>v.id===created.id)||created.state.vendors.find(v=>v.code===input.code);
 assert.equal(vendor.defaultTerms,null);assert.equal(vendor.logisticsPaymentTerms,input.logisticsPaymentTerms);
 const updated=execute(created.state,{type:'SAVE_VENDOR',payload:{...input,id:vendor.id,defaultTerms:'INVALID-SUPPLIER-TERM',logisticsPaymentTerms:'Payment after delivery'}},user);
 assert.equal(updated.state.vendors.find(v=>v.id===vendor.id).logisticsPaymentTerms,'Payment after delivery');
 assert.equal(updated.state.vendors.find(v=>v.id===vendor.id).defaultTerms,null);
 assert.deepEqual(updated.state.orders,before);assert.ok(updated.state.events.some(e=>e.entityId===vendor.id&&e.action==='VENDOR_SAVED'));
 assert.throws(()=>execute(state,{type:'SAVE_VENDOR',payload:{...input,logisticsPaymentTerms:'x'.repeat(2001)}},user),/2000/);
});
test('legacy logistics supplier fields are retained without copying into service terms',()=>{
 const {state,user}=fixture();const v=state.vendors.find(v=>v.kind==='LOGISTICS');
 assert.ok(v);v.defaultTerms='30-70';v.productionDays=45;
 const result=execute(state,{type:'SAVE_VENDOR',payload:{...v,logisticsPaymentTerms:'Freight payable before release'}},user);
 const next=result.state.vendors.find(x=>x.id===v.id);assert.equal(next.defaultTerms,'30-70');assert.equal(next.productionDays,45);assert.equal(next.logisticsPaymentTerms,'Freight payable before release');
});
test('supplier terms validation and linked vendor identities remain protected',()=>{
 const {state,user}=fixture();
 assert.throws(()=>execute(state,{type:'SAVE_VENDOR',payload:{...input,kind:'SUPPLIER',defaultTerms:'not-valid'}},user),/invalid/);
 const v=state.vendors.find(v=>state.orders.some(o=>o.vendorId===v.id));
 assert.throws(()=>execute(state,{type:'SAVE_VENDOR',payload:{...v,kind:'LOGISTICS'}},user),/linked/);
 assert.throws(()=>execute(state,{type:'SAVE_VENDOR',payload:{...input,kind:'OTHER'}},user),/vendor type/);
});
test('type switch hides and disables inapplicable fields without losing entered values',()=>{
 const source=readFileSync(new URL('../web/app.mjs',import.meta.url),'utf8');
 const fn=source.slice(source.indexOf('function syncVendorTypeFields()'),source.indexOf('function renderModal()'));
 const elements={kind:{value:'LOGISTICS'}};
 for(const name of ['defaultTerms','defaultPriceListCurrency','productionDays','logisticsPaymentTerms']){const field={hidden:false};elements[name]={value:name,closest:()=>field};}
 const context={ui:{modal:'vendor-edit'},document:{querySelector:()=>({elements})}};
 vm.runInNewContext(fn+';syncVendorTypeFields();',context);
 assert.equal(elements.defaultTerms.disabled,true);assert.equal(elements.defaultTerms.closest().hidden,true);assert.equal(elements.logisticsPaymentTerms.disabled,false);
 elements.kind.value='SUPPLIER';vm.runInNewContext(fn+';syncVendorTypeFields();',context);
 assert.equal(elements.defaultTerms.disabled,false);assert.equal(elements.logisticsPaymentTerms.disabled,true);assert.equal(elements.logisticsPaymentTerms.value,'logisticsPaymentTerms');
});

test('supplier controls preserve recorded defaults and require active selection for new orders',()=>{
 const {state}=fixture();const term=TERMS[0];
 state.paymentTermTemplates=[{...structuredClone(term),kind:'SUPPLIER',active:false,revision:1}];
 const source=readFileSync(new URL('../web/app.mjs',import.meta.url),'utf8');
 const helpers=source.slice(source.indexOf('function newOrderPaymentTerms(v)'),source.indexOf('function logisticsTermsFields(v)'));
 const context={state,paymentTermsFor,TERMS,structuredClone};vm.createContext(context);vm.runInContext(helpers,context);
 const vendor={defaultTerms:term.id};
 const pending=context.newOrderPaymentTerms(vendor);assert.equal(pending.id,'');assert.equal(pending.steps.length,0);
 const current=context.supplierTermsOptions(term.id,'Recorded (inactive): '+term.name);
 assert.equal(current[0].value,term.id);assert.match(current[0].label,/Recorded/);
 const options=context.supplierTermsOptions(pending.id);assert.equal(options[0].value,'');assert.ok(!options.some(o=>o.value===term.id));
 const active=paymentTermsFor(state)[0];assert.equal(context.newOrderPaymentTerms({defaultTerms:active.id}).id,active.id);
});
