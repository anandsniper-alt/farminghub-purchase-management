import {createHash,randomBytes} from 'node:crypto';
import {RuleError} from '../shared/domain.mjs';

const digest=value=>createHash('sha256').update(JSON.stringify(value??null)).digest('base64url');
const index=rows=>Object.fromEntries((rows||[]).map(row=>[row.id,digest(row)]));
const domesticCollections=['domesticItems','domesticBoms','domesticPriceLists','domesticOrders'];
const generated=new Set(['revision','events','recordReferences','nextOrderSerial','orders','payments','costs','files','vendors','users',...domesticCollections]);
const orderCommands=new Set(('EDIT_DRAFT SUBMIT_ORDER RETURN_ORDER APPROVE_ORDER CONFIRM_SUPPLIER RECORD_PI VERIFY_PI APPROVE_PI PROPOSE_AMENDMENT APPROVE_AMENDMENT CONFIRM_TECHNICAL SUBMIT_ARTWORK APPROVE_ARTWORK CONFIRM_ARTWORK COMPLETE_INITIAL_PAYMENT AUTHORIZE_PAYMENT RECORD_PREPRODUCTION_SAMPLE APPROVE_PREPRODUCTION_SAMPLE START_PRODUCTION UPDATE_COMMITMENT RECORD_BULK_QC COMPLETE_PRODUCTION ADD_FOLLOWUP COMPLETE_FOLLOWUP ADD_NOTE ADD_SHIPMENT BOOK_CONTAINER RELEASE_CONTAINER UPDATE_SHIPMENT UPDATE_TRACKING_MILESTONE RECORD_QC RECORD_BL_DRAFT RECORD_INSURANCE DISPATCH_SHIPMENT RECORD_BL ARRIVE_SHIPMENT CANCEL_SHIPMENT SHORT_CLOSE_ORDER ATTACH_DOCUMENT ADD_COST APPROVE_PROCESS_EXEMPTION REVOKE_PROCESS_EXEMPTION SAVE_ARRIVAL_COSTING FINALIZE_ARRIVAL_COSTING REOPEN_ARRIVAL_COSTING').split(' '));
const vendorCommands=new Set(['SAVE_VENDOR','REQUEST_VENDOR_UPDATE','VMS_SAVE_PROFILE','VMS_SAVE_EVALUATION','VMS_ADD_INTERACTION','VMS_UPDATE_FOLLOWUP','VMS_SAVE_SAMPLE','VMS_ADD_DOCUMENT','VMS_SYNC_EDIT']);

// Versions describe the saved view, not client-supplied permissions or proposed data.
// Unknown/global commands compare all business data. New commands fail closed until reviewed.
function versions(state){
 const auth=state.users.map(({preferences,...u})=>u);
 const payments=new Map(),costs=new Map(),add=(map,id,row)=>{if(!map.has(id))map.set(id,[]);map.get(id).push(row);};
 for(const p of state.payments)for(const id of new Set(p.allocations.map(a=>a.orderId)))add(payments,id,p);
 for(const c of state.costs)add(costs,c.orderId,c);
 return {
  global:digest([Object.fromEntries(Object.entries(state).filter(([k])=>!generated.has(k))),auth,state.recordReferences?.links]),
  all:digest([Object.fromEntries(Object.entries(state).filter(([k])=>!['revision','events','recordReferences','nextOrderSerial','files'].includes(k))),state.recordReferences?.links]),
  vendors:index(state.vendors),users:index(state.users),
  ...Object.fromEntries(domesticCollections.map(key=>[key,index(state[key])])),
  orders:Object.fromEntries(state.orders.map(o=>[o.id,digest([o,payments.get(o.id)||[],costs.get(o.id)||[]])]))
 };
}
function dependencies(state,command,actorId){
 const p=command.payload||{},type=command.type,orders=new Set(),vendors=new Set();
 if(type==='UPLOAD')return {upload:true}; // Appending evidence does not overwrite an order; current access is checked separately.
 if(type==='SAVE_PERSONAL_PREFERENCES')return {user:actorId};
 if(['DOMESTIC_PO_SAVE','DOMESTIC_PO_ISSUE','DOMESTIC_PO_CANCEL','DOMESTIC_SAVE_BOM','DOMESTIC_UPDATE_VENDOR_ADDRESS','DOMESTIC_UPDATE_VENDOR_TAX'].includes(type)){
  const deps={orders:[],vendors:[],...Object.fromEntries(domesticCollections.map(key=>[key,[]]))};
  const add=(key,id)=>{if(id&&!deps[key].includes(id))deps[key].push(id);};
  const lines=rows=>{for(const row of rows||[]){add('domesticItems',row.itemId);const quoteId=row.quoteId||row.quotation?.id;if(quoteId){add('domesticPriceLists',quoteId);add('vendors',state.domesticPriceLists?.find(q=>q.id===quoteId)?.vendorId);}if(row.assemblyId)bom(row.assemblyId);}};
  const bom=id=>{if(!id||deps.domesticBoms.includes(id))return;add('domesticBoms',id);lines(state.domesticBoms?.find(b=>b.id===id)?.lines);};
  if(type.startsWith('DOMESTIC_PO_')){
   const order=state.domesticOrders?.find(o=>o.id===p.orderId);if(p.orderId&&!order)return null;
   add('domesticOrders',p.orderId);
   if(type!=='DOMESTIC_PO_CANCEL'){bom(order?.bom?.id||p.bomId);add('vendors',p.vendorId||order?.vendor?.id);if(order)add('vendors',order.vendor?.id);lines(order?.lines);lines(p.lines);}
  }else if(type==='DOMESTIC_SAVE_BOM'){if(!p.bomId)return null;bom(p.bomId);lines(p.lines);}
  else add('vendors',p.vendorId);
  return deps;
 }
 if(type==='CREATE_ORDER'){vendors.add(p.vendorId);}
 else if(orderCommands.has(type)){if(!p.orderId)return null;orders.add(p.orderId);}
 else if(['DELETE_ORDERS','RESTORE_ORDERS'].includes(type)){if(!Array.isArray(p.orderIds)||!p.orderIds.length)return null;p.orderIds.forEach(id=>orders.add(id));}
 else if(type==='RECORD_PAYMENT'){if(!Array.isArray(p.allocations)||!p.allocations.length)return null;p.allocations.forEach(a=>orders.add(a.orderId));}
 else if(['ACKNOWLEDGE_PAYMENT','VOID_PAYMENT'].includes(type)){const payment=state.payments.find(x=>x.id===p.paymentId);if(!payment)return null;payment.allocations.forEach(a=>orders.add(a.orderId));}
 else if(vendorCommands.has(type)){const id=type==='SAVE_VENDOR'?p.id:p.vendorId;if(id)vendors.add(id);else if(type!=='SAVE_VENDOR')return null;}
 else return null;
 for(const id of orders){const o=state.orders.find(o=>o.id===id);if(!o)return null;vendors.add(o.vendorId);for(const s of o.shipments||[])if(s.forwarderId)vendors.add(s.forwarderId);}
 if(p.forwarderId)vendors.add(p.forwarderId);
 return {orders:[...orders],vendors:[...vendors]};
}
export class EditVersions{
 constructor({maxBytes=32*1024*1024,maxContexts=512,ttlMs=8*60*60*1000,clock=Date.now}={}){
  this.contexts=new Map();this.snapshots=new Map();this.bytes=0;this.maxBytes=maxBytes;this.maxContexts=maxContexts;this.ttlMs=ttlMs;this.clock=clock;
 }
 remove(token){const entry=this.contexts.get(token);if(!entry)return;this.contexts.delete(token);const snapshot=this.snapshots.get(entry.snapshot);if(--snapshot.refs===0){this.bytes-=snapshot.bytes;this.snapshots.delete(entry.snapshot);}}
 issue(state,actorId){
  const now=this.clock();for(const [token,entry] of this.contexts)if(entry.expires<=now)this.remove(token);
  const saved=versions(state),serialized=JSON.stringify(saved),bytes=Buffer.byteLength(serialized),key=digest(serialized);
  // Oversized views retain strict workspace revision checking rather than unbounded memory.
  if(bytes>this.maxBytes||this.maxContexts<1)return null;
  while(this.contexts.size>=this.maxContexts||this.bytes+(this.snapshots.has(key)?0:bytes)>this.maxBytes)this.remove(this.contexts.keys().next().value);
  let snapshot=this.snapshots.get(key);if(!snapshot){snapshot={versions:saved,bytes,refs:0};this.snapshots.set(key,snapshot);this.bytes+=bytes;}snapshot.refs++;
  const token=randomBytes(32).toString('base64url');this.contexts.set(token,{actorId,revision:state.revision,expires:now+this.ttlMs,snapshot:key});return token;
 }
 read(token,actorId,revision){
  try{const entry=typeof token==='string'&&/^[A-Za-z0-9_-]{43}$/.test(token)&&this.contexts.get(token);if(!entry||entry.actorId!==actorId||entry.revision!==revision||entry.expires<=this.clock())throw Error();return this.snapshots.get(entry.snapshot).versions;
  }catch{throw new RuleError('This saved view has expired. Review the latest version; your entries have not been saved.','CONFLICT');}
 }
 assert(state,command,actorId,revision,token){
  if(!token){if(state.revision!==revision)throw new RuleError('Another user changed this workspace. Reload before saving; nothing was overwritten.','CONFLICT');return;}
  const before=this.read(token,actorId,revision);if(state.revision===revision)return;
  const current=versions(state),deps=dependencies(state,command,actorId);
  const same=(a,b)=>typeof a==='string'&&a===b;
  let ok;
  if(deps?.upload)ok=same(before.users[actorId],current.users[actorId]);
  else if(deps?.user)ok=same(before.users[actorId],current.users[actorId]);
  else if(!deps)ok=same(before.all,current.all);
  else ok=same(before.global,current.global)&&['orders','vendors',...domesticCollections].every(key=>(deps[key]||[]).every(id=>same(before[key]?.[id],current[key]?.[id])));
  if(!ok)throw new RuleError('This record or data it depends on changed while you were editing. Review the latest version before saving; your entries are still here and nothing was overwritten.','CONFLICT');
 }
}
