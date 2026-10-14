import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {LaeAnalyticsStore,validateAnalyticsDataset} from '../store.mjs';
import {makeAnalyticsServer} from '../server.mjs';
import {Store} from '../../server/store.mjs';
import {emptyState,makeServer} from '../../server/index.mjs';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const admin={id:'admin',role:'ADMIN',active:true},viewer={id:'viewer',role:'VIEWER',scopes:['LAE_IMPORT'],active:true};
const dataset=()=>({schemaVersion:1,meta:{fileName:'synthetic.xlsx',sha256:'a'.repeat(64),stockBasis:'MASTER',stockAsOf:null,months:['2026-10','2026-11'],periodNote:'Synthetic',controls:{items:2,stock:14,pipeline:7}},items:[
 {code:'A',category:'CUTTER',engine:'52',grade:'PRIME',model:'Model A',description:'Example',sourceRow:5,stock:10,locations:[1,2,0,0,7],pipelineTotal:5,sourceCombined:15,pipeline:[{month:'2026-10',brands:[2,1,null],quantity:3},{month:'2026-11',brands:[0,2,0],quantity:2}]},
 {code:'B',category:'CUTTER',engine:'52',grade:'PRIME',model:'Model B',description:'Example',sourceRow:6,stock:4,locations:[0,0,0,0,1],pipelineTotal:2,sourceCombined:3,pipeline:[{month:'2026-10',brands:[2,0,0],quantity:2},{month:'2026-11',brands:[null,null,null],quantity:0}]}
],exceptions:[{item:'B',detail:'Reported total differs; retained.',source:'MASTER!CD6'}]});
test('MASTER controls, category drill and shared stock retain source semantics',()=>{const db=new DatabaseSync(':memory:'),s=new LaeAnalyticsStore(db);try{s.import(admin,{dataset:dataset(),expectedId:null});let r=s.workspace(viewer);assert.equal(r.totals.stock.quantity,14);assert.equal(r.totals.shared.quantity,8);assert.equal(r.totals.pipeline.quantity,7);assert.equal(r.rows.length,1);
 r=s.workspace(viewer,{centre:'B2B - TN',month:'2026-10',category:'CUTTER',engine:'52',grade:'PRIME',level:'item',limit:1});assert.equal(r.totals.stock.quantity,2);assert.equal(r.totals.shared.quantity,8);assert.equal(r.totals.pipeline.quantity,5);assert.equal(r.total,2);assert.equal(r.rows.length,1);assert.equal(r.nextOffset,1);assert.equal(s.workspace(viewer,{level:'item',offset:1}).rows[0].key,'B');assert.equal(s.workspace(viewer,{search:'Model A'}).totals.stock.quantity,10);
}finally{db.close();}});
test('imports are immutable and replay-safe; stale concurrent replacement is rejected',()=>{const db=new DatabaseSync(':memory:'),s=new LaeAnalyticsStore(db);try{const first=s.import(admin,{dataset:dataset(),expectedId:null});assert.equal(s.import(admin,{dataset:dataset(),expectedId:null}).replayed,true);const next=dataset();next.meta.fileName='next.xlsx';assert.throws(()=>s.import(admin,{dataset:next,expectedId:null}),/source changed/);s.import(admin,{dataset:next,expectedId:first.id});assert.equal(db.prepare('SELECT count(*) n FROM lae_analytics_imports').get().n,2);assert.equal(new LaeAnalyticsStore(db).workspace(viewer).meta.fileName,'next.xlsx');}finally{db.close();}});
test('malformed totals and permissions fail closed',()=>{for(const change of [x=>x.meta.controls.stock++,x=>x.items[1].code='A',x=>x.items[1].sourceRow=5,x=>x.items[0].locations.pop(),x=>x.items[0].stock=NaN,x=>x.items[0].pipeline[0].quantity=9,x=>x.items[0].pipelineTotal++,x=>x.meta.stockBasis='RAW']){const d=dataset();change(d);assert.throws(()=>validateAnalyticsDataset(d));}const db=new DatabaseSync(':memory:'),s=new LaeAnalyticsStore(db);try{for(const u of [null,{...viewer,active:false},{...viewer,role:'BOM_REVIEWER'},{...viewer,scopes:[]}])assert.throws(()=>s.workspace(u),/LAE access/);assert.throws(()=>s.import(viewer,{dataset:dataset(),expectedId:null}),/Administrator/);s.import(admin,{dataset:dataset(),expectedId:null});for(const params of [{limit:0},{offset:-1},{limit:101},{level:'bad'},{centre:'unknown'},{month:'2027-06'}])assert.throws(()=>s.workspace(viewer,params));}finally{db.close();}});
test('separate HTTP service uses live identity, CSRF and scoped access without writing the purchase database',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'fh-isolation-')),core=new Store(join(dir,'purchase.sqlite'),emptyState()),db=new DatabaseSync(join(dir,'analytics.sqlite'));
 core.addAccount('admin','test@example.test','Synthetic-analytics-password');const main=makeServer(core,{log:()=>{}});await new Promise(r=>main.listen(0,'127.0.0.1',r));const identity='http://127.0.0.1:'+main.address().port;
 const server=makeAnalyticsServer(db,{origin:'https://example.test',identityOrigin:identity});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port+'/lae-analytics';
 try{
  assert.equal((await fetch(identity+'/api/session')).status,401);assert.equal((await fetch(base+'/api/lae-analytics/workspace')).status,401);
  const login=await fetch(identity+'/api/login',{method:'POST',headers:{Origin:identity,'Content-Type':'application/json'},body:JSON.stringify({email:'test@example.test',password:'Synthetic-analytics-password'})});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0],session=await(await fetch(identity+'/api/session',{headers:{Cookie:cookie}})).json();assert.deepEqual(Object.keys(session).sort(),['csrf','user']);assert.deepEqual(Object.keys(session.user).sort(),['active','id','name','role','scopes']);
  const before=core.read(),payload=JSON.stringify({dataset:dataset(),expectedId:null}),headers={Cookie:cookie,Origin:'https://example.test','Content-Type':'application/json'};
  assert.equal((await fetch(base+'/api/lae-analytics/import',{method:'POST',headers,body:payload})).status,403);headers['X-CSRF-Token']=session.csrf;
  assert.equal((await fetch(base+'/api/lae-analytics/import',{method:'POST',headers:{...headers,Origin:'https://evil.test'},body:payload})).status,403);
  assert.equal((await fetch(base+'/api/lae-analytics/import',{method:'POST',headers,body:payload})).status,200);
  assert.equal((await(await fetch(base+'/api/lae-analytics/workspace',{headers:{Cookie:cookie}})).json()).totals.stock.quantity,14);assert.deepEqual(core.read(),before);assert.equal(core.db.prepare("SELECT name FROM sqlite_master WHERE name='lae_analytics_imports'").get(),undefined);
  assert.equal((await fetch(base+'/analytics.sqlite')).status,404);assert.equal((await fetch(base+'/store.mjs')).status,404);
  await fetch(identity+'/api/logout',{method:'POST',headers:{Cookie:cookie,Origin:identity,'X-CSRF-Token':session.csrf,'Content-Type':'application/json'},body:'{}'});assert.equal((await fetch(base+'/api/lae-analytics/workspace',{headers:{Cookie:cookie}})).status,401);
 }finally{await new Promise(r=>server.close(r));await new Promise(r=>main.close(r));db.close();core.close();rmSync(dir,{recursive:true,force:true});}
});
