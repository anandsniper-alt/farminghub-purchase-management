import {selectedPaymentMonths} from '../shared/payment-plan-selection.mjs';
// Join all bounded supplier pages from one revision before producing a file.
const amount=n=>{if(n==null)return 'Pending';const v=BigInt(n),a=v<0n?-v:v;return (v<0n?'-':'')+(a/100n)+'.'+String(a%100n).padStart(2,'0');};
const sum=(rows,key)=>{
 if(rows.some(r=>r[key]===null))return null;
 const value=rows.reduce((n,r)=>{if(!Number.isSafeInteger(r[key]))throw Error('Invalid export amount.');return n+BigInt(r[key]);},0n);
 if(value>BigInt(Number.MAX_SAFE_INTEGER)||value<BigInt(Number.MIN_SAFE_INTEGER))throw Error('Export total exceeds the supported amount. Select one supplier.');
 return Number(value);
};
const total=rows=>({amountMinor:sum(rows,'amountMinor'),estimatedInrMinor:sum(rows,'estimatedInrMinor')});
const monthName=m=>new Date(m+'-01T12:00:00Z').toLocaleDateString('en-GB',{month:'long',year:'numeric',timeZone:'UTC'});
export function paymentPlanExportModel(reports,query={},source='PMS workspace'){
 if(!reports.length)throw Error('No payment plan to export.');
 const first=reports[0],layout=query.layout||'weekly',forecast=layout==='forecast',kind=forecast?'forecast':'matrix',data=first[kind];
 if(!['weekly','monthly','forecast'].includes(layout)||!data)throw Error('Choose a payment table before downloading.');
 const selected=forecast?[]:selectedPaymentMonths({...query,year:query.year??first.year},first.asOf);
 if(!forecast&&!selected.length)throw Error('Select at least one month before downloading.');
 const chosen=new Set(selected),choose=d=>forecast?d.months:(layout==='weekly'?d.weeks:d.months).filter(b=>chosen.has(b.month));
 const signature=r=>JSON.stringify([r.revision,r.asOf,r.currency,r.supplierId,r.year,r[kind].startMonth,r[kind].endMonth,r[kind].supplierTotal,r[kind].supplierPages,choose(r[kind]).map(b=>[b.month,b.week,b.rate,b.totals])]);
 const pages=new Map();
 for(const r of reports){if(!r[kind]||signature(r)!==signature(first))throw Error('The payment plan changed during download. Refresh and retry.');const page=r[kind].supplierPage;if(pages.has(page))throw Error('Duplicate supplier export page.');pages.set(page,r[kind]);}
 if(pages.size!==data.supplierPages)throw Error('The supplier export is incomplete. Refresh and retry.');
 const suppliers=[],buckets=choose(data).map(b=>({...b,cells:[]}));
 if(buckets.length!==(forecast?3:selected.length*(layout==='weekly'?4:1)))throw Error('The selected export period is incomplete.');
 if(!forecast){
  const actual=buckets.map(b=>layout==='weekly'?b.month+':'+b.week:b.month);
  const expected=selected.flatMap(month=>layout==='weekly'?[1,2,3,4].map(week=>month+':'+week):[month]);
  if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('The selected export period is incomplete or duplicated.');
 }
 for(let page=1;page<=data.supplierPages;page++){
  const d=pages.get(page);if(!d)throw Error('The supplier export is incomplete.');
  suppliers.push(...d.suppliers.map(({id,name,code})=>({id,name,code})));
  choose(d).forEach((b,i)=>buckets[i].cells.push(...b.cells.map(c=>({...c}))));
 }
 if(suppliers.length!==data.supplierTotal||new Set(suppliers.map(s=>s.id)).size!==suppliers.length)throw Error('Supplier export is incomplete or duplicated.');
 const ids=new Set(suppliers.map(s=>s.id));
 for(const b of buckets){
  if(b.cells.length!==suppliers.length||new Set(b.cells.map(c=>c.supplierId)).size!==suppliers.length||b.cells.some(c=>!ids.has(c.supplierId)))throw Error('Supplier cells are incomplete or duplicated.');
  const t=total(b.cells);
  for(const k of ['amountMinor',...(first.currency==='CNY'?[]:['estimatedInrMinor'])])if(t[k]!==b.totals[k])throw Error('Export supplier totals do not reconcile.');
 }
 for(const supplier of suppliers)supplier.totals=total(buckets.map(b=>b.cells.find(c=>c.supplierId===supplier.id)));
 const totals=total(buckets.map(b=>b.totals)),period=forecast?data.startMonth+' to '+data.endMonth:selected.join(', ');
 const selectedMonthly=data.months.filter(bucket=>chosen.has(bucket.month));
 if(!forecast&&(selectedMonthly.length!==selected.length||new Set(selectedMonthly.map(bucket=>bucket.month)).size!==selected.length))throw Error('The selected monthly totals are incomplete or duplicated.');
 const expected=forecast?data.totals:total(selectedMonthly.map(bucket=>bucket.totals));
 for(const k of ['amountMinor',...(first.currency==='CNY'?[]:['estimatedInrMinor'])])if(totals[k]!==expected[k])throw Error('Export period totals do not reconcile.');
 const notes=[
  'All supplier pages in the selected filter are included. Supplier filter: '+(first.supplierId||'All suppliers')+'.',
  'Remaining supplier cash after recorded remittances. Planning does not authorize payment.',
  'Estimated INR uses each saved monthly planning rate. Missing rates are Pending, not zero. Native currencies are never added together.',
  'Weekly ranges are days 1-7, 8-14, 15-21 and 22-month end. Monthly periods cover full calendar months.',
  'No payment date: '+first.currency+' '+amount(first.forecast.context.undated.amountMinor)+'. Excluded from dated totals; review Date pending.',
  'Bank loan repayments, interest and fees are not included.'
 ];
 if(forecast)notes.push('Contractually overdue outside period: '+first.currency+' '+amount(data.context.overdueOutsidePeriod.amountMinor)+'. Review separately; not moved into this period.','Blocked within period: '+first.currency+' '+amount(data.context.blockedInPeriod.amountMinor)+'. Already included; do not add again.');
 else notes.push('Review Overdue separately for obligations outside this period. Blocked dated payments remain included and require the existing payment checks.');
 for(const warning of first.warnings||[])notes.push('Review: '+(typeof warning==='string'?warning:warning.message||'Check source records.'));
 return {title:layout==='weekly'?'Weekly supplier payment plan':forecast?'Three-month supplier payment forecast':'Monthly supplier payment summary',period,currency:first.currency,source,asOf:first.asOf,revision:first.revision,suppliers,buckets:buckets.map(b=>({label:layout==='weekly'?'Week '+b.week+' | '+b.startDate+' to '+b.endDate:monthName(b.month),week:b.week,startDate:b.startDate,endDate:b.endDate,rate:b.rate,cells:b.cells,totals:{amountMinor:b.totals.amountMinor,estimatedInrMinor:b.totals.estimatedInrMinor}})),totals,notes};
}
