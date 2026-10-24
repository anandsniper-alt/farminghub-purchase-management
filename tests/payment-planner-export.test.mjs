import test from 'node:test';
import assert from 'node:assert/strict';
import {createSeed} from '../shared/seed.mjs';
import {paymentPlannerReport} from '../shared/payment-planner-report.mjs';
import {paymentForecastCsv} from '../web/payment-planner.mjs';

function fixture(count=24,currency='USD'){
 const state=createSeed('2026-10-15'),order=structuredClone(state.orders[0]),vendor=state.vendors.find(v=>v.id===order.vendorId);
 state.orders=[];state.payments=[];
 for(let i=0;i<count;i++){
  const supplierId='export-supplier-'+i,name='Export supplier '+String(i).padStart(3,'0'),o=structuredClone(order);
  state.vendors.push({...structuredClone(vendor),id:supplierId,name,code:'EXP-'+i});
  Object.assign(o,{id:'export-order-'+i,number:'EXPORT-'+i,serialNumber:i+1,numberSource:'MANUAL',vendorId:supplierId,currency,status:'ISSUED',deletedAt:null,testData:null});
  o.lines=[{...o.lines[0],quantity:1,unitPriceMinor:i+1}];
  o.paymentTerms={name:'Pay on PI',steps:[{name:'Full value',trigger:'PI',percent:100,days:0}]};
  o.pi={...o.pi,status:'APPROVED',approvedAt:['2026-11-07','2026-12-14','2027-01-22'][i%3]+'T00:00:00Z'};
  o.shipments=[];o.paymentAuthorizations=[];delete o.ciPaymentPolicy;state.orders.push(o);
 }
 state.settings.paymentPlanner={rates:{'2026-11':{rate:96500000},'2026-12':{rate:97250000},'2027-01':{rate:98125000}},dates:{}};
 return {state,user:state.users.find(u=>u.role==='MANAGER')};
}

function reportsFor({state,user},query={}){
 const filter={year:2026,forecastStart:'2026-11',...query},first=paymentPlannerReport(state,user,filter);
 return [first,...Array.from({length:first.forecast.supplierPages-1},(_,i)=>paymentPlannerReport(state,user,{...filter,supplierPage:i+2}))];
}

// Parse independently so quoted commas, newlines and escaped quotes are checked.
function parseCsv(text){
 assert.ok(text.startsWith('\ufeff'));text=text.slice(1);
 const rows=[];let row=[],value='',quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'){
   if(quoted&&text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;
  }else if(!quoted&&c===','){row.push(value);value='';}
  else if(!quoted&&c==='\r'&&text[i+1]==='\n'){row.push(value);rows.push(row);row=[];value='';i++;}
  else value+=c;
 }
 assert.equal(quoted,false);row.push(value);rows.push(row);return rows;
}
const exactAmount=n=>{const v=BigInt(n);return String(v/100n)+'.'+String(v%100n).padStart(2,'0');};
const dataRows=rows=>rows.slice(rows.findIndex(row=>row[0]==='Supplier')+1,rows.findIndex(row=>row[0]==='TOTAL'));

test('Excel CSV exports every supplier page across years with independently reconciled USD and INR',()=>{
 const setup=fixture(),reports=reportsFor(setup,{pageSize:1}),before=structuredClone(reports),rows=parseCsv(paymentForecastCsv([...reports].reverse(),'Authenticated PMS'));
 assert.equal(reports.length,2);assert.equal(dataRows(rows).length,24);assert.equal(new Set(dataRows(rows).map(r=>r[0])).size,24);
 assert.deepEqual(rows.find(row=>row[0]==='Period'),['Period','2026-11','2027-01','Full calendar months']);
 assert.deepEqual(rows.find(row=>row[0]==='Supplier'),['Supplier','Code','2026-11 USD','2026-11 estimated INR','2026-12 USD','2026-12 estimated INR','2027-01 USD','2027-01 estimated INR','3-month USD','3-month estimated INR']);
 const totals=rows.find(row=>row[0]==='TOTAL');
 assert.deepEqual(totals,['TOTAL','','0.92','88.78','1.00','97.25','1.08','105.98','3.00','292.01']);
 for(let column=2;column<totals.length;column++){
  const sum=dataRows(rows).reduce((n,row)=>n+BigInt(row[column].replace('.','')),0n);
  assert.equal(exactAmount(sum),totals[column]);
 }
 assert.ok(rows.some(row=>row[0]==='2026-11'&&row[1]==='96.5'));
 assert.ok(rows.some(row=>row[0]==='2027-01'&&row[1]==='98.125'));
 assert.match(rows.find(row=>row[0]==='Blocked within period')[2],/Already included/);
 assert.deepEqual(reports,before);
});

test('CSV retains Pending for missing FX without replacing it with zero or a partial total',()=>{
 const setup=fixture();delete setup.state.settings.paymentPlanner.rates['2026-12'];
 const rows=parseCsv(paymentForecastCsv(reportsFor(setup))),totals=rows.find(row=>row[0]==='TOTAL');
 assert.equal(totals[5],'Pending');assert.equal(totals[9],'Pending');assert.equal(totals[3],'88.78');assert.equal(totals[7],'105.98');
 assert.equal(dataRows(rows).filter(row=>row[5]==='Pending').length,8);
 assert.equal(dataRows(rows).filter(row=>row[5]==='0.00').length,16);
 assert.ok(rows.some(row=>row[0]==='2026-12'&&row[1]==='Pending'));
});

test('CSV refuses incomplete, stale, changed-scope and duplicate-supplier pages',()=>{
 const reports=reportsFor(fixture());
 assert.throws(()=>paymentForecastCsv([]),/No forecast/);assert.throws(()=>paymentForecastCsv([reports[0]]),/incomplete/);
 for(const change of [r=>{r.revision++;},r=>{r.asOf='2000-01-01';},r=>{r.currency='CNY';},r=>{r.supplierId='another';},r=>{r.forecast.startMonth='2026-10';},r=>{r.forecast.supplierTotal++;},r=>{r.forecast.totals.amountMinor++;},r=>{r.forecast.months[0].rate++;},r=>{r.forecast.months[0].totals.amountMinor++;}]){
  const altered=structuredClone(reports);change(altered[1]);assert.throws(()=>paymentForecastCsv(altered),/changed/);
 }
 const duplicate=structuredClone(reports);duplicate[1].forecast.suppliers[0].id=duplicate[0].forecast.suppliers[0].id;
 assert.throws(()=>paymentForecastCsv(duplicate),/duplicated/);
 const cells=structuredClone(reports);cells[1].forecast.months[0].cells[0].amountMinor++;
 assert.throws(()=>paymentForecastCsv(cells),/reconcile/);
});

test('CSV rejects supplier and grand three-month totals that disagree with their monthly cells',()=>{
 const reports=reportsFor(fixture()),supplier=structuredClone(reports);
 supplier[1].forecast.supplierTotals[0].amountMinor++;
 assert.throws(()=>paymentForecastCsv(supplier),/reconcile/);
 const grand=structuredClone(reports);grand.forEach(r=>{r.forecast.totals.amountMinor++;});
 assert.throws(()=>paymentForecastCsv(grand),/reconcile/);
 const inr=structuredClone(reports);inr[1].forecast.supplierTotals[0].estimatedInrMinor++;
 assert.throws(()=>paymentForecastCsv(inr),/reconcile/);
});

test('CSV quotes names and source metadata while neutralizing spreadsheet formula prefixes',()=>{
 const setup=fixture(7),names=['=HYPERLINK("example")','+cmd','-cmd','@SUM(A1)','\t=2+2','Quote "name", group\nsecond line','Normal name'];
 setup.state.orders.forEach((o,i)=>{const vendor=setup.state.vendors.find(v=>v.id===o.vendorId);vendor.name=names[i];vendor.code='=CODE'+i;});
 const rows=parseCsv(paymentForecastCsv(reportsFor(setup),'\r=unsafe source')),values=dataRows(rows);
 for(const name of names)assert.ok(values.some(row=>row[0]===(/^\s*[=+@-]/.test(name)?"'"+name:name)));
 assert.ok(values.every(row=>row[1].startsWith("'=CODE")));
 assert.equal(rows.find(row=>row[0]==='Source')[1],"'\r=unsafe source");
});

test('native INR and CNY CSVs preserve currency and do not invent USD conversions',()=>{
 for(const currency of ['INR','CNY']){
  const rows=parseCsv(paymentForecastCsv(reportsFor(fixture(3,currency),{currency}))),header=rows.find(row=>row[0]==='Supplier'),total=rows.find(row=>row[0]==='TOTAL');
  assert.deepEqual(header,['Supplier','Code','2026-11 '+currency,'2026-12 '+currency,'2027-01 '+currency,'3-month '+currency]);
  assert.deepEqual(total,['TOTAL','','0.01','0.02','0.03','0.06']);
  assert.equal(rows.some(row=>row[0]==='Month'&&row[1]==='Estimated INR for 1 USD'),false);
 }
});

test('CSV formats every supported safe minor-unit integer without floating-point paise loss',()=>{
 const setup=fixture(1,'INR');setup.state.orders[0].lines[0].unitPriceMinor=Number.MAX_SAFE_INTEGER-1;
 const reports=reportsFor(setup,{currency:'INR'}),rows=parseCsv(paymentForecastCsv(reports));
 assert.equal(reports[0].forecast.totals.amountMinor,9007199254740990);
 assert.equal(dataRows(rows)[0][2],'90071992547409.90');
 assert.equal(rows.find(row=>row[0]==='TOTAL').at(-1),'90071992547409.90');
});

test('empty forecast CSV retains explicit zero totals and no fabricated supplier rows',()=>{
 const rows=parseCsv(paymentForecastCsv(reportsFor(fixture(0))));
 assert.deepEqual(dataRows(rows),[]);
 assert.deepEqual(rows.find(row=>row[0]==='TOTAL'),['TOTAL','','0.00','0.00','0.00','0.00','0.00','0.00','0.00','0.00']);
});
