import test from 'node:test';
import assert from 'node:assert/strict';
import {createReviewIndex,buildReview,ReviewStore} from '../review-store.mjs';
import {ANALYTICS_CENTRES} from '../store.mjs';
import {makeAnalyticsServer} from '../server.mjs';
import {DatabaseSync} from 'node:sqlite';
const admin={id:'test',role:'ADMIN'};
function fixture(){
  const ms=['2026-10','2026-11','2026-12','2027-01','2027-02','2027-03'];
  const items=[['A','CUTTER','170F','PRIME',6,4],['B','CUTTER','173F','ELITE',100,0],['C','ENGINE','170F','PRIME',2,0]].map(([code,category,engine,grade,stock,pipelineTotal],i)=>({code,category,engine,grade,stock,pipelineTotal,model:'Model '+code,sourceRow:i+5,locations:[0,0,0,0,stock]}));
  let n=10;const rows=[];
  const add=(fy,centre,code,entries)=>{const item=items.find(i=>i.code===code),months=Array(12).fill(null);for(const [m,q] of entries)months[m-1]=q;rows.push({fy,centre,code,mapped:!!item,category:item?.category||'OTHER',engine:item?.engine||'Unmapped specification',grade:item?.grade||'Unmapped grade',model:item?.model||'',sourceRow:n++,sourceSku:'GJ-'+code,months});};
  add('FY2025-26','B2B - AP / TS','A',[[4,10],[10,20],[1,30]]);
  add('FY2026-27','B2B - AP / TS','A',[[4,8],[7,2],[10,3]]);
  add('FY2026-27','B2B - AP / TS','A',[[4,4]]); // Separate source brand, one MASTER stock record.
  add('FY2026-27','B2B - AP / TS','B',[[4,5]]);
  add('FY2026-27','B2C - TN','A',[[4,1]]);
  add('FY2026-27','B2B - Karnal','A',[[4,2]]);
  add('FY2026-27','B2B - AP / TS','UNKNOWN',[[4,7]]);
  const controls=['FY2025-26','FY2026-27'].flatMap(fy=>ANALYTICS_CENTRES.filter(c=>fy!=='FY2025-26'||c!=='B2C - TN').map(centre=>({fy,centre,months:Array.from({length:12},(_,i)=>fy==='FY2025-26'||i>=3&&i<=9?0:null)})));
  const sales={rows,meta:{cutoff:'2026-10-14',controls,comparisonExcludedCentres:['B2B - TN'],notes:[]}};
  const forecast={meta:{months:ms,exceptions:[]},rows:items.flatMap(item=>ANALYTICS_CENTRES.flatMap(centre=>ms.map((month,i)=>({code:item.code,centre,month,quantity:centre==='B2B - AP / TS'?(item.code==='A'?(i===0?8:i===1?4:i===2?null:0):item.code==='B'&&i===0?2:0):0}))))};
  return createReviewIndex({items,meta:{stockAsOf:null},exceptions:[]},sales,forecast);
}
test('H1/H2 fiscal boundaries, last six completed months, partial October and brand aggregation reconcile',()=>{
  const r=buildReview(fixture(),{view:'review',category:'CUTTER',engine:'170F',centre:'B2B - AP / TS',level:'item'}),a=r.rows[0];
  assert.equal(a.sales.priorFull.quantity,60);assert.equal(a.sales.priorH1.quantity,10);assert.equal(a.sales.priorH2.quantity,50);
  assert.equal(a.sales.currentH1.quantity,14);assert.equal(a.sales.lastSix.quantity,14);assert.equal(a.sales.currentH1.complete,true);
  assert.equal(a.sales.currentH2.quantity,3);assert.equal(a.sales.currentH2.complete,false);assert.equal(r.lastSixMatchesH1,true);
  assert.equal(a.stock.quantity,6);assert.equal(a.pipeline.quantity,4);assert.equal(a.supply.quantity,10);assert.equal(a.balance,null);
  assert.equal(a.plan.quantity,12);assert.equal(a.remaining.quantity,9);assert.equal(a.plan.complete,false);
  assert.equal(r.forecastMonths[2].zones.find(z=>z.centre==='B2B - AP / TS').quantity,null);
});
test('missing prior history and future periods remain unknown; explicitly covered no-sales months are zero',()=>{
  const idx=fixture();
  for(const centre of ['B2B - TN','B2C - TN'])assert.equal(buildReview(idx,{category:'CUTTER',engine:'170F',centre}).totals.sales.priorFull.quantity,null);
  const q=buildReview(idx,{view:'sales',category:'CUTTER',engine:'170F',centre:'B2B - AP / TS'});
  assert.deepEqual(q.buckets.map(p=>p.label),['Q1','Q2','Q3','Q4']);assert.deepEqual(q.buckets.map(p=>q.totals.sales[p.id].quantity),[12,2,3,null]);assert.equal(q.totals.totalSales.quantity,17);
  const zero=buildReview(idx,{view:'sales',category:'CUTTER',engine:'173F',centre:'B2B - AP / TS',period:'Q2'});assert.equal(zero.totals.totalSales.quantity,0);assert.equal(zero.totals.totalSales.complete,true);
});
test('custom non-adjacent months, half-year filters, hierarchy paths and unknown MASTER joins preserve identity',()=>{
  const idx=fixture();
  const custom=buildReview(idx,{view:'sales',category:'CUTTER',engine:'170F',centre:'B2B - AP / TS',period:'custom',months:'4,10'});assert.equal(custom.totals.totalSales.quantity,15);
  const half=buildReview(idx,{view:'sales',category:'CUTTER',engine:'170F',centre:'B2B - AP / TS',fy:'FY2025-26',period:'half'});assert.equal(half.totals.sales.p1.quantity,50);
  const engines=buildReview(idx,{level:'engine'});assert.equal(engines.rows.filter(r=>r.label==='170F').length,2);
  const unknown=buildReview(idx,{level:'item',search:'UNKNOWN'});assert.equal(unknown.totals.stock.quantity,null);assert.equal(unknown.totals.sales.currentH1.quantity,7);
  assert.throws(()=>buildReview(idx,{period:'custom',months:'4,4'}));assert.throws(()=>buildReview(idx,{centre:'Other'}));assert.throws(()=>buildReview(idx,{sort:'unsafe'}));
});
test('stock counts once, zone source plan is retained, and item surpluses are not a purchase instruction',()=>{
  const idx=fixture(),r=buildReview(idx,{category:'CUTTER',engine:'170F'});assert.equal(r.totals.stock.quantity,6);assert.equal(r.sharedStock.quantity,6);
  assert.equal(r.totals.plan.quantity,12);assert.equal(r.totals.remaining.quantity,9);assert.equal(r.totals.balance,1);assert.match(r.totals.check,/check blanks/);
  assert.equal(r.zones.reduce((n,z)=>n+(z.sales.currentH1.quantity??0),0),r.totals.sales.currentH1.quantity);
  const sorted=buildReview(idx,{level:'item',sort:'stock',export:'1'});assert.equal(sorted.rows[0].label,'B');assert.equal(sorted.rows.at(-1).label,'UNKNOWN');
});
test('review endpoint is scoped and read-only; mismatched source revisions fail closed',async()=>{
  const db=new DatabaseSync(':memory:'),server=makeAnalyticsServer(db,{authenticate:async()=>({user:{id:'denied',role:'VIEWER',scopes:['IMPLEMENTS']},csrf:'x'})});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  try{assert.equal((await fetch('http://127.0.0.1:'+server.address().port+'/lae-analytics/api/lae-review/workspace')).status,403);
    const s=new ReviewStore(db,{active:()=>null},{active:()=>null},{active:()=>null});assert.equal(s.workspace(admin).ready,false);
    const idx=fixture();db.prepare('INSERT INTO lae_analytics_imports VALUES(?,?,?,?)').run('m',JSON.stringify(idx.master),'a','today');db.prepare('INSERT INTO lae_sales_imports VALUES(?,?,?,?)').run('s',JSON.stringify({...idx.sales,stockId:'wrong'}),'a','today');
    const stale=new ReviewStore(db,{active:()=>'m'},{active:()=>'s'},{active:()=>null});assert.throws(()=>stale.workspace(admin),/Source revisions differ/);
  }finally{await new Promise(r=>server.close(r));db.close();}
});
