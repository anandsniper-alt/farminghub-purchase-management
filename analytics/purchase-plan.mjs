import {ANALYTICS_CENTRES as CENTRES} from './store.mjs';

const sum=a=>a.reduce((n,x)=>n+(x??0),0), key=(...a)=>JSON.stringify(a);
export function apportion(total,weights){
 if(!Number.isSafeInteger(total)||total<0||weights.some(x=>!Number.isSafeInteger(x)||x<0))throw Error('Invalid allocation');
 const s=sum(weights);if(!s)return weights.map(()=>0);
 if(!Number.isSafeInteger(s))throw Error('Allocation exceeds safe quantity bounds');
 // Exact integer remainders avoid a floating-point tie choosing a different SKU.
 const denominator=BigInt(s),raw=weights.map(x=>BigInt(total)*BigInt(x)),out=raw.map(x=>Number(x/denominator));
 const order=raw.map((x,i)=>({i,f:x%denominator})).sort((a,b)=>a.f===b.f?a.i-b.i:a.f>b.f?-1:1);
 for(let n=total-sum(out),i=0;i<n;i++)out[order[i].i]++;
 return out;
}
export function rollSupply(demand,stock,pipeline){
 let balance=Math.max(0,stock??0);const months=demand.map((q,i)=>{const opening=balance,arrival=pipeline[i]??0,need=q??0,purchase=Math.max(0,need-opening-arrival);balance=opening+arrival+purchase-need;return {opening,arrival,demand:q,purchase,closing:balance};});
 const net=Math.max(0,sum(demand)-Math.max(0,stock??0)-sum(pipeline));
 return {months,net,timed:sum(months.map(x=>x.purchase)),closing:balance};
}
const addDays=(date,n)=>new Date(Date.parse(date+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
export function buildPurchasePlan(master,sales,forecast,settings={}){
 const scenario={demand:Number(settings.demand??1),delay:Number(settings.delay??0),lead:Number(settings.lead??60),stock:settings.stock||'all'};
 if(![0.8,1,1.2].includes(scenario.demand)||![0,1].includes(scenario.delay)||![30,60,90,120].includes(scenario.lead)||!['all','exclude-north'].includes(scenario.stock))throw Error('Invalid planning scenario');
 const fy=sales.abp.fy,cutoff=sales.meta.cutoff,months=forecast.meta.months;
 const cutMonth=cutoff.slice(0,7),cutIndex=months.indexOf(cutMonth);if(cutIndex!==0||months.length!==6)throw Error('Planning requires October-March coverage with an October cutoff');
 const cutDay=Number(cutoff.slice(-2)),days=new Date(Date.UTC(Number(cutoff.slice(0,4)),10,0)).getUTCDate(),weights=months.map((_,i)=>i?days:days-cutDay),remainingMonths=sum(weights)/days;
 const current=sales.rows.filter(r=>r.fy===fy),catalog=new Map(master.items.map(x=>[x.code,{...x,mapped:true}]));
 for(const r of current)if(!catalog.has(r.code))catalog.set(r.code,{code:r.code,category:r.category,engine:r.engine,grade:r.grade,model:r.model,description:r.sourceSku||'',mapped:false,stock:null,locations:Array(5).fill(null),pipelineTotal:null,pipeline:[],sourceRow:null});
 const items=[...catalog.values()].map(x=>({...x,engine:x.engine||'Unspecified',grade:x.grade||'Unspecified',sales:0,completed:0,monthlySales:Array(6).fill(0),centres:{},demand:Array(6).fill(null),forecast:Array(6).fill(null),allocations:[],flags:[]})),byCode=new Map(items.map(x=>[x.code,x]));
 const saleGroups=new Map(),foreGroups=new Map(),categories=new Set([...items.map(x=>x.category),...sales.abp.rows.map(x=>x.category)]);
 for(const r of current){const k=key(r.centre,r.category);if(!saleGroups.has(k))saleGroups.set(k,{ytd:0,completed:0,oct:0,monthly:Array(6).fill(0)});const s=saleGroups.get(k),it=byCode.get(r.code),y=sum(r.months),c=sum(r.months.slice(3,9));s.ytd+=y;s.completed+=c;s.oct+=r.months[9]??0;it.sales+=y;it.completed+=c;it.centres[r.centre]??={sales:0,oct:0,remaining:0};it.centres[r.centre].sales+=y;it.centres[r.centre].oct+=r.months[9]??0;for(let m=0;m<6;m++){s.monthly[m]+=r.months[m+3]??0;it.monthlySales[m]+=r.months[m+3]??0;}}
 for(const r of forecast.rows){const cat=byCode.get(r.code)?.category;if(!cat)throw Error('Forecast item absent from MASTER');const k=key(r.centre,cat,r.month);if(!foreGroups.has(k))foreGroups.set(k,[]);foreGroups.get(k).push(r);}
 const targets=[],voids=[],issues=[];let seq=0;
 const issue=(priority,type,detail,extra={})=>issues.push({id:'P'+String(++seq).padStart(3,'0'),priority,type,detail,...extra});
 issue('High','Stock cutoff','MASTER stock date is unknown. Confirm stock and sales share the 14 October cutoff before ordering. No sales are deducted again from the reported balance.');
 issue('High','Pipeline validity','Confirm the '+master.meta.controls.pipeline+' source pipeline units are still open, are not already in stock, and can arrive in the labelled months. Base case assumes arrival before monthly demand.');
 issue('High','Transfers','All-centre planning pools the same item code across warehouses, including Chennai once. Confirm transfer availability; compare the scenario excluding North stock.');
 issue('High','B2C target basis','B2C monthly target is provisional: April-September category sales / 6; full-year equivalent is that average x 12. Partial October is excluded from the average.');
 issue('High','Monthly target phasing','Remaining B2B and B2C category demand is provisionally level-loaded over the remaining FY: October has 17/31 of a month, then five full months. Forecast supplies SKU mix, not approved seasonal monthly category targets. Confirm this phasing.');
 issue('High','North closure','North uses the supplied October-March SKU forecast, less October sales at the same item code. No new demand is extrapolated after the supplied plan. Confirm closure date and whether goods may be transferred.');
 issue('Medium','Forecast dates',forecast.meta.periodNote);
 issue('Medium','Lead times and MOQ','Order-by dates use the selected illustrative lead time. Supplier production, transit, customs, MOQ, pack size, safety stock, budget and landed costs are not supplied; no financial buying commitment is calculated.');
 issue('High','Component consumption','BOM / assembly consumption is not supplied. Motors, engines, blades and other components may be consumed within finished products without a direct sales line. No-sales stock is a review flag, not proof of excess or obsolescence; component demand may be missing.');
 issue('Medium','Units and returns','Confirm units of measure and pack conversions, especially hoses and spares. The file reports quantities without sales values or returns treatment; mixed-category totals are reported quantity sums, not purchasing value.');
 issue('Medium','TN history','FY2025-26 TN completeness remains pending; do not use it for year-on-year guidance.');
 const norm=x=>String(x).toUpperCase().replace(/[^A-Z0-9]/g,''),conflicts=current.filter(r=>r.mapped&&norm(r.sourceGroup)!==norm(r.category));
 if(conflicts.length)issue('Medium','Sales classification','Some sales source categories differ from MASTER. Exact item-code MASTER classification is retained; original categories and row references remain in Sales history.',{quantity:sum(conflicts.map(r=>r.total)),source:conflicts.map(r=>'Sheet1 row '+r.sourceRow).join(', ')});
 issue('Medium','Main segment','No approved higher-level main-segment mapping was supplied. Engine/blade and grade segments are available; higher-level segments remain Unassigned.');
 for(const e of master.exceptions)issue('High','MASTER discrepancy',e.detail,{code:e.item,source:e.source});
 for(const e of forecast.meta.exceptions||[])issue('High','Forecast total discrepancy','Brand inputs sum to '+sum(e.brands)+' but cached MASTER total is '+e.cached+'. MASTER total retained.',{code:master.items.find(x=>x.sourceRow===Number(e.cells[0].match(/\d+$/)[0]))?.code,source:e.cells.join(', ')});
 const plans=new Map(sales.abp.rows.map(r=>[key(r.centre,r.category),r]));
 for(const centre of CENTRES)for(const category of [...categories].sort()){
  const s=saleGroups.get(key(centre,category))||{ytd:0,completed:0,oct:0,monthly:Array(6).fill(0)},fs=months.map(m=>foreGroups.get(key(centre,category,m))||[]),known=fs.some(a=>a.some(r=>r.quantity!==null)),raw=sum(fs.flatMap(a=>a.map(r=>r.quantity))),official=plans.get(key(centre,category));
  if(!s.ytd&&!known&&!official)continue;
  let annual=null,basis='Missing ABP',monthlyAverage=null,closureTarget=null,remaining=null,monthTargets=Array(6).fill(null);
  if(centre===CENTRES[0]){monthlyAverage=s.completed/6;annual=s.completed*2;basis='Provisional completed-month average';}
  else if(centre===CENTRES[3]){closureTarget=known?raw:null;annual=known?s.completed+raw:null;basis='Forecast closeout + completed sales (FY equivalent)';}
  else if(official?.quantity!==null&&official?.quantity!==undefined){annual=official.quantity;basis='Approved category ABP';}
  if(centre!==CENTRES[3]&&annual!==null){remaining=Math.max(0,annual-s.ytd);monthTargets=apportion(Math.round(remaining*scenario.demand),weights);}
  let allocated=0,unallocated=0;const details=[];
  for(let mi=0;mi<6;mi++){
   const rows=fs[mi],present=rows.filter(r=>r.quantity!==null),positive=rows.filter(r=>r.quantity>0),sourceTotal=sum(rows.map(r=>r.quantity));let allocations=[];
   if(centre===CENTRES[3]){
    allocations=present.map(r=>({r,q:Math.max(0,r.quantity-(mi===0?(byCode.get(r.code).centres[centre]?.oct||0):0))}));
    monthTargets[mi]=present.length?sum(allocations.map(x=>x.q)):null;
   }else if(monthTargets[mi]!==null&&sourceTotal>0){const shares=apportion(monthTargets[mi],positive.map(r=>r.quantity));allocations=positive.map((r,i)=>({r,q:shares[i]}));}
   const a=sum(allocations.map(x=>x.q)),u=monthTargets[mi]===null?null:Math.max(0,monthTargets[mi]-a);allocated+=a;unallocated+=u??0;
   details.push({month:months[mi],target:monthTargets[mi],sourceForecast:present.length?sourceTotal:null,allocated:a,unallocated:u,knownItems:present.length});
   if(u>0||!present.length&&(monthTargets[mi]>0||centre===CENTRES[3]&&known))voids.push({centre,category,month:months[mi],quantity:u,reason:!present.length?'No SKU forecast supplied':'No positive SKU quantities to allocate',note:'Select item codes and quantities before purchase planning.'});
   for(const {r,q} of allocations){const it=byCode.get(r.code);it.demand[mi]=(it.demand[mi]??0)+q;it.forecast[mi]=(it.forecast[mi]??0)+r.quantity;it.centres[centre]??={sales:0,oct:0,remaining:0};it.centres[centre].remaining+=q;it.allocations.push({centre,month:months[mi],source:r.quantity,quantity:q,cells:r.cells});}
  }
  if(centre===CENTRES[3])remaining=known?sum(monthTargets):null;
  const requiredMonthly=remaining===null?null:remaining/remainingMonths,runRate=s.completed/6;
  targets.push({centre,category,annual,basis,monthlyAverage,closureTarget,sales:s.ytd,completed:s.completed,remaining,scenarioRemaining:sum(monthTargets),allocated,unallocated,monthly:details,runRate,requiredMonthly,paceMultiple:runRate>0&&requiredMonthly!==null?requiredMonthly/runRate:null});
  if(annual===null&&(s.ytd||raw))issue('High','Missing category ABP','Sales or forecast exists without a category target; demand is not invented.',{centre,category,quantity:s.ytd,sourceForecast:raw});
 }
 for(const it of items){
  const usable=it.stock===null?null:Math.max(0,it.stock-(scenario.stock==='exclude-north'?(it.locations[3]??0):0)),pipeline=months.map((m,i)=>{const p=it.pipeline.find(p=>p.month===months[i-scenario.delay]);return p?.quantity??0;}),supply=rollSupply(it.demand,usable,pipeline);
  it.usableStock=usable;it.pipelineScheduled=pipeline;it.pipelineInHorizon=sum(pipeline);it.remaining=sum(it.demand);it.netPurchase=it.mapped?supply.net:null;it.timedPurchase=it.mapped?supply.timed:null;it.timingGap=it.mapped?supply.timed-supply.net:null;
  it.schedule=supply.months.map((r,i)=>({...r,month:months[i],requiredBy:i===0?addDays(cutoff,1):months[i]+'-01',orderBy:addDays(i===0?addDays(cutoff,1):months[i]+'-01',-scenario.lead)}));
  it.earliest=it.schedule.find(x=>x.purchase>0)?.month||null;it.orderBy=it.schedule.find(x=>x.purchase>0)?.orderBy||null;it.coverMonths=it.completed>0&&usable!==null?usable/(it.completed/6):null;it.noRecentSales=it.completed===0&&it.stock>0;it.excess=Math.max(0,(usable??0)+it.pipelineInHorizon-it.remaining);
  const first=sum(it.monthlySales.slice(0,3)),last=sum(it.monthlySales.slice(3));it.recentChange=first>0?(last-first)/first*100:null;
  if(!it.mapped)it.flags.push('No MASTER classification / supply');
  if(it.sales>0&&!it.allocations.some(x=>x.quantity>0))it.flags.push('Sales without an allocated remaining forecast');
  if((it.sales>0||it.remaining>0)&&it.demand.some(x=>x===null))it.flags.push('Unallocated SKU months: '+months.filter((_,i)=>it.demand[i]===null).join(', '));
  if(it.noRecentSales)it.flags.push('Stock with no reported April-September sales');
  if(it.completed===0&&it.remaining>0)it.flags.push('Planned SKU has no reported completed-month sales; confirm new-model / replacement demand');
  if(it.timingGap>0)it.flags.push('Supply timing gap: consider expediting / transfer before extra buying');
  if(master.exceptions.some(e=>e.item===it.code))it.flags.push('MASTER balance discrepancy');
  if((forecast.meta.exceptions||[]).some(e=>Number(e.cells[0].match(/\d+$/)[0])===it.sourceRow))it.flags.push('MASTER forecast total differs from brand inputs');
  if(it.orderBy&&it.orderBy<=cutoff)it.flags.push('Illustrative order-by date already reached');
  it.priority=it.timedPurchase>0?(it.netPurchase===0?'Timing only':it.orderBy<=cutoff?'Urgent sourcing':'Plan purchase'):it.flags.length?'Review':'Covered';
 }
 const group=(field,list=items)=>{const groups=new Map();for(const it of list){const k=field==='segment'?it.category+' → '+it.engine+' → '+it.grade:it[field];if(!groups.has(k))groups.set(k,[]);groups.get(k).push(it);}return [...groups].map(([label,rows])=>({label,category:rows[0].category,engine:field==='segment'?rows[0].engine:null,grade:field==='segment'?rows[0].grade:null,items:rows.length,sales:sum(rows.map(x=>x.sales)),stock:sum(rows.map(x=>x.stock)),pipeline:sum(rows.map(x=>x.pipelineTotal)),remaining:sum(rows.map(x=>x.remaining)),netPurchase:sum(rows.map(x=>x.netPurchase)),timedPurchase:sum(rows.map(x=>x.timedPurchase)),timingGap:sum(rows.map(x=>x.timingGap)),excess:sum(rows.map(x=>x.excess)),missingSupply:rows.filter(x=>!x.mapped).length,voidItems:rows.filter(x=>x.flags.includes('Sales without an allocated remaining forecast')).length})).sort((a,b)=>b.netPurchase-a.netPurchase||a.label.localeCompare(b.label));};
 const categoryRows=group('category');for(const r of categoryRows){const ts=targets.filter(t=>t.category===r.label);r.abp=ts.some(t=>t.annual!==null)?sum(ts.map(t=>t.annual)):null;r.targetRemaining=sum(ts.map(t=>t.remaining));r.unallocated=sum(ts.map(t=>t.unallocated));r.missingTargets=ts.filter(t=>t.annual===null).length;r.paceMultiple=sum(ts.map(t=>t.completed))>0?r.targetRemaining/remainingMonths/(sum(ts.map(t=>t.completed))/6):null;}
 const centres=CENTRES.map((centre,index)=>{const ts=targets.filter(t=>t.centre===centre);return {centre,sales:sum(ts.map(t=>t.sales)),abp:sum(ts.map(t=>t.annual)),remaining:sum(ts.map(t=>t.remaining)),allocated:sum(ts.map(t=>t.allocated)),unallocated:sum(ts.map(t=>t.unallocated)),localStock:sum(master.items.map(x=>x.locations[index])),closureTarget:centre===CENTRES[3]?sum(ts.map(t=>t.closureTarget)):null};});
 const totals={sales:sum(items.map(x=>x.sales)),abp:sum(targets.map(x=>x.annual)),approvedAbp:sum(sales.abp.rows.map(x=>x.quantity)),remaining:sum(targets.map(x=>x.remaining)),allocated:sum(items.map(x=>x.remaining)),unallocated:sum(targets.map(x=>x.unallocated)),stock:sum(master.items.map(x=>x.stock)),pipeline:sum(master.items.map(x=>x.pipelineTotal)),netPurchase:sum(items.map(x=>x.netPurchase)),timedPurchase:sum(items.map(x=>x.timedPurchase)),timingGap:sum(items.map(x=>x.timingGap)),excess:sum(items.map(x=>x.excess)),unmappedSales:sum(items.filter(x=>!x.mapped).map(x=>x.sales)),missingTargets:targets.filter(x=>x.annual===null).length,voidItems:items.filter(x=>x.sales>0&&!x.remaining).length};
 const monthly=months.map((month,i)=>({month,target:sum(targets.map(t=>t.monthly[i].target)),allocated:sum(items.map(x=>x.demand[i])),unallocated:sum(targets.map(t=>t.monthly[i].unallocated)),pipeline:sum(items.map(x=>x.pipelineScheduled[i])),purchase:sum(items.map(x=>x.schedule[i].purchase)),blankCategoryCentres:voids.filter(v=>v.month===month).length}));
 if(totals.unallocated)issue('High','Unallocated category demand',totals.unallocated+' units of scenario demand have no positive SKU forecast for their month. Purchase totals are incomplete until these allocations are supplied.',{quantity:totals.unallocated});
 if(totals.unmappedSales)issue('High','Unmapped sales',totals.unmappedSales+' FY sales units have no MASTER classification or supply match. They remain visible; no fuzzy SKU match is used.',{quantity:totals.unmappedSales});
 const north=centres.find(x=>x.centre===CENTRES[3]),northFloor=north.remaining-Math.max(0,north.abp-north.sales);
 if(northFloor>0)issue('Medium','North item overachievement','North remaining demand exceeds its aggregate FY balance by '+northFloor+' units because October sales above one item forecast cannot reduce another item forecast.',{centre:CENTRES[3],quantity:northFloor});
 for(const t of targets.filter(t=>t.paceMultiple>1.5))issue('Medium','Target pace',`Remaining target requires ${t.paceMultiple.toFixed(1)}x the completed-month sales pace. Discuss demand confidence before committing.`,{centre:t.centre,category:t.category});
 const priorities=items.filter(x=>x.timedPurchase>0).sort((a,b)=>(a.earliest||'').localeCompare(b.earliest||'')||b.netPurchase-a.netPurchase);
 const sensitivity=settings._skipSensitivity?[]:[['Base demand, on-time pipeline',1,0],['Demand -20%, on-time pipeline',0.8,0],['Demand +20%, on-time pipeline',1.2,0],['Base demand, pipeline one month late',1,1]].map(([label,demand,delay])=>{const t=demand===scenario.demand&&delay===scenario.delay?totals:buildPurchasePlan(master,sales,forecast,{...scenario,demand,delay,_skipSensitivity:true}).totals;return {label,net:t.netPurchase,timed:t.timedPurchase};});
 return {fy,cutoff,months,scenario,totals,monthly,centres,targets,categories:categoryRows,segments:group('segment'),items:items.sort((a,b)=>b.netPurchase-a.netPurchase||a.code.localeCompare(b.code)),priorities:priorities.slice(0,30).map(x=>x.code),voids,issues,sensitivity,method:{demand:'Remaining annual category target is split over October remainder and November-March by equal full-month weights; partial October weight is remaining calendar days / 31. Within each month, positive MASTER SKU forecast shares allocate whole units by largest remainder.',north:'North retains exact forecast SKU quantities, subtracts October reported sales at the same code, and is not scaled by demand scenarios. FY equivalent = April-September actual sales + October-March source closeout plan.',supply:'All-centre same-item stock is counted once. Annual net purchase and monthly timing shortfalls are separate. Missing SKU demand is excluded from purchase totals, never treated as fulfilled.',forecast:'All-blank brand inputs with a zero cached total remain missing. Nonzero cached MASTER totals are retained; discrepancies are flagged.',limits:'Provisional quantity guidance, not a PO or spend authorization. No value ranking, MOQ rounding, safety stock or supplier promise is inferred.'}};
}
