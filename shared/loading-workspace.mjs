/** Read-only projection. Never migrate, duplicate or infer missing shipment history. */
export const LOADING_STAGES=[['PLANNED','Loading plan'],['BOOKED','Container booked'],['RELEASED','Container released'],['LOADED','Container loaded'],['IN_TRANSIT','On vessel'],['ARRIVED','India port arrived'],['CANCELLED','Cancelled']];
export function loadingStage(s){
 if(s.status==='CANCELLED')return 'CANCELLED';
 if(s.actualArrival)return 'ARRIVED';
 if(s.actualDeparture)return 'IN_TRANSIT';
 if((s.trackingMilestones||[]).some(m=>m.key==='FACTORY_LOADING'&&m.status==='COMPLETED'&&m.actualDate))return 'LOADED';
 if(s.bookingStatus==='RELEASED'||s.releaseDate)return 'RELEASED';
 if(s.bookingStatus==='BOOKED'||s.bookingDate)return 'BOOKED';
 return 'PLANNED';
}
export function loadingWorkspace(orders){
 const groups=new Map();
 for(const o of orders.filter(o=>!o.deletedAt&&o.scope==='LAE_IMPORT'))for(const s of o.shipments||[]){
  // A text reference is not proof that independent historic records belong together.
  const key=s.roGroupId?'ro:'+s.roGroupId:s.loadingPlanId?'plan:'+s.loadingPlanId:'shipment:'+o.id+':'+s.id;
  if(!groups.has(key))groups.set(key,{key,members:[]});
  groups.get(key).members.push({o,s,stage:loadingStage(s)});
 }
 return [...groups.values()].map(g=>{
  const active=g.members.filter(m=>m.stage!=='CANCELLED'),stages=[...new Set(active.map(m=>m.stage))];
  const stage=stages.length?LOADING_STAGES.find(([v])=>stages.includes(v))[0]:'CANCELLED';
  const first=g.members[0].s;
  const reference=first.roNumber||first.forwarderRef||first.number;
  return {...g,reference,stage,mixed:stages.length>1,quantity:active.reduce((n,{s})=>n+s.lines.reduce((a,l)=>a+l.quantity,0),0),supplierIds:[...new Set(g.members.map(m=>m.o.vendorId))],orderIds:[...new Set(g.members.map(m=>m.o.id))],hasRO:g.members.some(({s})=>s.roGroupId||s.forwarderRef),legacy:g.members.some(({s})=>!s.loadingPlanId&&!s.roGroupId)};
 });
}

/** The UI derives mode from selected lines; PLAN_LOADING still validates everything. */
export function loadingSelectionPayload(orders,selected,fields={}){
 const groups=new Map();
 for(const line of selected){const o=orders.find(o=>o.id===line.orderId);if(!o||!o.lines.some(l=>l.id===line.lineId))throw Error('A selected PO item is no longer available. Reopen the loading plan.');if(!groups.has(o.id))groups.set(o.id,{orderId:o.id,lines:[]});groups.get(o.id).lines.push({lineId:line.lineId,quantity:line.quantity});}
 if(!groups.size)throw Error('Tick at least one item to load.');
 const suppliers=new Set([...groups.keys()].map(id=>orders.find(o=>o.id===id).vendorId));
 return {...fields,loadingMode:suppliers.size>1?'MULTIPLE_SUPPLIERS':groups.size>1?'MULTIPLE_ORDERS':'SINGLE_ORDER',vendorId:suppliers.size===1?[...suppliers][0]:'',orderId:groups.size===1?[...groups.keys()][0]:'',orders:[...groups.values()]};
}
