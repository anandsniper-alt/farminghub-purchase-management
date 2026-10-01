/** Authenticated recovery download. A consistent SQLite snapshot, never the active file. */
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,createReadStream,statSync} from 'node:fs';
import {rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {RuleError} from '../shared/domain.mjs';
let running=false;
if(!isMainThread){
 try{
  const db=new DatabaseSync(workerData.database);db.exec('PRAGMA busy_timeout=10000');db.prepare('VACUUM INTO ?').run(workerData.target);db.close();
  const restored=new DatabaseSync(workerData.target,{readOnly:true});
  if(restored.prepare('PRAGMA integrity_check').get().integrity_check!=='ok'||restored.prepare('PRAGMA foreign_key_check').all().length)throw Error('Recovery snapshot integrity check failed.');
  const revision=restored.prepare('SELECT revision FROM workspace WHERE id=1').get().revision;restored.close();
  const hash=createHash('sha256');for await(const chunk of createReadStream(workerData.target))hash.update(chunk);
  parentPort.postMessage({sha256:hash.digest('hex'),bytes:statSync(workerData.target).size,revision});
 }catch(error){parentPort.postMessage({error:error.message});}
}
export async function downloadRecovery(store,res){
 if(running)throw new RuleError('A recovery download is already in progress.');running=true;
 const directory=mkdtempSync(join(tmpdir(),'fh-recovery-')),target=join(directory,'purchase-pilot.sqlite');
 try{
  const database=store.db.prepare('PRAGMA database_list').all().find(row=>row.name==='main')?.file;
  if(!database)throw Error('Persistent database required.');
  const info=await new Promise((resolve,reject)=>{const worker=new Worker(new URL(import.meta.url),{workerData:{database,target}});worker.once('message',data=>data.error?reject(Error(data.error)):resolve(data));worker.once('error',reject);worker.once('exit',code=>{if(code)reject(Error('Snapshot worker stopped.'));});});
  res.writeHead(200,{'Content-Type':'application/vnd.sqlite3','Content-Length':info.bytes,'Content-Disposition':'attachment; filename="FH_Purchase_Recovery.sqlite"','X-Backup-SHA256':info.sha256,'X-Backup-Revision':info.revision,'Cache-Control':'private, no-store'});
  await new Promise((resolve,reject)=>{const stream=createReadStream(target);stream.on('error',reject);res.once('finish',resolve);res.once('close',()=>{stream.destroy();resolve();});stream.pipe(res);});
 }finally{running=false;await rm(directory,{recursive:true,force:true});}
}
