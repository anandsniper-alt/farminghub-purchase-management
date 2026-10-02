import {createHash,randomUUID} from 'node:crypto';
import {RuleError,scopeAllowed} from '../shared/domain.mjs';
import {BOM_SCOPE,canReviewBom,canApproveBom,technicalModel,technicalParts,technicalWorkspace,validateTechnicalDraft} from '../shared/bom-management.mjs';
import {copyBom} from '../shared/implements/domain.mjs';
import {visualFor} from '../web/implements/part-icons.mjs';
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fail=(message,code='VALIDATION')=>{throw new RuleError(message,code);};
export function assertBomAccess(actor){if(!scopeAllowed(actor,BOM_SCOPE))fail('BOM & Syntax access is required. Ask an administrator to assign Production · BOM & Syntax.','FORBIDDEN');}
const actorView=actor=>({id:actor.id,name:actor.name,role:actor.role,scopes:['BOM_MANAGEMENT']});
const cleanNote=value=>{if(typeof value!=='string'||!value.trim()||value.length>1200||/[\x00-\x1f\x7f]/.test(value))fail('Enter a reason or checking note (maximum 1,200 characters).');return value.trim();};
const fingerprint=(state,model)=>digest({model:model?technicalModel(model):null,parts:technicalParts(state)});
export class BomManagementStore{
 constructor(store,implementsStore){this.store=store;this.source=implementsStore;this.db=store.db;this.db.exec(`
 CREATE TABLE IF NOT EXISTS bom_review_records(id TEXT PRIMARY KEY,payload TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS bom_review_model ON bom_review_records(json_extract(payload,'$.modelId'));
 CREATE INDEX IF NOT EXISTS bom_review_status ON bom_review_records(json_extract(payload,'$.status'));
 CREATE TABLE IF NOT EXISTS bom_review_events(sequence INTEGER PRIMARY KEY AUTOINCREMENT,actor_id TEXT NOT NULL,request_id TEXT NOT NULL,request_sha TEXT NOT NULL,access TEXT NOT NULL,payload TEXT NOT NULL,UNIQUE(actor_id,request_id));
 CREATE TRIGGER IF NOT EXISTS bom_review_no_update BEFORE UPDATE ON bom_review_events BEGIN SELECT RAISE(ABORT,'BOM review history is append-only'); END;
 CREATE TRIGGER IF NOT EXISTS bom_review_no_delete BEFORE DELETE ON bom_review_events BEGIN SELECT RAISE(ABORT,'BOM review history is append-only'); END;
 `);}
 actor(id){const actor=this.store.read().users.find(u=>u.id===id);assertBomAccess(actor);return actor;}
 revision(){return this.db.prepare('SELECT coalesce(max(sequence),0) n FROM bom_review_events').get().n;}
 records(){return this.db.prepare('SELECT payload FROM bom_review_records ORDER BY rowid DESC').all().map(row=>JSON.parse(row.payload));}
 reviewPage(actorId,{modelId='',status='',before=null}={}){this.actor(actorId);if(typeof modelId!=='string'||modelId.length>80||!['','PENDING','CHECKED','APPROVED','REJECTED'].includes(status)||(before!==null&&(!Number.isSafeInteger(before)||before<1)))fail('Invalid checking-history filter.');const clauses=[],args=[];if(modelId){clauses.push("json_extract(payload,'$.modelId')=?");args.push(modelId);}if(status){clauses.push("json_extract(payload,'$.status')=?");args.push(status);}const where=clauses.length?' WHERE '+clauses.join(' AND '):'',total=this.db.prepare('SELECT count(*) n FROM bom_review_records'+where).get(...args).n;if(before!==null){clauses.push('rowid<?');args.push(before);}const rows=this.db.prepare('SELECT rowid cursor,payload FROM bom_review_records'+(clauses.length?' WHERE '+clauses.join(' AND '):'')+' ORDER BY rowid DESC LIMIT 101').all(...args),hasMore=rows.length>100;rows.length=Math.min(rows.length,100);return {rows:rows.map(r=>JSON.parse(r.payload)),total,next:hasMore?rows.at(-1).cursor:null,modelId,status};}
 read(actorId){const actor=this.actor(actorId),state=this.source.read(),data=technicalWorkspace(state);
  const imageFor=(id,name)=>state.itemImages?.[id]?.image||visualFor(name).image?.replace('/implements/assets/','/bom/assets/')||'';
  data.parts=data.parts.map(p=>({...p,image:imageFor(p.id,p.name)}));
  data.models=data.models.map(m=>({...m,fabrication:m.fabrication.map(l=>({...l,image:imageFor(l.partId,l.name)}))}));
  const page=this.reviewPage(actorId),pending=this.db.prepare("SELECT count(*) n FROM bom_review_records WHERE json_extract(payload,'$.status')='PENDING'").get().n,checkedModels=[];
  const latest=this.db.prepare("SELECT payload FROM bom_review_records WHERE rowid IN (SELECT max(rowid) FROM bom_review_records WHERE json_extract(payload,'$.kind')='CHECK' GROUP BY json_extract(payload,'$.modelId'))").all().map(r=>JSON.parse(r.payload)),ids=new Set([...latest,...page.rows].map(r=>r.modelId)),hashes=new Map([...ids].map(id=>[id,fingerprint(state,state.models.find(m=>m.id===id))]));for(const r of latest)if(r.baselineSha===hashes.get(r.modelId))checkedModels.push(r.modelId);
  return {...data,reviewRevision:this.revision(),reviews:page.rows.map(r=>({...r,current:r.baselineSha===hashes.get(r.modelId)})),reviewPage:{...page,rows:undefined},pendingCorrections:pending,checkedModels,user:actorView(actor),canReview:canReviewBom(actor),canApprove:canApproveBom(actor)};
 }
 command(actorId,input){
  this.db.exec('BEGIN IMMEDIATE');
  try{
   const actor=this.actor(actorId);if(!canReviewBom(actor))fail('Your account can view this module but cannot submit checks or corrections.','FORBIDDEN');
   if(!input||Object.keys(input).some(k=>!['type','modelId','reviewId','draft','reason','expectedRevision','expectedReviewRevision','requestId'].includes(k)))fail('Invalid review command.');
   if(!/^[-\w]{12,120}$/.test(input.requestId||'')||!Number.isSafeInteger(input.expectedRevision)||!Number.isSafeInteger(input.expectedReviewRevision))fail('Reload the workspace before saving.');
   const hash=digest(input),access=JSON.stringify([actor.role,[...(actor.scopes||[])].sort()]);
   const receipt=this.db.prepare('SELECT request_sha,access FROM bom_review_events WHERE actor_id=? AND request_id=?').get(actor.id,input.requestId);
   if(receipt){if(receipt.request_sha!==hash||receipt.access!==access)fail('Request or account access changed. Reload and review.','CONFLICT');this.db.exec('COMMIT');return this.read(actor.id);}
   let state=this.source.read();if(state.revision!==input.expectedRevision||this.revision()!==input.expectedReviewRevision)fail('Another user saved changes. Your entries remain on screen. Reload and review before saving.','CONFLICT');
   const reason=cleanNote(input.reason),at=new Date().toISOString();let record;
   if(input.type==='SUBMIT_CORRECTION'||input.type==='MARK_CHECKED'){
    const model=state.models.find(m=>m.id===input.modelId);
    let draft=null;if(input.type==='SUBMIT_CORRECTION'){try{draft=validateTechnicalDraft(input.draft,state);}catch(e){fail(e.message);}}
    if(!model&&!draft?.newModelId)fail('Model not found.','NOT_FOUND');
    if(draft?.newModelId&&input.modelId)fail('A new model cannot replace an existing model identity.');
    if(!draft?.newModelId&&!model)fail('Select a model before submitting.');
    if(draft?.copyFrom&&draft.copyFrom===model?.id)fail('Choose a different source model.');
    const copySource=draft?.copyFrom?state.models.find(m=>m.id===draft.copyFrom):null;
    record={id:randomUUID(),modelId:model?.id||draft.newModelId,kind:input.type==='MARK_CHECKED'?'CHECK':'CORRECTION',status:input.type==='MARK_CHECKED'?'CHECKED':'PENDING',
     modelRevision:model?.revision??0,baselineSha:fingerprint(state,model),copySourceSha:copySource?fingerprint(state,copySource):null,draft,
     before:model?technicalModel(model):null,createdAt:at,createdBy:actorView(actor),reason,history:[]};
   }else if(['APPROVE','REJECT'].includes(input.type)){
    if(!canApproveBom(actor))fail('Only an administrator or BOM manager can approve corrections.','FORBIDDEN');
    const saved=this.db.prepare('SELECT payload FROM bom_review_records WHERE id=?').get(input.reviewId);record=saved?JSON.parse(saved.payload):null;if(!record||record.status!=='PENDING')fail('This correction is no longer pending.','CONFLICT');
    if(input.type==='APPROVE'){
     const target=state.models.find(m=>m.id===record.modelId),copySource=record.draft?.copyFrom?state.models.find(m=>m.id===record.draft.copyFrom):null;
     if(fingerprint(state,target)!==record.baselineSha||(record.copySourceSha&&fingerprint(state,copySource)!==record.copySourceSha))fail('The model, item definitions or copy source changed since submission. Submit a fresh correction against current data.','CONFLICT');
     let draft;try{draft=validateTechnicalDraft(record.draft,state);}catch(e){fail(e.message);}
     let updated=target?structuredClone(target):{id:draft.newModelId,name:'',series:'',configuration:'',frame:'',size:'',blades:null,speed:'',bladeOrientation:'',gearboxOrientation:'',salesConfirmed:false,syntaxRow:null,syntaxWeight:null,bomAvailable:false,revision:0,lines:[],fabrication:[],fabricationCode:'',fabricationSupplier:'',notes:'',history:[],costs:{'Gearbox powder coating':null,Assembly:null,'Rack stand':null,'Tools kit':null,'Buffer cost':null}};
     const next=structuredClone(state);if(!target)next.models.push(updated);
     if(draft.copyFrom){updated=copyBom(next,updated.id,draft.copyFrom);const brands=state.stickerPolicy?.brandBySeries||{},expected=brands[updated.series],brandIds=new Set(Object.values(brands).map(l=>l.partId));if(expected){updated.lines=updated.lines.filter(l=>!brandIds.has(l.partId));updated.lines.push({partId:expected.partId,ppm:expected.ppm});}}
     if(draft.syntax)Object.assign(updated,draft.syntax,{name:draft.syntax.series??updated.name});
     if(draft.lines){const old=new Map(updated.lines.map(l=>[l.partId,l]));updated.lines=draft.lines.map(l=>({...old.get(l.partId),...l}));updated.bomAvailable=true;}
     if(draft.fabrication){const old=new Map(updated.fabrication.map(l=>[l.partId,l]));updated.fabrication=draft.fabrication.map(l=>({...old.get(l.partId),...l}));}
     updated.revision=(target?.revision||0)+1;updated.history=[...(target?.history||[]),{at,revision:updated.revision,actorId:actor.id,reason:'Production correction approved: '+reason,reviewId:record.id}];
     next.models=next.models.map(m=>m.id===updated.id?updated:m);
     state=this.source.save({state:next,expectedRevision:state.revision,requestId:input.requestId,message:'Production BOM/syntax correction approved for '+record.modelId+': '+reason},actor.id,{technical:true,transactionOpen:true});
     record.after=technicalModel(state.models.find(m=>m.id===record.modelId));record.appliedSourceRevision=state.revision;
    }
    record.status=input.type==='APPROVE'?'APPROVED':'REJECTED';record.history.push({at,actor:actorView(actor),status:record.status,reason});
   }else fail('Unknown review action.');
   this.db.prepare('INSERT INTO bom_review_records VALUES(?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload').run(record.id,JSON.stringify(record));
   this.db.prepare('INSERT INTO bom_review_events(actor_id,request_id,request_sha,access,payload) VALUES(?,?,?,?,?)').run(actor.id,input.requestId,hash,access,JSON.stringify({at,type:input.type,record}));
   this.db.exec('COMMIT');return this.read(actor.id);
  }catch(e){this.db.exec('ROLLBACK');throw e;}
 }
}
