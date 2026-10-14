import {createHash} from 'node:crypto';
import {RuleError} from './access.mjs';
import {assertAnalyticsAccess,ANALYTICS_CENTRES} from './store.mjs';
import {buildPurchasePlan} from './purchase-plan.mjs';
const fail=(s,code='VALIDATION')=>{throw new RuleError(s,code);};
const qty=x=>x===null||Number.isSafeInteger(x)&&x>=0&&x<=1e9;
export function validateForecast(data,master){
 if(data?.schemaVersion!==1||!data.meta||!Array.isArray(data.rows)||data.rows.length>250000||data.rows.length!==master.items.length*24)fail('Incomplete forecast dataset.');
 const m=data.meta;if(m.sha256!==master.meta.sha256||m.sheet!=='MASTER'||typeof m.fileName!=='string'||m.fileName.length>500||typeof m.periodNote!=='string'||m.periodNote.length>2000||JSON.stringify(m.months)!==JSON.stringify(master.meta.months)||m.months.length!==6||!Array.isArray(m.controls)||m.controls.length!==24||!Array.isArray(m.exceptions)||m.exceptions.length>500)fail('Forecast source does not match MASTER.');
 const codes=new Map(master.items.map(x=>[x.code,x.sourceRow])),seen=new Set(),controls=new Map(),discrepancies=[];
 for(const r of data.rows){const key=JSON.stringify([r.code,r.centre,r.month]),c=JSON.stringify([r.centre,r.month]);if(codes.get(r.code)!==r.sourceRow||!ANALYTICS_CENTRES.includes(r.centre)||!m.months.includes(r.month)||seen.has(key)||!Array.isArray(r.brands)||r.brands.length!==3||r.brands.some(x=>!qty(x))||!qty(r.quantity)||!qty(r.cachedTotal)||!Array.isArray(r.cells)||r.cells.length!==4||r.cells.some(x=>typeof x!=='string'||!/^[A-Z]{1,3}[1-9]\d{0,5}$/.test(x)||Number(x.match(/\d+$/)[0])!==r.sourceRow))fail('Invalid or duplicate forecast row.');seen.add(key);
  const sum=r.brands.reduce((n,x)=>n+(x??0),0),present=r.brands.some(x=>x!==null)||!!r.cachedTotal,expected=present?(r.cachedTotal??sum):null;
  if(r.quantity!==expected)fail('Forecast quantity must retain the reported MASTER total and blank coverage.');
  if(r.cachedTotal!==null&&r.cachedTotal!==sum)discrepancies.push({cells:r.cells,brands:r.brands,cached:r.cachedTotal});
  if(!controls.has(c))controls.set(c,{quantity:0,present:0});controls.get(c).quantity+=r.quantity??0;controls.get(c).present+=r.quantity!==null?1:0;
 }
 const used=new Set();for(const c of m.controls){const k=JSON.stringify([c.centre,c.month]),expected=controls.get(k);if(used.has(k)||!expected||expected.quantity!==c.quantity||expected.present!==c.present)fail('Forecast controls do not reconcile.');used.add(k);}
 if(JSON.stringify(discrepancies)!==JSON.stringify(m.exceptions))fail('Forecast discrepancy register does not reconcile.');
 return data;
}
export class PlanningStore{
 constructor(db,stock,sales){this.db=db;this.stock=stock;this.sales=sales;this.cache=new Map();db.exec('CREATE TABLE IF NOT EXISTS lae_forecast_imports(id TEXT PRIMARY KEY,payload TEXT NOT NULL,actor_id TEXT NOT NULL,imported_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS lae_forecast_active(singleton INTEGER PRIMARY KEY CHECK(singleton=1),dataset_id TEXT NOT NULL REFERENCES lae_forecast_imports(id));');}
 active(){return this.db.prepare('SELECT dataset_id id FROM lae_forecast_active WHERE singleton=1').get()?.id??null;}
 import(user,{dataset,expectedId,stockId,salesId}={}){
  assertAnalyticsAccess(user);if(user.role!=='ADMIN')fail('Administrator access is required.','FORBIDDEN');
  this.db.exec('BEGIN IMMEDIATE');try{if(stockId!==this.stock.active()||salesId!==this.sales.active()||!stockId||!salesId)fail('Planning sources changed. Reload before import.','CONFLICT');const master=JSON.parse(this.db.prepare('SELECT payload FROM lae_analytics_imports WHERE id=?').get(stockId).payload),sales=JSON.parse(this.db.prepare('SELECT payload FROM lae_sales_imports WHERE id=?').get(salesId).payload);if(sales.stockId!==stockId)fail('Sales classification differs from active MASTER.','CONFLICT');validateForecast(dataset,master);
   const payload=JSON.stringify({...dataset,stockId,salesId}),id=createHash('sha256').update(payload).digest('hex'),current=this.active();if(current===id){this.db.exec('COMMIT');return {id,replayed:true};}if(expectedId!==current)fail('Forecast changed. Reload before importing.','CONFLICT');this.db.prepare('INSERT OR IGNORE INTO lae_forecast_imports VALUES(?,?,?,?)').run(id,payload,user.id,new Date().toISOString());this.db.prepare('INSERT INTO lae_forecast_active VALUES(1,?) ON CONFLICT(singleton) DO UPDATE SET dataset_id=excluded.dataset_id').run(id);this.db.exec('COMMIT');this.cache.clear();return {id,replayed:false};
  }catch(e){this.db.exec('ROLLBACK');throw e;}
 }
 workspace(user,input={}){
  assertAnalyticsAccess(user);const id=this.active();if(!id)return {id:null};
  const row=this.db.prepare('SELECT payload,imported_at FROM lae_forecast_imports WHERE id=?').get(id),data=JSON.parse(row.payload);
  if(data.stockId!==this.stock.active()||data.salesId!==this.sales.active())fail('Source data changed. Reconcile and reimport the forecast before using purchase guidance.','CONFLICT');
  const options={demand:Number(input.demand??1),delay:Number(input.delay??0),lead:Number(input.lead??60),stock:input.stock||'all'};
  if(![0.8,1,1.2].includes(options.demand)||![0,1].includes(options.delay)||![30,60,90,120].includes(options.lead)||!['all','exclude-north'].includes(options.stock))fail('Invalid purchase scenario.');
  const k=id+'|'+JSON.stringify(options);if(this.cache.has(k))return this.cache.get(k);
  const master=JSON.parse(this.db.prepare('SELECT payload FROM lae_analytics_imports WHERE id=?').get(data.stockId).payload),sales=JSON.parse(this.db.prepare('SELECT payload FROM lae_sales_imports WHERE id=?').get(data.salesId).payload),plan=buildPurchasePlan(master,sales,data,options);
  const out={...plan,id,stockId:data.stockId,salesId:data.salesId,source:data.meta,importedAt:row.imported_at};if(this.cache.size>=4)this.cache.clear();this.cache.set(k,out);return out;
 }
}
