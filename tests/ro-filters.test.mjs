import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {RoCostingStore} from '../server/ro-costing-store.mjs';
import {finalizedPoCostings} from '../shared/arrival-costing.mjs';
import {createRoCostingUI} from '../web/ro-costing.mjs';

function storeFixture(){
 const db=new DatabaseSync(':memory:');
 db.exec('CREATE TABLE ro_costings(ro TEXT,revision INTEGER,payload TEXT,updated_at TEXT,supplier TEXT,status TEXT)');
 const insert=db.prepare('INSERT INTO ro_costings VALUES(?,1,?,?,?,?)');
 for(let i=0;i<61;i++){
  const ro='RO-'+String(i).padStart(3,'0'),supplier=i<55?'Supplier A':'Supplier B';
  insert.run(ro,JSON.stringify({ro,supplier,invoices:[]}),'2026-10-14',supplier,'Pending');
 }
 for(const ro of ['RO-10%','RO-10_','RO-10X'])insert.run(ro,JSON.stringify({ro,supplier:'Supplier B',invoices:[]}),'2026-10-14','Supplier B','Pending');
 const store={db,store:{read:()=>({vendors:[]})},actor:()=>({}),important:()=>({commercialInvoices:[],inwardBoe:[],importerCopies:[]}),sourceLibrary:()=>null};
 return {db,list:args=>RoCostingStore.prototype.list.call(store,'actor',args)};
}
test('supplier and RO filters combine before counting and pagination',()=>{
 const {db,list}=storeFixture();try{
  const a=list({supplier:'Supplier A'});assert.equal(a.total,55);assert.equal(a.rows.length,50);
  assert.equal(list({supplier:'Supplier A',offset:50}).rows.length,5);
  const b=list({supplier:'Supplier B',roNumber:'05'});assert.equal(b.total,5);assert.ok(b.rows.every(r=>r.supplier==='Supplier B'&&r.ro.includes('05')));
  assert.equal(list({supplier:' supplier a ',roNumber:'RO-000'}).total,1);
  assert.equal(list({supplier:'Supplier B',roNumber:'RO-000'}).total,0);
  assert.deepEqual(b.suppliers,['Supplier A','Supplier B']);
 }finally{db.close();}
});
test('RO filter treats SQL wildcards and injection-like input as literal text',()=>{
 const {db,list}=storeFixture();try{
  assert.equal(list({roNumber:'10%'}).total,1);assert.equal(list({roNumber:'10_'}).total,1);
  assert.equal(list({supplier:"' OR 1=1 --"}).total,0);
  assert.throws(()=>list({supplier:[]}));assert.throws(()=>list({roNumber:'x'.repeat(121)}));
 }finally{db.close();}
});
test('the same supplier and RO filters apply to finalized PO invoices',()=>{
 const actor={role:'MANAGER',scopes:['LAE_IMPORT']},state={vendors:[{id:'v',name:'Supplier A'}],orders:[{id:'o',number:'PO-1',scope:'LAE_IMPORT',vendorId:'v',shipments:[{id:'s',number:'SHP-1',actualArrival:'2026-10-14'}],arrivalCostings:[{id:'c',shipmentId:'s',status:'FINAL',roReference:'RO-123'}]}]};
 assert.equal(finalizedPoCostings(state,actor,{supplier:'supplier a',roNumber:'123'}).length,1);
 assert.equal(finalizedPoCostings(state,actor,{supplier:'Supplier B',roNumber:'123'}).length,0);
 assert.equal(finalizedPoCostings(state,actor,{supplier:'Supplier A',roNumber:'456'}).length,0);
 assert.equal(finalizedPoCostings(state,actor,{supplier:'Supplier A',roNumber:'123',status:'Pending'}).length,0);
});
test('UI submits independent filters, resets pagination, and clears filters',async()=>{
 const requests=[],fields=[],ctx={user:{id:'m',role:'MANAGER',scopes:['LAE_IMPORT']},state:{orders:[]},ui:{view:'ro-costings'},sandbox:false};
 const ui=createRoCostingUI({context:()=>ctx,api:async path=>{requests.push(path);return {rows:[],total:0,suppliers:['Supplier A','Supplier B']};},esc:v=>String(v??''),field:(name,label,value,type,options)=>{fields.push({name,label,value,type,options});return '';},button:()=>'',head:()=>'',ph:()=>'',note:v=>v,badge:v=>v,render:()=>{}});
 const flush=async()=>{ui.page();await new Promise(resolve=>setImmediate(resolve));return ui.page();};
 await flush();assert.ok(fields.findLast(f=>f.name==='supplier'&&f.type==='select').options.options.some(o=>o.value==='Supplier B'));
 const original=globalThis.FormData;
 try{
  globalThis.FormData=class{constructor(form){return new Map(Object.entries(form.values));}};
  await ui.action('ro-page',{offset:50});await ui.action('ro-po-page',{offset:50});
  await ui.formSubmit({target:{id:'ro-filter',values:{supplier:'Supplier A',roNumber:'123',q:'',status:'Pending'}}});await flush();
  let params=new URL('http://local'+requests.at(-1)).searchParams;
  assert.equal(params.get('supplier'),'Supplier A');assert.equal(params.get('roNumber'),'123');assert.equal(params.get('offset'),'0');
  await ui.action('ro-reset-filters',{});await flush();params=new URL('http://local'+requests.at(-1)).searchParams;
  for(const key of ['supplier','roNumber','q','status'])assert.equal(params.get(key),'');
 }finally{globalThis.FormData=original;}
});
