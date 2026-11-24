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
test('out-of-scope and partial multi-supplier records never expose their contents',()=>{
 const {page,state,invoice,ro}=setup();
 invoice.roId=ro.id;
 state.scm.ros.push(ro);
 state.orders.push({...state.orders[0],id:'hidden',scope:'LAE_DOMESTIC',number:'SECRET-PO'});
 state.scm.invoices.push({...invoice,id:'i2',number:'SECRET-CI',members:[{orderId:'hidden',lines:[],shipmentId:'xx'}]});
 ro.containers[0].lines.push({orderId:'hidden',invoiceId:'i2',lineId:'xx',quantity:2});
 assert.doesNotMatch(page(''),/SECRET-|href="#\/scm\?ro=r1">R1</);
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
