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
export const LAE_AGING_ALLOCATION_QUERY_KEYS=Object.freeze(['view','divisions','productGroup','unit','q','bucket','page','pageSize','itemPage','basis','asOf','engine','grade','blades','vendor','display','sort','direction','sortMetric']);
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
 return s;
}

function filters(input,s){
 if(!object(input))fail('Invalid aging filters.');
 for(const [k,v] of Object.entries(input))if(!LAE_AGING_ALLOCATION_QUERY_KEYS.includes(k)||typeof v!=='string'||v.length>500)fail('Invalid aging filter.');
 const q={view:'overall',divisions:'',productGroup:'',unit:'',q:'',bucket:'',page:'1',pageSize:'50',itemPage:'1',basis:'revised',asOf:s.stockDate,engine:'',grade:'',blades:'',vendor:'',display:'both',sort:'total',direction:'desc',sortMetric:'value',...input};
 if(!['both','quantity','value'].includes(q.display)||!['asc','desc'].includes(q.direction)||!['value','quantity'].includes(q.sortMetric)||!['total','totalValue','category',...LAE_AGING_ALLOCATION_BUCKETS.map(b=>b.id)].includes(q.sort))fail('Invalid aging display or sort.');
 if(q.display!=='both')q.sortMetric=q.display;
 if(!['overall','allocated'].includes(q.view)||!['original','revised'].includes(q.basis)||day(q.asOf)===null||q.asOf<s.stockDate||q.bucket&&!LAE_AGING_ALLOCATION_BUCKETS.some(b=>b.id===q.bucket))fail('Invalid aging view, price basis, date or band.');
 const ds=q.divisions&&q.divisions!=='none'?q.divisions.split(','):[];
 if(ds.some(d=>!LAE_AGING_STOCK_GROUPS.includes(d))||new Set(ds).size!==ds.length)fail('Invalid division filter.');
 if(!/^\d{1,7}$/.test(q.page)||Number(q.page)<1||!/^\d{1,7}$/.test(q.itemPage)||Number(q.itemPage)<1||!/^\d{1,3}$/.test(q.pageSize)||Number(q.pageSize)<1||Number(q.pageSize)>200)fail('Invalid aging detail page.');
 q.divisions=q.divisions==='none'?'none':LAE_AGING_STOCK_GROUPS.filter(d=>ds.includes(d)).join(',');q.page=Number(q.page);q.pageSize=Number(q.pageSize);q.itemPage=Number(q.itemPage);return q;
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
const frozenPreparation=new WeakMap();
function prepare(s){
 const immutable=object(s)&&Object.isFrozen(s)&&Array.isArray(s.rows)&&Object.isFrozen(s.rows)&&s.rows.every(r=>object(r)&&Object.isFrozen(r))&&Array.isArray(s.plans)&&Object.isFrozen(s.plans)&&s.plans.every(p=>object(p)&&Object.isFrozen(p)&&object(p.quantities)&&Object.isFrozen(p.quantities));
 if(immutable&&frozenPreparation.has(s))return frozenPreparation.get(s);
 validateLaeAgingAllocationSnapshot(s);const result=allocate(s);if(immutable)frozenPreparation.set(s,result);return result;
}
function empty(){return {qty:0n,value:0n,known:0n,pending:0n,knownPositive:0n,pendingPositive:0n,quantityOnly:0n,positive:0n,negative:0n,knownRows:0,rows:0};}
function add(c,entry,priceKey){const {row:r,qty}=entry;c.qty+=qty;c.positive+=qty>0n?qty:0n;c.negative+=qty<0n?qty:0n;c.rows++;if(r.quantityOnly)c.quantityOnly+=qty;else if(r[priceKey]===null){c.pending+=qty;c.pendingPositive+=qty>0n?qty:0n;}else{c.known+=qty;c.knownPositive+=qty>0n?qty:0n;c.value+=qty*money(r[priceKey]);if(qty)c.knownRows++;}}
function cell(c){return {quantity:number(c.qty),valueInr:c.knownRows?amount(c.value):null,knownValueInr:amount(c.value),knownQty:number(c.known),pendingQty:number(c.pending),knownPositiveQty:number(c.knownPositive),pendingPositiveQty:number(c.pendingPositive),quantityOnlyQty:number(c.quantityOnly),positive:number(c.positive),negative:number(c.negative),rows:c.rows};}
function aggregate(entries,q){
 const groups=new Map(),units=new Map();
 const make=extra=>({...extra,total:empty(),buckets:Object.fromEntries(LAE_AGING_ALLOCATION_BUCKETS.map(b=>[b.id,empty()]))});
 for(const e of entries){const r=e.row,division=q.view==='allocated'?e.division:'',id=JSON.stringify([division,r.productGroup,r.unit]);
  if(!groups.has(id))groups.set(id,make({id,division,productGroup:r.productGroup,unit:r.unit}));if(!units.has(r.unit))units.set(r.unit,make({unit:r.unit}));
  for(const target of [groups.get(id),units.get(r.unit)]){add(target.total,e,q.priceKey);add(target.buckets[e.bucket],e,q.priceKey);}
 }
  const finish=g=>{const {total,buckets,...rest}=g;return {...rest,...cell(total),buckets:Object.fromEntries(Object.entries(buckets).map(([k,v])=>[k,cell(v)]))};};
 const tie=(a,b)=>compare(a.division,b.division)||compare(a.productGroup,b.productGroup)||compare(a.unit,b.unit);
 const order=(a,b)=>{
  const direction=q.direction==='asc'?1:-1;
  if(q.sort==='category')return direction*a.productGroup.localeCompare(b.productGroup,'en',{numeric:true,sensitivity:'base'})||tie(a,b);
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
 for(const e of entries){const r=e.row,id=JSON.stringify([e.division,r.planKey,r.brandCode]);
  if(!items.has(id))items.set(id,{id,division:e.division,masterCode:r.masterCode,brandCode:r.brandCode,itemName:r.itemName,unit:r.unit,total:empty()});
  if(!totals.has(r.unit))totals.set(r.unit,empty());add(items.get(id).total,e,priceKey);add(totals.get(r.unit),e,priceKey);
 }
 const sorted=[...items.values()].sort((a,b)=>compare(a.masterCode,b.masterCode)||compare(a.brandCode,b.brandCode)||compare(a.division,b.division)||compare(a.unit,b.unit));
 const pageSize=100,pages=Math.max(1,Math.ceil(sorted.length/pageSize)),page=Math.min(q.itemPage,pages);
 return {total:sorted.length,page,pageSize,pages,rows:sorted.slice((page-1)*pageSize,page*pageSize).map(({total,...r})=>({...r,...cell(total)})),summary:[...totals].map(([unit,total])=>({unit,...cell(total)}))};
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
  allocation:{planScopeNotice:attributeFiltered||q.q?'Plan and shortfall figures cover the full matching item plans. Stock totals above reflect the selected filters; filters do not redistribute planned quantities.':'',plans:structuredClone(plans.slice(0,500)),planCount:plans.length,plansTruncated:plans.length>500,divisionControls:units.flatMap(unit=>LAE_AGING_DIVISIONS.map(division=>{const ps=plans.filter(p=>p.unit===unit);return {unit,division,...Object.fromEntries(['plannedQuantity','allocatedQuantity','shortfallQuantity'].map(k=>[k,number(sum(ps.map(p=>quant(p.divisions[division][k]))))]))};})),summary:allocationSummary,policy:'Oldest known import date first; unknown dates last. Proportional shortage and oldest-batch sharing with stable largest remainders. Negative adjustments remain unallocated.'},
  drilldown:{total:detail.length,page,pageSize:q.pageSize,pages,rows:detail.slice((page-1)*q.pageSize,page*q.pageSize).map(e=>{const r=e.row,p=r[priceKey],c=empty();add(c,e,priceKey);return {id:r.id,allocationId:JSON.stringify([r.id,e.division]),sourceQuantity:r.quantity,partialAllocation:e.qty!==quant(r.quantity),planKey:r.planKey,division:e.division,productGroup:r.productGroup,masterCode:r.masterCode,brandCode:r.brandCode,itemName:r.itemName,batch:r.batch??'',warehouse:r.warehouse,importDate:r.importDate,ageDays:e.ageDays,bucket:e.bucket,unit:r.unit,quantity:number(e.qty),unitCost:r.quantityOnly?null:p,valueInr:cell(c).valueInr,costPending:!r.quantityOnly&&p===null,quantityOnly:r.quantityOnly};})}};
}

return {validateLaeAgingAllocationSnapshot,queryLaeAgingAllocation,validateLaeAgingAllocationQuery:(input={},stockDate='1970-01-01')=>filters(input,{stockDate})};
})();
export const validateLaeAgingAllocationSnapshot=laeAllocationDomain.validateLaeAgingAllocationSnapshot;
export const queryLaeAgingAllocation=laeAllocationDomain.queryLaeAgingAllocation;
export const validateLaeAgingAllocationQuery=laeAllocationDomain.validateLaeAgingAllocationQuery;
