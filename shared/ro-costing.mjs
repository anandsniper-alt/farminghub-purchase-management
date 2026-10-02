import {RuleError,scopeAllowed,canCreate,toMinor} from './domain.mjs';

export const RO_COST_SCOPE='LAE_IMPORT';
export const RO_ACTUAL_FIELDS=['supplierInr','bankNet','forwarderNet','otherNet','bcd','sws'];
const roFail=(message,code)=>{throw new RuleError(message,code);};
export const canWriteRoCosting=actor=>canCreate(actor,RO_COST_SCOPE);
export function assertRoCostAccess(actor,write=false){if(!scopeAllowed(actor,RO_COST_SCOPE)||write&&!canWriteRoCosting(actor))roFail('LAE Import '+(write?'cost editing':'access')+' is required.','FORBIDDEN');}
export function roCode(value){if(typeof value!=='string'||!value.length||value.length>60||/[\x00-\x20\\/]/.test(value))roFail('Enter the exact RO number without spaces or path characters.');return value;}
function roText(value,max=500){if(value==null)return '';if(typeof value!=='string'||value.length>max)roFail('Invalid costing text.');return value;}
export function roAmount(value){if(value===null||value===undefined||value==='')return null;if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>1e10)roFail('Amounts must be non-negative numbers; leave missing amounts blank.');const minor=toMinor(value);if(!Number.isSafeInteger(minor))roFail('Amount is too large.');return minor/100;}
function roConversion(value){if(value===null||value===undefined||value==='')return null;if(typeof value!=='number'||!Number.isFinite(value)||value<=0||value>1e6)roFail('Conversion rates must be positive numbers; leave missing rates blank.');return Math.round(value*1e6)/1e6;}
function roDate(value){const s=roText(value,10),date=new Date(s+'T00:00:00Z');if(s&&(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==s))roFail('Use a valid YYYY-MM-DD date.');return s;}
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
 if(JSON.stringify(record).length>150000)roFail('RO costing details exceed the record size limit.');return record;
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
