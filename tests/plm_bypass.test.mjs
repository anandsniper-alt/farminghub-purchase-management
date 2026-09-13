import test from 'node:test';
import assert from 'node:assert/strict';
import {createCleanSeed} from '../shared/clean-seed.mjs';
import {execute,issueReadiness,missingApprovedPlmLines,currentApprovedPrice} from '../shared/domain.mjs';

const idFactory=()=>{let n=0;return()=>`plm-bypass-${++n}`;};

function buildDraft(state,{withApprovedSpec=false}={}){
  const base=state.bases.find(b=>b.code==='BS20');
  const item=state.items.find(i=>i.baseId===base.id&&i.brandPrefix==='GJ');
  if(withApprovedSpec){
    base.specifications.push({id:'approved-spec-bs20',version:'1.0',description:'Approved test spec',fieldValues:{},status:'APPROVED',at:'2026-09-01T00:00:00.000Z',approvedAt:'2026-09-02T00:00:00.000Z'});
  }
  const vendor=state.vendors.find(v=>v.id===base.vendorId);
  const price=currentApprovedPrice(state,vendor.id,base.id,vendor.defaultPriceListCurrency||'USD','2026-09-12');
  const route=state.routes[0];
  return {base,item,vendor,price,route,payload:{
    priceListFxRate:'7.2',priceListFxDate:'2026-09-12',number:'PLM-BYPASS-001',vendorId:vendor.id,buyerId:'u-exec',currency:vendor.defaultBillingCurrency||'USD',priceListCurrency:vendor.defaultPriceListCurrency||'USD',paymentMethod:vendor.defaultPaymentMethod||'TT',requestedPortDate:'2026-12-20',routeId:route.id,productionDays:base.productionDays,planningTat:90,paymentTerms:structuredClone(state.paymentTerms?.find?.(t=>t.id===vendor.defaultTerms)||undefined),costCenter:'Tamil Nadu',channel:'B2B',warehouse:'',productionOverrideReason:'',demandReference:'',followupFrequency:1,notes:'',lines:[{itemId:item.id,quantity:10,unitPrice:(price?.unitPriceMinor||1400)/100,specId:null,artworkNotes:''}]
  }};
}

test('missing approved PLM revision is a warning, not a PO submission blocker',()=>{
  let state=createCleanSeed('2026-09-12');
  const exec=state.users.find(u=>u.id==='u-exec');
  const manager=state.users.find(u=>u.id==='u-manager');
  const {payload}=buildDraft(state);
  const create=execute(state,{type:'CREATE_ORDER',payload},exec,{now:'2026-09-12T10:00:00.000Z',id:idFactory()});
  state=create.state;
  const order=state.orders.find(o=>o.id===create.result.id);
  assert.equal(missingApprovedPlmLines(state,order).length,1);
  assert.ok(!issueReadiness(state,order).some(x=>/technical package/i.test(x)));
  const submit=execute(state,{type:'SUBMIT_ORDER',payload:{orderId:order.id}},exec,{now:'2026-09-12T10:05:00.000Z',id:idFactory()});
  state=submit.state;
  assert.equal(state.orders.find(o=>o.id===order.id).status,'PENDING_APPROVAL');
  assert.ok(state.events.some(e=>e.entityId===order.id&&e.action==='PO_PROCEEDED_WITHOUT_PLM'));
  const approve=execute(state,{type:'APPROVE_ORDER',payload:{orderId:order.id}},manager,{now:'2026-09-12T10:10:00.000Z',id:idFactory()});
  const issued=approve.state.orders.find(o=>o.id===order.id);
  assert.equal(issued.status,'ISSUED');
  assert.equal(issued.revisions[0].snapshot.plmWarnings[0].status,'PLM_SPECIFICATION_NOT_AVAILABLE');
  assert.equal(issued.revisions[0].snapshot.lines[0].specification??null,null);
});

test('when an approved PLM revision exists, the PO must still select an approved technical version',()=>{
  let state=createCleanSeed('2026-09-12');
  const exec=state.users.find(u=>u.id==='u-exec');
  const {payload}=buildDraft(state,{withApprovedSpec:true});
  const create=execute(state,{type:'CREATE_ORDER',payload},exec,{now:'2026-09-12T11:00:00.000Z',id:idFactory()});
  state=create.state;
  const order=state.orders.find(o=>o.id===create.result.id);
  assert.equal(missingApprovedPlmLines(state,order).length,0);
  assert.ok(issueReadiness(state,order).some(x=>/select an approved technical package/i.test(x)));
  assert.throws(()=>execute(state,{type:'SUBMIT_ORDER',payload:{orderId:order.id}},exec,{now:'2026-09-12T11:05:00.000Z',id:idFactory()}),/select an approved technical package/i);
});
