import {validateProcurementTransition} from '../shared/implements/procurement.mjs';
import {createHash} from 'node:crypto';
import {blankState,validateState,ensureMonthly,createOrders} from '../shared/implements/domain.mjs';
import {validateSalesState,netMargin} from '../shared/implements/sales-pricing.mjs';
import {calculateModelCost} from '../shared/implements/costing.mjs';
import {RuleError,scopeAllowed,canCreate} from '../shared/domain.mjs';
import {BOM_SCOPE,canApproveBom,assertTechnicalOnly} from '../shared/bom-management.mjs';
import {PRODUCTION_SCOPE,canWriteProduction,assertInventoryOnly,same,validateConsumed} from '../shared/production.mjs';

export const IMPLEMENTS_SCOPE='IMPLEMENTS_DOMESTIC';
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const fail=(message,code)=>{throw new RuleError(message,code);};
const prefix=(before=[],after=[],label)=>{if(!Array.isArray(after)||!equal(before,after.slice(0,before.length)))fail(label+' history cannot be removed or rewritten.');};
export const canWriteImplements=actor=>canCreate(actor,IMPLEMENTS_SCOPE);
export function assertImplementsAccess(actor){if(!scopeAllowed(actor,IMPLEMENTS_SCOPE))fail('Implements access is required. Ask an administrator to assign your division.','FORBIDDEN');}
function validate(input){
 try{if(input?.demo)throw Error('Demo data cannot be saved to the live module.');return validateSalesState(validateState(structuredClone(input)));}
 catch(error){fail(error.message);}
}
function changes(before,after){
 const out=[];
 for(const key of new Set([...Object.keys(before),...Object.keys(after)])){
  if(['revision','audit'].includes(key)||equal(before[key],after[key]))continue;
  if(['models','parts','suppliers'].includes(key)){
   const old=new Map((before[key]||[]).map(v=>[v.id,v]));
   for(const value of after[key]||[])if(!equal(old.get(value.id),value))out.push({field:key,id:value.id,before:old.get(value.id)||null,after:value});
  }else out.push({field:key,before:before[key]??null,after:after[key]??null});
 }
 return out;
}
export class ImplementsStore{
 constructor(store){this.store=store;this.db=store.db;this.db.exec(`
 CREATE TABLE IF NOT EXISTS implements_workspace(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL,payload TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS implements_events(revision INTEGER PRIMARY KEY,actor_id TEXT NOT NULL,at TEXT NOT NULL,message TEXT NOT NULL,changes TEXT NOT NULL,previous_sha TEXT NOT NULL,next_sha TEXT NOT NULL,request_id TEXT NOT NULL,digest TEXT NOT NULL,access TEXT NOT NULL,UNIQUE(actor_id,request_id));
 CREATE TRIGGER IF NOT EXISTS implements_audit_no_update BEFORE UPDATE ON implements_events BEGIN SELECT RAISE(ABORT,'Implements audit is append-only'); END;
 CREATE TRIGGER IF NOT EXISTS implements_audit_no_delete BEFORE DELETE ON implements_events BEGIN SELECT RAISE(ABORT,'Implements audit is append-only'); END;
 `);}
 read(){const row=this.db.prepare('SELECT payload FROM implements_workspace WHERE id=1').get();return row?JSON.parse(row.payload):ensureMonthly(blankState({version:'implements-online-v1',models:[],parts:[],suppliers:[]}));}
 save(input,actorId,{technical=false,inventory=false,transactionOpen=false}={}){
  if(!transactionOpen)this.db.exec('BEGIN IMMEDIATE');
  try{
   const actor=this.store.read().users.find(u=>u.id===actorId);
   if(inventory){if(!scopeAllowed(actor,PRODUCTION_SCOPE)||!canWriteProduction(actor))fail('Production entry access is required.','FORBIDDEN');}
   else if(technical){if(!scopeAllowed(actor,BOM_SCOPE)||!canApproveBom(actor))fail('BOM approval access is required.','FORBIDDEN');}
   else {assertImplementsAccess(actor);if(!canWriteImplements(actor))fail('Purchase editing access is required.','FORBIDDEN');}
   if(!Number.isSafeInteger(input?.expectedRevision)||!/^[-\w]{12,120}$/.test(input?.requestId||''))fail('Expected revision and a valid request ID are required.');
   if(typeof input.message!=='string'||!input.message.trim()||input.message.length>1200)fail('Describe the change (maximum 1,200 characters).');
   const previous=this.read(),requestDigest=digest(input),access=JSON.stringify([actor.role,[...(actor.scopes||[])].sort()]);
   const receipt=this.db.prepare('SELECT digest,access FROM implements_events WHERE actor_id=? AND request_id=?').get(actor.id,input.requestId);
   if(receipt){if(receipt.digest!==requestDigest||receipt.access!==access)fail('Request ID or account access changed. Reload before continuing.','CONFLICT');if(!transactionOpen)this.db.exec('COMMIT');return previous;}
   if(previous.revision!==input.expectedRevision)fail('Another user saved this Implements workspace. Your entries are still on screen. Download your entries if needed, then reload and review the current values before saving.','CONFLICT');
   const next=validate(input.state),initial=!this.db.prepare('SELECT id FROM implements_workspace WHERE id=1').get();
   if(inventory){if(initial)fail('Initialize the reviewed Implements workspace first.');try{assertInventoryOnly(previous,next);validateConsumed(next);}catch(e){fail(e.message);}}
   else if(!same(previous.productionConsumed,next.productionConsumed))fail('Production consumption is controlled by the production ledger.');
   if(technical){if(initial)fail('Initialize the Implements workspace before technical review.');try{assertTechnicalOnly(previous,next);}catch(error){fail(error.message);}}
   if(initial&&(next.procurement?.events?.length||next.procurement?.quotes?.length))fail('Initialize the workspace before recording procurement history.');
   if(initial&&actor.role!=='ADMIN')fail('An administrator must import the reviewed workspace first.','FORBIDDEN');
   if(!initial){
    try{validateProcurementTransition(previous,next,actor);}catch(e){fail(e.message);}
    prefix(previous.orders,next.orders,'Purchase order');prefix(previous.priceImports,next.priceImports,'Price import');prefix(previous.supplierHistory,next.supplierHistory||[],'Supplier');
    prefix(previous.sales?.lists,next.sales?.lists||[],'Sales price list');prefix(previous.sales?.activationHistory,next.sales?.activationHistory||[],'Current price list');
    for(const key of ['models','parts','suppliers'])for(const old of previous[key]){
     const item=next[key].find(v=>v.id===old.id);if(!item)fail('Existing '+key+' must be retained.');
     for(const history of ['history','priceHistory','itemHistory'])prefix(old[history],item[history]||[],key+' '+old.id);
    }
    let serial=Math.max(previous.orders.length,...previous.orders.map(po=>Number(String(po.id).match(/^FH-IMP-PO-(\d+)$/)?.[1]||0)));
    for(const po of next.orders.slice(previous.orders.length)){
     const generated=createOrders({...next,orders:previous.orders},po.lines.map(l=>l.key),{date:po.date,delivery:po.delivery,notes:po.notes,quantityOnly:po.quantityOnly});
     const expected=generated.find(v=>v.supplier.id===po.supplier.id);
     if(po.id!==`FH-IMP-PO-${String(++serial).padStart(4,'0')}`||!expected||['lines','buyer','supplier','total','status','plan','planningMonth','stockAllocation','warnings','stockAsOf','bufferRule','snapshot'].some(key=>!equal(expected[key],po[key])))fail('Purchase order must match the current MRP, supplier and prices. Rebuild the order.');
    }
    for(const list of (next.sales?.lists||[]).slice(previous.sales?.lists.length||0)){
     const current=(previous.sales?.lists||[]).find(v=>v.id===previous.sales?.currentId);
     if(list.sourceRevision!==previous.revision||list.version!==(previous.sales?.lists||[]).filter(v=>v.month===list.month).length+1)fail('Price list source revision changed. Rebuild the list.');
     for(const row of list.rows){
      const cost=calculateModelCost(next,row.modelId),model=next.models.find(m=>m.id===row.modelId),old=current?.rows.find(v=>v.modelId===row.modelId);
      if(row.cost!==cost.total||row.partsCost!==cost.partsTotal||row.fabricationCost!==cost.fabricationTotal||row.otherCost!==cost.otherTotal||row.pending!==cost.pending||row.modelRevision!==model.revision||row.previousPrice!==(old?.price??null)||row.previousMargin!==netMargin(old?.price,cost.total))fail('Saved sales costs must match the current BOM calculation. Rebuild the list.');
     }
    }
    if((next.sales?.currentId??null)!==(previous.sales?.currentId??null)){const history=next.sales?.activationHistory||[],last=history.at(-1);if(history.length!==(previous.sales?.activationHistory.length||0)+1||last?.id!==next.sales.currentId||last?.previousId!==(previous.sales?.currentId??null)||!String(last?.reason||'').trim())fail('Changing the current price list requires a retained reason and previous-list reference.');}
   }
   const at=new Date().toISOString();next.revision=previous.revision+1;
   if(!inventory&&this.db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='production_stock_movements'").get())for(const key of new Set([...Object.keys(previous.stock||{}),...Object.keys(next.stock||{})])){
    const before=previous.stock[key]?.qty??null,after=next.stock[key]?.qty??null;if(before===after)continue;
    this.db.prepare('INSERT INTO production_stock_movements(item_key,payload) VALUES(?,?)').run(key,JSON.stringify({key,before,after,delta:(after||0)-(before||0),type:(next.procurement?.events||[]).slice(previous.procurement?.events?.length||0).some(e=>e.type==='ACKNOWLEDGE'&&e.lines.some(l=>l.key===key))?'PO_ACKNOWLEDGMENT':'PURCHASE_STOCK_UPDATE',reference:(next.procurement?.events||[]).slice(previous.procurement?.events?.length||0).find(e=>e.type==='ACKNOWLEDGE'&&e.lines.some(l=>l.key===key))?.poId||'Implements revision '+next.revision,date:at.slice(0,10),at,by:{id:actor.id,name:actor.name},reason:'Stock updated through purchasing; source audit retained in purchasing.'}));
   }
   next.audit=[...(initial?next.audit:previous.audit),{at,message:input.message,actorId:actor.id,actorName:actor.name,revision:next.revision}];
   this.db.prepare('INSERT INTO implements_events VALUES(?,?,?,?,?,?,?,?,?,?)').run(next.revision,actor.id,at,input.message,JSON.stringify(changes(previous,next)),digest(previous),digest(next),input.requestId,requestDigest,access);
   this.db.prepare('INSERT INTO implements_workspace VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,payload=excluded.payload').run(next.revision,JSON.stringify(next));
   if(!transactionOpen)this.db.exec('COMMIT');return next;
  }catch(error){if(!transactionOpen)this.db.exec('ROLLBACK');throw error;}
 }
}
