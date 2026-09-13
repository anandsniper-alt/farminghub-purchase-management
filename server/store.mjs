import {ensureRecordReferences,preserveRecordReferences} from '../shared/references.mjs';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,randomUUID,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {execute,RuleError,USER_ROLES,SCOPES,ensureOrderSerials} from '../shared/domain.mjs';
const hashToken=s=>createHash('sha256').update(s).digest('hex');
function hashPassword(p){const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(p,salt,64).toString('hex');}
function matchPassword(p,s){const [salt,hash]=s.split(':'),actual=scryptSync(p,salt,64),expected=Buffer.from(hash,'hex');return actual.length===expected.length&&timingSafeEqual(actual,expected);}
export class Store{
 constructor(filename,initial){mkdirSync(dirname(filename),{recursive:true});this.db=new DatabaseSync(filename);this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS workspace(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL,payload TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS audit_events(id TEXT PRIMARY KEY,entity_type TEXT NOT NULL,entity_id TEXT NOT NULL,at TEXT NOT NULL,payload TEXT NOT NULL);
 CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audit_events BEGIN SELECT RAISE(ABORT,'Audit events are append-only'); END;
 CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audit_events BEGIN SELECT RAISE(ABORT,'Audit events are append-only'); END;
 CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1);
 CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,account_id TEXT REFERENCES accounts(id),csrf TEXT NOT NULL,expires_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS file_bodies(id TEXT PRIMARY KEY,body BLOB NOT NULL);`);
 if(!this.db.prepare('SELECT id FROM workspace WHERE id=1').get()){if(!initial)throw new Error('New workspace requires an initial state.');this.db.prepare('INSERT INTO workspace VALUES(1,?,?)').run(initial.revision||0,JSON.stringify(initial));const q=this.db.prepare('INSERT INTO audit_events VALUES(?,?,?,?,?)');for(const e of initial.events)q.run(e.id,e.entityType,e.entityId,e.at,JSON.stringify(e));}this.initializeOrderSerials(filename);this.initializeRecordReferences(filename);}
 initializeOrderSerials(filename){const candidate=this.read();if(!ensureOrderSerials(candidate))return;if(candidate.orders.length)this.db.prepare('VACUUM INTO ?').run(filename+'.before-order-serials-'+randomUUID()+'.sqlite');this.db.exec('BEGIN IMMEDIATE');try{const previous=this.read(),next=structuredClone(previous);if(ensureOrderSerials(next)){next.revision++;next.events.push({id:randomUUID(),at:new Date().toISOString(),actorId:'system',actorName:'System',entityType:'settings',entityId:'order-serials',action:'ORDER_SERIALS_INITIALIZED',summary:'Stable order display serials initialized; existing PO numbers and issued snapshots preserved.',oldValue:null,newValue:{orderCount:next.orders.length,nextOrderSerial:next.nextOrderSerial},source:'Data initialization'});this.commit(next,previous.revision,previous);}this.db.exec('COMMIT');}catch(e){this.db.exec('ROLLBACK');throw e;}}
 initializeRecordReferences(filename){const candidate=this.read();if(!ensureRecordReferences(candidate))return;this.db.prepare('VACUUM INTO ?').run(filename+'.before-record-references-'+randomUUID()+'.sqlite');this.db.exec('BEGIN IMMEDIATE');try{const previous=this.read(),next=structuredClone(previous);if(ensureRecordReferences(next)){next.revision++;next.events.push({id:randomUUID(),at:new Date().toISOString(),actorId:'system',actorName:'System',entityType:'settings',entityId:'record-references',action:'RECORD_REFERENCES_INITIALIZED',summary:'Permanent software references assigned without changing business codes or issued history.',oldValue:null,newValue:{namespace:next.recordReferences.namespace,count:Object.keys(next.recordReferences.entries).length},source:'Data initialization'});this.commit(next,previous.revision,previous);}this.db.exec('COMMIT');}catch(e){this.db.exec('ROLLBACK');throw e;}}
 read(){return JSON.parse(this.db.prepare('SELECT payload FROM workspace WHERE id=1').get().payload);}
 commit(next,expected,previous){ensureRecordReferences(next);preserveRecordReferences(previous,next);const actual=this.db.prepare('SELECT revision FROM workspace WHERE id=1').get().revision;if(actual!==expected)throw new RuleError('Another user changed this workspace. Reload before saving; nothing was overwritten.','CONFLICT');if(JSON.stringify(next.events.slice(0,previous.events.length))!==JSON.stringify(previous.events))throw new RuleError('Earlier audit records must not change.','AUDIT');const q=this.db.prepare('INSERT INTO audit_events VALUES(?,?,?,?,?)');for(const e of next.events.slice(previous.events.length))q.run(e.id,e.entityType,e.entityId,e.at,JSON.stringify(e));this.db.prepare('UPDATE workspace SET revision=?,payload=? WHERE id=1').run(next.revision,JSON.stringify(next));}
 transact(command,actorId,expected){this.db.exec('BEGIN IMMEDIATE');try{const previous=this.read(),actor=previous.users.find(u=>u.id===actorId),out=execute(previous,command,actor);this.commit(out.state,expected,previous);this.db.exec('COMMIT');return out;}catch(e){this.db.exec('ROLLBACK');throw e;}}
 saveFile(meta,bytes,expected,actor){this.db.exec('BEGIN IMMEDIATE');try{const previous=this.read(),next=structuredClone(previous);next.files.push(meta);next.revision++;next.events.push({id:randomUUID(),at:new Date().toISOString(),actorId:actor.id,actorName:actor.name,entityType:'file',entityId:meta.id,action:'FILE_UPLOADED',summary:'Protected evidence uploaded: '+meta.name,oldValue:null,newValue:{name:meta.name,size:meta.size,orderIds:meta.orderIds},source:'User action'});this.db.prepare('INSERT INTO file_bodies VALUES(?,?)').run(meta.id,bytes);this.commit(next,expected,previous);this.db.exec('COMMIT');return next;}catch(e){this.db.exec('ROLLBACK');throw e;}}
 fileBytes(id){return this.db.prepare('SELECT body FROM file_bodies WHERE id=?').get(id)?.body;}
 addAccount(id,email,password){if(password.length<12)throw new Error('Passwords must have at least 12 characters.');if(!this.read().users.some(u=>u.id===id))throw new Error('The user profile must exist first.');this.db.prepare('INSERT INTO accounts(id,email,password_hash) VALUES(?,?,?)').run(id,email.trim().toLowerCase(),hashPassword(password));}
 listAccounts(){const accounts=new Map(this.db.prepare('SELECT id,email,active FROM accounts').all().map(a=>[a.id,a]));return this.read().users.map(u=>{const a=accounts.get(u.id);return {id:u.id,name:u.name,role:u.role,scopes:u.scopes,email:a?.email||null,active:!!a?.active&&u.active!==false,hasAccount:!!a};});}
 createLocalAccount(profile,email,password,{actorId=null,expectedRevision}={}){
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
   if(expectedRevision!==undefined&&expectedRevision!==previous.revision)throw new RuleError('Another user changed this workspace. Reload before saving; nothing was overwritten.','CONFLICT');
   if(previous.users.some(u=>u.id===profile.id)||this.db.prepare('SELECT id FROM accounts WHERE email=?').get(email))throw new RuleError('Account ID or email already exists.','CONFLICT');
   const next=structuredClone(previous);next.users.push(cleanProfile);next.revision++;
   next.events.push({id:randomUUID(),at:new Date().toISOString(),actorId:actor?.id||'local-admin-cli',actorName:actor?.name||'Local account administrator',entityType:'user',entityId:profile.id,action:'USER_PROFILE_CREATED',summary:'User account created.',oldValue:null,newValue:{id:cleanProfile.id,name:cleanProfile.name,role:cleanProfile.role},source:actor?'User access portal':'Account setup'});
   this.commit(next,expectedRevision??previous.revision,previous);
   this.db.prepare('INSERT INTO accounts(id,email,password_hash) VALUES(?,?,?)').run(profile.id,email,encoded);
   this.db.exec('COMMIT');
   return cleanProfile;
  }catch(e){this.db.exec('ROLLBACK');throw e;}
 }
 addProfile(profile){this.db.exec('BEGIN IMMEDIATE');try{const previous=this.read();if(previous.users.some(u=>u.id===profile.id))throw new Error('User ID exists.');const next=structuredClone(previous);next.users.push(profile);next.revision++;next.events.push({id:randomUUID(),at:new Date().toISOString(),actorId:'local-admin-cli',actorName:'Local account administrator',entityType:'user',entityId:profile.id,action:'USER_PROFILE_CREATED',summary:'Local pilot account profile added.',oldValue:null,newValue:{id:profile.id,name:profile.name,role:profile.role},source:'Account setup'});this.commit(next,previous.revision,previous);this.db.exec('COMMIT');}catch(e){this.db.exec('ROLLBACK');throw e;}}
 login(email,password){const a=this.db.prepare('SELECT * FROM accounts WHERE email=? AND active=1').get(String(email).trim().toLowerCase());const fallback='739158c358760df4bd00a297b5ff2a9e:'+('00'.repeat(64));const ok=matchPassword(String(password),a?.password_hash||fallback);const u=a?this.read().users.find(u=>u.id===a.id&&u.active!==false):null;if(!a||!ok||!u)return null;const token=randomBytes(32).toString('hex'),csrf=randomBytes(24).toString('hex');this.db.prepare('DELETE FROM sessions WHERE expires_at<?').run(Date.now());this.db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(hashToken(token),a.id,csrf,Date.now()+8*60*60*1000);return{token,csrf,user:u};}
 session(token){if(!token)return null;const s=this.db.prepare('SELECT * FROM sessions WHERE token_hash=? AND expires_at>?').get(hashToken(token),Date.now());if(!s)return null;const a=this.db.prepare('SELECT active FROM accounts WHERE id=?').get(s.account_id),user=this.read().users.find(u=>u.id===s.account_id&&u.active!==false);return a?.active&&user?{...s,user}:null;}
 logout(token){if(token)this.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hashToken(token));}
 close(){this.db.close();}
}
