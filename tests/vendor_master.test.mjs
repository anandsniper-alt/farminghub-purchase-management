import test from 'node:test';
import assert from 'node:assert/strict';
import {createCleanSeed} from '../shared/clean-seed.mjs';
import {previewImport, findVendorByAnyCode, TERMS, paymentSchedule, execute, major, orderTotal} from '../shared/domain.mjs';

test('clean seed loads final vendor code master without demo transactions',()=>{
  const state=createCleanSeed(new Date('2026-09-12T12:00:00Z'));
  assert.equal(state.vendors.length,37);
  assert.equal(state.orders.length,0);
  assert.equal(state.items.length,387);
  assert.equal(state.bases.length,129);
  assert.equal(state.priceLists.length,106);
  assert.equal(state.complaints.length,0);
  assert.equal(state.shipments?.length||0,0);
  const v01=state.vendors.find(v=>v.vendorSerial==='V01');
  assert.equal(v01.fixedSupplierCode,'SWAC');
  assert.equal(v01.fullReference,'V01-SWAC');
  assert.equal(v01.codeLocked,true);
  assert.equal(v01.defaultPriceListCurrency,'CNY');
  assert.equal(v01.defaultBillingCurrency,'USD');
  assert.equal(v01.defaultTerms,'10-20-70-bl120');
  assert.equal(v01.productionDays,45);
  assert.equal(state.vendors.filter(v=>v.status==='ACTIVE').length,23);
  assert.equal(state.vendors.filter(v=>v.status==='INACTIVE').length,14);
  assert.ok(state.ports.some(p=>p.name==='NINGBO'));
  assert.ok(state.paymentMethods.some(m=>m.id==='TT'));
});

test('vendor code master uses serial plus fixed code because fixed code alone can repeat',()=>{
  const state=createCleanSeed();
  const fixed=state.vendors.filter(v=>v.fixedSupplierCode==='XMMS');
  assert.equal(fixed.length,2);
  assert.deepEqual(fixed.map(v=>v.fullReference).sort(),['V09-XMMS','V12-XMMS']);
  assert.equal(findVendorByAnyCode(state,'V12-XMMS').name,'SICHUAN XUDONG MACHINERY MANUFACTURE CO LTD');
  assert.equal(findVendorByAnyCode(state,'BMCM').fullReference,'V36-BMCM');
});

test('item master preview validates vendor references from full or fixed code',()=>{
  const state=createCleanSeed();
  const base={FHClassification:'X',ProductCategory:'POWER WEEDER',ItemCode:'TST-001',ItemName:'Test Item',VendorCode:'V01-SWAC',ProductionDays:'30'};
  let rows=previewImport(state,[base]);
  assert.equal(rows[0].result,'CREATE');
  assert.equal(rows[0].normalized.vendorCode,'V01-SWAC');
  rows=previewImport(state,[{...base,ItemCode:'TST-002',VendorCode:'SWAC'}]);
  assert.equal(rows[0].result,'CREATE');
  rows=previewImport(state,[{...base,ItemCode:'TST-003',VendorCode:'NOPE'}]);
  assert.equal(rows[0].result,'REJECTED');
  assert.ok(rows[0].errors.some(e=>e.includes('Vendor code')));
});


test('workbook payment terms are normalized into calculable PO milestones',()=>{
  const t=TERMS.find(t=>t.id==='10-20-70-bl120');
  assert.equal(t.steps.length,3);
  assert.deepEqual(t.steps.map(s=>[s.percent,s.trigger,s.days]),[[10,'PI',0],[20,'SHIPMENT',0],[70,'BL',120]]);
  const t2=TERMS.find(t=>t.id==='30-70');
  assert.deepEqual(t2.steps.map(s=>[s.percent,s.trigger,s.days]),[[30,'PI',0],[70,'BL',0]]);
});
