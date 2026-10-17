import {createHash,randomUUID} from 'node:crypto';
import {queryLaeStockAging} from '../shared/lae-stock-aging.mjs';
import {RuleError} from '../shared/domain.mjs';
import {assertLaeStockAccess,validateLaeStockSnapshot,queryLaeStock} from '../shared/lae-stock-costing.mjs';

export class LaeStockStore{
 constructor(store){this.store=store;this.db=store.db;this.cache=null;this.db.exec(`
 CREATE TABLE IF NOT EXISTS lae_stock_snapshots(id TEXT PRIMARY KEY,content_sha256 TEXT NOT NULL UNIQUE,metadata TEXT NOT NULL,created_at TEXT NOT NULL,actor_id TEXT NOT NULL,reason TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS lae_stock_rows(snapshot_id TEXT NOT NULL REFERENCES lae_stock_snapshots(id),source_id TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(snapshot_id,source_id));
 CREATE TABLE IF NOT EXISTS lae_stock_active(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL,snapshot_id TEXT NOT NULL REFERENCES lae_stock_snapshots(id));
 CREATE TABLE IF NOT EXISTS lae_stock_events(id TEXT PRIMARY KEY,revision INTEGER NOT NULL,previous_snapshot TEXT,next_snapshot TEXT NOT NULL REFERENCES lae_stock_snapshots(id),actor_id TEXT NOT NULL,at TEXT NOT NULL,reason TEXT NOT NULL);
 CREATE TRIGGER IF NOT EXISTS lae_stock_snapshots_no_update BEFORE UPDATE ON lae_stock_snapshots BEGIN SELECT RAISE(ABORT,'Stock snapshots are immutable'); END;
 CREATE TRIGGER IF NOT EXISTS lae_stock_snapshots_no_delete BEFORE DELETE ON lae_stock_snapshots BEGIN SELECT RAISE(ABORT,'Stock snapshots are immutable'); END;
 CREATE TRIGGER IF NOT EXISTS lae_stock_rows_no_update BEFORE UPDATE ON lae_stock_rows BEGIN SELECT RAISE(ABORT,'Stock source rows are immutable'); END;
 CREATE TRIGGER IF NOT EXISTS lae_stock_rows_no_delete BEFORE DELETE ON lae_stock_rows BEGIN SELECT RAISE(ABORT,'Stock source rows are immutable'); END;
 CREATE TRIGGER IF NOT EXISTS lae_stock_events_no_update BEFORE UPDATE ON lae_stock_events BEGIN SELECT RAISE(ABORT,'Stock history is append-only'); END;
 CREATE TRIGGER IF NOT EXISTS lae_stock_events_no_delete BEFORE DELETE ON lae_stock_events BEGIN SELECT RAISE(ABORT,'Stock history is append-only'); END;
 `);}
 actor(id,write=false){const actor=this.store.read().users.find(u=>u.id===id);assertLaeStockAccess(actor,write);return actor;}
 read(actorId,query={},options={}){
  this.actor(actorId);const active=this.db.prepare('SELECT * FROM lae_stock_active WHERE id=1').get();if(!active)return queryLaeStock([],query,null,options);
  if(this.cache?.revision!==active.revision){const data=this.db.prepare('SELECT * FROM lae_stock_snapshots WHERE id=?').get(active.snapshot_id);this.cache={revision:active.revision,snapshot:{...JSON.parse(data.metadata),id:data.id,revision:active.revision,importedAt:data.created_at},rows:this.db.prepare('SELECT payload FROM lae_stock_rows WHERE snapshot_id=? ORDER BY source_id').all(data.id).map(r=>JSON.parse(r.payload))};}
  return queryLaeStock(this.cache.rows,query,this.cache.snapshot,options);
 }
 aging(actorId,query={},purchaseDates=()=>[]){const report=this.read(actorId,{}, {exportAll:true}),ros=[...new Set(report.rows.filter(r=>!r.importDate&&/^\d+[A-Za-z0-9._/-]*$/.test(r.assignedRo||'')).map(r=>r.assignedRo))];return queryLaeStockAging(report.rows,query,report.snapshot,query.basis==='warehouse'?[]:purchaseDates(ros));}
 import(actorId,input,requestId){
  const actor=this.actor(actorId,true);if(!Number.isSafeInteger(input?.expectedRevision)||input.expectedRevision<0||typeof input.reason!=='string'||!input.reason.trim()||input.reason.length>2000)throw new RuleError('Provide a current stock revision and import reason.');
  const snapshot=validateLaeStockSnapshot(input.snapshot),contentHash=createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');this.db.exec('BEGIN IMMEDIATE');
  try{const checked=this.store.requestCheck(actor,requestId,'LAE_STOCK_IMPORT',input);if(checked?.replayed){this.db.exec('COMMIT');return checked.result;}const active=this.db.prepare('SELECT * FROM lae_stock_active WHERE id=1').get();if((active?.revision||0)!==input.expectedRevision)throw new RuleError('The closing-stock snapshot changed. Reload before importing.','CONFLICT');
   let stored=this.db.prepare('SELECT id FROM lae_stock_snapshots WHERE content_sha256=?').get(contentHash);const at=new Date().toISOString();if(!stored){stored={id:randomUUID()};const {rows,...metadata}=snapshot;this.db.prepare('INSERT INTO lae_stock_snapshots VALUES(?,?,?,?,?,?)').run(stored.id,contentHash,JSON.stringify(metadata),at,actor.id,input.reason);const insert=this.db.prepare('INSERT INTO lae_stock_rows VALUES(?,?,?)');for(const row of rows)insert.run(stored.id,row.id,JSON.stringify(row));}
   if(active?.snapshot_id===stored.id){const result={id:stored.id,revision:active.revision,rows:snapshot.rows.length,unchanged:true};this.store.requestSave(actor.id,requestId,'LAE_STOCK_IMPORT',checked,result);this.db.exec('COMMIT');return result;}
   const revision=(active?.revision||0)+1;this.db.prepare('INSERT INTO lae_stock_active VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,snapshot_id=excluded.snapshot_id').run(revision,stored.id);this.db.prepare('INSERT INTO lae_stock_events VALUES(?,?,?,?,?,?,?)').run(randomUUID(),revision,active?.snapshot_id||null,stored.id,actor.id,at,input.reason);
   const result={id:stored.id,revision,rows:snapshot.rows.length,contentHash};this.store.requestSave(actor.id,requestId,'LAE_STOCK_IMPORT',checked,result);this.db.exec('COMMIT');this.cache=null;return result;
  }catch(e){this.db.exec('ROLLBACK');throw e;}
 }
}
