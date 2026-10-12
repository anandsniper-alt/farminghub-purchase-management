import {validateProcurementTransition} from '../shared/implements/procurement.mjs';
import {createHash} from 'node:crypto';
import {blankState,validateState,ensureMonthly,createOrders,validDate} from '../shared/implements/domain.mjs';
import {validateSalesState,netMargin} from '../shared/implements/sales-pricing.mjs';
import {calculateModelCost} from '../shared/implements/costing.mjs';
import {RuleError,scopeAllowed,canCreate} from '../shared/domain.mjs';
import {BOM_SCOPE,canApproveBom,assertTechnicalOnly} from '../shared/bom-management.mjs';
import {PRODUCTION_SCOPE,canWriteProduction,assertInventoryOnly,same,validateConsumed,validateMaterialIssued} from '../shared/production.mjs';
import {canApprovePlan,assertPlanningOnly} from '../shared/implements/planning.mjs';

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
 save(input,actorId,{technical=false,inventory=false,planning=false,transactionOpen=false}={}){
  if(!transactionOpen)this.db.exec('BEGIN IMMEDIATE');
  try{
   const actor=this.store.read().users.find(u=>u.id===actorId);
   if(planning){if(!canApprovePlan(actor))fail('Purchase Manager or Administrator approval is required.','FORBIDDEN');}
   else if(inventory){if(!scopeAllowed(actor,PRODUCTION_SCOPE)||!canWriteProduction(actor))fail('Production entry access is required.','FORBIDDEN');}
   else if(technical){if(!scopeAllowed(actor,BOM_SCOPE)||!canApproveBom(actor))fail('BOM approval access is required.','FORBIDDEN');}
   else {assertImplementsAccess(actor);if(!canWriteImplements(actor))fail('Purchase editing access is required.','FORBIDDEN');}
   if(!Number.isSafeInteger(input?.expectedRevision)||!/^[-\w]{12,120}$/.test(input?.requestId||''))fail('Expected revision and a valid request ID are required.');
   if(typeof input.message!=='string'||!input.message.trim()||input.message.length>1200)fail('Describe the change (maximum 1,200 characters).');
   const previous=this.read(),requestDigest=digest(input),access=JSON.stringify([actor.role,[...(actor.scopes||[])].sort()]);
   const receipt=this.db.prepare('SELECT digest,access FROM implements_events WHERE actor_id=? AND request_id=?').get(actor.id,input.requestId);
   if(receipt){if(receipt.digest!==requestDigest||receipt.access!==access)fail('Request ID or account access changed. Reload before continuing.','CONFLICT');if(!transactionOpen)this.db.exec('COMMIT');return previous;}
   if(previous.revision!==input.expectedRevision)fail('Another user saved this Implements workspace. Your entries are still on screen. Download your entries if needed, then reload and review the current values before saving.','CONFLICT');
   const next=validate(input.state),initial=!this.db.prepare('SELECT id FROM implements_workspace WHERE id=1').get();
   if(planning){if(initial)fail('Initialize the reviewed Implements workspace first.');assertPlanningOnly(previous,next);}
   if(inventory){if(initial)fail('Initialize the reviewed Implements workspace first.');try{assertInventoryOnly(previous,next);validateConsumed(next);validateMaterialIssued(next);}catch(e){fail(e.message);}}
   else if(!same(previous.productionConsumed,next.productionConsumed)||!same(previous.productionMaterialIssued,next.productionMaterialIssued))fail('Production consumption is controlled by the production ledger.');
   if(technical){if(initial)fail('Initialize the Implements workspace before technical review.');try{assertTechnicalOnly(previous,next);}catch(error){fail(error.message);}}
   if(initial&&(next.procurement?.events?.length||next.procurement?.quotes?.length))fail('Initialize the workspace before recording procurement history.');
   if(initial&&actor.role!=='ADMIN')fail('An administrator must import the reviewed workspace first.','FORBIDDEN');
   const correction=(next.procurement?.events||[]).slice(previous.procurement?.events?.length||0).find(e=>e.type==='CORRECT_ACKNOWLEDGMENT');
   if(!initial){
    try{validateProcurementTransition(previous,next,actor);}catch(e){fail(e.message);}
    const acknowledgment=(next.procurement?.events||[]).slice(previous.procurement?.events?.length||0).find(e=>e.type==='ACKNOWLEDGE');
    if(acknowledgment){
     const ledgerExists=!!this.db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='production_stock_movements'").get();
     for(const line of acknowledgment.lines){
      const count=ledgerExists?this.db.prepare("SELECT payload FROM production_stock_movements WHERE item_key=? AND json_extract(payload,'$.type') IN ('ADJUST_STOCK','PURCHASE_STOCK_UPDATE') AND json_extract(payload,'$.date')>=? ORDER BY sequence DESC LIMIT 1").get(line.key,acknowledgment.date):null;
      const posted=count?JSON.parse(count.payload):null;
      if(acknowledgment.stockAlreadyReconciled){if(!posted)fail(`No physical count on or after ${acknowledgment.date} was found for ${line.key}. Record and review a current count before marking this delivery already included.`);continue;}
      if(posted?.date>acknowledgment.date)fail(`Delivery dated ${acknowledgment.date} precedes a physical count for ${line.key} on ${posted.date}. Reconcile that later count before acknowledging this delivery.`);
      if(posted?.date===acknowledgment.date&&!acknowledgment.stockNotIncludedInCount)fail(`A physical count for ${line.key} was saved on ${posted.date}. It may already include this delivery. A manager must review the count and confirm with a reason if the delivery arrived afterward.`);
      if(acknowledgment.stockNotIncludedInCount&&!posted)fail(`No same-day physical count was found for ${line.key}. Remove the count reconciliation confirmation and acknowledge the delivery normally.`);
     }
    }
    if(correction){
     const events=previous.procurement?.events||[],byId=new Map(events.map(e=>[e.id,e])),basis=byId.get(correction.correctionOf);
     if(!basis||!['ACKNOWLEDGE','CORRECT_ACKNOWLEDGMENT'].includes(basis.type))fail('Latest receipt is missing. Reload and review.');
     const chain=[],seenChain=new Set();let entry=basis;while(entry){if(seenChain.has(entry.id))fail('Receipt correction history is invalid. Reload and review.');seenChain.add(entry.id);chain.push(entry);if(entry.type==='ACKNOWLEDGE')break;entry=byId.get(entry.correctionOf);}
     const original=chain.at(-1);if(original?.type!=='ACKNOWLEDGE')fail('Receipt correction history is incomplete. Reload and review.');
     const ledgerExists=!!this.db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='production_stock_movements'").get();
     for(const line of correction.deltas.filter(l=>l.delta!==0)){
      // Locate the last stock-changing event for this item, skipping earlier
      // zero-delta corrections; a count for one line never covers another.
      let lastMovement=null;if(ledgerExists)for(const prior of chain){lastMovement=this.db.prepare("SELECT sequence FROM production_stock_movements WHERE item_key=? AND json_extract(payload,'$.eventId')=? AND json_extract(payload,'$.delta')!=0 ORDER BY sequence DESC LIMIT 1").get(line.key,prior.id);if(lastMovement)break;}
      const count=!ledgerExists?null:lastMovement?this.db.prepare("SELECT payload FROM production_stock_movements WHERE item_key=? AND sequence>? AND json_extract(payload,'$.type') IN ('ADJUST_STOCK','PURCHASE_STOCK_UPDATE') ORDER BY sequence DESC LIMIT 1").get(line.key,lastMovement.sequence):original.stockAlreadyReconciled?this.db.prepare("SELECT payload FROM production_stock_movements WHERE item_key=? AND json_extract(payload,'$.type') IN ('ADJUST_STOCK','PURCHASE_STOCK_UPDATE') AND json_extract(payload,'$.date')>=? ORDER BY sequence DESC LIMIT 1").get(line.key,original.date):this.db.prepare("SELECT payload FROM production_stock_movements WHERE item_key=? AND json_extract(payload,'$.type') IN ('ADJUST_STOCK','PURCHASE_STOCK_UPDATE') AND json_extract(payload,'$.at')>? ORDER BY sequence DESC LIMIT 1").get(line.key,original.at);
      if(correction.stockAlreadyReconciled&&!count)fail(`No later saved physical count was found for ${line.key}. Leave stock reconciliation unchecked so this correction adjusts stock, or save a reviewed current count first.`);
      if(!correction.stockAlreadyReconciled&&count){const posted=JSON.parse(count.payload);fail(`A physical count for ${line.key} was saved on ${posted.date} after the latest stock-changing receipt. Review that count and mark stock already reconciled when correcting the PO so stock is not adjusted twice.`);}
     }
    }
    for(const key of Object.keys(previous.stock||{}))if(!Object.hasOwn(next.stock,key))fail(`Existing stock item ${key} cannot be removed. Record a current physical count to reconcile its balance.`);
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Calcutta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const stockLedgerExists=!!this.db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='production_stock_movements'").get();
    for(const [key,entry] of Object.entries(next.stock||{})){const prior=previous.stock?.[key];if(equal(prior,entry))continue;
     // Older workspaces may introduce a previously absent undated balance. Keep
     // that one-time import compatible; its ledger entry receives today's date.
     if(!entry.asOf&&prior===undefined)continue;
     try{validDate(entry.asOf,'Stock posting date');}catch{fail(`Stock posting for ${key} needs a valid calendar date.`);}if(entry.asOf>today)fail(`Stock posting for ${key} cannot be future-dated.`);
     const latest=stockLedgerExists?this.db.prepare("SELECT max(json_extract(payload,'$.date')) date FROM production_stock_movements WHERE item_key=?").get(key)?.date:null;
     const watermark=[prior?.asOf||'',latest||''].sort().at(-1);if(watermark&&entry.asOf<watermark)fail(`Stock posting for ${key} cannot precede its latest posting on ${watermark}. Use a current count date or reconcile the intervening movement.`);
    }
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
    const before=previous.stock[key]?.qty??null,after=next.stock[key]?.qty??null;if(equal(previous.stock[key],next.stock[key]))continue;
    const poEvent=(next.procurement?.events||[]).slice(previous.procurement?.events?.length||0).find(e=>['ACKNOWLEDGE','CORRECT_ACKNOWLEDGMENT'].includes(e.type)&&e.lines.some(l=>l.key===key));
    this.db.prepare('INSERT INTO production_stock_movements(item_key,payload) VALUES(?,?)').run(key,JSON.stringify({key,before,after,delta:(after||0)-(before||0),type:poEvent?.type==='ACKNOWLEDGE'?'PO_ACKNOWLEDGMENT':poEvent?.type==='CORRECT_ACKNOWLEDGMENT'?'PO_ACKNOWLEDGMENT_CORRECTION':'PURCHASE_STOCK_UPDATE',reference:poEvent?.poId||'Implements revision '+next.revision,eventId:poEvent?.id||null,date:next.stock[key]?.asOf||at.slice(0,10),at,by:{id:actor.id,name:actor.name},reason:poEvent?.reason||'Stock updated through purchasing; source audit retained in purchasing.',...(poEvent?.correctionOf?{correctionOf:poEvent.correctionOf}:{})}));
   }
   if(correction?.stockAlreadyReconciled&&this.db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='production_stock_movements'").get())for(const line of correction.deltas.filter(l=>l.delta!==0))this.db.prepare('INSERT INTO production_stock_movements(item_key,payload) VALUES(?,?)').run(line.key,JSON.stringify({key:line.key,before:previous.stock[line.key]?.qty??0,after:next.stock[line.key]?.qty??0,delta:0,poDelta:line.delta,type:'PO_ACKNOWLEDGMENT_CORRECTION',reference:correction.poId,eventId:correction.id,correctionOf:correction.correctionOf,date:correction.date,at,by:{id:actor.id,name:actor.name},reason:correction.reason,stockAlreadyReconciled:true}));
   const acknowledgment=(next.procurement?.events||[]).slice(previous.procurement?.events?.length||0).find(e=>e.type==='ACKNOWLEDGE');
   if(acknowledgment?.stockAlreadyReconciled&&this.db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='production_stock_movements'").get())for(const line of acknowledgment.lines)this.db.prepare('INSERT INTO production_stock_movements(item_key,payload) VALUES(?,?)').run(line.key,JSON.stringify({key:line.key,before:previous.stock[line.key]?.qty??0,after:next.stock[line.key]?.qty??0,delta:0,poQty:line.qty,type:'PO_ACKNOWLEDGMENT',reference:acknowledgment.reference,poId:acknowledgment.poId,eventId:acknowledgment.id,date:acknowledgment.date,at,by:{id:actor.id,name:actor.name},reason:acknowledgment.reason,reconciliationReason:acknowledgment.reconciliationReason,stockAlreadyReconciled:true}));
   next.audit=[...(initial?next.audit:previous.audit),{at,message:input.message,actorId:actor.id,actorName:actor.name,revision:next.revision}];
   this.db.prepare('INSERT INTO implements_events VALUES(?,?,?,?,?,?,?,?,?,?)').run(next.revision,actor.id,at,input.message,JSON.stringify(changes(previous,next)),digest(previous),digest(next),input.requestId,requestDigest,access);
   this.db.prepare('INSERT INTO implements_workspace VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,payload=excluded.payload').run(next.revision,JSON.stringify(next));
   if(!transactionOpen)this.db.exec('COMMIT');return next;
  }catch(error){if(!transactionOpen)this.db.exec('ROLLBACK');throw error;}
 }
}
