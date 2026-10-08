import {actualMaterials,productionItems} from './production.mjs';
import {round} from './implements/domain.mjs';

export const segmentName=p=>String(p?.category||'Other components').trim()||'Other components';
export function batchSegments(batch,items){
 const index=new Map(items.map(p=>[p.key,p]));
 return Object.fromEntries(batch.materials.map(r=>[r.key,batch.issueSegments?.[r.key]||segmentName(index.get(r.key))]));
}
export function stagedIssue(state,batch,direction){
 state.productionMaterialIssued??={};const month=state.productionMaterialIssued[batch.month]??={};
 for(const row of batch.issued||[]){const qty=round((month[row.key]||0)+direction*row.qty,3);if(qty<0)throw Error('Segment issue history is inconsistent.');if(qty)month[row.key]=qty;else delete month[row.key];}
 if(!Object.keys(month).length)delete state.productionMaterialIssued[batch.month];
}
// Explicit technical projection: never spread stored batches or commercial items into reports.
export function dailyPickList(state,batches,{date,mode='pending',modelId='',segment=''},current=()=>true){
 const items=productionItems(state),index=new Map(items.map(p=>[p.key,p])),totals=new Map(),queue=[];
 for(const b of batches){
  const segments=batchSegments(b,items),issued=new Set((b.issued||[]).map(r=>r.key));
  let rows=mode==='issued'?(b.issued||[]).filter(r=>r.issueDate===date||!r.issueDate&&b.issueDate===date):(b.consumptionBasis||actualMaterials(b.materials,b.overrides,{allowPending:true})).filter(r=>!issued.has(r.key));
  const stale=b.status==='DRAFT'&&!current(b);const allSegments=[...new Set(Object.values(segments))].sort();
  rows=rows.filter(r=>!segment||segments[r.key]===segment);
  if(!rows.length)continue;
  const warnings=rows.filter(r=>r.qty==null).length,missing=rows.filter(r=>r.qty>0&&(state.stock[r.key]?.qty??0)<r.qty).length;
  queue.push({id:b.id,reference:b.reference,modelId:b.modelId,quantity:b.quantity,date:b.date,status:b.status,stale,segmentCount:allSegments.length,issuedSegments:b.issuedSegments||[],segments:[...new Set(rows.map(r=>segments[r.key]))].sort(),pendingQuantities:warnings,shortages:mode==='pending'?missing:0});
  for(const r of rows){
   const p=index.get(r.key),name=segments[r.key],group=JSON.stringify([r.key,name]),t=totals.get(group)||{key:r.key,code:r.code,name:r.name,unit:r.unit,segment:name,supplierPartCode:p?.supplierPartCode||'',confirmedQty:0,pendingQuantities:0,stock:state.stock[r.key]?.qty??null,batches:[]};
   if(r.qty==null)t.pendingQuantities++;else t.confirmedQty=round(t.confirmedQty+r.qty,3);
   t.batches.push({id:b.id,reference:b.reference,modelId:b.modelId,qty:r.qty,stale,reversed:b.status==='REVERSED'});totals.set(group,t);
  }
 }
 const combined=new Map();for(const r of totals.values()){const t=combined.get(r.key)||{qty:0,segments:0};t.qty=round(t.qty+r.confirmedQty,3);t.segments++;combined.set(r.key,t);}
 const rows=[...totals.values()].map(r=>({...r,qty:r.pendingQuantities?null:r.confirmedQty,sharedShortage:combined.get(r.key).segments>1,shortage:mode==='pending'?round(Math.max(0,combined.get(r.key).qty-(r.stock??0)),3):0})).sort((a,b)=>a.segment.localeCompare(b.segment)||a.code.localeCompare(b.code,undefined,{numeric:true})||a.name.localeCompare(b.name));
 return {date,mode,modelId,segment,batches:queue,rows,segments:[...new Set(rows.map(r=>r.segment))],batchCount:queue.length,itemCount:rows.length,pendingQuantities:rows.reduce((n,r)=>n+r.pendingQuantities,0),shortageItems:new Set(rows.filter(r=>r.shortage>0).map(r=>r.key)).size};
}
