import test from 'node:test';
import assert from 'node:assert/strict';
import {LAE_AGING_DIVISIONS,LAE_AGING_STOCK_GROUPS,queryLaeAgingAllocation as query,validateLaeAgingAllocationQuery,validateLaeAgingAllocationSnapshot} from '../shared/lae-stock-aging-allocation.mjs';
const plan=(id,group)=>({id,productGroup:group,masterCode:id,unit:'Pcs',quantities:{TNWL:3,HYD:2,NORTH:1,FH:2}});
const row=(id,p,quantity,age,cost,extra={})=>({id,planKey:p.id,productGroup:p.productGroup,masterCode:p.masterCode,brandCode:'GJ-'+p.id,itemName:'Synthetic item',unit:'Pcs',warehouse:'Warehouse',quantity,importDate:age===null?null:new Date(Date.UTC(2026,9,31)-age*86400000).toISOString().slice(0,10),originalInrUnit:cost,revisedInrUnit:cost,quantityOnly:false,...extra});
const p=plan('PW1','POWER WEEDER'),c=plan('CC1','CHAFF CUTTER');
const snapshot=()=>({schemaVersion:1,stockDate:'2026-10-31',costDate:'2026-10-31',metadata:{},plans:[p,c],rows:[
 row('old',p,6,800,100,{engine:'170F',grade:'HG',vendor:'V01'}),
 row('new',p,4,30,200,{engine:'173F',grade:'RG',vendor:'V02'}),
 row('chaff',c,5,400,80,{blades:'4 blades',vendor:'V03'}),
 row('missing',c,1,30,null,{blades:'5 blades',vendor:'V04'}),
 row('zero',c,1,30,0)
]});
test('classification filters compose before all totals and pagination, without reallocating divisions',()=>{
 const s=snapshot(),before=structuredClone(s),all=query(s,{view:'allocated',pageSize:'200'});
 for(const selected of ['TNWL','HYD,FH','TNWL,HYD,NORTH,FH','none']){
  const result=query(s,{view:'allocated',divisions:selected,engine:'170F',grade:'HG',vendor:'V01',pageSize:'1'});
  const ds=selected.split(','),expected=all.drilldown.rows.filter(r=>r.id==='old'&&ds.includes(r.division));
  assert.equal(result.summary.reduce((n,r)=>n+r.quantity,0),expected.reduce((n,r)=>n+r.quantity,0));
  assert.equal(result.summary.reduce((n,r)=>n+r.knownValueInr,0),expected.reduce((n,r)=>n+r.valueInr,0));
  assert.equal(result.itemSummary.summary.reduce((n,r)=>n+r.quantity,0),expected.reduce((n,r)=>n+r.quantity,0));
  assert(result.drilldown.rows.length<=1);
  assert.match(result.allocation.planScopeNotice,/full matching item plans/);
 }
 const filtered=query(s,{productGroup:'CHAFF CUTTER',blades:'4 blades',vendor:'V03'});
 assert.equal(filtered.summary[0].quantity,5);assert.equal(filtered.summary[0].knownValueInr,400);
 assert.equal(filtered.summary[0].buckets['361-720'].quantity,5);
 assert.deepEqual(s,before);
});
test('facets follow category, retain alternative choices and expose absent data without guessing',()=>{
 const s=snapshot(),q=query(s,{productGroup:'POWER WEEDER',engine:'170F'});
 assert.deepEqual(q.facets.engines,['170F','173F']);assert.deepEqual(q.facets.grades,['HG','RG']);
 assert.deepEqual(q.facets.vendors,['V01','V02']);assert.deepEqual(q.facets.blades,['Not recorded']);
 assert.equal(query(s,{productGroup:'CHAFF CUTTER',blades:'Not recorded'}).summary[0].quantity,1);
 assert.equal(query(s,{grade:'UNKNOWN'}).summary.length,0);
 assert.throws(()=>validateLaeAgingAllocationSnapshot({...s,rows:[{...s.rows[0],engine:{value:'170F'}}]}),/classification/);
});
test('every bucket sorts independently in either direction, and display quantity changes the comparison',()=>{
 const ids=['A','B','C','D','E'],plans=ids.map(id=>plan(id,id));
 const rows=[row('a',plans[0],2,30,500),row('b',plans[1],10,30,10),row('c',plans[2],1,30,0),row('d',plans[3],1,30,null),row('e',plans[4],1,800,9999)];
 const s={...snapshot(),plans,rows};
 assert.deepEqual(query(s,{sort:'0-60'}).groups.map(r=>r.productGroup),['A','B','C','D','E']);
 assert.deepEqual(query(s,{sort:'0-60',direction:'asc'}).groups.map(r=>r.productGroup),['C','B','A','D','E']);
 assert.deepEqual(query(s,{sort:'0-60',display:'quantity'}).groups.map(r=>r.productGroup),['B','A','C','D','E']);
 assert.deepEqual(query(s,{sort:'721-1080'}).groups.map(r=>r.productGroup),['E','A','B','C','D']);
 assert.deepEqual(query(s,{sort:'category'}).groups.map(r=>r.productGroup),['E','D','C','B','A']);
 assert.deepEqual(query(s,{sort:'totalValue',display:'quantity'}).groups.map(r=>r.productGroup),['E','A','B','C','D']);
 assert.deepEqual(query(s,{sort:'totalValue',display:'quantity',direction:'asc'}).groups.map(r=>r.productGroup),['C','B','A','E','D']);
 const reference=query(s);
 for(const b of reference.buckets)for(const direction of ['asc','desc'])for(const display of ['both','value','quantity']){
  const actual=query(s,{sort:b.id,direction,display});assert.deepEqual(actual.summary,reference.summary);
 }
 assert.equal(query(s,{display:'both',sortMetric:'quantity'}).filters.sortMetric,'quantity');
 for(const bad of [{sort:'bogus'},{direction:'descending'},{display:'both,value'},{sortMetric:'cost'}])assert.throws(()=>validateLaeAgingAllocationQuery(bad),/display or sort/);
});

const residualSnapshot=()=>{
 const s=snapshot();s.plans=[structuredClone(p)];s.rows=s.rows.filter(r=>r.planKey===p.id);
 s.rows.push(row('adjustment',s.plans[0],-1,30,50,{engine:'173F',grade:'RG',vendor:'V02'}));return s;
};
const allStockGroups=LAE_AGING_STOCK_GROUPS.join(',');

test('Unallotted is a stock reporting group with no demand, preserving default four-division allocations',()=>{
 const s=residualSnapshot(),before=structuredClone(s),legacy=query(s,{view:'allocated',pageSize:'200'});
 assert.deepEqual(LAE_AGING_DIVISIONS,['TNWL','HYD','NORTH','FH']);
 assert.deepEqual(LAE_AGING_STOCK_GROUPS,[...LAE_AGING_DIVISIONS,'UNALLOTTED']);assert(Object.isFrozen(LAE_AGING_STOCK_GROUPS));
 const explicit=query(s,{view:'allocated',divisions:LAE_AGING_DIVISIONS.join(','),pageSize:'200'});
 assert.deepEqual(legacy.groups,explicit.groups);assert.deepEqual(legacy.summary,explicit.summary);assert.deepEqual(legacy.drilldown,explicit.drilldown);
 assert.equal(legacy.summary[0].quantity,8);assert.equal(legacy.summary[0].valueInr,1000);
 assert.equal(legacy.divisions.find(d=>d.id==='UNALLOTTED').selected,false);
 const all=query(s,{view:'allocated',divisions:allStockGroups,pageSize:'200'});
 assert.deepEqual(all.allocation,legacy.allocation);
 assert.deepEqual(all.allocation.divisionControls.map(d=>d.division),LAE_AGING_DIVISIONS);
 assert.deepEqual(Object.keys(all.allocation.plans[0].divisions),LAE_AGING_DIVISIONS);
 assert.equal(all.allocation.plans[0].plannedQuantity,8);assert.equal(all.allocation.plans[0].shortfallQuantity,0);
 assert.equal(all.facets.divisions.at(-1).label,'Unallotted');
 assert.throws(()=>validateLaeAgingAllocationSnapshot({...s,plans:[{...s.plans[0],quantities:{...s.plans[0].quantities,UNALLOTTED:2}}]}),/plan quantities/);
 assert.throws(()=>validateLaeAgingAllocationQuery({divisions:'UNALLOTTED,UNALLOTTED'}),/division/);
 assert.equal(validateLaeAgingAllocationQuery({divisions:'UNALLOTTED,HYD'}).divisions,'HYD,UNALLOTTED');
 assert.deepEqual(s,before);
});

test('Unallotted includes partial batches and signed adjustments; selecting all five exactly reconciles physical stock',()=>{
 const s=residualSnapshot(),u=query(s,{view:'allocated',divisions:'UNALLOTTED',pageSize:'200'}),overall=query(s),all=query(s,{view:'allocated',divisions:allStockGroups,pageSize:'200'});
 assert.equal(u.summary[0].quantity,1);assert.equal(u.summary[0].valueInr,350);assert.equal(u.summary[0].positive,2);assert.equal(u.summary[0].negative,-1);
 const partial=u.drilldown.rows.find(r=>r.id==='new'),negative=u.drilldown.rows.find(r=>r.id==='adjustment');
 assert.equal(partial.quantity,2);assert.equal(partial.sourceQuantity,4);assert.equal(partial.partialAllocation,true);assert.equal(partial.division,'UNALLOTTED');
 assert.equal(negative.quantity,-1);assert.equal(negative.valueInr,-50);assert.equal(negative.division,'UNALLOTTED');
 assert.equal(u.itemSummary.summary[0].quantity,1);assert.equal(u.itemSummary.summary[0].valueInr,350);
 assert.equal(all.summary[0].quantity,overall.summary[0].quantity);assert.equal(all.summary[0].valueInr,overall.summary[0].valueInr);
 for(const b of overall.buckets){assert.equal(all.summary[0].buckets[b.id].quantity,overall.summary[0].buckets[b.id].quantity);assert.equal(all.summary[0].buckets[b.id].knownValueInr,overall.summary[0].buckets[b.id].knownValueInr);}
 for(const r of s.rows)assert.equal(all.drilldown.rows.filter(e=>e.id===r.id).reduce((n,e)=>n+e.quantity,0),r.quantity);
 const mixed=query(s,{view:'allocated',divisions:'UNALLOTTED,TNWL',pageSize:'200'});
 assert.deepEqual(mixed.drilldown.rows,all.drilldown.rows.filter(r=>['TNWL','UNALLOTTED'].includes(r.division)));
 assert.equal(query(s,{view:'allocated',divisions:'none'}).summary.length,0);
});

test('Unallotted filters and pagination retain full filtered item totals without reallocating stock',()=>{
 const s=residualSnapshot(),options={view:'allocated',divisions:'UNALLOTTED',productGroup:'POWER WEEDER',engine:'173F',grade:'RG',vendor:'V02',q:'GJ-PW1',bucket:'0-60',pageSize:'1',sort:'0-60',direction:'asc',display:'quantity'};
 const a=query(s,options),b=query(s,{...options,page:'2'});
 assert.equal(a.drilldown.total,2);assert.equal(a.drilldown.rows.length,1);assert.equal(b.drilldown.rows.length,1);assert.notEqual(a.drilldown.rows[0].id,b.drilldown.rows[0].id);
 assert.deepEqual(a.summary,b.summary);assert.deepEqual(a.itemSummary,b.itemSummary);assert.equal(a.itemSummary.summary[0].quantity,1);assert.equal(a.itemSummary.summary[0].valueInr,350);
 assert.equal(a.allocation.plans[0].plannedQuantity,8);assert.equal(a.allocation.plans[0].allocatedQuantity,8);assert.match(a.allocation.planScopeNotice,/full matching item plans/);
 assert(a.drilldown.rows.every(r=>r.division==='UNALLOTTED'));assert.equal(query(s,{...options,vendor:'missing'}).groups.length,0);
});

test('five-group totals preserve fixed-point precision, pending values and negative-only stock',()=>{
 const p1={...plan('fractional','POWER WEEDER'),quantities:{TNWL:0.123456,HYD:0.234567,NORTH:0,FH:0}},s={...snapshot(),plans:[p1],rows:[
  row('fractional',p1,1.234567,300,12.345678),row('deduction',p1,-0.000001,20,7.000001),row('pending',p1,0.3,null,null),row('free',p1,0.2,20,0),row('quantity-only',p1,0.1,20,99,{quantityOnly:true})
 ]};
 for(const basis of ['original','revised']){
  const overall=query(s,{basis}),all=query(s,{basis,view:'allocated',divisions:allStockGroups});
  for(const k of ['quantity','valueInr','knownValueInr','knownQty','pendingQty','pendingPositiveQty','quantityOnlyQty','negative'])assert.equal(all.summary[0][k],overall.summary[0][k],k);
  const product=1234567n*12345678n-1n*7000001n,expected=Number((product+500000n)/1000000n)/1e6;
  assert.equal(all.summary[0].knownValueInr,expected);assert.equal(all.summary[0].pendingPositiveQty,0.3);assert.equal(all.summary[0].quantityOnlyQty,0.1);
 }
 const negativePlan={...p1,quantities:{TNWL:1,HYD:0,NORTH:0,FH:0}},negativeOnly={...s,plans:[negativePlan],rows:[row('negative-only',negativePlan,-2,20,7)]},u=query(negativeOnly,{view:'allocated',divisions:'UNALLOTTED'});
 assert.equal(u.summary[0].quantity,-2);assert.equal(u.summary[0].valueInr,-14);assert.equal(u.drilldown.rows[0].division,'UNALLOTTED');
 assert.equal(query(negativeOnly,{view:'allocated'}).groups.length,0);
});

test('category types partition all age totals and division allocations without changing costs',()=>{
 for(const [category,attribute,types] of [['POWER WEEDER','engine',['170F','173F']],['BRUSH CUTTER','engine',['GX35-SP','52CC-BP']],['CHAFF CUTTER','blades',['4 blades','5 blades']]]){
  const s=snapshot();s.plans=[plan('TEST',category)];s.rows=[row('one',s.plans[0],7,30,100,{[attribute]:types[0]}),row('two',s.plans[0],3,400,200,{[attribute]:types[1]}),row('missing',s.plans[0],1,null,null),row('negative',s.plans[0],-1,30,100,{[attribute]:types[0]})];
  const before=structuredClone(s);
  for(const options of [{},{view:'allocated',divisions:'TNWL,FH,UNALLOTTED'},{view:'allocated',divisions:'none'}]){
   const base=query(s,options),grouped=query(s,{...options,productGroup:category,pageSize:'1'});
   assert.deepEqual(grouped.summary,base.summary);assert.deepEqual(grouped.allocation,base.allocation);
   for(const g of grouped.groups){
    assert.equal(g.groupAttribute,attribute);
    const detail=query(s,{...options,productGroup:category,[attribute]:g.groupValue,...(g.division?{divisions:g.division}:{}),pageSize:'1'});
    assert.equal(detail.itemSummary.summary[0].quantity,g.quantity);assert.equal(detail.itemSummary.summary[0].knownValueInr,g.knownValueInr);
    for(const bucket of grouped.buckets)assert.deepEqual(detail.summary[0].buckets[bucket.id],g.buckets[bucket.id]);
   }
   if(grouped.summary.length){assert.equal(grouped.groups.reduce((n,g)=>n+g.quantity,0),grouped.summary[0].quantity);assert.equal(grouped.groups.reduce((n,g)=>n+g.knownValueInr,0),grouped.summary[0].knownValueInr);}
  }
  assert.deepEqual(query(s,{productGroup:category,sort:'category',direction:'asc'}).groups.map(g=>g.groupValue),[...types,'Not recorded'].sort((a,b)=>a.localeCompare(b,'en',{numeric:true,sensitivity:'base'})));
  assert.deepEqual(s,before);
 }
});
