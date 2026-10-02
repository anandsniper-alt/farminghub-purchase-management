import test from 'node:test';
import assert from 'node:assert/strict';
import {blankState,ensureMonthly,purchasePrice,calculateMRP,createOrders,copyBom,validateState} from '../shared/implements/domain.mjs';
import {calculateModelCost} from '../shared/implements/costing.mjs';
const pto=(id,rate)=>({id,code:'',name:id,componentFamily:'PTO',category:'PTO shafts',fabricated:false,supplier:'MJ',rate,transportPercent:5,transportInCost:true,uom:'pcs'});
const fixture=()=>{
 const model=(id,partId)=>({id,series:id.startsWith('S5')?'Bananovator':'Leader',bomAvailable:true,lines:[{partId,ppm:1}],fabrication:[{name:'Set',ppm:1,weight:1}],revision:1,history:[],costs:{'Gearbox powder coating':0,Assembly:0,'Rack stand':0,'Buffer cost':0}});
 const s=ensureMonthly(blankState({version:'isolated',models:[model('S2.V58','mj'),model('S5.V1','banana')],parts:[pto('mj',3723),pto('banana',5850),pto('racer',3650)],suppliers:[{id:'MJ',name:'MJ'}]}));s.settings.fabricationRate=1;s.settings.bufferPercent=0;return s;
};
test('PTO quotes add 5% once and earlier imported transport stays reference-only',()=>{
 for(const [base,total] of [[3650,3832.5],[3723,3909.15],[5850,6142.5]])assert.equal(purchasePrice(pto('x',base)).effectiveRate,total);
 assert.equal(purchasePrice({rate:170,transportPercent:3}).effectiveRate,170);
 assert.equal(purchasePrice({...pto('x',3723),transportPercent:null}).effectiveRate,null);
 assert.equal(purchasePrice({...pto('x',3723),rate:null}).effectiveRate,null);
 assert.throws(()=>purchasePrice({...pto('x',3723),transportPercent:101}));
 const s=fixture();s.parts[0].transportInCost='true';assert.throws(()=>validateState(s),/boolean/);
});
test('BOM, multi-machine MRP and saved PO agree on the landed PTO price',()=>{
 const s=fixture();assert.equal(calculateModelCost(s,'S2.V58').partsTotal,3909.15);assert.equal(calculateModelCost(s,'S5.V1').partsTotal,6142.5);
 s.plan={'S2.V58':3};s.stock.mj={qty:1};const row=calculateMRP(s).rows.find(r=>r.key==='mj');
 assert.equal(row.demand,3);assert.equal(row.orderQty,2);assert.equal(row.rate,3909.15);assert.equal(row.amount,7818.3);
 const po=createOrders(s,['mj'],{date:'2026-10-02',quantityOnly:false})[0];assert.equal(po.total,7818.3);assert.equal(po.lines[0].purchaseBaseRate,3723);assert.equal(po.lines[0].purchaseTransportAmount,186.15);
 s.parts[0].rate=4000;assert.equal(calculateMRP(s).rows.find(r=>r.key==='mj').rate,4200);assert.equal(po.total,7818.3);
});
test('copying a BOM retains the target PTO variant and its own quantity',()=>{
 const s=fixture();assert.deepEqual(copyBom(s,'S5.V1','S2.V58').lines,[{partId:'banana',ppm:1}]);assert.deepEqual(copyBom(s,'S2.V58','S5.V1').lines,[{partId:'mj',ppm:1}]);
 s.models[1].lines[0].partId='racer';assert.equal(copyBom(s,'S5.V1','S2.V58').lines[0].partId,'racer');
});
