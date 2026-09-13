import test from 'node:test';
import assert from 'node:assert/strict';
import {createCleanSeed} from '../shared/clean-seed.mjs';
import {execute,issueReadiness} from '../shared/domain.mjs';

test('new operational SKU keeps explicit base and brand mapping used by PO planning, without forging approval',()=>{
 let state=createCleanSeed('2026-09-12');
 const user=state.users.find(u=>u.role==='MANAGER');
 const original=state.bases.find(b=>b.code==='BS20');
 const base={...structuredClone(original),id:'qa-new-base',code:'QAMAP01',specifications:[]};
 state.bases.push(base);const before=structuredClone(state.items);let seq=0;
 const run=(type,payload,actor=user)=>{const r=execute(state,{type,payload},actor,{now:'2026-09-12T10:00:00Z',id:()=>`qa-map-${++seq}`});state=r.state;return r.result;};
 for(const brand of state.brands.filter(b=>['GJ','KD','TT'].includes(b.prefix))){
  const result=run('SAVE_ITEM',{baseId:base.id,brand:brand.name,code:brand.prefix+'-'+base.code,name:'QA mapped item',category:base.category,active:true,brandDeltaStatus:'APPROVED',brandPrefix:'FORGED',baseItemCode:'FORGED'});
  const item=state.items.find(i=>i.id===result.id);
  assert.equal(item.baseItemCode,base.code);assert.equal(item.brandPrefix,brand.prefix);assert.equal(item.brandDeltaStatus,'PENDING');assert.equal(item.baseId,base.id);
  assert.equal(state.events.at(-1).action,'ITEM_SAVED');assert.equal(state.events.at(-1).newValue.brandPrefix,brand.prefix);
 }
 assert.deepEqual(state.items.slice(0,before.length),before);
 const item=state.items.find(i=>i.baseId===base.id&&i.brandPrefix==='GJ');
 const po=run('CREATE_ORDER',{number:'QA-MAPPING-PO',vendorId:base.vendorId,buyerId:user.id,currency:'USD',priceListCurrency:'USD',paymentMethod:'TT',requestedPortDate:'2026-12-20',routeId:state.routes[0].id,productionDays:state.vendors.find(v=>v.id===base.vendorId).productionDays,planningTat:90,lines:[{itemId:item.id,quantity:2,unitPrice:10,specId:null}]});
 assert.equal(state.orders.find(o=>o.id===po.id).lines[0].code,'GJ-QAMAP01');
 assert.ok(issueReadiness(state,state.orders.find(o=>o.id===po.id)).some(x=>/brand/i.test(x)),'pending brand requirements remain an issue gate');
 const viewer=state.users.find(u=>u.role==='VIEWER');
 assert.throws(()=>run('SAVE_ITEM',{baseId:base.id,brand:state.brands[0].name,code:'QA-DENIED',name:'Denied',category:base.category},viewer),e=>e.code==='FORBIDDEN');
});
