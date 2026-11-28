import test from 'node:test';
import assert from 'node:assert/strict';
import {createScmUI} from '../web/scm-workspace.mjs';

const escape = value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const heading=(eyebrow,title,sub,actions)=>'<h1>'+title+'</h1>'+sub+actions;
function setup(){
 const o={id:'po1',number:'PO 1',scope:'LAE_IMPORT',vendorId:'vendor',currency:'USD',productionCompletedAt:'2026-11-01',revisions:[{}],bulkQc:{result:'PASS'},documents:[],lines:[{id:'l1',code:'ITEM',quantity:25}],shipments:[{id:'sh1',status:'PLANNED',number:'P1',lines:[{lineId:'l1',quantity:10}]}]};
 const invoice={id:'i1',number:'CI <1>',vendorId:'vendor',bookingRef:'BK1',bookedAt:'2026-11-03',members:[{orderId:'po1',shipmentId:'sh1',lines:[{lineId:'l1',quantity:10}]}],followups:[]};
 const ro={id:'r1',number:'R1',containers:[{number:'C1',packingList:'PL1',lines:[{orderId:'po1',lineId:'l1',quantity:10,invoiceId:'i1'}]}],stages:[],followups:[]};
 const state={orders:[o],vendors:[{id:'vendor',name:'Maker'},{id:'forwarder',kind:'LOGISTICS',status:'ACTIVE',name:'Freight'}],scm:{invoices:[invoice],ros:[]}};
 const user={id:'buyer',role:'MANAGER',scopes:['LAE_IMPORT']};
 const ui=createScmUI({context:()=>({state,user}),esc:escape,head:heading,legacyShipments:()=>'<p>shipment adapter</p>',arrivalCosts:()=>'<p>costing adapter</p>',orderDocs:()=>'<p>docs adapter</p>'});
 const page=query=>{globalThis.location={hash:'#/scm?'+query};return ui.page();};
 return {page,state,invoice,ro,o,user,ui};
}

test('an SCM booking linked from a PO preselects its supplier and the exact reserved loading plan',()=>{
 const {page}=setup();
 const html=page('book=1&po=po1&plan=sh1');
 assert.match(html,/value="vendor" selected/);
 assert.match(html,/checked data-scm-plan="sh1"/);
 assert.match(html,/max="15"/);
 assert.match(html,/Commercial invoice number/);
});
test('SCM scopes the legacy evidence and costing adapters to the selected PO',()=>{
 const {page,o}=setup();
 o.shipments[0].actualArrival='2026-11-22';
 assert.match(page('po=po1'),/shipment adapter/);
 assert.match(page('po=po1'),/costing adapter/);
 assert.match(page('po=po1'),/docs adapter/);
 assert.doesNotMatch(page(''),/shipment adapter/);
 assert.match(page('po=unavailable'),/PO unavailable/);
});
test('after loading, follow-ups and draft BL evidence belong to the RO and insurance is available after final BL',()=>{
 const {page,state,invoice,ro,o}=setup();
 Object.assign(invoice,{roId:'r1',loadedAt:'2026-11-05',releasedAt:'2026-11-04'});
 state.scm.ros.push(ro);
 let html=page('invoice=i1');
 assert.match(html,/CI &lt;1&gt;/);
 assert.doesNotMatch(html,/data-scm-form="follow-invoice"|data-scm-form="insure"/);
 html=page('ro=r1');
 assert.match(html,/Attach commercial invoice CI &lt;1&gt;/);
 assert.doesNotMatch(html,/data-scm-form="ro-stage"/);
 o.documents.push({type:'COMMERCIAL_INVOICE',invoiceNumber:invoice.number,status:'FINAL',shipmentId:'sh1'});
 html=page('ro=r1');
 assert.match(html,/data-packing-for="C1"/);
 assert.equal((html.match(/Verified draft BL file/g)||[]).length,1);
 assert.match(html,/data-scm-form="follow-ro"/);
 assert.match(html,/href="#\/order\/po1"/);
 ro.blNumber='BL1';
 assert.match(page('invoice=i1'),/data-scm-form="insure"/);
});

test('a combined RO names the uninsured invoice in the PO, register and RO and unlocks arrival after coverage',()=>{
 const {page,state,invoice,ro,o,ui}=setup();
 Object.assign(invoice,{roId:ro.id,loadedAt:'2026-11-05'});
 Object.assign(ro,{blNumber:'BL1',stages:['SHIPPING_DOCS','SAILING','BL'].map(stage=>({stage,date:'2026-11-08'}))});
 const insured={...invoice,id:'i2',number:'CI 2',insurance:{date:'2026-11-08',reference:'P2'}};
 state.scm.invoices.push(insured);
 state.scm.ros.push(ro);
 const primary=ui.orderAction(o);
 assert.equal(primary.label,'Record insurance for CI <1>');
 assert.match(primary.href,/invoice=i1&fromPo=po1&focus=insurance/);
 assert.match(page('po=po1'),/Record insurance for CI &lt;1&gt;/);
 const blocked=page('ro=r1&fromPo=po1');
 assert.match(blocked,/Before india arrival/i);
 assert.doesNotMatch(blocked,/data-scm-form="ro-stage"|Record insurance for CI 2/);
 const invoicePage=page(primary.href.split('?')[1]);
 assert.ok(invoicePage.indexOf('data-scm-form="insure"')<invoicePage.indexOf('Invoice status'));
 assert.match(invoicePage,/Back to SCM for PO 1/);
 invoice.insurance={date:'2026-11-09',reference:'P1'};
 assert.match(page('ro=r1'),/data-scm-form="ro-stage"/);
 assert.match(ui.orderAction(o).label,/india arrival/i);
});

test('global tracking has one row per RO and keeps split POs and unlinked bookings visible',()=>{
 const {page,state,invoice,ro}=setup();
 Object.assign(invoice,{roId:ro.id,loadedAt:'2026-11-05',eta:'2026-11-12'});
 state.scm.invoices.push({...invoice,id:'i2',number:'Second invoice',roId:'r2',loadedAt:'2026-11-06',eta:'2026-11-15'});
 state.scm.invoices.push({...invoice,id:'pending',number:'Awaiting loading',roId:null,loadedAt:null});
 state.scm.ros.push(ro,{...ro,id:'r2',number:'R2',blNumber:'BL-R2',
  containers:[{...ro.containers[0],number:'C2',lines:[{...ro.containers[0].lines[0],invoiceId:'i2'}]}],
  stages:[{stage:'SAILING',date:'2026-11-09'}]});

 const html=page('');
 assert.ok(html.indexOf('<h2>RO tracking</h2>')<html.indexOf('<h2>Commercial invoices</h2>'));
 const [tracking]=html.split('<h2>Commercial invoices</h2>');
 assert.equal((tracking.match(/scope="row"/g)||[]).length,2);
 assert.match(tracking,/>R1<.*>Loaded<.*2026-11-05.*2026-11-12.*CI &lt;1&gt;.*Maker.*PO 1/s);
 assert.match(tracking,/>R2<.*BL BL-R2.*>Vessel departure<.*2026-11-09.*Second invoice/s);
 assert.doesNotMatch(tracking,/Awaiting loading/);
 assert.match(html,/Awaiting loading<.*Pending loading/s);
 const scoped=page('po=po1');
 assert.ok(scoped.indexOf('<h2>Commercial invoices</h2>')<scoped.indexOf('<h2>RO tracking</h2>'));
});

test('a combined RO labels ETA sources and follow-up ownership and gives viewers a read-only link',()=>{
 const {page,state,invoice,ro,o,user}=setup();
 Object.assign(invoice,{roId:ro.id,loadedAt:'2026-11-05',eta:'2026-11-12'});
 state.orders.push({...o,id:'po2',number:'PO 2',vendorId:'second-vendor'});
 state.vendors.push({id:'second-vendor',name:'Second & Supplier'});
 state.scm.invoices.push({...invoice,id:'i2',number:'Second invoice',vendorId:'second-vendor',eta:'2026-11-14',
  members:[{...invoice.members[0],orderId:'po2'}]});
 ro.containers[0].lines.push({...ro.containers[0].lines[0],orderId:'po2',invoiceId:'i2'});
 state.scm.ros.push(ro);
 ro.followups=[
  {date:'2026-11-10',at:'2026-11-10T11:30:00Z',remarks:'Check vessel <schedule>',assignedOwner:'Buyer B',nextDue:'2026-11-12'},
  {date:'2026-11-09',at:'2026-11-10T12:30:00Z',remarks:'Backdated note',assignedOwner:'Buyer A'},
 ];
 let [tracking]=page('').split('<h2>Commercial invoices</h2>');
 assert.equal((tracking.match(/scope="row"/g)||[]).length,1);
 assert.match(tracking,/2 invoices · 2 suppliers · 2 POs/);
 assert.match(tracking,/Second invoice.*Second &amp; Supplier.*PO 2/s);
 assert.match(tracking,/Booking ETAs differ/);
 assert.doesNotMatch(tracking,/<strong>ETA/);
 assert.match(tracking,/Second invoice.*Booking ETA <time datetime="2026-11-14"/s);
 assert.match(tracking,/Check vessel &lt;schedule&gt;.*Buyer B.*Due <time datetime="2026-11-12"/s);
 assert.doesNotMatch(tracking,/Backdated note/);

 ro.trackingReports=[
  {date:'2026-11-11',eta:'2026-11-16',at:'2026-11-11T08:00:00Z'},
  {date:'2026-11-12',eta:'2026-11-17',at:'2026-11-12T08:00:00Z',reportedBlNumber:'UNVERIFIED'},
  {date:'2026-11-10',eta:'2026-11-15',at:'2026-11-13T08:00:00Z'},
  {date:'2026-11-13',eta:''},
 ];
 [tracking]=page('').split('<h2>Commercial invoices</h2>');
 assert.match(tracking,/Final BL pending/);
 assert.doesNotMatch(tracking,/UNVERIFIED|Actual/);
 assert.match(tracking,/ETA <time datetime="2026-11-17".*Forwarder report · <time datetime="2026-11-12"/s);
 ro.trackingReports.push({...ro.trackingReports[1],eta:'2026-11-18'});
 assert.match(page(''),/Forwarder ETAs differ/);

 ro.trackingReports.pop();
 Object.assign(ro,{blNumber:'CONFIRMED',stages:['SHIPPING_DOCS','SAILING','BL','INDIA_ARRIVAL'].map(stage=>({stage,date:'2026-11-19'}))});
 user.role='VIEWER';
 [tracking]=page('').split('<h2>Commercial invoices</h2>');
 assert.match(tracking,/BL CONFIRMED/);
 assert.match(tracking,/Actual <time datetime="2026-11-19".*ETA <time datetime="2026-11-17"/s);
 assert.match(tracking,/href="#\/scm\?ro=r1">View RO/);
 assert.doesNotMatch(tracking,/Finalize costing/);
});

test('SCM renders one dated RO timeline for combined loads and labels estimated arrival separately',()=>{
 const {page,state,invoice,ro,user}=setup();
 Object.assign(invoice,{roId:ro.id,loadedAt:'2026-11-05',eta:'2026-12-10'});
 state.scm.invoices.push({...invoice,id:'i2',number:'CI2',loadedAt:'2026-11-06',insurance:{date:'2026-11-09'}});
 state.scm.ros.push(ro);
 user.role='VIEWER';
 assert.match(page(''),/View timeline/);
 const rail=()=>page('ro=r1').split('aria-label="RO milestones">')[1].split('</ol>')[0];
 assert.match(rail(),/2026-11-05.*2026-11-06/);
 assert.match(rail(),/aria-current="step"><strong>Shipping documents/);
 ro.stages=['SHIPPING_DOCS','SAILING','BL'].map(stage=>({stage,date:'2026-11-08'}));
 ro.trackingReports=[{date:'2026-11-12',eta:'2026-12-12',reportedBlNumber:'UNCONFIRMED'}];
 assert.equal((rail().match(/<li /g)||[]).length,6);
 assert.match(rail(),/aria-current="step"><strong>India arrival.*ETA .*2026-12-12.*Forwarder report.*Awaiting insurance on 1 invoice/);
 assert.doesNotMatch(rail(),/UNCONFIRMED/);
 ro.stages.push({stage:'INDIA_ARRIVAL',date:'2026-12-13'},{stage:'COST_CAPTURE',date:'2026-12-15'});
 assert.equal((rail().match(/class="scm-milestone done"/g)||[]).length,6);
 assert.doesNotMatch(rail(),/aria-current|ETA |Pending/);
});

test('all shipment timelines pair suppliers with invoices and use the correct inline RO controls',()=>{
 const {page,state,invoice,ro,o,user}=setup();
 assert.match(page(''),/href="#\/scm\?view=shipments">All shipment timelines/);
 assert.match(page('view=shipments'),/No shipments have been loaded/);
 Object.assign(invoice,{roId:ro.id,loadedAt:'2026-11-05'});
 const second={...invoice,id:'second',number:'C2',vendorId:'v2'};
 state.scm.invoices.push(second,{...invoice,id:'booked',number:'UNLOADED',roId:null});
 state.vendors.push({id:'v2',name:'New & Co'});
 state.scm.ros.push(ro);
 const board=()=>page('view=shipments');
 assert.equal((board().match(/<article /g)||[]).length,1);
 assert.match(board(),/<strong>Maker<\/strong> · .*?CI &lt;1&gt;<\/a><\/li><li><strong>New &amp; Co<\/strong> · .*?>C2<\/a>/);
 assert.doesNotMatch(board(),/UNLOADED|data-scm-form="ro-stage"/);
 assert.match(board(),/Update RO status.*Attach commercial invoice/s);
 for(const inv of [invoice,second])o.documents.push({type:'COMMERCIAL_INVOICE',invoiceNumber:inv.number,status:'FINAL',shipmentId:'sh1'});
 assert.match(board(),/data-scm-form="ro-stage" data-record="r1".*value="SHIPPING_DOCS"/s);
 user.role='VIEWER';
 assert.doesNotMatch(board(),/Update RO status|data-scm-form/);
 assert.match(board(),/RO milestones/);
});

test('out-of-scope and partial multi-supplier records never expose their contents',()=>{
 const {page,state,invoice,ro}=setup();
 invoice.roId=ro.id;
 state.scm.ros.push(ro);
 state.orders.push({...state.orders[0],id:'hidden',scope:'LAE_DOMESTIC',number:'SECRET-PO'});
 state.scm.invoices.push({...invoice,id:'i2',number:'SECRET-CI',members:[{orderId:'hidden',lines:[],shipmentId:'xx'}]});
 ro.containers[0].lines.push({orderId:'hidden',invoiceId:'i2',lineId:'xx',quantity:2});
 assert.doesNotMatch(page(''),/SECRET-|href="#\/scm\?ro=r1">R1</);
 assert.doesNotMatch(page('view=shipments'),/SECRET-|scm-shipment-card/);
 assert.match(page('ro=r1'),/Record unavailable/);
 assert.match(page('invoice=i2'),/Record unavailable/);
});

test('manager cancellation is available before loading, and a cancelled booking preserves history without actions',()=>{
 const {page,invoice,user,o}=setup();
 assert.match(page('invoice=i1'),/data-scm-form="cancel"/);
 invoice.releasedAt='2026-11-05';
 assert.match(page('invoice=i1'),/data-scm-form="cancel"/);
 user.role='EXECUTIVE';o.buyerId=user.id;
 assert.doesNotMatch(page('invoice=i1'),/data-scm-form="cancel"/);
 user.role='MANAGER';
 Object.assign(invoice,{cancelledAt:'2026-11-06T10:00:00Z',cancelledBy:'Buyer',cancelReason:'Correct PO allocation',followups:[{date:'2026-11-04',remarks:'Called supplier'}]});
 assert.match(page(''),/Cancelled/);
 const historical=page('invoice=i1');
 assert.match(historical,/2026-11-06 · Buyer/);
 assert.match(historical,/Correct PO allocation/);
 assert.match(historical,/Called supplier/);
 assert.doesNotMatch(historical,/data-scm-form=|Pending/);
 delete invoice.cancelledAt;
 Object.assign(invoice,{roId:'r1',loadedAt:'2026-11-07'});
 assert.doesNotMatch(page('invoice=i1'),/data-scm-form="cancel"/);
});
