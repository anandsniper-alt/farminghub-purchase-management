/** Local administrator utility; credentials are read from environment, never printed. */
import {existsSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {Store} from '../server/store.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const file=join(resolve(process.env.FH_DATA_DIR||join(root,'data')),'purchase-pilot.sqlite');
let store;
try {
 if(!existsSync(file))throw new Error('Start the desired local pilot once before adding a user. Check FH_DATA_DIR.');
 const name=(process.env.FH_USER_NAME||'').trim();
 const email=(process.env.FH_USER_EMAIL||'').trim();
 const password=process.env.FH_USER_PASSWORD;
 const role=(process.env.FH_USER_ROLE||'EXECUTIVE').toUpperCase();
 const scopes=[...new Set((process.env.FH_USER_SCOPES||'LAE_IMPORT').split(',').map(s=>s.trim()).filter(Boolean))];
 store=new Store(file);
 store.createLocalAccount({id:randomUUID(),name,role,scopes,active:true},email,password);
 console.log(`Local pilot account created: ${email} (${role}). Password was not printed.`);
 console.log('This does not create or modify an account in the existing live VMS.');
} catch(error) {console.error(error.message);process.exitCode=1;}
finally {store?.close();}
