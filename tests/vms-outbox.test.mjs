import test from 'node:test';
import assert from 'node:assert/strict';
import {createVmsOutbox} from '../web/vms-outbox.mjs';
import {createSeed} from '../shared/seed.mjs';
import {execute} from '../shared/domain.mjs';
test('outbox isolates logins, resumes on reconnect and retains original on storage-full conflict review',async()=>{
 const names=['localStorage','navigator','window','setInterval'],original=Object.fromEntries(names.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)])),data=new Map(),listeners={},connection={onLine:false};let full=false,user={id:'manager-a'},sent=[];
 try{const mocks={localStorage:{get length(){return data.size;},key:i=>[...data.keys()][i],getItem:k=>data.get(k)??null,setItem:(k,v)=>{if(full)throw new Error('Quota exceeded');data.set(k,v);},removeItem:k=>data.delete(k)},navigator:connection,window:{addEventListener:(k,fn)=>{listeners[k]=fn;}},setInterval:()=>0};for(const [k,value] of Object.entries(mocks))Object.defineProperty(globalThis,k,{value,configurable:true});
 const box=createVmsOutbox({context:()=>({user,sandbox:false,ui:{view:'vms',modal:null}}),render:()=>{},syncEdit:async(item,owner)=>{sent.push({item,owner});}});
 const originalItem=await box.enqueue('VMS_SAVE_PROFILE',{vendorId:'vendor-1',remarks:'Offline edit',city:'Ningbo'},{remarks:'Original',city:'Ningbo'},'Supplier');assert.equal(box.list().length,1);
 user={id:'manager-b'};assert.deepEqual(box.list(),[]);connection.onLine=true;await listeners.online();assert.equal(sent.length,0);user={id:'manager-a'};connection.onLine=false;
 full=true;assert.throws(()=>box.retry(originalItem.id,{remarks:'Other edit',city:'Shanghai'}),/Quota/);assert.equal(box.list()[0].id,originalItem.id);assert.equal(box.list()[0].payload.city,'Ningbo');full=false;
 await box.retry(originalItem.id,{remarks:'Other edit',city:'Shanghai'});assert.equal(box.list().length,1);assert.notEqual(box.list()[0].id,originalItem.id);assert.equal(box.list()[0].payload.city,'Shanghai');assert.equal(box.list()[0].payload.remarks,'Offline edit');connection.onLine=true;await listeners.online();assert.equal(sent.length,1);assert.equal(sent[0].owner,'manager-a');assert.equal(box.list().length,0);
 }finally{for(const k of names){if(original[k])Object.defineProperty(globalThis,k,original[k]);else delete globalThis[k];}}
});

test('three offline visits sync exactly once after a lost acknowledgement without resetting dirty inputs',async()=>{
 const names=['localStorage','navigator','window','setInterval'],original=Object.fromEntries(names.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)])),data=new Map(),listeners={},connection={onLine:false};
 let state=createSeed('2026-09-11'),user=state.users.find(u=>u.role==='MANAGER'),renders=0,dirty=true,drop=true,tick;
 const vendor=state.vendors[0];
 try{
  const mocks={localStorage:{get length(){return data.size;},key:i=>[...data.keys()][i],getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},navigator:connection,window:{addEventListener:(k,fn)=>listeners[k]=fn},setInterval:fn=>{tick=fn;return 0;}};
  for(const [k,value] of Object.entries(mocks))Object.defineProperty(globalThis,k,{value,configurable:true});
  const box=createVmsOutbox({context:()=>({state,user,sandbox:false,pageDirty:dirty,ui:{view:'vms',modal:null}}),render:()=>renders++,syncEdit:async item=>{
   state=execute(state,{type:'VMS_SYNC_EDIT',payload:{vendorId:item.vendorId,requestId:item.id,commandType:item.commandType,base:item.base,payload:item.payload}},user,{now:'2026-09-13T12:00:00Z'}).state;
   if(drop){drop=false;throw Error('Lost acknowledgement');}
  }});
  for(let i=0;i<3;i++)await box.enqueue('VMS_ADD_INTERACTION',{vendorId:vendor.id,type:'VISIT',occurredAt:'2026-09-11',notes:'Visit '+i}, {},vendor.name);
  assert.equal(box.list().length,3);assert.equal(new Set(box.list().map(x=>x.id)).size,3);connection.onLine=true;await listeners.online();assert.equal(box.list().length,3);assert.equal(renders,0);
  await tick();assert.equal(box.list().length,0);assert.equal(state.vendors[0].crm.interactions.length,3);assert.equal(renders,0);
  dirty=false;await tick();assert.equal(renders,1);await tick();assert.equal(renders,1);
 }finally{for(const k of names){if(original[k])Object.defineProperty(globalThis,k,original[k]);else delete globalThis[k];}}
});
