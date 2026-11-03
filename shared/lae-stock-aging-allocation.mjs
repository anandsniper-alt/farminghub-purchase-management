import {RuleError} from './domain.mjs';

export const LAE_AGING_DIVISIONS=Object.freeze(['TNWL','HYD','NORTH','FH']);
// Reporting groups include residual stock; only the four divisions own demand.
export const LAE_AGING_STOCK_GROUPS=Object.freeze([...LAE_AGING_DIVISIONS,'UNALLOTTED']);
export const LAE_AGING_ALLOCATION_BUCKETS=Object.freeze([
 {id:'0-60',label:'0–60 days',min:0,max:60},{id:'61-120',label:'61–120 days',min:61,max:120},
 {id:'121-240',label:'121–240 days',min:121,max:240},{id:'241-360',label:'241–360 days',min:241,max:360},
 {id:'361-720',label:'361–720 days',min:361,max:720},{id:'721-1080',label:'721–1080 days',min:721,max:1080},
 {id:'1081+',label:'Above 1080 days',min:1081,max:Infinity},{id:'unknown',label:'Date unknown'}
].map(Object.freeze));
export const LAE_AGING_ALLOCATION_QUERY_KEYS=Object.freeze(['view','divisions','productGroup','unit','q','bucket','page','pageSize','itemPage','companionPage','basis','asOf','engine','grade','blades','vendor','display','sort','direction','sortMetric']);
const laeAllocationDomain=(()=>{
const SCALE=1000000n,MAX_ROWS=200000,MAX_PLANS=10000;
const day=v=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return null;const ms=Date.parse(v+'T00:00:00Z');return Number.isFinite(ms)&&new Date(ms).toISOString().slice(0,10)===v?ms/86400000:null;};
const object=v=>v!==null&&typeof v==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(v));
const text=v=>typeof v==='string'&&v.length<=1000;
const fail=message=>{throw new RuleError(message);};
const quantity=v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=1e9&&Math.abs(v*1e6-Math.round(v*1e6))<0.00001;
const price=v=>v===null||(typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1e9);
const quant=v=>BigInt(Math.round(v*1e6));
// Unit prices are rounded once to six decimal INR; quantity × price then stays integer.
const money=v=>v===null?null:BigInt(Math.round(v*1e6));
const number=v=>{if(v>9007199254740991n||v< -9007199254740991n)fail('Stock total exceeds supported quantity precision.');return Number(v)/1e6;};
const amount=v=>{const sign=v<0n?-1n:1n,a=v*sign;return number(sign*((a+SCALE/2n)/SCALE));};
const sum=values=>values.reduce((a,b)=>a+b,0n);
const normal=v=>String(v??'').trim().toLowerCase();
const compare=(a,b)=>a<b?-1:a>b?1:0;
const key=p=>JSON.stringify([p.productGroup,p.masterCode,p.unit]);
const attributes=['engine','grade','blades','vendor'];
const attribute=(r,k)=>typeof r[k]==='string'&&r[k].trim()?r[k].trim():'Not recorded';

/** Immutable, forecast-scoped input. Extra evidence metadata is retained by its owner. */
function validateLaeAgingAllocationSnapshot(s){
 if(!object(s)||s.schemaVersion!==1||day(s.stockDate)===null||day(s.costDate)===null||!Array.isArray(s.rows)||!Array.isArray(s.plans)||s.rows.length>MAX_ROWS||s.plans.length>MAX_PLANS)fail('Invalid aging allocation snapshot.');
 const plans=new Map(),keys=new Set(),ids=new Set(),fractional=new Set(),categoryUnits=new Set();
 for(const p of s.plans){
  if(!object(p)||!text(p.id)||!p.id||!['productGroup','masterCode','unit'].every(k=>text(p[k])&&p[k])||!object(p.quantities)||plans.has(p.id)||keys.has(key(p)))fail('Duplicate or invalid forecast plan identity.');
  if(Object.keys(p.quantities).some(k=>!LAE_AGING_DIVISIONS.includes(k))||!LAE_AGING_DIVISIONS.every(k=>quantity(p.quantities[k])&&p.quantities[k]>=0))fail('Invalid division plan quantities.');
  plans.set(p.id,p);keys.add(key(p));categoryUnits.add(JSON.stringify([p.productGroup,p.unit]));
 }
 if(categoryUnits.size>250)fail('Too many product category and unit groups.');
 for(const r of s.rows){
  if(!object(r)||!text(r.id)||!r.id||ids.has(r.id)||!text(r.planKey)||!plans.has(r.planKey)||!['productGroup','masterCode','brandCode','itemName','unit','warehouse'].every(k=>text(r[k]))||key(r)!==key(plans.get(r.planKey)))fail('Invalid stock row or forecast linkage.');
  if(!quantity(r.quantity)||!price(r.originalInrUnit)||!price(r.revisedInrUnit)||typeof r.quantityOnly!=='boolean'||!(r.importDate===null||r.importDate===''||day(r.importDate)!==null))fail('Invalid stock quantity, date or physical unit price.');
  if(attributes.some(k=>r[k]!=null&&!text(r[k])))fail('Invalid stock classification.');
  ids.add(r.id);if(!Number.isInteger(r.quantity))fractional.add(r.planKey);
 }
 for(const p of s.plans)if(/^(pcs|nos|pieces?|units?|sets?)$/i.test(p.unit)&&!fractional.has(p.id)&&LAE_AGING_DIVISIONS.some(d=>!Number.isInteger(p.quantities[d])))fail('Fractional allocation requires fractional source stock.');
 if(s.allocationPolicy!==undefined&&s.allocationPolicy!=='brand-first-v1')fail('Unknown aging allocation policy.');
 if(s.allocationPolicy==='brand-first-v1')validateBrandPolicy(s,plans,fractional);
 return s;
}

function validateBrandPolicy(s,plans,fractional){
 const identity=v=>text(v)&&v.length>0&&v===v.trim(),identities=new Map(),byPlan=new Map(s.plans.map(p=>[p.id,[]]));let identityCount=0;
 for(const p of s.plans){
  if(!object(p.brandQuantities)||Object.keys(p.brandQuantities).length>100)fail('Invalid brand quantities.');
  for(const [brand,values] of Object.entries(p.brandQuantities)){
   if(!identity(brand)||!object(values)||Object.keys(values).length!==4||!LAE_AGING_DIVISIONS.every(d=>quantity(values[d])&&values[d]>=0))fail('Invalid brand division quantities.');
   if(/^(pcs|nos|pieces?|units?|sets?)$/i.test(p.unit)&&!fractional.has(p.id)&&Object.values(values).some(v=>!Number.isInteger(v)))fail('Fractional brand allocation requires fractional source stock.');
  }
  if(LAE_AGING_DIVISIONS.some(d=>sum(Object.values(p.brandQuantities).map(v=>quant(v[d])))!==quant(p.quantities[d])))fail('Brand quantities must reconcile to division plan quantities.');
  identities.set(p.id,new Set(Object.keys(p.brandQuantities)));
  identityCount+=Object.keys(p.brandQuantities).length;if(identityCount>50000)fail('Too many allocation brand identities.');
 }
 for(const r of s.rows){
  if(!identity(r.allocationBrand))fail('Explicit allocation brand identity is required.');
  for(const k of ['assignedRO','priceReferenceRO','ageBasis'])if(r[k]!=null&&!text(r[k]))fail('Invalid public stock provenance.');
  if(!identities.get(r.planKey).has(r.allocationBrand)){identities.get(r.planKey).add(r.allocationBrand);if(++identityCount>50000)fail('Too many allocation brand identities.');}byPlan.get(r.planKey).push(r);
 }
 for(const rows of byPlan.values()){
  const specifications=new Map();
  for(const r of rows)for(const field of ['engine','grade','blades']){const value=normal(r[field]);if(!value||value==='not recorded')continue;const id=JSON.stringify([r.allocationBrand,field]);if(specifications.has(id)&&specifications.get(id)!==value)fail('Exact brand identity conflicts with supported product specifications.');specifications.set(id,value);}
 }
 const confirmed=r=>object(r)&&identity(r.id)&&r.status==='confirmed'&&identity(r.decisionId)&&text(r.evidence)&&r.evidence.trim().length>0;
 const uniqueList=(v,min=1)=>Array.isArray(v)&&v.length>=min&&v.length<=MAX_ROWS&&v.every(identity)&&new Set(v).size===v.length;
 const groups=s.equivalenceGroups??[],rules=s.companionRules??[],ids=new Set(),members=new Map();
 if(!Array.isArray(groups)||groups.length>MAX_PLANS||!Array.isArray(rules)||rules.length>MAX_PLANS)fail('Invalid allocation policy rules.');
 for(const g of groups){
  if(!confirmed(g)||ids.has(g.id)||!plans.has(g.planKey)||!uniqueList(g.brands,2)||g.brands.length>100)fail('Invalid or duplicate confirmed equivalence rule.');
  ids.add(g.id);
  for(const brand of g.brands){const id=JSON.stringify([g.planKey,brand]);if(!identities.get(g.planKey).has(brand)||members.has(id))fail('Unknown or overlapping brand equivalence.');members.set(id,g);}
  // Planned vendor is a forecast filter, not proof of historical supplier identity.
  // Supported physical specifications must not conflict with a branding-only rule.
  for(const k of ['engine','grade','blades']){
   const values=new Set(byPlan.get(g.planKey).filter(r=>g.brands.includes(r.allocationBrand)).map(r=>normal(r[k])).filter(v=>v&&v!=='not recorded'));
   if(values.size>1)fail('Brand equivalence conflicts with supported product specifications.');
  }
 }
 for(const p of s.plans)if(/^(pcs|nos|pieces?|units?|sets?)$/i.test(p.unit))for(const [brand,values] of Object.entries(p.brandQuantities))if(Object.values(values).some(v=>!Number.isInteger(v))){
  const group=members.get(JSON.stringify([p.id,brand])),eligible=new Set(group?.brands??[brand]);
  if(!byPlan.get(p.id).some(r=>eligible.has(r.allocationBrand)&&!Number.isInteger(r.quantity)))fail('Fractional brand demand requires fractional source stock in its eligible identity pool.');
 }
 const motorPairs=new Set(),machinePairs=new Set(),rowMap=new Map(s.rows.map(r=>[r.id,r]));
 for(const r of rules){
  const motor=plans.get(r.motorPlanKey);
  if(!confirmed(r)||ids.has(r.id)||!motor||!/^CCM[- ]?10$/i.test(motor.masterCode)||!identity(r.motorBrand)||!identities.get(motor.id).has(r.motorBrand)||!uniqueList(r.machinePlanKeys)||!uniqueList(r.machineBrands)||r.machineBrands.length>100||r.quantityPerMachine!==1)fail('Invalid confirmed CCM10 companion rule.');
  ids.add(r.id);const motorPair=JSON.stringify([motor.id,r.motorBrand]);
  if(motorPairs.has(motorPair)||members.has(motorPair))fail('Overlapping motor companion or substitution rule.');motorPairs.add(motorPair);
  for(const id of r.machinePlanKeys){const machine=plans.get(id);if(!machine||id===motor.id||machine.unit!==motor.unit||!/chaff/i.test(machine.productGroup)||/wood.?chop/i.test(machine.productGroup+' '+machine.masterCode)||/^WC(?:\d|[- ])/i.test(machine.masterCode))fail('Invalid chaff machine scope or companion unit.');
   if(!r.machineBrands.some(b=>identities.get(id).has(b)))fail('Companion machine plan has no supported brand.');
   for(const b of r.machineBrands)if(identities.get(id).has(b)){const pair=JSON.stringify([id,b]);if(machinePairs.has(pair))fail('Overlapping machine companion rules.');machinePairs.add(pair);}
  }
  if(r.machineBrands.some(b=>!r.machinePlanKeys.some(id=>identities.get(id).has(b))))fail('Unknown companion machine brand.');
  for(const [field,isMotor] of [['machineSourceRowIds',false],['motorSourceRowIds',true]])if(r[field]!==undefined){
   if(!uniqueList(r[field]))fail('Invalid companion source rows.');
   for(const id of r[field]){const source=rowMap.get(id);if(!source||(isMotor?source.planKey!==motor.id||source.allocationBrand!==r.motorBrand:!r.machinePlanKeys.includes(source.planKey)||!r.machineBrands.includes(source.allocationBrand)))fail('Companion source row does not match its confirmed identity.');}
  }
 }
 if([...motorPairs].some(p=>machinePairs.has(p)))fail('Companion cycles are not supported.');
}

function filters(input,s){
 if(!object(input))fail('Invalid aging filters.');
 for(const [k,v] of Object.entries(input))if(!LAE_AGING_ALLOCATION_QUERY_KEYS.includes(k)||typeof v!=='string'||v.length>500)fail('Invalid aging filter.');
 const q={view:'overall',divisions:'',productGroup:'',unit:'',q:'',bucket:'',page:'1',pageSize:'50',itemPage:'1',companionPage:'1',basis:'revised',asOf:s.stockDate,engine:'',grade:'',blades:'',vendor:'',display:'both',sort:'total',direction:'desc',sortMetric:'value',...input};
 if(!['both','quantity','value'].includes(q.display)||!['asc','desc'].includes(q.direction)||!['value','quantity'].includes(q.sortMetric)||!['total','totalValue','category',...LAE_AGING_ALLOCATION_BUCKETS.map(b=>b.id)].includes(q.sort))fail('Invalid aging display or sort.');
 if(q.display!=='both')q.sortMetric=q.display;
 if(!['overall','allocated'].includes(q.view)||!['original','revised'].includes(q.basis)||day(q.asOf)===null||q.asOf<s.stockDate||q.bucket&&!LAE_AGING_ALLOCATION_BUCKETS.some(b=>b.id===q.bucket))fail('Invalid aging view, price basis, date or band.');
 const ds=q.divisions&&q.divisions!=='none'?q.divisions.split(','):[];
 if(ds.some(d=>!LAE_AGING_STOCK_GROUPS.includes(d))||new Set(ds).size!==ds.length)fail('Invalid division filter.');
 if(!/^\d{1,7}$/.test(q.page)||Number(q.page)<1||!/^\d{1,7}$/.test(q.itemPage)||Number(q.itemPage)<1||!/^\d{1,7}$/.test(q.companionPage)||Number(q.companionPage)<1||!/^\d{1,3}$/.test(q.pageSize)||Number(q.pageSize)<1||Number(q.pageSize)>200)fail('Invalid aging detail page.');
 q.divisions=q.divisions==='none'?'none':LAE_AGING_STOCK_GROUPS.filter(d=>ds.includes(d)).join(',');q.page=Number(q.page);q.pageSize=Number(q.pageSize);q.itemPage=Number(q.itemPage);q.companionPage=Number(q.companionPage);return q;
}

// Hamilton largest remainder, using division order as the stable tie breaker.
function proportion(total,weights){
 const denominator=sum(weights);if(!denominator||!total)return weights.map(()=>0n);
 const out=weights.map(w=>total*w/denominator),left=Number(total-sum(out));
 const order=weights.map((w,i)=>({i,remainder:total*w%denominator})).sort((a,b)=>compare(b.remainder,a.remainder)||a.i-b.i);
 for(let i=0;i<left;i++)out[order[i].i]++;return out;
}
function age(row,asOf){const date=day(row.importDate),n=date===null?null:asOf-date;return {ageDays:n===null||n<0?null:n,bucket:n===null||n<0?'unknown':LAE_AGING_ALLOCATION_BUCKETS.find(b=>n>=b.min&&n<=b.max).id};}
function allocate(s){
 if(s.allocationPolicy==='brand-first-v1')return allocateByBrand(s);
 const byPlan=new Map(s.plans.map(p=>[p.id,[]]));for(const r of s.rows)byPlan.get(r.planKey).push(r);
 const allocated=[],unallocated=[],controls=[];
 for(const p of s.plans){
  const rows=byPlan.get(p.id),precision=[...rows.map(r=>r.quantity),...Object.values(p.quantities)].reduce((max,value)=>{const q=quant(value);let pow=0;for(let divisor=SCALE;divisor>1n&&q%divisor!==0n;divisor/=10n)pow++;return Math.max(max,pow);},0),quantum=10n**BigInt(6-precision);
  const planned=LAE_AGING_DIVISIONS.map(d=>quant(p.quantities[d])/quantum),net=sum(rows.map(r=>quant(r.quantity)))/quantum,available=net>0n?net:0n,total=sum(planned),cap=available<total?available:total;
  const quotas=proportion(cap,planned),remaining=[...quotas];let left=cap;
  const ordered=[...rows].sort((a,b)=>{const ad=day(a.importDate),bd=day(b.importDate),aa=ad===null||ad>day(s.stockDate)?Infinity:ad,bb=bd===null||bd>day(s.stockDate)?Infinity:bd;return compare(aa,bb)||compare(a.id,b.id);});
   for(const r of ordered){const qty=quant(r.quantity)/quantum,take=qty>0n?(qty<left?qty:left):0n;
    // Carry cumulative rounding deficits between small/serialized batches, so a
    // large division cannot monopolize the oldest ages merely because each row is one unit.
    const consumed=cap-left+take,owed=quotas.map((v,i)=>{const n=consumed*v-(v-remaining[i])*cap;return n>0n?n:0n;}),parts=proportion(take,owed);left-=take;
   parts.forEach((v,i)=>{if(v){allocated.push({row:r,division:LAE_AGING_DIVISIONS[i],qty:v*quantum});remaining[i]-=v;}});
   if(qty-take!==0n||qty===0n)unallocated.push({row:r,division:'',qty:(qty-take)*quantum});
  }
  controls.push({id:p.id,productGroup:p.productGroup,masterCode:p.masterCode,unit:p.unit,stockQuantity:number(net*quantum),plannedQuantity:number(total*quantum),allocatedQuantity:number(cap*quantum),unallocatedQuantity:number((net-cap)*quantum),shortfallQuantity:number((total-cap)*quantum),divisions:Object.fromEntries(LAE_AGING_DIVISIONS.map((d,i)=>[d,{plannedQuantity:number(planned[i]*quantum),allocatedQuantity:number(quotas[i]*quantum),shortfallQuantity:number((planned[i]-quotas[i])*quantum)}]))});
 }
 return {allocated,unallocated,controls};
}

const positive=n=>n>0n?n:0n;
const minimum=(a,b)=>a<b?a:b;
function stockOrder(a,b,stockDate){
 const valid=r=>{const d=day(r.importDate);return d===null||d>stockDate?Infinity:d;};
 return compare(valid(a),valid(b))||compare(a.id,b.id);
}
function allocationQuantum(values){
 const precision=values.reduce((max,value)=>{const q=quant(value);let pow=0;for(let divisor=SCALE;divisor>1n&&q%divisor!==0n;divisor/=10n)pow++;return Math.max(max,pow);},0);
 return 10n**BigInt(6-precision);
}
function cappedProportion(total,weights,limits){
 const result=limits.map(()=>0n);let left=total;
 while(left){const parts=proportion(left,weights.map((w,i)=>result[i]<limits[i]?w:0n)).map((v,i)=>minimum(v,limits[i]-result[i])),used=sum(parts);if(!used)fail('Eligible pool rounding could not satisfy whole-unit quotas.');parts.forEach((v,i)=>result[i]+=v);left-=used;}
 return result;
}
function allocateByBrand(s){
 const byPlan=new Map(s.plans.map(p=>[p.id,[]])),allocated=[],unallocated=[],companions=[];
 for(const r of s.rows)byPlan.get(r.planKey).push(r);
 const states=new Map(),suppressed=new Set((s.companionRules??[]).map(r=>JSON.stringify([r.motorPlanKey,r.motorBrand]))),stockDate=day(s.stockDate);
 for(const p of s.plans){
  // Internal quantities always retain six decimals. Rounding belongs to each
  // eligible pool, so an unrelated fractional identity cannot split a piece.
  const rows=byPlan.get(p.id),quantum=1n,stocks=new Map(),demands=new Map();
  for(const r of rows){if(!stocks.has(r.allocationBrand))stocks.set(r.allocationBrand,{brand:r.allocationBrand,rows:[],net:0n,used:0n});const b=stocks.get(r.allocationBrand);b.rows.push(r);b.net+=quant(r.quantity)/quantum;}
  for(const b of stocks.values()){b.capacity=positive(b.net);b.rows.sort((a,b)=>stockOrder(a,b,stockDate));}
  for(const [brand,values] of Object.entries(p.brandQuantities)){
   const forecast=LAE_AGING_DIVISIONS.map(d=>quant(values[d])/quantum),held=suppressed.has(JSON.stringify([p.id,brand])),planned=held?forecast.map(()=>0n):[...forecast];
   demands.set(brand,{brand,forecast,planned,remaining:[...planned],suppressed:held?[...forecast]:forecast.map(()=>0n),companion:forecast.map(()=>0n)});
  }
  states.set(p.id,{plan:p,rows,quantum,stocks,demands,used:new Map(),entries:[]});
 }
 // All exact-brand demands are protected before any residual substitution.
 for(const st of states.values())for(const brand of [...st.demands.keys()].sort())fillBrandPool(st,[brand],[st.demands.get(brand)],'exact','',null);
 for(const g of s.equivalenceGroups??[]){const st=states.get(g.planKey);fillBrandPool(st,g.brands,g.brands.map(b=>st.demands.get(b)).filter(Boolean),'equivalent',g.decisionId,null);}
 for(const rule of s.companionRules??[]){
  const sourceIds=rule.machineSourceRowIds?new Set(rule.machineSourceRowIds):null;
  const machines=rule.machinePlanKeys.flatMap(id=>states.get(id).entries).filter(e=>rule.machineBrands.includes(e.row.allocationBrand)&&(!sourceIds||sourceIds.has(e.row.id)));
  const st=states.get(rule.motorPlanKey),required=LAE_AGING_DIVISIONS.map(d=>sum(machines.filter(e=>e.division===d).map(e=>e.qty)));
  let target=st.demands.get(rule.motorBrand);
  if(!target){const z=LAE_AGING_DIVISIONS.map(()=>0n);target={brand:rule.motorBrand,forecast:[...z],suppressed:[...z],planned:[...z],remaining:[...z],companion:[...z]};st.demands.set(rule.motorBrand,target);}
  target.companion=required.map(n=>n/st.quantum);target.planned=[...target.companion];target.remaining=[...target.companion];
  for(const e of machines)e.componentRuleId=rule.id;
  const before=allocated.length;
  fillBrandPool(st,[rule.motorBrand],[target],'companion','',rule);
  const motors=allocated.slice(before),links=[];
  // Links describe analytical pairing only. Neither side changes physical age or price.
  for(const division of LAE_AGING_DIVISIONS){
   const ms=machines.filter(e=>e.division===division).sort((a,b)=>stockOrder(a.row,b.row,stockDate)||compare(a.forecastBrand,b.forecastBrand)),ts=motors.filter(e=>e.division===division).sort((a,b)=>stockOrder(a.row,b.row,stockDate));
   let i=0,j=0,mleft=ms[0]?.qty??0n,tleft=ts[0]?.qty??0n;
   while(i<ms.length){const qty=j<ts.length?minimum(mleft,tleft):mleft;links.push({id:JSON.stringify([rule.id,division,links.length]),componentRuleId:rule.id,division,qty,machine:ms[i],motor:ts[j]??null});ms[i].componentLinkCount=(ms[i].componentLinkCount??0)+1;if(ts[j])ts[j].componentLinkCount=(ts[j].componentLinkCount??0)+1;mleft-=qty;if(j<ts.length){tleft-=qty;if(!tleft){j++;tleft=ts[j]?.qty??0n;}}if(!mleft){i++;mleft=ms[i]?.qty??0n;}}
  }
  companions.push({id:rule.id,decisionId:rule.decisionId,motorPlanKey:rule.motorPlanKey,motorBrand:rule.motorBrand,unit:st.plan.unit,machines,motors,links,scopeRows:[...rule.machinePlanKeys.flatMap(id=>states.get(id).rows).filter(r=>rule.machineBrands.includes(r.allocationBrand)&&(!sourceIds||sourceIds.has(r.id))),...(st.stocks.get(rule.motorBrand)?.rows??[])],suppressed:target.suppressed.map(n=>n*st.quantum)});
 }
 const controls=[];
 for(const st of states.values()){
  const {plan:p,quantum,stocks,demands,entries}=st,offsets=new Map();
  for(const b of stocks.values()){
   b.negative=sum(b.rows.map(r=>minimum(quant(r.quantity)/quantum,0n)));b.offset=minimum(-b.negative,sum(b.rows.map(r=>positive(quant(r.quantity)/quantum))));let left=b.offset;
   // Reserve positive offsets at the newest residual rows, keeping old usable stock first.
   for(let i=b.rows.length-1;i>=0&&left;i--){const r=b.rows[i],available=positive(quant(r.quantity)/quantum-(st.used.get(r.id)??0n)),take=minimum(left,available);if(take)offsets.set(r.id,take*quantum);left-=take;}
   if(left)fail('Negative adjustment offsets did not reconcile.');
  }
  for(const r of st.rows){const remaining=quant(r.quantity)-(st.used.get(r.id)??0n)*quantum,offset=offsets.get(r.id)??0n;if(remaining||r.quantity===0)unallocated.push({row:r,division:'',qty:remaining,forecastBrand:'',matchType:'unallotted',equivalenceDecisionId:'',componentRuleId:'',adjustmentOffsetQuantity:number(offset),surplusQuantity:number(positive(remaining-offset)),unallocatedReason:r.quantity<0?'signed-adjustment':offset?(remaining>offset?'surplus-and-adjustment-offset':'adjustment-offset'):!demands.has(r.allocationBrand)?'unresolved-or-no-demand':!sum(demands.get(r.allocationBrand).planned)?'no-demand':'surplus-or-unmet-other-identity'});}
  const brandControls=[...new Set([...stocks.keys(),...demands.keys()])].sort().map(brand=>{
   const b=stocks.get(brand),d=demands.get(brand),z=LAE_AGING_DIVISIONS.map(()=>0n),planned=d?.planned??z,forecast=d?.forecast??z,remaining=d?.remaining??z,companion=d?.companion??z,held=d?.suppressed??z,got=planned.map((n,i)=>n-remaining[i]);
   return {forecastBrand:brand,allocationBrand:brand,stockQuantity:number((b?.net??0n)*quantum),negativeAdjustmentQuantity:number((b?.negative??0n)*quantum),positiveAdjustmentOffsetQuantity:number((b?.offset??0n)*quantum),executableStockQuantity:number((b?.capacity??0n)*quantum),forecastPlannedQuantity:number(sum(forecast)*quantum),suppressedForecastQuantity:number(sum(held)*quantum),companionDerivedQuantity:number(sum(companion)*quantum),plannedQuantity:number(sum(planned)*quantum),allocatedQuantity:number(sum(got)*quantum),shortfallQuantity:number(sum(remaining)*quantum),exactAllocatedQuantity:number(sum(entries.filter(e=>e.forecastBrand===brand&&e.matchType==='exact').map(e=>e.qty))),substitutedQuantity:number(sum(entries.filter(e=>e.forecastBrand===brand&&e.matchType==='equivalent').map(e=>e.qty))),sourceAllocatedQuantity:number((b?.used??0n)*quantum),unallocatedQuantity:number(((b?.net??0n)-(b?.used??0n))*quantum),divisions:Object.fromEntries(LAE_AGING_DIVISIONS.map((division,i)=>[division,{forecastPlannedQuantity:number(forecast[i]*quantum),suppressedForecastQuantity:number(held[i]*quantum),companionDerivedQuantity:number(companion[i]*quantum),plannedQuantity:number(planned[i]*quantum),allocatedQuantity:number(got[i]*quantum),shortfallQuantity:number(remaining[i]*quantum)}]))};
  });
  const total=k=>number(sum(brandControls.map(b=>quant(b[k])))),stock=sum(st.rows.map(r=>quant(r.quantity))),taken=sum(entries.map(e=>e.qty));
  controls.push({id:p.id,productGroup:p.productGroup,masterCode:p.masterCode,unit:p.unit,stockQuantity:number(stock),forecastPlannedQuantity:total('forecastPlannedQuantity'),suppressedForecastQuantity:total('suppressedForecastQuantity'),companionDerivedQuantity:total('companionDerivedQuantity'),plannedQuantity:total('plannedQuantity'),allocatedQuantity:number(taken),unallocatedQuantity:number(stock-taken),shortfallQuantity:total('shortfallQuantity'),brandControls,divisions:Object.fromEntries(LAE_AGING_DIVISIONS.map(d=>[d,Object.fromEntries(['forecastPlannedQuantity','suppressedForecastQuantity','companionDerivedQuantity','plannedQuantity','allocatedQuantity','shortfallQuantity'].map(k=>[k,number(sum(brandControls.map(b=>quant(b.divisions[d][k]))))]))]))});
 }
 return {allocated,unallocated,controls,companions};

 function fillBrandPool(st,brands,targets,matchType,decisionId,rule){
  const eligible=rule?.motorSourceRowIds?new Set(rule.motorSourceRowIds):null,available=new Map(),rows=[],poolRows=brands.flatMap(b=>st.stocks.get(b)?.rows??[]).filter(r=>!eligible||eligible.has(r.id));
  const wholePieces=/^(pcs|nos|pieces?|units?|sets?)$/i.test(st.plan.unit)&&poolRows.every(r=>Number.isInteger(r.quantity));
  const step=(wholePieces?SCALE:allocationQuantum([...poolRows.map(r=>r.quantity),...targets.flatMap(t=>t.remaining.map(v=>number(v*st.quantum)))]))/st.quantum;
  for(const brand of brands){const b=st.stocks.get(brand);if(!b)continue;const selected=b.rows.filter(r=>r.quantity>0&&(!eligible||eligible.has(r.id)));const capacity=minimum(b.capacity-b.used,sum(selected.map(r=>quant(r.quantity)/st.quantum-(st.used.get(r.id)??0n))));available.set(brand,positive(capacity));for(const row of selected)rows.push(row);}
  const demandByDivision=LAE_AGING_DIVISIONS.map((d,i)=>sum(targets.map(t=>t.remaining[i]))),limitsByDivision=LAE_AGING_DIVISIONS.map((d,i)=>sum(targets.map(t=>t.remaining[i]/step))),cap=minimum(sum([...available.values()].map(v=>v/step)),sum(limitsByDivision));if(!cap)return;
  const divisionQuotas=cappedProportion(cap,demandByDivision,limitsByDivision),slots=[];
  for(let i=0;i<4;i++){const ordered=[...targets].sort((a,b)=>compare(a.brand,b.brand)),parts=cappedProportion(divisionQuotas[i],ordered.map(t=>t.remaining[i]),ordered.map(t=>t.remaining[i]/step));ordered.forEach((target,j)=>{if(parts[j])slots.push({target,index:i,quota:parts[j],remaining:parts[j]});});}
  let left=cap;
  for(const r of rows.sort((a,b)=>stockOrder(a,b,stockDate))){if(!left)break;const brand=r.allocationBrand,take=minimum(left,minimum((available.get(brand)??0n)/step,(quant(r.quantity)/st.quantum-(st.used.get(r.id)??0n))/step));if(!take)continue;
   const consumed=cap-left+take,owed=slots.map(t=>positive(consumed*t.quota-(t.quota-t.remaining)*cap));let parts=proportion(take,owed).map((v,i)=>minimum(v,slots[i].remaining)),remainder=take-sum(parts);
   // Bound rounding to the remaining target quota, including multi-brand targets.
   if(remainder){const extra=proportion(remainder,slots.map((t,i)=>t.remaining-parts[i]));parts=parts.map((v,i)=>v+extra[i]);}
   parts.forEach((v,i)=>{if(!v)return;const t=slots[i];t.remaining-=v;t.target.remaining[t.index]-=v*step;const entry={row:r,division:LAE_AGING_DIVISIONS[t.index],qty:v*step*st.quantum,forecastBrand:t.target.brand,matchType,equivalenceDecisionId:decisionId,componentRuleId:rule?.id??''};allocated.push(entry);st.entries.push(entry);});
   left-=take;available.set(brand,available.get(brand)-take*step);st.stocks.get(brand).used+=take*step;st.used.set(r.id,(st.used.get(r.id)??0n)+take*step);
  }
  if(left||slots.some(t=>t.remaining))fail('Brand allocation quotas did not reconcile.');
 }
}
const frozenPreparation=new WeakMap();
function prepare(s){
 const deeplyFrozen=(value,seen=new Set())=>{if(value===null||typeof value!=='object'||seen.has(value))return true;seen.add(value);return Object.isFrozen(value)&&Object.values(value).every(v=>deeplyFrozen(v,seen));};
 const immutable=object(s)&&Object.isFrozen(s)&&Array.isArray(s.rows)&&Object.isFrozen(s.rows)&&s.rows.every(r=>object(r)&&Object.isFrozen(r))&&Array.isArray(s.plans)&&Object.isFrozen(s.plans)&&s.plans.every(p=>object(p)&&Object.isFrozen(p)&&object(p.quantities)&&Object.isFrozen(p.quantities))&&(s.allocationPolicy!=='brand-first-v1'||deeplyFrozen(s));
 if(immutable&&frozenPreparation.has(s))return frozenPreparation.get(s);
 validateLaeAgingAllocationSnapshot(s);const result=allocate(s);if(immutable)frozenPreparation.set(s,result);return result;
}
function empty(){return {qty:0n,value:0n,known:0n,pending:0n,knownPositive:0n,pendingPositive:0n,quantityOnly:0n,positive:0n,negative:0n,knownRows:0,rows:0};}
function add(c,entry,priceKey){const {row:r,qty}=entry;c.qty+=qty;c.positive+=qty>0n?qty:0n;c.negative+=qty<0n?qty:0n;c.rows++;if(r.quantityOnly)c.quantityOnly+=qty;else if(r[priceKey]===null){c.pending+=qty;c.pendingPositive+=qty>0n?qty:0n;}else{c.known+=qty;c.knownPositive+=qty>0n?qty:0n;c.value+=qty*money(r[priceKey]);if(qty)c.knownRows++;}}
function cell(c){return {quantity:number(c.qty),valueInr:c.knownRows?amount(c.value):null,knownValueInr:amount(c.value),knownQty:number(c.known),pendingQty:number(c.pending),knownPositiveQty:number(c.knownPositive),pendingPositiveQty:number(c.pendingPositive),quantityOnlyQty:number(c.quantityOnly),positive:number(c.positive),negative:number(c.negative),rows:c.rows};}
function aggregate(entries,q){
 const groups=new Map(),units=new Map();
 const groupAttribute=/^power\s*weeder$|^brush\s*cutter$/i.test(q.productGroup)?(q.engine?'grade':'engine'):/^chaff\s*cutter$/i.test(q.productGroup)?'blades':'';
 const make=extra=>({...extra,total:empty(),buckets:Object.fromEntries(LAE_AGING_ALLOCATION_BUCKETS.map(b=>[b.id,empty()]))});
 for(const e of entries){const r=e.row,division=q.view==='allocated'?e.division:'',groupValue=groupAttribute?attribute(r,groupAttribute):'',id=JSON.stringify([division,r.productGroup,r.unit,...(groupAttribute?[groupValue]:[])]);
  if(!groups.has(id))groups.set(id,make({id,division,productGroup:r.productGroup,unit:r.unit,...(groupAttribute?{groupAttribute,groupValue}:{})}));if(!units.has(r.unit))units.set(r.unit,make({unit:r.unit}));
  for(const target of [groups.get(id),units.get(r.unit)]){add(target.total,e,q.priceKey);add(target.buckets[e.bucket],e,q.priceKey);}
 }
  const finish=g=>{const {total,buckets,...rest}=g;return {...rest,...cell(total),buckets:Object.fromEntries(Object.entries(buckets).map(([k,v])=>[k,cell(v)]))};};
 const tie=(a,b)=>compare(a.division,b.division)||compare(a.productGroup,b.productGroup)||compare(a.groupValue||'',b.groupValue||'')||compare(a.unit,b.unit);
 const order=(a,b)=>{
  const direction=q.direction==='asc'?1:-1;
  if(q.sort==='category')return direction*(a.groupValue||a.productGroup).localeCompare(b.groupValue||b.productGroup,'en',{numeric:true,sensitivity:'base'})||tie(a,b);
  const ac=['total','totalValue'].includes(q.sort)?a.total:a.buckets[q.sort],bc=['total','totalValue'].includes(q.sort)?b.total:b.buckets[q.sort],metric=q.sort==='totalValue'?'value':q.sortMetric;
  const av=metric==='quantity'?ac.qty:ac.value,bv=metric==='quantity'?bc.qty:bc.value;
  const ak=metric==='quantity'?ac.rows:ac.knownRows,bk=metric==='quantity'?bc.rows:bc.knownRows;
  return compare(Number(Boolean(bk)),Number(Boolean(ak)))||direction*compare(av,bv)||tie(a,b);
 };
 return {groups:[...groups.values()].sort(order).map(finish),summary:[...units.values()].sort((a,b)=>compare(a.unit,b.unit)).map(finish)};
}

/** Allocate the complete immutable snapshot before applying any display filters. */
function itemSummary(entries,q,priceKey){
 const items=new Map(),totals=new Map();
 for(const e of entries){const r=e.row,id=JSON.stringify([e.division,r.planKey,r.brandCode,...(r.allocationBrand?[r.allocationBrand,e.forecastBrand??'',e.matchType??'physical']:[])]);
  if(!items.has(id))items.set(id,{id,division:e.division,masterCode:r.masterCode,brandCode:r.brandCode,itemName:r.itemName,unit:r.unit,...(r.allocationBrand?{allocationBrand:r.allocationBrand,forecastBrand:e.forecastBrand??'',matchType:e.matchType??'physical',equivalenceDecisionId:e.equivalenceDecisionId??'',componentRuleId:e.componentRuleId??''}:{}),total:empty()});
  if(!totals.has(r.unit))totals.set(r.unit,empty());add(items.get(id).total,e,priceKey);add(totals.get(r.unit),e,priceKey);
 }
 const sorted=[...items.values()].sort((a,b)=>compare(a.masterCode,b.masterCode)||compare(a.brandCode,b.brandCode)||compare(a.division,b.division)||compare(a.unit,b.unit));
 const pageSize=100,pages=Math.max(1,Math.ceil(sorted.length/pageSize)),page=Math.min(q.itemPage,pages);
 return {total:sorted.length,page,pageSize,pages,rows:sorted.slice((page-1)*pageSize,page*pageSize).map(({total,...r})=>({...r,...cell(total)})),summary:[...totals].map(([unit,total])=>({unit,...cell(total)}))};
}
const allocationIdentity=e=>JSON.stringify([e.row.id,e.division,e.forecastBrand??'',e.matchType??'physical']);
function companionReport(a,q,rowMatches,ds,asOf,priceKey){
 const allLinks=[],rules=[];
 const component=(entry,qty)=>{if(!entry)return null;const r=entry.row,c=empty();add(c,{row:r,qty},priceKey);return {sourceRowId:r.id,allocationId:allocationIdentity(entry),planKey:r.planKey,brandCode:r.brandCode,allocationBrand:r.allocationBrand,forecastBrand:entry.forecastBrand,batch:r.batch??'',warehouse:r.warehouse,importDate:r.importDate,...age(r,asOf),unit:r.unit,quantity:number(qty),unitCost:r.quantityOnly?null:r[priceKey],valueInr:cell(c).valueInr,costPending:!r.quantityOnly&&r[priceKey]===null,quantityOnly:r.quantityOnly,assignedRO:r.assignedRO??'',priceReferenceRO:r.priceReferenceRO??'',ageBasis:r.ageBasis??''};};
 const totals=links=>{const machine=empty(),motor=empty();for(const l of links){add(machine,{row:l.machine.row,qty:l.qty},priceKey);if(l.motor)add(motor,{row:l.motor.row,qty:l.qty},priceKey);}return {machineAllocatedQuantity:number(machine.qty),motorRequirementQuantity:number(machine.qty),motorAllocatedQuantity:number(motor.qty),motorShortfallQuantity:number(machine.qty-motor.qty),machineKnownValueInr:amount(machine.value),motorKnownValueInr:amount(motor.value),combinedKnownValueInr:amount(machine.value+motor.value),machinePendingQty:number(machine.pendingPositive),motorPendingQty:number(motor.pendingPositive),machineQuantityOnlyQty:number(machine.quantityOnly),motorQuantityOnlyQty:number(motor.quantityOnly)};};
 for(const c of a.companions??[]){
  const links=c.links.filter(l=>(q.view==='overall'||ds.includes(l.division))&&(rowMatches(l.machine.row)||l.motor&&rowMatches(l.motor.row))&&(!q.bucket||age(l.machine.row,asOf).bucket===q.bucket||l.motor&&age(l.motor.row,asOf).bucket===q.bucket));
  if(!links.length&&(q.view==='allocated'&&!ds.length||!c.scopeRows.some(rowMatches)))continue;
  rules.push({id:c.id,decisionId:c.decisionId,motorPlanKey:c.motorPlanKey,motorBrand:c.motorBrand,unit:c.unit,...totals(links),suppressedForecastQuantity:number(sum(c.suppressed)),divisions:Object.fromEntries(LAE_AGING_DIVISIONS.map((d,i)=>[d,{...totals(links.filter(l=>l.division===d)),suppressedForecastQuantity:number(c.suppressed[i])}]))});for(const link of links)allLinks.push(link);
 }
 const pages=Math.max(1,Math.ceil(allLinks.length/q.pageSize)),page=Math.min(q.companionPage,pages);
 return {notice:'Analytical component links, not assembly or stock movement. Combined component value is supplementary and is already included once in physical stock totals. Each component retains its own age. Linked partner rows can be outside the current stock filters.',rules:rules.slice(0,500),ruleCount:rules.length,rulesTruncated:rules.length>500,links:{total:allLinks.length,page,pageSize:q.pageSize,pages,rows:allLinks.slice((page-1)*q.pageSize,page*q.pageSize).map(l=>({id:l.id,componentLinkId:l.id,componentRuleId:l.componentRuleId,division:l.division,quantity:number(l.qty),machine:component(l.machine,l.qty),motor:component(l.motor,l.qty)}))}};
}
function projectPlans(plans,brandPolicy){
 if(!brandPolicy)return {plans:structuredClone(plans.slice(0,500))};
 // Nested brand controls have their own total response bound; all aggregate
 // plan/division quantities continue to use the complete prepared population.
 const brandControlCount=plans.reduce((n,p)=>n+p.brandControls.length,0);let remaining=1000;
 const projected=plans.slice(0,500).map(p=>{const brands=p.brandControls.slice(0,remaining);remaining-=brands.length;return {...p,brandControls:brands,brandControlCount:p.brandControls.length,brandControlsTruncated:brands.length<p.brandControls.length};});
 return {plans:structuredClone(projected),brandControlCount,brandControlsReturned:1000-remaining,brandControlsTruncated:brandControlCount>1000-remaining};
}
function queryLaeAgingAllocation(snapshot,input={}){
 const s=snapshot,q=filters(input,s??{}),a=prepare(s),asOf=day(q.asOf),priceKey=q.basis==='original'?'originalInrUnit':'revisedInrUnit',tokens=normal(q.q).split(/\s+/).filter(Boolean),ds=q.divisions==='none'?[]:q.divisions?q.divisions.split(','):LAE_AGING_DIVISIONS;
 const categoryMatches=r=>(!q.productGroup||normal(q.productGroup)===normal(r.productGroup))&&(!q.unit||normal(q.unit)===normal(r.unit));
 const rowMatches=r=>categoryMatches(r)&&attributes.every(k=>!q[k]||normal(q[k])===normal(attribute(r,k)))&&tokens.every(t=>normal([r.masterCode,r.brandCode,r.itemName,r.batch,r.productGroup].join(' ')).includes(t));
 const overall=s.rows.filter(rowMatches).map(row=>({row,division:'',qty:quant(row.quantity)})),allocated=a.allocated.filter(e=>rowMatches(e.row)),unallocated=a.unallocated.filter(e=>rowMatches(e.row));
 const reportingEntries=[...allocated,...unallocated.map(e=>({...e,division:'UNALLOTTED'}))];
 const selected=(q.view==='overall'?overall:reportingEntries.filter(e=>ds.includes(e.division))).map(e=>({...e,...age(e.row,asOf)}));
 const result=aggregate(selected,{...q,priceKey}),detail=selected.filter(e=>!q.bucket||e.bucket===q.bucket).sort((a,b)=>(b.ageDays??-1)-(a.ageDays??-1)||compare(a.row.id,b.row.id)||compare(a.division,b.division)),pages=Math.max(1,Math.ceil(detail.length/q.pageSize)),page=Math.min(q.page,pages);
 const attributeFiltered=attributes.some(k=>q[k]);
 const planIds=new Set(overall.map(e=>e.row.planKey)),plans=a.controls.filter(p=>planIds.has(p.id)||!q.q&&!attributeFiltered&&categoryMatches(p));
 const units=[...new Set([...overall.map(e=>e.row.unit),...plans.map(p=>p.unit)])].sort();
 const allocationSummary=units.map(unit=>{const total=entries=>{const c=empty();for(const e of entries)if(e.row.unit===unit)add(c,e,priceKey);return cell(c);};return {unit,overall:total(overall),allocated:total(allocated),unallocated:total(unallocated),plannedQuantity:number(sum(plans.filter(p=>p.unit===unit).map(p=>quant(p.plannedQuantity)))),shortfallQuantity:number(sum(plans.filter(p=>p.unit===unit).map(p=>quant(p.shortfallQuantity))))};});
  const classificationFacets=Object.fromEntries(attributes.map(k=>[k==='blades'?'blades':k+'s',[...new Set(s.rows.filter(categoryMatches).map(r=>attribute(r,k)))].sort((a,b)=>a==='Not recorded'?1:b==='Not recorded'?-1:a.localeCompare(b,'en',{numeric:true,sensitivity:'base'}))]));
  return {filters:{...q,page},snapshot:{stockDate:s.stockDate,costDate:s.costDate,metadata:structuredClone(s.metadata??{})},buckets:LAE_AGING_ALLOCATION_BUCKETS.map(({id,label})=>({id,label})),facets:{divisions:LAE_AGING_STOCK_GROUPS.map(id=>({id,label:id==='UNALLOTTED'?'Unallotted':id})),productGroups:[...new Set(s.plans.map(p=>p.productGroup))].sort(),units:[...new Set(s.plans.map(p=>p.unit))].sort(),...classificationFacets},...result,
  divisions:LAE_AGING_STOCK_GROUPS.map(id=>({id,label:id==='UNALLOTTED'?'Unallotted':id,selected:ds.includes(id),summary:aggregate(reportingEntries.filter(e=>e.division===id).map(e=>({...e,...age(e.row,asOf)})),{...q,view:'allocated',priceKey}).summary})),
  coverage:{sourceRows:s.rows.length,selectedRows:selected.length,unknownDateRows:selected.filter(e=>e.bucket==='unknown').length,futureDateRows:selected.filter(e=>day(e.row.importDate)>asOf).length,priceBasis:q.basis,priceDate:s.costDate,quantityPrecision:6,unitPricePrecision:6},
  itemSummary:itemSummary(detail,q,priceKey),
  allocation:{planScopeNotice:attributeFiltered||q.q?'Plan and shortfall figures cover the full matching item plans. Stock totals above reflect the selected filters; filters do not redistribute planned quantities.':'',...projectPlans(plans,s.allocationPolicy==='brand-first-v1'),planCount:plans.length,plansTruncated:plans.length>500,divisionControls:units.flatMap(unit=>LAE_AGING_DIVISIONS.map(division=>{const ps=plans.filter(p=>p.unit===unit);return {unit,division,...Object.fromEntries(['plannedQuantity','allocatedQuantity','shortfallQuantity',...(s.allocationPolicy==='brand-first-v1'?['forecastPlannedQuantity','suppressedForecastQuantity','companionDerivedQuantity']:[])].map(k=>[k,number(sum(ps.map(p=>quant(p.divisions[division][k]))))]))};})),summary:allocationSummary,...(s.allocationPolicy==='brand-first-v1'?{allocationPolicy:s.allocationPolicy,companions:companionReport(a,q,rowMatches,ds,asOf,priceKey)}:{}),policy:s.allocationPolicy==='brand-first-v1'?'Exact brand demand first; confirmed brand-only equivalence uses residual stock and demand. Oldest eligible stock and proportional division shortages use stable largest remainders. Matching identity adjustments reduce capacity. CCM10 demand follows eligible allocated machines; component values remain separate physical stock.':'Oldest known import date first; unknown dates last. Proportional shortage and oldest-batch sharing with stable largest remainders. Negative adjustments remain unallocated.'},
  drilldown:{total:detail.length,page,pageSize:q.pageSize,pages,rows:detail.slice((page-1)*q.pageSize,page*q.pageSize).map(e=>{const r=e.row,p=r[priceKey],c=empty();add(c,e,priceKey);return {id:r.id,allocationId:s.allocationPolicy==='brand-first-v1'?allocationIdentity(e):JSON.stringify([r.id,e.division]),sourceQuantity:r.quantity,partialAllocation:e.qty!==quant(r.quantity),planKey:r.planKey,division:e.division,productGroup:r.productGroup,masterCode:r.masterCode,brandCode:r.brandCode,itemName:r.itemName,batch:r.batch??'',warehouse:r.warehouse,importDate:r.importDate,ageDays:e.ageDays,bucket:e.bucket,unit:r.unit,quantity:number(e.qty),unitCost:r.quantityOnly?null:p,valueInr:cell(c).valueInr,costPending:!r.quantityOnly&&p===null,quantityOnly:r.quantityOnly,...(s.allocationPolicy==='brand-first-v1'?{allocationBrand:r.allocationBrand,forecastBrand:e.forecastBrand??'',matchType:e.matchType??'physical',equivalenceDecisionId:e.equivalenceDecisionId??'',componentRuleId:e.componentRuleId??'',componentAllocationId:e.componentRuleId?allocationIdentity(e):'',componentLinkCount:e.componentLinkCount??0,adjustmentOffsetQuantity:e.adjustmentOffsetQuantity??0,surplusQuantity:e.surplusQuantity??0,assignedRO:r.assignedRO??'',priceReferenceRO:r.priceReferenceRO??'',ageBasis:r.ageBasis??'',unallocatedReason:e.unallocatedReason??''}:{})};})}};
}

return {validateLaeAgingAllocationSnapshot,queryLaeAgingAllocation,validateLaeAgingAllocationQuery:(input={},stockDate='1970-01-01')=>filters(input,{stockDate})};
})();
export const validateLaeAgingAllocationSnapshot=laeAllocationDomain.validateLaeAgingAllocationSnapshot;
export const queryLaeAgingAllocation=laeAllocationDomain.queryLaeAgingAllocation;
export const validateLaeAgingAllocationQuery=laeAllocationDomain.validateLaeAgingAllocationQuery;
