import test from 'node:test';
import assert from 'node:assert/strict';
import {queryLaeAgingAllocation as query,validateLaeAgingAllocationSnapshot as validate} from '../shared/lae-stock-aging-allocation.mjs';

// Independent acceptance examples derived from LAE-ALLOC-01, not the allocator's helpers.
const stockDate='2026-10-31',divisions=['TNWL','HYD','NORTH','FH'];
const demands=extra=>({TNWL:0,HYD:0,NORTH:0,FH:0,...extra});
const date=days=>new Date(Date.parse(stockDate+'T00:00:00Z')-days*86400000).toISOString().slice(0,10);
const plan=(id,brandQuantities,extra={})=>({id,productGroup:'Pump',masterCode:id,unit:'Pcs',quantities:Object.fromEntries(divisions.map(d=>[d,Object.values(brandQuantities).reduce((n,q)=>n+(q[d]??0),0)])),brandQuantities:Object.fromEntries(Object.entries(brandQuantities).map(([b,q])=>[b,demands(q)])),...extra});
const row=(id,p,brand,quantity,days=30,extra={})=>({id,planKey:p.id,productGroup:p.productGroup,masterCode:p.masterCode,unit:p.unit,brandCode:brand,allocationBrand:brand,itemName:'Synthetic '+p.id,warehouse:'W1',quantity,importDate:date(days),originalInrUnit:10,revisedInrUnit:12,quantityOnly:false,...extra});
const snapshot=(plans,rows,extra={})=>({schemaVersion:1,allocationPolicy:'brand-first-v1',stockDate,costDate:stockDate,plans,rows,metadata:{source:'Independent synthetic acceptance cases'},...extra});
const report=(s,q={})=>query(s,{view:'allocated',divisions:'TNWL,HYD,NORTH,FH,UNALLOTTED',pageSize:'200',...q});
const detail=(r,source,division)=>r.drilldown.rows.filter(x=>x.id===source&&(!division||x.division===division)).reduce((n,x)=>n+x.quantity,0);
const control=(r,id)=>r.allocation.plans.find(p=>p.id===id);
const equivalence=p=>({id:'eq-'+p.id,planKey:p.id,brands:['A','B'],status:'confirmed',decisionId:'USER-SYNTHETIC-001',evidence:'Synthetic explicit branding-only decision'});

test('review: exact brands protect their own demand before an older other-brand batch',()=>{
 const p=plan('M1',{A:{TNWL:1},B:{HYD:1}}),s=snapshot([p],[row('B-old',p,'B',1,800),row('A-new',p,'A',1,10)],{equivalenceGroups:[equivalence(p)]});
 const r=report(s);
 assert.equal(detail(r,'A-new','TNWL'),1);assert.equal(detail(r,'B-old','HYD'),1);
 assert.equal(detail(r,'B-old','TNWL'),0);assert.equal(control(r,'M1').shortfallQuantity,0);
});

test('review: only confirmed equivalence can consume residual stock for residual demand',()=>{
 const p=plan('M1',{A:{TNWL:1},B:{HYD:2}}),s=snapshot([p],[row('A',p,'A',2)]),without=report(s);
 assert.equal(detail(without,'A','TNWL'),1);assert.equal(detail(without,'A','HYD'),0);assert.equal(detail(without,'A','UNALLOTTED'),1);
 const withDecision=report({...s,equivalenceGroups:[equivalence(p)]});
 assert.equal(detail(withDecision,'A','TNWL'),1);assert.equal(detail(withDecision,'A','HYD'),1);assert.equal(control(withDecision,'M1').shortfallQuantity,1);
 assert.equal(withDecision.drilldown.rows.find(r=>r.division==='HYD').brandCode,'A');
 const rejected={...s,equivalenceGroups:[{...equivalence(p),status:'pending'}]};
 assert.throws(()=>validate(rejected));
});

test('review: own-brand shortage is proportional and a serialized tie is assigned once',()=>{
 const p=plan('M1',{A:{TNWL:60,FH:40}}),r=report(snapshot([p],[row('stock',p,'A',50)]));
 assert.equal(detail(r,'stock','TNWL'),30);assert.equal(detail(r,'stock','FH'),20);assert.equal(control(r,'M1').shortfallQuantity,50);
 const tie=plan('TIE',{A:{TNWL:1,HYD:1,NORTH:1,FH:1}}),one=report(snapshot([tie],[row('serial',tie,'A',1)]));
 assert.equal(detail(one,'serial','TNWL'),1);assert.equal(one.drilldown.rows.filter(r=>r.division!=='UNALLOTTED').length,1);
});

test('review: substitution shortages use unmet brand demand after protected exact allocations',()=>{
 const p=plan('M1',{A:{TNWL:20},B:{TNWL:60,FH:40}}),s=snapshot([p],[row('A-stock',p,'A',70)],{equivalenceGroups:[equivalence(p)]}),r=report(s);
 // Twenty exact A units, then fifty residual units split 30/20 against B demand 60/40.
 assert.equal(detail(r,'A-stock','TNWL'),50);assert.equal(detail(r,'A-stock','FH'),20);assert.equal(control(r,'M1').shortfallQuantity,50);
});

test('review: unrelated fractional stock cannot split a whole piece in an exact brand pool',()=>{
 const p=plan('M1',{A:{TNWL:1,HYD:1},B:{}}),r=report(snapshot([p],[row('serialized-A',p,'A',1),row('fractional-B',p,'B',0.5)]));
 assert.equal(detail(r,'serialized-A','TNWL'),1);assert.equal(detail(r,'serialized-A','HYD'),0);assert.equal(detail(r,'fractional-B','UNALLOTTED'),0.5);
});

test('review: negative adjustments reduce only their exact identity and preserve signed source value',()=>{
 const p=plan('M1',{A:{TNWL:10},B:{HYD:5}}),s=snapshot([p],[row('A-positive',p,'A',10,200),row('A-negative',p,'A',-2,20,{originalInrUnit:7,revisedInrUnit:9}),row('B-positive',p,'B',5,100)]),r=report(s),overall=query(s);
 assert.equal(detail(r,'A-positive','TNWL'),8);assert.equal(detail(r,'B-positive','HYD'),5);
 assert.ok(r.drilldown.rows.filter(x=>x.division!=='UNALLOTTED').every(x=>x.quantity>0));
 assert.equal(detail(r,'A-negative','UNALLOTTED'),-2);assert.equal(detail(r,'A-positive','UNALLOTTED'),2);
 const offset=r.drilldown.rows.find(x=>x.id==='A-positive'&&x.division==='UNALLOTTED');assert.equal(offset.adjustmentOffsetQuantity,2);assert.equal(offset.surplusQuantity,0);
 assert.equal(r.summary[0].quantity,13);assert.equal(r.summary[0].valueInr,162);assert.equal(overall.summary[0].valueInr,162);
});

test('review: declared equivalence rejects conflicting supported specifications',()=>{
 const p=plan('M1',{A:{TNWL:1},B:{HYD:1}}),s=snapshot([p],[row('A',p,'A',2,20,{engine:'170F',vendor:'V1'}),row('B',p,'B',0,30,{engine:'173F',vendor:'V1'})],{equivalenceGroups:[equivalence(p)]});
 assert.throws(()=>validate(s));
});

test('review: exact identity does not conceal conflicting supported physical specifications',()=>{
 const p=plan('M1',{A:{TNWL:2}}),s=snapshot([p],[row('A170',p,'A',1,20,{engine:'170F'}),row('A173',p,'A',1,30,{engine:'173F'})]);
 assert.throws(()=>validate(s));
});

test('review: shallow frozen policy inputs never produce stale cached brand allocations',()=>{
 const p=plan('M1',{A:{TNWL:1},B:{HYD:1}}),s=snapshot([p],[row('A',p,'A',1),row('B',p,'B',1)]);
 Object.freeze(p.quantities);Object.freeze(p);s.rows.forEach(Object.freeze);Object.freeze(s.rows);Object.freeze(s.plans);Object.freeze(s);
 assert.equal(control(report(s),'M1').allocatedQuantity,2);
 p.brandQuantities.A.TNWL=0;p.brandQuantities.A.HYD=0;p.brandQuantities.B.TNWL=1;p.brandQuantities.B.HYD=1;
 const changed=report(s);assert.equal(control(changed,'M1').allocatedQuantity,1);assert.equal(detail(changed,'B','TNWL'),1);
});

test('review: motor companions replace independent demand and retain each physical component value and age',()=>{
 const machine=plan('CC1',{DAWN:{TNWL:2,HYD:2}},{productGroup:'Chaff cutter'}),motor=plan('CCM10',{MOTOR:{FH:99}},{productGroup:'Motor'});
 const rule={id:'pair-CCM10',motorPlanKey:motor.id,motorBrand:'MOTOR',machinePlanKeys:[machine.id],machineBrands:['DAWN'],quantityPerMachine:1,status:'confirmed',decisionId:'USER-SYNTHETIC-MOTOR',evidence:'Synthetic compatible chaff cutter motor decision'};
 const s=snapshot([machine,motor],[row('machine',machine,'DAWN',4,800,{originalInrUnit:100,revisedInrUnit:120}),row('motor',motor,'MOTOR',2,20,{originalInrUnit:20,revisedInrUnit:30})],{companionRules:[rule]});
 for(const [basis,total,old,young] of [['original',440,400,40],['revised',540,480,60]]){
  const r=report(s,{basis});assert.equal(r.summary[0].quantity,6);assert.equal(r.summary[0].valueInr,total);
  assert.equal(r.summary[0].buckets['721-1080'].valueInr,old);assert.equal(r.summary[0].buckets['0-60'].valueInr,young);
  assert.equal(detail(r,'motor','TNWL'),1);assert.equal(detail(r,'motor','HYD'),1);assert.equal(detail(r,'motor','FH'),0);
  assert.equal(control(r,'CCM10').plannedQuantity,4);assert.equal(control(r,'CCM10').shortfallQuantity,2);
  assert.equal(query(s,{basis}).summary[0].valueInr,total);
 }
});

test('review: companion scope excludes other machine brands and woodchoppers; true excess remains stock',()=>{
 const machine=plan('CC1',{DAWN:{TNWL:1},OTHER:{HYD:3}},{productGroup:'Chaff cutter'}),wood=plan('WC1',{DAWN:{FH:2}},{productGroup:'Woodchopper'}),motor=plan('CCM10',{MOTOR:{FH:9}},{productGroup:'Motor'});
 const rule={id:'pair-scope',motorPlanKey:motor.id,motorBrand:'MOTOR',machinePlanKeys:[machine.id],machineBrands:['DAWN'],quantityPerMachine:1,status:'confirmed',decisionId:'USER-SYNTHETIC-SCOPE',evidence:'Synthetic Dawn chaff-only scope'};
 const s=snapshot([machine,wood,motor],[row('dawn',machine,'DAWN',1),row('other',machine,'OTHER',3),row('wood',wood,'DAWN',2),row('motor',motor,'MOTOR',2)],{companionRules:[rule]}),r=report(s);
 assert.equal(control(r,'CCM10').plannedQuantity,1);assert.equal(control(r,'CCM10').shortfallQuantity,0);
 assert.equal(detail(r,'motor','TNWL'),1);assert.equal(detail(r,'motor','HYD'),0);assert.equal(detail(r,'motor','FH'),0);assert.equal(detail(r,'motor','UNALLOTTED'),1);
 assert.equal(r.summary[0].quantity,8);
 assert.throws(()=>validate({...s,companionRules:[{...rule,machinePlanKeys:[wood.id]}]}));
});

test('review: component links page independently without truncating controls or leaking mutable cache data',()=>{
 const machine=plan('CC1',{DAWN:{TNWL:201}},{productGroup:'Chaff cutter'}),motor=plan('CCM10',{MOTOR:{FH:500}},{productGroup:'Motor'}),rule={id:'many-pairs',motorPlanKey:motor.id,motorBrand:'MOTOR',machinePlanKeys:[machine.id],machineBrands:['DAWN'],quantityPerMachine:1,status:'confirmed',decisionId:'USER-SYNTHETIC-PAGES',evidence:'Synthetic bounded pairing test'};
 const s=snapshot([machine,motor],[...Array.from({length:201},(_,i)=>row('machine-'+String(i).padStart(3,'0'),machine,'DAWN',1,200-i)),row('motor',motor,'MOTOR',201,20)],{companionRules:[rule]});
 const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};freeze(s);
 const first=report(s,{pageSize:'2'}),second=report(s,{pageSize:'2',companionPage:'2'}),c=first.allocation.companions;
 assert.equal(c.links.total,201);assert.equal(c.links.rows.length,2);assert.equal(second.allocation.companions.links.rows.length,2);
 assert.notEqual(c.links.rows[0].componentLinkId,second.allocation.companions.links.rows[0].componentLinkId);
 assert.deepEqual(c.rules,second.allocation.companions.rules);assert.equal(c.rules[0].motorRequirementQuantity,201);assert.equal(c.rules[0].motorAllocatedQuantity,201);
 assert.equal(first.summary[0].quantity,402);assert.equal(first.summary[0].valueInr,4824);
 assert.equal(first.drilldown.rows[0].componentAllocationId,first.drilldown.rows[0].allocationId);
 assert.ok(c.links.rows.every(l=>l.machine.allocationId&&l.motor.allocationId));
 c.links.rows[0].motor.quantity=999;c.rules[0].motorAllocatedQuantity=999;first.allocation.plans[0].brandControls[0].allocatedQuantity=999;
 const fresh=report(s,{pageSize:'2'});assert.equal(fresh.allocation.companions.links.rows[0].motor.quantity,1);assert.equal(fresh.allocation.companions.rules[0].motorAllocatedQuantity,201);
 assert.equal(control(fresh,'CC1').brandControls[0].allocatedQuantity,201);assert.throws(()=>report(s,{companionPage:'0'}));
});

test('review: public brand detail is bounded while complete demand and stock controls remain exact',()=>{
 const brands=Object.fromEntries(Array.from({length:100},(_,i)=>['B'+i,{TNWL:1}])),plans=Array.from({length:20},(_,i)=>plan('M'+i,brands)),s=snapshot(plans,plans.map(p=>row('stock-'+p.id,p,'B0',1))),r=report(s);
 assert.equal(r.allocation.brandControlCount,2000);assert.equal(r.allocation.brandControlsReturned,1000);assert.equal(r.allocation.brandControlsTruncated,true);
 assert.equal(r.allocation.plans.reduce((n,p)=>n+p.brandControls.length,0),1000);
 assert.equal(r.allocation.plans.reduce((n,p)=>n+p.plannedQuantity,0),2000);assert.equal(r.allocation.plans.reduce((n,p)=>n+p.shortfallQuantity,0),1980);
 assert.equal(r.allocation.divisionControls.find(d=>d.division==='TNWL').plannedQuantity,2000);assert.equal(r.summary[0].quantity,20);
 assert.ok(r.allocation.plans.some(p=>p.brandControlsTruncated));
});

test('review: filters, sort and page retain globally decided ownership',()=>{
 const p=plan('M1',{A:{TNWL:2,HYD:1},B:{HYD:2}}),s=snapshot([p],[row('A',p,'A',2,800,{vendor:'V1'}),row('B',p,'B',2,20,{vendor:'V2'})],{equivalenceGroups:[equivalence(p)]}),all=report(s);
 for(const division of divisions){const filtered=report(s,{divisions:division});assert.deepEqual(filtered.drilldown.rows,all.drilldown.rows.filter(x=>x.division===division));}
 assert.deepEqual(report(s,{q:'B'}).drilldown.rows,all.drilldown.rows.filter(x=>x.brandCode==='B'));
 assert.deepEqual(report(s,{vendor:'V1'}).drilldown.rows,all.drilldown.rows.filter(x=>x.id==='A'));
 assert.deepEqual(report(s,{bucket:'721-1080'}).drilldown.rows,all.drilldown.rows.filter(x=>x.bucket==='721-1080'));
 assert.deepEqual(report(s,{pageSize:'1',page:'2',sort:'category',direction:'asc'}).allocation.divisionControls,all.allocation.divisionControls);
 assert.equal(report(s,{divisions:'none'}).summary.length,0);
});

test('review: a legacy v1 snapshot retains its historical master-pool result without policy opt-in',()=>{
 const p=plan('M1',{A:{TNWL:1},B:{HYD:1}}),s=snapshot([p],[row('B-old',p,'B',1,800),row('A-new',p,'A',1,10)]);
 delete s.allocationPolicy;delete p.brandQuantities;s.rows.forEach(r=>delete r.allocationBrand);
 const r=report(s);assert.equal(detail(r,'B-old','TNWL'),1);assert.equal(detail(r,'A-new','HYD'),1);
});
