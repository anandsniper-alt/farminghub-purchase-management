import {number,quantity,round,validDate,clone} from './domain.mjs';
const text=(v,label,max=1200)=>{if(typeof v!=='string'||!v.trim()||v.length>max||/[\x00-\x1f\x7f]/.test(v))throw Error(label+' is required (maximum '+max+' characters).');return v.trim();};
export const procurementState=s=>s.procurement||{events:[],quotes:[]};
export function orderProgress(s,id,today=new Date().toISOString().slice(0,10)){
 const po=s.orders.find(p=>p.id===id);if(!po)throw Error('Purchase order not found.');
 const events=procurementState(s).events.filter(e=>e.poId===id);let status='DRAFT',delivery=po.delivery||'',acknowledged={};
 for(const e of events){if(e.type==='APPROVE')status='APPROVED';if(e.type==='ISSUE')status='ISSUED';if(e.type==='SCHEDULE')delivery=e.delivery;if(e.type==='CANCEL')status='CANCELLED';if(e.type==='CLOSE')status='CLOSED';if(e.type==='ACKNOWLEDGE'){for(const l of e.lines)acknowledged[l.key]=round((acknowledged[l.key]||0)+l.qty,3);status='PART_DELIVERED';}}
 const lines=po.lines.map(l=>({...l,acknowledged:acknowledged[l.key]||0,outstanding:round(l.orderQty-(acknowledged[l.key]||0),3)}));
 if(status==='PART_DELIVERED'&&lines.every(l=>l.outstanding===0))status='DELIVERED';
 const open=['ISSUED','PART_DELIVERED'].includes(status);return {po,status,delivery,lines,events,overdue:open&&!!delivery&&delivery<today};
}
export function applyOrderEvent(s,input,{actor={id:'review',name:'Reviewer',role:'ADMIN'},at=new Date().toISOString()}={}){
 const x=procurementState(s);if(x.events.length>=10000)throw Error('PO history limit reached. Contact the administrator.');
 if(x.events.some(e=>e.id===input.id))throw Error('Acknowledgment/action identity already exists.');
 const p=orderProgress(s,input.poId),manager=['ADMIN','MANAGER'].includes(actor.role),type=input.type;
 if(['APPROVE','CANCEL','CLOSE'].includes(type)&&!manager)throw Error('A manager must approve, cancel or close a PO.');
 const e={id:text(input.id,'Action identity',120),poId:p.po.id,type,date:validDate(input.date),reason:text(input.reason,'Reason'),at,by:{id:actor.id,name:actor.name,role:actor.role}};
 if(e.date<p.po.date||e.date>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Calcutta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(at)))throw Error('Posting date must be between the PO date and today.');
 if(p.events.length&&e.date<p.events.at(-1).date)throw Error('Posting date cannot precede the last PO action.');
 if(type==='APPROVE'){if(p.status!=='DRAFT')throw Error('Only draft POs can be approved.');}
 else if(type==='ISSUE'){if(p.status!=='APPROVED')throw Error('Approve the PO before issuing.');}
 else if(type==='SCHEDULE'){if(!['APPROVED','ISSUED','PART_DELIVERED'].includes(p.status))throw Error('This PO cannot be rescheduled.');e.delivery=validDate(input.delivery);if(e.delivery<e.date)throw Error('Expected delivery cannot precede posting.');}
 else if(type==='ACKNOWLEDGE'){
  if(!['ISSUED','PART_DELIVERED'].includes(p.status))throw Error('Issue the PO before acknowledging delivery.');e.reference=text(input.reference,'Delivery acknowledgment reference',120);
  if(x.events.some(v=>v.type==='ACKNOWLEDGE'&&v.poId===e.poId&&v.reference===e.reference))throw Error('This delivery reference has already been acknowledged for this PO.');
  if(!Array.isArray(input.lines)||!input.lines.length||input.lines.length>1000)throw Error('Enter delivered quantities.');const keys=new Set();
  e.lines=input.lines.map(l=>{const row=p.lines.find(r=>r.key===l.key);if(!row||keys.has(l.key))throw Error('Unknown or duplicate delivery item.');keys.add(l.key);const qty=quantity(l.qty,'Delivered quantity',row);if(qty<=0||qty>row.outstanding)throw Error('Delivered quantity must be positive and no greater than the outstanding quantity.');return {key:l.key,qty};});
  for(const l of e.lines){const before=s.stock[l.key]?.qty||0;s.stock[l.key]={...(s.stock[l.key]||{}),qty:number(round(before+l.qty,3),'Stock balance'),asOf:e.date,source:'PO acknowledgment: '+e.poId+' / '+e.reference};}s.stockAsOf=e.date;
 }else if(type==='CANCEL'){if(['CLOSED','CANCELLED','DELIVERED'].includes(p.status)||p.lines.some(l=>l.acknowledged>0))throw Error('Delivered POs cannot be cancelled. Close a partially delivered PO with a reason.');}
 else if(type==='CLOSE'){if(!['DELIVERED','PART_DELIVERED'].includes(p.status))throw Error('Only delivered or partially delivered POs can be closed.');}
 else throw Error('Unknown PO action.');
 s.procurement={...x,events:[...x.events,e]};return e;
}
export function purchasePipeline(s,today){return s.orders.map(p=>orderProgress(s,p.id,today));}
export function incomingPurchaseSummary(s){
 const items={};for(const p of purchasePipeline(s))if(['ISSUED','PART_DELIVERED'].includes(p.status))for(const l of p.lines)if(l.outstanding>0){items[l.key]??={qty:0,orders:[]};items[l.key].qty=round(items[l.key].qty+l.outstanding,3);items[l.key].orders.push({poId:p.po.id,qty:l.outstanding,delivery:p.delivery});}return items;
}
export function quoteLanded(q){const base=number(q.rate,'Quote rate'),transport=number(q.transportPercent,'Quote transport %',{max:100}),fixed=number(q.transportPerUnit,'Transport per unit');return round(base*(1+transport/100)+fixed,2);}
export function addSupplierQuote(s,input,{at=new Date().toISOString(),by=null}={}){
 const x=procurementState(s);if(x.quotes.length>=10000)throw Error('Quote register limit reached.');
 const item=s.parts.find(p=>p.id===input.key&&!p.fabricated),supplier=s.suppliers.find(v=>v.id===input.supplierId&&v.active!==false);if(!item||!supplier)throw Error('Choose a purchased item and active supplier.');
 if(x.quotes.some(q=>q.id===input.id))throw Error('Quote identity already exists.');const date=validDate(input.date),validUntil=validDate(input.validUntil);if(validUntil<date)throw Error('Quote expiry cannot precede quotation date.');
 const q={id:text(input.id,'Quote identity',120),key:input.key,supplierId:supplier.id,reference:text(input.reference,'Quote reference',120),date,validUntil,rate:number(input.rate,'Quote rate'),transportPercent:number(input.transportPercent,'Transport %',{max:100}),transportPerUnit:number(input.transportPerUnit,'Transport per unit'),moq:quantity(input.moq,'Minimum order quantity',input.key.startsWith('fab:')?null:item),leadDays:number(input.leadDays,'Lead time days',{integer:true,max:3650}),notes:String(input.notes||'').slice(0,2000),rateUnit:input.key.startsWith('fab:')?'kg':item.uom||'pcs',at,by};q.landed=quoteLanded(q);
 s.procurement={...x,quotes:[...x.quotes,q]};return q;
}
export function compareQuotes(s,key,{qty=1,date=new Date().toISOString().slice(0,10)}={}){
 number(qty,'Comparison quantity');validDate(date);const all=procurementState(s).quotes.filter(q=>q.key===key),latest=new Map();for(const q of all)if(q.date<=date&&(!latest.has(q.supplierId)||latest.get(q.supplierId).date<=q.date))latest.set(q.supplierId,q);
 return [...latest.values()].map(q=>({...q,expired:q.validUntil<date,eligible:q.validUntil>=date&&qty>=q.moq&&s.suppliers.find(v=>v.id===q.supplierId)?.active!==false,total:round(qty*q.landed,2)})).sort((a,b)=>Number(b.eligible)-Number(a.eligible)||a.landed-b.landed);
}
export function validateProcurementTransition(before,after,actor){
 const old=procurementState(before),next=procurementState(after);for(const key of ['events','quotes'])if(!Array.isArray(next[key])||JSON.stringify(old[key])!==JSON.stringify(next[key].slice(0,old[key].length)))throw Error('Procurement history cannot be removed or rewritten.');
 if(next.events.length-old.events.length>1||next.quotes.length-old.quotes.length>1)throw Error('Save one procurement action at a time.');
 for(const entry of [...next.events.slice(old.events.length),...next.quotes.slice(old.quotes.length)])if(!Number.isFinite(Date.parse(entry.at))||Math.abs(Date.now()-Date.parse(entry.at))>300000)throw Error('Action timestamp expired. Reload before saving.');
 const replay=clone(before);for(const q of next.quotes.slice(old.quotes.length)){const expected=addSupplierQuote(replay,q,{at:q.at,by:{id:actor.id,name:actor.name,role:actor.role}});if(JSON.stringify(expected)!==JSON.stringify(q))throw Error('Quotation values or actor do not reconcile.');}
 for(const e of next.events.slice(old.events.length)){const expected=applyOrderEvent(replay,e,{actor,at:e.at});if(JSON.stringify(expected)!==JSON.stringify(e))throw Error('PO action values or actor do not reconcile.');if(e.type==='ACKNOWLEDGE'&&(JSON.stringify(replay.stock)!==JSON.stringify(after.stock)||replay.stockAsOf!==after.stockAsOf))throw Error('Acknowledgment stock must match delivered quantities exactly.');}
 return after;
}
