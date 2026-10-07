import {bomAssets} from './bom-management-files.mjs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const productionAssets=new Map([
 ['/production/',{file:join(root,'web/production/index.html'),type:'text/html; charset=utf-8'}],
 ['/production/index.html',{file:join(root,'web/production/index.html'),type:'text/html; charset=utf-8'}],
 ['/production/app.mjs',{file:join(root,'web/production/app.mjs'),type:'text/javascript; charset=utf-8'}],
 ['/production/style.css',bomAssets.get('/bom/style.css')],
 ['/production/production.css',{file:join(root,'web/production/style.css'),type:'text/css; charset=utf-8'}]
]);
productionAssets.set('/production/sku-finalisation.mjs',{file:join(root,'shared/sku-finalisation.mjs'),type:'text/javascript; charset=utf-8'});
for(const [url,asset]of bomAssets)if(url.startsWith('/bom/assets/'))productionAssets.set(url.replace('/bom/','/production/'),asset);
const cell=value=>'"'+(typeof value==='number'?String(value):String(value??'').replace(/^[=+\-@\t\r]/,"'$&")).replaceAll('"','""')+'"';
export function productionCsv(headers,rows){return Buffer.from('\ufeff'+[headers,...rows].map(r=>r.map(cell).join(',')).join('\r\n'),'utf8');}
