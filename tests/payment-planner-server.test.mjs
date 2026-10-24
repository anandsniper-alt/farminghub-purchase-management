import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Store} from '../server/store.mjs';
import {makeServer} from '../server/index.mjs';
import {createSeed} from '../shared/seed.mjs';

test('authenticated planner is scoped, bounded, persistent, audited and retry/concurrency safe',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'fh-payment-planner-')),file=join(dir,'test.sqlite'),seed=createSeed('2026-10-15');
 seed.users.push({id:'utility-only',name:'Utility only',role:'VIEWER',scopes:['UTILITY_DOMESTIC'],active:true});
 const store=new Store(file,seed),server=makeServer(store);
 for(const id of ['u-manager','u-viewer','utility-only'])store.addAccount(id,id+'@example.test','Private-test-password-123');
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const req=async(path,{method='GET',token,csrf,payload,requestId}={})=>{const response=await fetch(origin+path,{method,headers:{'Content-Type':'application/json',Origin:origin,...(token?{Cookie:'fh_session='+token}:{}),...(csrf?{'X-CSRF-Token':csrf}:{}),...(requestId?{'Idempotency-Key':requestId}:{})},...(payload?{body:JSON.stringify(payload)}:{})});return {status:response.status,headers:response.headers,data:await response.json()};};
 const login=async id=>{const r=await req('/api/login',{method:'POST',payload:{email:id+'@example.test',password:'Private-test-password-123'}});const token=r.headers.get('set-cookie').match(/fh_session=([^;]+)/)[1],b=await req('/api/bootstrap',{token});return {token,csrf:b.data.csrf,revision:b.data.state.revision,editContext:b.data.editContext};};
 try{
  assert.equal((await req('/api/payment-planner')).status,401);
  const manager=await login('u-manager'),viewer=await login('u-viewer'),utility=await login('utility-only');
  const plannerAssets=['/payment-planner.mjs','/payment-planner-export-data.mjs','/payment-planner-xlsx.mjs','/payment-planner-pdf.mjs','/shared/payment-plan-selection.mjs','/shared/payment-planner.mjs','/shared/payment-planner-report.mjs'];
  for(const path of plannerAssets){
   const asset=await fetch(origin+path,{headers:{Cookie:'fh_session='+manager.token}});
   assert.equal(asset.status,200,path);assert.match(asset.headers.get('content-type'),/javascript/);
   const source=path.startsWith('/shared/')?'..'+path:'../web'+path;
   assert.equal(await asset.text(),readFileSync(new URL(source,import.meta.url),'utf8'),path+' serves exact source');
  }
  const report=await req('/api/payment-planner?year=2026&pageSize=2',manager);assert.equal(report.status,200);assert.ok(report.data.rows.length<=2);assert.equal(report.data.months.length,12);
  assert.equal(report.data.matrix.weeks.length,48);assert.equal(report.data.matrix.months.length,12);assert.ok(report.data.matrix.suppliers.length<=20);
  assert.equal((await req('/api/payment-planner?supplierPage=0',manager)).status,400);
  assert.equal((await req('/api/payment-planner',utility)).status,403);
  assert.equal((await req('/api/payment-planner?pageSize=1000',manager)).status,400);
  const before=store.read(),command={type:'SAVE_PAYMENT_PLAN_RATE',payload:{month:'2026-10',rate:'96.125',remarks:'Monthly cash forecast reviewed'},expectedRevision:before.revision,editContext:manager.editContext},requestId=randomUUID();
  assert.equal((await req('/api/commands',{method:'POST',...viewer,payload:{...command,editContext:viewer.editContext}})).status,403);
  assert.equal((await req('/api/commands',{method:'POST',token:manager.token,payload:command})).status,403);
  assert.deepEqual(store.read(),before);
  assert.equal((await req('/api/commands',{method:'POST',...manager,payload:command,requestId})).status,200);
  const saved=store.read();assert.equal(saved.settings.paymentPlanner.rates['2026-10'].rate,96125000);
  for(const key of ['orders','payments','costs','files','vendors','recordReferences'])assert.deepEqual(saved[key],before[key],key+' preserved');
  assert.equal(saved.events.length,before.events.length+1);
  assert.equal((await req('/api/commands',{method:'POST',...manager,payload:command,requestId})).status,200);
  assert.deepEqual(store.read(),saved,'Durable retry does not duplicate audit or revision');
  const stale={...command,payload:{...command.payload,rate:'97'}};
  assert.equal((await req('/api/commands',{method:'POST',...manager,payload:stale,requestId:randomUUID()})).status,409);
  assert.equal((await req('/api/commands',{method:'POST',...manager,payload:stale,requestId})).status,409);
  const filtered=(await req('/api/bootstrap',utility)).data;assert.equal(filtered.state.settings.paymentPlanner,undefined);
  assert.equal((await req('/api/payment-planner',viewer)).data.canEdit,false);
  const again=new Store(file);try{assert.deepEqual(again.read().settings.paymentPlanner,saved.settings.paymentPlanner);}finally{again.close();}
 }finally{await new Promise(r=>server.close(r));store.close();rmSync(dir,{recursive:true,force:true});}
});
