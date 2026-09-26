import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {createSeed} from '../shared/seed.mjs';
import {orderTotal} from '../shared/domain.mjs';
import {integrationSnapshot} from '../shared/references.mjs';
import {Store} from '../server/store.mjs';
import {makeServer,scopedState} from '../server/index.mjs';

const out=resolve('test-output','erp-capacity-'+Date.now());mkdirSync(out,{recursive:true});
const report={environment:'Local synthetic fixtures; not a live capacity certification',annualInr:3000000000,volumes:[],concurrency:null,contextConcurrency:null,backup:null};
const timed=fn=>{const start=performance.now(),value=fn();return {ms:Math.round(performance.now()-start),value};};
let finalStore;
try{
 for(const count of [100,1000,10000]){
  const seed=createSeed('2026-09-11'),template=structuredClone(seed.orders[0]),line=structuredClone(template.lines[0]);
  // Fresh draft identities must be allocated by the current reference registry.
  seed.orders=Array.from({length:count},(_,i)=>({...structuredClone(template),id:'capacity-order-'+i,number:'',numberSource:'SOFTWARE_REFERENCE',serialNumber:i+1,status:'DRAFT',currency:'INR',priceListCurrency:'INR',priceConversion:null,lines:[{...structuredClone(line),id:'capacity-line',quantity:1,unitPriceMinor:300000000000/count}],revisions:[],documents:[],shipments:[],tasks:[],pi:null,piHistory:[],paymentAuthorizations:[]}));
  seed.payments=[];seed.costs=[];seed.complaints=[];seed.files=[];seed.events=[];seed.nextOrderSerial=count+1;delete seed.recordReferences;
  assert.equal(seed.orders.reduce((n,o)=>n+orderTotal(o),0),300000000000);
  const created=timed(()=>new Store(join(out,'volume-'+count+'.sqlite'),seed)),store=created.value,read=timed(()=>store.read()),actor=read.value.users.find(u=>u.role==='ADMIN');
  const projection=timed(()=>JSON.stringify(scopedState(read.value,actor))),snapshot=timed(()=>JSON.stringify(integrationSnapshot(read.value)));
  const write=timed(()=>store.transact({type:'SAVE_PERSONAL_PREFERENCES',payload:{showPageGuides:true}},actor.id,read.value.revision,randomUUID()));
  const item={orders:count,linesPerOrder:1,annualMinor:300000000000,initializationMs:created.ms,readMs:read.ms,bootstrapProjectionMs:projection.ms,bootstrapBytes:Buffer.byteLength(projection.value),exportMs:snapshot.ms,exportBytes:Buffer.byteLength(snapshot.value),singleWriteMs:write.ms,referenceCount:Object.keys(write.value.state.recordReferences.entries).length};report.volumes.push(item);console.log(JSON.stringify(item));
  if(count===10000)finalStore=store;else store.close();
 }
 const state=finalStore.read(),actor=state.users.find(u=>u.role==='ADMIN'),password=randomUUID()+'Aa1!';finalStore.addAccount(actor.id,'capacity@example.test',password);
 const server=makeServer(finalStore);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const base='http://127.0.0.1:'+server.address().port,login=await fetch(base+'/api/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({email:'capacity@example.test',password})}),loginData=await login.json(),cookie=login.headers.get('set-cookie').split(';')[0];
  const csrf=finalStore.session(cookie.slice('fh_session='.length)).csrf;const started=performance.now(),results=await Promise.all(Array.from({length:20},async()=>{const at=performance.now(),r=await fetch(base+'/api/commands',{method:'POST',headers:{Origin:base,Cookie:cookie,'Content-Type':'application/json','X-CSRF-Token':csrf,'Idempotency-Key':randomUUID()},body:JSON.stringify({type:'SAVE_PERSONAL_PREFERENCES',payload:{showPageGuides:false},expectedRevision:state.revision})});await r.arrayBuffer();return {status:r.status,ms:Math.round(performance.now()-at)};}));
  report.concurrency={mode:'Legacy client, no edit context; same-record conflict control, not current independent-edit throughput',requests:20,sameStartingRevision:true,totalMs:Math.round(performance.now()-started),results};assert.equal(results.filter(r=>r.status===200).length,1);assert.equal(results.filter(r=>r.status===409).length,19);assert.equal(finalStore.read().revision,state.revision+1);
  const latest=finalStore.read(),context=finalStore.editContext(latest,actor.id),contextStarted=performance.now();
  // Observe every request before closing the server; an early transport failure
  // must not cancel other requests or turn their outcomes into assumed failures.
  const independent=await Promise.all(Array.from({length:20},async(_,i)=>{const at=performance.now();try{const r=await fetch(base+'/api/commands',{method:'POST',headers:{Origin:base,Cookie:cookie,'Content-Type':'application/json','X-CSRF-Token':csrf,'Idempotency-Key':randomUUID()},body:JSON.stringify({type:'ADD_FOLLOWUP',payload:{orderId:latest.orders[i].id,title:'Synthetic capacity follow-up '+i,due:'2099-01-01'},expectedRevision:latest.revision,editContext:context})});await r.arrayBuffer();return {status:r.status,ms:Math.round(performance.now()-at)};}catch(e){return {status:null,error:e.cause?.code||e.message,ms:Math.round(performance.now()-at)};}}));
  report.contextConcurrency={mode:'Current edit context; 20 distinct orders, one synthetic actor, same original view',requests:20,totalMs:Math.round(performance.now()-contextStarted),editContextBytes:Buffer.byteLength(context),results:independent};
  const saved=finalStore.read(),committed=saved.orders.slice(0,20).filter((o,i)=>o.tasks.some(t=>t.title==='Synthetic capacity follow-up '+i)).length;
  report.contextConcurrency.committed=committed;assert.equal(saved.revision,latest.revision+committed);assert.ok(saved.orders.slice(0,20).every((o,i)=>o.tasks.filter(t=>t.title==='Synthetic capacity follow-up '+i).length<=1));
  console.log(JSON.stringify(report.contextConcurrency));
 }finally{await new Promise(r=>server.close(r));}
 const backupPath=join(out,'restored-copy.sqlite'),backup=timed(()=>finalStore.db.prepare('VACUUM INTO ?').run(backupPath)),restored=new Store(backupPath);
 try{assert.equal(restored.db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');assert.deepEqual(restored.read().recordReferences,finalStore.read().recordReferences);assert.equal(restored.read().orders.length,10000);report.backup={ms:backup.ms,orders:10000,registryPreserved:true,integrity:'ok'};}finally{restored.close();}
 assert.ok(report.contextConcurrency.results.every(r=>r.status===200)&&report.contextConcurrency.committed===20,'Current-context load did not acknowledge and persist all 20 requests; inspect recorded outcomes.');
 report.status='PASS with capacity limitations';
}catch(e){report.status='FAIL';report.error=e.stack;throw e;}finally{finalStore?.close();writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2));console.log('Report '+join(out,'report.json'));}
