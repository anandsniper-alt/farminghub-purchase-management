import test from 'node:test';
import assert from 'node:assert/strict';
import {LAE_AGING_ALLOCATION_BUCKETS,validateLaeAgingAllocationSnapshot,validateLaeAgingAllocationQuery,queryLaeAgingAllocation} from '../shared/lae-stock-aging-allocation.mjs';

const stockDate='2026-10-31',date=days=>new Date(Date.parse(stockDate+'T00:00:00Z')-days*86400000).toISOString().slice(0,10);
const plan=(quantities={},extra={})=>({id:'p',productGroup:'Pump',masterCode:'WP9',unit:'Pcs',quantities:{TNWL:0,HYD:0,NORTH:0,FH:0,...quantities},...extra});
const row=(id,quantity=1,days=30,extra={})=>({id:String(id),planKey:'p',productGroup:'Pump',masterCode:'WP9',brandCode:'KD-WP9',itemName:'Pump',unit:'Pcs',warehouse:'W1',quantity,importDate:days===null?null:date(days),originalInrUnit:10,revisedInrUnit:12,quantityOnly:false,...extra});
const snapshot=(rows,plans=[plan()])=>({schemaVersion:1,stockDate,costDate:stockDate,rows,plans,metadata:{source:'Synthetic test only'}});
const query=(s,q={})=>queryLaeAgingAllocation(s,q);
const allocated=s=>query(s,{view:'allocated',pageSize:'200'});
const freeze=o=>{if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};

test('category values sort high to low for each cost basis; pending follows zero and negative values',()=>{
 const values=[['A',20,80],['B',80,20],['C',0,0],['D',null,null],['E',10,10]];
 const plans=values.map(([id])=>plan({TNWL:1},{id,productGroup:id}));
 const rows=values.map(([id,originalInrUnit,revisedInrUnit])=>row(id,id==='E'?-1:1,30,{planKey:id,productGroup:id,originalInrUnit,revisedInrUnit}));
 const s=snapshot(rows,plans),before=structuredClone(s);
 assert.deepEqual(query(s).groups.map(g=>g.productGroup),['A','B','C','E','D']);
 assert.deepEqual(query(s,{basis:'original'}).groups.map(g=>g.productGroup),['B','A','C','E','D']);
 assert.deepEqual(query(s,{view:'allocated',divisions:'TNWL'}).groups.map(g=>g.productGroup),['A','B','C','D']);
 assert.deepEqual(s,before);
});

test('item summary covers all matching barcodes before paging and retains code, cost and division scope',()=>{
 const rows=Array.from({length:120},(_,i)=>row(i,1,30,{itemName:i%2?'Changed name':'Pump',revisedInrUnit:i===119?null:12}));
 rows.push(row('old',5,300),row('other-brand',2,30,{brandCode:'GJ-WP9'}));const s=snapshot(rows,[plan({TNWL:60,HYD:60})]);
 const a=query(s,{bucket:'0-60',pageSize:'1'}),b=query(s,{bucket:'0-60',pageSize:'1',page:'2'});
 assert.deepEqual(a.itemSummary,b.itemSummary);assert.equal(a.itemSummary.total,2);assert.equal(a.itemSummary.summary[0].quantity,122);
 const kd=a.itemSummary.rows.find(r=>r.brandCode==='KD-WP9');assert.equal(kd.quantity,120);assert.equal(kd.pendingPositiveQty,1);assert.equal(kd.valueInr,1428);
 const division=query(s,{view:'allocated',divisions:'TNWL',bucket:'0-60',pageSize:'200'});
 assert.equal(division.itemSummary.summary[0].quantity,division.drilldown.rows.reduce((n,r)=>n+r.quantity,0));assert.ok(division.itemSummary.rows.every(r=>r.division==='TNWL'));
 const original=query(s,{bucket:'0-60',basis:'original'});assert.equal(original.itemSummary.summary[0].valueInr,1220);
 const many=query(snapshot(Array.from({length:101},(_,i)=>row(i,1,30,{brandCode:'CODE'+i}))),{itemPage:'2'});assert.equal(many.itemSummary.rows.length,1);assert.equal(many.itemSummary.summary[0].quantity,101);
 assert.throws(()=>query(s,{itemPage:'0'}),/page/);
});

test('all eight age bands have exact inclusive boundaries; missing and future dates stay unknown',()=>{
 const ages=[0,60,61,120,121,240,241,360,361,720,721,1080,1081,1900,null,-1];
 const s=snapshot(ages.map((d,i)=>row(i,1,d))),before=structuredClone(s),q=query(s);
 assert.deepEqual(LAE_AGING_ALLOCATION_BUCKETS.map(b=>q.summary[0].buckets[b.id].quantity),[2,2,2,2,2,2,2,2]);
 assert.equal(q.coverage.futureDateRows,1);assert.equal(q.summary[0].valueInr,192);assert.deepEqual(s,before);
 const later=query(s,{asOf:'2026-11-01'});assert.equal(later.snapshot.costDate,stockDate);assert.equal(later.coverage.priceDate,stockDate);assert.equal(later.coverage.futureDateRows,0);
});
test('oldest stock allocated first and leftover stock is explicit, including zero-plan forecast stock',()=>{
 const s=snapshot([row('new',5,10),row('old',5,800),row('unknown',2,null)],[plan({TNWL:4,HYD:2})]),q=allocated(s);
 assert.equal(q.summary[0].quantity,6);assert.equal(q.summary[0].buckets['721-1080'].quantity,5);assert.equal(q.summary[0].buckets['0-60'].quantity,1);
 assert.equal(q.allocation.summary[0].unallocated.quantity,6);assert.equal(q.allocation.plans[0].shortfallQuantity,0);
 const z=query(snapshot([row('z',9)]));assert.equal(z.summary[0].quantity,9);assert.equal(z.allocation.summary[0].unallocated.quantity,9);assert.equal(allocated(snapshot([row('z',9)])).groups.length,0);
});
test('shortage quotas use proportional largest remainder with stable ties, without duplicating ownership',()=>{
 const s=snapshot([row('stock',5)],[plan({TNWL:4,HYD:4,NORTH:4})]),q=allocated(s),p=q.allocation.plans[0];
 assert.deepEqual(Object.values(p.divisions).map(d=>d.allocatedQuantity),[2,2,1,0]);assert.equal(p.shortfallQuantity,7);
 assert.equal(q.drilldown.rows.reduce((n,r)=>n+r.quantity,0),5);assert.equal(q.groups.length,3);assert.equal(q.summary[0].valueInr,60);
});
test('serialized oldest batches share quota fairly rather than giving first rows to the largest division',()=>{
 const s=snapshot(Array.from({length:100},(_,i)=>row(String(i).padStart(3,'0'),1,200-i)),[plan({TNWL:70,HYD:30})]);
 const q=allocated(s),first=q.drilldown.rows.filter(r=>Number(r.id)<10),sum=d=>first.filter(r=>r.division===d).reduce((n,r)=>n+r.quantity,0);
 assert.equal(sum('TNWL'),7);assert.equal(sum('HYD'),3);
 assert.deepEqual(Object.values(q.allocation.plans[0].divisions).map(d=>d.allocatedQuantity),[70,30,0,0]);
});
test('negative adjustments reduce allocation capacity and are never assigned to a division',()=>{
 const s=snapshot([row('a',10,100),row('adjustment',-3,20)],[plan({TNWL:5,HYD:5})]),q=allocated(s),o=query(s);
 assert.equal(q.summary[0].quantity,7);assert.ok(q.drilldown.rows.every(r=>r.quantity>0));assert.equal(q.allocation.summary[0].unallocated.quantity,0);
 assert.equal(o.summary[0].quantity,7);assert.equal(o.summary[0].negative,-3);assert.equal(o.summary[0].valueInr,84);assert.equal(q.allocation.plans[0].shortfallQuantity,3);
 const neg=allocated(snapshot([row('n',-2)],[plan({TNWL:5})]));assert.equal(neg.groups.length,0);assert.equal(neg.allocation.summary[0].unallocated.quantity,-2);assert.equal(neg.allocation.plans[0].shortfallQuantity,5);
});
test('unknown costs, real zero costs and quantity-only stock remain distinct',()=>{
 const s=snapshot([row('missing',3,20,{revisedInrUnit:null}),row('free',2,20,{revisedInrUnit:0}),row('only',4,20,{quantityOnly:true}),row('negative',-1,20,{revisedInrUnit:null}),row('zero',0)]),q=query(s),c=q.summary[0];
 assert.equal(c.quantity,8);assert.equal(c.knownQty,2);assert.equal(c.pendingQty,2);assert.equal(c.pendingPositiveQty,3);assert.equal(c.quantityOnlyQty,4);assert.equal(c.valueInr,0);
 assert.equal(query(snapshot([row('missing',2,20,{revisedInrUnit:null})])).summary[0].valueInr,null);
 assert.equal(query(s,{basis:'original'}).summary[0].valueInr,40);
});
test('division selection, search and band drilldown filter only after the global allocation',()=>{
 const s=snapshot([row('old',5,200,{brandCode:'GJ-WP9'}),row('new',5,10)],[plan({TNWL:5,HYD:5})]),full=allocated(s);
 const tn=query(s,{view:'allocated',divisions:'TNWL',pageSize:'200'});
 assert.deepEqual(tn.drilldown.rows,full.drilldown.rows.filter(r=>r.division==='TNWL'));assert.equal(tn.summary[0].quantity,5);
 const matched=query(s,{view:'allocated',q:'GJ',pageSize:'200'});assert.deepEqual(matched.drilldown.rows,full.drilldown.rows.filter(r=>r.brandCode==='GJ-WP9'));
 assert.equal(query(s,{view:'allocated',divisions:'none'}).summary.length,0);assert.equal(query(s,{divisions:'none'}).summary[0].quantity,10);
 const bucket=query(s,{view:'allocated',bucket:'121-240'});assert.equal(bucket.summary[0].quantity,10);assert.equal(bucket.drilldown.rows.reduce((v,r)=>v+r.quantity,0),5);
});
test('separate units and product categories cannot collide; fractional source stock permits bounded precision',()=>{
 const p2=plan({HYD:2},{id:'kg',unit:'Kg'}),s=snapshot([row('p',3),row('kg',2.5,30,{planKey:'kg',unit:'Kg'})],[plan({TNWL:2}),p2]);
 const q=allocated(s);assert.equal(q.summary.length,2);assert.equal(q.allocation.plans[1].unallocatedQuantity,0.5);
 const f=allocated(snapshot([row('f',1.5)],[plan({TNWL:1,HYD:1})]));assert.equal(f.summary[0].quantity,1.5);assert.equal(f.allocation.plans[0].divisions.TNWL.allocatedQuantity,0.8);assert.equal(f.allocation.plans[0].divisions.HYD.allocatedQuantity,0.7);
 assert.throws(()=>query(snapshot([row('integer')],[plan({TNWL:0.5})])),/Fractional/);
 const quarter=allocated(snapshot([row('quarter',1.5)],[plan({TNWL:0.25,HYD:0.75})]));assert.equal(quarter.allocation.plans[0].allocatedQuantity,1);assert.equal(quarter.allocation.plans[0].divisions.TNWL.allocatedQuantity,0.25);
 const kg=allocated(snapshot([row('kg',2,30,{unit:'Kg'})],[plan({TNWL:0.5},{unit:'Kg'})]));assert.equal(kg.summary[0].quantity,0.5);
});
test('bounded plan details preserve complete controls, reject excess categories and unsafe amounts',()=>{
 const plans=Array.from({length:501},(_,i)=>plan({TNWL:1},{id:'p'+i,masterCode:'M'+i})),q=query(snapshot([],plans));
 assert.equal(q.allocation.plans.length,500);assert.equal(q.allocation.planCount,501);assert.equal(q.allocation.plansTruncated,true);assert.equal(q.allocation.summary[0].shortfallQuantity,501);assert.equal(q.allocation.divisionControls.find(c=>c.division==='TNWL').shortfallQuantity,501);
 assert.throws(()=>query(snapshot([],plans.slice(0,251).map((p,i)=>({...p,productGroup:'Category'+i})))),/Too many/);
 assert.throws(()=>query(snapshot([row('unsafe',1e9,30,{revisedInrUnit:1e9})])),/precision/);
 assert.throws(()=>validateLaeAgingAllocationQuery({unknown:'1'}));assert.equal(validateLaeAgingAllocationQuery({page:'2'}).page,2);
});
test('bounded drilldown pagination and exact fixed precision values',()=>{
 const s=snapshot(Array.from({length:225},(_,i)=>row(i,1,30,{revisedInrUnit:0.1}))),q=query(s,{page:'2',pageSize:'100'});
 assert.equal(q.drilldown.rows.length,100);assert.equal(q.drilldown.total,225);assert.equal(q.summary[0].valueInr,22.5);
 assert.equal(query(s,{page:'9999999',pageSize:'100'}).drilldown.page,3);assert.equal(query(s,{page:'9999999',pageSize:'100'}).drilldown.rows.length,25);
 assert.equal(query(s,{bucket:'unknown'}).drilldown.total,0);
});
test('query input validation rejects unknown, malformed and unbounded filters',()=>{
 const s=snapshot([row('x')]);
 for(const q of [{view:'other'},{divisions:'none,TNWL'},{divisions:'TNWL,TNWL'},{divisions:'../../'},{bucket:'pending'},{warehouse:'W1'},{q:[]},{q:'x'.repeat(501)},{asOf:'2026-02-30'},{asOf:'2026-10-30'},{page:'0'},{page:'Infinity'},{pageSize:'201'},{pageSize:'0'},{page:1},new Date()])assert.throws(()=>query(s,q));
});
test('snapshot validation rejects broken identities, duplicate plans and invalid financial input',()=>{
 const good=snapshot([row('x')]);
 for(const change of [s=>s.rows.push({...s.rows[0]}),s=>s.plans.push({...s.plans[0],id:'other'}),s=>s.rows[0].planKey='absent',s=>s.rows[0].masterCode='other',s=>s.rows[0].quantity=Infinity,s=>s.rows[0].quantity=0.0000001,s=>s.rows[0].revisedInrUnit=-1,s=>s.rows[0].importDate='2026-02-30',s=>s.plans[0].quantities.TNWL=-1,s=>s.schemaVersion=2]){const s=structuredClone(good);change(s);assert.throws(()=>validateLaeAgingAllocationSnapshot(s));}
 assert.equal(validateLaeAgingAllocationSnapshot(good),good);
});
test('frozen preparation caching preserves queries and never leaks mutable cached controls',()=>{
 const s=freeze(snapshot([row('x',3)],[plan({TNWL:2})])),first=query(s);first.allocation.plans[0].divisions.TNWL.allocatedQuantity=999;first.snapshot.metadata.source='mutated';
 assert.equal(query(s).allocation.plans[0].divisions.TNWL.allocatedQuantity,2);assert.equal(s.metadata.source,'Synthetic test only');
 const m=snapshot([row('m',3)],[plan({TNWL:2})]);assert.equal(query(m).summary[0].quantity,3);m.rows[0].quantity=4;assert.equal(query(m).summary[0].quantity,4);
});
test('many deterministic scenarios conserve quotas, row capacities, signed stock and value',()=>{
 for(let seed=1;seed<=80;seed++){
  const rows=Array.from({length:9},(_,i)=>row(String(i),((seed*(i+3))%13)+1,i===8?null:20*i));rows.push(row('negative',-(seed%4),50));
  const s=snapshot(rows,[plan({TNWL:seed%23,HYD:(seed*7)%29,NORTH:(seed*3)%17,FH:seed%5})]),q=allocated(s),p=q.allocation.plans[0],total=q.drilldown.rows.reduce((n,r)=>n+r.quantity,0),byRow=new Map();
  assert.equal(total,p.allocatedQuantity);assert.equal(p.allocatedQuantity+p.unallocatedQuantity,p.stockQuantity);assert.equal(p.shortfallQuantity+p.allocatedQuantity,p.plannedQuantity);
  for(const r of q.drilldown.rows){assert.ok(r.quantity>0&&Number.isInteger(r.quantity));byRow.set(r.id,(byRow.get(r.id)||0)+r.quantity);}
  for(const r of rows)assert.ok((byRow.get(r.id)||0)<=Math.max(0,r.quantity));
  for(const [id,d] of Object.entries(p.divisions))assert.equal(q.drilldown.rows.filter(r=>r.division===id).reduce((n,r)=>n+r.quantity,0),d.allocatedQuantity);
  const c=q.allocation.summary[0];assert.ok(Math.abs(c.overall.knownValueInr-c.allocated.knownValueInr-c.unallocated.knownValueInr)<0.000001);
 }
});
test('exhaust all small four-division quotas, shortage capacities and ordered batch partitions',()=>{
 for(let a=0;a<=2;a++)for(let b=0;b<=2;b++)for(let c=0;c<=2;c++)for(let d=0;d<=2;d++){
  const demands=[a,b,c,d],total=a+b+c+d,divisions=['TNWL','HYD','NORTH','FH'];
  for(let cap=0;cap<=total;cap++)for(let mask=0;mask<(cap?2**(cap-1):1);mask++){
   const sizes=[];let chunk=0;for(let i=0;i<cap;i++){chunk++;if(i===cap-1||(mask&(1<<i))){sizes.push(chunk);chunk=0;}}
   const rows=sizes.map((qty,i)=>row(String(i),qty,100-i)),s=snapshot(rows,[plan(Object.fromEntries(divisions.map((v,i)=>[v,demands[i]])))]),q=allocated(s),p=q.allocation.plans[0];
   for(const [i,v] of divisions.entries()){
    const got=q.drilldown.rows.filter(r=>r.division===v).reduce((n,r)=>n+r.quantity,0);assert.equal(got,p.divisions[v].allocatedQuantity);assert.ok(got<=demands[i]);
   }
   for(const r of rows){const taken=q.drilldown.rows.filter(x=>x.id===r.id).reduce((n,x)=>n+x.quantity,0);assert.equal(taken,r.quantity);}
   assert.equal(q.drilldown.rows.reduce((n,r)=>n+r.quantity,0),cap);assert.equal(p.shortfallQuantity,total-cap);
  }
 }
});
