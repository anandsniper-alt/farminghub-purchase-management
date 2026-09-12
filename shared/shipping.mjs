/** LAE Import shipping helpers.
 * Manual first: weekly forwarder tracking + weekly freight rate imports.
 * Forwarder Ref is the primary matching key. Baseline dates are immutable.
 */
export const TRACKING_MILESTONES=[
 {key:'BOOKING',label:'Container booked',mode:'Forwarder'},
 {key:'RELEASED',label:'Container released for factory loading',mode:'Container'},
 {key:'FACTORY_LOADING',label:'Factory loading',mode:'Factory'},
 {key:'INLAND_ORIGIN',label:'Inland departure from factory / origin city',mode:'Road'},
 {key:'RAIL_RIVER_STATION',label:'Rail / river station handover',mode:'Rail / River'},
 {key:'RAIL_RIVER_TRANSIT',label:'Rail / river movement',mode:'Rail / River'},
 {key:'ORIGIN_PORT',label:'Origin seaport / terminal',mode:'Port'},
 {key:'ON_VESSEL',label:'Loaded on vessel',mode:'Ocean'},
 {key:'OCEAN_TRANSIT',label:'Ocean transit',mode:'Ocean'},
 {key:'INDIA_PORT',label:'India destination port arrival',mode:'Port'}
];
export const SHIPPING_DOC_TYPES=['COMMERCIAL_INVOICE','PACKING_LIST','BL_DRAFT','BL','INSURANCE'];
const t=v=>String(v??'').trim();
const k=v=>t(v).toUpperCase().replace(/\s+/g,' ');
const norm=v=>k(v).replace(/[^A-Z0-9]/g,'');
export const agentChargeForRate=rateUsd=>Number(rateUsd)<3000?60:120;
export const benchmarkRateUsd=rateUsd=>Number(rateUsd||0)+agentChargeForRate(rateUsd);
export function excelDay(value){
 const s=t(value);if(!s)return null;
 if(/^\d+(\.\d+)?$/.test(s)){const n=Number(s);if(n>=1&&n<100000){const d=new Date(Date.UTC(1899,11,30)+Math.floor(n)*86400000);return d.toISOString().slice(0,10);}}
 const m=s.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](20\d{2})/);if(m)return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
 if(/^20\d{2}-\d{2}-\d{2}$/.test(s))return s;
 return null;
}
export function dateFromShippingText(value){const s=t(value);if(!s||/^(TBU|TBA|WILL UPDATE)$/i.test(s))return null;return excelDay(s);}
export function portFromText(value,prefix){const s=k(value);const m=s.match(new RegExp(`${prefix}\\s+([A-Z ]+?)\\s+(?:\\d{1,2}[.\\/-]|WILL|TBU|TBA|$)`));return m?t(m[1]):null;}
export function normalizeForwarderRef(value){return t(value).replace(/\.0$/,'');}
export function trackingStatusFromText(value){
 const s=k(value);if(!s)return {milestone:null,label:'No status supplied'};
 if(s.includes('WAREHOUSE'))return {milestone:'INDIA_PORT',label:'Forwarder reports warehouse / post-arrival movement',completed:true};
 if(s.includes('WAITING FOR CONSIGNEE RATE APPROVAL'))return {milestone:'BOOKING',label:'Waiting for consignee rate approval'};
 if(s.includes('WAITING FOR CONSIGNEE APPROVAL'))return {milestone:'BOOKING',label:'Waiting for consignee approval'};
 if(s.includes('S/O')&&s.includes('RELEASE'))return {milestone:'BOOKING',label:'Shipping order release pending / released'};
 if(s.includes('SHIPPER LOADED CARGO'))return {milestone:'FACTORY_LOADING',label:'Shipper loaded cargo',completed:true};
 if(s.includes('DEPARTED FROM CHONGQING'))return {milestone:'INLAND_ORIGIN',label:'Departed Chongqing for seaport connection',completed:true};
 if(s.includes('DEPARTED FROM'))return {milestone:'INLAND_ORIGIN',label:t(value),completed:true};
 if(s.startsWith('ETD '))return {milestone:'ORIGIN_PORT',label:t(value)};
 if(s.startsWith('ETA '))return {milestone:'OCEAN_TRANSIT',label:t(value)};
 return {milestone:null,label:t(value)};
}
export function normalizeTrackingRows(rows){
 const aliases={SNO:'serial',SUPPLIERNAME:'supplier',VOLUME:'volume',ARRIVALMONTH:'arrivalMonth',INVOICENO:'invoiceNo',BLNO:'blNo',ETD:'etdText',ETA:'etaText',STATUS:'statusText',REF:'forwarderRef',TELEXSTAUS:'telexStatus',TELEXSTATUS:'telexStatus'};
 const out=[];
 for(let i=0;i<rows.length;i++){
  const raw=rows[i],n={};for(const[h,v]of Object.entries(raw)){const a=aliases[norm(h)];if(a)n[a]=t(v);}
  if(!Object.values(n).some(Boolean))continue;
  n.forwarderRef=normalizeForwarderRef(n.forwarderRef);n.arrivalMonthDate=excelDay(n.arrivalMonth);n.etd=dateFromShippingText(n.etdText);n.eta=dateFromShippingText(n.etaText);n.etdPort=portFromText(n.etdText,'ETD');n.etaPort=portFromText(n.etaText,'ETA');n.status=trackingStatusFromText(n.statusText);n.sourceRow=i+2;out.push({raw,normalized:n});
 }
 return out;
}
export function previewTrackingImport(state,rows){return normalizeTrackingRows(rows).map(x=>{const n=x.normalized,errors=[],warnings=[];if(!n.forwarderRef)errors.push('Forwarder Ref is required for automatic matching');const matches=state.orders.flatMap(o=>o.shipments.map(s=>({o,s}))).filter(({s})=>normalizeForwarderRef(s.forwarderRef)===n.forwarderRef);if(n.forwarderRef&&matches.length===0)warnings.push('No current shipment matches this forwarder Ref');if(matches.length>1)errors.push('Forwarder Ref matches more than one current shipment');const m=matches[0];if(m&&n.blNo&&m.s.blNumber&&norm(n.blNo)!==norm(m.s.blNumber))warnings.push('BL number differs from the shipment record');if(m&&n.supplier&&state.vendors.find(v=>v.id===m.o.vendorId)?.name&&!norm(n.supplier).includes(norm(state.vendors.find(v=>v.id===m.o.vendorId)?.name)))warnings.push('Supplier text differs; Ref remains the match key');let change='UNMATCHED';if(m){const diffs=[];if(n.etd&&n.etd!==m.s.etd)diffs.push(`ETD ${m.s.etd||'—'} → ${n.etd}`);if(n.eta&&n.eta!==m.s.eta)diffs.push(`ETA ${m.s.eta||'—'} → ${n.eta}`);if(n.blNo&&n.blNo!==m.s.blNumber)diffs.push('BL number update');if(n.statusText&&n.statusText!==m.s.lastForwarderStatus)diffs.push('Status update');change=diffs.length?diffs.join('; '):'NO CHANGE';}
 return {...x,match:m?{orderId:m.o.id,orderNumber:m.o.number,shipmentId:m.s.id,shipmentNumber:m.s.number}:null,result:errors.length?'REJECTED':m?'MATCHED':'UNMATCHED',errors,warnings,change};});}
export function routeParts(value){const s=k(value);const via=(s.match(/\bVIA\s+(.+)$/)||[])[1]||null;const origin=t(s.replace(/\bVIA\s+.+$/,''));return {origin,via:t(via)};}
export function normalizeRateRows(rows){
 const aliases={SNO:'serial',PORTOFLOADING:'loading',PORTOFDISCHARGE:'discharge',VOLUME:'volume',OFUSD:'rateText',SCHEDULE:'schedule'};const out=[];
 for(let i=0;i<rows.length;i++){const raw=rows[i],n={};for(const[h,v]of Object.entries(raw)){const a=aliases[norm(h)];if(a)n[a]=t(v);}if(!Object.values(n).some(Boolean))continue;const p=routeParts(n.loading);n.origin=p.origin;n.via=p.via;n.destination=k(n.discharge);n.containerType=k(n.volume);const rm=(n.rateText||'').match(/([0-9]+(?:\.[0-9]+)?)/);n.rateUsd=rm?Number(rm[1]):null;n.agentChargeUsd=n.rateUsd?agentChargeForRate(n.rateUsd):null;n.benchmarkUsd=n.rateUsd?n.rateUsd+n.agentChargeUsd:null;n.routeKey=[n.origin,n.via?'VIA '+n.via:'',n.destination,n.containerType].filter(Boolean).join('|');n.sourceRow=i+2;out.push({raw,normalized:n});}return out;
}
export function previewRateImport(state,rows,weekCode){return normalizeRateRows(rows).map(x=>{const n=x.normalized,errors=[],warnings=[];if(!t(weekCode))errors.push('Rate week is required');if(!n.origin||!n.destination)errors.push('Loading and discharge ports are required');if(!n.containerType)errors.push('Volume / container type is required');if(!(n.rateUsd>0))errors.push('O/F USD must contain a positive USD rate');if(state.freightRates?.some(r=>r.weekCode===weekCode&&r.routeKey===n.routeKey))warnings.push('This route already has a rate for the selected week; commit will add a correction snapshot');return {...x,result:errors.length?'REJECTED':'READY',errors,warnings};});}
export function latestRateFor(state,shipment){const routeKey=shipment.rateRouteKey||[k(shipment.origin),shipment.via?'VIA '+k(shipment.via):'',k(shipment.destination),k(shipment.containerType)].filter(Boolean).join('|');return (state.freightRates||[]).filter(r=>r.routeKey===routeKey).sort((a,b)=>(Number(a.sequence||0)-Number(b.sequence||0))||String(a.importedAt).localeCompare(String(b.importedAt))).at(-1)||null;}
export function rateVariance(state,shipment){const market=latestRateFor(state,shipment);if(!market||!shipment.bookedFreightUsdMinor)return null;const booked=shipment.bookedFreightUsdMinor/100,benchmark=Number(market.benchmarkUsd??benchmarkRateUsd(market.rateUsd)),diff=booked-benchmark;return {booked,oceanFreight:market.rateUsd,agentCharge:Number(market.agentChargeUsd??agentChargeForRate(market.rateUsd)),market:benchmark,difference:diff,percent:benchmark?diff/benchmark*100:0,flag:diff>Number(state.settings?.freightWarningUsd??100)};}
export function freightTrendFor(state,routeKey){const rates=(state.freightRates||[]).filter(r=>r.routeKey===routeKey).sort((a,b)=>(Number(a.sequence||0)-Number(b.sequence||0))||String(a.importedAt).localeCompare(String(b.importedAt)));const byWeek=[];for(const r of rates){const i=byWeek.findIndex(x=>x.weekCode===r.weekCode);if(i>=0)byWeek[i]=r;else byWeek.push(r);}const recent=byWeek.slice(-6);if(recent.length<2)return {direction:'INSUFFICIENT',delta:0,recent};const val=r=>Number(r.benchmarkUsd??benchmarkRateUsd(r.rateUsd));const delta=val(recent.at(-1))-val(recent[0]);const lastDelta=val(recent.at(-1))-val(recent.at(-2));const threshold=50;return {direction:lastDelta>threshold?'RISING':lastDelta<-threshold?'FALLING':'STABLE',delta,lastDelta,recent};}
export function shippingDocReadiness(order,shipment){const types=['COMMERCIAL_INVOICE','PACKING_LIST'];return types.filter(type=>!order.documents.some(d=>d.type===type&&d.shipmentId===shipment.id&&d.status==='FINAL'));}
export function milestoneRows(shipment){const map=new Map((shipment.trackingMilestones||[]).map(x=>[x.key,x]));return TRACKING_MILESTONES.map(m=>({...m,...(map.get(m.key)||{})}));}
