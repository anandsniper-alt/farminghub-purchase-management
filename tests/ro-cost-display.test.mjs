import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateRoCostDisplay,calculateRoCosting,calculateRoPurchaseItems} from '../shared/ro-costing.mjs';

const row=(label,value,unit='INR')=>({label,value,unit});
const working=(id,invoice,rows,totalInr=11200,goodsUsd=100)=>({id,invoice,supplier:'Synthetic supplier',status:'Historical reference',source:{file:'synthetic.xlsx'},ai:{rate:totalInr===null?112:totalInr/goodsUsd,totalInr,goodsUsd,rows},suresh:{rows:[]}});
const sourceRows=()=>[row('Supplier INR worksheet basis',9000),row('BCD',700),row('SWS',70),row('Freight before GST',900),row('Clearance',300),row('Insurance',100),row('Liner charge',100),row('Miscellaneous',30)];
const fixture=()=>({ro:'SYNTHETIC',supplier:'Synthetic supplier',invoices:[{supplier:'Synthetic supplier',invoice:'CI-A',currency:'USD',goods:100,extras:0,face:100}],actuals:{},worksheetComparison:{version:1,status:'Historical reference',selectedWorkingIds:['chosen'],ai:{rate:112,totalInr:11200,goodsUsd:100},suresh:{rate:111,totalInr:11100,goodsUsd:100},workings:[working('chosen','CI-A',sourceRows())]}});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} differs from ${b}`);

test('display reconciles named net components without adding tax, subtotals, raw cells or alternatives',()=>{
 const input=fixture(),c=input.worksheetComparison;
 c.workings[0].ai.rows.push(row('GST excluded from AI before-GST total',2000),row('Known before-GST total',11200),row('Source exchange-rate basis',90,'INR/USD'),row('G18 raw cell',9000),row('Landed unit cost example',11200,'INR/pc'));
 c.workings.push(working('old','CI-A',[row('Supplier INR worksheet basis',8000)],8000));
 const before=structuredClone(input),actualBefore=calculateRoCosting(input),itemsBefore=calculateRoPurchaseItems(input),d=calculateRoCostDisplay(input);
 assert.equal(d.status,'Historical reference');assert.equal(d.aiRate,112);assert.equal(d.sureshRate,111);assert.equal(d.totalInr,11200);assert.equal(d.components.length,8);assert.equal(d.expensesInr,2200);assert.equal(d.breakdownComplete,true);assert.equal(d.unallocatedInr,0);
 close(d.components.reduce((n,r)=>n+r.inr,0),d.totalInr);close(d.components.reduce((n,r)=>n+r.perUsd,0),112);close(d.components.reduce((n,r)=>n+r.sharePercent,0),100);
 assert.deepEqual(input,before);assert.deepEqual(calculateRoCosting(input),actualBefore);assert.deepEqual(calculateRoPurchaseItems(input),itemsBefore);
});

test('complete actual costs take precedence and expense evidence is not counted twice',()=>{
 const input=fixture();input.actuals={supplierInr:9100,bankNet:100,forwarderNet:600,otherNet:0,bcd:100,sws:10,expenseCoverage:'Complete',currencyConfirmed:true,confirmation:'Verified synthetic documents',sureshRate:100};
 input.expenses=[{net:600,gst:108,include:true,component:'Forwarder'}];
 const d=calculateRoCostDisplay(input);assert.equal(d.basis,'Actual');assert.equal(d.totalKind,'Total cost');assert.equal(d.status,'Verified actual');assert.equal(d.totalInr,9910);assert.equal(d.aiRate,99.1);assert.equal(d.sureshRate,100);assert.equal(d.expensesInr,810);assert.equal(d.breakdownComplete,true);assert.deepEqual(d.selectedWorkingIds,[]);
});

test('known provisional and partial components never turn a missing bank charge into zero or a final rate',()=>{
 const input=fixture();input.worksheetComparison.status='Provisional reference';input.worksheetComparison.workings[0].ai.rows.push(row('Bank charges',null));
 let d=calculateRoCostDisplay(input);assert.equal(d.aiRate,112);assert.equal(d.reconciled,true);assert.equal(d.breakdownComplete,false);assert.equal(d.expensesInr,null);assert.equal(d.knownExpensesInr,2200);assert.equal(d.components.find(r=>r.key==='bank').inr,null);assert.deepEqual(d.pendingComponents,['Bank charges']);
 input.worksheetComparison.status='Partial reference';d=calculateRoCostDisplay(input);assert.equal(d.aiRate,null);assert.equal(d.status,'Partial reference');assert.equal(d.knownTotalInr,11200);assert.equal(d.totalKind,'Known subtotal');
});

test('joint supplier invoice components reconcile once; duplicate selected invoice versions stay unallocated',()=>{
 const input=fixture(),c=input.worksheetComparison;c.selectedWorkingIds=['a','b'];c.ai={rate:110,totalInr:22000,goodsUsd:200};
 c.workings=[working('a','CI-A',[row('Supplier goods INR proxy',9000),row('Ocean freight before GST',1000)],10000),working('b','CI-B',[row('Supplier goods inr',11000),row('Supplier invoice extra inr',500),row('Net insurance plus stamp',500)],12000)];
 let d=calculateRoCostDisplay(input);assert.equal(d.breakdownComplete,true);assert.equal(d.components.find(r=>r.key==='supplier').inr,20000);assert.equal(d.expensesInr,2000);close(d.components.reduce((n,r)=>n+r.perUsd,0),110);
 c.workings[1].invoice='CI-A';d=calculateRoCostDisplay(input);assert.equal(d.breakdownComplete,false);assert.equal(d.components.length,0);assert.equal(d.unallocatedInr,22000);assert.deepEqual(d.pendingComponents,['Component allocation']);
});

test('one invoice missing a charge cannot be hidden by an equal excess in another invoice',()=>{
 const input=fixture(),c=input.worksheetComparison;c.selectedWorkingIds=['a','b'];c.ai={rate:110,totalInr:22000,goodsUsd:200};
 c.workings=[working('a','CI-A',[row('Supplier goods INR proxy',9000),row('Ocean freight before GST',500)],10000),working('b','CI-B',[row('Supplier goods inr',11000),row('Supplier invoice extra inr',1000),row('Net insurance plus stamp',500)],12000)];
 const d=calculateRoCostDisplay(input);assert.equal(d.unallocatedInr,0);assert.equal(d.reconciled,false);assert.equal(d.breakdownComplete,false);assert.equal(d.expensesInr,null);assert.ok(d.pendingComponents.includes('Component allocation'));
});

test('pooled approved rates retain their rate without fabricating exact-RO totals or component shares',()=>{
 const input=fixture(),c=input.worksheetComparison;c.ai={rate:114,totalInr:null,goodsUsd:100};
 const d=calculateRoCostDisplay(input);assert.equal(d.aiRate,114);assert.equal(d.totalInr,null);assert.equal(d.knownTotalInr,null);assert.equal(d.expensesInr,null);assert.equal(d.unallocatedInr,null);assert.equal(d.breakdownComplete,false);assert.deepEqual(d.components,[]);assert.deepEqual(d.pendingComponents,['Component allocation']);
});

test('ambiguous repeated aliases and unrecognized differences remain unallocated, never invented expenses',()=>{
 const input=fixture(),rows=input.worksheetComparison.workings[0].ai.rows;rows.push(row('Ocean freight before GST',900));
 let d=calculateRoCostDisplay(input);assert.equal(d.components.find(r=>r.key==='freight').inr,null);assert.equal(d.unallocatedInr,900);assert.equal(d.breakdownComplete,false);assert.ok(d.pendingComponents.includes('Ocean freight'));assert.ok(d.pendingComponents.includes('Component allocation'));
 rows.pop();rows.find(r=>r.label==='Freight before GST').label='Unreviewed other charge';d=calculateRoCostDisplay(input);assert.equal(d.unallocatedInr,900);assert.equal(d.breakdownComplete,false);assert.equal(d.expensesInr,null);assert.equal(d.knownExpensesInr,1300);
 rows.find(r=>r.label==='Unreviewed other charge').label='Freight before GST';rows.find(r=>r.label==='Freight before GST').value=1000;d=calculateRoCostDisplay(input);assert.equal(d.unallocatedInr,-100);assert.equal(d.breakdownComplete,false);
});

test('mismatching selected totals cannot be assigned to a headline and partial actuals keep null amounts',()=>{
 const input=fixture();input.worksheetComparison.ai.totalInr=12000;let d=calculateRoCostDisplay(input);assert.deepEqual(d.components,[]);assert.equal(d.unallocatedInr,12000);assert.equal(d.reconciled,false);
 delete input.worksheetComparison;input.actuals={supplierInr:9000,bcd:700};d=calculateRoCostDisplay(input);assert.equal(d.basis,'Known actuals');assert.equal(d.aiRate,null);assert.equal(d.totalInr,null);assert.equal(d.knownTotalInr,9700);assert.equal(d.knownExpensesInr,700);assert.equal(d.expensesInr,null);assert.equal(d.components.find(r=>r.key==='bank').sharePercent,null);
 input.actuals={};d=calculateRoCostDisplay(input);assert.equal(d.basis,'Pending');assert.equal(d.knownTotalInr,null);assert.deepEqual(d.components,[]);
});
