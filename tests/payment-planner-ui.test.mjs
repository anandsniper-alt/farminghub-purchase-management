import test from 'node:test';
import assert from 'node:assert/strict';
import {createPaymentPlannerUI} from '../web/payment-planner.mjs';
import {paymentPlannerReport} from '../shared/payment-planner-report.mjs';
import {createSeed} from '../shared/seed.mjs';

test('weekly grid, monthly toggle and supplier drilldown preserve filter scope in review mode',async()=>{
 const oldLocation=globalThis.location,oldFrame=globalThis.requestAnimationFrame;
 globalThis.location={hash:'#/payment-planner?year=2026&month=2026-10'};globalThis.requestAnimationFrame=()=>0;
 const state=createSeed('2026-10-15'),user=state.users.find(u=>u.role==='MANAGER'),ui={view:'payment-planner'};
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const host={context:()=>({state,user,ui,sandbox:true}),esc,field:(name,label,value,type,opt={})=>`<label>${esc(label)}<select name="${name}">${(opt.options||[]).map(o=>`<option value="${esc(o.value??o)}"${(o.value??o)===value?' selected':''}>${esc(o.label??o)}</option>`).join('')}</select></label>`,button:(label,action)=>`<button data-action="${action}">${label}</button>`,head:(a,b,c,d)=>`<h1>${b}</h1>${c}${d}`,ph:(title,sub,actions='')=>`<h2>${title}</h2>${sub}${actions}`,note:s=>s,badge:s=>s,render:()=>{},api:()=>{throw Error('Review must not call server');}};
 const planner=createPaymentPlannerUI(host);
 const page=async()=>{planner.page();await new Promise(r=>setImmediate(r));return planner.page();};
 try{
  let html=await page();assert.ok(html.includes('Weekly payment plan'));assert.ok(!html.includes('Invalid supplier page'));
  assert.equal((html.match(/<th scope="row">Week /g)||[]).length,4);assert.ok(html.includes('Month summary'));
  assert.ok(!html.includes('id="payment-plan-detail"'),'Details are progressive, not the default screen');
  await planner.action('payment-plan-layout',{layout:'monthly'});html=await page();
  assert.ok(html.includes('Monthly outstanding summary'));assert.ok(html.includes('Selected months total'));assert.equal((html.match(/<th scope="row">[A-Z][a-z]+ 2026/g)||[]).length,1);
  assert.ok(html.includes('Weekly plan'));assert.ok(!html.includes('· October 2026</p>'),'Full-year summary is not labelled as filtered to one month');
  await planner.action('payment-plan-layout',{layout:'weekly'});await page();
  const supplier=state.orders[0].vendorId;
  await planner.action('payment-plan-cell',{month:'2026-10',week:'2',supplier});
  let q=new URLSearchParams(location.hash.split('?')[1]);assert.equal(q.get('supplierId'),supplier);assert.equal(q.get('week'),'2');assert.equal(q.get('detail'),'1');
  html=await page();assert.ok(html.includes('Back to weekly plan'));assert.ok(html.includes('id="payment-plan-detail"'));
  await planner.action('payment-plan-back',{});q=new URLSearchParams(location.hash.split('?')[1]);assert.equal(q.get('supplierId'),null);assert.equal(q.get('week'),null);assert.equal(q.get('month'),null);assert.equal(q.get('months'),'2026-10');
  html=await page();assert.ok(html.includes('Weekly payment plan'));assert.ok(html.includes('Download Excel'));assert.ok(html.includes('Download PDF'));
  assert.ok(html.includes('Estimated INR'));assert.ok(html.includes('colspan="2"'));
  assert.equal((html.match(/type="checkbox" data-payment-plan-month=/g)||[]).length,12);
  assert.ok(!html.includes('Show month'));assert.ok(!html.includes('3-month forecast'));
  planner.change({dataset:{paymentPlanMonth:'2026-12'},checked:true});
  html=await page();q=new URLSearchParams(location.hash.split('?')[1]);assert.equal(q.get('months'),'2026-10,2026-12');
  assert.equal((html.match(/<th scope="row">Week /g)||[]).length,8);
  const weeklyTotal=html.match(/<tfoot>(.*?)<\/tfoot>/s)[1];
  await planner.action('payment-plan-layout',{layout:'monthly'});html=await page();
  assert.equal((html.match(/<th scope="row">[A-Z][a-z]+ 2026/g)||[]).length,2);
  assert.equal(html.match(/<tfoot>(.*?)<\/tfoot>/s)[1],weeklyTotal);
  await planner.action('payment-plan-cell',{month:'2026-12',supplier});await page();
  await planner.action('payment-plan-back',{});html=await page();q=new URLSearchParams(location.hash.split('?')[1]);assert.equal(q.get('months'),'2026-10,2026-12');
  planner.change({dataset:{paymentPlanMonth:'2026-10'},checked:false});
  planner.change({dataset:{paymentPlanMonth:'2026-12'},checked:false});html=await page();
  assert.ok(html.includes('Select at least one month'));assert.ok(!html.includes('<tbody>'));
  assert.equal(new URLSearchParams(location.hash.split('?')[1]).get('months'),'none');
  assert.match(html,/data-format="xlsx" disabled/);assert.match(html,/data-format="pdf" disabled/);
  planner.change({dataset:{paymentPlanMonth:'2026-11'},checked:true});html=await page();assert.ok(html.includes('November 2026'));
  assert.equal((html.match(/<th scope="row">[A-Z][a-z]+ 2026/g)||[]).length,1);
  globalThis.location.hash='#/payment-planner?year=2026';html=await page();
  assert.ok(html.includes('Weekly payment plan'));assert.ok(html.includes('Month summary'));
  assert.ok(html.includes('Outstanding: <strong>'));assert.ok(!html.includes('Monthly outstanding summary'));
  await planner.action('payment-plan-layout',{layout:'monthly'});html=await page();assert.ok(html.includes('Monthly outstanding summary'));
  await planner.action('payment-plan-reset',{});html=await page();assert.ok(html.includes('Weekly payment plan'));assert.ok(html.includes('Month summary'));
  globalThis.location.hash='#/payment-planner?year=2026&layout=forecast';html=await page();assert.ok(html.includes('Weekly payment plan'));

 }finally{globalThis.location=oldLocation;globalThis.requestAnimationFrame=oldFrame;}
});


test('download requires the displayed revision and as-of day, not a newer unseen snapshot',async()=>{
 const prior=globalThis.location;globalThis.location={hash:'#/payment-planner?year=2026'};
 try{
  for(const changed of ['revision','asOf']){
   const state=createSeed('2026-10-15'),user=state.users.find(u=>u.role==='MANAGER');let calls=0;
   const report=paymentPlannerReport(state,user,{year:'2026',currency:'USD',section:'scheduled',supplierPage:1});
   const planner=createPaymentPlannerUI({context:()=>({state,user,ui:{view:'payment-planner'},sandbox:false}),api:async()=>{const r=structuredClone(report);if(++calls>1){if(changed==='revision')r.revision++;else {const day=new Date(r.asOf+'T00:00:00Z');day.setUTCDate(day.getUTCDate()+1);r.asOf=day.toISOString().slice(0,10);}}return r;},esc:String,field:()=>'',button:()=>'',head:()=>'',ph:()=>'',note:()=>'',badge:()=>'',render:()=>{}});
   planner.page();await new Promise(r=>setImmediate(r));planner.page();
   await assert.rejects(planner.action('payment-plan-export',{format:'pdf'}),/Refresh before downloading/);
   assert.equal(calls,2);
  }
 }finally{globalThis.location=prior;}
});
