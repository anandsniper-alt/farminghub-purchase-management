import test from 'node:test';
import assert from 'node:assert/strict';
import {createSeed} from '../shared/seed.mjs';
import {execute,TERMS,orderTotal,major,paymentSchedule,financials,shipmentTotals,amendmentReadiness,residualSettlementStatus,isBusinessOrder,canEdit,canPerformApproval} from '../shared/domain.mjs';
import {approvalReviewModal,approvalReviewCommand} from '../web/approval-review.mjs';
import {EditVersions} from '../server/concurrency.mjs';

const DAY='2026-10-12',seed=createSeed(DAY);
const typed={name:'USD 3,000 advance and BL balance',steps:[{name:'Advance',type:'FIXED',amount:'3000',currency:'USD',trigger:'PI',days:0},{name:'Against BL',type:'BALANCE',trigger:'BL',days:60}]};
function fixture(terms=typed){
 let state=structuredClone(seed),sequence=0;
 state={...state,orders:[],payments:[],files:[],events:[],costs:[],imports:[],revision:0};
 const role=r=>state.users.find(u=>u.role===r),get=id=>state.orders.find(o=>o.id===id);
 const run=(type,payload={},user=role('MANAGER'))=>{const out=execute(state,{type,payload},user,{now:DAY+'T10:00:00.000Z',id:()=>`audit-finance-${++sequence}`});state=out.state;return out.result;};
 const file=ids=>{const id=`evidence-${++sequence}`;state.files.push({id,name:'Supplier confirmation.txt',orderIds:ids,scope:'LAE_IMPORT',mime:'text/plain',size:4});return id;};
 const item=state.items.find(i=>i.code==='GJPW12'),base=state.bases.find(b=>b.id===item.baseId);
 const draft=(extra={})=>run('CREATE_ORDER',{vendorId:base.vendorId,buyerId:role('EXECUTIVE').id,currency:'USD',priceListCurrency:'USD',paymentTerms:terms,productionDays:30,productionOverrideReason:'Supplier agreement',planningTat:60,routeId:state.routes[0].id,requestedPortDate:'2026-12-31',lines:[{itemId:item.id,quantity:100,unitPrice:'100',specId:base.specifications[0].id}],...extra}).id;
 const issue=(extra={})=>{const id=draft(extra);run('SUBMIT_ORDER',{orderId:id});run('APPROVE_ORDER',{orderId:id});return id;};
 const pi=id=>{run('CONFIRM_SUPPLIER',{orderId:id,channel:'EMAIL',remarks:'Current PO confirmed',fileId:file([id])});run('RECORD_PI',{orderId:id,number:`PI-${++sequence}`,date:DAY,currency:'USD',amount:major(orderTotal(get(id))),quantity:shipmentTotals(get(id)).required,termsConfirmed:true,commitmentConfirmed:true,fileId:file([id])});run('VERIFY_PI',{orderId:id});run('APPROVE_PI',{orderId:id});};
 const commercial=id=>{pi(id);run('CONFIRM_TECHNICAL',{orderId:id,channel:'EMAIL',remarks:'Technical package confirmed',fileId:file([id])});run('SUBMIT_ARTWORK',{orderId:id,remarks:'Supplier artwork',fileId:file([id])});run('APPROVE_ARTWORK',{orderId:id},role('PRODUCT_MANAGER'));run('CONFIRM_ARTWORK',{orderId:id,remarks:'Artwork accepted',fileId:file([id])});};
 const payload=(id,index,shipmentId,amount,extra={})=>({reference:`BANK-${++sequence}`,date:DAY,currency:'USD',amount,inrRate:'85',fileId:file([id]),allocations:[{orderId:id,termIndex:index,shipmentId,amount,invoiceRate:'1'}],...extra});
 const pay=(id,index=0,shipmentId=null)=>{run('AUTHORIZE_PAYMENT',{orderId:id,termIndex:index,shipmentId});const m=paymentSchedule(state,get(id)).find(m=>m.index===index&&m.shipmentId===shipmentId);return run('RECORD_PAYMENT',payload(id,index,shipmentId,major(m.amount))).id;};
 const receipt=(paymentId,amount)=>{const p=state.payments.find(x=>x.id===paymentId),a=p.allocations[0];run('ACKNOWLEDGE_PAYMENT',{paymentId,allocationId:a.id,realizedAmount:amount,supplierRate:'1',fileId:file([a.orderId]),remarks:'Supplier actual receipt'});};
 const produce=id=>{commercial(id);for(const m of paymentSchedule(state,get(id)).filter(m=>m.trigger==='PI')){const payment=pay(id,m.index);receipt(payment,major(m.amount));}run('RECORD_PREPRODUCTION_SAMPLE',{orderId:id,remarks:'Sample complete'});run('APPROVE_PREPRODUCTION_SAMPLE',{orderId:id,result:'APPROVED',remarks:'Sample approved'});run('START_PRODUCTION',{orderId:id,date:DAY,remarks:'Production started'});run('RECORD_BULK_QC',{orderId:id,result:'PASS',remarks:'QC passed'});run('COMPLETE_PRODUCTION',{orderId:id,date:DAY,remarks:'Production complete'});};
 const shipment=(id,quantity=100)=>run('ADD_SHIPMENT',{orderId:id,number:`Shipment-${++sequence}`,containerType:'40HC',origin:'NINGBO',destination:'CHENNAI',etd:DAY,eta:'2026-10-30',lines:[{lineId:get(id).lines[0].id,quantity}]}).id;
 const ready=(id,sid)=>{run('BOOK_CONTAINER',{orderId:id,shipmentId:sid,forwarderId:state.vendors.find(v=>v.kind==='LOGISTICS'&&v.status==='ACTIVE').id,forwarderRef:`FWD-${++sequence}`,date:DAY,freightUsd:'100',remarks:'Booked'});run('RELEASE_CONTAINER',{orderId:id,shipmentId:sid,container:`CONT${++sequence}`,date:DAY,remarks:'Released'});for(const type of ['COMMERCIAL_INVOICE','PACKING_LIST'])run('ATTACH_DOCUMENT',{orderId:id,shipmentId:sid,type,invoiceNumber:`CI-${++sequence}`,invoiceDate:DAY,fileId:file([id])});for(const m of paymentSchedule(state,get(id)).filter(m=>m.trigger==='SHIPMENT'&&m.shipmentId===sid)){const pid=pay(id,m.index,sid);receipt(pid,major(m.amount));}};
 const dispatch=(id,sid)=>run('DISPATCH_SHIPMENT',{orderId:id,shipmentId:sid,date:DAY,vessel:'VESSEL',voyage:'VOYAGE',remarks:'Loaded'});
 const bl=(id,sid)=>run('RECORD_BL',{orderId:id,shipmentId:sid,number:`BL-${++sequence}`,date:DAY,fileId:file([id]),remarks:'Final verified BL'});
 const settled=(realized='6999')=>{const id=issue();produce(id);const sid=shipment(id);ready(id,sid);dispatch(id,sid);bl(id,sid);const pid=pay(id,terms.steps.length-1,sid);receipt(pid,realized);return {id,sid,pid};};
 return {get state(){return state;},set state(s){state=s;},role,get,run,file,draft,issue,pi,commercial,payload,pay,receipt,produce,shipment,ready,dispatch,bl,settled};
}
function rejects(f,type,payload,pattern,user){const before=structuredClone(f.state);assert.throws(()=>f.run(type,payload,user),pattern);assert.deepEqual(f.state,before,'Rejected command must leave the entire caller state unchanged');}
const reviewHelpers={esc:s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'),kv:(a,b)=>`<dt>${a}</dt><dd>${b}</dd>`,field:()=>'',checkbox:()=>'',note:(s)=>`<p>${s}</p>`,button:s=>`<button>${s}</button>`};

test('AUD-01: approval rejects a reduction after a new shipment allocation without changing history',()=>{
 const f=fixture(TERMS.find(t=>t.id==='credit60')),id=f.issue();f.produce(id);const original=structuredClone(f.get(id).revisions);
 f.run('PROPOSE_AMENDMENT',{orderId:id,reason:'Reduce open demand',lines:[{...f.get(id).lines[0],quantity:50}]});f.shipment(id);
 rejects(f,'APPROVE_AMENDMENT',{orderId:id},/quantity cannot be below shipment allocations/);
 assert.deepEqual(f.get(id).revisions,original);assert.equal(orderTotal(f.get(id)),1000000);assert.equal(paymentSchedule(f.state,f.get(id)).reduce((n,m)=>n+m.amount,0),1000000);
 const review=approvalReviewModal(f.state,{id,approvalAction:'approve-amendment'},reviewHelpers);assert.match(review.body,/100 reserved; 50 proposed/);
});

test('AUD-01: departed artwork and changed payment terms are rechecked at approval',()=>{
 const f=fixture(TERMS[0]),id=f.issue();f.produce(id);const sid=f.shipment(id);f.ready(id,sid);
 f.run('PROPOSE_AMENDMENT',{orderId:id,reason:'Different packaging',lines:[{...f.get(id).lines[0],artworkNotes:'NEW CARTON'}]});f.dispatch(id,sid);
 rejects(f,'APPROVE_AMENDMENT',{orderId:id},/departed line cannot be changed/);
 const g=fixture(TERMS[0]),gid=g.issue();g.produce(gid);const gs=g.shipment(gid);g.ready(gid,gs);
 const terms=structuredClone(TERMS[0]);terms.steps[1].days=60;
 g.run('PROPOSE_AMENDMENT',{orderId:gid,reason:'Later payment date',paymentTerms:terms});g.dispatch(gid,gs);
 rejects(g,'APPROVE_AMENDMENT',{orderId:gid},/payment terms after departure/);
});

test('AUD-01: a payment recorded after proposal blocks shrinking its legacy obligation',()=>{
 const f=fixture(TERMS[0]),id=f.issue();f.commercial(id);
 f.run('PROPOSE_AMENDMENT',{orderId:id,reason:'Reduce demand',lines:[{...f.get(id).lines[0],quantity:50}]});f.pay(id);
 rejects(f,'APPROVE_AMENDMENT',{orderId:id},/already recorded or realized payment/);
 assert.equal(f.get(id).lines[0].quantity,100);assert.equal(financials(f.state,f.get(id)).reported,300000);
});

test('AUD-01: non-conflicting amendment preserves old issue and exact revised obligations',()=>{
 const f=fixture(TERMS.find(t=>t.id==='credit60')),id=f.issue();f.produce(id);const original=structuredClone(f.get(id).revisions[0]);
 f.run('PROPOSE_AMENDMENT',{orderId:id,reason:'Lower open quantity',lines:[{...f.get(id).lines[0],quantity:50}]});f.shipment(id,40);f.run('APPROVE_AMENDMENT',{orderId:id});
 assert.deepEqual(f.get(id).revisions[0],original);assert.equal(f.get(id).revision,1);assert.equal(orderTotal(f.get(id)),500000);assert.equal(paymentSchedule(f.state,f.get(id)).reduce((n,m)=>n+m.amount,0),500000);assert.equal(f.get(id).pi.status,'REVERIFY');
});

test('AUD-01: a blocked proposal can be returned with authority and reason, retaining its full audit trail',()=>{
 const f=fixture(TERMS.find(t=>t.id==='credit60')),id=f.issue();f.produce(id);
 f.run('PROPOSE_AMENDMENT',{orderId:id,reason:'Reduce demand',lines:[{...f.get(id).lines[0],quantity:50}]});f.shipment(id);const proposal=structuredClone(f.get(id).amendment),history=structuredClone(f.get(id).revisions);
 rejects(f,'RETURN_AMENDMENT',{orderId:id,remarks:'New reservation'},/approval access/,f.role('EXECUTIVE'));
 rejects(f,'RETURN_AMENDMENT',{orderId:id,remarks:''},/reason/);
 const fields=[];approvalReviewModal(f.state,{id,approvalAction:'approve-amendment'},{...reviewHelpers,field:(name,...rest)=>{fields.push({name,args:rest});return '';}});
 const decisions=fields.find(f=>f.name==='decision').args.at(-1).options;assert.ok(decisions.some(o=>o.value==='RETURN'));assert.ok(!decisions.some(o=>o.value==='APPROVE'));
 const form=new Map([['reviewConfirmed','on'],['decision','RETURN'],['remarks','Reservation now covers the whole PO']]);
 assert.deepEqual(approvalReviewCommand({id,approvalAction:'approve-amendment'},form),{type:'RETURN_AMENDMENT',payload:{orderId:id,remarks:'Reservation now covers the whole PO'}});
 f.run('RETURN_AMENDMENT',{orderId:id,remarks:'Reservation now covers the whole PO'});assert.equal(f.get(id).amendment,null);assert.deepEqual(f.get(id).revisions,history);assert.deepEqual(f.state.events.at(-1).oldValue,proposal);
 f.run('PROPOSE_AMENDMENT',{orderId:id,reason:'Update unshipped packaging',lines:[{...f.get(id).lines[0],artworkNotes:'Revised packaging'}]});f.run('APPROVE_AMENDMENT',{orderId:id});assert.equal(f.get(id).revision,1);
});

test('AUD-01: unchanged PO total cannot conceal reduced obligations on a paid shipment',()=>{
 const terms=structuredClone(TERMS[0]);terms.steps[1].trigger='SHIPMENT';
 const f=fixture(terms),item=f.state.items.find(i=>i.code==='GJPW12'),secondItem=f.state.items.find(i=>i.id!==item.id&&i.baseId===item.baseId),base=f.state.bases.find(b=>b.id===item.baseId);
 assert.ok(secondItem,'Fixture needs two valid brand SKUs from the same supplier');
 const id=f.issue({lines:[item,secondItem].map(i=>({itemId:i.id,quantity:50,unitPrice:'100',specId:base.specifications[0].id}))});f.produce(id);const sid=f.shipment(id,50);f.ready(id,sid);
 const o=f.get(id),[first,second]=o.lines;
 // A price increase on the second line offsets the paid shipment line decrease.
 const proposed={...o,lines:[{...first,unitPriceMinor:5000},{...second,unitPriceMinor:15000}]};assert.equal(orderTotal(proposed),orderTotal(o));
 const gaps=amendmentReadiness(f.state,o,{lines:proposed.lines,paymentTerms:o.paymentTerms});assert.ok(gaps.some(g=>/already recorded or realized/.test(g)));
 rejects(f,'PROPOSE_AMENDMENT',{orderId:id,reason:'Offsetting line price changes',lines:proposed.lines},/already recorded or realized/);
});

for(const [name,terms]of [['legacy',TERMS[0]],['typed',typed]])test(`AUD-02: ${name} dispatch requires the approved matching current PI`,()=>{
 const f=fixture(terms),id=f.issue();f.produce(id);const sid=f.shipment(id);f.ready(id,sid);const oldPi=structuredClone(f.get(id).pi),auth=structuredClone(f.get(id).paymentAuthorizations);
 f.run('RECORD_PI',{orderId:id,number:'REPLACED-PI',date:DAY,currency:'USD',amount:'9999',quantity:99,termsConfirmed:true,commitmentConfirmed:true,fileId:f.file([id])});
 rejects(f,'DISPATCH_SHIPMENT',{orderId:id,shipmentId:sid,date:DAY,vessel:'VESSEL',voyage:'V001'},/matching PI/);
 assert.deepEqual(f.get(id).piHistory.at(-1),oldPi);assert.equal(f.get(id).paymentAuthorizations.length,auth.length);assert.ok(f.get(id).paymentAuthorizations.every(a=>a.revokedAt));
 rejects(f,'VERIFY_PI',{orderId:id},/differs/);f.pi(id);f.dispatch(id,sid);assert.equal(f.get(id).shipments[0].actualDeparture,DAY);
});

test('AUD-02: an approved PI with stale revision or mismatched quantity is still rejected',()=>{
 const f=fixture(),id=f.issue();f.produce(id);const sid=f.shipment(id);f.ready(id,sid);
 for(const patch of [{revision:99},{quantity:99},{amountMinor:999999},{currency:'CNY'},{termsConfirmed:false}]){const before=structuredClone(f.state);Object.assign(f.get(id).pi,patch);rejects(f,'DISPATCH_SHIPMENT',{orderId:id,shipmentId:sid,date:DAY},/matching PI/);f.state=before;}
});

test('AUD-11: authorized USD 1 residual settles actual shortfall without rewriting previous payments',()=>{
 const f=fixture(),{id,sid}=f.settled(),before=structuredClone(f.state.payments),oldIssue=structuredClone(f.get(id).revisions);
 assert.deepEqual(financials(f.state,f.get(id)),{total:1000000,reported:1000000,realized:999900,balance:100,pending:0,status:'PARTIALLY PAID'});
 const status=residualSettlementStatus(f.state,f.get(id));assert.equal(status.eligible,true);assert.equal(status.availableMinor,100);
 const topup=f.run('RECORD_PAYMENT',f.payload(id,1,sid,'1',{residualSettlement:true,settlementReason:'Supplier deducted bank fee'})).id;
 assert.deepEqual(f.state.payments.slice(0,before.length),before);assert.deepEqual(f.get(id).revisions,oldIssue);assert.equal(f.state.events.at(-1).action,'RESIDUAL_PAYMENT_REPORTED');
 assert.equal(residualSettlementStatus(f.state,f.get(id)).eligible,false);f.receipt(topup,'1');
 assert.deepEqual(financials(f.state,f.get(id)),{total:1000000,reported:1000100,realized:1000000,balance:0,pending:0,status:'SETTLED'});assert.equal(residualSettlementStatus(f.state,f.get(id)).availableMinor,0);
});

test('AUD-11: residual rejects unauthorized, missing reason, zero, over-cap and duplicate attempts',()=>{
 const f=fixture(),{id,sid}=f.settled(),p=f.payload(id,1,sid,'1',{residualSettlement:true,settlementReason:'Bank fee'});
 rejects(f,'RECORD_PAYMENT',p,/authorization access/,f.role('EXECUTIVE'));
 rejects(f,'RECORD_PAYMENT',{...p,settlementReason:''},/reason/);
 rejects(f,'RECORD_PAYMENT',{...p,amount:'0',allocations:[{...p.allocations[0],amount:'0'}]},/positive/);
 rejects(f,'RECORD_PAYMENT',{...p,amount:'1.01',allocations:[{...p.allocations[0],amount:'1.01'}]},/shortfall/);
 rejects(f,'RECORD_PAYMENT',{...p,residualSettlement:false},/outstanding/);
 const topup=f.run('RECORD_PAYMENT',p).id;
 rejects(f,'RECORD_PAYMENT',{...p,reference:'SECOND-TRANSFER'},/pending payment/);
 rejects(f,'RECORD_PAYMENT',p,/reference|already recorded/i);f.receipt(topup,'1');
 rejects(f,'RECORD_PAYMENT',{...p,reference:'THIRD-TRANSFER'},/no remaining supplier shortfall/);
});

test('AUD-11: fixed-point currency conversion cannot round past a one-dollar cap',()=>{
 const f=fixture(),{id,sid}=f.settled();
 const p=f.payload(id,1,sid,'0.67',{currency:'CNY',residualSettlement:true,settlementReason:'Cross-currency fee settlement'});p.allocations[0].invoiceRate='1.5';
 // 67 minor CNY * 1.5 = 100.5 minor USD -> 101 minor, above the 100-minor cap.
 rejects(f,'RECORD_PAYMENT',p,/shortfall/);
 p.amount='0.66';p.allocations[0].amount='0.66';const paid=f.run('RECORD_PAYMENT',p).id;assert.equal(f.state.payments.at(-1).allocations[0].expectedMinor,99);f.receipt(paid,'0.99');
 assert.equal(residualSettlementStatus(f.state,f.get(id)).availableMinor,1);const last=f.run('RECORD_PAYMENT',f.payload(id,1,sid,'0.01',{residualSettlement:true,settlementReason:'Final cent'})).id;f.receipt(last,'0.01');assert.equal(financials(f.state,f.get(id)).balance,0);
});

test('AUD-11: one remittance can settle two original orders without sharing their caps',()=>{
 const f=fixture(),a=f.settled(),b=f.settled(),p=f.payload(a.id,1,a.sid,'2',{fileId:f.file([a.id,b.id]),residualSettlement:true,settlementReason:'Separately acknowledged supplier fees'});
 p.allocations=[{orderId:a.id,termIndex:1,shipmentId:a.sid,amount:'1',invoiceRate:'1'},{orderId:b.id,termIndex:1,shipmentId:b.sid,amount:'1',invoiceRate:'1'}];
 const over=structuredClone(p);over.allocations[0].amount='1.01';over.allocations[1].amount='0.99';rejects(f,'RECORD_PAYMENT',over,/shortfall/);
 f.run('RECORD_PAYMENT',p);assert.equal(f.state.payments.at(-1).allocations.length,2);assert.equal(residualSettlementStatus(f.state,f.get(a.id)).eligible,false);assert.equal(residualSettlementStatus(f.state,f.get(b.id)).eligible,false);
});

test('AUD-11: allocations to multiple milestones share the current order cap',()=>{
 const terms={name:'Three stages',steps:[{name:'Advance',type:'FIXED',amount:'1000',currency:'USD',trigger:'PI',days:0},{name:'Loading',type:'FIXED',amount:'2000',currency:'USD',trigger:'SHIPMENT',days:0},{name:'BL balance',type:'BALANCE',trigger:'BL',days:0}]};
 const f=fixture(terms),{id,sid}=f.settled('7001'),payments=f.state.payments.filter(p=>p.allocations[0].orderId===id);
 f.receipt(payments[0].id,'999');f.receipt(payments[1].id,'1999');assert.equal(financials(f.state,f.get(id)).balance,100);
 const p=f.payload(id,0,null,'2',{residualSettlement:true,settlementReason:'Two shortfalls, net of BL excess'});p.allocations=[{orderId:id,termIndex:0,shipmentId:null,amount:'1'},{orderId:id,termIndex:1,shipmentId:sid,amount:'1'}];
 rejects(f,'RECORD_PAYMENT',p,/shortfall/);p.amount='1';p.allocations.forEach(a=>a.amount='0.50');f.run('RECORD_PAYMENT',p);assert.equal(f.state.payments.at(-1).amountMinor,100);
});

test('AUD-11: pending acknowledgements and remaining original obligations prevent settlement',()=>{
 const f=fixture(),id=f.issue();f.produce(id);const sid=f.shipment(id);f.ready(id,sid);f.dispatch(id,sid);f.bl(id,sid);f.run('AUTHORIZE_PAYMENT',{orderId:id,termIndex:1,shipmentId:sid});
 const p=f.payload(id,1,sid,'1',{residualSettlement:true,settlementReason:'Too early'});rejects(f,'RECORD_PAYMENT',p,/all original payment obligations/);
 const normal=f.run('RECORD_PAYMENT',f.payload(id,1,sid,'7000')).id;rejects(f,'RECORD_PAYMENT',p,/pending payment/);f.receipt(normal,'7000');rejects(f,'RECORD_PAYMENT',p,/no remaining supplier shortfall/);
});

test('AUD-11: concurrent settlement invalidates the other saved payment view and current approval controls remain authoritative',()=>{
 const f=fixture(),{id,sid}=f.settled(),p=f.payload(id,1,sid,'1',{residualSettlement:true,settlementReason:'Acknowledged bank fee'}),actor=f.role('MANAGER'),versions=new EditVersions(),revision=f.state.revision,context=versions.issue(f.state,actor.id);
 f.state.approvalControls={revision:1,stages:{AUTHORIZE_PAYMENT:[]}};
 rejects(f,'RECORD_PAYMENT',p,/authorization access/);
 delete f.state.approvalControls;f.run('RECORD_PAYMENT',p);
 const other={type:'RECORD_PAYMENT',payload:{...p,reference:'OTHER-STAFF-SETTLEMENT'}};
 assert.throws(()=>versions.assert(f.state,other,actor.id,revision,context),/changed/);
 rejects(f,other.type,other.payload,/pending payment/);
});

test('AUD-12: review shows escaped current and proposed artwork and proposed technical evidence',()=>{
 const f=fixture(),id=f.issue(),l=f.get(id).lines[0],newNotes='PROPOSED <carton> & label requirement';
 f.run('PROPOSE_AMENDMENT',{orderId:id,reason:'Review new artwork',lines:[{...l,artworkNotes:newNotes}]});
 const review=approvalReviewModal(f.state,{id,approvalAction:'approve-amendment'},reviewHelpers);
 assert.match(review.body,/Current brand \/ artwork requirements/);assert.match(review.body,/PROPOSED &lt;carton&gt; &amp; label requirement/);assert.match(review.body,/Proposed technical specification/);assert.ok(review.body.includes(reviewHelpers.esc(l.artworkNotes)));assert.match(review.body,/<details open>/);assert.doesNotMatch(review.body,/<carton>/);
});

for(const [name,terms]of [['legacy',TERMS[0]],['typed',typed]])test(`POL-01: ${name} against-BL authorization/payment wait for final BL and reject backdating`,()=>{
 const f=fixture(terms),id=f.issue();f.produce(id);const sid=f.shipment(id);f.ready(id,sid);const p=f.payload(id,1,sid,'7000');
 rejects(f,'AUTHORIZE_PAYMENT',{orderId:id,termIndex:1,shipmentId:sid},/Record the final BL/);
 // Preserve a historical authorization: recording must independently enforce the new policy.
 f.get(id).paymentAuthorizations.push({termIndex:1,shipmentId:sid,revision:f.get(id).revision,at:DAY,by:'Historical manager'});
 rejects(f,'RECORD_PAYMENT',p,/Record the final BL/);f.dispatch(id,sid);f.bl(id,sid);
 rejects(f,'RECORD_PAYMENT',{...p,date:'2026-10-11'},/before the final BL date/);
 f.run('RECORD_PAYMENT',p);assert.equal(paymentSchedule(f.state,f.get(id)).find(m=>m.index===1).reported,700000);
});

test('AUD-22: explicit Admin classification excludes only test data and preserves actual history and serial continuity',()=>{
 const f=fixture(),{id}=f.settled(),other=f.issue(),admin=f.role('ADMIN');f.run('DELETE_ORDERS',{orderIds:[id,other],remarks:'Retained historical entries'},admin);
 const before=structuredClone(f.state),finance=financials(f.state,f.get(id)),serial=f.get(id).serialNumber;
 rejects(f,'MARK_ORDER_TEST_DATA',{orderId:id,reason:'Confirmed test transaction'},/Administrator/,f.role('MANAGER'));
 rejects(f,'MARK_ORDER_TEST_DATA',{orderId:id,reason:''},/reason/,admin);
 f.run('MARK_ORDER_TEST_DATA',{orderId:id,reason:'Confirmed sample order'},admin);
 assert.equal(isBusinessOrder(f.get(id)),false);assert.equal(isBusinessOrder(f.get(other)),true);assert.deepEqual(financials(f.state,f.get(id)),finance);
 assert.deepEqual(f.state.payments,before.payments);assert.deepEqual(f.get(id).revisions,before.orders.find(o=>o.id===id).revisions);assert.deepEqual(f.get(id).shipments,before.orders.find(o=>o.id===id).shipments);assert.deepEqual(f.state.events.slice(0,before.events.length),before.events);assert.equal(f.state.events.at(-1).action,'ORDER_MARKED_TEST_DATA');assert.equal(f.get(id).serialNumber,serial);
 assert.equal(canEdit(admin,f.get(id)),false);assert.equal(canPerformApproval(admin,'APPROVE_AMENDMENT','LAE_IMPORT',null,f.state,f.get(id)),false);
 rejects(f,'RESTORE_ORDERS',{orderIds:[id],remarks:'Attempt restore'},/test data.*read-only/,admin);rejects(f,'MARK_ORDER_TEST_DATA',{orderId:id,reason:'Again'},/already classified/,admin);
 const next=f.issue();assert.ok(f.get(next).serialNumber>f.get(other).serialNumber);assert.notEqual(f.get(next).serialNumber,serial);
});

test('AUD-22: active classified orders reject further operational and financial changes',()=>{
 const f=fixture(),{id,pid}=f.settled(),admin=f.role('ADMIN');f.run('MARK_ORDER_TEST_DATA',{orderId:id,reason:'Controlled synthetic test'},admin);
 rejects(f,'ADD_NOTE',{orderId:id,remarks:'Unintended business update'},/test data.*read-only/,admin);
 rejects(f,'VOID_PAYMENT',{paymentId:pid,remarks:'Unintended correction'},/test data.*read-only/,admin);
 rejects(f,'DELETE_ORDERS',{orderIds:[id],remarks:'Unintended update'},/test data.*read-only/,admin);
 assert.equal(residualSettlementStatus(f.state,f.get(id)).eligible,false);
});
