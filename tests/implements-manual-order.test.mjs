import test from 'node:test';
import assert from 'node:assert/strict';
import {blankState,ensureMonthly,syncMonthly,activateMonth,calculateMRP,createOrders,validateState} from '../shared/implements/domain.mjs';
const fixture=()=>{const s=ensureMonthly(blankState({parts:[{id:'p',code:'IMP-1',name:'Clamp',uom:'pcs',rate:10,supplier:'v'}],suppliers:[{id:'v',name:'Vendor'}],models:[{id:'S1.V1',name:'Test',revision:1,bomAvailable:true,lines:[{partId:'p',ppm:2}],fabrication:[{partId:'f',name:'Plate',weight:3,ppm:1}],fabricationSupplier:'v',history:[]}]}));s.plan={'S1.V1':75};s.stock={p:{qty:78}};s.settings.bufferPercent=10;return s;};
const row=s=>calculateMRP(s).rows.find(r=>r.key==='p');
test('manual quantities show actual buffer or shortage and zero omits purchase without altering MRP',()=>{
 const s=fixture();assert.equal(row(s).orderQty,80);
 for(const [qty,buffer,shortage] of [[100,28,0],[80,8,0],[72,0,0],[60,0,12],[0,0,72]]){s.adjustments.p={orderQty:qty,extras:7};const r=row(s);assert.deepEqual([r.mrp,r.orderQty,r.buffer,r.shortage,r.extras,r.amount],[72,qty,buffer,shortage,0,qty*10]);}
 assert.throws(()=>createOrders(s,['p'],{date:'2026-10-01'}),/Select/);
 delete s.adjustments.p.orderQty;assert.equal(row(s).orderQty,87);
});
test('manual order persists by month, recomputes difference after demand change, and supports decimal units',()=>{
 const s=fixture();s.activeMonth='2026-10';s.monthlyPlans={'2026-10':s.plan};s.monthlyAdjustments={'2026-10':{}};s.adjustments.p={orderQty:60};syncMonthly(s);activateMonth(s,'2026-11');assert.equal(s.adjustments.p,undefined);activateMonth(s,'2026-10');assert.equal(row(s).orderQty,60);
 s.plan['S1.V1']=80;assert.equal(row(s).shortage,22);
 s.parts[0].uom='ltr';s.adjustments.p.orderQty=81.125;assert.equal(row(s).shortage,.875);
 s.adjustments.p.orderQty=-1;assert.throws(()=>validateState(s));s.adjustments.p.orderQty=1.2345;assert.throws(()=>validateState(s));
 s.parts[0].uom='pcs';s.adjustments.p.orderQty=1.5;assert.throws(()=>validateState(s));
});
test('PO snapshot accepts a reconciled shortage, rejects forged difference and preserves legacy orders',()=>{
 const s=fixture();s.adjustments.p={orderQty:60};s.orders=createOrders(s,['p'],{date:'2026-10-01',quantityOnly:false});validateState(s);assert.equal(s.orders[0].lines[0].shortage,12);assert.equal(s.orders[0].total,600);
 const bad=structuredClone(s);bad.orders[0].lines[0].shortage=11;assert.throws(()=>validateState(bad),/reconcile/);
 const legacy=fixture();legacy.orders=createOrders(legacy,['p'],{date:'2026-10-01'});validateState(legacy);assert.equal(legacy.orders[0].lines[0].manualOrder,undefined);
 const fab=fixture();fab.adjustments['fab:S1.V1']={orderQty:70};const r=calculateMRP(fab).rows.find(r=>r.fabricated);assert.equal(r.weight,210);assert.equal(r.shortage,5);
});
