import test from 'node:test';
import assert from 'node:assert/strict';
import {createSeed} from '../shared/seed.mjs';
import {paymentPlannerReport} from '../shared/payment-planner-report.mjs';
import {paymentPlanExportModel} from '../web/payment-planner-export-data.mjs';
function fixture(){
 const state=createSeed('2026-10-15'),base=structuredClone(state.orders[0]),vendor=state.vendors.find(v=>v.id===base.vendorId);state.orders=[];state.payments=[];
 for(let i=0;i<24;i++){
  const o=structuredClone(base),id='download-'+i;state.vendors.push({...vendor,id,name:'Supplier '+i,code:'S'+i});
  Object.assign(o,{id,number:'PO-'+i,vendorId:id,currency:'USD',status:'ISSUED',deletedAt:null,testData:null});
  o.lines=[{...o.lines[0],quantity:1,unitPriceMinor:100}];o.paymentTerms={name:'PI',steps:[{name:'Full',trigger:'PI',percent:100,days:0}]};o.pi={status:'APPROVED',approvedAt:(i%2?'2026-12-15':'2026-11-08')+'T00:00:00Z'};o.shipments=[];o.paymentAuthorizations=[];delete o.ciPaymentPolicy;state.orders.push(o);
 }
 state.settings.paymentPlanner={dates:{},rates:{'2026-11':{rate:96000000},'2026-12':{rate:97000000}}};
 const user=state.users.find(u=>u.role==='MANAGER');return {state,user};
}
function reports(setup,q){return [1,2].map(supplierPage=>paymentPlannerReport(setup.state,setup.user,{year:2026,forecastStart:'2026-11',...q,supplierPage}));}
const allMonths=Array.from({length:12},(_,i)=>'2026-'+String(i+1).padStart(2,'0')).join(',');
test('weekly export includes all supplier pages and only the selected month, without changing reports',()=>{
 const r=reports(fixture()),before=structuredClone(r),m=paymentPlanExportModel(r,{layout:'weekly',month:'2026-11'},'Local demo');
 assert.equal(m.suppliers.length,24);assert.equal(m.buckets.length,4);assert.equal(m.period,'2026-11');
 assert.deepEqual(m.buckets.map(b=>b.totals.amountMinor),[0,1200,0,0]);assert.equal(m.totals.estimatedInrMinor,115200);assert.equal(m.buckets[1].rate,96000000);assert.match(m.buckets[1].label,/2026-11-08 to 2026-11-14/);assert.deepEqual(r,before);
});
test('monthly and cross-year export reuse exact allocated totals and explicit missing rates',()=>{
 const setup=fixture(),r=reports(setup),m=paymentPlanExportModel(r,{layout:'monthly',months:allMonths}),f=paymentPlanExportModel(r,{layout:'forecast'});
 assert.equal(m.buckets.length,12);assert.equal(f.buckets.length,3);assert.equal(f.period,'2026-11 to 2027-01');assert.equal(f.totals.amountMinor,2400);assert.equal(f.totals.estimatedInrMinor,231600);assert.deepEqual(m.totals,f.totals);
 delete setup.state.settings.paymentPlanner.rates['2026-12'];const pending=paymentPlanExportModel(reports(setup),{layout:'forecast'});assert.equal(pending.totals.estimatedInrMinor,null);assert.equal(pending.buckets[2].totals.estimatedInrMinor,0);
});
test('download rejects missing pages, changed revision, duplicate cells and nonreconciling amounts',()=>{
 const r=reports(fixture()),q={layout:'monthly',months:allMonths};
 assert.throws(()=>paymentPlanExportModel(r.slice(0,1),q),/incomplete/);
 assert.throws(()=>paymentPlanExportModel([r[0],r[0]],q),/Duplicate/);
 let bad=structuredClone(r);bad[1].revision++;assert.throws(()=>paymentPlanExportModel(bad,q),/changed/);
 bad=structuredClone(r);bad[1].matrix.months[10].cells[0].amountMinor++;assert.throws(()=>paymentPlanExportModel(bad,q),/reconcile/);
 bad=structuredClone(r);bad[1].matrix.months[10].cells[0].supplierId=bad[1].matrix.months[10].cells[1].supplierId;assert.throws(()=>paymentPlanExportModel(bad,q),/duplicated/);
});
test('disjoint month selection has identical weekly and monthly outstanding across every supplier page',()=>{
 const setup=fixture();
 setup.state.orders.forEach((order,i)=>{if(i%2)order.pi.approvedAt='2026-01-15T00:00:00Z';});
 setup.state.settings.paymentPlanner.rates['2026-01']={rate:95000000};
 const r=reports(setup),before=structuredClone(r),query={year:2026,months:'2026-11,2026-01'};
 const weekly=paymentPlanExportModel(r,{...query,layout:'weekly'}),monthly=paymentPlanExportModel(r,{...query,layout:'monthly'});
 assert.equal(weekly.suppliers.length,24);assert.equal(monthly.suppliers.length,24);
 assert.equal(weekly.buckets.length,8);assert.equal(monthly.buckets.length,2);
 assert.equal(weekly.period,'2026-01, 2026-11');assert.equal(monthly.period,weekly.period);
 assert.match(weekly.buckets[0].label,/2026-01-01/);assert.match(weekly.buckets[4].label,/2026-11-01/);
 assert.deepEqual(monthly.buckets.map(b=>b.label),['January 2026','November 2026']);
 assert.deepEqual(weekly.totals,monthly.totals);assert.deepEqual(weekly.totals,{amountMinor:2400,estimatedInrMinor:229200});
 assert.deepEqual(weekly.suppliers,monthly.suppliers);assert.deepEqual(r,before);
 // Deselecting January must remove its amounts in either layout.
 const november=paymentPlanExportModel(r,{layout:'monthly',months:'2026-11'});
 assert.equal(november.totals.amountMinor,1200);assert.equal(november.totals.estimatedInrMinor,115200);
});
test('selected month downloads preserve Pending and reject empty, invalid, or malformed periods',()=>{
 const setup=fixture();delete setup.state.settings.paymentPlanner.rates['2026-12'];const r=reports(setup);
 for(const layout of ['weekly','monthly']){
  const m=paymentPlanExportModel(r,{layout,months:'2026-11,2026-12'});
  assert.equal(m.totals.amountMinor,2400);assert.equal(m.totals.estimatedInrMinor,null);
  assert.throws(()=>paymentPlanExportModel(r,{layout,months:'none'}),/Select at least one month/);
  assert.throws(()=>paymentPlanExportModel(r,{layout,months:'2027-01'}),/valid months/);
  assert.throws(()=>paymentPlanExportModel(r,{layout,months:'2026-13'}),/valid months/);
 }
 const bad=structuredClone(r);bad.forEach(report=>{report.matrix.weeks[40].week=2;});
 assert.throws(()=>paymentPlanExportModel(bad,{layout:'weekly',months:'2026-11'}),/incomplete or duplicated/);
});
test('native currency and empty exports retain valid scope without fabricated conversion',()=>{
 const setup=fixture();setup.state.orders.forEach(o=>o.currency='CNY');
 const r=reports(setup,{currency:'CNY'}),m=paymentPlanExportModel(r,{layout:'weekly',month:'2026-11'});assert.equal(m.currency,'CNY');assert.equal(m.totals.amountMinor,1200);assert.equal(m.totals.estimatedInrMinor,null);
 const empty=paymentPlannerReport(setup.state,setup.user,{year:2026,currency:'USD'}),e=paymentPlanExportModel([empty],{layout:'weekly',month:'2026-11'});assert.equal(e.suppliers.length,0);assert.equal(e.totals.amountMinor,0);assert.equal(e.buckets.length,4);
});
