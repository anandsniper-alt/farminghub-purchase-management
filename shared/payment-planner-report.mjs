import {paymentPlanner} from './payment-planner.mjs';
import {RuleError,scopeAllowed} from './domain.mjs';

export function paymentPlanningDay(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now),part=key=>parts.find(p=>p.type===key).value;
 return part('year')+'-'+part('month')+'-'+part('day');
}

const sections=['scheduled','overdue','unscheduled','commitments','acknowledgements','blocked','reconciliation'];
const integer=(value,min,max,label)=>{const n=Number(value);if(!Number.isSafeInteger(n)||n<min||n>max)throw new RuleError('Invalid '+label+'.');return n;};
const sum=(rows,field)=>{const n=rows.reduce((s,r)=>s+BigInt(r[field]||0),0n);if(n>BigInt(Number.MAX_SAFE_INTEGER)||n<BigInt(Number.MIN_SAFE_INTEGER))throw new RuleError('The payment plan total exceeds the supported amount. Narrow the supplier selection.');return Number(n);};
const weekOf=date=>Math.min(4,Math.ceil(Number(date.slice(8,10))/7));
const nativeAmount=(row,section)=>section==='acknowledgements'?row.awaitingAcknowledgementMinor:row.futureMinor;
function estimate(amount,currency,rate){
 if(!amount)return 0;
 if(currency==='INR')return amount;
 if(currency!=='USD'||!Number.isSafeInteger(rate)||rate<=0)return null;
 const n=(BigInt(amount)*BigInt(rate)+500000n)/1000000n;
 if(n>BigInt(Number.MAX_SAFE_INTEGER))throw new RuleError('The INR estimate exceeds the supported amount.');
 return Number(n);
}

// Round the monthly native total once. Allocate the remaining paise by largest
// fractional remainder, so row/week/page drilldowns reconcile to that estimate.
function monthlyEstimates(rows,currency,rates,field){
 const values=new Map(),groups=new Map();
 for(const row of rows){
  const amount=row[field]||0,month=row.month||row.effectiveDate?.slice(0,7)||'',rate=rates[month]?.rate;
  if(currency!=='USD'||!amount||!month||!Number.isSafeInteger(rate)||rate<=0){values.set(row.id,estimate(amount,currency,rate));continue;}
  if(!groups.has(month))groups.set(month,[]);
  const raw=BigInt(amount)*BigInt(rate);groups.get(month).push({id:row.id,base:raw/1000000n,remainder:raw%1000000n,raw});
 }
 for(const group of groups.values()){
  const total=group.reduce((n,r)=>n+r.raw,0n),rounded=(total+500000n)/1000000n;
  if(rounded>BigInt(Number.MAX_SAFE_INTEGER))throw new RuleError('The INR estimate exceeds the supported amount.');
  let extra=rounded-group.reduce((n,r)=>n+r.base,0n);
  group.sort((a,b)=>a.remainder===b.remainder?a.id.localeCompare(b.id):a.remainder>b.remainder?-1:1);
  for(const row of group){values.set(row.id,Number(row.base+(extra>0n?1n:0n)));if(extra>0n)extra--;}
 }
 return values;
}

/** Same bounded projection for authenticated reports and isolated browser review. */
export function paymentPlannerReport(state,user,query={}){
 if(!user||user.active===false||!scopeAllowed(user,'LAE_IMPORT'))throw new RuleError('LAE Import access is required.','FORBIDDEN');
 const asOf=paymentPlanningDay(),year=integer(query.year??asOf.slice(0,4),1900,9999,'planning year'),currency=query.currency||'USD',supplierId=String(query.supplierId||''),section=query.section||'scheduled';
 if(!['USD','CNY','INR'].includes(currency)||!sections.includes(section))throw new RuleError('Invalid payment plan filter.');
 const month=String(query.month||''),week=query.week?integer(query.week,1,4,'week'):null;
 if(month&&(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||Number(month.slice(0,4))!==year))throw new RuleError('Choose a month within the selected year.');
 if(week&&!month)throw new RuleError('Choose a month before a week.');
 const forecastStart=String(query.forecastStart==null||query.forecastStart===''?asOf.slice(0,7):query.forecastStart);
 if(!/^(?:19\d{2}|[2-9]\d{3})-(0[1-9]|1[0-2])$/.test(forecastStart)||forecastStart>'9999-10')throw new RuleError('Choose a forecast start month from January 1900 through October 9999.');
 const forecastMonthIndex=Number(forecastStart.slice(0,4))*12+Number(forecastStart.slice(5,7))-1;
 const forecastMonthKeys=Array.from({length:3},(_,i)=>Math.floor((forecastMonthIndex+i)/12)+'-'+String((forecastMonthIndex+i)%12+1).padStart(2,'0')),forecastEnd=forecastMonthKeys[2];
 const requestedPage=integer(query.page??1,1,1000000,'page'),pageSize=integer(query.pageSize??25,1,50,'page size'),requestedSupplierPage=integer(query.supplierPage??1,1,1000000,'supplier page');
 const plan=paymentPlanner(state,user,{asOf}),all=[...plan.rows,...plan.commitments];
 const vendorCodes=new Map(state.vendors.map(v=>[v.id,v.code]));
 const supplierMap=new Map(all.map(row=>[row.vendorId,{id:row.vendorId,name:row.vendorName||'Supplier name pending',code:vendorCodes.get(row.vendorId)||''}]));
 // Source identity is exact; the historical RO alias registry is not supplier-master authority.
 if(supplierId&&!supplierMap.has(supplierId))throw new RuleError('This supplier has no accessible payment-plan records.');
 const suppliers=[...supplierMap.values()].sort((a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
 const selected=row=>row.currency===currency&&(!supplierId||row.vendorId===supplierId);
 const rows=plan.rows.filter(selected),commitments=plan.commitments.filter(selected),future=rows.filter(row=>row.futureMinor>0);
 const selectedIds=new Set([...rows,...commitments].map(row=>row.orderId));
 const warnings=(plan.warnings||[]).filter(w=>typeof w==='string'||!w.orderId||selectedIds.has(w.orderId));
 const lists={scheduled:future.filter(row=>row.effectiveDate?.startsWith(String(year)+'-')),overdue:future.filter(row=>row.dueDate&&row.dueDate<asOf),unscheduled:future.filter(row=>!row.effectiveDate),commitments:commitments.filter(row=>row.futureMinor>0),acknowledgements:rows.filter(row=>row.awaitingAcknowledgementMinor>0),blocked:future.filter(row=>!row.ready),reconciliation:[...rows,...commitments].filter(row=>row.acknowledgementDifferenceMinor||row.overpaidMinor||row.unreconciledAdvanceMinor||row.overInvoicedMinor||row.kind==='PAYMENT_RECONCILIATION')};
 const rates=state.settings?.paymentPlanner?.rates||{};
 const rateFor=m=>Number.isSafeInteger(rates[m]?.rate)?rates[m].rate:null;
 const futureEstimates=monthlyEstimates([...rows,...commitments],currency,rates,'futureMinor'),ackEstimates=monthlyEstimates(rows,currency,rates,'awaitingAcknowledgementMinor');
 const decorate=(row,kind=section)=>{const amountMinor=nativeAmount(row,kind)||0;return {...row,amountMinor,estimatedInrMinor:(kind==='acknowledgements'?ackEstimates:futureEstimates).get(row.id)??null};};
 const totalsFor=(records,kind=section)=>{
  const decorated=records.map(row=>decorate(row,kind));
  return {count:records.length,amountMinor:sum(decorated,'amountMinor'),futureMinor:sum(records,'futureMinor'),awaitingAcknowledgementMinor:sum(records,'awaitingAcknowledgementMinor'),acknowledgementDifferenceMinor:sum(records,'acknowledgementDifferenceMinor'),overpaidMinor:sum(records,'overpaidMinor'),unreconciledAdvanceMinor:sum(records,'unreconciledAdvanceMinor'),overInvoicedMinor:sum(records,'overInvoicedMinor'),estimatedInrMinor:decorated.some(row=>row.estimatedInrMinor===null)?null:sum(decorated,'estimatedInrMinor')};
 };
 const months=Array.from({length:12},(_,i)=>{
  const key=year+'-'+String(i+1).padStart(2,'0'),records=lists.scheduled.filter(row=>row.effectiveDate.slice(0,7)===key);
  return {month:key,rate:rateFor(key),...totalsFor(records,'scheduled')};
 });
 // The year matrix is independent of detail filters and pagination. Group once,
 // then reuse the existing per-row monthly FX allocations for every cell/total.
 const supplierPageSize=20,scheduledSupplierIds=new Set(lists.scheduled.map(row=>row.vendorId)),matrixSuppliers=suppliers.filter(supplier=>scheduledSupplierIds.has(supplier.id));
 const supplierTotal=matrixSuppliers.length,supplierPages=Math.max(1,Math.ceil(supplierTotal/supplierPageSize)),supplierPage=Math.min(requestedSupplierPage,supplierPages),visibleSuppliers=matrixSuppliers.slice((supplierPage-1)*supplierPageSize,supplierPage*supplierPageSize),visibleSupplierIds=new Set(visibleSuppliers.map(supplier=>supplier.id));
 const monthRecords=new Map(),weekRecords=new Map(),supplierRecords=new Map();
 for(const row of lists.scheduled){
  const monthKey=row.effectiveDate.slice(0,7),weekKey=monthKey+':'+weekOf(row.effectiveDate);
  for(const [groups,key] of [[monthRecords,monthKey],[weekRecords,weekKey],[supplierRecords,row.vendorId]]){
   if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);
  }
 }
 const matrixBucket=(records,bucketSuppliers=visibleSuppliers)=>{
  const bucketSupplierIds=bucketSuppliers===visibleSuppliers?visibleSupplierIds:new Set(bucketSuppliers.map(supplier=>supplier.id));
  const groups=new Map();
  for(const row of records)if(bucketSupplierIds.has(row.vendorId)){if(!groups.has(row.vendorId))groups.set(row.vendorId,[]);groups.get(row.vendorId).push(row);}
  const visibleRecords=records.filter(row=>bucketSupplierIds.has(row.vendorId));
  return {cells:bucketSuppliers.map(supplier=>{const totals=totalsFor(groups.get(supplier.id)||[],'scheduled');return {supplierId:supplier.id,amountMinor:totals.amountMinor,estimatedInrMinor:totals.estimatedInrMinor,count:totals.count};}),totals:totalsFor(records,'scheduled'),visibleTotals:totalsFor(visibleRecords,'scheduled')};
 };
 const matrixMonths=months.map(({month:monthKey,rate})=>({month:monthKey,rate,...matrixBucket(monthRecords.get(monthKey)||[])}));
 const matrixWeeks=matrixMonths.flatMap(({month:monthKey,rate},i)=>{
  const monthEnd=[31,year%4===0&&(year%100!==0||year%400===0)?29:28,31,30,31,30,31,31,30,31,30,31][i];
  return Array.from({length:4},(_,j)=>({month:monthKey,week:j+1,startDate:monthKey+'-'+String(j*7+1).padStart(2,'0'),endDate:monthKey+'-'+String(j===3?monthEnd:(j+1)*7).padStart(2,'0'),rate,...matrixBucket(weekRecords.get(monthKey+':'+(j+1))||[])}));
 });
 const matrix={suppliers:visibleSuppliers.map(supplier=>({...supplier,totals:totalsFor(supplierRecords.get(supplier.id)||[],'scheduled')})),supplierPage,supplierPageSize,supplierPages,supplierTotal,weeks:matrixWeeks,months:matrixMonths,totals:totalsFor(lists.scheduled,'scheduled'),visibleTotals:totalsFor(lists.scheduled.filter(row=>visibleSupplierIds.has(row.vendorId)),'scheduled')};
 // Forecast months can cross the selected report year. Undated cash and overdue
 // cash outside the period are context, while blocked cash is an included subset.
 const inForecast=row=>row.effectiveDate&&row.month>=forecastStart&&row.month<=forecastEnd,forecastRows=future.filter(inForecast);
 const forecastSupplierIds=new Set(forecastRows.map(row=>row.vendorId)),forecastAllSuppliers=suppliers.filter(supplier=>forecastSupplierIds.has(supplier.id));
 const forecastSupplierTotal=forecastAllSuppliers.length,forecastSupplierPages=Math.max(1,Math.ceil(forecastSupplierTotal/supplierPageSize)),forecastSupplierPage=Math.min(requestedSupplierPage,forecastSupplierPages),forecastVisibleSuppliers=forecastAllSuppliers.slice((forecastSupplierPage-1)*supplierPageSize,forecastSupplierPage*supplierPageSize);
 const forecastGroups=new Map();
 for(const row of forecastRows){if(!forecastGroups.has(row.month))forecastGroups.set(row.month,[]);forecastGroups.get(row.month).push(row);}
 const forecastMonths=forecastMonthKeys.map(monthKey=>({month:monthKey,rate:rateFor(monthKey),...matrixBucket(forecastGroups.get(monthKey)||[],forecastVisibleSuppliers)})),forecastSummary=matrixBucket(forecastRows,forecastVisibleSuppliers);
 const forecast={startMonth:forecastStart,endMonth:forecastEnd,months:forecastMonths,suppliers:forecastVisibleSuppliers.map((supplier,i)=>({...supplier,totals:forecastSummary.cells[i]})),supplierPage:forecastSupplierPage,supplierPageSize,supplierPages:forecastSupplierPages,supplierTotal:forecastSupplierTotal,supplierTotals:forecastSummary.cells,totals:forecastSummary.totals,visibleTotals:forecastSummary.visibleTotals,missingRateMonths:currency==='USD'?forecastMonths.filter(bucket=>bucket.totals.amountMinor>0&&bucket.totals.estimatedInrMinor===null).map(bucket=>bucket.month):[],context:{undated:totalsFor(lists.unscheduled,'scheduled'),overdueOutsidePeriod:totalsFor(lists.overdue.filter(row=>!inForecast(row)),'scheduled'),blockedInPeriod:totalsFor(forecastRows.filter(row=>!row.ready),'scheduled')}};
 let filtered=lists[section];
 if(month&&!['unscheduled','commitments','reconciliation'].includes(section))filtered=filtered.filter(row=>row.effectiveDate?.slice(0,7)===month);
 const weeks=month?Array.from({length:4},(_,i)=>({week:i+1,...totalsFor(filtered.filter(row=>row.effectiveDate&&weekOf(row.effectiveDate)===i+1))})):[];
 if(week&&!['unscheduled','commitments','reconciliation'].includes(section))filtered=filtered.filter(row=>row.effectiveDate&&weekOf(row.effectiveDate)===week);
 filtered.sort((a,b)=>(a.effectiveDate||'9999').localeCompare(b.effectiveDate||'9999')||String(a.orderNumber||'').localeCompare(String(b.orderNumber||''),undefined,{numeric:true})||String(a.milestoneKey||'').localeCompare(String(b.milestoneKey||'')));
 const total=filtered.length,pages=Math.max(1,Math.ceil(total/pageSize)),page=Math.min(requestedPage,pages);
 return {revision:state.revision,asOf,year,currency,supplierId,month,week,section,page,pageSize,total,pages,rows:filtered.slice((page-1)*pageSize,page*pageSize).map(row=>decorate(row)),months,weeks,matrix,forecast,suppliers:suppliers.slice(0,1000),totals:totalsFor(filtered),counts:Object.fromEntries(sections.map(key=>[key,lists[key].length])),warnings:[...warnings.slice(0,20),...(warnings.length>20?[{message:'Showing 20 of '+warnings.length+' review warnings. Select one supplier to narrow the review.'}]:[]),...(suppliers.length>1000?[{message:'Only the first 1,000 supplier choices are shown; totals still include all accessible suppliers.'}]:[])],canEdit:['ADMIN','MANAGER'].includes(user.role)};
}
