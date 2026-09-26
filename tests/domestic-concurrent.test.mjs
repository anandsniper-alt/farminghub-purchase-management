import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {assemblyComparisonFixture} from './domestic-assembly-fixture.mjs';
import {EditVersions} from '../server/concurrency.mjs';
import {Store} from '../server/store.mjs';
import {execute} from '../shared/domain.mjs';

function fixture(){
 const f=assemblyComparisonFixture(),manager=f.state.users.find(u=>u.role==='MANAGER'),bom=f.state.domesticBoms.find(b=>b.id===f.assemblyId),vendor=f.state.vendors.find(v=>v.code==='DEMO-A');
 const payload={bomId:bom.id,bomRevision:bom.revision,vendorId:vendor.id,assemblyQuantity:'10',lines:bom.lines.map((l,i)=>({itemId:l.itemId,rate:i?'12':'1000'})),deliveryDate:'2099-12-30',deliveryAddress:'Synthetic shipping address',paymentTerms:'Test terms',taxTerms:'GST extra',freightTerms:'Included',reason:'Synthetic concurrency test'};
 let state=execute(f.state,{type:'DOMESTIC_PO_SAVE',payload},manager).state;state=execute(state,{type:'DOMESTIC_PO_SAVE',payload},manager).state;
 return {...f,state,manager,bom,vendor,payload};
}
test('two Domestic orders can be issued from one view while same-order writes still conflict',()=>{
 const f=fixture(),dir=mkdtempSync(join(tmpdir(),'fh-domestic-concurrent-')),store=new Store(join(dir,'test.sqlite'),f.state);
 try{
  const state=store.read(),token=store.editContext(state,f.manager.id),send=(id,type='DOMESTIC_PO_ISSUE')=>store.transact({type,payload:{orderId:id,revision:1,confirm:true,reason:'Reviewed independently'}},f.manager.id,state.revision,null,token);
  const [first,second]=state.domesticOrders;send(first.id);send(second.id);assert.ok(store.read().domesticOrders.every(o=>o.status==='ISSUED'));
  const before=store.read();assert.throws(()=>send(first.id),e=>e.code==='CONFLICT');assert.deepEqual(store.read(),before);
  assert.deepEqual(before.domesticOrders[0].issuedSnapshot.lines,first.lines);assert.equal(new Set(before.domesticOrders.map(o=>o.number)).size,2);
 }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
test('Domestic issue protects dependencies including BOM, quotation, item, vendor and access',()=>{
 const f=fixture(),order=f.state.domesticOrders[0],quote=f.state.domesticPriceLists[0];order.lines[0].quotation={id:quote.id};
 const command={type:'DOMESTIC_PO_ISSUE',payload:{orderId:order.id}},versions=new EditVersions(),token=versions.issue(f.state,f.manager.id);
 for(const change of [s=>s.domesticBoms.find(b=>b.id===order.bom.id).revision++,s=>s.domesticItems.find(i=>i.id===order.lines[0].itemId).uom='OTHER',s=>s.domesticPriceLists.find(q=>q.id===quote.id).quoteReference+=' changed',s=>s.vendors.find(v=>v.id===order.vendorId).status='INACTIVE',s=>s.users.find(u=>u.id===f.manager.id).role='VIEWER']){
  const state=structuredClone(f.state);change(state);state.revision++;assert.throws(()=>versions.assert(state,command,f.manager.id,f.state.revision,token),e=>e.code==='CONFLICT');
 }
 const state=structuredClone(f.state);state.domesticOrders[1].notes='Unrelated';state.domesticItems.find(i=>!order.lines.some(l=>l.itemId===i.id)).description+=' unrelated';state.revision++;assert.doesNotThrow(()=>versions.assert(state,command,f.manager.id,f.state.revision,token));
});
test('BOM edits track old and proposed assembly/part dependencies; global commands remain conservative',()=>{
 const f=fixture(),versions=new EditVersions(),token=versions.issue(f.state,f.manager.id),proposed=f.state.domesticItems.find(i=>!f.bom.lines.some(l=>l.itemId===i.id)),command={type:'DOMESTIC_SAVE_BOM',payload:{bomId:f.bom.id,lines:[{itemId:proposed.id}]}};
 let state=structuredClone(f.state);state.domesticBoms.find(b=>b.id!==f.bom.id).notes='Other assembly';state.revision++;assert.doesNotThrow(()=>versions.assert(state,command,f.manager.id,f.state.revision,token));
 assert.throws(()=>versions.assert(state,{type:'UNREVIEWED_COMMAND'},f.manager.id,f.state.revision,token),e=>e.code==='CONFLICT');
 state.domesticItems.find(i=>i.id===proposed.id).active=false;assert.throws(()=>versions.assert(state,command,f.manager.id,f.state.revision,token),e=>e.code==='CONFLICT');
 state=structuredClone(f.state);state.domesticBoms.find(b=>b.id===f.bom.id).notes='Same assembly';state.revision++;assert.throws(()=>versions.assert(state,command,f.manager.id,f.state.revision,token),e=>e.code==='CONFLICT');
});
