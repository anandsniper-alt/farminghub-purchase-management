import {assertAnalyticsAccess, ANALYTICS_CENTRES} from './store.mjs';
import {RuleError} from './access.mjs';

export const REVIEW_ZONES = [
  {centre:'B2B - Karnal', label:'North'},
  {centre:'B2B - AP / TS', label:'AP / Telangana'},
  {centre:'B2B - TN', label:'Tamil Nadu'},
  {centre:'B2C - TN', label:'Farming Hub'},
];
const order = [4,5,6,7,8,9,10,11,12,1,2,3];
const key = (...parts) => JSON.stringify(parts);
const fyFor = date => { const y=Number(date.slice(0,4))-(Number(date.slice(5,7))<4?1:0); return `FY${y}-${String((y+1)%100).padStart(2,'0')}`; };
const fyDate = (fy,m) => `${Number(fy.slice(2,6))+(m<4?1:0)}-${String(m).padStart(2,'0')}`;
const prior = fy => `FY${Number(fy.slice(2,6))-1}-${fy.slice(4,6)}`;
const measured = (quantity=null, complete=false) => ({quantity, complete});
export function combineMeasures(values) {
  const known=values.filter(v=>v.quantity!==null);
  return measured(known.length?known.reduce((n,v)=>n+v.quantity,0):null, values.length>0&&values.every(v=>v.complete));
}
const numeric = values => combineMeasures(values.map(v=>measured(v,v!==null)));
const fail = (message,code='VALIDATION') => {throw new RuleError(message,code);};
const sort = values => [...new Set(values)].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));

export function createReviewIndex(master, sales, forecast=null) {
  const items=new Map(), masterKeys=new Map();
  for(const item of master.items) {
    const id=key('MASTER',item.code);
    items.set(id,{...item,id,engine:item.engine||'Unspecified',grade:item.grade||'Unspecified',mapped:true,sales:new Map(),forecast:new Map(),sources:[]});
    masterKeys.set(item.code,id);
  }
  for(const row of sales.rows) {
    const id=row.mapped&&masterKeys.has(row.code)?masterKeys.get(row.code):key('SALES',row.code,row.category,row.engine,row.grade);
    if(!items.has(id))items.set(id,{id,code:row.code,model:row.model||'',category:row.category,engine:row.engine,grade:row.grade,description:'Sales item not matched to MASTER',mapped:false,stock:null,pipelineTotal:null,locations:Array(5).fill(null),sales:new Map(),forecast:new Map(),sources:[]});
    const item=items.get(id), k=key(row.fy,row.centre);
    if(!item.sales.has(k))item.sales.set(k,Array(12).fill(0));
    row.months.forEach((v,i)=>item.sales.get(k)[i]+=v??0);
    item.sources.push({row:row.sourceRow,fy:row.fy,centre:row.centre,sku:row.sourceSku});
  }
  for(const row of forecast?.rows||[]) {
    const item=items.get(masterKeys.get(row.code));
    if(item)item.forecast.set(key(row.centre,row.month),row.quantity);
  }
  const controls=new Map(sales.meta.controls.map(c=>[key(c.fy,c.centre),c]));
  return {master,sales,forecast,items:[...items.values()],controls,currentFy:fyFor(sales.meta.cutoff),cutoff:sales.meta.cutoff};
}

function monthComplete(date,cutoff) {
  if(date<cutoff.slice(0,7))return true;
  if(date>cutoff.slice(0,7))return false;
  return Number(cutoff.slice(-2))===new Date(Date.UTC(Number(date.slice(0,4)),Number(date.slice(5,7)),0)).getUTCDate();
}
function salesMeasure(index,item,dates,centres) {
  const values=[];
  for(const centre of centres)for(const date of dates) {
    const fy=fyFor(date), m=Number(date.slice(5,7)), rows=item.sales.get(key(fy,centre));
    const control=index.controls.get(key(fy,centre));
    const incompleteHistory=fy<index.currentFy&&index.sales.meta.comparisonExcludedCentres.includes(centre);
    const available=control?.months[m-1]!==undefined&&control.months[m-1]!==null&&date<=index.cutoff.slice(0,7);
    values.push(available&&(!incompleteHistory||rows)?measured(rows?.[m-1]??0,!incompleteHistory&&monthComplete(date,index.cutoff)):measured());
  }
  return combineMeasures(values);
}
function planMeasure(index,item,centres,remaining=false) {
  const values=[];
  for(const centre of centres)for(const month of index.forecast?.meta.months||[]) {
    const q=item.forecast.get(key(centre,month));
    if(q===null||q===undefined){values.push(measured());continue;}
    if(!remaining||month>index.cutoff.slice(0,7)){values.push(measured(q,true));continue;}
    const actual=salesMeasure(index,item,[month],[centre]);
    values.push(actual.quantity===null?measured():measured(Math.max(0,q-actual.quantity),true));
  }
  return combineMeasures(values);
}
export function reviewPeriods(index) {
  const fy=index.currentFy, old=prior(fy), dates=(year,ms)=>ms.map(m=>fyDate(year,m));
  const cutoffMonth=index.cutoff.slice(0,7), last=new Date(cutoffMonth+'-01T00:00:00Z');
  if(!monthComplete(cutoffMonth,index.cutoff))last.setUTCMonth(last.getUTCMonth()-1);
  const six=Array.from({length:6},(_,i)=>{const d=new Date(last);d.setUTCMonth(d.getUTCMonth()-5+i);return d.toISOString().slice(0,7);});
  return [
    {id:'priorFull',label:`${old} full year`,dates:dates(old,order)},
    {id:'priorH1',label:`${old} H1`,dates:dates(old,order.slice(0,6))},
    {id:'priorH2',label:`${old} H2`,dates:dates(old,order.slice(6))},
    {id:'currentH1',label:`${fy} H1`,dates:dates(fy,order.slice(0,6))},
    {id:'currentH2',label:`${fy} H2 to date`,dates:dates(fy,order.slice(6))},
    {id:'lastSix',label:'Last 6 complete months',dates:six},
  ];
}
function explorerPeriods(index,input) {
  const years=sort(index.sales.rows.map(r=>r.fy)).reverse(),fy=input.fy||index.currentFy,period=input.period||'quarterly';
  if(!years.includes(fy))fail('Unknown financial year.');
  const specs={quarterly:[['Q1',[4,5,6]],['Q2',[7,8,9]],['Q3',[10,11,12]],['Q4',[1,2,3]]],half:[['H1',[4,5,6,7,8,9]],['H2',[10,11,12,1,2,3]]],full:[['Full FY',order]],H1:[['H1',order.slice(0,6)]],H2:[['H2',order.slice(6)]]};
  for(let n=1;n<=4;n++)specs['Q'+n]=[['Q'+n,order.slice((n-1)*3,n*3)]];
  let groups=specs[period];
  if(period==='custom') {
    const months=String(input.months||'').split(',').filter(Boolean).map(Number);
    if(!months.length||months.length>12||new Set(months).size!==months.length||months.some(m=>!order.includes(m)))fail('Choose one or more different months.');
    groups=order.filter(m=>months.includes(m)).map(m=>[new Date(Date.UTC(2000,m-1,1)).toLocaleString('en-GB',{month:'short',timeZone:'UTC'}),[m]]);
  }
  if(!groups)fail('Invalid sales period.');
  return {years,fy,period,buckets:groups.map(([label,ms],i)=>({id:'p'+i,label,dates:ms.map(m=>fyDate(fy,m))}))};
}
function checkFor(row) {
  if(row.stock.quantity===null||row.pipeline.quantity===null)return 'Stock / pipeline unmatched';
  if(row.plan.quantity===null)return 'No plan entered';
  if(row.remaining.quantity===null)return 'Plan balance pending';
  const delta=row.supply.quantity-row.remaining.quantity;
  if(delta<0)return 'Entered plan exceeds supply';
  if(!row.plan.complete||!row.stock.complete||!row.pipeline.complete)return 'Supply covers entered plan; check blanks';
  return delta>0?'Supply above plan':'Supply matches plan';
}

export function buildReview(index,input={}) {
  const view=input.view||'review',level=input.level||'category',centre=input.centre||'';
  if(!['review','sales'].includes(view)||!['category','engine','grade','item'].includes(level)||centre&&!ANALYTICS_CENTRES.includes(centre))fail('Invalid review selection.');
  const filters={};
  for(const name of ['category','engine','grade','item','search']) {
    const value=input[name]||'';
    if(typeof value!=='string'||value.length>1000||/[\x00-\x1f\x7f]/.test(value))fail('Invalid product filter.');
    filters[name]=value;
  }
  const centres=centre?[centre]:REVIEW_ZONES.map(z=>z.centre), allPeriods=reviewPeriods(index);
  const explorer=explorerPeriods(index,input),buckets=view==='review'?allPeriods:explorer.buckets;
  const selectedDates=[...new Set(buckets.flatMap(p=>p.dates))];
  const matches=item=>['category','engine','grade'].every(k=>!filters[k]||item[k]===filters[k])&&(!filters.item||item.id===filters.item)&&(!filters.search||[item.code,item.model,item.category,item.engine,item.grade].join(' ').toLowerCase().includes(filters.search.toLowerCase()));
  const selected=index.items.filter(matches);
  const records=selected.map(item=>({
    id:item.id,code:item.code,label:item.code,model:item.model,category:item.category,engine:item.engine,grade:item.grade,mapped:item.mapped,
    stock:numeric([item.stock]),pipeline:numeric([item.pipelineTotal]),supply:numeric([item.stock,item.pipelineTotal]),
    sales:Object.fromEntries(buckets.map(p=>[p.id,salesMeasure(index,item,p.dates,centres)])),
    totalSales:salesMeasure(index,item,selectedDates,centres),
    plan:planMeasure(index,item,centres),remaining:planMeasure(index,item,centres,true),
    locations:item.locations,sources:item.sources,sourceRow:item.sourceRow??null,
  }));
  const aggregate=rows=>{
    const out={items:rows.length,unmapped:rows.filter(r=>!r.mapped).length,sales:{}};
    for(const k of ['stock','pipeline','supply','totalSales','plan','remaining'])out[k]=combineMeasures(rows.map(r=>r[k]));
    for(const p of buckets)out.sales[p.id]=combineMeasures(rows.map(r=>r.sales[p.id]));
    out.check=checkFor(out);
    out.balance=out.supply.quantity===null||out.remaining.quantity===null?null:out.supply.quantity-out.remaining.quantity;
    if(centre){out.check='Consolidated supply; zone plan only';out.balance=null;}
    return out;
  };
  const levels=['category','engine','grade','item'],groups=new Map();
  for(const record of records) {
    const path=levels.slice(0,levels.indexOf(level)+1).map(k=>k==='item'?record.id:record[k]),id=key(...path);
    if(!groups.has(id))groups.set(id,[]);groups.get(id).push(record);
  }
  let rows=[...groups].map(([id,list])=>{
    const r=list[0];return {...aggregate(list),id,label:level==='item'?r.code:r[level],category:r.category,engine:r.engine,grade:r.grade,item:level==='item'?r.id:'',model:level==='item'?r.model:'',...(level==='item'?{sourceRow:r.sourceRow,sources:r.sources}:{}),path:levels.slice(0,levels.indexOf(level)).map(k=>r[k]).join(' / ')};
  }).sort((a,b)=>a.label.localeCompare(b.label,undefined,{numeric:true})||a.path.localeCompare(b.path));
  const sortBy=input.sort||'name';
  if(!['name','stock','sales','plan'].includes(sortBy))fail('Invalid sort order.');
  if(sortBy!=='name')rows.sort((a,b)=>{
    const value=r=>sortBy==='sales'?(view==='review'?r.sales.currentH1.quantity:r.totalSales.quantity):r[sortBy].quantity;
    const av=value(a),bv=value(b);return av===null?(bv===null?0:1):bv===null?-1:bv-av||a.label.localeCompare(b.label,undefined,{numeric:true});
  });
  const totals=aggregate(records);
  const zones=REVIEW_ZONES.map(zone=>({
    ...zone,selected:!centre||zone.centre===centre,
    sales:Object.fromEntries(buckets.map(p=>[p.id,combineMeasures(selected.map(item=>salesMeasure(index,item,p.dates,[zone.centre])))])),
    totalSales:combineMeasures(selected.map(item=>salesMeasure(index,item,selectedDates,[zone.centre]))),
    stock:numeric(selected.map(item=>item.locations[ANALYTICS_CENTRES.indexOf(zone.centre)])),
    plan:combineMeasures(selected.map(item=>planMeasure(index,item,[zone.centre]))),
    remaining:combineMeasures(selected.map(item=>planMeasure(index,item,[zone.centre],true))),
  }));
  const months=(index.forecast?.meta.months||[]).map(month=>({month,zones:REVIEW_ZONES.map(zone=>{
    const values=selected.map(item=>item.forecast.get(key(zone.centre,month))??null);
    return {centre:zone.centre,...numeric(values),entered:values.filter(q=>q!==null).length,blank:values.filter(q=>q===null).length};
  })}));
  const offset=Number(input.offset||0),limit=50;
  if(!Number.isSafeInteger(offset)||offset<0||offset>1000000||input.export&&!['0','1'].includes(input.export))fail('Invalid report page.');
  const options={categories:sort(index.items.map(i=>i.category)),engines:sort(index.items.filter(i=>!filters.category||i.category===filters.category).map(i=>i.engine)),grades:sort(index.items.filter(i=>(!filters.category||i.category===filters.category)&&(!filters.engine||i.engine===filters.engine)).map(i=>i.grade)),items:index.items.filter(i=>['category','engine','grade'].every(k=>!filters[k]||i[k]===filters[k])).map(i=>({id:i.id,label:i.code+(i.model?' · '+i.model:'')})).sort((a,b)=>a.label.localeCompare(b.label,undefined,{numeric:true}))};
  return {
    view,level,centre,filters,fy:explorer.fy,years:explorer.years,currentFy:index.currentFy,priorFy:prior(index.currentFy),cutoff:index.cutoff,
    period:explorer.period,buckets:buckets.map(p=>({...p,partial:p.dates.some(d=>!monthComplete(d,index.cutoff))})),
    lastSixMatchesH1:JSON.stringify(allPeriods[5].dates)===JSON.stringify(allPeriods[3].dates),
    options,rows:input.export==='1'?rows:rows.slice(offset,offset+limit),total:rows.length,offset,nextOffset:offset+limit<rows.length?offset+limit:null,totals,zones,forecastMonths:months,
    sharedStock:numeric(selected.map(item=>item.locations[4])),
    source:{stockAsOf:index.master.meta.stockAsOf,stockFile:index.master.meta.fileName,salesFile:index.sales.meta.fileName,forecastFile:index.forecast?.meta.fileName??null,forecastMonths:index.forecast?.meta.months||[],exceptions:index.master.exceptions,forecastExceptions:index.forecast?.meta.exceptions||[],historyNotes:index.sales.meta.notes},
  };
}

export class ReviewStore {
  constructor(db,stock,sales,planning){this.db=db;this.stock=stock;this.sales=sales;this.planning=planning;this.cache=null;}
  workspace(user,input={}) {
    assertAnalyticsAccess(user);
    const ids={stockId:this.stock.active(),salesId:this.sales.active(),forecastId:this.planning.active()};
    if(!ids.stockId||!ids.salesId)return {ready:false,...ids};
    const cacheKey=key(ids.stockId,ids.salesId,ids.forecastId);
    if(this.cache?.key!==cacheKey) {
      const load=(table,id)=>id?JSON.parse(this.db.prepare(`SELECT payload FROM ${table} WHERE id=?`).get(id).payload):null;
      const master=load('lae_analytics_imports',ids.stockId),sales=load('lae_sales_imports',ids.salesId),forecast=load('lae_forecast_imports',ids.forecastId);
      if(sales.stockId!==ids.stockId||forecast&&(forecast.stockId!==ids.stockId||forecast.salesId!==ids.salesId))fail('Source revisions differ. Reconcile the existing imports before comparing stock, sales and plan.','CONFLICT');
      this.cache={key:cacheKey,index:createReviewIndex(master,sales,forecast)};
    }
    return {ready:true,...ids,...buildReview(this.cache.index,input)};
  }
}
