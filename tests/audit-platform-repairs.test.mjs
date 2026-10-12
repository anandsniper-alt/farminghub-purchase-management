import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {Store} from '../server/store.mjs';
import {makeServer} from '../server/index.mjs';
import {ImplementsStore} from '../server/implements-store.mjs';
import {ProductionStore} from '../server/production-store.mjs';
import {BomManagementStore} from '../server/bom-management-store.mjs';
import {PlanningStore} from '../server/planning-store.mjs';
import {ReadCache} from '../server/read-cache.mjs';
import {createSeed} from '../shared/seed.mjs';

async function fixture(){
 const dir=mkdtempSync(join(tmpdir(),'fh-audit-platform-')),file=join(dir,'test.sqlite'),store=new Store(file,createSeed('2026-09-11'));
 for(const id of ['u-admin','u-view']){if(!store.read().users.some(u=>u.id===id))continue;store.addAccount(id,id+'@test.invalid','Test-password-12345');}
 const server=makeServer(store,{log:()=>{}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const request=async(path,{method='GET',cookie,csrf,key,body}={})=>{const r=await fetch(origin+path,{method,headers:{Origin:origin,...(cookie?{Cookie:cookie}:{}),...(csrf?{'X-CSRF-Token':csrf}:{}),...(key?{'Idempotency-Key':key}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,headers:r.headers,data:await r.json()};};
 const login=async(id='u-admin')=>{const r=await request('/api/login',{method:'POST',body:{email:id+'@test.invalid',password:'Test-password-12345'}});assert.equal(r.status,200);const cookie=r.headers.get('set-cookie').split(';')[0],boot=await request('/api/bootstrap',{cookie});return {cookie,csrf:boot.data.csrf,...boot.data};};
 return {dir,file,store,server,origin,request,login,close:async()=>{await new Promise(r=>server.close(r));store.close();rmSync(dir,{recursive:true,force:true});}};
}
test('commercial review seeds are not public static assets',async()=>{
 const f=await fixture();try{for(const p of ['/shared/clean-seed.mjs','/shared/final-master-data.mjs'])assert.equal((await fetch(f.origin+p)).status,404);const wrapper=await fetch(f.origin+'/review-seed.mjs');assert.equal(wrapper.status,200);assert.doesNotMatch(await wrapper.text(),/unitPrice|V01-SWAC|priceLists/);assert.equal((await f.request('/api/bootstrap')).status,401);}finally{await f.close();}
});
test('test classification prevents new evidence links even for product approvers',async()=>{
 const f=await fixture();try{const admin=await f.login(),orderId=admin.state.orders[0].id;const marked=await f.request('/api/commands',{method:'POST',...admin,key:'mark-sample-http-001',body:{type:'MARK_ORDER_TEST_DATA',payload:{orderId,reason:'Retain synthetic test history'},expectedRevision:admin.state.revision,editContext:admin.editContext}});assert.equal(marked.status,200);const before=f.store.read();const upload=await f.request('/api/files',{method:'POST',...admin,key:'test-evidence-http-001',body:{name:'extra.txt',base64:Buffer.from('Test evidence').toString('base64'),orderIds:[orderId],scope:'LAE_IMPORT',expectedRevision:before.revision,editContext:marked.data.editContext}});assert.equal(upload.status,403);assert.deepEqual(f.store.read(),before);}finally{await f.close();}
});
test('wrong-account recovery creates no session and keeps the original cookie usable',async()=>{
 const f=await fixture();try{const admin=await f.login(),other=f.store.read().users.find(u=>u.id!=='u-admin');f.store.addAccount(other.id,other.id+'@recovery.invalid','Test-password-12345');const count=()=>f.store.db.prepare('SELECT count(*) AS n FROM sessions').get().n,before=count();const r=await f.request('/api/login',{method:'POST',cookie:admin.cookie,body:{email:other.id+'@recovery.invalid',password:'Test-password-12345',expectedUserId:'u-admin'}});assert.equal(r.status,409);assert.equal(r.data.code,'WRONG_ACCOUNT');assert.equal(r.headers.get('set-cookie'),null);assert.equal(count(),before);assert.equal((await f.request('/api/users',admin)).status,200);}finally{await f.close();}
});
test('user creation retries recover the same committed user and reject changed credentials',async()=>{
 const f=await fixture();try{const admin=await f.login(),body={name:'New staff',role:'VIEWER',scopes:['LAE_IMPORT'],email:'staff@test.invalid',password:'New-staff-password-123',expectedRevision:admin.state.revision,editContext:admin.editContext},key='audit-create-user-001';const a=await f.request('/api/users',{method:'POST',...admin,key,body});assert.equal(a.status,201);const b=await f.request('/api/users',{method:'POST',...admin,key,body});assert.equal(b.status,201);assert.equal(a.data.user.id,b.data.user.id);assert.equal(f.store.read().users.filter(u=>u.id===a.data.user.id).length,1);const receipt=await f.request('/api/requests/'+key,admin);assert.equal(receipt.data.committed,true);assert.equal(receipt.data.result.user.id,a.data.user.id);assert.equal((await f.request('/api/users',{method:'POST',...admin,key,body:{...body,password:'Different-password-123'}})).status,409);assert.doesNotMatch(JSON.stringify(f.store.db.prepare('SELECT * FROM request_receipts').all()),/New-staff-password|password_hash/);}finally{await f.close();}
});
test('read cache is bounded, expires, and invalidates with its database generation',()=>{
 let now=0,calls=0;const c=new ReadCache({maxBytes:8,maxEntries:2,ttlMs:10,clock:()=>now}),build=()=>{calls++;return '1234';};assert.equal(c.get('a','1',build),'1234');c.get('a','1',build);assert.equal(calls,1);c.get('b','1',build);c.get('c','1',build);assert.equal(c.entries.has('a'),false);assert.ok(c.bytes<=8);now=11;c.get('c','1',build);assert.equal(calls,4);c.get('c','2',build);assert.equal(calls,5);c.get('large','2',()=> '123456789');assert.ok(c.bytes<=8);assert.equal(c.entries.has('large'),false);
});
test('cached bootstrap refreshes after local and external writes and never reuses another session CSRF',async()=>{
 const f=await fixture();try{const a=await f.login(),b=await f.login();assert.notEqual(a.csrf,b.csrf);assert.equal((await f.request('/api/bootstrap',a)).data.csrf,a.csrf);const previous=f.store.read(),next=structuredClone(previous);next.users.find(u=>u.id==='u-admin').name='Updated locally';next.revision++;f.store.commit(next,previous.revision,previous);assert.equal((await f.request('/api/bootstrap',a)).data.user.name,'Updated locally');const external=new DatabaseSync(f.file);try{const state=f.store.read();state.users.find(u=>u.id==='u-admin').name='Updated externally';state.revision++;external.prepare('UPDATE workspace SET revision=?,payload=? WHERE id=1').run(state.revision,JSON.stringify(state));}finally{external.close();}const fresh=await f.request('/api/bootstrap',a);assert.equal(fresh.data.user.name,'Updated externally');assert.equal(fresh.data.state.users.find(u=>u.id==='u-admin').name,'Updated externally');}finally{await f.close();}
});
test('cached bootstrap replaces an evicted edit context before returning it',async()=>{
 const f=await fixture();try{const a=await f.login();f.store.editVersions.remove(a.editContext);const boot=await f.request('/api/bootstrap',a);assert.equal(boot.status,200);assert.notEqual(boot.data.editContext,a.editContext);assert.doesNotThrow(()=>f.store.editVersions.read(boot.data.editContext,a.user.id,boot.data.state.revision));}finally{await f.close();}
});

test('cached HTTP views honor immediate role, scope and account revocation',async()=>{
 const f=await fixture();try{
  const admin=await f.login();assert.equal((await f.request('/api/users',admin)).status,200);assert.equal((await f.request('/api/bootstrap',admin)).data.user.role,'ADMIN');
  let previous=f.store.read(),next=structuredClone(previous),user=next.users.find(u=>u.id==='u-admin');user.role='MANAGER';user.scopes=['PRODUCTION_MANAGEMENT'];next.revision++;f.store.commit(next,previous.revision,previous);
  assert.equal((await f.request('/api/users',admin)).status,403);assert.equal((await f.request('/api/bootstrap',admin)).data.user.role,'MANAGER');assert.equal((await f.request('/api/production/workspace',admin)).status,200);
  const external=new DatabaseSync(f.file);try{previous=f.store.read();next=structuredClone(previous);user=next.users.find(u=>u.id==='u-admin');user.scopes=['LAE_IMPORT'];next.revision++;external.prepare('UPDATE workspace SET revision=?,payload=? WHERE id=1').run(next.revision,JSON.stringify(next));}finally{external.close();}
  assert.equal((await f.request('/api/production/workspace',admin)).status,403);assert.deepEqual((await f.request('/api/bootstrap',admin)).data.user.scopes,['LAE_IMPORT']);
  f.store.db.prepare('UPDATE accounts SET active=0 WHERE id=?').run('u-admin');assert.equal((await f.request('/api/bootstrap',admin)).status,401);assert.equal((await f.request('/api/users',admin)).status,401);
 }finally{await f.close();}
});

test('module actor checks use current profile without reading the commercial workspace',async()=>{
 const f=await fixture();const originalRead=f.store.read;try{
  const source=new ImplementsStore(f.store),production=new ProductionStore(f.store,source),bom=new BomManagementStore(f.store,source),planning=new PlanningStore(f.store,source);
  f.store.read=()=>{throw Error('Whole workspace read during actor lookup.');};
  for(const module of [production,bom,planning])assert.equal(module.actor('u-admin').id,'u-admin');
  const detached=f.store.userProfile('u-admin');detached.role='VIEWER';assert.equal(f.store.userProfile('u-admin').role,'ADMIN');
  f.store.read=originalRead;const previous=f.store.read(),next=structuredClone(previous),user=next.users.find(u=>u.id==='u-admin');user.role='VIEWER';user.scopes=[];next.revision++;f.store.commit(next,previous.revision,previous);
  f.store.read=()=>{throw Error('Whole workspace read during actor lookup.');};
  for(const module of [production,bom,planning])assert.throws(()=>module.actor('u-admin'),/access is required/);
 }finally{f.store.read=originalRead;await f.close();}
});
