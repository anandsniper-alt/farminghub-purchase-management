import test from 'node:test';
import assert from 'node:assert/strict';
import {queryLaeAgingAllocation as query,validateLaeAgingAllocationSnapshot as validate} from '../shared/lae-stock-aging-allocation.mjs';

const divisions=['TNWL','HYD','NORTH','FH'],ds=values=>Object.fromEntries(divisions.map((d,i)=>[d,values[i]??0]));
const plan=(id,brands,extra={})=>({id,masterCode:id,productGroup:'Pump',unit:'Pcs',brandQuantities:Object.fromEntries(Object.entries(brands).map(([b,v])=>[b,ds(v)])),quantities:ds(divisions.map((d,i)=>Object.values(brands).reduce((n,v)=>n+(v[i]??0),0))),...extra});
const row=(id,p,brand,quantity,days=30,extra={})=>({id,planKey:p.id,masterCode:p.masterCode,productGroup:p.productGroup,unit:p.unit,brandCode:brand,allocationBrand:brand,itemName:p.masterCode,warehouse:'W',quantity,importDate:new Date(Date.parse('2026-10-31')-days*86400000).toISOString().slice(0,10),originalInrUnit:10,revisedInrUnit:12,quantityOnly:false,...extra});
const snap=(plans,rows,extra={})=>({schemaVersion:1,allocationPolicy:'brand-first-v1',stockDate:'2026-10-31',costDate:'2026-10-31',plans,rows,...extra});
const eq=p=>({id:'equivalence',planKey:p.id,brands:['A','B','C'],status:'confirmed',decisionId:'test-approved',evidence:'Synthetic branding-only decision'});
const report=(s,q={})=>query(s,{view:'allocated',divisions:'TNWL,HYD,NORTH,FH,UNALLOTTED',pageSize:'200',...q});
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};

test('brand policy: serialized FIFO carries quotas and source identity remains unchanged',()=>{
 const p=plan('P',{A:[70,30]}),s=snap([p],Array.from({length:100},(_,i)=>row(String(i).padStart(3,'0'),p,'A',1,200-i,{brandCode:'SOURCE A',assignedRO:'R1',priceReferenceRO:'R2',ageBasis:'SOURCE_IMPORT_AGE'}))),before=structuredClone(s),r=report(s);
 const first=r.drilldown.rows.filter(r=>Number(r.id)<10);
 assert.equal(first.filter(r=>r.division==='TNWL').length,7);assert.equal(first.filter(r=>r.division==='HYD').length,3);
 assert.ok(r.drilldown.rows.every(r=>r.brandCode==='SOURCE A'&&r.allocationBrand==='A'&&r.forecastBrand==='A'&&r.matchType==='exact'&&r.assignedRO==='R1'&&r.priceReferenceRO==='R2'&&r.ageBasis==='SOURCE_IMPORT_AGE'));
 assert.deepEqual(s,before);
});

test('brand policy: unrecognized stock remains held and negative offsets are traceable on newest residue',()=>{
 const p=plan('P',{A:[10],B:[0,1]}),s=snap([p],[row('old',p,'A',4,300),row('new',p,'A',6,10),row('adjustment',p,'A',-3),row('unknown',p,'UNRESOLVED-FULL-CODE',8)]),r=report(s),residue=r.drilldown.rows.filter(r=>r.division==='UNALLOTTED');
 assert.equal(residue.find(r=>r.id==='new').adjustmentOffsetQuantity,3);assert.equal(residue.find(r=>r.id==='new').surplusQuantity,0);assert.equal(residue.find(r=>r.id==='adjustment').quantity,-3);
 assert.equal(residue.find(r=>r.id==='unknown').quantity,8);assert.equal(residue.find(r=>r.id==='unknown').unallocatedReason,'unresolved-or-no-demand');
 const a=r.allocation.plans[0].brandControls.find(b=>b.forecastBrand==='A');assert.equal(a.negativeAdjustmentQuantity,-3);assert.equal(a.positiveAdjustmentOffsetQuantity,3);assert.equal(a.executableStockQuantity,7);
});

test('brand policy: multiple residual forecast brands on one source have unique allocation identities',()=>{
 const p=plan('P',{A:[1],B:[2],C:[3]}),s=snap([p],[row('source',p,'A',6)],{equivalenceGroups:[eq(p)]}),r=report(s);
 assert.equal(r.drilldown.rows.length,3);assert.equal(new Set(r.drilldown.rows.map(r=>r.allocationId)).size,3);
 assert.deepEqual(r.drilldown.rows.map(r=>[r.forecastBrand,r.quantity,r.matchType]),[['A',1,'exact'],['B',2,'equivalent'],['C',3,'equivalent']]);
 assert.equal(r.itemSummary.rows.length,3);assert.equal(r.itemSummary.summary[0].quantity,6);
});

test('brand policy: 300 deterministic mixed-brand cases conserve demand, supply, values and approved substitutions',()=>{
 for(let seed=1;seed<=300;seed++){
  const brands=['A','B','C'],p=plan('P',Object.fromEntries(brands.map((b,j)=>[b,divisions.map((d,i)=>(seed*(j+2)+i*5)%13)]))),rows=brands.flatMap((b,j)=>[row(b+'old',p,b,(seed*(j+3))%11+1,300,{revisedInrUnit:11.123456+j}),row(b+'new',p,b,(seed+j)%7,20,{revisedInrUnit:13.654321+j}),row(b+'negative',p,b,-(seed+j)%4,50,{revisedInrUnit:7.1+j})]),s=snap([p],rows,{equivalenceGroups:[eq(p)]}),r=report(s),allocated=r.drilldown.rows.filter(r=>r.division!=='UNALLOTTED'),control=r.allocation.plans[0];
  assert.equal(r.summary[0].quantity,rows.reduce((n,r)=>n+r.quantity,0));
  assert.ok(Math.abs(r.summary[0].knownValueInr-rows.reduce((n,r)=>n+r.quantity*r.revisedInrUnit,0))<0.000001);
  assert.equal(control.allocatedQuantity+control.shortfallQuantity,control.plannedQuantity);
  for(const source of rows)assert.equal(r.drilldown.rows.filter(r=>r.id===source.id).reduce((n,r)=>n+r.quantity,0),source.quantity||0);
  for(const brand of brands){const stock=rows.filter(r=>r.allocationBrand===brand).reduce((n,r)=>n+r.quantity,0),got=allocated.filter(r=>r.allocationBrand===brand).reduce((n,r)=>n+r.quantity,0);assert.ok(got<=Math.max(0,stock));
   const demand=p.brandQuantities[brand],own=allocated.filter(r=>r.matchType==='exact'&&r.allocationBrand===brand).reduce((n,r)=>n+r.quantity,0);assert.equal(own,Math.min(Math.max(0,stock),Object.values(demand).reduce((a,b)=>a+b,0)));
   for(const division of divisions)assert.ok(allocated.filter(r=>r.forecastBrand===brand&&r.division===division).reduce((n,r)=>n+r.quantity,0)<=demand[division]);
  }
  assert.ok(allocated.every(r=>Number.isInteger(r.quantity)&&r.quantity>0&&(r.matchType==='exact'||r.equivalenceDecisionId==='test-approved')));
 }
});

test('brand policy: fractional supply preserves its source quantum across own-brand and residual passes',()=>{
 const p=plan('P',{A:[1,1],B:[0,1],C:[0]}),s=snap([p],[row('A',p,'A',1.5),row('B',p,'B',2.5)],{equivalenceGroups:[eq(p)]}),r=report(s);
 assert.equal(r.allocation.plans[0].allocatedQuantity,3);assert.equal(r.summary[0].quantity,4);assert.equal(r.summary[0].knownValueInr,48);
 assert.equal(r.allocation.plans[0].shortfallQuantity,0);assert.equal(r.allocation.plans[0].unallocatedQuantity,1);
});

test('brand policy: strict validation rejects inconsistent quantities, overlapping rules and physical conflicts',()=>{
 const p=plan('P',{A:[1],B:[0,1],C:[0]}),good=snap([p],[row('a',p,'A',2),row('b',p,'B',2)],{equivalenceGroups:[eq(p)]});
 const invalid=[s=>s.allocationPolicy='other',s=>delete s.rows[0].allocationBrand,s=>s.plans[0].brandQuantities.A.TNWL=2,s=>s.plans[0].brandQuantities.A.TNWL=-1,s=>s.plans[0].brandQuantities.A.EXTRA=0,s=>s.equivalenceGroups[0].status='pending',s=>s.equivalenceGroups[0].evidence='',s=>s.equivalenceGroups.push({...s.equivalenceGroups[0],id:'overlap'}),s=>s.equivalenceGroups[0].brands.push('UNKNOWN'),s=>s.equivalenceGroups[0].brands.push('A'),s=>{s.rows[0].engine='170F';s.rows.push({...s.rows[0],id:'a2',engine:'173F'});}];
 for(const change of invalid){const s=structuredClone(good);change(s);assert.throws(()=>validate(s));}
});

test('brand policy: companion source gates, pending costs and link quantities stay physical',()=>{
 const p=plan('CC1',{DAWN:[3,1]},{productGroup:'Chaff cutter'}),m=plan('CCM10',{MOTOR:[0,0,0,99]},{productGroup:'Motor'}),rule={id:'pair',motorPlanKey:m.id,motorBrand:'MOTOR',machinePlanKeys:[p.id],machineBrands:['DAWN'],quantityPerMachine:1,status:'confirmed',decisionId:'approved',evidence:'Synthetic',machineSourceRowIds:['eligible'],motorSourceRowIds:['motor','adjustment']};
 const s=freeze(snap([p,m],[row('eligible',p,'DAWN',2,800,{revisedInrUnit:null}),row('outside-source-proof',p,'DAWN',2,700),row('motor',m,'MOTOR',2,30,{revisedInrUnit:0}),row('adjustment',m,'MOTOR',-1,20)],{companionRules:[rule]})),r=report(s),c=r.allocation.companions.rules[0],links=r.allocation.companions.links.rows;
 assert.equal(c.machineAllocatedQuantity,2);assert.equal(c.motorRequirementQuantity,2);assert.equal(c.motorAllocatedQuantity,1);assert.equal(c.motorShortfallQuantity,1);assert.equal(c.machinePendingQty,2);assert.equal(c.motorKnownValueInr,0);
 assert.equal(links.reduce((n,l)=>n+l.quantity,0),2);assert.equal(links.filter(l=>l.motor).reduce((n,l)=>n+l.quantity,0),1);
 assert.ok(links.every(l=>l.machine.sourceRowId==='eligible'&&l.machine.valueInr===null&&l.machine.bucket==='721-1080'&&(!l.motor||l.motor.valueInr===0&&l.motor.bucket==='0-60')));
 assert.equal(r.allocation.plans.find(p=>p.id===m.id).forecastPlannedQuantity,99);assert.equal(r.allocation.plans.find(p=>p.id===m.id).plannedQuantity,2);
 const bad=structuredClone(s);bad.companionRules[0].motorSourceRowIds.push('outside-source-proof');assert.throws(()=>validate(bad));
});

test('brand policy: malformed, duplicate and cross-unit companion definitions are rejected',()=>{
 const p=plan('CC1',{DAWN:[2]},{productGroup:'Chaff cutter'}),m=plan('CCM10',{MOTOR:[2]},{productGroup:'Motor'}),rule={id:'pair',motorPlanKey:m.id,motorBrand:'MOTOR',machinePlanKeys:[p.id],machineBrands:['DAWN'],quantityPerMachine:1,status:'confirmed',decisionId:'approved',evidence:'Synthetic'},good=snap([p,m],[row('machine',p,'DAWN',2),row('motor',m,'MOTOR',2)],{companionRules:[rule]});
 for(const change of [s=>s.companionRules.push({...s.companionRules[0],id:'duplicate-motor'}),s=>s.companionRules[0].quantityPerMachine=2,s=>s.companionRules[0].motorBrand='UNKNOWN',s=>s.companionRules[0].machineBrands.push('UNKNOWN'),s=>{s.plans[1].unit='Kg';s.rows[1].unit='Kg';},s=>{s.plans[0].masterCode='WC1';s.rows[0].masterCode='WC1';}]){const s=structuredClone(good);change(s);assert.throws(()=>validate(s));}
});

test('brand policy: nested brand controls are bounded without truncating plan or division totals',()=>{
 const plans=Array.from({length:11},(_,i)=>plan('P'+i,Object.fromEntries(Array.from({length:100},(_,j)=>['BRAND'+j,[1]])))),r=query(snap(plans,[]));
 assert.equal(r.allocation.brandControlCount,1100);assert.equal(r.allocation.brandControlsReturned,1000);assert.equal(r.allocation.brandControlsTruncated,true);
 assert.equal(r.allocation.plans.flatMap(p=>p.brandControls).length,1000);assert.equal(r.allocation.plans[10].brandControlCount,100);assert.equal(r.allocation.plans[10].brandControlsTruncated,true);
 assert.equal(r.allocation.summary[0].plannedQuantity,1100);assert.equal(r.allocation.summary[0].shortfallQuantity,1100);assert.equal(r.allocation.divisionControls[0].plannedQuantity,1100);
});

test('brand policy: a suppressed motor forecast remains visible even with zero allocated machines',()=>{
 const p=plan('CC1',{DAWN:[0]},{productGroup:'Chaff cutter'}),m=plan('CCM10',{MOTOR:[0,0,0,99]},{productGroup:'Motor'}),rule={id:'pair',motorPlanKey:m.id,motorBrand:'MOTOR',machinePlanKeys:[p.id],machineBrands:['DAWN'],quantityPerMachine:1,status:'confirmed',decisionId:'approved',evidence:'Synthetic'},s=snap([p,m],[row('machine',p,'DAWN',1),row('motor',m,'MOTOR',2)],{companionRules:[rule]}),r=report(s);
 assert.equal(r.allocation.companions.rules[0].motorRequirementQuantity,0);assert.equal(r.allocation.companions.rules[0].suppressedForecastQuantity,99);assert.equal(r.allocation.companions.links.total,0);
 assert.equal(r.drilldown.rows.filter(r=>r.division==='UNALLOTTED').reduce((n,r)=>n+r.quantity,0),3);assert.equal(report(s,{divisions:'none'}).allocation.companions.rules.length,0);
});

test('brand policy: an admitted large single identity pool does not overflow argument or response limits',()=>{
 const count=138320,p=plan('P',{A:[count]}),source=row('source',p,'A',1),s=snap([p],Array.from({length:count},(_,i)=>({...source,id:String(i)}))),r=query(s,{pageSize:'1'});
 assert.equal(r.allocation.plans[0].allocatedQuantity,count);assert.equal(r.allocation.summary[0].overall.quantity,count);assert.equal(r.drilldown.rows.length,1);assert.equal(r.drilldown.total,count);
 assert.throws(()=>validate({...s,rows:new Array(200001)}));
});

test('brand policy: unrelated fractions cannot validate fractional whole-piece demand',()=>{
 const p=plan('P',{A:[0.5],B:[0],C:[0]}),s=snap([p],[row('a',p,'A',1),row('b',p,'B',0.5)]);
 assert.throws(()=>validate(s),/eligible identity pool/);
 // An explicit equivalence makes the fractional B stock an eligible source.
 s.equivalenceGroups=[eq(p)];assert.equal(validate(s),s);assert.equal(report(s).allocation.plans[0].allocatedQuantity,0.5);
});

test('brand policy: whole exact pools retain whole quotas before fractional residual substitution',()=>{
 const p=plan('P',{A:[1,1],B:[0],C:[0]}),s=snap([p],[row('a',p,'A',1,20),row('b',p,'B',0.5,300)],{equivalenceGroups:[eq(p)]}),r=report(s),a=r.drilldown.rows.filter(r=>r.id==='a'),b=r.drilldown.rows.find(r=>r.id==='b');
 assert.equal(a.length,1);assert.equal(a[0].quantity,1);assert.equal(a[0].division,'TNWL');assert.equal(a[0].matchType,'exact');
 assert.equal(b.quantity,0.5);assert.equal(b.division,'HYD');assert.equal(b.forecastBrand,'A');assert.equal(b.matchType,'equivalent');assert.equal(r.allocation.plans[0].shortfallQuantity,0.5);
});

test('brand policy: fractional companion demand preserves motor pool precision and explicit shortfall',()=>{
 const machine=plan('CC1',{DAWN:[1.5]},{productGroup:'Chaff cutter'}),motor=plan('CCM10',{MOTOR:[0,0,0,99],UNRELATED:[0]},{productGroup:'Motor'}),rule={id:'pair',motorPlanKey:motor.id,motorBrand:'MOTOR',machinePlanKeys:[machine.id],machineBrands:['DAWN'],quantityPerMachine:1,status:'confirmed',decisionId:'approved',evidence:'Synthetic'},s=snap([machine,motor],[row('machine',machine,'DAWN',1.5),row('motor',motor,'MOTOR',1),row('unrelated-fraction',motor,'UNRELATED',0.5)],{companionRules:[rule]}),r=report(s);
 assert.equal(r.allocation.companions.rules[0].motorRequirementQuantity,1.5);assert.equal(r.allocation.companions.rules[0].motorAllocatedQuantity,1);assert.equal(r.allocation.companions.rules[0].motorShortfallQuantity,0.5);
 const f=structuredClone(s);f.rows.find(r=>r.id==='motor').quantity=1.5;const fractional=report(f);assert.equal(fractional.allocation.companions.rules[0].motorAllocatedQuantity,1.5);assert.equal(fractional.allocation.companions.rules[0].motorShortfallQuantity,0);
});

test('brand policy: preparation bounds total identity growth as well as projected controls',()=>{
 const plans=Array.from({length:501},(_,i)=>plan('P'+i,Object.fromEntries(Array.from({length:100},(_,j)=>['BRAND'+j,[1]]))));
 assert.throws(()=>validate(snap(plans,[])),/Too many allocation brand identities/);
 assert.equal(validate(snap(plans.slice(0,500),[])).plans.length,500);
});
