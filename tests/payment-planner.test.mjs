import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {reviewBundle} from '../scripts/review-bundle.mjs';
import {createSeed} from '../shared/seed.mjs';
import {execute,paymentSchedule,orderTotal} from '../shared/domain.mjs';
import {paymentPlanner,paymentPlannerMonths,paymentPlannerMilestoneKey,paymentPlannerDateKey} from '../shared/payment-planner.mjs';

function fixture(){
 let state=createSeed('2026-10-24'),seq=0;
 const selected=state.orders.find(o=>o.pi?.status==='APPROVED'&&o.artwork.current),id=selected.id;
 state.orders=[selected];state.payments=[];
 selected.status='ISSUED';selected.lines=[{...selected.lines[0],quantity:1,unitPriceMinor:10000}];selected.shipments=[];selected.paymentAuthorizations=[];
 selected.paymentTerms={name:'Full advance',steps:[{name:'Advance',percent:100,trigger:'PI',days:0}]};
 selected.pi={...selected.pi,revision:selected.revision,amountMinor:10000,quantity:1,currency:'USD',approvedAt:'2026-10-01T09:00:00Z',termsConfirmed:true,commitmentConfirmed:true};selected.currency='USD';
 selected.confirmation={revision:selected.revision};selected.technicalConfirmation={revision:selected.revision};selected.artwork.pending=null;selected.artwork.supplierConfirmed={artworkId:selected.artwork.current.id};
 const user=state.users.find(u=>u.role==='MANAGER'),file=state.files.find(f=>f.orderIds.includes(id));
 const run=(type,payload={},actor=user)=>{const out=execute(state,{type,payload:{...(type==='SAVE_PAYMENT_PLAN_RATE'?{}:{orderId:id}),...payload}},actor,{now:'2026-10-24T09:00:00Z',id:()=>`planner-${++seq}`});state=out.state;return out.result;};
 const plan=()=>paymentPlanner(state,user,{asOf:'2026-10-24'});
 const pay=(amount='40')=>{if(!paymentSchedule(state,state.orders[0])[0].authorized)run('AUTHORIZE_PAYMENT',{termIndex:0});return run('RECORD_PAYMENT',{reference:`PLAN-${++seq}`,date:'2026-10-24',currency:'USD',amount,inrRate:'85',fileId:file.id,allocations:[{orderId:id,termIndex:0,amount}]});};
 return {get state(){return state;},get o(){return state.orders[0];},user,file,run,pay,plan};
}

test('future bank cash subtracts reported payment, not supplier realization; VOID restores it',()=>{
 const f=fixture(),payment=f.pay(),allocation=f.state.payments[0].allocations[0];
 let row=f.plan().rows[0];assert.equal(row.futureMinor,6000);assert.equal(row.reportedMinor,4000);assert.equal(row.realizedMinor,0);assert.equal(row.awaitingAcknowledgementMinor,4000);
 f.run('ACKNOWLEDGE_PAYMENT',{paymentId:payment.id,allocationId:allocation.id,realizedAmount:'39',supplierRate:'1',fileId:f.file.id});
 row=f.plan().rows[0];assert.equal(row.futureMinor,6000);assert.equal(row.awaitingAcknowledgementMinor,0);assert.equal(row.acknowledgementDifferenceMinor,100);
 f.run('VOID_PAYMENT',{paymentId:payment.id,remarks:'Synthetic correction'});
 row=f.plan().rows[0];assert.equal(row.futureMinor,10000);assert.equal(row.reportedMinor,0);assert.equal(row.acknowledgementDifferenceMinor,0);assert.equal(f.state.payments[0].status,'VOID');
});

test('full reported remittance awaiting acknowledgement creates no duplicate future cash',()=>{
 const f=fixture();f.pay('100');const row=f.plan().rows[0];assert.equal(row.futureMinor,0);assert.equal(row.awaitingAcknowledgementMinor,10000);assert.equal(row.status,'AWAITING_ACKNOWLEDGEMENT');assert.equal(f.plan().months.length,0);
});

test('USD monthly estimates round aggregate minor units exactly; currencies remain separate',()=>{
 const rows=[{month:'2026-11',currency:'USD',futureMinor:1},{month:'2026-11',currency:'USD',futureMinor:1},{month:'2026-11',currency:'CNY',futureMinor:100},{month:'2026-11',currency:'INR',futureMinor:101}];
 const groups=paymentPlannerMonths(rows,{'2026-11':{rate:85250000,remarks:'Treasury estimate'}});
 assert.equal(groups.find(r=>r.currency==='USD').estimatedInrMinor,171);assert.equal(groups.find(r=>r.currency==='USD').amountMinor,2);assert.equal(groups.find(r=>r.currency==='CNY').estimatedInrMinor,null);assert.equal(groups.find(r=>r.currency==='INR').estimatedInrMinor,101);
 assert.equal(paymentPlannerMonths(rows)[2].missingRate,true);
 const overflow=paymentPlannerMonths([{month:'2026-11',currency:'USD',futureMinor:Number.MAX_SAFE_INTEGER}],{'2026-11':{rate:Number.MAX_SAFE_INTEGER}})[0];assert.equal(overflow.estimatedInrMinor,null);assert.match(overflow.conversionError,/too large/);
});

test('planning rate validates exact precision and is audited without changing actual payments',()=>{
 const f=fixture(),before=structuredClone(f.state.payments);
 f.run('SAVE_PAYMENT_PLAN_RATE',{month:'2026-11',rate:'85.123456',remarks:'Treasury planning estimate'});
 assert.equal(f.state.settings.paymentPlanner.rates['2026-11'].rate,85123456);assert.equal(f.state.events.at(-1).action,'PAYMENT_PLAN_RATE_SAVED');assert.equal(f.state.events.at(-1).actorId,f.user.id);assert.deepEqual(f.state.payments,before);
 for(const [month,rate] of [['2026-13','85'],['2026-1','85'],['0000-01','85'],['__proto__','85'],['2026-11','0'],['2026-11','-1'],['2026-11','1.1234567'],['2026-11','Infinity']])assert.throws(()=>f.run('SAVE_PAYMENT_PLAN_RATE',{month,rate,remarks:'Planning estimate'}));
 assert.throws(()=>f.run('SAVE_PAYMENT_PLAN_RATE',{month:'2026-11',rate:'85',remarks:'x'}),/meaningful/);
});

test('planned date is independent from contractual due and cannot authorize a blocked BL payment',()=>{
 const f=fixture();f.o.paymentTerms={name:'Against BL',steps:[{name:'Against BL',percent:100,trigger:'BL',days:30}]};
 f.o.shipments=[{id:'shipment',number:'Shipment 1',status:'PLANNED',lines:[{lineId:f.o.lines[0].id,quantity:1}],etd:'2026-11-01'}];
 const key=f.plan().rows[0].milestoneKey,authorizations=structuredClone(f.o.paymentAuthorizations);
 f.run('SAVE_PAYMENT_PLAN_DATE',{milestoneKey:key,date:'2026-11-15',remarks:'Treasury funds planning'});
 const row=f.plan().rows[0];assert.equal(row.dueDate,null);assert.equal(row.plannedDate,'2026-11-15');assert.equal(row.effectiveDate,'2026-11-15');assert.equal(row.ready,false);assert.equal(row.authorized,false);assert.match(row.blockers.join(' '),/final BL/);assert.deepEqual(f.o.paymentAuthorizations,authorizations);
 assert.throws(()=>f.run('AUTHORIZE_PAYMENT',{termIndex:0,shipmentId:'shipment'}),/final BL/);
 f.run('SAVE_PAYMENT_PLAN_DATE',{milestoneKey:key,date:'',remarks:'Restore contract schedule'});assert.equal(f.plan().rows[0].effectiveDate,null);assert.equal(f.plan().unscheduled.length,1);
 for(const date of ['2026-02-30','2026-1-01','1899-12-31','tomorrow',null])assert.throws(()=>f.run('SAVE_PAYMENT_PLAN_DATE',{milestoneKey:key,date,remarks:'Planning date check'}));
});

test('saved dates do not silently transfer to a changed revision or financial obligation',()=>{
 const f=fixture(),milestoneKey=f.plan().rows[0].milestoneKey;
 f.run('SAVE_PAYMENT_PLAN_DATE',{milestoneKey,date:'2026-11-12',remarks:'Treasury cash date'});assert.equal(f.plan().rows[0].plannedDate,'2026-11-12');
 f.o.revision++;assert.equal(f.plan().rows[0].plannedDate,null);assert.equal(f.plan().warnings[0].code,'STALE_PLANNED_DATE');
 f.o.revision--;f.o.paymentTerms.steps[0].days=30;assert.equal(f.plan().rows[0].plannedDate,null);assert.equal(f.plan().warnings[0].code,'STALE_PLANNED_DATE');
});

test('planning date changes only planner settings and audit history, preserving order workflow state',()=>{
 const f=fixture(),milestoneKey=f.plan().rows[0].milestoneKey;
 f.o.processExemptions=[{id:'old-exemption',stage:'CONFIRM',status:'APPROVED',revision:f.o.revision-1,actions:['PAYMENT']}];const order=structuredClone(f.o);
 f.run('SAVE_PAYMENT_PLAN_DATE',{milestoneKey,date:'2026-11-12',remarks:'Treasury cash date'});assert.deepEqual(f.o,order);assert.equal(f.state.events.at(-1).action,'PAYMENT_PLAN_DATE_SAVED');
});

test('planner authorization checks role, scope, test/deleted/draft order and milestone identity atomically',()=>{
 const f=fixture(),key=f.plan().rows[0].milestoneKey,command={milestoneKey:key,date:'2026-11-01',remarks:'Treasury cash date'},before=structuredClone(f.state);
 for(const actor of [{...f.user,role:'VIEWER'},{...f.user,role:'EXECUTIVE'},{...f.user,scopes:[]},{...f.user,active:false}])assert.throws(()=>f.run('SAVE_PAYMENT_PLAN_DATE',command,actor));
 assert.throws(()=>f.run('SAVE_PAYMENT_PLAN_DATE',{...command,orderId:'__proto__'}),/not found/);assert.throws(()=>f.run('SAVE_PAYMENT_PLAN_DATE',{...command,milestoneKey:'0::ci:other'}),/no longer exists/);assert.throws(()=>f.run('SAVE_PAYMENT_PLAN_DATE',{...command,rate:'1'}),/only/);assert.deepEqual(f.state,before);
 for(const markers of [{testData:{reason:'Fixture'}},{deletedAt:'2026-10-24'},{status:'DRAFT'},{status:'CANCELLED'}]){const g=fixture();Object.assign(g.o,markers);assert.throws(()=>g.run('SAVE_PAYMENT_PLAN_DATE',command));}
 assert.throws(()=>paymentPlanner(f.state,{...f.user,scopes:[]}),/access/);
});

test('test, draft and cancelled orders are excluded; deleted legitimate exposure remains visible',()=>{
 const f=fixture(),base=structuredClone(f.o);f.state.orders=[...['test','draft','cancelled','deleted'].map((id,i)=>({...structuredClone(base),id,number:id,serialNumber:i+1,...(id==='test'?{testData:{}}:id==='deleted'?{deletedAt:'2026-10-24'}:{status:id.toUpperCase()})}))];
 const plan=f.plan();assert.equal(plan.rows.length,1);assert.equal(plan.rows[0].orderId,'deleted');assert.equal(plan.rows[0].deletedExposure,true);assert.equal(plan.rows[0].ready,false);assert.equal(plan.totals[0].deletedExposureMinor,10000);
});

test('overpayment and supplier difference remain visible without inventing negative cash or credits',()=>{
 const f=fixture();f.state.payments=[{id:'excess',status:'ACKNOWLEDGED',allocations:[{id:'excess-allocation',orderId:f.o.id,termIndex:0,shipmentId:null,expectedMinor:11000,realizedMinor:10900}]}];
 const row=f.plan().rows[0];assert.equal(row.futureMinor,0);assert.equal(row.overpaidMinor,1000);assert.equal(row.acknowledgementDifferenceMinor,100);assert.equal(row.status,'OVERPAID');assert.ok(f.plan().warnings.some(w=>w.code==='OVERPAID_MILESTONE'));
});

test('retained remittances with no current milestone keep acknowledgement and receipt difference visible',()=>{
 const f=fixture();f.state.payments=[{id:'old-payment',reference:'OLD-BANK',status:'REPORTED',allocations:[{id:'old-allocation',orderId:f.o.id,termIndex:9,shipmentId:'cancelled-shipment',expectedMinor:2500,realizedMinor:null}]}];
 let plan=f.plan(),row=plan.rows.find(r=>r.kind==='PAYMENT_RECONCILIATION');assert.equal(row.futureMinor,0);assert.equal(row.milestoneKey,null);assert.equal(row.awaitingAcknowledgementMinor,2500);assert.equal(plan.totals[0].reportedMinor,2500);assert.equal(plan.totals[0].awaitingAcknowledgementMinor,2500);assert.ok(plan.warnings.some(w=>w.code==='UNMATCHED_PAYMENT'));
 f.state.payments[0].allocations[0].realizedMinor=2400;plan=f.plan();assert.equal(plan.totals[0].acknowledgementDifferenceMinor,100);assert.ok(plan.warnings.some(w=>w.code==='SUPPLIER_RECEIPT_DIFFERENCE'));
});

test('CI rows and uninvoiced commitment reconcile PO exposure without re-counting advances',()=>{
 const f=fixture();f.o.paymentTerms={name:'Advance balance',steps:[{name:'Advance',percent:30,trigger:'PI',days:0},{name:'BL',percent:70,trigger:'BL',days:0}]};
 f.o.ciPaymentPolicy={version:1,rule:'FINAL_BL',days:0};f.o.shipments=[{id:'shipment',status:'PLANNED',lines:[{lineId:f.o.lines[0].id,quantity:1}],actualDeparture:'2026-10-10',blNumber:'BL-1',blDate:'2026-10-11'}];
 f.state.payments=[{id:'advance',status:'REPORTED',allocations:[{id:'advance-allocation',orderId:f.o.id,termIndex:0,shipmentId:null,expectedMinor:2000,realizedMinor:null}]}];
 f.o.commercialInvoices=[{id:'ci-a',termIndex:100001,version:1,number:'CI-A',date:'2026-10-11',currency:'USD',shipmentId:'shipment',amountMinor:5000,advanceMode:'MANUAL',advanceApplications:[{allocationId:'advance-allocation',paymentId:'advance',amountMinor:2000}],status:'APPROVED',orderRevision:f.o.revision}];
 let plan=f.plan();assert.deepEqual(plan.rows.map(r=>r.trigger),['PI','CI']);assert.equal(plan.rows.reduce((n,r)=>n+r.futureMinor,0),4000);assert.equal(plan.commitments[0].amountMinor,4000);assert.equal(plan.rows.reduce((n,r)=>n+r.futureMinor,0)+plan.commitments[0].amountMinor,orderTotal(f.o)-2000);
 f.o.commercialInvoices.push({...structuredClone(f.o.commercialInvoices[0]),id:'ci-b',number:'CI-B',termIndex:100001,amountMinor:2000,advanceApplications:[]});
 plan=f.plan();const keys=plan.rows.filter(r=>r.ciId).map(r=>r.milestoneKey);assert.equal(new Set(keys).size,2);assert.ok(keys.every(k=>k.includes(':ci:')));assert.equal(plan.commitments[0].amountMinor,2000);assert.equal(plan.rows.reduce((n,r)=>n+r.futureMinor,0)+plan.commitments[0].amountMinor,8000);
 assert.equal(paymentPlannerMilestoneKey({index:100001,shipmentId:'shipment',ciId:'ci-a'}),'100001:shipment:ci:ci-a');assert.notEqual(paymentPlannerDateKey('ab','c'),paymentPlannerDateKey('a','bc'));
});

test('fully invoiced PO discloses unapplied paid PI advance without silently reducing approved CI',()=>{
 const f=fixture();f.o.paymentTerms={name:'Advance balance',steps:[{name:'Advance',percent:30,trigger:'PI',days:0},{name:'BL',percent:70,trigger:'BL',days:0}]};f.pay('30');
 f.o.ciPaymentPolicy={version:1,rule:'FINAL_BL',days:0};f.o.shipments=[{id:'shipment',status:'PLANNED',lines:[{lineId:f.o.lines[0].id,quantity:1}],actualDeparture:'2026-10-10',blNumber:'BL-1',blDate:'2026-10-11'}];
 f.o.commercialInvoices=[{id:'ci-full',termIndex:100000,version:1,number:'CI-FULL',date:'2026-10-11',currency:'USD',shipmentId:'shipment',amountMinor:10000,advanceMode:'MANUAL',advanceApplications:[],status:'APPROVED',orderRevision:f.o.revision}];
 const plan=f.plan(),ci=plan.rows.find(r=>r.ciId);assert.equal(ci.futureMinor,10000);assert.equal(plan.commitments[0].futureMinor,0);assert.equal(plan.commitments[0].unreconciledAdvanceMinor,3000);assert.equal(plan.commitments[0].unreconciledPaidAdvanceMinor,3000);assert.equal(plan.commitments[0].unappliedReportedAdvanceMinor,3000);assert.ok(plan.warnings.some(w=>w.code==='UNRECONCILED_PI_ADVANCE'&&w.amountMinor===3000));
 f.run('SAVE_PAYMENT_PLAN_DATE',{milestoneKey:ci.milestoneKey,date:'2026-11-12',remarks:'Reviewed cash date'});assert.equal(f.plan().rows.find(r=>r.ciId).plannedDate,'2026-11-12');f.o.ciPaymentPolicy.rule='SAILING';assert.equal(f.plan().rows.find(r=>r.ciId).plannedDate,null);
 f.state.payments=[];const unpaid=f.plan();assert.equal(unpaid.rows.reduce((n,r)=>n+r.futureMinor,0),13000);assert.equal(unpaid.commitments[0].unreconciledAdvanceMinor,3000);assert.equal(unpaid.commitments[0].unreconciledPaidAdvanceMinor,0);assert.ok(unpaid.warnings.some(w=>w.code==='UNRECONCILED_PI_ADVANCE'));
});

test('standalone review bundle initializes circular domain planner helpers and runs projection and saves',()=>{
 const f=fixture(),read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8'),bundle=reviewBundle(['shared/domain.mjs','shared/payment-planner.mjs'],read);
 const context={structuredClone,console,Date,crypto,fixtureState:f.state,fixtureUser:f.user};
 vm.runInNewContext(bundle.code+"\nglobalThis.plan=paymentPlanner(fixtureState,fixtureUser,{asOf:'2026-10-24'});globalThis.saved=execute(fixtureState,{type:'SAVE_PAYMENT_PLAN_RATE',payload:{month:'2026-11',rate:'85.25',remarks:'Standalone test estimate'}},fixtureUser,{now:'2026-10-24T09:00:00Z',id:()=> 'review-planner-id'});",context);
 assert.equal(context.plan.rows[0].futureMinor,10000);assert.equal(context.saved.state.settings.paymentPlanner.rates['2026-11'].rate,85250000);
});
