import test from 'node:test';
import assert from 'node:assert/strict';
import {queryLaeAgingAllocation as query,validateLaeAgingAllocationQuery,validateLaeAgingAllocationSnapshot} from '../shared/lae-stock-aging-allocation.mjs';
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
