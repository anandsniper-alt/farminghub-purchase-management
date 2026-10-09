import {createHash,randomUUID} from 'node:crypto';
import {RuleError} from '../shared/domain.mjs';
import {canAccessPlanning,canApprovePlan,canSubmitPlan,planningActor,planningModel,validatePlan,monthPlan} from '../shared/implements/planning.mjs';
import {validMonth,ensureMonthly} from '../shared/implements/domain.mjs';
const fail=(m,c='VALIDATION')=>{throw new RuleError(m,c);};
const sha=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const hashPlan=p=>sha(Object.entries(p).filter(([,q])=>q>0).sort(([a],[b])=>a.localeCompare(b)));
const recordView=r=>({...r,history:r.history.slice(-100).map(({plan,...h})=>h),historyCount:r.history.length});
const listView=r=>Object.fromEntries(['id','owner','month','plan','status','version','updatedAt'].map(k=>[k,r[k]]));
const note=v=>{if(typeof v!=='string'||!v.trim()||v.length>1200||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(v))fail('Enter a note (maximum 1,200 characters).');return v.trim();};
export function assertPlanningAccess(actor){if(!canAccessPlanning(actor))fail('Monthly plan entry access is required.','FORBIDDEN');}
export class PlanningStore{
 constructor(store,source){this.store=store;this.source=source;this.db=store.db;this.db.exec(`
 CREATE TABLE IF NOT EXISTS implements_plan_requests(id TEXT PRIMARY KEY,payload TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS implements_plan_owner ON implements_plan_requests(json_extract(payload,'$.owner.id'));
 CREATE TABLE IF NOT EXISTS implements_plan_events(sequence INTEGER PRIMARY KEY AUTOINCREMENT,actor_id TEXT NOT NULL,request_id TEXT NOT NULL,digest TEXT NOT NULL,access TEXT NOT NULL,payload TEXT NOT NULL,UNIQUE(actor_id,request_id));
 CREATE TRIGGER IF NOT EXISTS implements_plan_events_no_update BEFORE UPDATE ON implements_plan_events BEGIN SELECT RAISE(ABORT,'Plan history is append-only'); END;
 CREATE TRIGGER IF NOT EXISTS implements_plan_events_no_delete BEFORE DELETE ON implements_plan_events BEGIN SELECT RAISE(ABORT,'Plan history is append-only'); END;`);}
 actor(id){const a=this.store.read().users.find(u=>u.id===id);assertPlanningAccess(a);return a;}
 read(id,{month='',status='',before=null}={}){
  const actor=this.actor(id),state=this.source.read(),manager=canApprovePlan(actor);if(month)validMonth(month);if(!['','DRAFT','PENDING','APPROVED','RETURNED'].includes(status))fail('Invalid plan status.');if(before!==null&&(!Number.isSafeInteger(before)||before<1))fail('Invalid page.');
  const clauses=[],args=[];if(!manager){clauses.push("json_extract(payload,'$.owner.id')=?");args.push(id);}if(month){clauses.push("json_extract(payload,'$.month')=?");args.push(month);}if(status){clauses.push("json_extract(payload,'$.status')=?");args.push(status);}
  const where=clauses.length?' WHERE '+clauses.join(' AND '):'',total=this.db.prepare('SELECT count(*) n FROM implements_plan_requests'+where).get(...args).n;
  if(before!==null){clauses.push('rowid<?');args.push(before);}const rows=this.db.prepare('SELECT rowid cursor,payload FROM implements_plan_requests'+(clauses.length?' WHERE '+clauses.join(' AND '):'')+' ORDER BY rowid DESC LIMIT 51').all(...args),more=rows.length>50;rows.length=Math.min(rows.length,50);
  const counts=this.db.prepare("SELECT json_extract(payload,'$.status') status,count(*) n FROM implements_plan_requests"+(!manager?" WHERE json_extract(payload,'$.owner.id')=?":'')+" GROUP BY json_extract(payload,'$.status')").all(...(!manager?[id]:[]));
  return {user:planningActor(actor),canSubmit:canSubmitPlan(actor),canApprove:manager,models:state.models.map(planningModel),month:month||state.activeMonth,approvedPlan:monthPlan(state,month||state.activeMonth),requests:rows.map(r=>listView(JSON.parse(r.payload))),total,next:more?rows.at(-1).cursor:null,counts:Object.fromEntries(counts.map(r=>[r.status,r.n]))};
 }
 detail(actorId,id,{full=false}={}){if(typeof id!=='string'||id.length>80)fail('Plan not found.','NOT_FOUND');const actor=this.actor(actorId),row=this.db.prepare('SELECT payload FROM implements_plan_requests WHERE id=?').get(id),record=row?JSON.parse(row.payload):null;if(!record||!canApprovePlan(actor)&&record.owner.id!==actorId)fail('Plan not found.','NOT_FOUND');return full?record:recordView(record);}
 command(actorId,input){this.db.exec('BEGIN IMMEDIATE');try{
  const actor=this.actor(actorId);if(!canSubmitPlan(actor))fail('Plan entry access is required.','FORBIDDEN');
  if(!input||Object.keys(input).some(k=>!['type','id','month','plan','note','expectedVersion','requestId'].includes(k))||!/^[-\w]{12,120}$/.test(input.requestId||''))fail('Invalid planning command.');
  if(['APPROVE','RETURN'].includes(input.type)&&!canApprovePlan(actor))fail('Purchase Manager or Administrator approval is required.','FORBIDDEN');
  const digest=sha(input),access=sha([actor.role,[...(actor.scopes||[])].sort()]),prior=this.db.prepare('SELECT * FROM implements_plan_events WHERE actor_id=? AND request_id=?').get(actorId,input.requestId);
  if(prior){if(prior.digest!==digest||prior.access!==access)fail('Request or account access changed. Reload.','CONFLICT');const e=JSON.parse(prior.payload);this.db.exec('COMMIT');return {record:this.detail(actorId,e.id),replayed:true};}
  const at=new Date().toISOString(),reason=note(input.note),state=this.source.read();let record=input.id?this.detail(actorId,input.id,{full:true}):null;
  if(record&&record.version!==input.expectedVersion)fail('This plan changed. Reload and review before saving.','CONFLICT');
  if(['SAVE_DRAFT','SUBMIT'].includes(input.type)){
   if(record&&(record.owner.id!==actorId||!['DRAFT','RETURNED'].includes(record.status)))fail('Only the owner can edit a draft or returned plan.','FORBIDDEN');
   if(!record&&input.expectedVersion!==0)fail('A new plan starts at version zero.');const month=validMonth(input.month),plan=validatePlan(input.plan,state);if(input.type==='SUBMIT'&&!Object.keys(plan).length)fail('Enter at least one machine before submitting.');
   if(input.type==='SUBMIT'&&this.db.prepare("SELECT id FROM implements_plan_requests WHERE json_extract(payload,'$.owner.id')=? AND json_extract(payload,'$.month')=? AND json_extract(payload,'$.status')='PENDING' AND id<>?").get(actorId,month,record?.id||''))fail('You already have a pending plan for this month. Open that plan before submitting another.','CONFLICT');
   const old=record;record={id:old?.id||randomUUID(),owner:old?.owner||planningActor(actor),createdAt:old?.createdAt||at,month,plan,status:input.type==='SUBMIT'?'PENDING':'DRAFT',version:(old?.version||0)+1,note:reason,baselinePlan:monthPlan(state,month),history:[...(old?.history||[])]};record.baselineSha=hashPlan(record.baselinePlan);
  }else if(['APPROVE','RETURN'].includes(input.type)){
   if(!canApprovePlan(actor))fail('Purchase Manager or Administrator approval is required.','FORBIDDEN');if(!record||record.status!=='PENDING')fail('This plan is no longer pending.','CONFLICT');
   if(input.type==='APPROVE'){
    if(hashPlan(monthPlan(state,record.month))!==record.baselineSha)fail('The approved monthly plan changed after submission. Return this request for review and resubmission.','CONFLICT');
    const plan=validatePlan(record.plan,state),consumed=state.productionConsumed?.[record.month]||{};for(const [id,qty] of Object.entries(consumed))if((plan[id]||0)<qty)fail('Plan cannot be lower than production already completed for '+id+'.');
    const next=structuredClone(state);ensureMonthly(next);if(!next.monthlyPlans[record.month]&&Object.keys(next.monthlyPlans).length>=120)fail('Monthly planning supports up to 120 saved months.');next.monthlyPlans[record.month]=plan;if(next.activeMonth===record.month)next.plan=structuredClone(plan);
    const applied=this.source.save({state:next,expectedRevision:state.revision,requestId:input.requestId,message:'Monthly plan '+record.id+' approved for '+record.month+': '+reason},actorId,{planning:true,transactionOpen:true});record.appliedRevision=applied.revision;record.approvedBy=planningActor(actor);record.approvedAt=at;
   }
   record.status=input.type==='APPROVE'?'APPROVED':'RETURNED';record.version++;
  }else fail('Unknown plan action.');
  record.updatedAt=at;record.history.push({at,type:input.type,by:planningActor(actor),note:reason,version:record.version,month:record.month,plan:structuredClone(record.plan)});
  this.db.prepare('INSERT INTO implements_plan_requests VALUES(?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload').run(record.id,JSON.stringify(record));
  this.db.prepare('INSERT INTO implements_plan_events(actor_id,request_id,digest,access,payload) VALUES(?,?,?,?,?)').run(actorId,input.requestId,digest,access,JSON.stringify({id:record.id,type:input.type,at,by:planningActor(actor),version:record.version,note:reason}));
  this.db.exec('COMMIT');return {record:recordView(record)};
 }catch(e){this.db.exec('ROLLBACK');throw e;}}
}
