import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {validateRoDriveUrl,importantRoDocuments,roDrivePreviewUrl} from '../shared/ro-documents.mjs';
import {prepareRoDriveReferences} from '../scripts/ro-drive-reference-plan.mjs';
import {prepareRoReferenceBatches} from '../scripts/prepare-ro-reference-batches.mjs';
import {emptyState,makeServer} from '../server/index.mjs';
import {Store} from '../server/store.mjs';
import {RoCostingStore} from '../server/ro-costing-store.mjs';

const url='https://drive.google.com/file/d/syntheticFileId12345/view',folder='https://drive.google.com/drive/folders/syntheticFolderId12345';
test('important cards combine exact RO/hash/role access without collapsing distinct source versions',()=>{
 const local={id:'local',ro:'SYNTHETIC',name:'original.pdf',sha256:'a'.repeat(64),kind:'Commercial invoice',storage:'local'},drive={...local,id:'drive',name:'drive.pdf',storage:'google-drive',driveUrl:url};
 for(const files of [[local,drive],[drive,local]]){const cards=importantRoDocuments({ro:'SYNTHETIC'},files).commercialInvoices;assert.equal(cards.length,1);assert.equal(cards[0].id,'local');assert.equal(cards[0].driveUrl,url);assert.equal(cards[0].storage,'local');}
 const cards=importantRoDocuments({ro:'SYNTHETIC'},[local,drive,{...drive,id:'version',sha256:'b'.repeat(64)}]);assert.equal(cards.commercialInvoices.length,2);
 const roles=importantRoDocuments({ro:'SYNTHETIC'},[local,{...drive,kind:'Inward BOE'}]);assert.equal(roles.commercialInvoices.length,1);assert.equal(roles.inwardBoe.length,1);
 assert.equal(importantRoDocuments({ro:'SYNTHETIC'},[local,{...drive,ro:'DIFFERENT-SYNTHETIC'}]).commercialInvoices.length,2);
});
test('Drive URL validation rejects redirects, executable URLs, credentials, lookalike hosts and encoded paths',()=>{
 assert.equal(validateRoDriveUrl(url+'?usp=drivesdk').url,url);assert.equal(roDrivePreviewUrl(url+'?usp=sharing'),'https://drive.google.com/file/d/syntheticFileId12345/preview');assert.equal(validateRoDriveUrl(folder,{library:true}).resource,'folder');
 for(const value of ['javascript:alert(1)','http://drive.google.com/file/d/syntheticFileId12345/view',url+'#redirect',url+'?url=https://evil.test',url.replace('drive.google.com','drive.google.com.evil.test'),url.replace('drive.google.com','user:password@drive.google.com'),url.replace('/view','/%76iew'),url.replace('drive.google.com','drive.google.com:443'),folder,'https://drive.google.com/uc?id=syntheticFileId12345&export=download']){assert.throws(()=>validateRoDriveUrl(value));assert.throws(()=>roDrivePreviewUrl(value));}
});
test('manifest planning keeps all exact shared-RO associations without leaking local paths or inventing importer copies',()=>{
 const d={status:'verified',document_kind:'Inward BOE',ro_raw:['5589 - 5595','1123'],drive_id:'syntheticFileId12345',webViewLink:url,artifact:{path:'private/source.pdf',sha256:'a'.repeat(64),bytes:123},metadata:{id:'syntheticFileId12345',size:'123',permissions:[{type:'user',role:'owner'}]}};
 const planned=prepareRoDriveReferences({documents:[d]});assert.deepEqual(planned.map(d=>d.ro),['5589 - 5595','1123']);assert.ok(planned.every(r=>r.kind==='Inward BOE'));assert.equal(JSON.stringify(planned).includes('private/'),false);
 assert.throws(()=>prepareRoDriveReferences({documents:[{...d,metadata:{permissions:[{type:'anyone',role:'reader'}]}}]}),/owner-only/);
 assert.throws(()=>prepareRoDriveReferences({documents:[{...d,drive_id:'wrongFileId12345'}]}),/identity/);
});
test('bounded private batches retain separate existing-record patches and null-actual creation records',()=>{
 const comparison={version:1,status:'Pending',ai:{rate:null},suresh:{rate:null},workings:[],selectedWorkingIds:[]};
 const creations=Array.from({length:31},(_,n)=>({ro:n===0?'5589 - 5595':'SYNTHETIC-'+n,worksheetComparison:comparison,actuals:{}})),patches=creations.map(r=>({ro:r.ro,worksheetComparison:r.worksheetComparison}));
 const batches=prepareRoReferenceBatches(patches,creations,{documents:[]},'a'.repeat(40));assert.deepEqual(batches.map(b=>b.records.length),[30,1]);
 assert.deepEqual(Object.keys(batches[0].records[0].record),['ro','worksheetComparison']);assert.equal(batches[0].records[0].record.ro,'5589 - 5595');assert.equal(batches[0].records[0].creationRecord.actuals.supplierInr,null);
 assert.throws(()=>prepareRoReferenceBatches(patches,creations.slice(1),{documents:[]}),/sources differ/);
 assert.throws(()=>prepareRoReferenceBatches(patches,[{...creations[0],actuals:{supplierInr:1}},...creations.slice(1)],{documents:[]}),/actual payments/);
});

test('protected Drive references and source library retain local evidence, actual history, permissions and retry guards',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'fh-drive-reference-')),state=emptyState();state.users.push({id:'viewer',name:'Synthetic viewer',role:'VIEWER',scopes:['LAE_IMPORT'],active:true});
 let store=new Store(join(dir,'db.sqlite'),state),module=new RoCostingStore(store);
 for(const id of ['admin','viewer'])store.addAccount(id,id+'@example.test','Synthetic-test-only-password');
 module.import('admin',{records:[{record:{ro:'5589 - 5595',supplier:'Synthetic supplier',actuals:{}},expectedRevision:0}],reason:'Synthetic source'});
 const bytes=Buffer.from('%PDF-1.4\nSynthetic local evidence'),hash=createHash('sha256').update(bytes).digest('hex');
 const local=module.upload('admin',{ro:'5589 - 5595',name:'legacy.pdf',kind:'Supporting document',base64:bytes.toString('base64'),sha256:hash});
 const before=module.detail('admin','5589 - 5595'),main=JSON.stringify(store.read()),server=makeServer(store,{log:()=>{}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 const call=async(path,{actor,body,headers={},key}={})=>{const res=await fetch(base+'/api/ro-costings/'+path,{method:body?'POST':'GET',headers:{Origin:base,'Content-Type':'application/json',...(actor?{Cookie:actor.cookie,'X-CSRF-Token':actor.csrf}:{}),...(key?{'Idempotency-Key':key}:{}),...headers},body:body?JSON.stringify(body):undefined});return {status:res.status,data:await res.json()};};
 const login=async id=>{const r=await fetch(base+'/api/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({email:id+'@example.test',password:'Synthetic-test-only-password'})}),cookie=r.headers.get('set-cookie').split(';')[0],b=await fetch(base+'/api/bootstrap',{headers:{Cookie:cookie}});return {cookie,csrf:(await b.json()).csrf};};
 try{
  const csp=(await fetch(base+'/')).headers.get('content-security-policy');assert.ok(csp.split(';').map(v=>v.trim()).includes("frame-src 'self' blob: https://drive.google.com"));assert.ok(!csp.includes('https://*.google.com'));
  const admin=await login('admin'),viewer=await login('viewer'),doc={ro:'5589 - 5595',name:'synthetic.pdf',kind:'Commercial invoice',driveUrl:url,sha256:'a'.repeat(64),bytes:123,reason:'Synthetic verified private source'};
  assert.equal((await call('drive-documents',{body:doc})).status,401);
  assert.equal((await call('drive-documents',{actor:viewer,body:doc})).status,403);
  assert.equal((await call('drive-documents',{actor:admin,body:doc,headers:{'X-CSRF-Token':'invalid'}})).status,403);
  assert.equal((await call('drive-documents',{actor:admin,body:{...doc,driveUrl:'https://evil.test/source.pdf'}})).status,400);
  const linked=await call('drive-documents',{actor:admin,body:doc,key:'synthetic-drive-link-key'});assert.equal(linked.status,201);
  assert.deepEqual((await call('drive-documents',{actor:admin,body:doc,key:'synthetic-drive-link-key'})).data,linked.data);
  assert.equal((await call('drive-documents',{actor:admin,body:{...doc,sha256:'b'.repeat(64)},key:'synthetic-conflict-key'})).status,409);
  const library={name:'Synthetic costing learnings',driveUrl:folder,reason:'Synthetic approved library',expectedSequence:0};
  assert.equal((await call('source-library',{actor:viewer,body:library})).status,403);
  const saved=await call('source-library',{actor:admin,body:library,key:'synthetic-library-key'});assert.equal(saved.status,200);
  assert.deepEqual((await call('source-library',{actor:admin,body:library,key:'synthetic-library-key'})).data,saved.data);
  assert.equal((await call('source-library',{actor:admin,body:{...library,name:'Stale edit'},key:'synthetic-stale-library'})).status,409);
  assert.equal((await call('source-library')).status,401);
  assert.equal((await call('documents?ro=5589%20-%205595')).status,401);
  const detail=(await call('record?ro=5589%20-%205595',{actor:viewer})).data;
  assert.equal(detail.importantDocuments.commercialInvoices[0].driveUrl,url);assert.equal(detail.documents.total,2);assert.equal(detail.sourceLibrary.driveUrl,folder);
  assert.deepEqual(detail.record,before.record);assert.equal(detail.revision,before.revision);assert.deepEqual(detail.history,JSON.parse(JSON.stringify(before.history)));
  assert.deepEqual(Buffer.from(module.download('admin',local.id).body),bytes);assert.equal(JSON.stringify(store.read()),main);
  assert.throws(()=>store.db.exec('DELETE FROM ro_drive_documents'),/immutable/);assert.throws(()=>store.db.exec('DELETE FROM ro_source_libraries'),/append-only/);
 }finally{await new Promise(r=>server.close(r));store.close();}
 try{store=new Store(join(dir,'db.sqlite'));module=new RoCostingStore(store);assert.equal(module.documents('admin','5589 - 5595').total,2);assert.equal(module.sourceLibrary('admin').driveUrl,folder);assert.equal(store.db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');}finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
