import test from 'node:test';
import assert from 'node:assert/strict';
import {poCurrencyAmounts,poPrintSource,renderPoPrint} from '../web/po-print.mjs';
const order=(currency='CNY',rate=6780000)=>({number:'TEST',currency,priceConversion:{from:currency==='CNY'?'USD':'CNY',to:currency,rate,date:'2026-10-15',quote:'USD_CNY'},lines:[{code:'A',quantity:100,unitPriceMinor:26000},{code:'B',quantity:100,unitPriceMinor:26000},{code:'C',quantity:100,unitPriceMinor:26000}],revisions:[]});
test('CNY example divides by saved RMB per USD and totals sum rounded lines',()=>{
 const s=order(),before=structuredClone(s),r=poCurrencyAmounts(s);
 assert.equal(r.rows[0].USD.unit,383481n);assert.equal(r.rows[0].USD.amount,383481n);
 assert.equal(r.totals.CNY,7800000n);assert.equal(r.totals.USD,1150443n);assert.deepEqual(s,before);
 const html=renderPoPrint(poPrintSource(s));assert.match(html,/CNY \(RMB\) 78,000.00/);assert.match(html,/USD 11,504.43/);assert.match(html,/38.3481/);assert.match(html,/1 USD = 6.78 CNY/);
});
test('USD orders multiply by CNY per USD, preserving payable USD',()=>{
 const s=order('USD');s.lines=[{quantity:3,unitPriceMinor:12345}];const r=poCurrencyAmounts(s);
 assert.equal(r.rows[0].CNY.unit,8369910n);assert.equal(r.rows[0].CNY.amount,251097n);assert.equal(r.totals.USD,37035n);
});
test('line conversion does not multiply a rounded converted unit price',()=>{
 const s=order('CNY',6700000);s.lines=[{quantity:30,unitPriceMinor:303900},{quantity:240,unitPriceMinor:49000}];const r=poCurrencyAmounts(s);
 assert.equal(r.rows[0].USD.unit,4535821n);assert.equal(r.rows[0].USD.amount,1360746n);assert.equal(r.rows[1].USD.amount,1755224n);assert.equal(r.totals.USD,3115970n);
 // Half-cent ties round up, independently of binary floating point.
 const half=order('CNY',2000000);half.lines=[{quantity:1,unitPriceMinor:1}];assert.equal(poCurrencyAmounts(half).totals.USD,1n);
});
test('legacy DIRECT rates retain their original direction, including omitted quote',()=>{
 const s=order('USD',125000);s.lines=[{quantity:2,unitPriceMinor:100}];s.priceConversion.quote='DIRECT';
 assert.equal(poCurrencyAmounts(s).totals.CNY,1600n);assert.match(poCurrencyAmounts(s).rateText,/1 CNY = 0.125 USD/);
 delete s.priceConversion.quote;assert.equal(poCurrencyAmounts(s).totals.CNY,1600n);
 const c=order();c.priceConversion.quote='DIRECT';assert.equal(poCurrencyAmounts(c).totals.USD,1150443n);
});
test('missing, invalid or unrelated rates never produce an invented equivalent',()=>{
 for(const patch of [null,{rate:0},{rate:-1},{rate:NaN},{rate:6.78},{date:'2026-02-30'},{date:''},{from:'INR'},{to:'USD'},{quote:'UNKNOWN'}]){
  const s=order();s.priceConversion=patch===null?null:{...s.priceConversion,...patch};const r=poCurrencyAmounts(s);assert.equal(r.valid,false);assert.equal(r.totals.USD,null);assert.equal(r.totals.CNY,7800000n);
 }
 assert.equal(poCurrencyAmounts({...order(),currency:'INR'}),null);
});
test('issued revisions use historical prices, currencies and FX, never current values',()=>{
 const o=order();o.revisions=[{revision:0,snapshot:structuredClone(o)}];o.priceConversion.rate=8000000;o.lines[0].unitPriceMinor=99999;o.currency='USD';
 const r=poCurrencyAmounts(poPrintSource(o).snapshot);assert.equal(r.totals.CNY,7800000n);assert.equal(r.totals.USD,1150443n);
 delete o.revisions[0].snapshot.priceConversion;assert.equal(poCurrencyAmounts(poPrintSource(o).snapshot).totals.USD,null);
});
test('mismatched stored totals retain native value and withhold misleading reference totals',()=>{
 const o=order();o.totalMinor=7900000;const r=poCurrencyAmounts(o);assert.equal(r.totals.CNY,7900000n);assert.equal(r.totals.USD,null);assert.equal(r.mismatch,true);
 assert.match(renderPoPrint(poPrintSource(o)),/Reference total unavailable/);
});
test('large integer values convert without floating-point multiplication loss',()=>{
 const o=order('USD',6789123);o.lines=[{quantity:9999,unitPriceMinor:99999999}];const r=poCurrencyAmounts(o);assert.equal(r.totals.USD,999899990001n);assert.equal(r.totals.CNY,6788444019816n);
});
