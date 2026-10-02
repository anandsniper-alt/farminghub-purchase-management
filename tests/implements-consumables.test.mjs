import test from 'node:test';
import assert from 'node:assert/strict';
import {blankState,ensureMonthly,calculateMRP,createOrders,validateState,validateOrder,previewStock,previewPrices,purchasePrice} from '../shared/implements/domain.mjs';
import {calculateModelCost} from '../shared/implements/costing.mjs';
const fixture=()=>{
 const parts=[{id:'oil',code:'IMP-271',name:'Oil',uom:'ltr',rate:181,transportPercent:2,transportInCost:true,supplier:'v'},{id:'grease',code:'IMP-343',name:'Grease',uom:'kg',rate:258.75,supplier:'v'},{id:'bolt',code:'IMP-1',name:'Bolt',uom:'pcs',rate:10,supplier:'v'}];
 const s=ensureMonthly(blankState({version:'test',parts,suppliers:[{id:'v',name:'Supplier'}],models:[{id:'S2.V12',series:'Leader',revision:1,history:[],bomAvailable:true,lines:[{partId:'oil',ppm:5.5},{partId:'grease',ppm:0.4},{partId:'bolt',ppm:1}],fabrication:[],costs:{}}]}),'2026-10');s.settings.bufferPercent=10;s.settings.fabricationRate=125;return s;
};
test('litres/kg stay fractional in BOM costing and pcs remain whole',()=>{
 const s=fixture();validateState(s);const cost=calculateModelCost(s,'S2.V12');assert.equal(cost.rows[0].unit,'ltr');assert.equal(cost.rows[0].amount,1015.41);assert.equal(cost.rows[1].amount,103.5);assert.equal(purchasePrice(s.parts[0]).effectiveRate,184.62);
 const bad=structuredClone(s);bad.models[0].lines[2].ppm=0.4;assert.throws(()=>validateState(bad),/whole/);bad.models[0].lines[2].ppm=1;bad.models[0].lines[1].ppm=0.0001;assert.throws(()=>validateState(bad),/3 decimal/);
});
test('monthly stock, buffers, extras and supplier PO reconcile fractional quantities',()=>{
 const s=fixture();s.monthlyPlans={'2026-09':{'S2.V12':1},'2026-10':{'S2.V12':3}};s.plan={'S2.V12':3};s.stock={oil:{qty:7.75},grease:{qty:0.65}};s.adjustments={grease:{extras:0.055}};
 const report=calculateMRP(s),oil=report.rows.find(r=>r.key==='oil'),grease=report.rows.find(r=>r.key==='grease');assert.equal(oil.stock,2.25);assert.equal(oil.mrp,14.25);assert.equal(oil.buffer,1.425);assert.equal(oil.orderQty,15.675);assert.equal(grease.stock,0.25);assert.equal(grease.mrp,0.95);assert.equal(grease.buffer,0.095);assert.equal(grease.orderQty,1.1);assert.equal(grease.amount,284.63);
 const po=createOrders(s,['oil','grease'],{date:'2026-10-02',quantityOnly:false})[0];validateOrder(po);assert.equal(po.lines[0].rateUnit,'ltr');assert.equal(po.lines[1].uom,'kg');const forged=structuredClone(po);forged.lines[1].uom='pcs';assert.throws(()=>validateOrder(forged),/whole/);
});
test('stock and price imports match each item unit rather than treating all as pieces',()=>{
 const s=fixture(),stock=previewStock(s,[['code','qty'],['IMP-271',5.5],['IMP-343',0.2],['IMP-1',0.2]],0,1);assert.equal(stock.matched.length,2);assert.equal(stock.errors.length,1);
 const prices=previewPrices(s,[['code','rate','unit'],['IMP-271',179,'ltr'],['IMP-343',258.75,'kg'],['IMP-1',12,'kg']],0,1,{unitColumn:2});assert.equal(prices.matched.length,2);assert.equal(prices.errors.length,1);
});
