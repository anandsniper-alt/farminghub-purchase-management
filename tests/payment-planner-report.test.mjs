import test from 'node:test';
import assert from 'node:assert/strict';
import {createSeed} from '../shared/seed.mjs';
import {paymentPlannerReport,paymentPlanningDay} from '../shared/payment-planner-report.mjs';
import {execute,isoDay} from '../shared/domain.mjs';

function fixture(count=1){
 const state=createSeed('2026-10-15'),base=structuredClone(state.orders[0]);
 state.payments=[];state.orders=[];
 for(let i=0;i<count;i++){
  const o=structuredClone(base);o.id='plan-order-'+i;o.number='PLAN-'+(i+1);o.numberSource='MANUAL';o.serialNumber=i+1;o.currency='USD';o.status='ISSUED';o.deletedAt=null;o.testData=null;
  o.lines=[{...o.lines[0],quantity:1,unitPriceMinor:1}];o.paymentTerms={name:'Pay on PI',steps:[{name:'Full value',trigger:'PI',percent:100,days:0}]};o.pi={...o.pi,status:'APPROVED',approvedAt:'2026-10-01T00:00:00Z'};o.shipments=[];o.paymentAuthorizations=[];delete o.ciPaymentPolicy;
  state.orders.push(o);
 }
 state.settings.paymentPlanner={rates:{'2026-10':{rate:96500000}},dates:{}};
 return {state,user:state.users.find(u=>u.role==='MANAGER')};
}

test('report pagination preserves exact monthly INR across month/week drilldowns',()=>{
 const {state,user}=fixture(55),query={year:2026,month:'2026-10',week:1,pageSize:25};
 const first=paymentPlannerReport(state,user,query),second=paymentPlannerReport(state,user,{...query,page:2}),last=paymentPlannerReport(state,user,{...query,page:3});
 assert.equal(first.total,55);assert.equal(first.pages,3);assert.equal(first.rows.length,25);assert.equal(last.rows.length,5);
 assert.equal(new Set([...first.rows,...second.rows,...last.rows].map(r=>r.id)).size,55);
 assert.equal(first.totals.futureMinor,55);assert.equal(first.totals.estimatedInrMinor,5308);
 assert.equal(first.months[9].estimatedInrMinor,5308);assert.equal(first.weeks[0].estimatedInrMinor,5308);
 assert.equal([...first.rows,...second.rows,...last.rows].reduce((n,r)=>n+r.estimatedInrMinor,0),5308);
 assert.equal(first.matrix.months[9].cells[0].count,55);assert.equal(first.matrix.months[9].cells[0].estimatedInrMinor,5308);
 assert.equal(first.matrix.weeks[36].cells[0].amountMinor,55);
});

test('missing rate is pending, explicit zero requirement is zero, INR and CNY are never mislabeled USD',()=>{
 const {state,user}=fixture();delete state.settings.paymentPlanner.rates['2026-10'];
 const report=paymentPlannerReport(state,user,{year:2026});assert.equal(report.totals.estimatedInrMinor,null);assert.equal(report.months[0].estimatedInrMinor,0);
 state.orders[0].currency='CNY';const cny=paymentPlannerReport(state,user,{year:2026,currency:'CNY'});assert.equal(cny.totals.futureMinor,1);assert.equal(cny.totals.estimatedInrMinor,null);assert.equal(paymentPlannerReport(state,user,{year:2026}).total,0);
 state.orders[0].currency='INR';assert.equal(paymentPlannerReport(state,user,{year:2026,currency:'INR'}).totals.estimatedInrMinor,1);
});

test('date changes retain contractual overdue visibility and unscheduled rows do not vanish from a month selection',()=>{
 const {state,user}=fixture(2);state.orders[1].pi.approvedAt=null;
 const current=isoDay(),year=Number(current.slice(0,4));state.orders[0].pi.approvedAt='2000-01-01T00:00:00Z';
 const target=state.orders[0],before=structuredClone(target);
 const out=execute(state,{type:'SAVE_PAYMENT_PLAN_DATE',payload:{orderId:target.id,milestoneKey:'0:',date:year+'-12-31',remarks:'Review supplier forecast'}},user).state;
 assert.deepEqual(out.orders[0],before);
 const late=paymentPlannerReport(out,user,{year,section:'overdue'});assert.equal(late.total,1);assert.equal(late.rows[0].dueDate,'2000-01-01');assert.equal(late.rows[0].plannedDate,year+'-12-31');
 assert.equal(paymentPlannerReport(out,user,{year,month:year+'-12',section:'unscheduled'}).total,1);
});

test('report limits, currency and scope are enforced before data can be returned',()=>{
 const {state,user}=fixture();
 for(const query of [{year:0},{year:'wrong'},{year:2026,month:'2027-01'},{week:1},{pageSize:51},{page:0},{currency:'EUR'},{section:'everything'},{supplierId:'not-accessible'}])assert.throws(()=>paymentPlannerReport(state,user,query));
 assert.throws(()=>paymentPlannerReport(state,{...user,scopes:['UTILITY_DOMESTIC']}),/access/);
 assert.throws(()=>paymentPlannerReport(state,{...user,active:false}),/access/);
 const before=structuredClone(state);paymentPlannerReport(state,user,{year:2026});assert.deepEqual(state,before);
});

test('planning day uses the India calendar across UTC midnight and year boundaries',()=>{
 assert.equal(paymentPlanningDay(new Date('2026-12-31T18:29:59Z')),'2026-12-31');
 assert.equal(paymentPlanningDay(new Date('2026-12-31T18:30:00Z')),'2027-01-01');
});

test('receipt differences and fully acknowledged unmatched remittances remain reviewable',()=>{
 const {state,user}=fixture();const o=state.orders[0];
 state.payments=[{id:'bank-1',reference:'Bank test',status:'REPORTED',allocations:[{id:'a-1',orderId:o.id,termIndex:0,shipmentId:null,expectedMinor:1,realizedMinor:0},{id:'a-2',orderId:o.id,termIndex:99,shipmentId:null,expectedMinor:7,realizedMinor:7}]}];
 const report=paymentPlannerReport(state,user,{year:2026,section:'reconciliation'});
 assert.equal(report.total,2);assert.equal(report.totals.acknowledgementDifferenceMinor,1);assert.equal(report.totals.futureMinor,0);assert.equal(report.rows.find(r=>r.kind==='PAYMENT_RECONCILIATION').reportedMinor,7);
});

test('CI unapplied advance overlap is visible even with no remaining uninvoiced amount',()=>{
 const {state,user}=fixture(),o=state.orders[0];o.lines[0].unitPriceMinor=10000;
 o.paymentTerms.steps=[{name:'Advance',percent:30,trigger:'PI',days:0},{name:'Balance',percent:70,trigger:'BL',days:0}];
 o.ciPaymentPolicy={version:1,rule:'FINAL_BL',days:0};o.shipments=[{id:'shipment',status:'PLANNED',lines:[{lineId:o.lines[0].id,quantity:1}],actualDeparture:'2026-10-10',blNumber:'BL-1',blDate:'2026-10-11'}];
 o.commercialInvoices=[{id:'ci-full',termIndex:100000,version:1,number:'CI-FULL',date:'2026-10-11',currency:'USD',shipmentId:'shipment',amountMinor:10000,advanceMode:'MANUAL',advanceApplications:[],status:'APPROVED',orderRevision:o.revision}];
 const review=paymentPlannerReport(state,user,{year:2026,section:'reconciliation'});
 assert.equal(review.total,1);assert.equal(review.totals.unreconciledAdvanceMinor,3000);assert.equal(review.totals.futureMinor,0);
 assert.equal(paymentPlannerReport(state,user,{year:2026,section:'commitments'}).total,0);
 assert.equal(paymentPlannerReport(state,user,{year:2026,section:'scheduled'}).totals.futureMinor,13000);
 assert.ok(review.warnings.some(w=>w.code==='UNRECONCILED_PI_ADVANCE'));
});

function supplierFixture(count){
 const setup=fixture(count),base=setup.state.vendors.find(v=>v.id===setup.state.orders[0].vendorId);
 for(let i=0;i<count;i++){
  const id='matrix-supplier-'+String(i).padStart(3,'0');
  setup.state.vendors.push({...structuredClone(base),id,name:'Matrix supplier '+String(i).padStart(3,'0'),code:'MX-'+i});
  setup.state.orders[i].vendorId=id;
 }
 return setup;
}

test('year matrix groups every scheduled supplier before detail pagination and preserves allocated INR',()=>{
 const {state,user}=supplierFixture(24);
 state.orders.forEach((o,i)=>{o.pi.approvedAt='2026-10-'+String(i<12?7:8).padStart(2,'0')+'T00:00:00Z';});
 const report=paymentPlannerReport(state,user,{year:2026,month:'2026-10',week:1,pageSize:1,page:2}),matrix=report.matrix;
 assert.equal(report.rows.length,1);assert.equal(report.total,12);
 assert.equal(matrix.suppliers.length,20);assert.equal(matrix.supplierTotal,24);assert.equal(matrix.supplierPageSize,20);assert.equal(matrix.supplierPages,2);
 assert.equal(matrix.weeks.length,48);assert.equal(matrix.months.length,12);
 assert.equal(matrix.totals.amountMinor,24);assert.equal(matrix.totals.estimatedInrMinor,2316);assert.equal(matrix.visibleTotals.amountMinor,20);
 const october=matrix.months[9],firstWeek=matrix.weeks[36],secondWeek=matrix.weeks[37];
 assert.equal(october.totals.count,24);assert.equal(october.totals.amountMinor,24);assert.equal(october.totals.estimatedInrMinor,report.months[9].estimatedInrMinor);
 assert.equal(firstWeek.totals.amountMinor,12);assert.equal(secondWeek.totals.amountMinor,12);
 const last=paymentPlannerReport(state,user,{year:2026,supplierPage:2,pageSize:1}).matrix;
 assert.equal(last.suppliers.length,4);assert.equal(last.supplierPage,2);assert.equal(last.visibleTotals.amountMinor,4);
 assert.deepEqual(last.totals,matrix.totals);assert.deepEqual(last.months.map(m=>m.totals),matrix.months.map(m=>m.totals));
 const cells=[...october.cells,...last.months[9].cells];
 assert.equal(new Set(cells.map(c=>c.supplierId)).size,24);
 assert.equal(cells.reduce((n,c)=>n+c.amountMinor,0),24);assert.equal(cells.reduce((n,c)=>n+c.estimatedInrMinor,0),2316);
 assert.equal(cells.reduce((n,c)=>n+c.count,0),24);
 assert.equal(matrix.suppliers.reduce((n,s)=>n+s.totals.estimatedInrMinor,0),matrix.visibleTotals.estimatedInrMinor);
 assert.equal(matrix.weeks.reduce((n,w)=>n+w.totals.estimatedInrMinor,0),matrix.totals.estimatedInrMinor);
 assert.equal(paymentPlannerReport(state,user,{year:2026,supplierPage:100}).matrix.supplierPage,2);
 const independent=paymentPlannerReport(state,user,{year:2026,month:'2026-01',week:4,section:'blocked',page:100}).matrix;
 assert.deepEqual(independent,matrix);
});

test('matrix date buckets cover boundaries and leap-year February without overlap',()=>{
 const dates=[...[1,7,8,14,15,21,22,28,29].map(day=>'2028-02-'+String(day).padStart(2,'0')),'2028-04-30','2028-12-31'],{state,user}=fixture(dates.length);
 state.orders.forEach((o,i)=>{o.pi.approvedAt=dates[i]+'T00:00:00Z';});
 state.settings.paymentPlanner.rates={'2028-02':{rate:1000000},'2028-04':{rate:1000000},'2028-12':{rate:1000000}};
 const matrix=paymentPlannerReport(state,user,{year:2028}).matrix,rows=matrix.weeks.filter(w=>w.month==='2028-02');
 assert.deepEqual(rows.map(w=>[w.week,w.startDate,w.endDate,w.totals.count]),[
  [1,'2028-02-01','2028-02-07',2],[2,'2028-02-08','2028-02-14',2],
  [3,'2028-02-15','2028-02-21',2],[4,'2028-02-22','2028-02-29',3]
 ]);
 assert.equal(matrix.months[1].totals.amountMinor,9);assert.equal(matrix.months[1].totals.estimatedInrMinor,9);
 assert.equal(matrix.weeks.find(w=>w.month==='2028-04'&&w.week===4).endDate,'2028-04-30');
 assert.equal(matrix.weeks.find(w=>w.month==='2028-04'&&w.week===4).totals.count,1);
 assert.equal(matrix.weeks.at(-1).endDate,'2028-12-31');assert.equal(matrix.weeks.at(-1).totals.count,1);
 assert.equal(matrix.totals.amountMinor,11);assert.equal(matrix.totals.estimatedInrMinor,11);
 assert.equal(paymentPlannerReport(state,user,{year:2100}).matrix.weeks[7].endDate,'2100-02-28');
 assert.equal(paymentPlannerReport(state,user,{year:2000}).matrix.weeks[7].endDate,'2000-02-29');
 assert.equal(paymentPlannerReport(state,user,{year:9999}).matrix.weeks.at(-1).endDate,'9999-12-31');
});

test('matrix respects currency and exact supplier, excluding unscheduled, settled and other-year exposure',()=>{
 const {state,user}=supplierFixture(7);
 state.orders[1].currency='CNY';state.orders[2].currency='INR';state.orders[3].pi.approvedAt=null;
 state.orders[4].pi.approvedAt='2027-01-01T00:00:00Z';
 state.payments=[{id:'matrix-settled',status:'REPORTED',allocations:[{id:'matrix-allocated',orderId:state.orders[5].id,termIndex:0,shipmentId:null,expectedMinor:1,realizedMinor:1}]}];
 delete state.settings.paymentPlanner.rates['2026-10'];
 const before=structuredClone(state),usd=paymentPlannerReport(state,user,{year:2026}).matrix;
 assert.deepEqual(usd.suppliers.map(s=>s.id),[state.orders[0].vendorId,state.orders[6].vendorId]);
 assert.equal(usd.totals.amountMinor,2);assert.equal(usd.totals.estimatedInrMinor,null);
 assert.equal(usd.months[0].totals.estimatedInrMinor,0);assert.equal(usd.months[0].cells[0].estimatedInrMinor,0);
 assert.equal(usd.months[9].cells[0].estimatedInrMinor,null);
 const cny=paymentPlannerReport(state,user,{year:2026,currency:'CNY'}).matrix;
 assert.equal(cny.supplierTotal,1);assert.equal(cny.totals.amountMinor,1);assert.equal(cny.totals.estimatedInrMinor,null);
 const inr=paymentPlannerReport(state,user,{year:2026,currency:'INR'}).matrix;
 assert.equal(inr.supplierTotal,1);assert.equal(inr.totals.amountMinor,1);assert.equal(inr.totals.estimatedInrMinor,1);
 const selected=paymentPlannerReport(state,user,{year:2026,supplierId:state.orders[6].vendorId}).matrix;
 assert.equal(selected.supplierTotal,1);assert.equal(selected.suppliers[0].id,state.orders[6].vendorId);assert.equal(selected.totals.amountMinor,1);
 const unscheduled=paymentPlannerReport(state,user,{year:2026,supplierId:state.orders[3].vendorId,section:'unscheduled'});
 assert.equal(unscheduled.total,1);assert.equal(unscheduled.matrix.supplierTotal,0);assert.equal(unscheduled.matrix.totals.amountMinor,0);
 assert.deepEqual(state,before);
});

test('matrix returns explicit empty zeros and validates supplier pagination',()=>{
 const {state,user}=fixture(0),matrix=paymentPlannerReport(state,user,{year:2026,supplierPage:2}).matrix;
 assert.deepEqual(matrix.suppliers,[]);assert.equal(matrix.supplierTotal,0);assert.equal(matrix.supplierPage,1);assert.equal(matrix.supplierPages,1);
 assert.equal(matrix.totals.amountMinor,0);assert.equal(matrix.totals.estimatedInrMinor,0);
 for(const row of [...matrix.months,...matrix.weeks]){assert.deepEqual(row.cells,[]);assert.equal(row.totals.count,0);assert.equal(row.totals.amountMinor,0);assert.equal(row.totals.estimatedInrMinor,0);assert.deepEqual(row.totals,row.visibleTotals);}
 for(const supplierPage of [0,-1,1.1,1000001,'wrong',Infinity])assert.throws(()=>paymentPlannerReport(state,user,{year:2026,supplierPage}),/supplier page/);
});

test('three-month forecast crosses years independently of detail filters and reconciles supplier INR',()=>{
 const {state,user}=supplierFixture(6),dates=['2026-11-07','2026-12-14','2027-01-22'];
 state.orders.forEach((o,i)=>{o.vendorId=state.orders[i%3].vendorId;o.pi.approvedAt=dates[i%3]+'T00:00:00Z';});
 state.settings.paymentPlanner.rates={'2026-11':{rate:1500000},'2026-12':{rate:2500000},'2027-01':{rate:3500000}};
 const before=structuredClone(state),forecast=paymentPlannerReport(state,user,{year:1999,month:'1999-02',week:4,section:'acknowledgements',pageSize:1,forecastStart:'2026-11'}).forecast;
 assert.equal(forecast.startMonth,'2026-11');assert.equal(forecast.endMonth,'2027-01');
 assert.deepEqual(forecast.months.map(m=>m.month),['2026-11','2026-12','2027-01']);
 assert.deepEqual(forecast.months.map(m=>m.rate),[1500000,2500000,3500000]);
 assert.deepEqual(forecast.months.map(m=>m.totals.amountMinor),[2,2,2]);
 assert.deepEqual(forecast.months.map(m=>m.totals.estimatedInrMinor),[3,5,7]);
 assert.equal(forecast.totals.amountMinor,6);assert.equal(forecast.totals.estimatedInrMinor,15);assert.equal(forecast.supplierTotal,3);
 assert.equal(forecast.supplierTotals.reduce((n,s)=>n+s.count,0),6);
 assert.equal(forecast.supplierTotals.reduce((n,s)=>n+s.estimatedInrMinor,0),15);
 for(const bucket of forecast.months){assert.equal(bucket.cells.reduce((n,c)=>n+c.amountMinor,0),bucket.totals.amountMinor);assert.equal(bucket.cells.reduce((n,c)=>n+c.estimatedInrMinor,0),bucket.totals.estimatedInrMinor);}
 assert.deepEqual(paymentPlannerReport(state,user,{year:2028,forecastStart:'2026-11'}).forecast,forecast);
 const selected=paymentPlannerReport(state,user,{year:2026,supplierId:state.orders[0].vendorId,forecastStart:'2026-11'}).forecast;
 assert.equal(selected.supplierTotal,1);assert.equal(selected.totals.amountMinor,2);assert.equal(selected.totals.estimatedInrMinor,3);
 assert.deepEqual(state,before);
});

test('forecast supplier pages preserve full three-month totals and monthly allocated paise',()=>{
 const {state,user}=supplierFixture(24);
 state.orders.forEach(o=>{o.pi.approvedAt='2026-11-01T00:00:00Z';});state.settings.paymentPlanner.rates={'2026-11':{rate:96500000}};
 const first=paymentPlannerReport(state,user,{year:2026,forecastStart:'2026-11',pageSize:1}).forecast,last=paymentPlannerReport(state,user,{year:2026,forecastStart:'2026-11',supplierPage:2,pageSize:50}).forecast;
 assert.equal(first.supplierPages,2);assert.equal(first.suppliers.length,20);assert.equal(last.suppliers.length,4);assert.equal(last.supplierPage,2);
 assert.equal(first.totals.amountMinor,24);assert.equal(first.totals.estimatedInrMinor,2316);assert.deepEqual(first.totals,last.totals);
 assert.equal(first.visibleTotals.amountMinor,20);assert.equal(last.visibleTotals.amountMinor,4);
 assert.equal([...first.supplierTotals,...last.supplierTotals].reduce((n,s)=>n+s.estimatedInrMinor,0),2316);
 assert.equal([...first.months[0].cells,...last.months[0].cells].reduce((n,s)=>n+s.estimatedInrMinor,0),2316);
 assert.equal(paymentPlannerReport(state,user,{year:2026,forecastStart:'2026-11',supplierPage:999}).forecast.supplierPage,2);
 assert.deepEqual(first.missingRateMonths,[]);assert.equal(first.months[1].totals.estimatedInrMinor,0);
});

test('forecast preserves missing rates, native currencies and empty-period zeros',()=>{
 const {state,user}=fixture(2);state.orders[0].pi.approvedAt='2026-11-01T00:00:00Z';state.orders[1].pi.approvedAt='2026-12-01T00:00:00Z';
 state.settings.paymentPlanner.rates={'2026-11':{rate:1500000}};
 const usd=paymentPlannerReport(state,user,{year:2026,forecastStart:'2026-11'}).forecast;
 assert.equal(usd.totals.amountMinor,2);assert.equal(usd.totals.estimatedInrMinor,null);assert.equal(usd.supplierTotals[0].estimatedInrMinor,null);
 assert.deepEqual(usd.missingRateMonths,['2026-12']);assert.equal(usd.months[0].cells[0].estimatedInrMinor,2);assert.equal(usd.months[1].cells[0].estimatedInrMinor,null);assert.equal(usd.months[2].cells[0].estimatedInrMinor,0);
 state.orders.forEach(o=>{o.currency='INR';});const inr=paymentPlannerReport(state,user,{currency:'INR',forecastStart:'2026-11'}).forecast;
 assert.equal(inr.totals.estimatedInrMinor,2);assert.deepEqual(inr.missingRateMonths,[]);
 state.orders.forEach(o=>{o.currency='CNY';});const cny=paymentPlannerReport(state,user,{currency:'CNY',forecastStart:'2026-11'}).forecast;
 assert.equal(cny.totals.amountMinor,2);assert.equal(cny.totals.estimatedInrMinor,null);assert.deepEqual(cny.missingRateMonths,[]);
 const empty=paymentPlannerReport(state,user,{forecastStart:'2026-11'}).forecast;
 assert.deepEqual(empty.suppliers,[]);assert.deepEqual(empty.supplierTotals,[]);assert.equal(empty.totals.amountMinor,0);assert.equal(empty.totals.estimatedInrMinor,0);assert.equal(empty.supplierPages,1);assert.deepEqual(empty.missingRateMonths,[]);
});

test('forecast subtracts reported cash and separates undated/overdue context from included blocked cash',()=>{
 const {state,user}=fixture(6);
 state.orders.forEach(o=>{o.lines[0].unitPriceMinor=100;o.pi.approvedAt='2026-11-01T00:00:00Z';});
 state.orders[2].pi.approvedAt=null;state.orders[3].pi.approvedAt='2000-01-01T00:00:00Z';state.orders[4].pi.approvedAt='2000-01-02T00:00:00Z';
 state.orders[5].deletedAt='2026-10-01T00:00:00Z';
 state.payments=[{id:'forecast-reported',status:'REPORTED',allocations:[{id:'forecast-partial',orderId:state.orders[0].id,termIndex:0,shipmentId:null,expectedMinor:90,realizedMinor:null},{id:'forecast-full',orderId:state.orders[1].id,termIndex:0,shipmentId:null,expectedMinor:100,realizedMinor:null}]}];
 state.settings.paymentPlanner.rates={'2026-11':{rate:1000000}};
 const out=execute(state,{type:'SAVE_PAYMENT_PLAN_DATE',payload:{orderId:state.orders[4].id,milestoneKey:'0:',date:'2026-11-15',remarks:'Move only the forecast date'}},user).state,before=structuredClone(out);
 const forecast=paymentPlannerReport(out,user,{year:2026,forecastStart:'2026-11'}).forecast;
 assert.equal(forecast.totals.count,3);assert.equal(forecast.totals.amountMinor,210);assert.equal(forecast.totals.estimatedInrMinor,210);
 assert.equal(forecast.context.undated.count,1);assert.equal(forecast.context.undated.amountMinor,100);assert.equal(forecast.context.undated.estimatedInrMinor,null);
 assert.equal(forecast.context.overdueOutsidePeriod.count,1);assert.equal(forecast.context.overdueOutsidePeriod.amountMinor,100);
 assert.equal(forecast.context.blockedInPeriod.amountMinor,100);assert.equal(forecast.context.blockedInPeriod.count,1);
 assert.deepEqual(out,before);
});

test('forecast start defaults to the India month and validates supported three-month windows',()=>{
 const {state,user}=fixture(0),report=paymentPlannerReport(state,user);
 assert.equal(report.forecast.startMonth,report.asOf.slice(0,7));
 assert.equal(paymentPlannerReport(state,user,{forecastStart:''}).forecast.startMonth,report.asOf.slice(0,7));
 for(const forecastStart of ['1899-12','2026-00','2026-13','2026-1','2026-01-01','wrong','9999-11','9999-12',0,false])assert.throws(()=>paymentPlannerReport(state,user,{forecastStart}),/forecast start/);
 assert.equal(paymentPlannerReport(state,user,{forecastStart:'9999-10'}).forecast.endMonth,'9999-12');
 assert.equal(paymentPlannerReport(state,user,{forecastStart:'1900-01'}).forecast.endMonth,'1900-03');
});
