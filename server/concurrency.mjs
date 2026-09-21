import {createHash,randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';
import {RuleError} from '../shared/domain.mjs';

const digest=value=>createHash('sha256').update(JSON.stringify(value??null)).digest('base64url');
const index=rows=>Object.fromEntries((rows||[]).map(row=>[row.id,digest(row)]));
const generated=new Set(['revision','events','recordReferences','nextOrderSerial','orders','payments','costs','files','vendors','users']);
const orderCommands=new Set(('EDIT_DRAFT SUBMIT_ORDER RETURN_ORDER APPROVE_ORDER CONFIRM_SUPPLIER RECORD_PI VERIFY_PI APPROVE_PI PROPOSE_AMENDMENT APPROVE_AMENDMENT CONFIRM_TECHNICAL SUBMIT_ARTWORK APPROVE_ARTWORK CONFIRM_ARTWORK COMPLETE_INITIAL_PAYMENT AUTHORIZE_PAYMENT RECORD_PREPRODUCTION_SAMPLE APPROVE_PREPRODUCTION_SAMPLE START_PRODUCTION UPDATE_COMMITMENT RECORD_BULK_QC COMPLETE_PRODUCTION ADD_FOLLOWUP COMPLETE_FOLLOWUP ADD_NOTE ADD_SHIPMENT BOOK_CONTAINER RELEASE_CONTAINER UPDATE_SHIPMENT UPDATE_TRACKING_MILESTONE RECORD_QC RECORD_BL_DRAFT RECORD_INSURANCE DISPATCH_SHIPMENT RECORD_BL ARRIVE_SHIPMENT CANCEL_SHIPMENT SHORT_CLOSE_ORDER ATTACH_DOCUMENT ADD_COST APPROVE_PROCESS_EXEMPTION REVOKE_PROCESS_EXEMPTION SAVE_ARRIVAL_COSTING FINALIZE_ARRIVAL_COSTING REOPEN_ARRIVAL_COSTING').split(' '));
const vendorCommands=new Set(['SAVE_VENDOR','REQUEST_VENDOR_UPDATE','VMS_SAVE_PROFILE','VMS_SAVE_EVALUATION','VMS_ADD_INTERACTION','VMS_UPDATE_FOLLOWUP','VMS_SAVE_SAMPLE','VMS_ADD_DOCUMENT','VMS_SYNC_EDIT']);

// Versions describe the saved view, not client-supplied permissions or proposed data.
// Unknown/global commands compare all business data. New commands fail closed until reviewed.
function versions(state){
 const auth=state.users.map(({preferences,...u})=>u);
 return {
  global:digest([Object.fromEntries(Object.entries(state).filter(([k])=>!generated.has(k))),auth,state.recordReferences?.links]),
  all:digest([Object.fromEntries(Object.entries(state).filter(([k])=>!['revision','events','recordReferences','nextOrderSerial','files'].includes(k))),state.recordReferences?.links]),
  vendors:index(state.vendors),users:index(state.users),
  orders:Object.fromEntries(state.orders.map(o=>[o.id,digest([o,state.payments.filter(p=>p.allocations.some(a=>a.orderId===o.id)),state.costs.filter(c=>c.orderId===o.id)])]))
 };
}
function dependencies(state,command,actorId){
 const p=command.payload||{},type=command.type,orders=new Set(),vendors=new Set();
 if(type==='UPLOAD')return {upload:true}; // Appending evidence does not overwrite an order; current access is checked separately.
 if(type==='SAVE_PERSONAL_PREFERENCES')return {user:actorId};
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
 constructor(){this.secret=randomBytes(32);}
 issue(state,actorId){
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',this.secret,iv);
  const body=Buffer.from(JSON.stringify({actorId,revision:state.revision,expires:Date.now()+8*60*60*1000,versions:versions(state)}));
  return Buffer.concat([iv,cipher.update(body),cipher.final(),cipher.getAuthTag()]).toString('base64url');
 }
 read(token,actorId,revision){
  try{if(typeof token!=='string'||token.length>2_000_000||!/^[A-Za-z0-9_-]+$/.test(token))throw Error();const bytes=Buffer.from(token,'base64url');if(bytes.length<29)throw Error();const decipher=createDecipheriv('aes-256-gcm',this.secret,bytes.subarray(0,12));decipher.setAuthTag(bytes.subarray(-16));const body=JSON.parse(Buffer.concat([decipher.update(bytes.subarray(12,-16)),decipher.final()]).toString());if(body.actorId!==actorId||body.revision!==revision||body.expires<Date.now())throw Error();return body.versions;
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
  else ok=same(before.global,current.global)&&deps.orders.every(id=>same(before.orders[id],current.orders[id]))&&deps.vendors.every(id=>same(before.vendors[id],current.vendors[id]));
  if(!ok)throw new RuleError('This record or data it depends on changed while you were editing. Review the latest version before saving; your entries are still here and nothing was overwritten.','CONFLICT');
 }
}
