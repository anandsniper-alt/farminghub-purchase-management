import {DatabaseSync} from 'node:sqlite';
import {createHash,randomUUID} from 'node:crypto';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {mkdtempSync,createReadStream,createWriteStream,statSync} from 'node:fs';
import {rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pipeline} from 'node:stream/promises';
import {Transform} from 'node:stream';
import {createGzip,createGunzip} from 'node:zlib';
import {createCleanSeed} from '../shared/clean-seed.mjs';
import {RuleError,scopeAllowed} from '../shared/domain.mjs';
import {ensureRecordReferences} from '../shared/references.mjs';

export const IMPLEMENTS_SCOPES=['IMPLEMENTS_DOMESTIC','BOM_MANAGEMENT','PRODUCTION_MANAGEMENT','IMPLEMENTS_PLANNING'];
export const TRANSFER_TABLES=['implements_workspace','implements_events','bom_review_records','bom_review_events','production_batches','production_units','production_events','production_stock_movements','implements_plan_requests','implements_plan_events'];
export const moduleApi=path=>/^\/api\/(?:implements|bom-management|production|planning)\//.test(path);
export const modulePage=path=>/^\/(?:implements|bom|production|planning)(?:\/|$)/.test(path);
const fail=(message,code='VALIDATION')=>{throw new RuleError(message,code);};
const hash=value=>createHash('sha256').update(value).digest('hex');
const q=name=>'"'+name.replaceAll('"','""')+'"';
function tableExists(db,name){return !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name);}
export function transferState(store){if(!store||!tableExists(store.db,'implements_transfer'))return null;const row=store.db.prepare('SELECT payload FROM implements_transfer WHERE id=1').get();return row?JSON.parse(row.payload):null;}
function writeState(store,state){store.db.exec('CREATE TABLE IF NOT EXISTS implements_transfer(id INTEGER PRIMARY KEY CHECK(id=1),payload TEXT NOT NULL)');store.db.prepare('INSERT INTO implements_transfer VALUES(1,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload').run(JSON.stringify(state));return state;}
export function standaloneBase(users,namespace=randomUUID()){const s=createCleanSeed();for(const [key,value] of Object.entries(s)){if(Array.isArray(value))s[key]=[];else if(value&&typeof value==='object'&&key!=='settings')s[key]={};}s.recordReferences={version:1,namespace,next:{},entries:{},links:[]};Object.assign(s,{revision:0,demo:false,clean:true,users,events:[],seededEventCount:0,nextOrderSerial:1});ensureRecordReferences(s);return s;}
export function assertModuleWrite(store,standalone=false){const state=transferState(store);if(standalone?state?.phase!=='ACTIVE':['FROZEN','MOVED'].includes(state?.phase))fail(standalone?'Implements migration is being verified. Entries cannot be saved yet.':state.phase==='MOVED'?'Implements has moved to '+state.targetOrigin+'. Open the new site before saving.':'Implements is briefly paused for its move. Your entries remain on screen.','CONFLICT');}
export function guardModule(module,store,standalone,methods){for(const name of methods){const original=module[name];module[name]=function(...args){assertModuleWrite(store,standalone);return original.apply(this,args);};}return module;}
export function publicTransferState(store,standalone){const s=transferState(store);return {application:standalone?'implements':'purchase',phase:s?.phase||(standalone?'WAITING':'ORIGINAL'),transferId:s?.transferId||null,sha256:s?.sha256||null,targetOrigin:s?.targetOrigin||null};}
function origin(value){let u;try{u=new URL(value);}catch{fail('Invalid migration origin.');}if(u.protocol!=='https:'||u.username||u.password||u.pathname!=='/'||u.search||u.hash)fail('Use an HTTPS origin without a path.');return u.origin;}
export function freezeTransfer(store,input,actor,sourceOrigin,targetOrigin){
 if(actor.role!=='ADMIN')fail('Administrator required.','FORBIDDEN');
 const current=transferState(store);if(current){if(current.side==='source'&&current.phase==='FROZEN')return current;fail('A migration already exists.');}
 if(!Number.isSafeInteger(input.expectedRevision)||store.db.prepare('SELECT revision FROM implements_workspace WHERE id=1').get()?.revision!==input.expectedRevision)fail('Implements changed. Reload before preparing the transfer.','CONFLICT');
 const state={side:'source',phase:'FROZEN',transferId:randomUUID(),sourceOrigin:origin(sourceOrigin),targetOrigin:origin(targetOrigin),at:new Date().toISOString(),actorId:actor.id};
 return writeState(store,state);
}
export async function confirmTransfer(store,action,actor,fetchStatus=async url=>{const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Migration partner is unavailable.');return r.json();}){
 if(actor.role!=='ADMIN')fail('Administrator required.','FORBIDDEN');const s=transferState(store);if(!s?.sha256)fail('A verified transfer is required.');
 if(action==='cancel'){if(s.side!=='destination'||s.phase!=='INSTALLED')fail('Only an inactive imported destination may be cancelled.');return writeState(store,{...s,phase:'CANCELLED',confirmedAt:new Date().toISOString(),confirmedBy:actor.id});}
 const next=action==='activate'?'ACTIVE':action==='resume'?'CANCELLED':'MOVED';if(s.phase===next)return s;
 if(action==='activate'&&!(s.side==='destination'&&s.phase==='INSTALLED')||['complete','resume'].includes(action)&&!(s.side==='source'&&s.phase==='FROZEN')||!['activate','complete','resume'].includes(action))fail('Invalid migration transition.');
 const other=await fetchStatus((action==='activate'?s.sourceOrigin:s.targetOrigin)+'/api/implements-migration-status');
 if(other.transferId!==s.transferId||other.sha256!==s.sha256||other.phase!==(action==='activate'?'FROZEN':action==='resume'?'CANCELLED':'ACTIVE')||other.application!==(action==='activate'?'purchase':'implements'))fail('The other application has not verified this transfer.');
 // Recheck after the network wait; no stale transition may replace a newer state.
 if(JSON.stringify(transferState(store))!==JSON.stringify(s))fail('Migration changed. Reload.','CONFLICT');
 return writeState(store,{...s,phase:next,confirmedAt:new Date().toISOString(),confirmedBy:actor.id});
}
function fingerprint(db,tables){const result={};for(const table of tables){const h=createHash('sha256');let count=0;for(const row of db.prepare('SELECT rowid AS __transferRowid,* FROM '+q(table)+' ORDER BY rowid').iterate()){h.update(JSON.stringify(row)+'\n');count++;}result[table]={count,sha256:h.digest('hex')};}return result;}
export function makeTransferFile(database,target){
 const src=new DatabaseSync(database,{readOnly:true}),dst=new DatabaseSync(target);
 try{
  src.exec('BEGIN');const state=JSON.parse(src.prepare('SELECT payload FROM implements_transfer WHERE id=1').get().payload);if(state.side!=='source'||state.phase!=='FROZEN')throw Error('Source must be frozen.');
  const previous=JSON.parse(src.prepare('SELECT payload FROM workspace WHERE id=1').get().payload),users=previous.users.filter(u=>u.role==='ADMIN'||IMPLEMENTS_SCOPES.some(scope=>scopeAllowed({...u,active:true},scope))),ids=new Set(users.map(u=>u.id));
  if(!users.some(u=>u.role==='ADMIN'&&u.active!==false))throw Error('Active administrator required.');
  const tables=['workspace','accounts','audit_events',...TRANSFER_TABLES];dst.exec('PRAGMA foreign_keys=ON; BEGIN');
  for(const table of tables){const schema=src.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?").get(table)?.sql;if(!schema)throw Error('Missing transfer table: '+table);dst.exec(schema);}
  const base=standaloneBase(users,state.transferId);base.events=(previous.events||[]).filter(e=>e.entityType==='user'&&ids.has(e.entityId));dst.prepare('INSERT INTO workspace VALUES(1,?,?)').run(0,JSON.stringify(base));
  const audit=dst.prepare('INSERT INTO audit_events VALUES(?,?,?,?,?)');for(const e of base.events)audit.run(e.id,e.entityType,e.entityId,e.at,JSON.stringify(e));
  const account=dst.prepare('INSERT INTO accounts(id,email,password_hash,active) VALUES(?,?,?,?)');for(const a of src.prepare('SELECT * FROM accounts').iterate())if(ids.has(a.id))account.run(a.id,a.email,a.password_hash,a.active);
  for(const table of TRANSFER_TABLES){const columns=src.prepare('PRAGMA table_info('+q(table)+')').all().map(c=>c.name),insert=dst.prepare('INSERT INTO '+q(table)+'(rowid,'+columns.map(q).join(',')+') VALUES(?,'+columns.map(()=>'?').join(',')+')');for(const row of src.prepare('SELECT rowid AS __transferRowid,* FROM '+q(table)+' ORDER BY rowid').iterate())insert.run(row.__transferRowid,...columns.map(c=>row[c]));}
  for(const row of src.prepare('SELECT name,seq FROM sqlite_sequence').all())if(TRANSFER_TABLES.includes(row.name)){dst.prepare('DELETE FROM sqlite_sequence WHERE name=?').run(row.name);dst.prepare('INSERT INTO sqlite_sequence(name,seq) VALUES(?,?)').run(row.name,row.seq);}
  const checks=fingerprint(dst,tables),sourceChecks=fingerprint(src,TRANSFER_TABLES);for(const table of TRANSFER_TABLES)if(JSON.stringify(checks[table])!==JSON.stringify(sourceChecks[table]))throw Error('Transfer mismatch: '+table);
  const metadata={version:1,side:'source',phase:'FROZEN',transferId:state.transferId,sourceOrigin:state.sourceOrigin,targetOrigin:state.targetOrigin,at:state.at,actorId:state.actorId,checks,users:users.length};dst.exec('CREATE TABLE transfer_manifest(id INTEGER PRIMARY KEY CHECK(id=1),payload TEXT NOT NULL)');dst.prepare('INSERT INTO transfer_manifest VALUES(1,?)').run(JSON.stringify(metadata));
  dst.exec('COMMIT');src.exec('COMMIT');if(dst.prepare('PRAGMA integrity_check').get().integrity_check!=='ok'||dst.prepare('PRAGMA foreign_key_check').all().length)throw Error('Transfer integrity failed.');return metadata;
 }finally{src.close();dst.close();}
}
if(!isMainThread&&workerData?.kind==='implements-transfer'){
 try{const metadata=makeTransferFile(workerData.database,workerData.target);const h=createHash('sha256');for await(const chunk of createReadStream(workerData.target))h.update(chunk);parentPort.postMessage({sha256:h.digest('hex'),bytes:statSync(workerData.target).size,metadata});}catch(e){parentPort.postMessage({error:e.message});}
}
let exporting=false,importing=false;
export async function downloadTransfer(store,res){
 const state=transferState(store);if(state?.side!=='source'||state.phase!=='FROZEN')fail('Freeze Implements before exporting.');if(exporting)fail('Transfer export is already running.');exporting=true;
 const dir=mkdtempSync(join(tmpdir(),'fh-implements-export-')),target=join(dir,'implements.sqlite');
 try{
  const database=store.db.prepare('PRAGMA database_list').all().find(r=>r.name==='main').file;
  const info=await new Promise((resolve,reject)=>{const w=new Worker(new URL(import.meta.url),{workerData:{kind:'implements-transfer',database,target}});w.once('message',m=>m.error?reject(Error(m.error)):resolve(m));w.once('error',reject);w.once('exit',c=>{if(c)reject(Error('Transfer worker failed.'));});});
  if(transferState(store)?.transferId!==state.transferId)fail('Migration changed.');writeState(store,{...state,sha256:info.sha256,bytes:info.bytes,checks:info.metadata.checks});
  res.writeHead(200,{'Content-Type':'application/gzip','Cache-Control':'private, no-store','Content-Disposition':'attachment; filename="Implements_Transfer.sqlite.gz"','X-Transfer-SHA256':info.sha256,'X-Transfer-Bytes':String(info.bytes),'X-Transfer-Id':state.transferId});await pipeline(createReadStream(target),createGzip(),res);
 }finally{exporting=false;await rm(dir,{recursive:true,force:true});}
}
export function installTransferFile(store,filename,expectedSha,expectedSource,expectedTarget){
 if(transferState(store))fail('This database already has a transfer.');
 const db=store.db;for(const table of TRANSFER_TABLES)if(db.prepare('SELECT count(*) n FROM '+q(table)).get().n)fail('Destination contains business data. Import is only allowed into an empty application.');
 const src=new DatabaseSync(filename,{readOnly:true});let meta;
 try{
  src.exec('PRAGMA trusted_schema=OFF');
  if(src.prepare("SELECT 1 FROM sqlite_master WHERE type IN ('view','trigger')").get())fail('Transfer must contain data tables only.');
  if(src.prepare('PRAGMA integrity_check').get().integrity_check!=='ok'||src.prepare('PRAGMA foreign_key_check').all().length)fail('Invalid transfer database.');
  meta=JSON.parse(src.prepare('SELECT payload FROM transfer_manifest WHERE id=1').get().payload);
  if(meta.version!==1||meta.side!=='source'||meta.phase!=='FROZEN'||meta.sourceOrigin!==origin(expectedSource)||meta.targetOrigin!==origin(expectedTarget)||!/^[-a-f0-9]{36}$/.test(meta.transferId))fail('Transfer belongs to a different migration.');
  const expected=['workspace','accounts','audit_events',...TRANSFER_TABLES];
  const allowed=new Set([...expected,'transfer_manifest','sqlite_sequence']);if(src.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().some(t=>!allowed.has(t.name)))fail('Unexpected transfer tables.');
  for(const table of expected){const columns=d=>d.prepare('PRAGMA table_info('+q(table)+')').all().map(({name,type,notnull,pk})=>({name,type,notnull,pk}));if(JSON.stringify(columns(src))!==JSON.stringify(columns(db)))fail('Transfer schema mismatch: '+table);}
  if(JSON.stringify(fingerprint(src,expected))!==JSON.stringify(meta.checks))fail('Transfer content hash mismatch.');
  const base=JSON.parse(src.prepare('SELECT payload FROM workspace WHERE id=1').get().payload);if(Object.entries(base).some(([k,v])=>Array.isArray(v)&&!['users','events'].includes(k)&&v.length)||!base.users.some(u=>u.role==='ADMIN'&&u.active!==false))fail('Transfer includes unrelated data or lacks an administrator.');
  const accounts=src.prepare('SELECT id,active FROM accounts').all();if(!accounts.some(a=>a.active&&base.users.some(u=>u.id===a.id&&u.active!==false&&u.role==='ADMIN')))fail('Transfer has no active administrator login.');
  if(db.prepare('SELECT count(*) n FROM audit_events').get().n||db.prepare('SELECT count(*) n FROM request_receipts').get().n)fail('Destination has account history. Use a clean destination.');
 }finally{src.close();}
 db.prepare('ATTACH DATABASE ? AS incoming').run(filename);
 try{
  db.exec('BEGIN IMMEDIATE');db.exec('DELETE FROM sessions; DELETE FROM accounts; DELETE FROM workspace;');
  for(const table of ['workspace','accounts','audit_events',...TRANSFER_TABLES]){const columns=db.prepare('PRAGMA main.table_info('+q(table)+')').all().map(c=>q(c.name)).join(',');db.exec('INSERT INTO main.'+q(table)+'(rowid,'+columns+') SELECT rowid,'+columns+' FROM incoming.'+q(table));}
  for(const row of db.prepare('SELECT name,seq FROM incoming.sqlite_sequence').all())if(TRANSFER_TABLES.includes(row.name)){db.prepare('DELETE FROM main.sqlite_sequence WHERE name=?').run(row.name);db.prepare('INSERT INTO main.sqlite_sequence(name,seq) VALUES(?,?)').run(row.name,row.seq);}
  writeState(store,{...meta,side:'destination',phase:'INSTALLED',sha256:expectedSha,installedAt:new Date().toISOString()});
  if(db.prepare('PRAGMA main.foreign_key_check').all().length)throw Error('Imported foreign-key check failed.');
  if(JSON.stringify(fingerprint(db,['workspace','accounts','audit_events',...TRANSFER_TABLES]))!==JSON.stringify(meta.checks))throw Error('Imported data differs from transfer.');
  db.exec('COMMIT');store.profileSnapshot=null;
 }catch(e){db.exec('ROLLBACK');throw e;}finally{db.exec('DETACH DATABASE incoming');}
 return publicTransferState(store,true);
}
export async function receiveTransfer(store,req,sourceOrigin,targetOrigin){
 if(importing)fail('A transfer import is already running.');if(transferState(store))fail('This database already has a transfer.');
 const sha=req.headers['x-transfer-sha256'],bytes=Number(req.headers['x-transfer-bytes']);if(!/^[a-f0-9]{64}$/.test(sha||'')||!Number.isSafeInteger(bytes)||bytes<4096||bytes>512*1024*1024)fail('Valid transfer size and SHA-256 are required.');
 importing=true;const dir=mkdtempSync(join(tmpdir(),'fh-implements-import-')),file=join(dir,'transfer.sqlite');let compressed=0,decoded=0;const digest=createHash('sha256');
 try{
  await pipeline(req,new Transform({transform(chunk,encoding,cb){compressed+=chunk.length;cb(compressed>128*1024*1024?Error('Compressed transfer exceeds limit.'):null,chunk);}}),createGunzip(),new Transform({transform(chunk,encoding,cb){decoded+=chunk.length;digest.update(chunk);cb(decoded>bytes?Error('Transfer exceeds declared size.'):null,chunk);}}),createWriteStream(file,{flags:'wx',mode:0o600}));
  if(decoded!==bytes||digest.digest('hex')!==sha)fail('Transfer is incomplete or its checksum differs.');
  return installTransferFile(store,file,sha,sourceOrigin,targetOrigin);
 }finally{importing=false;await rm(dir,{recursive:true,force:true});}
}
