import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../server/store.mjs';
import {makeServer,scopedState} from '../server/index.mjs';
import {createSeed} from '../shared/seed.mjs';
import {MAX_UPLOAD_BYTES,APPROVAL_STAGES} from '../shared/domain.mjs';

test('legacy serial initialization persists once without renumbering PO references or snapshots',()=>{
 const dir=mkdtempSync(join(tmpdir(),'fh-serial-')),file=join(dir,'test.sqlite'),seed=createSeed('2026-09-11');delete seed.nextOrderSerial;for(const o of seed.orders)delete o.serialNumber;const original=structuredClone(seed);let store=new Store(file,seed);
 try{const first=store.read(),serials=first.orders.map(o=>o.serialNumber);assert.equal(new Set(serials).size,seed.orders.length);assert.deepEqual(first.orders.map(o=>o.number),original.orders.map(o=>o.number));assert.deepEqual(first.orders.map(o=>o.revisions),original.orders.map(o=>o.revisions));assert.deepEqual(first.events.slice(0,original.events.length),original.events);assert.equal(first.events.at(-1).action,'ORDER_SERIALS_INITIALIZED');const backups=readdirSync(dir).filter(n=>n.includes('.before-order-serials-'));assert.equal(backups.length,1);const backup=new DatabaseSync(join(dir,backups[0]),{readOnly:true});try{assert.deepEqual(JSON.parse(backup.prepare('SELECT payload FROM workspace WHERE id=1').get().payload),original);}finally{backup.close();}store.close();store=new Store(file);assert.deepEqual(store.read(),first);assert.equal(readdirSync(dir).filter(n=>n.includes('.before-order-serials-')).length,1);}
 finally{store.close();rmSync(dir,{recursive:true,force:true});}
});

test('deleted POs retain accounting visibility but reject uploads and stale bulk writes',async()=>{
 const f=await serverFixture();try{const admin=await f.login('u-admin'),ids=admin.state.orders.slice(0,2).map(o=>o.id),payload={type:'DELETE_ORDERS',payload:{orderIds:ids,remarks:'Isolated admin test'},expectedRevision:admin.state.revision};
  const deleted=await f.req('/api/commands',{method:'POST',...admin,payload});assert.equal(deleted.status,200);assert.deepEqual(deleted.data.state.payments,admin.state.payments);assert.equal(deleted.data.state.orders.length,admin.state.orders.length);
  const upload=await f.req('/api/files',{method:'POST',...admin,payload:{name:'blocked.txt',base64:Buffer.from('test').toString('base64'),orderIds:[ids[0]],expectedRevision:deleted.data.state.revision}});assert.equal(upload.status,403);
  const restore={type:'RESTORE_ORDERS',payload:{orderIds:ids,remarks:'Restore original records'},expectedRevision:admin.state.revision};assert.equal((await f.req('/api/commands',{method:'POST',...admin,payload:restore})).status,409);
  restore.expectedRevision=deleted.data.state.revision;assert.equal((await f.req('/api/commands',{method:'POST',...admin,payload:restore})).status,200);assert.ok(f.store.read().orders.filter(o=>ids.includes(o.id)).every(o=>!o.deletedAt));
 }finally{await f.close();}
});

test('admin role changes immediately update existing sessions and retain identity and audit',async()=>{
 const f=await serverFixture();try{
  const a=await f.login('u-admin'),executive=await f.login('u-exec'),before=f.store.read(),hash=f.store.db.prepare('SELECT password_hash FROM accounts WHERE id=?').get('u-exec').password_hash;
  const change=(role,revision=f.store.read().revision)=>f.req('/api/commands',{method:'POST',...a,payload:{type:'CHANGE_USER_ROLE',payload:{userId:'u-exec',role,remarks:'Staffing change'},expectedRevision:revision}});
  const promoted=await change('MANAGER');assert.equal(promoted.status,200);assert.equal((await f.req('/api/bootstrap',executive)).data.user.role,'MANAGER');
  const managerAction=await f.req('/api/commands',{method:'POST',...executive,payload:{type:'ADD_CATEGORY',payload:{name:'ROLE-CHANGE-TEST'},expectedRevision:f.store.read().revision}});assert.equal(managerAction.status,200);
  const stale=await change('VIEWER',before.revision);assert.equal(stale.status,409);assert.equal(f.store.read().users.find(u=>u.id==='u-exec').role,'MANAGER');
  assert.equal((await change('VIEWER')).status,200);assert.equal((await f.req('/api/bootstrap',executive)).data.user.role,'VIEWER');
  const denied=await f.req('/api/commands',{method:'POST',...executive,payload:{type:'ADD_CATEGORY',payload:{name:'FORGED',user:{role:'ADMIN'}},expectedRevision:f.store.read().revision}});assert.equal(denied.status,403);
  const target=f.store.read().users.find(u=>u.id==='u-exec');assert.deepEqual(target.scopes,before.users.find(u=>u.id==='u-exec').scopes);assert.equal(target.name,executive.user.name);assert.equal(f.store.db.prepare('SELECT password_hash FROM accounts WHERE id=?').get('u-exec').password_hash,hash);
  const events=f.store.read().events.filter(e=>e.action==='USER_ROLE_CHANGED');assert.equal(events.length,2);assert.ok(events.every(e=>e.actorId==='u-admin'));assert.deepEqual(events.map(e=>[e.oldValue.role,e.newValue.role]),[['EXECUTIVE','MANAGER'],['MANAGER','VIEWER']]);
 }finally{await f.close();}
});

test('role editing rejects self-demotion, invalid roles, unauthorized callers and missing reasons',async()=>{
 const f=await serverFixture();try{
  const a=await f.login('u-admin'),before=f.store.read();
  for(const payload of [{userId:'u-admin',role:'MANAGER',remarks:'Self'},{userId:'u-exec',role:'OWNER',remarks:'Bad'},{userId:'u-exec',role:'MANAGER',remarks:''},{userId:'u-exec',role:'EXECUTIVE',remarks:'No change'}]){const out=await f.req('/api/commands',{method:'POST',...a,payload:{type:'CHANGE_USER_ROLE',payload,expectedRevision:before.revision}});assert.equal(out.status,400);assert.deepEqual(f.store.read(),before);}
  const payload={type:'CHANGE_USER_ROLE',payload:{userId:'u-exec',role:'ADMIN',remarks:'Attempted elevation'},expectedRevision:before.revision};
  for(const id of ['u-manager','u-exec','u-product','u-viewer']){const actor=await f.login(id);assert.equal((await f.req('/api/commands',{method:'POST',...actor,payload})).status,403);}
  assert.equal((await f.req('/api/commands',{method:'POST',token:a.token,payload})).status,403);assert.deepEqual(f.store.read(),before);
 }finally{await f.close();}
});

test('server denies executive approval throughout September after delegation removal',async t=>{
 t.mock.timers.enable({apis:['Date'],now:new Date('2026-09-12T10:00:00Z')});const f=await serverFixture();try{const a=await f.login('u-exec'),o=a.state.orders.find(o=>o.status==='PENDING_APPROVAL');const out=await f.req('/api/commands',{method:'POST',...a,payload:{type:'APPROVE_ORDER',payload:{orderId:o.id,user:{role:'ADMIN'},now:'2026-09-12T10:00:00Z'},expectedRevision:a.state.revision}});assert.equal(out.status,403);assert.equal(f.store.read().revision,a.state.revision);}finally{await f.close();}
});

test('upload accepts exactly 50 MB, persists bytes and rejects larger files without mutation',async()=>{
 const f=await serverFixture();try{
  const a=await f.login(),oid=a.state.orders[0].id,bytes=Buffer.alloc(MAX_UPLOAD_BYTES,65);
  const r=await f.req('/api/files',{method:'POST',...a,payload:{name:'limit.txt',base64:bytes.toString('base64'),orderIds:[oid],expectedRevision:a.state.revision}});
  assert.equal(r.status,201);assert.equal(f.store.fileBytes(r.data.id).byteLength,MAX_UPLOAD_BYTES);assert.deepEqual(Buffer.from(f.store.fileBytes(r.data.id)),bytes);
  const before=structuredClone(f.store.read());const tooLarge=await f.req('/api/files',{method:'POST',...a,payload:{name:'too-large.txt',base64:Buffer.alloc(MAX_UPLOAD_BYTES+1).toString('base64'),orderIds:[oid],expectedRevision:before.revision}});
  assert.equal(tooLarge.status,400);assert.match(tooLarge.data.error,/50 MB/);assert.deepEqual(f.store.read(),before);
 }finally{await f.close();}
});

test('admin portal creates a sign-in account atomically without exposing credentials',async()=>{
 const f=await serverFixture();try{
  const admin=await f.login('u-admin'),password='Portal-test-password-1234';
  const created=await f.req('/api/users',{method:'POST',...admin,payload:{name:'  New colleague  ',email:'  New.Colleague@Example.Test  ',password,role:'EXECUTIVE',scopes:['LAE_IMPORT','LAE_IMPORT'],expectedRevision:admin.state.revision,id:'client-picked-id',active:false,password_hash:'injected'}});
  assert.equal(created.status,201);assert.notEqual(created.data.user.id,'client-picked-id');assert.equal(created.data.user.name,'New colleague');assert.equal(created.data.user.active,true);assert.deepEqual(created.data.user.scopes,['LAE_IMPORT']);assert.equal(created.data.state.revision,admin.state.revision+1);
  const account=created.data.users.find(u=>u.id===created.data.user.id);assert.equal(account.email,'new.colleague@example.test');assert.equal(account.hasAccount,true);
  const event=created.data.state.events.at(-1);assert.equal(event.actorId,admin.user.id);assert.equal(event.source,'User access portal');assert.equal(event.action,'USER_PROFILE_CREATED');
  const list=await f.req('/api/users',admin);assert.equal(list.status,200);assert.ok(list.data.users.some(u=>u.id===account.id));
  for(const value of [created.data,list.data,f.store.read()]){const output=JSON.stringify(value);assert.ok(!output.includes(password));assert.ok(!output.includes('password_hash'));assert.ok(!output.includes('client-picked-id'));}
  const signedIn=await f.req('/api/login',{method:'POST',payload:{email:account.email,password}});assert.equal(signedIn.status,200);assert.equal(signedIn.data.user.role,'EXECUTIVE');
  const token=signedIn.headers.get('set-cookie').match(/fh_session=([^;]+)/)[1];const own=await f.req('/api/bootstrap',{token});assert.equal(own.status,200);assert.equal(own.data.user.id,account.id);
 }finally{await f.close();}
});

test('user administration rejects unauthenticated, non-admin, CSRF and cross-origin requests',async()=>{
 const f=await serverFixture();try{
  assert.equal((await f.req('/api/users')).status,401);
  const payload={name:'Blocked',email:'blocked@example.test',password:'Portal-test-password-1234',role:'ADMIN',scopes:['LAE_IMPORT'],expectedRevision:f.store.read().revision};
  assert.equal((await f.req('/api/users',{method:'POST',payload})).status,401);
  for(const id of ['u-manager','u-exec','u-product','u-viewer','u-utility']){const a=await f.login(id);assert.equal((await f.req('/api/users',a)).status,403);assert.equal((await f.req('/api/users',{method:'POST',...a,payload})).status,403);}
  const a=await f.login('u-admin');assert.equal((await f.req('/api/users',{method:'POST',token:a.token,payload})).status,403);assert.equal((await f.req('/api/users',{method:'POST',...a,originHeader:'https://untrusted.example',payload})).status,403);
  assert.ok(!f.store.read().users.some(u=>u.name==='Blocked'));
 }finally{await f.close();}
});

test('user creation validates fields and preserves state on duplicate or stale requests',async()=>{
 const f=await serverFixture();try{
  const a=await f.login('u-admin'),before=structuredClone(f.store.read());const payload={name:'Colleague',email:'colleague@example.test',password:'Portal-test-password-1234',role:'VIEWER',scopes:['LAE_IMPORT'],expectedRevision:before.revision};
  for(const change of [{name:' '},{name:'x'.repeat(121)},{email:'invalid'},{email:'a'.repeat(255)+'@example.test'},{password:'short'},{password:'x'.repeat(257)},{role:'OWNER'},{scopes:[]},{scopes:['UNKNOWN']},{expectedRevision:null}]){const r=await f.req('/api/users',{method:'POST',...a,payload:{...payload,...change}});assert.equal(r.status,400,JSON.stringify(Object.keys(change)));assert.deepEqual(f.store.read(),before);}
  const duplicate=await f.req('/api/users',{method:'POST',...a,payload:{...payload,email:' U-ADMIN@EXAMPLE.TEST '}});assert.equal(duplicate.status,409);assert.deepEqual(f.store.read(),before);
  const first=await f.req('/api/users',{method:'POST',...a,payload});assert.equal(first.status,201);const after=structuredClone(f.store.read());
  const stale=await f.req('/api/users',{method:'POST',...a,payload:{...payload,email:'second@example.test'}});assert.equal(stale.status,409);assert.deepEqual(f.store.read(),after);assert.equal(f.store.login('second@example.test',payload.password),null);
 }finally{await f.close();}
});

async function serverFixture(){const dir=mkdtempSync(join(tmpdir(),'fh-test-')),s=createSeed('2026-09-11');s.users.push({id:'u-utility',name:'Utility-only test viewer',role:'VIEWER',scopes:['UTILITY_DOMESTIC'],active:true});const store=new Store(join(dir,'test.sqlite'),s);for(const id of['u-admin','u-manager','u-exec','u-product','u-viewer','u-utility'])store.addAccount(id,id+'@example.test','Test-only-password-0123');const server=makeServer(store);await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;async function req(path,{method='GET',payload,token,csrf,originHeader=origin}={}){const res=await fetch(origin+path,{method,headers:{'Content-Type':'application/json',...(method!=='GET'?{Origin:originHeader}:{}),...(token?{Cookie:'fh_session='+token}:{}),...(csrf?{'X-CSRF-Token':csrf}:{})},...(payload!==undefined?{body:JSON.stringify(payload)}:{})});const text=await res.text();let data;try{data=JSON.parse(text);}catch{data=text;}return {status:res.status,data,headers:res.headers};}async function login(id='u-manager'){const r=await req('/api/login',{method:'POST',payload:{email:id+'@example.test',password:'Test-only-password-0123'}});const token=r.headers.get('set-cookie').match(/fh_session=([^;]+)/)[1],b=await req('/api/bootstrap',{token});return {token,csrf:b.data.csrf,state:b.data.state,user:b.data.user,cookie:r.headers.get('set-cookie')};}return{store,req,login,origin,close:async()=>{await new Promise(r=>server.close(r));store.close();rmSync(dir,{recursive:true,force:true});}};}

test('unauthenticated state and evidence access return 401',async()=>{const f=await serverFixture();try{assert.equal((await f.req('/api/bootstrap')).status,401);assert.equal((await f.req('/api/files/anything')).status,401);}finally{await f.close();}});
test('successful local authentication uses HttpOnly SameSite cookie; invalid login is generic',async()=>{const f=await serverFixture();try{const a=await f.login();assert.match(a.cookie,/HttpOnly/);assert.match(a.cookie,/SameSite=Strict/);assert.equal(a.state.orders.length,8);const bad=await f.req('/api/login',{method:'POST',payload:{email:'missing@example.test',password:'not-a-real-password'}});assert.equal(bad.status,401);assert.equal(bad.data.error,'Invalid credentials or inactive account.');}finally{await f.close();}});
test('role is taken from the authenticated server account, not from client payload',async()=>{const f=await serverFixture();try{const a=await f.login('u-viewer'),o=a.state.orders.find(o=>o.status==='PENDING_APPROVAL');const r=await f.req('/api/commands',{method:'POST',...a,payload:{type:'APPROVE_ORDER',payload:{orderId:o.id,user:{role:'ADMIN'}},expectedRevision:a.state.revision}});assert.equal(r.status,403);assert.equal(f.store.read().orders.find(x=>x.id===o.id).status,'PENDING_APPROVAL');}finally{await f.close();}});
test('state records are scoped to allowed divisions, including evidence and vendors',async()=>{const f=await serverFixture();try{const a=await f.login('u-utility');assert.equal(a.state.orders.length,0);assert.equal(a.state.items.length,0);assert.equal(a.state.vendors.length,0);assert.equal(a.state.files.length,0);assert.equal(a.state.payments.length,0);}finally{await f.close();}});
test('CSRF and cross-origin writes are rejected',async()=>{const f=await serverFixture();try{const a=await f.login(),o=a.state.orders[0],payload={type:'ADD_NOTE',payload:{orderId:o.id,remarks:'Must not save'},expectedRevision:a.state.revision};assert.equal((await f.req('/api/commands',{method:'POST',token:a.token,payload})).status,403);assert.equal((await f.req('/api/commands',{method:'POST',...a,originHeader:'https://untrusted.invalid',payload})).status,403);}finally{await f.close();}});
test('optimistic revision check prevents lost updates from stale browser state',async()=>{const f=await serverFixture();try{const a=await f.login(),o=a.state.orders[0],payload={type:'ADD_NOTE',payload:{orderId:o.id,remarks:'First update'},expectedRevision:a.state.revision};const r=await f.req('/api/commands',{method:'POST',...a,payload});assert.equal(r.status,200);assert.equal((await f.req('/api/commands',{method:'POST',...a,payload})).status,409);assert.equal(f.store.read().events.filter(e=>e.summary==='First update').length,1);}finally{await f.close();}});
test('SQLite audit events cannot be updated or deleted',async()=>{const f=await serverFixture();try{assert.throws(()=>f.store.db.exec("UPDATE audit_events SET payload='{}'"),/append-only/);assert.throws(()=>f.store.db.exec('DELETE FROM audit_events'),/append-only/);}finally{await f.close();}});
test('uploaded document bytes persist with order scope and safe download headers',async()=>{const f=await serverFixture();try{const a=await f.login(),o=a.state.orders[0],text='Actual test upload body';const r=await f.req('/api/files',{method:'POST',...a,payload:{name:'receipt.txt',base64:Buffer.from(text).toString('base64'),orderIds:[o.id],expectedRevision:a.state.revision}});assert.equal(r.status,201);const out=await f.req('/api/files/'+r.data.id,{token:a.token});assert.equal(out.status,200);assert.equal(out.data,text);assert.match(out.headers.get('content-disposition'),/attachment/);const other=await f.login('u-utility');assert.equal((await f.req('/api/files/'+r.data.id,{token:other.token})).status,404);}finally{await f.close();}});
test('executable/HTML evidence and path traversal are rejected',async()=>{const f=await serverFixture();try{const a=await f.login();assert.equal((await f.req('/api/files',{method:'POST',...a,payload:{name:'file.html',base64:Buffer.from('<script>1</script>').toString('base64'),orderIds:[],expectedRevision:a.state.revision}})).status,400);assert.equal((await f.req('/server/store.mjs')).status,404);assert.equal((await f.req('/data/purchase-pilot.sqlite')).status,404);}finally{await f.close();}});
test('upload permission cannot be gained merely by owning a login',async()=>{const f=await serverFixture();try{const a=await f.login('u-viewer');assert.equal((await f.req('/api/files',{method:'POST',...a,payload:{name:'test.txt',base64:'dGVzdA==',orderIds:[],expectedRevision:a.state.revision}})).status,403);}finally{await f.close();}});
test('logging out invalidates the server session',async()=>{const f=await serverFixture();try{const a=await f.login();assert.equal((await f.req('/api/logout',{method:'POST',...a,payload:{}})).status,200);assert.equal((await f.req('/api/bootstrap',{token:a.token})).status,401);}finally{await f.close();}});
test('business data persists when the local store is reopened',async()=>{const dir=mkdtempSync(join(tmpdir(),'fh-persist-'));try{const path=join(dir,'p.sqlite'),s=new Store(path,createSeed('2026-09-11')),state=s.read(),id=state.orders[0].id;s.transact({type:'ADD_NOTE',payload:{orderId:id,remarks:'Persisted test note'}},'u-manager',state.revision);s.close();const next=new Store(path);assert.ok(next.read().events.some(e=>e.summary==='Persisted test note'));next.close();}finally{rmSync(dir,{recursive:true,force:true});}});

test('local account utility commits profile and hashed credential together',async()=>{const f=await serverFixture();try{const profile={id:'new-pilot-user',name:'New pilot user',role:'EXECUTIVE',scopes:['LAE_IMPORT']};f.store.createLocalAccount(profile,'new-user@example.test','Test-only-new-password-1234');assert.ok(f.store.login('new-user@example.test','Test-only-new-password-1234'));assert.equal(f.store.read().users.filter(u=>u.id===profile.id).length,1);assert.ok(f.store.read().events.some(e=>e.action==='USER_PROFILE_CREATED'&&e.entityId===profile.id));assert.ok(!JSON.stringify(f.store.read()).includes('Test-only-new-password'));}finally{await f.close();}});
test('duplicate account creation rolls back the new profile and audit entries',async()=>{const f=await serverFixture();try{const before=structuredClone(f.store.read());assert.throws(()=>f.store.createLocalAccount({id:'must-not-exist',name:'Duplicate account test',role:'VIEWER',scopes:['LAE_IMPORT']},'u-manager@example.test','Test-only-new-password-1234'),/already exists/);assert.deepEqual(f.store.read(),before);assert.throws(()=>f.store.createLocalAccount({id:'bad-scope',name:'Bad scope',role:'EXECUTIVE',scopes:['UNKNOWN']},'invalid@example.test','Test-only-new-password-1234'),/scopes/);}finally{await f.close();}});

test('approval controls affect existing sessions immediately and reject stale or unauthorized changes',async()=>{
 const f=await serverFixture();try{const admin=await f.login('u-admin'),manager=await f.login('u-manager');const stages=Object.fromEntries(APPROVAL_STAGES.map(s=>[s.command,[...s.roles]]));stages.APPROVE_ARTWORK.push('MANAGER');
 const save=(session,revision=f.store.read().revision)=>f.req('/api/commands',{method:'POST',...session,payload:{type:'SAVE_APPROVAL_CONTROLS',payload:{stages,remarks:'Coverage test',confirm:true},expectedRevision:revision}});
 assert.equal((await save(manager)).status,403);const old=f.store.read().revision;assert.equal((await save(admin)).status,200);assert.equal((await save(admin,old)).status,409);
 const command=()=>f.req('/api/commands',{method:'POST',...manager,payload:{type:'APPROVE_ARTWORK',payload:{orderId:f.store.read().orders[0].id},expectedRevision:f.store.read().revision}});
 assert.equal((await command()).status,400,'Manager reaches readiness validation without logging in again');stages.APPROVE_ARTWORK=['PRODUCT_MANAGER'];assert.equal((await save(admin)).status,200);assert.equal((await command()).status,403,'Restoration immediately rejects the same Manager session');
 assert.equal((await f.req('/api/bootstrap',manager)).data.state.approvalControls.revision,2);assert.equal(f.store.read().events.filter(e=>e.action==='APPROVAL_CONTROLS_UPDATED').length,2);
 }finally{await f.close();}
});
