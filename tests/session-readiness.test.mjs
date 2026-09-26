import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../server/store.mjs';
import {makeServer} from '../server/index.mjs';
import {createSeed} from '../shared/seed.mjs';
test('session reads only its current profile and respects immediate role, scope and active changes',()=>{
 const dir=mkdtempSync(join(tmpdir(),'fh-session-query-')),store=new Store(join(dir,'test.sqlite'),createSeed('2026-09-11'));
 try{
  store.addAccount('u-manager','session@example.test','Synthetic-session-2026');const session=store.login('session@example.test','Synthetic-session-2026'),state=store.read();store.read=()=>{throw Error('Full workspace JS parse should not be needed');};
  assert.equal(store.session(session.token).user.role,'MANAGER');const profile=state.users.find(u=>u.id==='u-manager');profile.role='VIEWER';profile.scopes=['LAE_DOMESTIC'];store.db.prepare('UPDATE workspace SET payload=?').run(JSON.stringify(state));assert.equal(store.session(session.token).user.role,'VIEWER');assert.deepEqual(store.session(session.token).user.scopes,['LAE_DOMESTIC']);profile.active=false;store.db.prepare('UPDATE workspace SET payload=?').run(JSON.stringify(state));assert.equal(store.session(session.token),null);profile.active=true;store.db.prepare('UPDATE workspace SET payload=?').run(JSON.stringify(state));store.db.prepare('UPDATE accounts SET active=0 WHERE id=?').run('u-manager');assert.equal(store.session(session.token),null);
 }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
test('health detects unreadable workspace and reports only validated release identity',async()=>{
 let failed=false;const records=[],server=makeServer({revision:()=>{if(failed)throw Error('private database path');return 5;}},{releaseSha:'a'.repeat(40),log:event=>records.push(event)});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const url='http://127.0.0.1:'+server.address().port+'/api/health';let r=await fetch(url);assert.equal(r.status,200);assert.deepEqual(await r.json(),{status:'ok',version:'0.6.1-alpha.16',storage:'sqlite',releaseSha:'a'.repeat(40)});failed=true;r=await fetch(url);assert.equal(r.status,503);assert.equal((await r.json()).status,'unavailable');await new Promise(r=>setImmediate(r));assert.ok(records.some(r=>r.status===503));assert.ok(!JSON.stringify(records).includes('private database path'));}finally{await new Promise(r=>server.close(r));}
});
