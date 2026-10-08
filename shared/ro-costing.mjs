import {RuleError,scopeAllowed,canCreate,toMinor} from './domain.mjs';

export const RO_COST_SCOPE='LAE_IMPORT';
export const RO_ACTUAL_FIELDS=['supplierInr','bankNet','forwarderNet','otherNet','bcd','sws'];
const roFail=(message,code)=>{throw new RuleError(message,code);};
export const canWriteRoCosting=actor=>canCreate(actor,RO_COST_SCOPE);
export function assertRoCostAccess(actor,write=false){if(!scopeAllowed(actor,RO_COST_SCOPE)||write&&!canWriteRoCosting(actor))roFail('LAE Import '+(write?'cost editing':'access')+' is required.','FORBIDDEN');}
export function roCode(value){if(typeof value!=='string'||!value.length||value.length>60||value.trim()!==value||/[\x00-\x1f\x7f-\x9f\\/]/.test(value))roFail('Enter the exact RO number without surrounding spaces, control characters or path characters.');return value;}
function roText(value,max=500){if(value==null)return '';if(typeof value!=='string'||value.length>max)roFail('Invalid costing text.');return value;}
export function roAmount(value){if(value===null||value===undefined||value==='')return null;if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>1e10)roFail('Amounts must be non-negative numbers; leave missing amounts blank.');const minor=toMinor(value);if(!Number.isSafeInteger(minor))roFail('Amount is too large.');return minor/100;}
function roConversion(value){if(value===null||value===undefined||value==='')return null;if(typeof value!=='number'||!Number.isFinite(value)||value<=0||value>1e6)roFail('Conversion rates must be positive numbers; leave missing rates blank.');return Math.round(value*1e6)/1e6;}
function roDate(value){const s=roText(value,10),date=new Date(s+'T00:00:00Z');if(s&&(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==s))roFail('Use a valid YYYY-MM-DD date.');return s;}
export const RO_WORKSHEET_STATUSES=['Historical reference','Provisional reference','Partial reference','Pending'];
function worksheetObject(value){if(!value||typeof value!=='object'||Array.isArray(value))roFail('Worksheet comparison requires an object.');return value;}
function worksheetList(value,max,label){if(value==null)return [];if(!Array.isArray(value)||value.length>max)roFail('Too many or invalid worksheet '+label+'.');return value;}
function worksheetNumber(value,{signed=false,rate=false}={}){
 if(value==null||value==='')return null;
 if(typeof value!=='number'||!Number.isFinite(value)||Math.abs(value)>(rate?1e6:1e12)||(!signed&&value<0)||(rate&&value<=0))roFail('Invalid worksheet reference number.');
 // Preserve source precision. These references never enter actual-payment arithmetic.
 return value;
}
function worksheetStatus(value){if(!RO_WORKSHEET_STATUSES.includes(value))roFail('Choose an explicit worksheet reference status.');return value;}
function worksheetSide(input={},withRows=false){
 const v=worksheetObject(input),side={rate:worksheetNumber(v.rate,{rate:true}),totalInr:worksheetNumber(v.totalInr),goodsUsd:worksheetNumber(v.goodsUsd),basis:roText(v.basis,4000),formula:roText(v.formula,4000)};
 if(withRows)side.rows=worksheetList(v.rows,600,'component rows').map(input=>{const row=worksheetObject(input),value=typeof row.value==='string'?roText(row.value,4000):worksheetNumber(row.value,{signed:true});return {label:roText(row.label,300),value,unit:roText(row.unit,40),cell:roText(row.cell,200),formula:roText(row.formula,4000),basis:roText(row.basis,4000)};});
 return side;
}
export function validateWorksheetComparison(input){
 const v=worksheetObject(input);if(v.version!==1)roFail('Unsupported worksheet comparison version.');
 const ids=new Set(),workings=worksheetList(v.workings,100,'invoice workings').map(input=>{
  const w=worksheetObject(input),id=roText(w.id,200);if(!id||ids.has(id))roFail('Worksheet working IDs must be present and unique.');ids.add(id);
  const source=worksheetObject(w.source||{}),file=roText(source.file,300),sha256=roText(source.sha256,64);
  if(/[\\/\x00-\x1f]/.test(file)||/^[A-Za-z]:/.test(file))roFail('Worksheet source must be a file basename, without local paths.');
  if(sha256&&!/^[a-f0-9]{64}$/i.test(sha256))roFail('Invalid worksheet source checksum.');
  return {id,invoice:roText(w.invoice,200),supplier:roText(w.supplier,300),status:worksheetStatus(w.status),basis:roText(w.basis,4000),source:{file,sheet:roText(source.sheet,200),sha256},ai:worksheetSide(w.ai,true),suresh:worksheetSide(w.suresh,true)};
 });
 const selectedWorkingIds=worksheetList(v.selectedWorkingIds,100,'selected workings').map(id=>roText(id,200));
 if(new Set(selectedWorkingIds).size!==selectedWorkingIds.length||selectedWorkingIds.some(id=>!ids.has(id)))roFail('Selected worksheet IDs must identify unique retained workings.');
 const result={version:1,status:worksheetStatus(v.status),basis:roText(v.basis,4000),reviewedOn:roDate(v.reviewedOn),source:roText(v.source,1000),selectedWorkingIds,ai:worksheetSide(v.ai),suresh:worksheetSide(v.suresh),workings};
 if(result.status==='Pending'&&(result.ai.rate!==null||result.suresh.rate!==null))roFail('Pending worksheet comparisons must leave headline rates blank.');
 return result;
}
export function worksheetComparisonSummary(record){
 const v=record.worksheetComparison;if(!v)return null;
 return {status:v.status,basis:v.basis,reviewedOn:v.reviewedOn,aiRate:v.ai.rate,sureshRate:v.suresh.rate};
}
export function validateRoPurchaseItems(input,comparison){
 const v=worksheetObject(input);if(v.version!==1)roFail('Unsupported purchase item reference version.');
 const ids=new Set(),rows=worksheetList(v.rows,500,'purchase items').map(input=>{
  const r=worksheetObject(input),id=roText(r.id,200);if(!id||ids.has(id))roFail('Purchase item IDs must be present and unique within the RO.');ids.add(id);
  const currency=roText(r.currency,10);if(!['USD','CNY','UNKNOWN','CONFLICT','FOC'].includes(currency))roFail('Confirm purchase item currency.');
  const status=roText(r.status,40);if(!['Verified reference','Provisional reference','Pending'].includes(status))roFail('Choose an explicit purchase item reference status.');
  const quantity=worksheetNumber(r.quantity),unitPrice=worksheetNumber(r.unitPrice),usdUnitPrice=worksheetNumber(r.usdUnitPrice),usdBasis=roText(r.usdBasis,2000),workingId=roText(r.workingId,200);
  if(currency==='USD'&&unitPrice!==null&&usdUnitPrice!==null&&Math.abs(unitPrice-usdUnitPrice)>0.000001)roFail('USD item prices must retain the original USD unit price.');
  if(usdUnitPrice!==null&&currency!=='USD'&&!usdBasis.trim())roFail('Explain the verified USD basis for a non-USD purchase item.');
  if(workingId&&!comparison?.selectedWorkingIds.includes(workingId))roFail('Purchase item conversion must reference a selected worksheet working.');
  const source=worksheetObject(r.source||{}),file=roText(source.file,300),sha256=roText(source.sha256,64);
  if(/[\\/\x00-\x1f]/.test(file)||/^[A-Za-z]:/.test(file))roFail('Purchase source must be a file basename, without local paths.');
  if(sha256&&!/^[a-f0-9]{64}$/i.test(sha256))roFail('Invalid purchase source checksum.');
  return {id,supplier:roText(r.supplier,300),invoice:roText(r.invoice,200),itemCode:roText(r.itemCode,200),masterCode:roText(r.masterCode,200),masterCodeRaw:roText(r.masterCodeRaw,200),description:roText(r.description,1000),model:roText(r.model,300),productGroup:roText(r.productGroup,300),quantity,unit:roText(r.unit,40),currency,unitPrice,usdUnitPrice,usdBasis,status,workingId,source:{file,sheet:roText(source.sheet,200),row:roText(source.row,200),sha256},flags:worksheetList(r.flags,20,'item flags').map(flag=>roText(flag,1000))};
 });
 return {version:1,basis:roText(v.basis,4000),reviewedOn:roDate(v.reviewedOn),rows};
}
export function validateRoRecord(input){
 if(!input||typeof input!=='object'||Array.isArray(input))roFail('RO costing record required.');
 const invoices=input.invoices||[],expenses=input.expenses||[],issues=input.issues||[];
 if(!Array.isArray(invoices)||invoices.length>100||!Array.isArray(expenses)||expenses.length>200||!Array.isArray(issues)||issues.length>100)roFail('Split this RO into a smaller reviewed costing record.');
 const keys=new Set();const cleanInvoices=invoices.map(i=>{const supplier=roText(i.supplier,200),invoice=roText(i.invoice,200),key=supplier+'\u0000'+invoice;if(!invoice||keys.has(key))roFail('Supplier invoice references must be present and unique within the RO.');keys.add(key);const currency=roText(i.currency,10);if(!['USD','CNY','UNKNOWN','CONFLICT'].includes(currency))roFail('Confirm the supplier invoice currency.');const goods=roAmount(i.goods),extras=roAmount(i.extras),face=roAmount(i.face);if(goods!==null&&extras!==null&&face!==null&&Math.abs(toMinor(goods)+toMinor(extras)-toMinor(face))>1)roFail('Invoice goods plus extras must equal its face value.');return {supplier,invoice,currency,goods,extras,face,basis:roText(i.basis,2000),review:roText(i.review,2000),sha256:roText(i.sha256,64)};});
 const actuals={};for(const key of RO_ACTUAL_FIELDS)actuals[key]=roAmount(input.actuals?.[key]);
 actuals.sureshRate=roConversion(input.actuals?.sureshRate);
 actuals.expenseCoverage=input.actuals?.expenseCoverage==='Complete'?'Complete':'Pending';
 actuals.currencyConfirmed=input.actuals?.currencyConfirmed===true;
 actuals.confirmation=roText(input.actuals?.confirmation,2000);
 if(actuals.expenseCoverage==='Complete'&&!actuals.confirmation.trim())roFail('Explain how actual payment, expenses and any nil amounts were verified.');
 const cleanExpenses=expenses.map(e=>({document_no:roText(e.document_no,200),component:roText(e.component,200),currency:roText(e.currency,10),net:roAmount(e.net),gst:roAmount(e.gst),gross:roAmount(e.gross),basis:roText(e.basis,2000),allocation:roText(e.allocation,1000),provisional:e.provisional===true,include:e.include===true,sha256:roText(e.sha256,64),ros:Array.isArray(e.ros)?e.ros.map(roCode):[]}));
 const record={ro:roCode(input.ro),supplier:roText(input.supplier,300),inwardDate:roDate(input.inwardDate),boeDate:roDate(input.boeDate),boe:roText(input.boe,100),containers:roText(input.containers,1000),customsFx:roConversion(input.customsFx),boeGoodsUsd:roAmount(input.boeGoodsUsd),boeGoodsBasis:roText(input.boeGoodsBasis,1000),invoices:cleanInvoices,expenses:cleanExpenses,issues:issues.map(i=>({severity:roText(i.severity,30),topic:roText(i.topic,200),detail:roText(i.detail,4000)})),actuals,source:roText(input.source,300),notes:roText(input.notes,4000)};
 if(input.worksheetComparison!=null)record.worksheetComparison=validateWorksheetComparison(input.worksheetComparison);
 if(input.purchaseItems!=null)record.purchaseItems=validateRoPurchaseItems(input.purchaseItems,record.worksheetComparison);
 if(JSON.stringify(record).length>150000)roFail('RO costing details exceed the record size limit.');return record;
}
export function calculateRoPurchaseItems(input){
 const record=validateRoRecord(input),actual=calculateRoCosting(record),comparison=record.worksheetComparison;
 const rows=(record.purchaseItems?.rows||[]).map(row=>{
  const working=row.workingId?comparison?.workings.find(w=>w.id===row.workingId):null;
  const reference=working?.ai||comparison?.ai,referenceStatus=working?.status||comparison?.status;
  const rate=actual.rate??(['Historical reference','Provisional reference'].includes(referenceStatus)?reference?.rate:null)??null;
  const rateStatus=actual.rate!==null?'Verified actual':rate!==null?referenceStatus:'Pending';
  const rateBasis=actual.rate!==null?'Verified actual before-GST INR total / unique goods USD':rate!==null?(working?.basis||comparison?.basis||'Worksheet AI reference'):'Before-GST conversion is pending.';
  const usdLineTotal=row.quantity!==null&&row.usdUnitPrice!==null?row.quantity*row.usdUnitPrice:null;
  const inrUnitCost=rate!==null&&row.usdUnitPrice!==null?row.usdUnitPrice*rate:null;
  return {...row,rate,rateStatus,rateBasis,usdLineTotal,inrUnitCost,inrLineTotal:inrUnitCost!==null&&row.quantity!==null?inrUnitCost*row.quantity:null};
 });
 const units=new Set(rows.map(row=>row.unit)),completeQuantity=rows.length>0&&rows.every(row=>row.quantity!==null)&&units.size===1&&!!rows[0].unit,completeUsd=rows.length>0&&rows.every(row=>row.usdLineTotal!==null),completeInr=rows.length>0&&rows.every(row=>row.inrLineTotal!==null);
 const sum=key=>rows.reduce((total,row)=>total+(row[key]??0),0),goodsUsd=completeUsd?sum('usdLineTotal'):null;
 const goodsBasis=actual.rate!==null?actual.goodsUsd:comparison?.ai.goodsUsd??actual.goodsUsd;
 const differencePercent=goodsUsd!==null&&goodsBasis>0?(goodsUsd/goodsBasis-1)*100:null;
 return {rows,totalQuantity:completeQuantity?sum('quantity'):null,quantityUnit:completeQuantity?rows[0].unit:'',knownGoodsUsd:sum('usdLineTotal'),knownTotalInr:sum('inrLineTotal'),completeUsd,completeInr,goodsBasis,differencePercent,pendingItems:rows.filter(row=>row.usdUnitPrice===null||row.rate===null||row.quantity===null).length};
}
export function calculateRoCosting(input){
 const record=validateRoRecord(input),a=record.actuals,pending=[];
 const usd=record.invoices.filter(i=>i.currency==='USD');
 const invoiceMinor=usd.reduce((n,i)=>n+(i.goods===null?0:toMinor(i.goods)),0);
 const candidate=(record.invoices.length?invoiceMinor:toMinor(record.boeGoodsUsd||0))/100;
 const validInvoices=!record.invoices.some(i=>i.currency!=='USD'||i.goods===null);
 const goodsUsd=validInvoices&&candidate>0?candidate:null;
 if(!validInvoices||goodsUsd===null)pending.push('Confirm USD goods value for every supplier invoice.');
 if(!record.invoices.length)pending.push('Original supplier invoice is missing; BOE goods value is reference only.');
 if(record.invoices.some(i=>/^BOE invoice face;/i.test(i.basis)))pending.push('Original supplier invoice is missing; replace the BOE-only invoice basis after verifying the supplier invoice.');
 if(!a.currencyConfirmed)pending.push('USD basis not confirmed.');
 for(const key of RO_ACTUAL_FIELDS)if(a[key]===null)pending.push('Actual '+({supplierInr:'supplier payment INR',bankNet:'bank charges',forwarderNet:'forwarder charges',otherNet:'other landing expenses',bcd:'BCD',sws:'SWS'}[key])+' is missing.');
 if(a.supplierInr===0)pending.push('Supplier goods payment INR must be positive for a paid goods invoice.');
 if(a.expenseCoverage!=='Complete')pending.push('Actual expense coverage is pending.');
 const enteredTotal=RO_ACTUAL_FIELDS.reduce((n,key)=>n+(a[key]===null?0:toMinor(a[key])),0)/100;
 const rate=pending.length?null:enteredTotal/goodsUsd;
 const faceUsd=usd.length&&validInvoices?usd.reduce((n,i)=>n+toMinor(i.face??i.goods??0),0)/100:null;
 return {goodsUsd,faceUsd,enteredTotal,rate,status:rate===null?'Pending':'Complete',pending,sureshRate:a.sureshRate,differencePercent:rate!==null&&a.sureshRate>0?(rate/a.sureshRate-1)*100:null};
}

// Display adapters accept only named net INR components, never a raw-cell sum.
// Unknown labels, source totals, GST, FX and per-item values cannot become expenses.
const RO_DISPLAY_COMPONENTS=[
 ['supplier','Supplier value',['Supplier INR worksheet basis','Supplier goods INR proxy','Supplier goods inr']],
 ['invoiceExtras','Invoice extras',['Supplier invoice extra inr']],
 ['bank','Bank charges',['Bank charges']],
 ['bcd','BCD',['BCD']],['sws','SWS',['SWS']],
 ['freight','Ocean freight',['Freight before GST','Ocean freight before GST','Ocean freight']],
 ['insurance','Insurance',['Insurance','Insurance and stamp','Net insurance plus stamp']],
 ['clearance','Clearance',['Clearance','Clearance estimate']],
 ['miscellaneous','Miscellaneous',['Miscellaneous','Miscellaneous including delivery order','Misc estimate including do and amendment']],
 ['inland','Inland freight',['Inland transport','Inland freight estimate','Inland estimate']],
 ['liner','Liner charges',['Liner charge','Liner before GST','Liner proforma net']],
 ['packing','Packing',['Explicit packing cost']],
 ['storage','Storage / demurrage',['Additional storage net once']],
 ['other','Other expenses',['Other known net expenses']],
];
const roDisplayLabel=value=>String(value).trim().replace(/\s+/g,' ').toLowerCase();
const roDisplayNear=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=0.01;

/** Read-only presentation of one chosen costing basis. Never fills stored actuals. */
export function calculateRoCostDisplay(input){
 const record=validateRoRecord(input),actual=calculateRoCosting(record),comparison=record.worksheetComparison;
 const actualComplete=actual.rate!==null,reference=!actualComplete&&comparison&&comparison.status!=='Pending';
 const usableReference=reference&&['Historical reference','Provisional reference'].includes(comparison.status);
 const actualKnown=RO_ACTUAL_FIELDS.some(key=>record.actuals[key]!==null);
 const goodsUsd=reference?comparison.ai.goodsUsd:actual.goodsUsd;
 const totalInr=actualComplete?actual.enteredTotal:reference?comparison.ai.totalInr:null;
 const result={basis:actualComplete?'Actual':reference?'Worksheet AI':actualKnown?'Known actuals':'Pending',status:actualComplete?'Verified actual':reference?comparison.status:'Pending',goodsUsd,totalInr,aiRate:actualComplete?actual.rate:usableReference?comparison.ai.rate:null,sureshRate:actualComplete?actual.sureshRate??comparison?.suresh.rate??null:comparison?.suresh.rate??actual.sureshRate,components:[],expensesInr:null,knownExpensesInr:null,knownTotalInr:null,breakdownComplete:false,reconciled:false,unallocatedInr:null,pendingComponents:[],selectedWorkingIds:reference?[...comparison.selectedWorkingIds]:[],totalKind:actualComplete||usableReference&&totalInr!==null?'Total cost':'Known subtotal'};
 let components=[],ambiguous=false;
 if(actualComplete||!reference&&actualKnown){
  const names={supplierInr:['supplier','Supplier payment'],bankNet:['bank','Bank charges'],forwarderNet:['forwarder','Forwarder expenses'],otherNet:['other','Other expenses'],bcd:['bcd','BCD'],sws:['sws','SWS']};
  components=RO_ACTUAL_FIELDS.map(key=>({key:names[key][0],label:names[key][1],inr:record.actuals[key]}));
 }else if(reference&&totalInr!==null){
  // A pooled rate with no allocated total has no defensible RO component split.
  const selected=comparison.workings.filter(w=>comparison.selectedWorkingIds.includes(w.id)&&(w.ai.totalInr!==null||w.ai.rows.length));
  const identities=selected.map(w=>[roDisplayLabel(w.supplier),roDisplayLabel(w.invoice)].join('\u0000'));
  const aligned=selected.length>0&&new Set(identities).size===identities.length&&selected.every(w=>w.ai.totalInr!==null)&&roDisplayNear(selected.reduce((n,w)=>n+w.ai.totalInr,0),totalInr)&&
   (goodsUsd===null||selected.every(w=>w.ai.goodsUsd!==null)&&roDisplayNear(selected.reduce((n,w)=>n+w.ai.goodsUsd,0),goodsUsd));
  if(aligned){
   const fields=new Map(RO_DISPLAY_COMPONENTS.flatMap(([key,label,aliases])=>aliases.map(alias=>[roDisplayLabel(alias),{key,label}]))),groups=new Map();
   for(const working of selected){
    const once=new Map();
    for(const row of working.ai.rows){
     const field=fields.get(roDisplayLabel(row.label));if(!field||row.unit!=='INR')continue;
     const previous=once.get(field.key),value=typeof row.value==='number'&&row.value>=0?row.value:null;
     // Repeated aliases may be a repeated raw cell or a second amount: do not guess.
     if(previous){previous.inr=null;ambiguous=true;}else once.set(field.key,{...field,inr:value});
    }
    // Offsetting gaps in separate invoices must not cancel into a complete split.
    if(!roDisplayNear([...once.values()].reduce((n,row)=>n+(row.inr??0),0),working.ai.totalInr))ambiguous=true;
    for(const entry of once.values()){
     const previous=groups.get(entry.key);
     if(previous)previous.inr=previous.inr===null||entry.inr===null?null:previous.inr+entry.inr;
     else groups.set(entry.key,{...entry});
    }
   }
   components=RO_DISPLAY_COMPONENTS.filter(([key])=>groups.has(key)).map(([key])=>groups.get(key));
  }else ambiguous=true;
 }
 const sum=rows=>rows.reduce((n,row)=>n+(row.inr??0),0),known=sum(components),supplier=components.find(row=>row.key==='supplier');
 result.knownTotalInr=totalInr??(components.length?known:null);
 result.unallocatedInr=totalInr===null?null:roDisplayNear(totalInr,known)?0:totalInr-known;
 result.reconciled=totalInr!==null&&result.unallocatedInr===0&&!ambiguous&&components.length>0;
 result.pendingComponents=components.filter(row=>row.inr===null).map(row=>row.label);
 if(ambiguous||reference&&!components.length)result.pendingComponents.push('Component allocation');
 result.breakdownComplete=result.reconciled&&result.pendingComponents.length===0;
 const expenseRows=components.filter(row=>row.key!=='supplier');
 result.knownExpensesInr=expenseRows.length?sum(expenseRows):null;
 result.expensesInr=result.breakdownComplete&&supplier&&supplier.inr!==null?result.knownExpensesInr:null;
 result.components=components.map(row=>({...row,perUsd:row.inr!==null&&goodsUsd>0?row.inr/goodsUsd:null,sharePercent:row.inr!==null&&totalInr>0?row.inr/totalInr*100:null}));
 return result;
}
