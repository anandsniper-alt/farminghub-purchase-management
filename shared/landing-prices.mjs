import {RuleError} from './domain.mjs';
import {calculateRoPurchaseItems} from './ro-costing.mjs';

export const LANDING_PRICE_SORT_KEYS=['ro','inwardDate','vendorName','invoice','itemName','masterCode','brandCode','brand','productGroup','usdUnit','aiInrPerUsd','inrUnitBeforeGst','quantity','status','rmbUnit','rmbPerUsd','fxDate','fxReview'];
const landingCollator=new Intl.Collator('en',{numeric:true,sensitivity:'base'});
const landingKey=value=>String(value??'').trim().toLowerCase();
const landingPresent=value=>value!==null&&value!==undefined&&value!=='';
const landingFilterFail=()=>{throw new RuleError('Invalid landing-price filter.');};
export const LANDING_PRICE_MISSING='__missing__';

/** Exact existing ERP-code lookup only; punctuation and variant suffixes stay significant. */
export function landingItemMasterIndex(state={}){
 const index=new Map();
 for(const item of state.items||[]){
  if(item.scope!=='LAE_IMPORT')continue;
  for(const code of new Set([item.code,item.erpItemCode].filter(Boolean).map(landingKey))){
   const entries=index.get(code)||[];entries.push(item);index.set(code,entries);
  }
 }
 return index;
}

/** Read-only purchase history: no stock quantities, assumed rates or reconstructed identities. */
export function projectLandingPriceRows(record,masterState={}){
 const masterIndex=masterState instanceof Map?masterState:landingItemMasterIndex(masterState);
 return calculateRoPurchaseItems(record).rows.map(row=>{
  const matches=masterIndex.get(landingKey(row.itemCode))||[],master=matches.length===1?matches[0]:null;
  const sourceBrand=Object.hasOwn(row,'brand'),brand=sourceBrand?row.brand:master?.brand||'',masterCode=row.masterCode||master?.baseItemCode||'';
  const hasPrices=row.usdUnitPrice!==null&&row.rate!==null,fx=row.purchaseFx||{};
  return {
   id:JSON.stringify([record.ro,row.id]),itemId:row.id,ro:record.ro,inwardDate:row.inwardDate||record.inwardDate||'',inwardDateBasis:row.inwardDate?'Purchase source row':record.inwardDate?'RO inward date':'Pending',roInwardDate:record.inwardDate||'',
   vendorName:row.supplier||record.supplier||'',invoice:row.invoice,itemName:row.description||master?.name||row.model||'',
   masterCode,masterCodeRaw:row.masterCodeRaw,masterCodeBasis:row.masterCode?'Purchase record':masterCode?'Exact ERP item master':'Pending',
   brandCode:row.itemCode,brand,brandBasis:sourceBrand?(brand?'Purchase source row':'Purchase source row: blank'):brand?'Exact ERP item master':'Pending',productGroup:row.productGroup||master?.category||'',model:row.model,
   usdUnit:row.usdUnitPrice,aiInrPerUsd:row.rate,inrUnitBeforeGst:row.inrUnitCost,quantity:row.quantity,unit:row.unit,
   usdLineTotal:row.usdLineTotal,inrLineTotal:row.inrLineTotal,status:hasPrices?row.rateStatus:'Pending',rateStatus:row.rateStatus,priceStatus:row.status,
   rateBasis:row.rateBasis,usdBasis:row.usdBasis,currency:row.currency,originalUnitPrice:row.unitPrice,workingId:row.workingId,
   source:{...row.source},flags:[...row.flags],
   rmbUnit:fx.rmbUnitPrice??(row.currency==='CNY'?row.unitPrice:null),rmbPerUsd:fx.rmbPerUsd??null,
   fxDate:fx.date||'',invoiceDate:fx.invoiceDate||'',proformaDate:fx.proformaDate||'',fxBasis:fx.basis||'Pending',fxStatus:fx.status||'Pending',
   fxSource:fx.source||'',rmbSource:fx.rmbSource||(row.currency==='CNY'?row.source.file:''),modelIdentity:fx.modelIdentity||'',evidenceIssue:fx.evidenceIssue||'',issueDetail:fx.issueDetail||'',
   rmbEquivalentUnit:fx.rmbPerUsd>0&&row.usdUnitPrice!==null?row.usdUnitPrice*fx.rmbPerUsd:null,
  };
 });
}

export function validateLandingPriceQuery(input={}){
 const result={};
 for(const name of ['q','year','month','supplier','product','masterCode','brand','status','unit','fxReview']){
  const value=input[name]??'';if(typeof value!=='string'||value.length>(name==='q'?200:300)||/[\x00-\x1f\x7f]/.test(value))landingFilterFail();result[name]=value.trim();
 }
 if(result.year&&result.year!==LANDING_PRICE_MISSING&&!/^\d{4}$/.test(result.year))landingFilterFail();
 if(result.month&&result.month!==LANDING_PRICE_MISSING&&!/^(0[1-9]|1[0-2])$/.test(result.month))landingFilterFail();
 result.sort=input.sort||'inwardDate';result.direction=input.direction||'desc';
 if(!LANDING_PRICE_SORT_KEYS.includes(result.sort)||!['asc','desc'].includes(result.direction))landingFilterFail();
 for(const [name,fallback,max] of [['page',1,1000000],['pageSize',50,100]]){
  const raw=input[name]??fallback;if(typeof raw!=='number'&&(typeof raw!=='string'||!/^\d+$/.test(raw)))landingFilterFail();
  const value=Number(raw);if(!Number.isSafeInteger(value)||value<1||value>max)landingFilterFail();result[name]=value;
 }
 return result;
}

const landingUnitKey=unit=>['pcs','pc','piece','pieces','nos','no','numbers'].includes(landingKey(unit))?'pcs':['set','sets'].includes(landingKey(unit))?'sets':landingKey(unit)||'unspecified';

/** Compare purchase lots, never barcodes, preserving every source line and every financial value.
 * Exact supplier, brand code, configuration text/verified identity and unit are required.
 * Market/reference FX can support an explanation but never becomes an agreed rate or a price.
 */
export function reviewLandingPriceChanges(input){
 const rows=input.map(row=>({...row,fxReview:'Not assessed',fxSeverity:'',fxDetail:'',previousRo:'',previousUsdUnit:null,previousRmbUnit:null,rmbChangePercent:null,usdChangePercent:null,conversionDifferencePercent:null}));
 const groups=new Map(),codeGroups=new Map(),pct=(now,old)=>typeof now==='number'&&old>0?(now/old-1)*100:null,material=n=>n!==null&&Math.abs(n)>=1-1e-9;
 for(const row of rows){
  if(row.rmbUnit==null&&row.rmbPerUsd>0){row.fxReview=row.fxStatus==='Documented'&&row.fxDate?'Agreed rate recorded':'Rate/date pending';row.fxSeverity=row.fxReview==='Agreed rate recorded'?'':'Medium';row.fxDetail='Original RMB unit price is not evidenced. Any RMB equivalent shown is calculated from USD and the recorded rate.';}
  if(row.rmbUnit!=null){
   row.fxReview='Rate/date pending';row.fxSeverity='Medium';row.fxDetail='Original RMB price retained; confirm the agreed exchange rate and billing/proforma date.';
   if(row.rmbPerUsd>0&&row.usdUnit!=null){
    row.conversionDifferencePercent=pct(row.usdUnit,row.rmbUnit/row.rmbPerUsd);
    const documented=row.fxStatus==='Documented'&&!!row.fxDate,mismatch=material(row.conversionDifferencePercent)||(row.rmbUnit===0&&row.usdUnit>0);
    row.fxReview=documented?(mismatch?'Conversion mismatch':'Conversion checked'):'Reference comparison';
    row.fxSeverity=documented&&mismatch?'High':documented?'':'Medium';
    row.fxDetail=(documented?'Recorded conversion':'Unconfirmed/reference conversion')+': RMB '+row.rmbUnit+' / '+row.rmbPerUsd+' = USD '+(row.rmbUnit/row.rmbPerUsd).toFixed(4)+'. '+(documented?'':'Supplier agreement/date still requires evidence.');
   }
  }
  const identity=row.modelIdentity||row.model||row.itemName;
  if(!row.brandCode||!row.vendorName||!identity||!row.invoice||!(row.quantity>0)||landingUnitKey(row.unit)==='unspecified')continue;
  const key=JSON.stringify([row.vendorName,row.brandCode,identity,landingUnitKey(row.unit)].map(landingKey)),lots=groups.get(key)||new Map(),lotKey=JSON.stringify([row.ro,row.invoice]);
  const lot=lots.get(lotKey)||[];lot.push(row);lots.set(lotKey,lot);groups.set(key,lots);
  const codeKey=JSON.stringify([row.vendorName,row.brandCode,landingUnitKey(row.unit)].map(landingKey)),peers=codeGroups.get(codeKey)||[];peers.push(row);codeGroups.set(codeKey,peers);
 }
 const weighted=(lot,key)=>lot.every(r=>typeof r[key]==='number'&&Number.isFinite(r[key]))?lot.reduce((s,r)=>s+r[key]*r.quantity,0)/lot.reduce((s,r)=>s+r.quantity,0):null;
 for(const lots of groups.values()){
  const ordered=[...lots.values()].map(lot=>({lot,date:lot[0].invoiceDate||lot[0].inwardDate||'',usd:weighted(lot,'usdUnit'),rmb:weighted(lot,'rmbUnit')})).filter(l=>l.date).sort((a,b)=>a.date.localeCompare(b.date)||landingCollator.compare(a.lot[0].ro,b.lot[0].ro));
  for(let i=1;i<ordered.length;i++){
   const current=ordered[i],old=ordered[i-1],usd=pct(current.usd,old.usd),rmb=pct(current.rmb,old.rmb);
   for(const row of current.lot){
    if(current.date===old.date){if(row.fxReview==='Not assessed'){row.fxReview='Purchase sequence pending';row.fxSeverity='Medium';row.fxDetail='Multiple comparable invoices have the same recorded date; chronological sequence is not established.';}continue;}
    row.previousRo=old.lot[0].ro;row.previousUsdUnit=old.usd;row.previousRmbUnit=old.rmb;row.usdChangePercent=usd;row.rmbChangePercent=rmb;
    if(row.fxReview==='Conversion mismatch')continue;
    const withinLot=[current,old].some(l=>['usdUnit','rmbUnit'].some(key=>{const values=l.lot.map(r=>r[key]).filter(v=>typeof v==='number');return values.length>1&&material(pct(Math.max(...values),Math.min(...values)));}));
    if(withinLot){row.fxReview='Mixed lot prices';row.fxSeverity='Medium';row.fxDetail='Different source prices within a purchase lot; review configuration before comparing averages.';continue;}
    if(material(rmb)){row.fxReview='RMB price change';row.fxSeverity='Medium';row.fxDetail='Original RMB price '+old.rmb+' → '+current.rmb+' ('+rmb.toFixed(2)+'%) against RO '+row.previousRo+'. Check supplier price/specification.';}
    else if(material(usd)){
     row.fxReview=rmb!==null?'FX movement consistent':'Original currency pending';row.fxSeverity=rmb!==null?'Low':'Medium';
     row.fxDetail='USD '+old.usd+' → '+current.usd+' ('+usd.toFixed(2)+'%) against RO '+row.previousRo+'. '+(rmb!==null?'RMB changed '+rmb.toFixed(2)+'% (within 1%). Confirm agreed FX before changing cost.':'Original RMB evidence is insufficient to separate product price from FX.');
    }else if(row.fxReview==='Not assessed'&&usd!==null){row.fxReview='Within 1%';row.fxDetail='No material USD change against RO '+row.previousRo+'.';}
   }
  }
 }
 // A changed description must remain visible as an identity review, never disappear or be auto-merged.
 for(const peers of codeGroups.values()){
  const dated=peers.filter(r=>r.invoiceDate||r.inwardDate).sort((a,b)=>(a.invoiceDate||a.inwardDate).localeCompare(b.invoiceDate||b.inwardDate));
  let previous=null;
  for(const row of dated){
   if(previous&&previous.ro!==row.ro&&!row.previousRo&&row.fxSeverity!=='High'&&landingKey(previous.modelIdentity||previous.model||previous.itemName)!==landingKey(row.modelIdentity||row.model||row.itemName)&&material(pct(row.usdUnit,previous.usdUnit))){row.fxReview='Model identity pending';row.fxSeverity='Medium';row.fxDetail='Same brand code has a different description and USD price in RO '+previous.ro+'. Confirm configuration before attributing the change to currency.';}
   previous=row;
  }
 }
 for(const row of rows){
  if(row.evidenceIssue){row.fxReview=row.evidenceIssue;row.fxSeverity=['Document currency conflict','Agreement conflict'].includes(row.evidenceIssue)?'High':'Medium';row.fxDetail=row.issueDetail;}
  if(row.usdUnit==null){row.fxDetail=[row.fxDetail,'USD unit price is pending.'].filter(Boolean).join(' ');if(!row.evidenceIssue){row.fxReview='USD price pending';row.fxSeverity='Medium';}}
 }
 return rows;
}
function landingUnitSummary(rows,totalUnit){
 let totalQuantity=0,usdPricedQuantity=0,pairedQuantity=0,pendingQuantity=0,unquantifiedRows=0,excludedNonPositiveRows=0,totalUsd=0,pairedUsd=0,totalInr=0;
 for(const row of rows){
  const qty=row.quantity;
  if(qty===null||qty===undefined||!Number.isFinite(qty)){unquantifiedRows++;continue;}
  if(qty<=0){excludedNonPositiveRows++;continue;}
  totalQuantity+=qty;
  const usd=typeof row.usdUnit==='number'&&Number.isFinite(row.usdUnit)&&row.usdUnit>=0;
  const inr=usd&&typeof row.inrUnitBeforeGst==='number'&&Number.isFinite(row.inrUnitBeforeGst)&&row.inrUnitBeforeGst>=0&&row.aiInrPerUsd>0;
  if(usd){usdPricedQuantity+=qty;totalUsd+=qty*row.usdUnit;}
  if(inr){pairedQuantity+=qty;pairedUsd+=qty*row.usdUnit;totalInr+=qty*row.inrUnitBeforeGst;}else pendingQuantity+=qty;
 }
 return {rowCount:rows.length,roCount:new Set(rows.map(r=>r.ro)).size,totalUnit,totalQuantity,usdPricedQuantity,pairedQuantity,pendingQuantity,unquantifiedRows,excludedNonPositiveRows,
  totalUsd:usdPricedQuantity?totalUsd:null,pairedUsd:pairedQuantity?pairedUsd:null,totalInr:pairedQuantity?totalInr:null,
  avgUsd:pairedQuantity?pairedUsd/pairedQuantity:null,avgInr:pairedQuantity?totalInr/pairedQuantity:null,
  effectiveInrPerUsd:pairedUsd>0?totalInr/pairedUsd:null,usdPricedAvg:usdPricedQuantity?totalUsd/usdPricedQuantity:null};
}

/** Price and INR averages use the same positive-quantity paired rows. Missing values are never zero. */
export function summarizeLandingPrices(rows){
 const units=new Map();for(const row of rows){const unit=landingUnitKey(row.unit);const group=units.get(unit)||[];group.push(row);units.set(unit,group);}
 const byUnit=[...units].sort(([a],[b])=>landingCollator.compare(a,b)).map(([unit,group])=>landingUnitSummary(group,unit));
 const result=landingUnitSummary(rows,byUnit.length===1?byUnit[0].totalUnit:'');
 const mixedUnits=byUnit.length>1||byUnit.some(group=>group.totalUnit==='unspecified');
 if(mixedUnits)for(const field of ['totalQuantity','usdPricedQuantity','pairedQuantity','pendingQuantity','avgUsd','avgInr','usdPricedAvg'])result[field]=null;
 return {...result,mixedUnits,byUnit};
}

/** Shared server/review query: filter and total before pagination, with stable missing-last sorting. */
export const LANDING_PRICE_EXPORT_LIMIT=25000;
export function queryLandingPrices(rows,input={},coverage={},options={}){
 rows=reviewLandingPriceChanges(rows);
 const filters=validateLandingPriceQuery(input),q=landingKey(filters.q);
 const value=(row,name)=>name==='year'?row.inwardDate?.slice(0,4):name==='month'?row.inwardDate?.slice(5,7):name==='unit'?landingUnitKey(row.unit):row[{supplier:'vendorName',product:'productGroup'}[name]||name];
 const names=['year','month','supplier','product','masterCode','brand','status','unit','fxReview'];
 const filtered=rows.filter(row=>names.every(name=>!filters[name]||(filters[name]===LANDING_PRICE_MISSING?!landingPresent(value(row,name)):value(row,name)===filters[name]))&&(!q||[row.ro,row.inwardDate,row.vendorName,row.invoice,row.itemName,row.masterCode,row.brandCode,row.brand,row.model,row.productGroup,row.status].some(part=>landingKey(part).includes(q))));
 const direction=filters.direction==='asc'?1:-1;
 filtered.sort((a,b)=>{
  const x=a[filters.sort],y=b[filters.sort];if(!landingPresent(x)&&landingPresent(y))return 1;if(landingPresent(x)&&!landingPresent(y))return -1;
  const compared=typeof x==='number'&&typeof y==='number'?x-y:landingCollator.compare(String(x??''),String(y??''));
  return direction*compared||landingCollator.compare(a.ro,b.ro)||landingCollator.compare(a.id,b.id);
 });
 const facets={},facetKeys={year:'years',month:'months',supplier:'suppliers',product:'products',masterCode:'masterCodes',brand:'brands',status:'statuses',unit:'units',fxReview:'fxReviews'},truncatedFacets=[];
 for(const name of names){const options=[...new Set(rows.map(row=>value(row,name)||LANDING_PRICE_MISSING))].sort((a,b)=>a===LANDING_PRICE_MISSING?1:b===LANDING_PRICE_MISSING?-1:landingCollator.compare(a,b));if(name==='year')options.sort((a,b)=>a===LANDING_PRICE_MISSING?1:b===LANDING_PRICE_MISSING?-1:landingCollator.compare(b,a));if(options.length>1000)truncatedFacets.push(facetKeys[name]);facets[facetKeys[name]]=options.slice(0,1000);}
 const total=filtered.length,totalPages=Math.max(1,Math.ceil(total/filters.pageSize)),page=Math.min(filters.page,totalPages),offset=(page-1)*filters.pageSize;
 if(options.exportAll&&total>LANDING_PRICE_EXPORT_LIMIT)throw new RuleError('Export exceeds 25,000 item rows. Narrow the filters before downloading.');
 return {rows:options.exportAll?filtered:filtered.slice(offset,offset+filters.pageSize),summary:summarizeLandingPrices(filtered),facets,truncatedFacets,pagination:{page,pageSize:filters.pageSize,total,totalPages,from:total?offset+1:0,to:Math.min(total,offset+filters.pageSize)},filters:{...filters,page},coverage:{...coverage,totalRows:rows.length}};
}
