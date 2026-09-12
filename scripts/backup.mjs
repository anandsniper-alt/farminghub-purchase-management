/** Consistent SQLite snapshot including evidence. Keep resulting files confidential. */
import {DatabaseSync} from 'node:sqlite';
import {existsSync,mkdirSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const input=join(resolve(process.env.FH_DATA_DIR||join(root,'data')),'purchase-pilot.sqlite');
const outputDir=resolve(process.env.FH_BACKUP_DIR||join(root,'backups'));
let db;
try {
 if(!existsSync(input))throw new Error('No local pilot database exists at '+input);
 mkdirSync(outputDir,{recursive:true});
 const target=join(outputDir,'FH_Purchase_'+new Date().toISOString().replaceAll(':','-')+'.sqlite');
 db=new DatabaseSync(input);db.exec('PRAGMA busy_timeout=10000;');
 db.exec("VACUUM INTO '"+target.replaceAll("'","''")+"'");
 console.log('Consistent local database snapshot: '+target);
 console.log('Contains private accounts, sessions, order history and documents. Protect it.');
} catch(error) {console.error(error.message);process.exitCode=1;}
finally {db?.close();}
