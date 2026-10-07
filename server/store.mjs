import {ensureRecordReferences,preserveRecordReferences} from '../shared/references.mjs';
import {EditVersions} from './concurrency.mjs';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,randomUUID,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {execute,RuleError,USER_ROLES,SCOPES,ensureOrderSerials} from '../shared/domain.mjs';
const hashToken=s=>createHash('sha256').update(s).digest('hex');
function hashPassword(p){const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(p,salt,64).toString('hex');}
function matchPassword(p,s){const [salt,hash]=s.split(':'),actual=scryptSync(p,salt,64),expected=Buffer.from(hash,'hex');return actual.length===expected.length&&timingSafeEqual(actual,expected);}
export class Store{
 constructor(filename,initial){this.editVersions=new EditVersions();mkdirSync(dirname(filename),{recursive:true});this.db=new DatabaseSync(filename);this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS workspace(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL,payload TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS audit_events(id TEXT PRIMARY KEY,entity_type TEXT NOT NULL,entity_id TEXT NOT NULL,at TEXT NOT NULL,payload TEXT NOT NULL);
 CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audit_events BEGIN SELECT RAISE(ABORT,'Audit events are append-only'); END;
 CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audit_events BEGIN SELECT RAISE(ABORT,'Audit events are append-only'); END;
 CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1);
 CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,account_id TEXT REFERENCES accounts(id),csrf TEXT NOT NULL,expires_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS request_receipts(actor_id TEXT NOT NULL,request_id TEXT NOT NULL,kind TEXT NOT NULL,digest TEXT NOT NULL,access TEXT NOT NULL,result TEXT NOT NULL,at TEXT NOT NULL,PRIMARY KEY(actor_id,request_id));
 CREATE TABLE IF NOT EXISTS file_bodies(id TEXT PRIMARY KEY,body BLOB NOT NULL);`);
 if(!this.db.prepare('SELECT id FROM workspace WHERE id=1').get()){if(!initial)throw new Error('New workspace requires an initial state.');this.db.prepare('INSERT INTO workspace VALUES(1,?,?)').run(initial.revision||0,JSON.stringify(initial));const q=this.db.prepare('INSERT INTO audit_events VALUES(?,?,?,?,?)');for(const e of initial.events)q.run(e.id,e.entityType,e.entityId,e.at,JSON.stringify(e));}this.initializeOrderSerials(filename);this.initializeRecordReferences(filename);}
 initializeOrderSerials(filename){const candidate=this.read();if(!ensureOrderSerials(candidate))return;if(candidate.orders.length)this.db.prepare('VACUUM INTO ?').run(filename+'.before-order-serials-'+randomUUID()+'.sqlite');this.db.exec('BEGIN IMMEDIATE');try{const previous=this.read(),next=structuredClone(previous);if(ensureOrderSerials(next)){next.revision++;next.events.push({id:randomUUID(),at:new Date().toISOString(),actorId:'system',actorName:'System',entityType:'settings',entityId:'order-serials',action:'ORDER_SERIALS_INITIALIZED',summary:'Stable order display serials initialized; existing PO numbers and issued snapshots preserved.',oldValue:null,newValue:{orderCount:next.orders.length,nextOrderSerial:next.nextOrderSerial},source:'Data initialization'});this.commit(next,previous.revision,previous);}this.db.exec('COMMIT');}catch(e){this.db.exec('ROLLBACK');throw e;}}
 initializeRecordReferences(filename){const candidate=this.read();if(!ensureRecordReferences(candidate))return;this.db.prepare('VACUUM INTO ?').run(filename+'.before-record-references-'+randomUUID()+'.sqlite');this.db.exec('BEGIN IMMEDIATE');try{const previous=this.read(),next=structuredClone(previous);if(ensureRecordReferences(next)){next.revision++;next.events.push({id:randomUUID(),at:new Date().toISOString(),actorId:'system',actorName:'System',entityType:'settings',entityId:'record-references',action:'RECORD_REFERENCES_INITIALIZED',summary:'Permanent software references assigned without changing business codes or issued history.',oldValue:null,newValue:{namespace:next.recordReferences.namespace,count:Object.keys(next.recordReferences.entries).length},source:'Data initialization'});this.commit(next,previous.revision,previous);}this.db.exec('COMMIT');}catch(e){this.db.exec('ROLLBACK');throw e;}}
 editContext(state,actorId){return this.editVersions.issue(state,actorId);}
 revision(){return this.db.prepare('SELECT revision FROM workspace WHERE id=1').get().revision;}
 read(){return JSON.parse(this.db.prepare('SELECT payload FROM workspace WHERE id=1').get().payload);}
 commit(next,expected,previous){ensureRecordReferences(next);preserveRecordReferences(previous,next);const actual=this.db.prepare('SELECT revision FROM workspace WHERE id=1').get().revision;if(actual!==expected)throw new RuleError('Another user changed this workspace. Reload before saving; nothing was overwritten.','CONFLICT');if(JSON.stringify(next.events.slice(0,previous.events.length))!==JSON.stringify(previous.events))throw new RuleError('Earlier audit records must not change.','AUDIT');const q=this.db.prepare('INSERT INTO audit_events VALUES(?,?,?,?,?)');for(const e of next.events.slice(previous.events.length))q.run(e.id,e.entityType,e.entityId,e.at,JSON.stringify(e));this.db.prepare('UPDATE workspace SET revision=?,payload=? WHERE id=1').run(next.revision,JSON.stringify(next));}
 requestReceipt(actorId,requestId){return this.db.prepare('SELECT * FROM request_receipts WHERE actor_id=? AND request_id=?').get(actorId,requestId);}
 requestCheck(actor,requestId,kind,payload){if(!requestId)return null;if(typeof requestId!=='string'||! /^[A-Za-z0-9_-]{12,120}$/.test(requestId))throw new RuleError('Invalid request ID.');const digest=createHash('sha256').update(canonicalRequest(payload)).digest('hex'),access=JSON.stringify([actor.role,[...actor.scopes].sort()]),prior=this.requestReceipt(actor.id,requestId);if(prior){if(prior.kind!==kind||prior.digest!==digest)throw new RuleError('This request ID was already used for different content.','CONFLICT');if(prior.access!==access)throw new RuleError('Account access changed; review the saved result before continuing.','FORBIDDEN');return {replayed:true,result:JSON.parse(prior.result)};}return {digest,access};}
 requestSave(actorId,requestId,kind,checked,result){if(requestId)this.db.prepare('INSERT INTO request_receipts VALUES(?,?,?,?,?,?,?)').run(actorId,requestId,kind,checked.digest,checked.access,JSON.stringify(result??null),new Date().toISOString());}
 transact(command,actorId,expected,requestId,editContext){this.db.exec('BEGIN IMMEDIATE');try{const previous=this.read(),actor=previous.users.find(u=>u.id===actorId);if(!actor||actor.active===false)throw new RuleError('Active account required.','FORBIDDEN');const request=this.requestCheck(actor,requestId,'COMMAND',command);if(request?.replayed){this.db.exec('COMMIT');return {state:previous,result:request.result,replayed:true};}this.editVersions.assert(previous,command,actorId,expected,editContext);const out=execute(previous,command,actor);this.commit(out.state,previous.revision,previous);this.requestSave(actorId,requestId,'COMMAND',request,out.result);this.db.exec('COMMIT');return out;}catch(e){this.db.exec('ROLLBACK');throw e;}}
 saveFile(meta,bytes,expected,actor,requestId,editContext){this.db.exec('BEGIN IMMEDIATE');try{const previous=this.read(),request=this.requestCheck(actor,requestId,'UPLOAD',{name:meta.name,orderIds:meta.orderIds,scope:meta.scope,sha256:createHash('sha256').update(bytes).digest('hex')});if(request?.replayed){if(!previous.files.some(f=>f.id===request.result.id)||!this.fileBytes(request.result.id))throw new RuleError('The earlier upload is archived or unavailable. Ask your administrator to recover its evidence before retrying.','CONFLICT');meta.id=request.result.id;this.db.exec('COMMIT');return previous;}this.editVersions.assert(previous,{type:'UPLOAD',payload:{orderIds:meta.orderIds}},actor.id,expected,editContext);const next=structuredClone(previous);next.files.push(meta);next.revision++;next.events.push({id:randomUUID(),at:new Date().toISOString(),actorId:actor.id,actorName:actor.name,entityType:'file',entityId:meta.id,action:'FILE_UPLOADED',summary:'Protected evidence uploaded: '+meta.name,oldValue:null,newValue:{name:meta.name,size:meta.size??bytes.length,orderIds:meta.orderIds},source:'User action'});this.db.prepare('INSERT INTO file_bodies VALUES(?,?)').run(meta.id,bytes);this.commit(next,previous.revision,previous);this.requestSave(actor.id,requestId,'UPLOAD',request,{id:meta.id});this.db.exec('COMMIT');return next;}catch(e){this.db.exec('ROLLBACK');throw e;}}
 fileBytes(id){return this.db.prepare('SELECT body FROM file_bodies WHERE id=?').get(id)?.body;}
 addAccount(id,email,password){if(password.length<12)throw new Error('Passwords must have at least 12 characters.');if(!this.read().users.some(u=>u.id===id))throw new Error('The user profile must exist first.');this.db.prepare('INSERT INTO accounts(id,email,password_hash) VALUES(?,?,?)').run(id,email.trim().toLowerCase(),hashPassword(password));}
 listAccounts(){const accounts=new Map(this.db.prepare('SELECT id,email,active FROM accounts').all().map(a=>[a.id,a]));return this.read().users.map(u=>{const a=accounts.get(u.id);return {id:u.id,name:u.name,role:u.role,scopes:u.scopes,email:a?.email||null,active:!!a?.active&&u.active!==false,hasAccount:!!a};});}
 createLocalAccount(profile,email,password,{actorId=null,expectedRevision,editContext}={}){
  if(!USER_ROLES.includes(profile.role))throw new RuleError('Unsupported local role.');
  if(typeof profile.name!=='string'||!profile.name.trim()||profile.name.trim().length>120)throw new RuleError('Name must contain 1–120 characters.');
  if(!profile.id||!Array.isArray(profile.scopes)||!profile.scopes.length||profile.scopes.some(s=>!SCOPES.includes(s)))throw new RuleError('Name, persistent ID and valid assigned scopes are required.');
  const cleanProfile={id:profile.id,name:profile.name.trim(),role:profile.role,scopes:[...new Set(profile.scopes)],active:true};
  email=String(email||'').trim().toLowerCase();
  if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new RuleError('A valid email is required.');
  if(typeof password!=='string'||password.length<12||password.length>256)throw new RuleError('Use a password of 12–256 characters.');
  const encoded=hashPassword(password);
  this.db.exec('BEGIN IMMEDIATE');
  try{
   const previous=this.read(),actor=actorId?previous.users.find(u=>u.id===actorId):null;
   if(actorId&&(!actor||actor.active===false||actor.role!=='ADMIN'))throw new RuleError('Administrator access is required to create users.','FORBIDDEN');
   if(actorId&&!Number.isSafeInteger(expectedRevision))throw new RuleError('Expected workspace revision is required.');
   if(expectedRevision!==undefined)this.editVersions.assert(previous,{type:'CREATE_USER'},actorId,expectedRevision,editContext);
   if(previous.users.some(u=>u.id===profile.id)||this.db.prepare('SELECT id FROM accounts WHERE email=?').get(email))throw new RuleError('Account ID or email already exists.','CONFLICT');
   const next=structuredClone(previous);next.users.push(cleanProfile);next.revision++;
   next.events.push({id:randomUUID(),at:new Date().toISOString(),actorId:actor?.id||'local-admin-cli',actorName:actor?.name||'Local account administrator',entityType:'user',entityId:profile.id,action:'USER_PROFILE_CREATED',summary:'User account created.',oldValue:null,newValue:{id:cleanProfile.id,name:cleanProfile.name,role:cleanProfile.role},source:actor?'User access portal':'Account setup'});
   this.commit(next,previous.revision,previous);
   this.db.prepare('INSERT INTO accounts(id,email,password_hash) VALUES(?,?,?)').run(profile.id,email,encoded);
   this.db.exec('COMMIT');
   return cleanProfile;
  }catch(e){this.db.exec('ROLLBACK');throw e;}
 }
 resetUserPassword(input,actorId){
  this.db.exec('BEGIN IMMEDIATE');
  try{
   const previous=this.read(),actor=previous.users.find(u=>u.id===actorId);
   if(!actor||actor.active===false||actor.role!=='ADMIN')throw new RuleError('Administrator access is required to reset passwords.','FORBIDDEN');
   if(!input||Object.keys(input).some(k=>!['userId','password','confirmPassword','currentPassword','remarks','confirm','expectedRevision','editContext','requestId'].includes(k)))throw new RuleError('Invalid password reset request.');
   const {userId,password,confirmPassword,currentPassword,remarks,confirm,expectedRevision,editContext,requestId}=input;
   if(typeof userId!=='string'||!previous.users.some(u=>u.id===userId))throw new RuleError('User not found.','NOT_FOUND');
   const account=this.db.prepare('SELECT * FROM accounts WHERE id=?').get(userId);
   if(!account)throw new RuleError('This profile has no sign-in account.');
   if(typeof password!=='string'||password.length<12||password.length>256)throw new RuleError('Use a password of 12–256 characters.');
   if(password!==confirmPassword)throw new RuleError('Passwords do not match.');
   if(confirm!==true)throw new RuleError('Confirm the password reset and session sign-out.');
   if(typeof remarks!=='string'||!remarks.trim()||remarks.length>1200)throw new RuleError('Enter a reason of 1–1,200 characters.');
   if(remarks.includes(password)||(typeof currentPassword==='string'&&currentPassword&&remarks.includes(currentPassword)))throw new RuleError('Keep passwords out of the checking reason.');
   if(!Number.isSafeInteger(expectedRevision)||!requestId)throw new RuleError('Reload the user list before saving.');
   // Retry metadata excludes passwords. The slow stored credential hash verifies exact secret replay.
   const request=this.requestCheck(actor,requestId,'USER_PASSWORD_RESET',{userId,remarks:remarks.trim()});
   if(request?.replayed){if(!matchPassword(password,account.password_hash))throw new RuleError('This reset request no longer matches the current password. Review and use a new request.','CONFLICT');this.db.exec('COMMIT');return {state:previous,result:request.result,replayed:true};}
   this.editVersions.assert(previous,{type:'RESET_USER_PASSWORD'},actorId,expectedRevision,editContext);
   if(userId===actorId&&(typeof currentPassword!=='string'||currentPassword.length>256||!matchPassword(currentPassword,account.password_hash)))throw new RuleError('Enter your correct current password.');
   if(matchPassword(password,account.password_hash))throw new RuleError('Choose a different password.');
   const encoded=hashPassword(password),revoked=this.db.prepare('SELECT count(*) n FROM sessions WHERE account_id=?').get(userId).n;
   this.db.prepare('UPDATE accounts SET password_hash=? WHERE id=?').run(encoded,userId);
   this.db.prepare('DELETE FROM sessions WHERE account_id=?').run(userId);
   const next=structuredClone(previous);next.revision++;next.events.push({id:randomUUID(),at:new Date().toISOString(),actorId:actor.id,actorName:actor.name,entityType:'user',entityId:userId,action:'USER_PASSWORD_RESET',summary:'Password reset; existing sign-in sessions revoked.',oldValue:null,newValue:{userId,sessionsRevoked:revoked,reason:remarks.trim()},source:'User access portal'});
   this.commit(next,previous.revision,previous);
   const result={userId,sessionsRevoked:revoked,reauthRequired:userId===actorId};this.requestSave(actorId,requestId,'USER_PASSWORD_RESET',request,result);this.db.exec('COMMIT');return {state:next,result};
  }catch(e){this.db.exec('ROLLBACK');throw e;}
 }
 addProfile(profile){this.db.exec('BEGIN IMMEDIATE');try{const previous=this.read();if(previous.users.some(u=>u.id===profile.id))throw new Error('User ID exists.');const next=structuredClone(previous);next.users.push(profile);next.revision++;next.events.push({id:randomUUID(),at:new Date().toISOString(),actorId:'local-admin-cli',actorName:'Local account administrator',entityType:'user',entityId:profile.id,action:'USER_PROFILE_CREATED',summary:'Local pilot account profile added.',oldValue:null,newValue:{id:profile.id,name:profile.name,role:profile.role},source:'Account setup'});this.commit(next,previous.revision,previous);this.db.exec('COMMIT');}catch(e){this.db.exec('ROLLBACK');throw e;}}
 login(email,password){const a=this.db.prepare('SELECT * FROM accounts WHERE email=? AND active=1').get(String(email).trim().toLowerCase());const fallback='739158c358760df4bd00a297b5ff2a9e:'+('00'.repeat(64));const ok=matchPassword(String(password),a?.password_hash||fallback);const u=a?this.read().users.find(u=>u.id===a.id&&u.active!==false):null;if(!a||!ok||!u)return null;const token=randomBytes(32).toString('hex'),csrf=randomBytes(24).toString('hex');this.db.prepare('DELETE FROM sessions WHERE expires_at<?').run(Date.now());this.db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(hashToken(token),a.id,csrf,Date.now()+8*60*60*1000);return{token,csrf,user:u};}
 session(token){if(!token)return null;const s=this.db.prepare('SELECT * FROM sessions WHERE token_hash=? AND expires_at>?').get(hashToken(token),Date.now());if(!s)return null;const a=this.db.prepare('SELECT active FROM accounts WHERE id=?').get(s.account_id);if(!a?.active)return null;const row=this.db.prepare("SELECT u.value AS profile FROM workspace w, json_each(w.payload,'$.users') u WHERE w.id=1 AND json_extract(u.value,'$.id')=?").get(s.account_id),user=row?JSON.parse(row.profile):null;return user&&user.active!==false?{...s,user}:null;}
 logout(token){if(token)this.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hashToken(token));}
 close(){this.db.close();}
}

function canonicalRequest(value){if(Array.isArray(value))return '['+value.map(canonicalRequest).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).filter(k=>value[k]!==undefined).sort().map(k=>JSON.stringify(k)+':'+canonicalRequest(value[k])).join(',')+'}';return JSON.stringify(value);}
