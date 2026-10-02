import {createHash,randomUUID} from 'node:crypto';
import {scopeAllowed,RuleError} from '../shared/domain.mjs';
import {PRODUCTION_SCOPE,canWriteProduction,canManageProduction,productionItems,materialRequirements,actualMaterials,stockAfter,serialNumbers,productionDate} from '../shared/production.mjs';
import {technicalModel} from '../shared/bom-management.mjs';
import {quantity,round,validMonth} from '../shared/implements/domain.mjs';
import {visualFor} from '../web/implements/part-icons.mjs';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fail=(message,code='VALIDATION')=>{throw new RuleError(message,code);};
const text=(value,label,max=1200)=>{if(typeof value!=='string'||!value.trim()||value.length>max||/[\x00-\x1f\x7f]/.test(value))fail(label+' is required (maximum '+max+' characters).');return value.trim();};
const person=u=>({id:u.id,name:u.name,role:u.role});
export function assertProductionAccess(u){if(!scopeAllowed(u,PRODUCTION_SCOPE))fail('Production · Stock & serials access is required.','FORBIDDEN');}
export class ProductionStore{
 constructor(store,source){this.store=store;this.source=source;this.db=store.db;this.db.exec(`
 CREATE TABLE IF NOT EXISTS production_batches(id INTEGER PRIMARY KEY AUTOINCREMENT,payload TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS production_batch_status ON production_batches(json_extract(payload,'$.status'));
 CREATE TABLE IF NOT EXISTS production_units(serial TEXT PRIMARY KEY,batch_id INTEGER NOT NULL REFERENCES production_batches(id),payload TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS production_units_batch ON production_units(batch_id);
 CREATE INDEX IF NOT EXISTS production_units_status ON production_units(json_extract(payload,'$.status'));
 CREATE TABLE IF NOT EXISTS production_events(sequence INTEGER PRIMARY KEY AUTOINCREMENT,actor_id TEXT NOT NULL,request_id TEXT NOT NULL,digest TEXT NOT NULL,access TEXT NOT NULL,payload TEXT NOT NULL,UNIQUE(actor_id,request_id));
 CREATE INDEX IF NOT EXISTS production_event_batch ON production_events(json_extract(payload,'$.batchId'),sequence DESC);
 CREATE TABLE IF NOT EXISTS production_stock_movements(sequence INTEGER PRIMARY KEY AUTOINCREMENT,item_key TEXT NOT NULL,payload TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS production_movement_item ON production_stock_movements(item_key,sequence DESC);
 CREATE TRIGGER IF NOT EXISTS production_events_no_update BEFORE UPDATE ON production_events BEGIN SELECT RAISE(ABORT,'Production audit is append-only'); END;
 CREATE TRIGGER IF NOT EXISTS production_events_no_delete BEFORE DELETE ON production_events BEGIN SELECT RAISE(ABORT,'Production audit is append-only'); END;
 CREATE TRIGGER IF NOT EXISTS production_stock_no_update BEFORE UPDATE ON production_stock_movements BEGIN SELECT RAISE(ABORT,'Stock ledger is append-only'); END;
 CREATE TRIGGER IF NOT EXISTS production_stock_no_delete BEFORE DELETE ON production_stock_movements BEGIN SELECT RAISE(ABORT,'Stock ledger is append-only'); END;
 `);}
 actor(id){const actor=this.store.read().users.find(u=>u.id===id);assertProductionAccess(actor);return actor;}
 revision(){return this.db.prepare('SELECT coalesce(max(sequence),0) n FROM production_events').get().n;}
 batch(id){const row=this.db.prepare('SELECT payload FROM production_batches WHERE id=?').get(id);if(!row)fail('Production batch not found.','NOT_FOUND');return JSON.parse(row.payload);}
 page(actorId,{kind='batches',query='',status='',key='',before=null,batchId=null}={}){this.actor(actorId);if(!['batches','units','movements'].includes(kind)||typeof query!=='string'||query.length>120||typeof status!=='string'||status.length>30||typeof key!=='string'||key.length>120||(before!==null&&(!Number.isSafeInteger(before)||before<1))||(batchId!==null&&(!Number.isSafeInteger(batchId)||batchId<1)))fail('Invalid production filter.');
  const table=kind==='batches'?'production_batches':kind==='units'?'production_units':'production_stock_movements',col=kind==='movements'?'sequence':'rowid',clauses=[],args=[];
  if(status){clauses.push("json_extract(payload,'$.status')=?");args.push(status);}if(kind==='units'&&batchId){clauses.push('batch_id=?');args.push(batchId);}if(kind==='movements'&&key){clauses.push('item_key=?');args.push(key);}if(query){clauses.push("(instr(upper(json_extract(payload,'$.modelId')),upper(?))>0 OR instr(upper(coalesce(json_extract(payload,'$.serial'),json_extract(payload,'$.reference'),'')),upper(?))>0)");args.push(query,query);}
  const total=this.db.prepare('SELECT count(*) n FROM '+table+(clauses.length?' WHERE '+clauses.join(' AND '):'')).get(...args).n;
  if(before!==null){clauses.push(col+'<?');args.push(before);}const rows=this.db.prepare('SELECT '+col+' cursor,payload FROM '+table+(clauses.length?' WHERE '+clauses.join(' AND '):'')+' ORDER BY '+col+' DESC LIMIT 101').all(...args),more=rows.length>100;rows.length=Math.min(rows.length,100);return {kind,rows:rows.map(row=>JSON.parse(row.payload)),total,next:more?rows.at(-1).cursor:null};
 }
 read(id){const actor=this.actor(id),state=this.source.read(),items=productionItems(state).map(p=>({...p,qty:state.stock[p.key]?.qty??null,image:state.itemImages?.[p.id]?.image||visualFor(p.name).image?.replace('/implements/assets/','/production/assets/')||''})),counts={};
  for(const row of this.db.prepare("SELECT json_extract(payload,'$.status') status,count(*) qty FROM production_batches GROUP BY status").all())counts[row.status]=row.qty;
  const units=this.db.prepare("SELECT json_extract(payload,'$.status') status,count(*) qty FROM production_units GROUP BY status").all();
  return {revision:state.revision,productionRevision:this.revision(),models:state.models.map(technicalModel),items,plans:state.monthlyPlans||{},activeMonth:state.activeMonth||'',consumed:state.productionConsumed||{},counts,unitCounts:Object.fromEntries(units.map(r=>[r.status,r.qty])),batches:this.page(id),user:{...person(actor),scopes:(actor.scopes||[]).filter(s=>['BOM_MANAGEMENT',PRODUCTION_SCOPE].includes(s))},canWrite:canWriteProduction(actor),canManage:canManageProduction(actor)};
 }
 detail(actorId,id){this.actor(actorId);if(!Number.isSafeInteger(id)||id<1)fail('Invalid production batch.');return {batch:this.batch(id),units:this.db.prepare('SELECT payload FROM production_units WHERE batch_id=? ORDER BY serial').all(id).map(r=>JSON.parse(r.payload)),history:this.db.prepare("SELECT payload FROM production_events WHERE json_extract(payload,'$.batchId')=? ORDER BY sequence DESC LIMIT 100").all(id).map(r=>JSON.parse(r.payload))};}
 command(actorId,input){this.db.exec('BEGIN IMMEDIATE');try{
  const actor=this.actor(actorId);if(!canWriteProduction(actor))fail('Production entry access is required.','FORBIDDEN');
  const allowed=['type','batchId','modelId','quantity','date','month','serials','materials','key','qty','serial','reference','reason','expectedRevision','expectedProductionRevision','requestId'];
  if(!input||Object.keys(input).some(k=>!allowed.includes(k))||!/^[-\w]{12,120}$/.test(input.requestId||'')||!Number.isSafeInteger(input.expectedRevision)||!Number.isSafeInteger(input.expectedProductionRevision))fail('Invalid production command; reload before saving.');
  const access=JSON.stringify([actor.role,[...(actor.scopes||[])].sort()]),digest=hash(input),receipt=this.db.prepare('SELECT digest,access FROM production_events WHERE actor_id=? AND request_id=?').get(actor.id,input.requestId);
  if(receipt){if(receipt.digest!==digest||receipt.access!==access)fail('Request or account access changed.','CONFLICT');this.db.exec('COMMIT');return this.read(actor.id);}
  const state=this.source.read();if(state.revision!==input.expectedRevision||this.revision()!==input.expectedProductionRevision)fail('Another user changed production or stock. Your entries remain on screen; reload and review balances.','CONFLICT');
  const now=new Date().toISOString(),today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Calcutta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),reason=text(input.reason,'Reason'),next=structuredClone(state);let batch=null,movements=[],units=[],result={};
  if(['CREATE_BATCH','UPDATE_BATCH'].includes(input.type)){
   const requirements=materialRequirements(state,input.modelId,input.quantity),date=productionDate(input.date,today),month=validMonth(input.month),serials=serialNumbers(input.serials,requirements.quantity);
   if(input.type==='UPDATE_BATCH'){batch=this.batch(input.batchId);if(batch.status!=='DRAFT')fail('Only draft batches can be edited.');}
   batch={...(batch||{}),modelId:requirements.model.id,model:requirements.model,quantity:requirements.quantity,materials:requirements.materials,overrides:input.materials||[],date,month,serials,status:'DRAFT',updatedAt:now,createdAt:batch?.createdAt||now,createdBy:batch?.createdBy||person(actor),reason};
   actualMaterials(batch.materials,batch.overrides,{allowPending:true}); // Drafts may retain unresolved BOM quantities; posting cannot.
   if(!batch.id){batch.id=Number(this.db.prepare('INSERT INTO production_batches(payload) VALUES(?)').run('{}').lastInsertRowid);batch.reference='FH-PROD-'+String(batch.id).padStart(6,'0');}
  }else if(['ISSUE_MATERIAL','COMPLETE_BATCH','CANCEL_BATCH','REVERSE_BATCH'].includes(input.type)){
   batch=this.batch(input.batchId);const date=productionDate(input.date,today);if(date<batch.date)fail('This stage cannot precede the batch date.');
   if(input.type==='CANCEL_BATCH'){if(batch.status!=='DRAFT')fail('Use a manager reversal to return already-issued materials.');batch.status='CANCELLED';}
   else if(input.type==='REVERSE_BATCH'){
    if(!canManageProduction(actor))fail('A production manager must reverse a posted batch.','FORBIDDEN');if(!['MATERIAL_ISSUED','COMPLETED'].includes(batch.status))fail('Only an issued or completed batch can be reversed.');if(date<(batch.completedDate||batch.issueDate))fail('Reversal cannot precede the posted batch stage.');
    const existing=this.db.prepare('SELECT payload FROM production_units WHERE batch_id=?').all(batch.id).map(r=>JSON.parse(r.payload));if(existing.some(u=>u.status!=='AVAILABLE'))fail('Return dispatched serial numbers before reversing this batch.');
    next.stock=stockAfter(state,batch.issued,1,date,batch.reference+' reversal');movements=batch.issued.map(r=>({...r,delta:r.qty}));this.consumed(next,batch,-1);units=existing.map(u=>({...u,status:'VOID',updatedAt:now}));batch.status='REVERSED';
   }else{
    if(!['DRAFT','MATERIAL_ISSUED'].includes(batch.status))fail('This batch is already closed.','CONFLICT');
    if(input.type==='ISSUE_MATERIAL'&&batch.status!=='DRAFT')fail('Materials have already been issued.','CONFLICT');
    if(batch.status==='DRAFT'){
     const current=materialRequirements(state,batch.modelId,batch.quantity);if(hash(current.model)!==hash(batch.model)||hash(current.materials)!==hash(batch.materials))fail('The model BOM or item definitions changed after this draft. Edit and resave the draft before material issue.','CONFLICT');
     const issued=actualMaterials(batch.materials,input.materials??batch.overrides);next.stock=stockAfter(state,issued,-1,date,batch.reference);movements=issued.map(r=>({...r,delta:-r.qty}));batch.issued=issued;batch.issueDate=date;batch.issuedBy=person(actor);batch.status='MATERIAL_ISSUED';this.consumed(next,batch,1);
    }
    if(input.type==='COMPLETE_BATCH'){
     if(date<batch.issueDate)fail('Completion cannot precede material issue.');const requested=serialNumbers(input.serials??batch.serials,batch.quantity);if(requested.length&&requested.some(s=>this.db.prepare('SELECT serial FROM production_units WHERE serial=?').get(s)))fail('A serial number already exists; serials cannot be reused.','CONFLICT');
     let serial=0;for(let i=0;i<batch.quantity;i++){let value=requested[i];if(!value){const prefix='FH-'+batch.modelId.replaceAll('.','')+'-'+batch.month.replace('-','')+'-';do{value=prefix+String(++serial).padStart(5,'0');}while(this.db.prepare('SELECT serial FROM production_units WHERE serial=?').get(value)||units.some(u=>u.serial===value));}
      units.push({serial:value,batchId:batch.id,modelId:batch.modelId,configuration:batch.model.configuration,modelRevision:batch.model.revision,completedDate:date,status:'AVAILABLE',createdAt:now,createdBy:person(actor),history:[]});}
     batch.status='COMPLETED';batch.completedDate=date;batch.completedBy=person(actor);
    }
   }batch.updatedAt=now;batch.stageReason=reason;
  }else if(['RECEIVE_STOCK','ADJUST_STOCK'].includes(input.type)){
   const item=productionItems(state).find(p=>p.key===input.key);if(!item)fail('Select a current stock item.');const date=productionDate(input.date,today),reference=text(input.reference,'Reference',120),qty=quantity(input.qty,'Quantity',{uom:item.unit});
   if(input.type==='ADJUST_STOCK'&&!canManageProduction(actor))fail('A production manager must approve a stock count adjustment.','FORBIDDEN');if(input.type==='RECEIVE_STOCK'&&!qty)fail('Receipt quantity must be greater than zero.');const before=state.stock[item.key]?.qty??0,delta=input.type==='ADJUST_STOCK'?round(qty-before,3):qty;
   next.stock[item.key]={...(state.stock[item.key]||{}),qty:input.type==='ADJUST_STOCK'?qty:round(before+qty,3),asOf:date,source:'Production stock: '+reference};movements=[{key:item.key,code:item.code,name:item.name,unit:item.unit,delta}];result.reference=reference;result.date=date;
  }else if(['DISPATCH_UNIT','RETURN_UNIT'].includes(input.type)){
   const serial=serialNumbers([input.serial],1)[0],row=this.db.prepare('SELECT payload FROM production_units WHERE serial=?').get(serial);if(!row)fail('Serial number not found.','NOT_FOUND');const unit=JSON.parse(row.payload),date=productionDate(input.date,today),reference=text(input.reference,'Dispatch / return reference',120);if(date<unit.completedDate)fail('Dispatch or return cannot precede completion.');
   if(input.type==='DISPATCH_UNIT'){if(unit.status!=='AVAILABLE')fail('This serial is not available for dispatch.');unit.status='DISPATCHED';unit.dispatchDate=date;}
   else {if(!canManageProduction(actor))fail('A manager must record a dispatched unit return.','FORBIDDEN');if(unit.status!=='DISPATCHED'||date<unit.dispatchDate)fail('Select a dispatched serial and a valid return date.');unit.status='AVAILABLE';unit.returnDate=date;}
   unit.history.push({type:input.type,date,reference,reason,at:now,by:person(actor)});unit.updatedAt=now;units=[unit];result={serial,reference,date};
  }else fail('Unknown production action.');
  if(movements.length){next.stockAsOf=input.date;this.source.save({state:next,expectedRevision:state.revision,requestId:input.requestId,message:'Production '+input.type+': '+(batch?.reference||result.reference)+' — '+reason},actor.id,{inventory:true,transactionOpen:true});
   for(const movement of movements)this.db.prepare('INSERT INTO production_stock_movements(item_key,payload) VALUES(?,?)').run(movement.key,JSON.stringify({...movement,before:state.stock[movement.key]?.qty??0,after:next.stock[movement.key]?.qty??0,type:input.type,reference:batch?.reference||result.reference,batchId:batch?.id||null,date:input.date,reason,at:now,by:person(actor)}));
  }
  if(batch)this.db.prepare('UPDATE production_batches SET payload=? WHERE id=?').run(JSON.stringify(batch),batch.id);
  for(const unit of units)this.db.prepare('INSERT INTO production_units VALUES(?,?,?) ON CONFLICT(serial) DO UPDATE SET payload=excluded.payload').run(unit.serial,unit.batchId,JSON.stringify(unit));
  this.db.prepare('INSERT INTO production_events(actor_id,request_id,digest,access,payload) VALUES(?,?,?,?,?)').run(actor.id,input.requestId,digest,access,JSON.stringify({type:input.type,at:now,by:person(actor),reason,batchId:batch?.id||null,...result}));
  this.db.exec('COMMIT');return this.read(actor.id);
 }catch(error){this.db.exec('ROLLBACK');throw error;}}
 consumed(state,batch,direction){state.productionConsumed??={};state.productionConsumed[batch.month]??={};const qty=(state.productionConsumed[batch.month][batch.modelId]||0)+direction*batch.quantity;if(qty<0)fail('Production consumption history is inconsistent.');state.productionConsumed[batch.month][batch.modelId]=qty;}
}
