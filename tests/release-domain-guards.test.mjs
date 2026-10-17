import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createSeed} from '../shared/seed.mjs';
import {execute,TERMS,paymentSchedule,major,amendmentReadiness,allocationsFor} from '../shared/domain.mjs';
import {ciEnabled,ciBalance,ciAdvanceAvailable,ciReadiness,suggestedCiPolicy} from '../shared/ci-payments.mjs';
import {normalizeCostCenterAllocationInput,costCenterReadiness} from '../shared/cost-centres.mjs';
import {EditVersions} from '../server/concurrency.mjs';
import {Store} from '../server/store.mjs';

const seed=createSeed('2026-10-15');let serial=0;
function fixture(){
 let state=structuredClone(seed);const id=state.orders[0].id,manager=state.users.find(u=>u.role==='MANAGER');
 const order=()=>state.orders.find(o=>o.id===id);
 const run=(type,p={},actor=manager)=>{const out=execute(state,{type,payload:{orderId:id,...p}},actor,{now:'2026-10-15T09:30:00.000Z',id:()=>`release-domain-${++serial}`});state=out.state;return out.result;};
 const evidence=()=>{const file={id:`release-proof-${++serial}`,scope:'LAE_IMPORT',orderIds:[id],name:'Synthetic evidence'};state.files.push(file);return file.id;};
 const configure=()=>run('CONFIGURE_CI_PAYMENTS',{rule:'FINAL_BL',days:0,reason:'Synthetic per-PO agreement',confirm:true});
 const save=()=>run('SAVE_COMMERCIAL_INVOICE',{documentId:order().documents.find(d=>d.type==='COMMERCIAL_INVOICE').id,amount:'50000',advance:'10000'}).id;
 const milestone=ciId=>paymentSchedule(state,order()).find(m=>m.ciId===ciId);
 const approve=ciId=>run('APPROVE_COMMERCIAL_INVOICE',{ciId,confirm:true});
 const authorize=ciId=>run('AUTHORIZE_PAYMENT',{termIndex:milestone(ciId).index,shipmentId:milestone(ciId).shipmentId});
 const pay=(ciId,amount)=>run('RECORD_PAYMENT',{reference:`RELEASE-BANK-${++serial}`,date:'2026-10-15',currency:'USD',amount,inrRate:'85',fileId:evidence(),allocations:[{orderId:id,termIndex:milestone(ciId).index,shipmentId:milestone(ciId).shipmentId,amount}]});
 return {get state(){return state},id,order,run,evidence,configure,save,approve,authorize,pay,milestone,manager};
}
function draftPayload(state,extra={}){
 const item=state.items.find(i=>i.code==='GJPW12'),base=state.bases.find(b=>b.id===item.baseId);
 return {vendorId:base.vendorId,currency:'USD',priceListCurrency:'USD',paymentTerms:structuredClone(TERMS[0]),productionDays:30,productionOverrideReason:'Synthetic commitment',planningTat:60,routeId:state.routes[0].id,requestedPortDate:'2026-12-20',lines:[{itemId:item.id,quantity:10,unitPrice:'100.00',specId:base.specifications[0].id}],...extra};
}

test('supplier CI defaults are passive suggestions and never enable a new PO',()=>{
 const f=fixture(),payload=draftPayload(f.state),vendor=f.state.vendors.find(v=>v.id===payload.vendorId);
 vendor.ciPaymentDefault={rule:'FINAL_BL',days:120};const vendors=structuredClone(f.state.vendors);
 const id=f.run('CREATE_ORDER',payload).id,o=f.state.orders.find(o=>o.id===id);
 assert.equal(ciEnabled(o),false);assert.equal(o.ciPaymentPolicy,undefined);assert.ok(paymentSchedule(f.state,o).some(m=>m.trigger==='BL'));
 assert.deepEqual(suggestedCiPolicy(f.state,o),vendor.ciPaymentDefault);assert.deepEqual(f.state.vendors,vendors);
});

test('ordinary commercial invoice evidence preserves legacy payment terms and shipping',()=>{
 const f=fixture(),o=f.order(),schedule=structuredClone(paymentSchedule(f.state,o)),shipments=structuredClone(o.shipments),terms=structuredClone(o.paymentTerms);
 f.run('ATTACH_DOCUMENT',{type:'COMMERCIAL_INVOICE',invoiceNumber:'OPTIONAL-CI-EVIDENCE',invoiceDate:'2026-10-15',shipmentId:o.shipments[0].id,fileId:f.evidence()});
 assert.equal(ciEnabled(f.order()),false);assert.equal(f.order().commercialInvoices,undefined);
 assert.deepEqual(paymentSchedule(f.state,f.order()),schedule);assert.deepEqual(f.order().shipments,shipments);assert.deepEqual(f.order().paymentTerms,terms);
});

test('CI policy requires the current approved PI and cannot mutate supplier defaults',()=>{
 for(const change of [f=>f.order().pi.revision--,()=>{}]){
  const f=fixture();change(f);const before=structuredClone(f.state);
  assert.throws(()=>f.run('CONFIGURE_CI_PAYMENTS',{rule:'FINAL_BL',days:120,reason:'Synthetic agreement',confirm:true,...(f.order().pi.revision===f.order().revision?{supplierDefault:true}:{})}),/current PI|PO only/);
  assert.deepEqual(f.state,before);
 }
});

test('only explicit supported CI release rules can be selected or release a payment',()=>{
 for(const rule of ['constructor','toString','__proto__',['FINAL_BL'],{},'UNKNOWN']){
  const f=fixture(),before=structuredClone(f.state);
  assert.throws(()=>f.run('CONFIGURE_CI_PAYMENTS',{rule,days:0,reason:'Invalid input',confirm:true}),/release rule/);assert.deepEqual(f.state,before);
  assert.throws(()=>f.run('SAVE_COMMERCIAL_INVOICE',{documentId:f.order().documents.find(d=>d.type==='COMMERCIAL_INVOICE').id,amount:'1000',advance:'0',policy:{rule,days:0,reason:'Invalid input',confirm:true}}),/payment stage/);assert.deepEqual(f.state,before);
 }
 const f=fixture();f.configure();const id=f.save();f.approve(id);f.order().ciPaymentPolicy.rule='constructor';assert.equal(ciReadiness(f.state,f.order(),f.order().commercialInvoices[0]).eligible,false);assert.throws(()=>f.authorize(id),/release rule/);
});

test('an enabled CI workflow still requires current PI approval for each saved invoice',()=>{
 const f=fixture();f.configure();f.order().pi.revision--;const before=structuredClone(f.state);
 assert.throws(f.save,/current PI/);assert.deepEqual(f.state,before);
});

test('CI manager actions retain the effective payment approval policy in audit history',()=>{
 const f=fixture();f.configure();const id=f.save();f.approve(id);f.run('CANCEL_COMMERCIAL_INVOICE',{ciId:id,reason:'Synthetic correction'});
 for(const action of ['CI_PAYMENT_POLICY_CONFIGURED','COMMERCIAL_INVOICE_APPROVED','COMMERCIAL_INVOICE_CANCELLED']){
  const event=f.state.events.findLast(e=>e.action===action);
  assert.deepEqual(event.approvalControl.roles,['ADMIN','MANAGER']);assert.equal(event.approvalControl.revision,f.state.approvalControls?.revision||0);
 }
});

test('final BL correction invalidates CI authorization until the manager reviews it again',()=>{
 const f=fixture();f.configure();const id=f.save();f.approve(id);f.authorize(id);assert.equal(f.milestone(id).authorized,true);
 f.run('RECORD_BL',{shipmentId:f.order().shipments[0].id,number:'REVIEWED-FINAL-BL',date:'2026-10-01',fileId:f.evidence(),telexStatus:'ORIGINAL_BL',remarks:'Synthetic final BL correction review'});
 assert.equal(f.milestone(id).authorized,false);assert.throws(()=>f.pay(id,'1'),/not authorized/);
 f.authorize(id);f.pay(id,major(ciBalance(f.state,f.order(),f.order().commercialInvoices[0]).balance));assert.equal(f.milestone(id).reported,f.milestone(id).amount);
});

test('a paid CI can be reconfirmed after a nonfinancial PO revision without reversing real payments',()=>{
 const f=fixture();for(const s of f.order().shipments){delete s.actualDeparture;delete s.actualArrival;s.status='RELEASED';s.bookingStatus='RELEASED';}
 f.run('CONFIGURE_CI_PAYMENTS',{rule:'BEFORE_SHIPMENT',days:0,reason:'Synthetic before-shipment agreement',confirm:true});
 const id=f.save();f.approve(id);f.authorize(id);f.pay(id,'1000');
 const paid=structuredClone(f.state.payments),originalCi=structuredClone(f.order().commercialInvoices[0]),originalRevisions=structuredClone(f.order().revisions),events=structuredClone(f.state.events);
 const lines=structuredClone(f.order().lines);lines[0].artworkNotes+=' Synthetic revised label instruction';
 f.run('PROPOSE_AMENDMENT',{reason:'Nonfinancial supplier specification correction',lines});f.run('APPROVE_AMENDMENT');
 assert.equal(f.milestone(id).authorized,false);assert.throws(()=>f.approve(id),/current PI/);
 f.run('CONFIRM_SUPPLIER',{channel:'EMAIL',remarks:'Supplier confirms revised instructions',fileId:f.evidence()});f.run('VERIFY_PI');f.run('APPROVE_PI');
 assert.throws(()=>f.authorize(id),/current PO revision/);
 f.approve(id);const current=f.order().commercialInvoices[0];
 assert.deepEqual(f.state.payments,paid);assert.deepEqual(f.order().commercialInvoiceHistory.at(-1),originalCi);
 for(const key of ['id','termIndex','documentId','number','date','currency','shipmentId','amountMinor','advanceMode','advanceApplications'])assert.deepEqual(current[key],originalCi[key],key);
 assert.equal(current.orderRevision,f.order().revision);assert.equal(current.version,originalCi.version+1);assert.equal(f.milestone(id).authorized,false);
 assert.deepEqual(f.order().revisions.slice(0,originalRevisions.length),originalRevisions);assert.deepEqual(f.state.events.slice(0,events.length),events);
 assert.equal(f.state.events.at(-1).action,'COMMERCIAL_INVOICE_RECONFIRMED');
 f.authorize(id);assert.equal(f.milestone(id).authorized,true);assert.equal(f.milestone(id).amount-f.milestone(id).reported,3900000);
 assert.throws(()=>f.run('SAVE_COMMERCIAL_INVOICE',{ciId:id,documentId:current.documentId,amount:'1'}),/Payments already exist/);
 const changed=structuredClone(f.order().lines);changed[0].unitPriceMinor++;
 assert.throws(()=>f.run('PROPOSE_AMENDMENT',{reason:'Financial change remains prohibited',lines:changed}),/CI settlement is enabled/);
});

test('all CI mutations enforce role, scope and deleted-order boundaries',()=>{
 for(const change of [u=>({...u,role:'VIEWER'}),u=>({...u,scopes:[]})]){
  const f=fixture();f.configure();const id=f.save();
  for(const [type,payload] of [['CONFIGURE_CI_PAYMENTS',{rule:'FINAL_BL',days:0,reason:'x',confirm:true}],['SAVE_COMMERCIAL_INVOICE',{documentId:f.order().documents.find(d=>d.type==='COMMERCIAL_INVOICE').id,amount:'1'}],['APPROVE_COMMERCIAL_INVOICE',{ciId:id,confirm:true}],['CANCEL_COMMERCIAL_INVOICE',{ciId:id,reason:'x'}]])assert.throws(()=>f.run(type,payload,change(f.manager)),e=>e.code==='FORBIDDEN');
 }
 const f=fixture();f.configure();const id=f.save();f.order().deletedAt='2026-10-15';assert.throws(()=>f.run('APPROVE_COMMERCIAL_INVOICE',{ciId:id,confirm:true}),/deleted/);
});

test('legacy against-BL authorization and preexisting authorization both require final BL',()=>{
 const f=fixture(),o=f.order(),shipment=o.shipments[0],milestone=paymentSchedule(f.state,o).find(m=>m.trigger==='BL'&&m.shipmentId===shipment.id);
 delete shipment.blNumber;delete shipment.blDate;
 assert.throws(()=>f.run('AUTHORIZE_PAYMENT',{termIndex:milestone.index,shipmentId:shipment.id}),/final BL/);
 o.paymentAuthorizations.push({termIndex:milestone.index,shipmentId:shipment.id,revision:o.revision});const payments=structuredClone(f.state.payments);
 assert.throws(()=>f.run('RECORD_PAYMENT',{reference:'OLD-AUTH-BL',date:'2026-10-15',currency:'USD',amount:'1',inrRate:'85',fileId:f.evidence(),allocations:[{orderId:o.id,termIndex:milestone.index,shipmentId:shipment.id,amount:'1'}]}),/final BL/);
 assert.deepEqual(f.state.payments,payments);
});

const splitLine=()=>({id:'line',itemId:'item',quantity:10,costCenterAllocations:[{costCenterId:'TN',quantity:4},{costCenterId:'AP',quantity:3},{costCenterId:'HR',quantity:3}]});
test('TN, AP and HR quantities reconcile exactly and invalid splits fail closed',()=>{
 const line=splitLine(),result=normalizeCostCenterAllocationInput({costCenterIds:['HR','TN','AP']},[line]);
 assert.deepEqual(result.costCenterIds,['TN','AP','HR']);assert.equal(result.lines[0].costCenterAllocations.reduce((n,a)=>n+a.quantity,0),10);assert.deepEqual(costCenterReadiness(result),[]);
 for(const mutate of [l=>l.costCenterAllocations[0].quantity=3,l=>l.costCenterAllocations[0].quantity=5,l=>l.costCenterAllocations[0].quantity=0,l=>l.costCenterAllocations[0].quantity=4.5,l=>l.costCenterAllocations[0].quantity='4',l=>l.costCenterAllocations[0].costCenterId='XX',l=>l.costCenterAllocations[0].costCenterId='AP',l=>delete l.costCenterAllocations]){
  const invalid=splitLine();mutate(invalid);assert.throws(()=>normalizeCostCenterAllocationInput({costCenterIds:['TN','AP','HR']},[invalid]));
 }
 assert.throws(()=>normalizeCostCenterAllocationInput({costCenterIds:['TN','TN']},[line]),/only once/);
 assert.throws(()=>normalizeCostCenterAllocationInput({costCenterIds:['TN','AP']},[{quantity:10,costCenterAllocations:[{costCenterId:'TN',quantity:7},{costCenterId:'HR',quantity:3}]}]),/unselected/);
});

test('legacy POs acquire no inferred cost centres while explicit single selection assigns exactly',()=>{
 const line={id:'old',quantity:10},legacy={lines:[line],costCenter:'Tamil Nadu',revisions:[]};
 assert.deepEqual(normalizeCostCenterAllocationInput({},[line],legacy),{lines:[line]});assert.deepEqual(costCenterReadiness(legacy),[]);
 const enabled=normalizeCostCenterAllocationInput({costCenterIds:['TN']},[line],legacy,{autoAssignSingle:true});
 assert.deepEqual(enabled.lines[0].costCenterAllocations,[{costCenterId:'TN',quantity:10}]);
 assert.throws(()=>normalizeCostCenterAllocationInput({costCenterIds:['TN','AP']},[line],legacy,{autoAssignSingle:true}),/allocate/);
});

test('cost-centre draft edits preserve omitted fields and reject incomplete replacements atomically',()=>{
 const f=fixture(),payload=draftPayload(f.state,{costCenterIds:['TN','AP','HR']});payload.lines[0].costCenterAllocations=splitLine().costCenterAllocations;
 const id=f.run('CREATE_ORDER',payload).id,o=()=>f.state.orders.find(o=>o.id===id),allocations=structuredClone(o().lines[0].costCenterAllocations);
 f.run('EDIT_DRAFT',{orderId:id,notes:'Unrelated edit'});assert.deepEqual(o().lines[0].costCenterAllocations,allocations);
 const before=structuredClone(f.state),line=structuredClone(o().lines[0]);delete line.costCenterAllocations;
 assert.throws(()=>f.run('EDIT_DRAFT',{orderId:id,lines:[line]}),/allocate/);assert.deepEqual(f.state,before);
 assert.throws(()=>f.run('EDIT_DRAFT',{orderId:id,costCenterIds:[]}),/Select/);assert.deepEqual(f.state,before);
});

test('issued cost-centre snapshots remain unchanged through approved allocation amendments',()=>{
 const f=fixture(),payload=draftPayload(f.state,{costCenterIds:['TN','AP','HR']});payload.lines[0].costCenterAllocations=splitLine().costCenterAllocations;
 const id=f.run('CREATE_ORDER',payload).id,o=()=>f.state.orders.find(o=>o.id===id);
 f.run('SUBMIT_ORDER',{orderId:id});f.run('APPROVE_ORDER',{orderId:id});const first=structuredClone(o().revisions[0]);
 const lines=structuredClone(o().lines);lines[0].costCenterAllocations=[{costCenterId:'TN',quantity:1},{costCenterId:'AP',quantity:2},{costCenterId:'HR',quantity:7}];
 f.run('PROPOSE_AMENDMENT',{orderId:id,reason:'Synthetic revised destination quantities',lines});f.run('APPROVE_AMENDMENT',{orderId:id});
 assert.deepEqual(o().revisions[0],first);assert.deepEqual(o().lines[0].costCenterAllocations,lines[0].costCenterAllocations);assert.deepEqual(o().revisions[1].snapshot.lines[0].costCenterAllocations,lines[0].costCenterAllocations);
});

test('departed destination planning and historical enabled snapshots cannot be downgraded',()=>{
 const f=fixture(),o=f.order();o.costCenterIds=['TN'];for(const line of o.lines)line.costCenterAllocations=[{costCenterId:'TN',quantity:line.quantity}];
 const amendment={lines:structuredClone(o.lines),paymentTerms:structuredClone(o.paymentTerms),costCenterIds:['AP']};for(const line of amendment.lines)line.costCenterAllocations=[{costCenterId:'AP',quantity:line.quantity}];
 assert.ok(amendmentReadiness(f.state,o,amendment).some(g=>/after departure|departed line/.test(g)));
 const historical={lines:[{quantity:10}],revisions:[{snapshot:{costCenterIds:['TN'],lines:[{quantity:10,costCenterAllocations:[{costCenterId:'TN',quantity:10}]}]}}]};
 assert.ok(costCenterReadiness(historical).length);assert.throws(()=>normalizeCostCenterAllocationInput({},historical.lines,historical),/Select/);
});

test('CI saved-view guards reject changed payments, target orders, supplier policy and permissions',()=>{
 for(const change of [s=>s.payments.find(p=>p.allocations.some(a=>a.orderId===s.orders[0].id)).amountMinor++,s=>s.orders[0].notes+=' changed',s=>s.vendors.find(v=>v.id===s.orders[0].vendorId).ciPaymentDefault={rule:'SAILING',days:30},s=>s.users.find(u=>u.id==='u-manager').role='VIEWER']){
  const state=structuredClone(seed),versions=new EditVersions(),token=versions.issue(state,'u-manager'),before=state.revision;change(state);state.revision++;
  for(const type of ['CONFIGURE_CI_PAYMENTS','SAVE_COMMERCIAL_INVOICE','APPROVE_COMMERCIAL_INVOICE','CANCEL_COMMERCIAL_INVOICE'])assert.throws(()=>versions.assert(state,{type,payload:{orderId:state.orders[0].id}},'u-manager',before,token),e=>e.code==='CONFLICT');
 }
 const state=structuredClone(seed),versions=new EditVersions(),token=versions.issue(state,'u-manager'),before=state.revision;state.orders[1].notes+=' independent';state.revision++;
 assert.doesNotThrow(()=>versions.assert(state,{type:'SAVE_COMMERCIAL_INVOICE',payload:{orderId:state.orders[0].id}},'u-manager',before,token));
});

test('persistent CI saves are atomic, replay once and reject stale double advance reservations',()=>{
 const f=fixture();f.configure();const initial=structuredClone(f.state),o=initial.orders.find(o=>o.id===f.id),doc=o.documents.find(d=>d.type==='COMMERCIAL_INVOICE');
 o.documents.push({...structuredClone(doc),id:'second-ci-source',invoiceNumber:'SECOND-RESERVATION-CI'});
 const store=new Store(join(mkdtempSync(join(tmpdir(),'fh-ci-release-')),'test.sqlite'),initial);
 try{
  const state=store.read(),expected=state.revision,token=store.editContext(state,f.manager.id),command={type:'SAVE_COMMERCIAL_INVOICE',payload:{orderId:f.id,documentId:doc.id,amount:'50000',advance:'15000'}};
  const saved=store.transact(command,f.manager.id,expected,'ci-reservation-request-1',token),beforeReplay=store.read();
  const replay=store.transact(command,f.manager.id,expected,'ci-reservation-request-1',token);assert.equal(replay.replayed,true);assert.equal(replay.result.id,saved.result.id);assert.deepEqual(store.read(),beforeReplay);
  const next={type:'SAVE_COMMERCIAL_INVOICE',payload:{orderId:f.id,documentId:'second-ci-source',amount:'10000',advance:'4000'}};
  assert.throws(()=>store.transact(next,f.manager.id,expected,'ci-reservation-request-2',token),e=>e.code==='CONFLICT');assert.deepEqual(store.read(),beforeReplay);
  const current=store.read();assert.throws(()=>store.transact(next,f.manager.id,current.revision,'ci-reservation-request-2',store.editContext(current,f.manager.id)),/unallocated advance/);assert.deepEqual(store.read(),beforeReplay);
  assert.equal(store.requestReceipt(f.manager.id,'ci-reservation-request-2'),undefined);
 }finally{store.close();}
});

test('cancelling an unpaid CI conserves advance and never rewrites or strands a paid CI on replay',()=>{
 const f=fixture();f.configure();const doc=f.order().documents.find(d=>d.type==='COMMERCIAL_INVOICE');
 const first=f.run('SAVE_COMMERCIAL_INVOICE',{documentId:doc.id,amount:'1000',advanceMode:'AUTO'}).id;
 f.order().documents.push({...structuredClone(doc),id:'remaining-advance-ci',invoiceNumber:'REMAINING-ADVANCE-CI'});
 const second=f.run('SAVE_COMMERCIAL_INVOICE',{documentId:'remaining-advance-ci',amount:'50000',advanceMode:'AUTO'}).id;
 f.approve(second);f.authorize(second);f.pay(second,'1000');
 assert.equal(ciAdvanceAvailable(f.state,f.order()),0);
 const store=new Store(join(mkdtempSync(join(tmpdir(),'fh-ci-release-')),'test.sqlite'),f.state);
 try{
  const before=store.read(),o=before.orders.find(o=>o.id===f.id),paidCi=structuredClone(o.commercialInvoices.find(c=>c.id===second));
  const command={type:'CANCEL_COMMERCIAL_INVOICE',payload:{orderId:f.id,ciId:first,reason:'Unpaid invoice correction'}};
  const token=store.editContext(before,f.manager.id);store.transact(command,f.manager.id,before.revision,'cancel-unpaid-ci-request',token);
  const after=store.read(),current=after.orders.find(o=>o.id===f.id),c=current.commercialInvoices.find(c=>c.id===second),b=ciBalance(after,current,c);
  assert.deepEqual(after.payments,before.payments);assert.deepEqual(c,paidCi);assert.equal(ciReadiness(after,current,c).eligible,true);
  assert.equal(ciAdvanceAvailable(after,current),100000);assert.equal(b.advance+b.reported+b.balance,c.amountMinor);
  const reportedAdvance=allocationsFor(after,current.id).filter(a=>!a.ciId&&current.paymentTerms.steps[a.termIndex]?.trigger==='PI').reduce((n,a)=>n+a.expectedMinor,0);
  assert.equal(b.advance+ciAdvanceAvailable(after,current),reportedAdvance);
  const replay=store.transact(command,f.manager.id,before.revision,'cancel-unpaid-ci-request',token);assert.equal(replay.replayed,true);assert.deepEqual(store.read(),after);
 }finally{store.close();}
});

test('supplemental paid-CI evidence appends once without changing its reviewed finances or authorization',()=>{
 const f=fixture();f.configure();const id=f.save();f.approve(id);f.authorize(id);f.pay(id,'1000');f.authorize(id);
 const ci=f.order().commercialInvoices.find(c=>c.id===id),files=[f.evidence(),f.evidence()];
 const store=new Store(join(mkdtempSync(join(tmpdir(),'fh-ci-release-')),'test.sqlite'),f.state);
 try{
  const before=store.read(),o=before.orders.find(o=>o.id===f.id),schedule=paymentSchedule(before,o);
  const command={type:'ATTACH_DOCUMENT',payload:{orderId:f.id,type:'COMMERCIAL_INVOICE',shipmentId:ci.shipmentId,invoiceNumber:ci.number.toLowerCase(),invoiceDate:ci.date,fileIds:files}};
  const token=store.editContext(before,f.manager.id),out=store.transact(command,f.manager.id,before.revision,'supplemental-ci-evidence',token),after=store.read(),current=after.orders.find(o=>o.id===f.id);
  assert.deepEqual(out.result,{id,supplementalEvidence:true});assert.equal(current.documents.length,o.documents.length+2);
  assert.deepEqual(current.documents.slice(0,o.documents.length),o.documents);assert.deepEqual(current.commercialInvoices,o.commercialInvoices);
  assert.deepEqual(current.paymentAuthorizations,o.paymentAuthorizations);assert.deepEqual(paymentSchedule(after,current),schedule);assert.deepEqual(after.payments,before.payments);assert.deepEqual(current.shipments,o.shipments);assert.deepEqual(current.revisions,o.revisions);
  assert.deepEqual(after.events.slice(0,before.events.length),before.events);assert.equal(after.events.at(-1).action,'DOCUMENT_ADDED');
  assert.equal(store.transact(command,f.manager.id,before.revision,'supplemental-ci-evidence',token).replayed,true);assert.deepEqual(store.read(),after);
 }finally{store.close();}
});

test('supplemental evidence cannot change invoice dates or settlement values or bypass new CI entry',()=>{
 const f=fixture();f.configure();const id=f.save();f.approve(id);const ci=f.order().commercialInvoices.find(c=>c.id===id),fileId=f.evidence();
 const base={type:'COMMERCIAL_INVOICE',shipmentId:ci.shipmentId,invoiceNumber:ci.number,invoiceDate:ci.date,fileId};
 for(const extra of [{invoiceDate:'2026-10-14'},{ciSettlement:{amount:'1'}},{invoiceNumber:'NEW-CI-NEEDS-SETTLEMENT'}]){
  const before=structuredClone(f.state);assert.throws(()=>f.run('ATTACH_DOCUMENT',{...base,...extra}),/recorded invoice date|already has a settlement|total and balance payment terms/);assert.deepEqual(f.state,before);
 }
 const before=structuredClone(f.state);assert.throws(()=>f.run('ATTACH_DOCUMENT',base,{...f.manager,role:'VIEWER'}),e=>e.code==='FORBIDDEN');assert.deepEqual(f.state,before);
});
