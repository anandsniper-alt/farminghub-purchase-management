import {RuleError} from './domain.mjs';

export const LAE_AGING_BUCKETS=[{id:'0-60',label:'0–60 days',min:0,max:60},{id:'61-120',label:'61–120 days',min:61,max:120},{id:'121-180',label:'121–180 days',min:121,max:180},{id:'181-240',label:'181–240 days',min:181,max:240},{id:'241-360',label:'241–360 days',min:241,max:360},{id:'361+',label:'Above 360 days',min:361,max:Infinity},{id:'pending',label:'Date pending'}];
export const LAE_AGING_FILTERS=['q','productGroup','warehouse','brand','unit','basis','asOf'];
const agingKey=v=>String(v??'').trim().toLowerCase(),agingCollator=new Intl.Collator('en',{numeric:true,sensitivity:'base'});
const agingDay=value=>{if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;const ms=Date.parse(value+'T00:00:00Z');return Number.isFinite(ms)&&new Date(ms).toISOString().slice(0,10)===value?ms/86400000:null;};
export function validateLaeAgingQuery(input={},snapshot=null){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new RuleError('Invalid stock aging filters.');const q={};
 for(const [key,value] of Object.entries(input)){if(!LAE_AGING_FILTERS.includes(key)||typeof value!=='string'||value.length>500)throw new RuleError('Invalid stock aging filter.');q[key]=value;}
 q.basis=q.basis||'import';if(!['import','warehouse'].includes(q.basis))throw new RuleError('Choose import or warehouse age.');q.asOf=q.asOf||snapshot?.stockDate||'';
 if(q.asOf&&(agingDay(q.asOf)===null||snapshot?.stockDate&&q.asOf<snapshot.stockDate))throw new RuleError('Age date must be valid and on or after the stock snapshot date.');return q;
}
const agingPurchaseKey=(ro,invoice,code,unit)=>JSON.stringify([String(ro).trim(),...([invoice,code,unit].map(agingKey))]);
function agingPurchaseIndex(rows){const map=new Map();for(const r of rows){if(!r.ro||!r.invoice||!r.brandCode||!r.unit)continue;const key=agingPurchaseKey(r.ro,r.invoice,r.brandCode,r.unit);if(!map.has(key))map.set(key,[]);map.get(key).push(r);}return map;}
function agingDateFor(row,basis,index){
 const source=basis==='warehouse'?row.inwardDate:row.importDate;
 if(source)return {date:source,provenance:basis==='warehouse'?'Stock warehouse inward date':'Stock import-age date'};
 if(basis==='warehouse'||!/^\d+[A-Za-z0-9._/-]*$/.test(String(row.assignedRo||''))||!row.invoice||!row.brandCode||!row.unit)return {date:'',provenance:'Missing stock date'};
 const matches=index.get(agingPurchaseKey(row.assignedRo,row.invoice,row.brandCode,row.unit))||[];
 const dates=new Set(matches.map(r=>r.inwardDate));if(!matches.length||dates.size!==1||agingDay([...dates][0])===null)return {date:'',provenance:matches.length?'Conflicting or missing purchase inward dates':'No exact purchase date match'};
 return {date:[...dates][0],provenance:'Exact RO / invoice / brand-code purchase inward date'};
}
const agingEmpty=()=>Object.fromEntries(LAE_AGING_BUCKETS.map(b=>[b.id,{quantity:0,rows:0,positive:0,negative:0}]));
function agingAdd(target,row,bucket){const cell=target.buckets[bucket];cell.quantity+=row.quantity;cell.rows++;cell.positive+=Math.max(row.quantity,0);cell.negative+=Math.min(row.quantity,0);target.quantity+=row.quantity;target.rows++;}
export function queryLaeStockAging(rows,input={},snapshot=null,purchaseRows=[]){
 const q=validateLaeAgingQuery(input,snapshot),index=agingPurchaseIndex(purchaseRows),asOf=agingDay(q.asOf),tokens=agingKey(q.q).split(/\s+/).filter(Boolean);
 const facets=Object.fromEntries(['productGroup','warehouse','brand','unit'].map(k=>[k,[...new Set(rows.map(r=>r[k]).filter(Boolean))].sort(agingCollator.compare)]));
 const selected=rows.filter(r=>['productGroup','warehouse','brand','unit'].every(k=>!q[k]||agingKey(q[k])===agingKey(r[k]))&&tokens.every(t=>agingKey([r.productGroup,r.masterCode,r.brandCode,r.itemName,r.batch,r.assignedRo].join(' ')).includes(t)));
 const groups=new Map(),units=new Map(),models=new Map(),coverage={sourceRows:rows.length,selectedRows:selected.length,stockDateRows:0,purchaseDateRows:0,pendingRows:0,futureRows:0,invalidDateRows:0};
 for(const row of selected){const source=agingDateFor(row,q.basis,index),day=agingDay(source.date),days=asOf===null||day===null?null:asOf-day,bucket=days===null||days<0?'pending':LAE_AGING_BUCKETS.find(b=>days>=b.min&&days<=b.max)?.id||'pending';
  if(bucket==='pending'){coverage.pendingRows++;if(days<0)coverage.futureRows++;if(source.date&&day===null)coverage.invalidDateRows++;}else if(source.provenance.startsWith('Exact'))coverage.purchaseDateRows++;else coverage.stockDateRows++;
  const group=row.productGroup||'',unit=row.unit||'',gk=JSON.stringify([group,unit]);if(!groups.has(gk))groups.set(gk,{id:gk,productGroup:group,unit,quantity:0,rows:0,buckets:agingEmpty()});agingAdd(groups.get(gk),row,bucket);
  if(!units.has(unit))units.set(unit,{unit,quantity:0,rows:0,buckets:agingEmpty()});agingAdd(units.get(unit),row,bucket);
  // Keep genuinely unmapped models separate by their existing brand/item identity.
  const identity=row.masterCode||row.brandCode||row.itemName||row.id,mk=JSON.stringify([group,unit,identity,bucket]);
  if(!models.has(mk))models.set(mk,{id:mk,productGroup:group,unit,masterCode:row.masterCode||'',itemName:row.itemName||row.brandCode||'Unmapped item',bucket,quantity:0,rows:0,warehouses:new Set(),brandCodes:new Set(),ros:new Set(),dateSources:new Set(),oldestDays:null,newestDays:null});
  const model=models.get(mk);model.quantity+=row.quantity;model.rows++;model.warehouses.add(row.warehouse||'Unspecified');if(row.brandCode)model.brandCodes.add(row.brandCode);if(/^\d+[A-Za-z0-9._/-]*$/.test(row.assignedRo||''))model.ros.add(row.assignedRo);model.dateSources.add(bucket==='pending'&&days<0?'Date after selected age date':source.provenance);
  if(bucket!=='pending'){model.oldestDays=Math.max(model.oldestDays??days,days);model.newestDays=Math.min(model.newestDays??days,days);}
 }
 const sortedGroups=[...groups.values()].sort((a,b)=>agingCollator.compare(a.productGroup,b.productGroup)||agingCollator.compare(a.unit,b.unit));
 const modelRows=[...models.values()].map(m=>({...m,...Object.fromEntries(['warehouses','brandCodes','ros','dateSources'].map(k=>[k,[...m[k]].sort(agingCollator.compare)]))})).sort((a,b)=>agingCollator.compare(a.masterCode||a.itemName,b.masterCode||b.itemName)||agingCollator.compare(a.id,b.id));
 return {snapshot,filters:q,facets,buckets:LAE_AGING_BUCKETS.map(({id,label})=>({id,label})),groups:sortedGroups,models:modelRows,summary:[...units.values()].sort((a,b)=>agingCollator.compare(a.unit,b.unit)),coverage};
}
