import {createHash} from 'node:crypto';
import {RuleError,scopeAllowed} from './access.mjs';

export const ANALYTICS_CENTRES=['B2C - TN','B2B - TN','B2B - AP / TS','B2B - Karnal'];
const fail=(message,code='VALIDATION')=>{throw new RuleError(message,code);};
export function assertAnalyticsAccess(user){if(!scopeAllowed(user,'LAE_IMPORT')&&!scopeAllowed(user,'LAE_DOMESTIC'))fail('LAE access is required.','FORBIDDEN');}
const text=(x,label,max=500)=>{if(typeof x!=='string'||x.length>max||/[\x00-\x1f\x7f]/.test(x))fail('Invalid '+label+'.');return x;};
const qty=(x,label)=>{if(x!==null&&(!Number.isSafeInteger(x)||Math.abs(x)>1e9))fail('Invalid '+label+'.');};
const sum=values=>({quantity:values.reduce((n,v)=>n+(v??0),0),missing:values.filter(v=>v===null).length});
const same=(a,b)=>Math.abs(a-b)<0.000001;
export function validateAnalyticsDataset(data){
 if(!data||data.schemaVersion!==1||!data.meta||!Array.isArray(data.items)||!data.items.length||data.items.length>50000)fail('Invalid analytics dataset.');
 const m=data.meta;text(m.fileName,'source filename');if(!/^[a-f0-9]{64}$/.test(m.sha256)||m.stockBasis!=='MASTER')fail('A MASTER source and SHA256 are required.');
 if(m.stockAsOf!==null)fail('This import requires an explicitly unknown stock cutoff.');
 if(!Array.isArray(m.months)||!m.months.length||m.months.length>24||new Set(m.months).size!==m.months.length||m.months.some(v=>!/^\d{4}-(0[1-9]|1[0-2])$/.test(v)))fail('Invalid pipeline months.');
 text(m.periodNote,'period note',1000);const codes=new Set(),sourceRows=new Set();
 for(const item of data.items){
  for(const key of ['code','category','engine','grade','model','description'])text(item[key],key,1000);
  if(!item.code||!item.category||codes.has(item.code)||sourceRows.has(item.sourceRow)||!Number.isSafeInteger(item.sourceRow)||item.sourceRow<5)fail('Duplicate or invalid source item.');codes.add(item.code);sourceRows.add(item.sourceRow);
  qty(item.stock,'reported stock');qty(item.pipelineTotal,'reported pipeline');qty(item.sourceCombined,'source combined stock');
  if(!Array.isArray(item.locations)||item.locations.length!==5||!Array.isArray(item.pipeline)||item.pipeline.length!==m.months.length)fail('Incomplete stock or pipeline coverage.');
  item.locations.forEach(v=>qty(v,'location balance'));let total=0,missing=false;
  for(let i=0;i<item.pipeline.length;i++){const p=item.pipeline[i];if(p.month!==m.months[i]||!Array.isArray(p.brands)||p.brands.length!==3)fail('Invalid pipeline month coverage.');p.brands.forEach(v=>qty(v,'pipeline input'));qty(p.quantity,'pipeline month total');
   // Excel SUM treats empty inputs as zero. Preserve those inputs as null in evidence.
   if(p.quantity!==null&&!same(p.quantity,p.brands.reduce((a,b)=>a+(b??0),0)))fail('Pipeline brand inputs do not reconcile.');if(p.quantity===null)missing=true;else total+=p.quantity;
  }
  if(!missing&&item.pipelineTotal!==null&&!same(total,item.pipelineTotal))fail('Pipeline months do not reconcile to MASTER.');
 }
 if(!Array.isArray(data.exceptions)||data.exceptions.length>200)fail('Invalid exception list.');
 for(const e of data.exceptions){text(e.item,'exception item');text(e.detail,'exception detail',2000);text(e.source,'exception source',500);}
 if(!m.controls||!same(sum(data.items.map(x=>x.stock)).quantity,m.controls.stock)||!same(sum(data.items.map(x=>x.pipelineTotal)).quantity,m.controls.pipeline)||m.controls.items!==data.items.length)fail('Source controls do not reconcile.');
 return data;
}

export class LaeAnalyticsStore{
 constructor(db){this.db=db;this.cache=null;this.db.exec(`
 CREATE TABLE IF NOT EXISTS lae_analytics_imports(id TEXT PRIMARY KEY,payload TEXT NOT NULL,actor_id TEXT NOT NULL,imported_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS lae_analytics_active(singleton INTEGER PRIMARY KEY CHECK(singleton=1),dataset_id TEXT NOT NULL REFERENCES lae_analytics_imports(id));`);}
 actor(user){assertAnalyticsAccess(user);return user;}
 active(){return this.db.prepare('SELECT dataset_id id FROM lae_analytics_active WHERE singleton=1').get()?.id??null;}
 import(actorId,{dataset,expectedId}={}){
  this.db.exec('BEGIN IMMEDIATE');try{const actor=this.actor(actorId);if(actor.role!=='ADMIN')fail('Administrator access is required to import analytics.','FORBIDDEN');validateAnalyticsDataset(dataset);
   const payload=JSON.stringify(dataset),id=createHash('sha256').update(payload).digest('hex'),current=this.active();if(current===id){this.db.exec('COMMIT');return {id,replayed:true};}
   if(expectedId!==current)fail('Analytics source changed. Reload before importing.','CONFLICT');
   this.db.prepare('INSERT OR IGNORE INTO lae_analytics_imports VALUES(?,?,?,?)').run(id,payload,actor.id,new Date().toISOString());this.db.prepare('INSERT INTO lae_analytics_active VALUES(1,?) ON CONFLICT(singleton) DO UPDATE SET dataset_id=excluded.dataset_id').run(id);this.db.exec('COMMIT');return {id,replayed:false};
  }catch(e){this.db.exec('ROLLBACK');throw e;}
 }
 workspace(actorId,input={}){
  this.actor(actorId);const id=this.active();if(!id)return {id:null,meta:null,rows:[],total:0,totals:null,exceptions:[]};
  if(this.cache?.id!==id){const row=this.db.prepare('SELECT * FROM lae_analytics_imports WHERE id=?').get(id);this.cache={id,...JSON.parse(row.payload),importedAt:row.imported_at};}
  const data=this.cache,filters={};for(const key of ['category','engine','grade','search','centre','month'])filters[key]=text(input[key]??'',key,1000);
  if(filters.centre&&!ANALYTICS_CENTRES.includes(filters.centre))fail('Unknown cost centre.');if(filters.month&&!data.meta.months.includes(filters.month))fail('No pipeline data for the selected month.');
  const level=input.level??'category';if(!['category','engine','grade','item'].includes(level))fail('Invalid reporting level.');
  const integer=(value,fallback,max)=>{const n=Number(value??fallback);if(!Number.isSafeInteger(n)||n<0||n>max)fail('Invalid pagination.');return n;};const offset=integer(input.offset,0,1000000),limit=integer(input.limit,50,100);if(!limit)fail('Invalid page size.');
  let items=data.items.filter(x=>['category','engine','grade'].every(k=>!filters[k]||(x[k]||'Unspecified')===filters[k]));
  if(filters.search){const q=filters.search.toLowerCase();items=items.filter(x=>[x.code,x.model,x.description,x.category,x.engine,x.grade].join(' ').toLowerCase().includes(q));}
  const centreIndex=filters.centre?ANALYTICS_CENTRES.indexOf(filters.centre):-1;
  // locations: Farming Hub, TN, AP/TS, Karnal, shared Chennai. Shared is never allocated to a centre.
  const aggregate=rows=>({items:rows.length,stock:sum(rows.map(x=>centreIndex<0?x.stock:x.locations[centreIndex])),shared:sum(rows.map(x=>x.locations[4])),pipeline:sum(rows.map(x=>filters.month?x.pipeline.find(p=>p.month===filters.month).quantity:x.pipelineTotal))});
  let rows;if(level==='item')rows=items.map(x=>({key:x.code,label:x.code,model:x.model,description:x.description,sourceRow:x.sourceRow,category:x.category,engine:x.engine,grade:x.grade,locations:x.locations,...aggregate([x])}));
  else{const groups=new Map();for(const x of items){const key=x[level]||'Unspecified';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(x);}rows=[...groups].map(([key,list])=>({key,label:key,...aggregate(list)}));}
  rows.sort((a,b)=>a.label.localeCompare(b.label,undefined,{numeric:true}));
  return {id,meta:data.meta,importedAt:data.importedAt,level,filters,rows:rows.slice(offset,offset+limit),total:rows.length,offset,limit,nextOffset:offset+limit<rows.length?offset+limit:null,totals:aggregate(items),exceptions:data.exceptions,sourceItems:data.items.length};
 }
}
