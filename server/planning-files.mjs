import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const planningAssets=new Map([
 ['/planning/','web/planning/index.html'],['/planning/index.html','web/planning/index.html'],['/planning/app.mjs','web/planning/app.mjs'],['/planning/style.css','web/bom-management/style.css'],['/planning/planning.css','web/planning/style.css']
].map(([url,file])=>[url,{file:join(root,file),type:file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8'}]));
