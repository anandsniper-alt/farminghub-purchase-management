import {createHash,randomUUID} from 'node:crypto';
import {RuleError,MAX_UPLOAD_BYTES,UPLOAD_EXTENSIONS} from '../shared/domain.mjs';
import {assertRoCostAccess,roCode,validateRoRecord,calculateRoCosting,worksheetComparisonSummary} from '../shared/ro-costing.mjs';
import {importantRoDocuments,forwardingAgentDocument,validateRoDriveUrl,RO_ESSENTIAL_DOCUMENT_KINDS} from '../shared/ro-documents.mjs';
import {landingItemMasterIndex,projectLandingPriceRows,queryLandingPrices,validateLandingPriceQuery} from '../shared/landing-prices.mjs';

const roDigest=value=>createHash('sha256').update(value).digest('hex');
export class RoCostingStore{
 constructor(store){this.store=store;this.db=store.db;this.db.exec(`
 CREATE TABLE IF NOT EXISTS ro_costings(ro TEXT PRIMARY KEY,revision INTEGER NOT NULL,supplier TEXT NOT NULL,status TEXT NOT NULL,payload TEXT NOT NULL,updated_at TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS ro_costings_status ON ro_costings(status,ro);
 CREATE TABLE IF NOT EXISTS ro_costing_events(id TEXT PRIMARY KEY,ro TEXT NOT NULL,revision INTEGER NOT NULL,actor_id TEXT NOT NULL,at TEXT NOT NULL,reason TEXT NOT NULL,before_value TEXT,after_value TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS ro_costing_events_ro ON ro_costing_events(ro,revision);
 CREATE TRIGGER IF NOT EXISTS ro_costing_events_no_update BEFORE UPDATE ON ro_costing_events BEGIN SELECT RAISE(ABORT,'RO audit events are append-only'); END;
 CREATE TRIGGER IF NOT EXISTS ro_costing_events_no_delete BEFORE DELETE ON ro_costing_events BEGIN SELECT RAISE(ABORT,'RO audit events are append-only'); END;
 CREATE TABLE IF NOT EXISTS ro_costing_documents(id TEXT PRIMARY KEY,ro TEXT NOT NULL REFERENCES ro_costings(ro),sha256 TEXT NOT NULL,name TEXT NOT NULL,kind TEXT NOT NULL,body BLOB NOT NULL,at TEXT NOT NULL,actor_id TEXT NOT NULL,UNIQUE(ro,sha256,name));
 CREATE INDEX IF NOT EXISTS ro_costing_documents_ro ON ro_costing_documents(ro,id);
 CREATE TRIGGER IF NOT EXISTS ro_documents_no_update BEFORE UPDATE ON ro_costing_documents BEGIN SELECT RAISE(ABORT,'RO documents are immutable'); END;
 CREATE TRIGGER IF NOT EXISTS ro_documents_no_delete BEFORE DELETE ON ro_costing_documents BEGIN SELECT RAISE(ABORT,'RO documents are immutable'); END;
 CREATE TABLE IF NOT EXISTS ro_document_classifications(sequence INTEGER PRIMARY KEY AUTOINCREMENT,document_id TEXT NOT NULL REFERENCES ro_costing_documents(id),kind TEXT NOT NULL,reason TEXT NOT NULL,actor_id TEXT NOT NULL,at TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS ro_document_classifications_file ON ro_document_classifications(document_id,sequence);
 CREATE TRIGGER IF NOT EXISTS ro_document_classifications_no_update BEFORE UPDATE ON ro_document_classifications BEGIN SELECT RAISE(ABORT,'Document classifications are append-only'); END;
 CREATE TRIGGER IF NOT EXISTS ro_document_classifications_no_delete BEFORE DELETE ON ro_document_classifications BEGIN SELECT RAISE(ABORT,'Document classifications are append-only'); END;
 CREATE TABLE IF NOT EXISTS ro_drive_documents(id TEXT PRIMARY KEY,ro TEXT NOT NULL REFERENCES ro_costings(ro),file_id TEXT NOT NULL,drive_url TEXT NOT NULL,sha256 TEXT NOT NULL,name TEXT NOT NULL,kind TEXT NOT NULL,bytes INTEGER NOT NULL,reason TEXT NOT NULL,at TEXT NOT NULL,actor_id TEXT NOT NULL,UNIQUE(ro,file_id));
 CREATE INDEX IF NOT EXISTS ro_drive_documents_ro ON ro_drive_documents(ro,id);
 CREATE INDEX IF NOT EXISTS ro_drive_documents_checksum ON ro_drive_documents(ro,sha256,kind);
 CREATE TRIGGER IF NOT EXISTS ro_drive_documents_no_update BEFORE UPDATE ON ro_drive_documents BEGIN SELECT RAISE(ABORT,'Drive document references are immutable'); END;
 CREATE TRIGGER IF NOT EXISTS ro_drive_documents_no_delete BEFORE DELETE ON ro_drive_documents BEGIN SELECT RAISE(ABORT,'Drive document references are immutable'); END;
 CREATE TABLE IF NOT EXISTS ro_source_libraries(sequence INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,drive_url TEXT NOT NULL,reason TEXT NOT NULL,actor_id TEXT NOT NULL,at TEXT NOT NULL);
 CREATE TRIGGER IF NOT EXISTS ro_source_libraries_no_update BEFORE UPDATE ON ro_source_libraries BEGIN SELECT RAISE(ABORT,'Source library history is append-only'); END;
 CREATE TRIGGER IF NOT EXISTS ro_source_libraries_no_delete BEFORE DELETE ON ro_source_libraries BEGIN SELECT RAISE(ABORT,'Source library history is append-only'); END;
 CREATE VIEW IF NOT EXISTS ro_document_metadata AS
 SELECT d.ro,d.id,d.name,coalesce(c.kind,d.kind) kind,d.kind originalKind,coalesce(c.sequence,0) classificationSequence,d.sha256,length(d.body) bytes,d.at,'local' storage,NULL driveUrl
 FROM ro_costing_documents d LEFT JOIN ro_document_classifications c ON c.sequence=(SELECT max(sequence) FROM ro_document_classifications WHERE document_id=d.id)
 UNION ALL SELECT ro,id,name,kind,kind,0,sha256,bytes,at,'google-drive',drive_url FROM ro_drive_documents;
 `);}
 actor(id,write=false){const actor=this.store.read().users.find(u=>u.id===id);assertRoCostAccess(actor,write);return actor;}
 landingPricesExport(actorId,query={}){return this.landingPrices(actorId,query,{exportAll:true});}
 landingPrices(actorId,query={},options={}){
  this.actor(actorId);validateLandingPriceQuery(query);
  const workspaceRevision=this.store.revision();
  if(!this.landingCache||this.landingCache.workspaceRevision!==workspaceRevision)this.landingCache={workspaceRevision,masterIndex:landingItemMasterIndex(this.store.read()),records:new Map()};
  const cache=this.landingCache,identities=this.db.prepare('SELECT ro,revision FROM ro_costings ORDER BY ro COLLATE NOCASE').all(),current=new Set(),rows=[];
  let rosWithItems=0;
  for(const identity of identities){
   current.add(identity.ro);let item=cache.records.get(identity.ro);
   if(!item||item.revision!==identity.revision){const record=JSON.parse(this.db.prepare('SELECT payload FROM ro_costings WHERE ro=?').get(identity.ro).payload);item={revision:identity.revision,rows:projectLandingPriceRows(record,cache.masterIndex)};cache.records.set(identity.ro,item);}
   if(item.rows.length)rosWithItems++;rows.push(...item.rows);
  }
  for(const ro of cache.records.keys())if(!current.has(ro))cache.records.delete(ro);
  return queryLandingPrices(rows,query,{totalRos:identities.length,rosWithItems,rosWithoutItems:identities.length-rosWithItems},options);
 }
 list(actorId,{q='',status='',offset=0,limit=50}={}){
  this.actor(actorId);if(typeof q!=='string'||q.length>200||!['','Pending','Complete'].includes(status)||!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(limit)||limit<1||limit>50)throw new RuleError('Invalid RO list filter.');
  const query='%'+q.replace(/[\\%_]/g,'\\$&')+'%',where="(ro LIKE ? ESCAPE '\\' OR supplier LIKE ? ESCAPE '\\') AND (?='' OR status=?)",args=[query,query,status,status];
  const total=this.db.prepare('SELECT count(*) n FROM ro_costings WHERE '+where).get(...args).n;
  const rows=this.db.prepare('SELECT ro,revision,payload,updated_at FROM ro_costings WHERE '+where+' ORDER BY ro COLLATE NOCASE LIMIT ? OFFSET ?').all(...args,limit,offset).map(r=>{const record=JSON.parse(r.payload),cost=calculateRoCosting(record),important=this.important(r.ro,record);return {ro:r.ro,revision:r.revision,supplier:record.supplier,invoices:record.invoices.map(i=>i.invoice),inwardDate:record.inwardDate,boeDate:record.boeDate,updatedAt:r.updated_at,...cost,worksheetComparison:worksheetComparisonSummary(record),documents:important.commercialInvoices.length+important.inwardBoe.length+important.importerCopies.length};});
  return {rows,total,offset,limit,sourceLibrary:this.sourceLibrary(actorId)};
 }
 detail(actorId,ro){this.actor(actorId);const row=this.db.prepare('SELECT * FROM ro_costings WHERE ro=?').get(roCode(ro));if(!row)throw new RuleError('RO costing not found.','NOT_FOUND');const record=JSON.parse(row.payload);return {record,revision:row.revision,cost:calculateRoCosting(record),sourceLibrary:this.sourceLibrary(actorId),importantDocuments:this.important(ro,record),documents:this.documents(actorId,ro),history:this.db.prepare('SELECT revision,actor_id,at,reason FROM ro_costing_events WHERE ro=? ORDER BY revision DESC LIMIT 50').all(ro)};}
 important(ro,record){const importantFiles=this.db.prepare("SELECT * FROM ro_document_metadata WHERE ro=? AND (kind LIKE 'Commercial invoice%' OR kind LIKE 'Forwarding agent %' OR kind IN ('Inward BOE','Assessed BOE','Importer copy')) ORDER BY id LIMIT 100").all(ro);return importantRoDocuments(record,importantFiles);}
 classify(actorId,{id,sha256,kind,reason,expectedSequence},requestId){
  if(typeof id!=='string'||typeof sha256!=='string'||(!forwardingAgentDocument(kind)&&!['Shipping-line invoice','Overseas agent debit note','Commercial invoice','Inward BOE','Importer copy'].includes(kind))||typeof reason!=='string'||!reason.trim()||reason.length>2000||!Number.isSafeInteger(expectedSequence)||expectedSequence<0)throw new RuleError('Provide a verified document role, reason and current classification.');
  this.db.exec('BEGIN IMMEDIATE');try{
   const actor=this.actor(actorId,true),input={id,sha256,kind,reason,expectedSequence},checked=this.store.requestCheck(actor,requestId,'RO_DOCUMENT_CLASSIFICATION',input);if(checked?.replayed){this.db.exec('COMMIT');return checked.result;}
   const file=this.db.prepare('SELECT sha256 FROM ro_costing_documents WHERE id=?').get(id);if(!file)throw new RuleError('Document unavailable.','NOT_FOUND');if(file.sha256!==sha256)throw new RuleError('Document checksum differs from the reviewed source.');
   const current=this.db.prepare('SELECT max(sequence) sequence FROM ro_document_classifications WHERE document_id=?').get(id).sequence||0;if(current!==expectedSequence)throw new RuleError('Document classification changed. Reload before saving.','CONFLICT');
   const row=this.db.prepare('INSERT INTO ro_document_classifications(document_id,kind,reason,actor_id,at) VALUES(?,?,?,?,?)').run(id,kind,reason,actor.id,new Date().toISOString()),result={id,sequence:Number(row.lastInsertRowid)};this.store.requestSave(actor.id,requestId,'RO_DOCUMENT_CLASSIFICATION',checked,result);this.db.exec('COMMIT');return result;
  }catch(error){this.db.exec('ROLLBACK');throw error;}
 }
 documents(actorId,ro,offset=0){this.actor(actorId);roCode(ro);if(!Number.isSafeInteger(offset)||offset<0)throw new RuleError('Invalid document page.');return {rows:this.db.prepare('SELECT * FROM ro_document_metadata WHERE ro=? ORDER BY id LIMIT 100 OFFSET ?').all(ro,offset),total:this.db.prepare('SELECT count(*) n FROM ro_document_metadata WHERE ro=?').get(ro).n,offset};}
 sourceLibrary(actorId){this.actor(actorId);return this.db.prepare('SELECT sequence,name,drive_url driveUrl,at FROM ro_source_libraries ORDER BY sequence DESC LIMIT 1').get()||null;}
 saveSourceLibrary(actorId,{name,driveUrl,reason,expectedSequence},requestId){
  const link=validateRoDriveUrl(driveUrl,{library:true});
  if(typeof name!=='string'||!name.trim()||name.length>200||typeof reason!=='string'||!reason.trim()||reason.length>2000||!Number.isSafeInteger(expectedSequence)||expectedSequence<0)throw new RuleError('Provide the source library name, reason and current revision.');
  this.db.exec('BEGIN IMMEDIATE');try{
   const actor=this.actor(actorId,true),input={name,driveUrl:link.url,reason,expectedSequence},checked=this.store.requestCheck(actor,requestId,'RO_SOURCE_LIBRARY',input);if(checked?.replayed){this.db.exec('COMMIT');return checked.result;}
   const current=this.db.prepare('SELECT max(sequence) sequence FROM ro_source_libraries').get().sequence||0;if(current!==expectedSequence)throw new RuleError('Source library changed. Reload before saving.','CONFLICT');
   this.db.prepare('INSERT INTO ro_source_libraries(name,drive_url,reason,actor_id,at) VALUES(?,?,?,?,?)').run(name,link.url,reason,actor.id,new Date().toISOString());
   const result=this.sourceLibrary(actorId);this.store.requestSave(actor.id,requestId,'RO_SOURCE_LIBRARY',checked,result);this.db.exec('COMMIT');return result;
  }catch(error){this.db.exec('ROLLBACK');throw error;}
 }
 linkDriveDocument(actorId,{ro,name,kind,driveUrl,sha256,bytes,reason},requestId){
  roCode(ro);const link=validateRoDriveUrl(driveUrl);
  if(typeof name!=='string'||!name.length||name.length>200||/[\x00-\x1f\\/]/.test(name)||!name.toLowerCase().endsWith('.pdf')||!RO_ESSENTIAL_DOCUMENT_KINDS.includes(kind)||typeof sha256!=='string'||!/^[a-f0-9]{64}$/.test(sha256)||!Number.isSafeInteger(bytes)||bytes<1||bytes>MAX_UPLOAD_BYTES||typeof reason!=='string'||!reason.trim()||reason.length>2000)throw new RuleError('Provide a reviewed essential PDF reference, checksum, size and reason.');
  this.db.exec('BEGIN IMMEDIATE');try{
   const actor=this.actor(actorId,true);if(!this.db.prepare('SELECT ro FROM ro_costings WHERE ro=?').get(ro))throw new RuleError('Create the exact RO before linking its document.');
   const input={ro,name,kind,driveUrl:link.url,sha256,bytes,reason},checked=this.store.requestCheck(actor,requestId,'RO_DRIVE_DOCUMENT',input);if(checked?.replayed){this.db.exec('COMMIT');return checked.result;}
   const existing=this.db.prepare('SELECT * FROM ro_drive_documents WHERE ro=? AND file_id=?').get(ro,link.fileId);
   if(existing&&(existing.sha256!==sha256||existing.kind!==kind||existing.name!==name||existing.bytes!==bytes))throw new RuleError('Existing Drive reference differs. Preserve it and review the source conflict.','CONFLICT');
   const duplicate=this.db.prepare('SELECT * FROM ro_drive_documents WHERE ro=? AND sha256=? AND kind=? ORDER BY id LIMIT 1').get(ro,sha256,kind);
   const result={id:existing?.id||duplicate?.id||randomUUID()};if(!existing&&!duplicate)this.db.prepare('INSERT INTO ro_drive_documents VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(result.id,ro,link.fileId,link.url,sha256,name,kind,bytes,reason,new Date().toISOString(),actor.id);
   this.store.requestSave(actor.id,requestId,'RO_DRIVE_DOCUMENT',checked,result);this.db.exec('COMMIT');return result;
  }catch(error){this.db.exec('ROLLBACK');throw error;}
 }
 save(actorId,input,requestId){return this.import(actorId,{records:[input],reason:input.reason},requestId)[0];}
 import(actorId,input,requestId){
  if(!Array.isArray(input?.records)||!input.records.length||input.records.length>30||typeof input.reason!=='string'||!input.reason.trim()||input.reason.length>2000)throw new RuleError('Provide 1–30 RO records and a reason.');
  this.db.exec('BEGIN IMMEDIATE');try{
   const actor=this.actor(actorId,true),checked=this.store.requestCheck(actor,requestId,'RO_COSTINGS',input);
   if(checked?.replayed){this.db.exec('COMMIT');return checked.result;}
   const out=[],seen=new Set();for(const entry of input.records){
    const ro=roCode(entry.record?.ro);if(seen.has(ro))throw new RuleError('Duplicate RO in import.');seen.add(ro);
    const before=this.db.prepare('SELECT * FROM ro_costings WHERE ro=?').get(ro),revision=before?.revision||0;
    if(entry.expectedRevision!==revision)throw new RuleError('RO '+ro+' changed. Reload it before saving; nothing was overwritten.','CONFLICT');
    // Legacy editors omit reference fields. Preserve both before validating their links.
    const merged={...entry.record},previous=before?JSON.parse(before.payload):{};
    for(const key of ['worksheetComparison','purchaseItems'])if(!Object.hasOwn(merged,key)&&previous[key])merged[key]=previous[key];
    const record=validateRoRecord(merged);
    const at=new Date().toISOString(),next=revision+1,status=calculateRoCosting(record).status;
    this.db.prepare('INSERT INTO ro_costings VALUES(?,?,?,?,?,?) ON CONFLICT(ro) DO UPDATE SET revision=excluded.revision,supplier=excluded.supplier,status=excluded.status,payload=excluded.payload,updated_at=excluded.updated_at').run(record.ro,next,record.supplier,status,JSON.stringify(record),at);
    this.db.prepare('INSERT INTO ro_costing_events VALUES(?,?,?,?,?,?,?,?)').run(randomUUID(),record.ro,next,actor.id,at,input.reason,before?.payload||null,JSON.stringify(record));out.push({ro:record.ro,revision:next});
   }
   this.store.requestSave(actor.id,requestId,'RO_COSTINGS',checked,out);this.db.exec('COMMIT');return out;
  }catch(error){this.db.exec('ROLLBACK');throw error;}
 }
 upload(actorId,{ro,name,kind='Supporting document',base64,sha256},requestId){
  roCode(ro);if(typeof name!=='string'||!name.length||name.length>200||/[\x00-\x1f\\/]/.test(name)||![...UPLOAD_EXTENSIONS,'xls'].includes(name.split('.').at(-1).toLowerCase()))throw new RuleError('Unsupported evidence filename.');
  if(typeof kind!=='string'||kind.length>100||typeof base64!=='string'||!base64.length||base64.length%4!==0||! /^[A-Za-z0-9+/]*={0,2}$/.test(base64))throw new RuleError('Invalid document encoding.');
  const bytes=Buffer.from(base64,'base64');if(!bytes.length||bytes.length>MAX_UPLOAD_BYTES)throw new RuleError('Evidence must be non-empty and at most 50 MB.');const hash=roDigest(bytes);if(sha256&&hash!==sha256)throw new RuleError('Document checksum differs from its register.');
  this.db.exec('BEGIN IMMEDIATE');try{
   const actor=this.actor(actorId,true);if(!this.db.prepare('SELECT ro FROM ro_costings WHERE ro=?').get(ro))throw new RuleError('Create the RO costing before uploading evidence.');
   const input={ro,name,kind,sha256:hash},checked=this.store.requestCheck(actor,requestId,'RO_DOCUMENT',input);if(checked?.replayed){this.db.exec('COMMIT');return checked.result;}
   let row=this.db.prepare('SELECT id FROM ro_costing_documents WHERE ro=? AND sha256=? AND name=?').get(ro,hash,name);
   if(!row){row={id:randomUUID()};this.db.prepare('INSERT INTO ro_costing_documents VALUES(?,?,?,?,?,?,?,?)').run(row.id,ro,hash,name,kind,bytes,new Date().toISOString(),actor.id);}
   this.store.requestSave(actor.id,requestId,'RO_DOCUMENT',checked,row);this.db.exec('COMMIT');return row;
  }catch(error){this.db.exec('ROLLBACK');throw error;}
 }
 download(actorId,id){this.actor(actorId);const row=this.db.prepare('SELECT name,body,sha256 FROM ro_costing_documents WHERE id=?').get(id);if(!row)throw new RuleError('Document unavailable.','NOT_FOUND');return row;}
}
