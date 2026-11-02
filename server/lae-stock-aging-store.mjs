import {createHash,randomUUID} from 'node:crypto';
import {RuleError} from '../shared/domain.mjs';
import {assertLaeStockAccess} from '../shared/lae-stock-costing.mjs';
import {validateLaeAgingAllocationSnapshot,queryLaeAgingAllocation,validateLaeAgingAllocationQuery} from '../shared/lae-stock-aging-allocation.mjs';

const KIND='LAE_AGING_ALLOCATION_IMPORT';
const MAX_BYTES=48*1024*1024;
const digest=text=>createHash('sha256').update(text).digest('hex');
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
function historyHash(event){return digest(JSON.stringify(event));}
function publicMetadata(metadata){
 const safe={};
 for(const key of ['planPeriod','planBasis','stockScope','forecastPeriod']){
  const value=metadata?.[key];
  if(typeof value==='string'&&value.length<=500&&!/[\u0000-\u001f]|[a-z]:[\\/]|\\\\|\/(?:users|home|mnt|tmp|app)\//i.test(value))safe[key]=value;
 }
 return safe;
}

// Separate evidence store: imports never replace lae_stock_* or purchase-workspace data.
export class LaeStockAgingStore{
 constructor(store){
  this.store=store;this.db=store.db;this.cache=null;
  this.db.exec(`
   CREATE TABLE IF NOT EXISTS lae_aging_snapshots(id TEXT PRIMARY KEY,content_sha256 TEXT NOT NULL UNIQUE,payload TEXT NOT NULL,created_at TEXT NOT NULL,actor_id TEXT NOT NULL,reason TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS lae_aging_active(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL CHECK(revision>0),snapshot_id TEXT NOT NULL REFERENCES lae_aging_snapshots(id));
   CREATE TABLE IF NOT EXISTS lae_aging_events(id TEXT PRIMARY KEY,revision INTEGER NOT NULL UNIQUE,previous_snapshot TEXT REFERENCES lae_aging_snapshots(id),next_snapshot TEXT NOT NULL REFERENCES lae_aging_snapshots(id),actor_id TEXT NOT NULL,at TEXT NOT NULL,reason TEXT NOT NULL,request_id TEXT NOT NULL,previous_hash TEXT,content_sha256 TEXT NOT NULL,event_sha256 TEXT NOT NULL UNIQUE);
   CREATE TRIGGER IF NOT EXISTS lae_aging_snapshots_no_update BEFORE UPDATE ON lae_aging_snapshots BEGIN SELECT RAISE(ABORT,'Aging snapshots are immutable'); END;
   CREATE TRIGGER IF NOT EXISTS lae_aging_snapshots_no_delete BEFORE DELETE ON lae_aging_snapshots BEGIN SELECT RAISE(ABORT,'Aging snapshots are immutable'); END;
   CREATE TRIGGER IF NOT EXISTS lae_aging_events_no_update BEFORE UPDATE ON lae_aging_events BEGIN SELECT RAISE(ABORT,'Aging history is immutable'); END;
   CREATE TRIGGER IF NOT EXISTS lae_aging_events_no_delete BEFORE DELETE ON lae_aging_events BEGIN SELECT RAISE(ABORT,'Aging history is immutable'); END;
  `);
 }
 actor(id,write=false){const actor=this.store.userProfile(id);assertLaeStockAccess(actor,write);return actor;}
 history(active){
  let previous=null;
  for(const event of this.db.prepare('SELECT * FROM lae_aging_events ORDER BY revision').all()){
   const {event_sha256,...fields}=event;
   if(event.revision!==(previous?.revision||0)+1||event.previous_hash!==(previous?.event_sha256||null)||event.previous_snapshot!==(previous?.next_snapshot||null)||historyHash(fields)!==event_sha256)throw new RuleError('Aging history integrity check failed.','CONFLICT');
   previous=event;
  }
  if((previous?.revision||0)!==(active?.revision||0)||previous?.next_snapshot!==active?.snapshot_id)throw new RuleError('Aging active revision integrity check failed.','CONFLICT');
  return previous;
 }
 read(actorId,query={}){
  // Do not serve cached data until the current account permissions have been checked.
  this.actor(actorId);
  const active=this.db.prepare('SELECT * FROM lae_aging_active WHERE id=1').get();
  if(!active){this.history(active);validateLaeAgingAllocationQuery(query);return {snapshot:null,empty:true,message:'No reviewed forecast-scoped aging snapshot has been imported.',groups:[],summary:[],facets:{},drilldown:{rows:[],total:0,page:1,pageSize:50,pages:0},allocation:{plans:[]}};}
  if(this.cache?.revision!==active.revision||this.cache?.id!==active.snapshot_id){
   const saved=this.db.prepare('SELECT * FROM lae_aging_snapshots WHERE id=?').get(active.snapshot_id);
   const event=this.history(active);
   if(!saved||digest(saved.payload)!==saved.content_sha256||!event||event.next_snapshot!==saved.id||event.content_sha256!==saved.content_sha256)throw new RuleError('Aging snapshot integrity check failed. Restore verified evidence before continuing.','CONFLICT');
   const snapshot=freeze(validateLaeAgingAllocationSnapshot(JSON.parse(saved.payload)));
   this.cache={id:saved.id,revision:active.revision,snapshot,queries:new Map(),info:freeze({id:saved.id,revision:active.revision,contentHash:saved.content_sha256,stockDate:snapshot.stockDate,costDate:snapshot.costDate,metadata:publicMetadata(snapshot.metadata),...(snapshot.allocationPolicy?{allocationPolicy:snapshot.allocationPolicy}:{}),importedAt:saved.created_at,rows:snapshot.rows.length,plans:snapshot.plans.length})};
  }
  const key=JSON.stringify(Object.entries(query).sort(([a],[b])=>a.localeCompare(b)));
  let result=this.cache.queries.get(key);
  if(!result){
   result=freeze({...queryLaeAgingAllocation(this.cache.snapshot,query),snapshot:this.cache.info,empty:false});
   if(this.cache.queries.size>=32)this.cache.queries.delete(this.cache.queries.keys().next().value);
   this.cache.queries.set(key,result);
  }
  return structuredClone(result);
 }
 import(actorId,input,requestId){
  this.actor(actorId,true);
  if(!Number.isSafeInteger(input?.expectedRevision)||input.expectedRevision<0||typeof input.reason!=='string'||!input.reason.trim()||input.reason.length>2000)throw new RuleError('Provide the current aging revision and an import reason.');
  if(typeof requestId!=='string'||! /^[A-Za-z0-9_-]{12,120}$/.test(requestId))throw new RuleError('A valid idempotency key is required for an aging import.');
  const validated=validateLaeAgingAllocationSnapshot(input.snapshot),payload=JSON.stringify(validated);
  if(Buffer.byteLength(payload)>MAX_BYTES)throw new RuleError('Aging snapshot is too large.');
  const contentHash=digest(payload);
  if(input.contentHash!==undefined&&input.contentHash!==contentHash)throw new RuleError('Aging snapshot content hash does not match.');
  this.db.exec('BEGIN IMMEDIATE');
  try{
   const actor=this.actor(actorId,true);
   const checked=this.store.requestCheck(actor,requestId,KIND,input);
   if(checked?.replayed){this.db.exec('COMMIT');return checked.result;}
   const active=this.db.prepare('SELECT * FROM lae_aging_active WHERE id=1').get();
   if((active?.revision||0)!==input.expectedRevision)throw new RuleError('The aging snapshot changed. Reload before importing.','CONFLICT');
   const previous=this.history(active);
   let saved=this.db.prepare('SELECT id FROM lae_aging_snapshots WHERE content_sha256=?').get(contentHash);
   const at=new Date().toISOString();
   if(!saved){saved={id:randomUUID()};this.db.prepare('INSERT INTO lae_aging_snapshots VALUES(?,?,?,?,?,?)').run(saved.id,contentHash,payload,at,actor.id,input.reason);}
   if(active?.snapshot_id===saved.id){
    const result={id:saved.id,revision:active.revision,contentHash,rows:validated.rows.length,plans:validated.plans.length,unchanged:true};
    this.store.requestSave(actor.id,requestId,KIND,checked,result);this.db.exec('COMMIT');return result;
   }
   const revision=(active?.revision||0)+1;
   const event={id:randomUUID(),revision,previous_snapshot:active?.snapshot_id||null,next_snapshot:saved.id,actor_id:actor.id,at,reason:input.reason,request_id:requestId,previous_hash:previous?.event_sha256||null,content_sha256:contentHash};
   this.db.prepare('INSERT INTO lae_aging_events VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(...Object.values(event),historyHash(event));
   this.db.prepare('INSERT INTO lae_aging_active VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,snapshot_id=excluded.snapshot_id').run(revision,saved.id);
   const result={id:saved.id,revision,contentHash,rows:validated.rows.length,plans:validated.plans.length};
   this.store.requestSave(actor.id,requestId,KIND,checked,result);
   this.db.exec('COMMIT');this.cache=null;return result;
  }catch(error){this.db.exec('ROLLBACK');throw error;}
 }
}
