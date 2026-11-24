import test from 'node:test';
import assert from 'node:assert/strict';
import {renderPoScmTimeline,poScmBranches,poScmStatus} from '../web/po-scm-timeline.mjs';

const order={id:'po/a',lines:[{id:'L1',code:'PW8',unit:'pcs',quantity:48}],productionCompletedAt:'2026-11-03'};
const ui={esc:value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'),dt:v=>v,badge:label=>'<span>'+label+'</span>'};
function invoice(id,owner=order.id,roId='r1'){
 return {id,number:'Commercial-'+id,roId,members:[{orderId:owner,lines:[{lineId:'L1',quantity:4}]}],bookedAt:'2026-11-03',releasedAt:'2026-11-04',loadedAt:'2026-11-05',insurance:{date:'2026-11-06',reference:id+'/policy'}};
}
const ro={id:'r1',number:'RO-44',blNumber:'BL-321',containers:[
 {number:'CNT-1',packingList:'PL-1',lines:[{orderId:order.id,invoiceId:'A',lineId:'L1',quantity:4}]},
 {number:'PRIVATE-OTHER',packingList:'PL-2',lines:[{orderId:'other',invoiceId:'X',lineId:'other-line',quantity:25}]}],
 stages:[{stage:'INDIA_ARRIVAL',date:'2026-11-21',reference:'PORT-12',remarks:'<warehouse>'}],followups:[]};
const countClass=(html,tag,name)=>(html.match(new RegExp('<'+tag+'\\b[^>]*class="[^"]*\\b'+name+'\\b[^"]*"','g'))||[]).length;
// Extract nested containers without treating closed supplemental facts as rail milestones.
function elementMarkup(html,tag,attribute){
 const start=html.search(new RegExp('<'+tag+'\\b[^>]*'+attribute+'[^>]*>'));
 assert.notEqual(start,-1,`Missing ${tag} with ${attribute}`);
 let depth=0,out='';
 for(const token of html.slice(start).match(/<[^>]*>|[^<]+/g)||[]){
  out+=token;
  if(new RegExp('^<'+tag+'\\b','i').test(token))depth++;
  else if(new RegExp('^</'+tag+'\\s*>','i').test(token)&&--depth===0)return out;
 }
 assert.fail(`Unclosed ${tag}`);
}
const railMarkup=html=>elementMarkup(html,'div','class="po-cycle-rail"');
const railStep=(html,stage)=>elementMarkup(railMarkup(html),'div','data-stage="'+stage+'"');
function includesAll(html,values){for(const value of values)assert.ok(html.includes(value),`Missing ${value}`);}
const milestones=['Commercial invoice','Container booking','Container release','Container loading','Shipping documents','Vessel departure','Final bill of lading','Invoice insurance','India arrival','Final costing'];
function assertRail(html,trunk=''){
 assert.equal(countClass(html,'div','po-cycle-rail'),1);
 const rail=railMarkup(html);
 if(trunk)assert.ok(rail.startsWith('<div class="po-cycle-rail">'+trunk),'Original PO trunk begins the continuous rail');
 let previous=-1;
 for(const label of ['Production completion',...milestones]){
  const index=rail.indexOf('>'+label+'<');
  assert.ok(index>previous,`${label} follows the preceding milestone on the rail`);
  previous=index;
 }
 assert.doesNotMatch(html,/cycle-trunk|cycle-root|cycle-linear|cycle-disclosure/);
 return rail;
}

test('one invoice shares the PO rail and retains scoped supplemental invoice and RO facts',()=>{
 const state={scm:{invoices:[invoice('A'),invoice('X','other')],ros:[ro]}},original=structuredClone(state);
 const trunk='<div class="step"><span>PO approved</span></div><div class="step"><span>Production completion</span></div>';
 const single={...order,lines:[{...order.lines[0],quantity:4}]};
 const html=renderPoScmTimeline(state,single,ui,trunk),visible=assertRail(html,trunk);
 assert.equal(countClass(html,'ol','cycle-branches'),0);
 assert.equal(countClass(html,'ol','cycle-steps'),0);
 assert.equal(countClass(html,'button','po-cycle-split'),0);
 assert.equal(countClass(html,'div','po-cycle-branches-panel'),0);
 assert.equal(countClass(html,'details','po-cycle-supplement'),1);
 assert.equal(countClass(html,'section','cycle-ro'),1);
 includesAll(visible,[...milestones,'Commercial-A','&lt;warehouse&gt;','A/policy','PORT-12','2026-11-21']);
 includesAll(html,['PW8','4 pcs','CNT-1','PL-1','BL-321']);
 assert.ok(html.includes('#/scm?po=po%2Fa'));
 assert.doesNotMatch(html,/Commercial-X|PRIVATE-OTHER|other-line|<warehouse>/);
 assert.deepEqual(state,original);
});

test('ten invoice branches start hidden behind an inline split control and retain two shared RO histories',()=>{
 const invoices=Array.from({length:10},(_,i)=>invoice(String(i),order.id,i<6?'r1':'r2'));
 const state={scm:{invoices,ros:[ro,{...ro,id:'r2',number:'RO-55',blNumber:'BL-222'}]}};
 const trunk='<b>PO issued</b><span>Production completion</span>';
 const html=renderPoScmTimeline(state,order,ui,trunk),rail=railMarkup(html);
 includesAll(rail,[trunk,'Partial loaded','Completed']);
 for(const label of milestones)assert.ok(!rail.includes('>'+label+'<'));
 assert.equal(countClass(html,'button','po-cycle-split'),1);
 const toggle=rail.match(/<button\b[^>]*class="[^"]*po-cycle-split[^"]*"[^>]*>[\s\S]*?<\/button>/)?.[0];
 assert.ok(toggle,'The split control sits on the main rail');
 includesAll(toggle,['aria-expanded="false"','Partial loaded','10 invoices']);
 const panelId=toggle.match(/aria-controls="([^"]+)"/)?.[1];
 assert.ok(panelId,'The split control names its branch panel');
 const visible=elementMarkup(html,'div','id="'+panelId+'"');
 assert.match(visible,/^<div\b[^>]*class="po-cycle-branches-panel"[^>]*\bhidden(?:[ >])/);
 assert.equal(countClass(html,'div','po-cycle-branches-panel'),1);
 assert.equal(countClass(visible,'ol','cycle-branches'),1);
 assert.equal(countClass(visible,'section','cycle-ro'),2);
 assert.doesNotMatch(rail,/Commercial-0|RO-44/);
 assert.equal(countClass(rail,'ol','cycle-branches'),0);
 assert.ok(html.indexOf(visible)>=html.indexOf(rail)+rail.length,'Branches supplement the continuous rail');
 for(const inv of invoices)includesAll(visible,[inv.number,inv.insurance.reference]);
 assert.equal((visible.match(/Invoice insurance/g)||[]).length,10);
 assert.equal((visible.match(/India arrival/g)||[]).length,2);
 assert.equal((visible.match(/Final costing/g)||[]).length,2);
 assert.equal(poScmBranches(state,order).ros.length,2);
 assert.equal(poScmBranches(state,order).invoices.length,10);
});

test('zero invoices retain the PO trunk until a loading path is known',()=>{
 const trunk='<ol data-test="po-trunk"><li>PO approved</li><li>Production running</li><li>Production completion</li></ol>';
 for(const po of [{...order,productionCompletedAt:null},order]){
  const html=renderPoScmTimeline({},po,ui,trunk);
  const visible=railMarkup(html);
  includesAll(visible,[trunk]);
  assert.equal(countClass(html,'button','po-cycle-split'),0);
  assert.equal(countClass(html,'div','po-cycle-branches-panel'),0);
  assert.equal(countClass(html,'ol','cycle-branches'),0);
  assert.doesNotMatch(visible,/Commercial invoice|Partial loaded/);
  assert.match(html,/invoice.*book|book.*invoice/i);
  assert.match(html,/pending|awaiting|follows/i);
  const fallback=renderPoScmTimeline({},po,ui);
  assert.match(railStep(fallback,'READY'),new RegExp('data-status="'+(po.productionCompletedAt?'complete':'pending')+'"'));
 }
});

test('an unbooked invoice still exposes future milestones as pending',()=>{
 const inv={...invoice('A'),bookedAt:null,releasedAt:null,loadedAt:null,insurance:null,roId:null};
 const single={...order,lines:[{...order.lines[0],quantity:4}]};
 const visible=railMarkup(renderPoScmTimeline({scm:{invoices:[inv],ros:[]}},single,ui));
 includesAll(visible,[...milestones,'Commercial-A','Pending']);
 assert.doesNotMatch(visible,/2026-11-04|2026-11-05|2026-11-06|A\/policy|Cost capture complete/);
});

test('all tracking reports, invoice follow-ups and RO follow-ups are preserved and escaped',()=>{
 const inv={...invoice('A'),followups:[{date:'2026-11-04',remarks:'Invoice <follow-up>'}]};
 const record={...ro,trackingReports:[
  {date:'2026-11-07',etd:'2026-11-09',eta:'2026-11-28',remarks:'First report',reportedBlNumber:'DRAFT-111'},
  {date:'2026-11-08',etd:'2026-11-10',eta:'2026-11-29',remarks:'Revised <ETA>',reportedBlNumber:'DRAFT-222'}],followups:[{date:'2026-11-09',remarks:'RO <follow-up>'}]};
 const html=renderPoScmTimeline({scm:{invoices:[inv],ros:[record]}},order,ui);
 includesAll(html,['First report','2026-11-07','2026-11-09','2026-11-28','DRAFT-111','Revised &lt;ETA&gt;','2026-11-08','2026-11-10','2026-11-29','DRAFT-222','Invoice &lt;follow-up&gt;','RO &lt;follow-up&gt;']);
 assert.doesNotMatch(html,/<follow-up>|<ETA>/);
});

test('cancelled invoices remain historical and are excluded from active branches and RO records',()=>{
 const cancelled={...invoice('CANCELLED'),roId:'old-ro',cancelledAt:'2026-11-12',cancelledBy:'Buyer',cancelReason:'Replace <booking>',followups:[{date:'2026-11-11',remarks:'Old booking call'}]};
 const state={scm:{invoices:[invoice('A'),cancelled,invoice('PRIVATE','other')],ros:[ro,{...ro,id:'old-ro',number:'OLD-RO'}]}};
 const branches=poScmBranches(state,order);
 assert.deepEqual(branches.invoices.map(x=>x.id),['A']);
 assert.deepEqual(branches.ros.map(x=>x.id),['r1']);
 const html=renderPoScmTimeline(state,order,ui);
 includesAll(html,['Commercial-CANCELLED','2026-11-12','Replace &lt;booking&gt;','Old booking call']);
 assert.equal(countClass(html,'section','cycle-ro'),1);
 assert.doesNotMatch(html,/Commercial-PRIVATE|<booking>/);
});

test('reopened costing preserves old final history while the current cost milestone remains pending',()=>{
 const record={...ro,costingHistory:[{stage:'COST_CAPTURE',date:'2026-11-22',reference:'OLD-FINAL',reopenedAt:'2026-11-23',reopenedBy:'Manager',reason:'Correct <freight>'}]};
 const po={...order,shipments:[{id:'s1',scmInvoiceId:'A',scmRoId:'r1',lines:[{lineId:'L1',quantity:4}]}],arrivalCostings:[{id:'cost1',shipmentId:'s1',invoiceNumber:'Commercial-A',status:'PROVISIONAL',revision:2,history:[{status:'FINAL',revision:1,finalizedAt:'2026-11-22',reopenedAt:'2026-11-23',reopenReason:'Correct invoice allocation'}]}]};
 const inv=invoice('A');inv.members[0].shipmentId='s1';
 const html=renderPoScmTimeline({scm:{invoices:[inv],ros:[record]}},po,ui);
 includesAll(html,['OLD-FINAL','2026-11-22','2026-11-23','Correct &lt;freight&gt;','Correct invoice allocation']);
 includesAll(railMarkup(html),['Completed','Pending']);
 const finalStep=railStep(html,'COMPLETED');
 assert.match(finalStep||'',/Pending/);
 assert.doesNotMatch(html,/<freight>|Cost capture complete/);
});

test('PO revision history and open balance remain alongside invoice branches',()=>{
 const po={...order,revision:1,revisions:[{revision:0,at:'2026-10-01',actor:'Manager',reason:'Initial issue'},{revision:1,at:'2026-10-15',actor:'Manager',reason:'Increase <quantity>'}],shipments:[{id:'s1',scmInvoiceId:'A',lines:[{lineId:'L1',quantity:4}]}]};
 const html=renderPoScmTimeline({scm:{invoices:[invoice('A')],ros:[ro]}},po,ui);
 includesAll(html,['2026-10-15','Increase &lt;quantity&gt;']);
 assert.match(html,/<dd>\s*44\s*<\/dd>|\b44\s+units\s+remain/i);
 assert.match(html,/balance|remaining|unallocated/i);
 assert.doesNotMatch(html,/<quantity>/);
});

test('release, loading, partial India arrival and final costing describe the full PO quantity',()=>{
 const po={id:order.id,scope:'LAE_IMPORT',lines:[{id:'L1',quantity:8}],shipments:[{id:'s1',scmInvoiceId:'A',lines:[{lineId:'L1',quantity:4}]}]};
 const inv=invoice('A'),state={scm:{invoices:[inv],ros:[]}};
 inv.roId=null;inv.loadedAt=null;
 assert.equal(poScmStatus(state,po),'Partially released');
 let html=renderPoScmTimeline(state,po,ui);
 includesAll(railMarkup(html),['Partial loaded','0 / 8 loaded','1 invoice','Completed']);
 includesAll(html,['Container release','2026-11-04']);
 inv.roId='r1';inv.loadedAt='2026-11-05';
 const record={...ro,stages:[],trackingReports:[{date:'2026-11-07',eta:'2026-11-28',remarks:'New ETA'}]};
 state.scm.ros.push(record);
 assert.equal(poScmStatus(state,po),'Partially loaded');
 html=renderPoScmTimeline(state,po,ui);
 includesAll(html,['New ETA','2026-11-28']);
 includesAll(railMarkup(html),['4 / 8 loaded']);
 assert.match(railStep(html,'COMPLETED'),/data-status="pending"/);
 record.stages.push({stage:'INDIA_ARRIVAL',date:'2026-11-28'});
 assert.equal(poScmStatus(state,po),'Partially arrived in India');
 html=renderPoScmTimeline(state,po,ui);
 includesAll(html,['India arrival','2026-11-28']);
 record.stages.push({stage:'COST_CAPTURE',date:'2026-11-29'});
 assert.match(railStep(renderPoScmTimeline(state,po,ui),'COMPLETED'),/data-status="pending"/);
 record.stages.pop();
 state.scm.invoices.push(invoice('B'));po.shipments.push({id:'s2',scmInvoiceId:'B',lines:[{lineId:'L1',quantity:4}]});
 assert.equal(poScmStatus(state,po),'Arrived in India');
 html=renderPoScmTimeline(state,po,ui);
 assert.match(railStep(html,'COMPLETED'),/data-status="pending"/);
 record.stages.push({stage:'COST_CAPTURE',date:'2026-11-29'});
 assert.equal(poScmStatus(state,po),'Cost capture complete');
 html=renderPoScmTimeline(state,po,ui);
 assert.match(railStep(html,'COMPLETED'),/data-status="complete"/);
 includesAll(railStep(html,'COMPLETED'),['Completed','2026-11-29']);
});
