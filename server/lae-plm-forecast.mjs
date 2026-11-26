import {createHash} from 'node:crypto';
import {RuleError} from '../shared/domain.mjs';
import {assertLaeStockAccess} from '../shared/lae-stock-costing.mjs';

function requireText(value, label, maximum, required = true) {
  if (!required && value === null) return null;
  if (typeof value !== 'string' || (required && !value.trim()) || value.length > maximum || /[\x00-\x08\x0b\x0c\x0e-\x1f]/u.test(value)) {
    throw new RuleError('Invalid forecast '+label+'.');
  }
  return value.trim();
}

function catalogPayload(source, items) {
  const fileName = requireText(source?.fileName, 'source filename', 240);
  const sheet = requireText(source?.sheet, 'worksheet', 100);
  if (/[/\\]/u.test(fileName) || !/^[a-f0-9]{64}$/.test(source?.sha256)) throw new RuleError('Invalid forecast source.');
  if (!Array.isArray(items) || !items.length || items.length > 20000) throw new RuleError('Invalid forecast item count.');
  const codes = new Set();
  const rows = new Set();
  const records = items.map(item => {
    const code = requireText(item?.code, 'item code', 120);
    const {sourceRow,skuStatus} = item;
    if (codes.has(code.toUpperCase()) || !Number.isSafeInteger(sourceRow) || sourceRow < 1 || rows.has(sourceRow) || !['YES','NO',''].includes(skuStatus)) {
      throw new RuleError('Invalid or duplicate forecast item at '+code+'.');
    }
    codes.add(code.toUpperCase());
    rows.add(sourceRow);
    return {code, name:requireText(item.name,'item name',2000,false), category:requireText(item.category,'category',240),
      engine:requireText(item.engine,'engine',500,false),grade:requireText(item.grade,'grade',500,false),sourceRow,skuStatus};
  });
  return {source:{fileName,sheet,sha256:source.sha256},items:records};
}

function hasCatalog(db) {
  return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='lae_plm_forecasts'").get());
}

export function readPlmForecast(store, actorId) {
  assertLaeStockAccess(store.userProfile(actorId));
  const latest = hasCatalog(store.db) && store.db.prepare('SELECT revision, payload FROM lae_plm_forecasts ORDER BY revision DESC LIMIT 1').get();
  return latest ? {revision:latest.revision,...JSON.parse(latest.payload)} : {revision:0,source:null,items:[]};
}

export function importPlmForecast(store, actorId, input, key) {
  assertLaeStockAccess(store.userProfile(actorId), true);
  if (typeof key !== 'string' || !/^[\w.:-]{8,160}$/.test(key) || !Number.isSafeInteger(input?.expectedRevision) || input.expectedRevision < 0) {
    throw new RuleError('A request ID and current forecast revision are required.');
  }
  const catalog = catalogPayload(input.source,input.items);
  const payload = JSON.stringify(catalog);
  const hash = createHash('sha256').update(payload).digest('hex');
  const db = store.db;
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS lae_plm_forecasts (
      revision INTEGER PRIMARY KEY, request_id TEXT NOT NULL UNIQUE, actor_id TEXT NOT NULL, created_at TEXT NOT NULL,
      content_sha256 TEXT NOT NULL, payload TEXT NOT NULL
    )`);
    const existing = db.prepare('SELECT revision, actor_id, content_sha256 FROM lae_plm_forecasts WHERE request_id=?').get(key);
    const latest = db.prepare('SELECT revision, content_sha256 FROM lae_plm_forecasts ORDER BY revision DESC LIMIT 1').get();
    let revision = latest?.revision || 0;
    if (existing) {
      if (existing.actor_id !== actorId || existing.content_sha256 !== hash) throw new RuleError('Request ID has already been used.','CONFLICT');
      revision = existing.revision;
    } else {
      if (input.expectedRevision !== revision) throw new RuleError('The forecast catalog changed. Refresh before importing.','CONFLICT');
      if (latest?.content_sha256 !== hash) {
        revision++;
        db.prepare('INSERT INTO lae_plm_forecasts(revision, request_id, actor_id, created_at, content_sha256, payload) VALUES(?,?,?,?,?,?)')
          .run(revision,key,actorId,new Date().toISOString(),hash,payload);
      }
    }
    db.exec('COMMIT');
    return {revision,count:catalog.items.length,contentSha256:hash};
  } catch (error) {db.exec('ROLLBACK');throw error;}
}
