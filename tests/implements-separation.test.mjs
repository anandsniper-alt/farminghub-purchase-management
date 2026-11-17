import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {request} from 'node:http';
import {Store} from '../server/store.mjs';
import {emptyState,makeServer} from '../server/index.mjs';
import {ImplementsStore} from '../server/implements-store.mjs';
import {BomManagementStore} from '../server/bom-management-store.mjs';
import {ProductionStore} from '../server/production-store.mjs';
import {PlanningStore} from '../server/planning-store.mjs';
import {blankState,ensureMonthly} from '../shared/implements/domain.mjs';
import {TRANSFER_TABLES,IMPLEMENTS_SCOPES,standaloneBase,transferState,freezeTransfer,makeTransferFile,installTransferFile,assertModuleWrite,guardModule,confirmTransfer,publicTransferState} from '../server/implements-transfer.mjs';
const sourceOrigin='https://purchase.example.test',targetOrigin='https://implements.example.test',password='Separation-fixture-password';
const sha=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
function fixture(separate=false){
 const dir=mkdtempSync(join(tmpdir(),'fh-separation-')),file=join(dir,'test.sqlite');
 const users=[{id:'admin',name:'Admin',role:'ADMIN',active:true,scopes:['LAE_IMPORT']},{id:'technical',name:'Technical',role:'BOM_REVIEWER',active:true,scopes:['BOM_MANAGEMENT']},{id:'factory',name:'Factory',role:'PRODUCTION_OPERATOR',active:true,scopes:['PRODUCTION_MANAGEMENT']},{id:'planner',name:'Planner',role:'PLAN_OPERATOR',active:true,scopes:['IMPLEMENTS_PLANNING']},{id:'lae',name:'LAE only',role:'MANAGER',active:true,scopes:['LAE_IMPORT']}];
 const main=separate?standaloneBase([users[0]]):{...emptyState(),users};const store=new Store(file,main);for(const u of main.users)store.addAccount(u.id,u.id+'@example.test',password);
 const source=new ImplementsStore(store),bom=new BomManagementStore(store,source),production=new ProductionStore(store,source),planning=new PlanningStore(store,source);
 if(!separate){const state=ensureMonthly(blankState({version:'test',parts:[{id:'bolt',code:'IMP-1',name:'Bolt',uom:'pcs',category:'FASTENERS',fabricated:false,rate:98765,supplier:'v'}],suppliers:[{id:'v',name:'Private supplier'}],models:[{id:'S2.V12',name:'Leader',series:'Leader',salesConfirmed:true,bomAvailable:true,revision:1,lines:[{partId:'bolt',ppm:2}],fabrication:[{partId:'fp',code:'FP1',name:'Frame',weight:10}],fabricationCode:'FAB-S2V12',fabricationSupplier:'v',costs:{Assembly:2000},history:[]}]}),'2026-11');state.stock={bolt:{qty:50},'fab:S2.V12':{qty:5}};source.save({state,expectedRevision:0,requestId:randomUUID(),message:'Isolated migration fixture'},'admin');}
 return {dir,file,store,source,bom,production,planning,admin:main.users[0],close(){this.store.close();rmSync(dir,{recursive:true,force:true});}};
}
function freeze(f){return freezeTransfer(f.store,{expectedRevision:f.source.read().revision},f.admin,sourceOrigin,targetOrigin);}
function packageFile(f){const file=join(f.dir,'transfer.sqlite');const meta=makeTransferFile(f.file,file),digest=sha(file);const state={...transferState(f.store),sha256:digest};f.store.db.prepare('UPDATE implements_transfer SET payload=? WHERE id=1').run(JSON.stringify(state));return {file,meta,digest};}
async function server(f,separate=false){const s=makeServer(f.store,{applicationMode:separate?'implements':'purchase',migrationSource:sourceOrigin,migrationTarget:targetOrigin,log:()=>{}});await new Promise(r=>s.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+s.address().port;const call=async(path,data,auth={})=>{const r=await fetch(base+path,{method:data===undefined?'GET':'POST',redirect:'manual',headers:{Origin:base,'Content-Type':'application/json',Cookie:auth.cookie||'','X-CSRF-Token':auth.csrf||''},body:data===undefined?undefined:JSON.stringify(data)});return {status:r.status,headers:r.headers,data:r.headers.get('content-type')?.includes('application/json')?await r.json():await r.text()};};const login=async(id='admin')=>{const r=await call('/api/login',{email:id+'@example.test',password}),cookie=r.headers.get('set-cookie').split(';')[0],b=await call('/api/session',undefined,{cookie});return {cookie,csrf:b.data.csrf};};return {call,login,close:()=>new Promise(r=>s.close(r))};}

test('full module histories, credentials, stock and retry receipts survive separate database transfer; no LAE users/data',async()=>{
 const a=fixture(),b=fixture(true);try{
  a.bom.command('technical',{type:'SUBMIT_CORRECTION',modelId:'S2.V12',draft:{lines:[{partId:'bolt',ppm:3}]},expectedRevision:a.source.read().revision,expectedReviewRevision:0,requestId:randomUUID(),reason:'Physical verification'});
  const planInput={type:'SAVE_DRAFT',month:'2026-11',plan:{'S2.V12':2},expectedVersion:0,requestId:randomUUID(),note:'Factory demand'};a.planning.command('planner',planInput);
  const input={type:'CREATE_BATCH',modelId:'S2.V12',quantity:2,month:'2026-11',date:new Date().toISOString().slice(0,10),expectedRevision:a.source.read().revision,expectedProductionRevision:0,requestId:randomUUID(),reason:'Factory batch'};a.production.command('factory',input);
  const id=a.production.page('factory').rows[0].id;
  a.production.command('factory',{type:'COMPLETE_BATCH',batchId:id,completeQuantity:1,date:input.date,expectedRevision:a.source.read().revision,expectedProductionRevision:a.production.revision(),requestId:randomUUID(),reason:'One machine completed'});
  const before=a.source.read(),snapshot=Object.fromEntries(TRANSFER_TABLES.map(t=>[t,a.store.db.prepare('SELECT * FROM '+t+' ORDER BY rowid').all()]));freeze(a);const p=packageFile(a);
  const second=join(a.dir,'second.sqlite');makeTransferFile(a.file,second);assert.equal(sha(second),p.digest,'Repeated exports are byte-identical');
  installTransferFile(b.store,p.file,p.digest,sourceOrigin,targetOrigin);
  assert.deepEqual(b.source.read(),before);for(const t of TRANSFER_TABLES)assert.deepEqual(b.store.db.prepare('SELECT * FROM '+t+' ORDER BY rowid').all(),snapshot[t],t);
  assert.equal(b.store.read().users.some(u=>u.id==='lae'),false);for(const id of ['admin','technical','factory','planner'])assert.ok(b.store.login(id+'@example.test',password));assert.equal(b.store.login('lae@example.test',password),null);
  assert.equal(b.store.read().orders.length,0);assert.equal(b.store.read().vendors.length,0);
  assert.throws(()=>assertModuleWrite(a.store,false),/paused/);assert.throws(()=>assertModuleWrite(b.store,true),/verified/);
  await assert.rejects(confirmTransfer(b.store,'activate',b.admin,async()=>({...publicTransferState(a.store,false),sha256:'bad'})),/not verified/);
  await confirmTransfer(b.store,'activate',b.admin,async()=>publicTransferState(a.store,false));assert.doesNotThrow(()=>assertModuleWrite(b.store,true));
  assert.equal(b.planning.command('planner',planInput).replayed,true);
  await confirmTransfer(a.store,'complete',a.admin,async()=>publicTransferState(b.store,true));assert.throws(()=>assertModuleWrite(a.store,false),/has moved/);
  b.production.command('factory',{type:'COMPLETE_BATCH',batchId:id,completeQuantity:1,date:input.date,expectedRevision:b.source.read().revision,expectedProductionRevision:b.production.revision(),requestId:randomUUID(),reason:'Second machine completed'});
  assert.equal(b.production.detail('factory',id).units.length,2);assert.equal(b.source.read().stock.bolt.qty,46);assert.deepEqual(a.source.read(),before);
  const revision=b.store.revision();b.store.close();b.store=new Store(b.file);assert.equal(b.store.revision(),revision,'No startup initialization changes imported state');
 }finally{a.close();b.close();}
});
test('freeze is revision guarded; import refuses wrong origin, repeated or populated destinations without partial writes',()=>{const a=fixture(),b=fixture(true),c=fixture();try{
 assert.throws(()=>freezeTransfer(a.store,{expectedRevision:0},a.admin,sourceOrigin,targetOrigin),/changed/);assert.equal(transferState(a.store),null);freeze(a);const p=packageFile(a),before=b.store.read();
 assert.throws(()=>installTransferFile(b.store,p.file,p.digest,'https://wrong.example.test',targetOrigin),/different migration/);assert.deepEqual(b.store.read(),before);
 assert.throws(()=>installTransferFile(c.store,p.file,p.digest,sourceOrigin,targetOrigin),/contains business data/);
 installTransferFile(b.store,p.file,p.digest,sourceOrigin,targetOrigin);assert.throws(()=>installTransferFile(b.store,p.file,p.digest,sourceOrigin,targetOrigin),/already has a transfer/);
 const guarded=guardModule(a.source,a.store,false,['save']);assert.throws(()=>guarded.save({state:a.source.read()},'admin'),/paused/);
 }finally{a.close();b.close();c.close();}});
test('standalone API isolates LAE even for administrators; transfer routes require admin, origin and CSRF',async()=>{const a=fixture(),b=fixture(true);freeze(a);const p=packageFile(a);installTransferFile(b.store,p.file,p.digest,sourceOrigin,targetOrigin);const f=await server(b,true);try{
 const admin=await f.login(),technical=await f.login('technical');
 for(const path of ['/api/ro-costings','/api/files','/api/utility-prices/workspace','/api/payment-planner','/api/integration/v1/snapshot'])assert.equal((await f.call(path,undefined,admin)).status,404,path);
 assert.equal((await f.call('/api/implements/workspace',undefined,technical)).status,403);assert.equal((await f.call('/api/bom-management/workspace',undefined,technical)).status,200);
 assert.equal((await f.call('/api/admin/implements-transfer/activate',{},technical)).status,403);assert.equal((await f.call('/api/admin/implements-transfer/activate',{}, {cookie:admin.cookie})).status,403);
 assert.equal((await f.call('/api/production/commands',{},admin)).status,409);assert.equal((await f.call('/api/users',{name:'blocked'},admin)).status,400);
 const root=await f.call('/');assert.ok(root.data.includes('implements-portal.mjs'));assert.ok(!root.data.includes('src="/app.mjs"'));assert.ok((await f.call('/bom/',undefined,technical)).data.includes('/mode.js'));
 await confirmTransfer(b.store,'activate',b.admin,async()=>publicTransferState(a.store,false));
 assert.equal((await f.call('/api/commands',{type:'SAVE_SETTINGS',expectedRevision:b.store.revision(),payload:{}},admin)).status,403);
 assert.equal((await f.call('/api/users',{name:'No LAE',role:'VIEWER',scopes:['LAE_IMPORT'],email:'bad@example.test',password,expectedRevision:b.store.revision()},admin)).status,403);
 const tech=await f.call('/api/bom-management/workspace',undefined,technical);assert.ok(!JSON.stringify(tech.data).includes('98765'));
 }finally{await f.close();a.close();b.close();}});
test('source freezes all four write APIs while reads and LAE remain available, then redirects old module pages',async()=>{const a=fixture();freeze(a);const p=packageFile(a),f=await server(a);try{const admin=await f.login();for(const path of ['/api/implements/workspace','/api/bom-management/commands','/api/production/commands','/api/planning/commands'])assert.equal((await f.call(path,{},admin)).status,409,path);assert.equal((await f.call('/api/implements/workspace',undefined,admin)).status,200);assert.equal((await f.call('/api/payment-planner',undefined,admin)).status,200);await confirmTransfer(a.store,'complete',a.admin,async()=>({application:'implements',phase:'ACTIVE',transferId:transferState(a.store).transferId,sha256:p.digest}));const r=await f.call('/bom/?review=1');assert.equal(r.status,307);assert.equal(r.headers.get('location'),targetOrigin+'/bom/?review=1');assert.equal((await f.call('/api/implements/workspace',{},admin)).status,409);}finally{await f.close();a.close();}});

test('safe cancellation keeps destination blocked and resumes source only after the partner confirms cancellation',async()=>{const a=fixture(),b=fixture(true);try{freeze(a);const p=packageFile(a);installTransferFile(b.store,p.file,p.digest,sourceOrigin,targetOrigin);await assert.rejects(confirmTransfer(a.store,'resume',a.admin,async()=>publicTransferState(b.store,true)),/not verified/);await confirmTransfer(b.store,'cancel',b.admin);await confirmTransfer(a.store,'resume',a.admin,async()=>publicTransferState(b.store,true));assert.doesNotThrow(()=>assertModuleWrite(a.store,false));assert.throws(()=>assertModuleWrite(b.store,true),/verified/);await assert.rejects(confirmTransfer(b.store,'activate',b.admin,async()=>publicTransferState(a.store,false)),/Invalid/);}finally{a.close();b.close();}});

test('a request whose body started before freeze cannot commit afterwards',async()=>{
 const a=fixture(),s=makeServer(a.store,{log:()=>{}});await new Promise(r=>s.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+s.address().port;
 try{const logged=a.store.login('admin@example.test',password),body=JSON.stringify({state:a.source.read(),expectedRevision:a.source.read().revision,requestId:randomUUID(),message:'Late request'}),started=new Promise(r=>s.on('request',req=>req.once('data',r)));
 const response=new Promise((resolve,reject)=>{const req=request(base+'/api/implements/workspace',{method:'POST',headers:{Origin:base,Cookie:'fh_session='+logged.token,'X-CSRF-Token':logged.csrf,'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);req.write(body.slice(0,20));started.then(()=>{freeze(a);req.end(body.slice(20));});});
 assert.equal(await response,409);assert.equal(a.source.read().revision,1);
 }finally{await new Promise(r=>s.close(r));a.close();}
});

test('gzip HTTP export/import verifies content and invalidates initial destination sessions',async()=>{
 const a=fixture(),b=fixture(true),sa=makeServer(a.store,{log:()=>{}}),sb=makeServer(b.store,{applicationMode:'implements',migrationSource:sourceOrigin,migrationTarget:targetOrigin,log:()=>{}});await Promise.all([new Promise(r=>sa.listen(0,'127.0.0.1',r)),new Promise(r=>sb.listen(0,'127.0.0.1',r))]);
 try{freeze(a);const authA=a.store.login('admin@example.test',password),authB=b.store.login('admin@example.test',password),urlA='http://127.0.0.1:'+sa.address().port,urlB='http://127.0.0.1:'+sb.address().port,headers=(url,auth)=>({Origin:url,Cookie:'fh_session='+auth.token,'X-CSRF-Token':auth.csrf});
 const exported=await fetch(urlA+'/api/admin/implements-transfer/export',{method:'POST',headers:headers(urlA,authA)});assert.equal(exported.status,200);const bytes=Buffer.from(await exported.arrayBuffer()),proof={'X-Transfer-Bytes':exported.headers.get('x-transfer-bytes'),'X-Transfer-SHA256':exported.headers.get('x-transfer-sha256')};
 const bad=await fetch(urlB+'/api/admin/implements-transfer/import',{method:'POST',headers:{...headers(urlB,authB),...proof,'X-Transfer-SHA256':'0'.repeat(64)},body:bytes});assert.equal(bad.status,400);assert.equal(transferState(b.store),null);
 const good=await fetch(urlB+'/api/admin/implements-transfer/import',{method:'POST',headers:{...headers(urlB,authB),...proof},body:bytes});assert.equal(good.status,200);assert.equal((await good.json()).phase,'INSTALLED');assert.equal(b.store.session(authB.token),null);assert.deepEqual(a.source.read(),b.source.read());
 }finally{await Promise.all([new Promise(r=>sa.close(r)),new Promise(r=>sb.close(r))]);a.close();b.close();}
});
