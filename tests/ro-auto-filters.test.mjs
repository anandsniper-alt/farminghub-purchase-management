import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoCostingUI} from '../web/ro-costing.mjs';

test('automatic filters debounce typing, preserve focus, cancel reset and ignore stale responses',async()=>{
 const originals={FormData:globalThis.FormData,document:globalThis.document,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout};
 const timers=new Map(),requests=[],pending=[],fields=[];let timerId=0,ui,html='',focusCount=0;
 const ctx={user:{id:'m',role:'MANAGER',scopes:['LAE_IMPORT']},state:{orders:[]},ui:{view:'ro-costings'},sandbox:false};
 const values={supplier:'',status:'',roNumber:''},form={id:'ro-filter',values,elements:{namedItem:name=>controls[name]}};
 const controls=Object.fromEntries(['supplier','status','roNumber'].map(name=>[name,{name,closest:()=>form,get value(){return values[name];},selectionStart:name==='roNumber'?3:null,selectionEnd:name==='roNumber'?3:null,focus:()=>focusCount++,setSelectionRange:(a,b)=>assert.equal(a,b)}]));
 const tick=()=>new Promise(resolve=>setImmediate(resolve));
 const finish=async(label='CURRENT')=>{const r=pending.shift();assert.ok(r);r.resolve({rows:[{ro:label,supplier:'Supplier',invoices:[],status:'Pending',documents:0}],total:1,suppliers:['Supplier A','Supplier B']});await tick();};
 try{
  globalThis.FormData=class{constructor(target){return new Map(Object.entries(target.values));}};
  globalThis.document={activeElement:controls.roNumber,querySelector:()=>form};
  globalThis.setTimeout=(callback,ms)=>{assert.equal(ms,350);timers.set(++timerId,callback);return timerId;};
  globalThis.clearTimeout=id=>timers.delete(id);
  ui=createRoCostingUI({context:()=>ctx,api:path=>{requests.push(path);return new Promise(resolve=>pending.push({resolve}));},esc:v=>String(v??''),field:(name,label,value)=>{fields.push({name,value});return `<input name="${name}" value="${value}">`;},button:label=>label,head:()=>'',ph:()=>'',note:v=>v,badge:v=>v,render:()=>{html=ui.page();}});
  html=ui.page();await tick();await finish();assert.doesNotMatch(html,/Apply filters/);
  values.supplier='Supplier A';await ui.change(controls.supplier);await tick();
  assert.equal(new URL('http://local'+requests.at(-1)).searchParams.get('supplier'),'Supplier A');
  assert.match(html,/name="supplier"/); // controls remain while loading
  values.status='Complete';await ui.change(controls.status);
  await finish('STALE');assert.doesNotMatch(html,/>STALE</);
  assert.equal(new URL('http://local'+requests.at(-1)).searchParams.get('status'),'Complete');
  await finish();
  const initialRequests=requests.length;
  for(const value of ['1','12','123']){values.roNumber=value;ui.input(controls.roNumber);}
  assert.equal(requests.length,initialRequests);assert.equal(timers.size,1);
  const callback=[...timers.values()][0];timers.clear();callback();await tick();
  assert.equal(new URL('http://local'+requests.at(-1)).searchParams.get('roNumber'),'123');
  // A response arriving during further typing must not replace the draft value.
  values.roNumber='1234';ui.input(controls.roNumber);await finish();
  assert.equal(fields.findLast(f=>f.name==='roNumber').value,'1234');assert.ok(focusCount>0);
  await ui.action('ro-reset-filters',{});assert.equal(timers.size,0);await tick();await finish();
  assert.equal(new URL('http://local'+requests.at(-1)).searchParams.get('roNumber'),'');
  assert.equal(fields.findLast(f=>f.name==='roNumber').value,'');
  values.roNumber='999';ui.input(controls.roNumber);ctx.ui.view='orders';
  const leaveCallback=[...timers.values()][0];timers.clear();const before=requests.length;leaveCallback();await tick();assert.equal(requests.length,before);
 }finally{Object.assign(globalThis,originals);}
});
