import {RuleError,scopeAllowed} from './domain.mjs';

export const LAE_STOCK_MAX_ROWS=50000;
export const LAE_STOCK_FILTER_KEYS=['q','masterCode','productGroup','warehouse','brand','unit','status','ro','view','page','pageSize','sort','direction'];
const stockFail=message=>{throw new RuleError(message);};
const stockText=(v,max=500)=>{if(v==null)return '';if(typeof v!=='string'||v.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v))stockFail('Invalid stock text.');return v;};
const stockNumber=v=>{if(v==null||v==='')return null;if(typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>1e14)stockFail('Invalid stock amount.');return v;};
const stockDate=v=>{const s=stockText(v,10),time=Date.parse(s+'T00:00:00Z');if(s&&(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(time)||new Date(time).toISOString().slice(0,10)!==s))stockFail('Invalid stock date.');return s;};
const stockNumericKeys=['quantity','usdUnit','originalInrUnit','revisedInrUnit','interestInrUnit','rentInrUnit','dutyInrUnit','recordedValue','motorUsdUnit','motorOriginalInrUnit','saleSetOriginalInrUnit'];
const stockStringKeys=['id','sourceSheet','batch','masterCode','brandCode','itemName','productGroup','brand','warehouse','unit','grade','colour','assignedRo','originalRo','priceRo','invoice','supplier','calcId','baseStatus','revisedStatus'];
const stockNoteKeys=['matchBasis','costBasis','validationConcerns','sourceEvidence','terms','paymentDateBasis','rentBasis','dutyBasis'];
const stockSortKeys=[...stockStringKeys,...stockNumericKeys,'inwardDate','importDate','originalRate','revisedRate','changePercent','netQuantity','originalAverage','revisedAverage','averageUsd','originalPendingQuantity','revisedPendingQuantity'];
const stockNorm=v=>String(v??'').trim().toLocaleLowerCase('en');
const stockCollator=new Intl.Collator('en',{numeric:true,sensitivity:'base'});
export function assertLaeStockAccess(actor,write=false){if(!actor||actor.active===false||!scopeAllowed(actor,'LAE_IMPORT')||(write&&actor.role!=='ADMIN'))throw new RuleError('LAE Import '+(write?'administrator':'access')+' is required.','FORBIDDEN');}
export function validateLaeStockSnapshot(input){
 if(input?.schemaVersion!==1||!Array.isArray(input.rows)||!input.rows.length||input.rows.length>LAE_STOCK_MAX_ROWS)stockFail('Provide a supported stock snapshot with 1–50,000 source rows.');
 const source=input.source||{},sha=v=>{if(!/^[a-f0-9]{64}$/.test(v||''))stockFail('Source SHA256 is required.');return v;};
 const meta={schemaVersion:1,version:stockText(input.version,120),stockDate:stockDate(input.stockDate),costDate:stockDate(input.costDate),source:{filename:stockText(source.filename,200),sha256:sha(source.sha256),dataSha256:sha(source.dataSha256)},basis:stockText(input.basis,3000)};
 if(!meta.version||!meta.stockDate||!meta.costDate||!meta.source.filename||!meta.basis)stockFail('Snapshot dates, source and costing basis are required.');
 const ids=new Set(),rows=input.rows.map(value=>{
  const r={};for(const k of stockStringKeys)r[k]=stockText(value[k],k==='itemName'?1500:500);for(const k of stockNoteKeys)r[k]=stockText(value[k],6000);for(const k of stockNumericKeys)r[k]=stockNumber(value[k]);
  r.sourceRow=value.sourceRow;if(!Number.isSafeInteger(r.sourceRow)||r.sourceRow<1||!r.id||ids.has(r.id)||r.quantity===null||!r.sourceSheet)stockFail('Unique source rows and original quantities are required.');ids.add(r.id);
  r.unit=r.unit.trim().toLowerCase();r.inwardDate=stockDate(value.inwardDate);r.importDate=stockDate(value.importDate);
  for(const k of ['quantityOnly','usdApplicable','freeApproved','rentExcluded']){if(typeof value[k]!=='boolean')stockFail('Explicit stock cost scope is required.');r[k]=value[k];}
  for(const k of ['usdUnit','originalInrUnit','revisedInrUnit','motorUsdUnit','motorOriginalInrUnit','saleSetOriginalInrUnit'])if(r[k]!==null&&r[k]<0)stockFail('Unit prices cannot be negative.');
  if(!r.quantityOnly&&r.revisedInrUnit!==null){if([r.originalInrUnit,r.interestInrUnit,r.rentInrUnit,r.dutyInrUnit].some(v=>v===null))stockFail('A revised unit cost requires each supported component.');if(Math.abs(r.revisedInrUnit-r.originalInrUnit-r.interestInrUnit-r.rentInrUnit-r.dutyInrUnit)>0.02)stockFail('Revised stock cost does not reconcile to its components.');}
  if(r.rentExcluded&&r.rentInrUnit!==0)stockFail('Approved excluded rent must retain its zero applied component.');
  return r;
 });
 const controls={rows:rows.length,net:rows.reduce((s,r)=>s+r.quantity,0),positive:rows.reduce((s,r)=>s+Math.max(r.quantity,0),0),negative:rows.reduce((s,r)=>s+Math.min(r.quantity,0),0)};
 for(const k of Object.keys(controls))if(typeof input.controls?.[k]!=='number'||Math.abs(input.controls[k]-controls[k])>0.000001)stockFail('Stock source control mismatch: '+k);
 return {...meta,controls,rows};
}
export function validateLaeStockQuery(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input))stockFail('Invalid stock query.');const q={};
 for(const [k,v] of Object.entries(input)){if(!LAE_STOCK_FILTER_KEYS.includes(k)||typeof v!=='string'&&typeof v!=='number')stockFail('Invalid stock filter.');q[k]=String(v);if(q[k].length>500)stockFail('Stock filter is too long.');}
 q.view=q.view||'batches';if(!['batches','models'].includes(q.view))stockFail('Invalid stock view.');q.sort=q.sort||(q.view==='models'?'masterCode':'batch');if(!stockSortKeys.includes(q.sort))stockFail('Invalid stock sort.');q.direction=q.direction||'asc';if(!['asc','desc'].includes(q.direction))stockFail('Invalid stock sort direction.');
 q.page=Number(q.page||1);q.pageSize=Number(q.pageSize||50);if(!Number.isSafeInteger(q.page)||q.page<1||!Number.isSafeInteger(q.pageSize)||q.pageSize<1||q.pageSize>200)stockFail('Invalid stock page.');return q;
}
export function projectLaeStockRow(row){
 const r={...row};r.originalRate=r.usdUnit>0&&r.originalInrUnit!==null?r.originalInrUnit/r.usdUnit:null;r.revisedRate=r.usdUnit>0&&r.revisedInrUnit!==null?r.revisedInrUnit/r.usdUnit:null;
 r.changePercent=r.originalInrUnit>0&&r.revisedInrUnit!==null?(r.revisedInrUnit/r.originalInrUnit-1)*100:null;
 r.status=r.quantityOnly?'Quantity only':r.revisedInrUnit!==null?(r.rentExcluded?'Revised · rent excluded':'Revised cost available'):r.originalInrUnit!==null?'Revised cost pending':'Original cost pending';return r;
}
function stockOneUnitSummary(rows){
 const s={rows:rows.length,unit:rows[0]?.unit||'',netQuantity:0,positiveQuantity:0,negativeQuantity:0,quantityOnlyQuantity:0,costBearingQuantity:0,originalPricedQuantity:0,revisedPricedQuantity:0,originalValue:0,revisedValue:0,pairedUsdQuantity:0,pairedUsdValue:0,pairedOriginalValue:0,pairedRevisedUsdQuantity:0,pairedRevisedUsdValue:0,pairedRevisedValue:0,comparisonQuantity:0,comparisonOriginalValue:0,comparisonRevisedValue:0,rentExcludedQuantity:0};
 for(const r of rows){const q=Math.max(r.quantity,0);s.netQuantity+=r.quantity;s.positiveQuantity+=q;s.negativeQuantity+=Math.min(r.quantity,0);if(r.quantityOnly){s.quantityOnlyQuantity+=q;continue;}s.costBearingQuantity+=q;
  if(r.originalInrUnit!==null){s.originalPricedQuantity+=q;s.originalValue+=q*r.originalInrUnit;}if(r.revisedInrUnit!==null){s.revisedPricedQuantity+=q;s.revisedValue+=q*r.revisedInrUnit;}
  if(r.usdUnit!==null&&r.usdApplicable&&r.originalInrUnit!==null){s.pairedUsdQuantity+=q;s.pairedUsdValue+=q*r.usdUnit;s.pairedOriginalValue+=q*r.originalInrUnit;}
  if(r.usdUnit!==null&&r.usdApplicable&&r.revisedInrUnit!==null){s.pairedRevisedUsdQuantity+=q;s.pairedRevisedUsdValue+=q*r.usdUnit;s.pairedRevisedValue+=q*r.revisedInrUnit;}
  if(r.originalInrUnit!==null&&r.revisedInrUnit!==null){s.comparisonQuantity+=q;s.comparisonOriginalValue+=q*r.originalInrUnit;s.comparisonRevisedValue+=q*r.revisedInrUnit;}if(r.rentExcluded)s.rentExcludedQuantity+=q;
 }
 const avg=(value,q)=>q>0?value/q:null;s.originalAverage=avg(s.originalValue,s.originalPricedQuantity);s.revisedAverage=avg(s.revisedValue,s.revisedPricedQuantity);s.averageUsd=avg(s.pairedUsdValue,s.pairedUsdQuantity);s.originalRate=avg(s.pairedOriginalValue,s.pairedUsdValue);s.revisedRate=avg(s.pairedRevisedValue,s.pairedRevisedUsdValue);
 s.originalPendingQuantity=s.costBearingQuantity-s.originalPricedQuantity;s.revisedPendingQuantity=s.costBearingQuantity-s.revisedPricedQuantity;s.comparisonOriginalAverage=avg(s.comparisonOriginalValue,s.comparisonQuantity);s.comparisonRevisedAverage=avg(s.comparisonRevisedValue,s.comparisonQuantity);s.changePercent=s.comparisonOriginalValue>0?(s.comparisonRevisedValue/s.comparisonOriginalValue-1)*100:null;return s;
}
export function summarizeLaeStock(rows){
 const units=new Map();for(const r of rows){if(!units.has(r.unit))units.set(r.unit,[]);units.get(r.unit).push(r);}const byUnit=[...units.values()].map(stockOneUnitSummary),mixedUnits=byUnit.length>1;
 return {rows:rows.length,mixedUnits,byUnit,...(!mixedUnits?byUnit[0]||stockOneUnitSummary([]):{})};
}
export function queryLaeStock(rows,input={},snapshot=null,{exportAll=false}={}){
 const q=validateLaeStockQuery(input),all=rows.map(projectLaeStockRow),facet=(key)=>[...new Set(all.map(r=>r[key]).filter(Boolean))].sort(stockCollator.compare);
 const facets=Object.fromEntries(['masterCode','productGroup','warehouse','brand','unit','status'].map(k=>[k,facet(k)])),tokens=stockNorm(q.q).split(/\s+/).filter(Boolean);
 const filtered=all.filter(r=>['masterCode','productGroup','warehouse','brand','unit','status'].every(k=>!q[k]||stockNorm(r[k])===stockNorm(q[k]))&&(!q.ro||[r.assignedRo,r.originalRo,r.priceRo].some(v=>stockNorm(v)===stockNorm(q.ro)))&&tokens.every(t=>stockNorm([r.batch,r.masterCode,r.brandCode,r.itemName,r.productGroup,r.warehouse,r.assignedRo,r.priceRo,r.invoice,r.supplier].join(' ')).includes(t)));
 const summary=summarizeLaeStock(filtered),warehouseMap=new Map(),models=new Map();
 for(const r of filtered){const wk=JSON.stringify([r.warehouse,r.unit]),mk=JSON.stringify([r.productGroup,r.masterCode||r.brandCode||r.itemName,r.unit]);if(!warehouseMap.has(wk))warehouseMap.set(wk,[]);warehouseMap.get(wk).push(r);if(!models.has(mk))models.set(mk,[]);models.get(mk).push(r);}
 const warehouses=[...warehouseMap.values()].map(rs=>({warehouse:rs[0].warehouse,...stockOneUnitSummary(rs)}));
 const modelRows=[...models.entries()].map(([id,rs])=>({id,masterCode:rs[0].masterCode,itemName:rs[0].itemName,productGroup:rs[0].productGroup,brand:[...new Set(rs.map(r=>r.brand).filter(Boolean))].join(', '),warehouse:[...new Set(rs.map(r=>r.warehouse).filter(Boolean))].join(', '),...stockOneUnitSummary(rs)}));
 const result=q.view==='models'?modelRows:filtered;result.sort((a,b)=>{const x=a[q.sort],y=b[q.sort];if(x==null&&y!=null)return 1;if(y==null&&x!=null)return -1;const order=typeof x==='number'&&typeof y==='number'?x-y:stockCollator.compare(String(x??''),String(y??''));return (q.direction==='desc'?-order:order)||stockCollator.compare(a.id,b.id);});
 const total=result.length,totalPages=Math.max(1,Math.ceil(total/q.pageSize)),page=Math.min(q.page,totalPages),start=(page-1)*q.pageSize;
 return {snapshot,rows:exportAll?result:result.slice(start,start+q.pageSize),summary,warehouses,facets,filters:q,pagination:{total,totalPages,page,pageSize:q.pageSize,from:total?(exportAll?1:start+1):0,to:exportAll?total:Math.min(start+q.pageSize,total)},coverage:{sourceRows:rows.length,selectedSourceRows:filtered.length,models:modelRows.length}};
}
