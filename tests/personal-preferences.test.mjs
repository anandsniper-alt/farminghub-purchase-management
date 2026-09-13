import test from 'node:test';
import assert from 'node:assert/strict';
import {createSeed} from '../shared/seed.mjs';
import {execute,personalPreferences,USER_ROLES} from '../shared/domain.mjs';
import {Store} from '../server/store.mjs';
import {makeServer} from '../server/index.mjs';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

test('page-guide defaults remain off and only a saved boolean true enables them',()=>{
 for(const user of [null,{}, {preferences:{}},{preferences:{showPageGuides:false}},{preferences:{showPageGuides:'true'}}])assert.deepEqual(personalPreferences(user),{showPageGuides:false});
 assert.deepEqual(personalPreferences({preferences:{showPageGuides:true}}),{showPageGuides:true});
});
test('every active role can change its own guides while all other users and business collections stay unchanged',()=>{
 for(const role of USER_ROLES){const seed=createSeed('2026-09-11'),user=seed.users.find(u=>u.role===role),before=structuredClone(seed),next=execute(seed,{type:'SAVE_PERSONAL_PREFERENCES',payload:{showPageGuides:true}},user).state;
  assert.deepEqual(seed,before);assert.equal(next.users.find(u=>u.id===user.id).preferences.showPageGuides,true);assert.deepEqual(next.users.filter(u=>u.id!==user.id),before.users.filter(u=>u.id!==user.id));
  for(const key of Object.keys(before).filter(k=>!['users','events','revision'].includes(k)))assert.deepEqual(next[key],before[key],key);
  const event=next.events.at(-1);assert.equal(event.entityId,user.id);assert.equal(event.actorId,user.id);assert.equal(event.action,'PERSONAL_PREFERENCES_UPDATED');assert.deepEqual(event.oldValue,{showPageGuides:false});assert.deepEqual(event.newValue,{showPageGuides:true});assert.deepEqual(next.events.slice(0,-1),before.events);
  const restored=execute(next,{type:'SAVE_PERSONAL_PREFERENCES',payload:{showPageGuides:false}},user).state;assert.equal(restored.users.find(u=>u.id===user.id).preferences.showPageGuides,false);
 }
});
test('a preference cannot target another account or smuggle role, scope or theme changes',()=>{
 const seed=createSeed('2026-09-11'),user=seed.users.find(u=>u.role==='MANAGER');
 for(const payload of [{},{showPageGuides:'true'},{showPageGuides:1},{showPageGuides:null},[],{showPageGuides:true,userId:'u-admin'},{showPageGuides:true,role:'ADMIN'},{showPageGuides:true,scopes:['UTILITY_DOMESTIC']},{showPageGuides:true,theme:'current'}])assert.throws(()=>execute(seed,{type:'SAVE_PERSONAL_PREFERENCES',payload},user),/boolean page-guide preference/);
 assert.throws(()=>execute(seed,{type:'SAVE_PERSONAL_PREFERENCES',payload:{showPageGuides:true}},{...user,active:false}),e=>e.code==='FORBIDDEN');assert.throws(()=>execute(seed,{type:'SAVE_PERSONAL_PREFERENCES',payload:{showPageGuides:true}},{...user,id:'unknown'}),e=>e.code==='FORBIDDEN');
});
test('personal display settings do not require purchasing permissions or assigned divisions',()=>{
 const seed=createSeed('2026-09-11'),viewer=seed.users.find(u=>u.role==='VIEWER');viewer.scopes=[];viewer.preferences={futurePreference:'retained'};const next=execute(seed,{type:'SAVE_PERSONAL_PREFERENCES',payload:{showPageGuides:true}},viewer).state;assert.deepEqual(next.users.find(u=>u.id===viewer.id).preferences,{futurePreference:'retained',showPageGuides:true});
});
test('saved preference follows the authenticated account across sessions and SQLite restart; stale writes fail',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'fh-preferences-')),file=join(dir,'test.sqlite'),seed=createSeed('2026-09-11');let store=new Store(file,seed);for(const id of ['u-manager','u-viewer'])store.addAccount(id,id+'@example.test','Preference-test-12345');const server=makeServer(store);await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const bootstrap=async cookie=>(await fetch(origin+'/api/bootstrap',{headers:{Cookie:cookie}})).json();
 const login=async id=>{const r=await fetch(origin+'/api/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({email:id+'@example.test',password:'Preference-test-12345'})});const cookie=r.headers.get('set-cookie').split(';')[0];return {cookie,...await bootstrap(cookie)};};
 const save=(session,payload,revision=session.state.revision)=>fetch(origin+'/api/commands',{method:'POST',headers:{Origin:origin,Cookie:session.cookie,'X-CSRF-Token':session.csrf,'Content-Type':'application/json'},body:JSON.stringify({type:'SAVE_PERSONAL_PREFERENCES',payload,expectedRevision:revision})});
 try{const manager=await login('u-manager'),viewer=await login('u-viewer');assert.equal((await save(manager,{showPageGuides:true})).status,200);assert.equal((await save(manager,{showPageGuides:false})).status,409);assert.equal((await bootstrap(viewer.cookie)).user.preferences,undefined);const fresh=await login('u-manager');assert.equal(fresh.user.preferences.showPageGuides,true);assert.equal(fresh.state.users.find(u=>u.id==='u-manager').preferences.showPageGuides,true);const latest=await login('u-viewer');assert.equal((await save(latest,{showPageGuides:true,userId:'u-manager'})).status,400);assert.equal((await save(latest,{showPageGuides:false})).status,200);assert.equal((await bootstrap(manager.cookie)).user.preferences.showPageGuides,true);
 }finally{await new Promise(r=>server.close(r));store.close();store=new Store(file);assert.equal(store.read().users.find(u=>u.id==='u-manager').preferences.showPageGuides,true);assert.equal(store.read().users.find(u=>u.id==='u-viewer').preferences.showPageGuides,false);store.close();rmSync(dir,{recursive:true,force:true});}
});
