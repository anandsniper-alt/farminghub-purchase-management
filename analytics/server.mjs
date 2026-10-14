import http from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {join,resolve} from 'node:path';
import {LaeAnalyticsStore,assertAnalyticsAccess} from './store.mjs';
import {RuleError} from './access.mjs';
import {SalesStore} from './sales-store.mjs';
import {PlanningStore} from './planning-store.mjs';

const root=fileURLToPath(new URL('./web/',import.meta.url)),prefix='/lae-analytics';
const files={'/':'index.html','/app.mjs':'app.mjs','/planning-ui.mjs':'planning-ui.mjs','/sales-ui.mjs':'sales-ui.mjs','/lae-sales-analytics.mjs':'lae-sales-analytics.mjs','/styles.css':'styles.css','/theme.css':'theme.css','/shell.css':'shell.css','/logo.png':'logo.png'};
const types={html:'text/html; charset=utf-8',mjs:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',png:'image/png'};
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store'});res.end(JSON.stringify(data));};
async function body(req){let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>32*1024*1024)throw new RuleError('Import exceeds 32 MB.','TOO_LARGE');chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks));}catch{throw new RuleError('Invalid JSON.');}}

export async function readIdentity(req,identityOrigin){
 const cookie=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('fh_session='));
 if(!cookie||cookie.length>4096)throw new RuleError('Sign in through Farming Hub.','UNAUTHORIZED');
 let response;try{response=await fetch(identityOrigin+'/api/session',{headers:{Cookie:cookie},redirect:'error',signal:AbortSignal.timeout(10000)});}catch{throw new RuleError('Farming Hub sign-in is temporarily unavailable.','UNAVAILABLE');}
 if(response.status===401)throw new RuleError('Sign in through Farming Hub.','UNAUTHORIZED');
 if(!response.ok)throw new RuleError('Farming Hub sign-in is temporarily unavailable.','UNAVAILABLE');
 const session=await response.json();if(!session.user?.id||typeof session.csrf!=='string')throw new RuleError('Sign-in response unavailable.','UNAVAILABLE');
 assertAnalyticsAccess(session.user);return session;
}
export function makeAnalyticsServer(db,{origin='https://purchase.dvjassociates.com',identityOrigin=origin,releaseSha=process.env.SOURCE_COMMIT||null,authenticate=readIdentity}={}){
 const module=new LaeAnalyticsStore(db),sales=new SalesStore(db,module),planning=new PlanningStore(db,module,sales),server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  try{
   const url=new URL(req.url,'http://localhost');
   if(url.pathname===prefix){res.writeHead(308,{Location:prefix+'/'});return res.end();}
   const path=url.pathname.startsWith(prefix+'/')?url.pathname.slice(prefix.length):url.pathname;
   if(path==='/api/health'&&req.method==='GET'){db.prepare('SELECT 1').get();return json(res,200,{status:'ok',module:'lae-sales-analytics',storage:'isolated-sqlite',releaseSha});}
   if(path.startsWith('/api/')){
    const session=await authenticate(req,identityOrigin);
    if(req.method==='GET'&&path==='/api/session')return json(res,200,{user:session.user,csrf:session.csrf});
    if(req.method==='GET'&&path==='/api/lae-analytics/workspace')return json(res,200,module.workspace(session.user,Object.fromEntries(url.searchParams)));
    if(req.method==='GET'&&path==='/api/lae-sales/workspace')return json(res,200,sales.workspace(session.user,Object.fromEntries(url.searchParams)));
    if(req.method==='GET'&&path==='/api/lae-planning/workspace')return json(res,200,planning.workspace(session.user,Object.fromEntries(url.searchParams)));
    if(req.method==='POST'&&['/api/lae-analytics/import','/api/lae-sales/import','/api/lae-planning/import'].includes(path)){
     if(req.headers.origin!==origin||req.headers['x-csrf-token']!==session.csrf)throw new RuleError('Request origin or session token is invalid.','FORBIDDEN');
     if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))throw new RuleError('JSON content type is required.');
     return json(res,200,(path==='/api/lae-planning/import'?planning:path==='/api/lae-sales/import'?sales:module).import(session.user,await body(req)));
    }
    return json(res,404,{error:'Analytics route unavailable.'});
   }
   if(!['GET','HEAD'].includes(req.method)||!files[path])return json(res,404,{error:'Not found.'});
   const file=files[path],bytes=readFileSync(join(root,file));res.writeHead(200,{'Content-Type':types[file.split('.').at(-1)],'Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:bytes);
  }catch(e){const status={UNAUTHORIZED:401,FORBIDDEN:403,CONFLICT:409,TOO_LARGE:413,UNAVAILABLE:503,VALIDATION:400}[e.code]||500;json(res,status,{error:status===500?'Analytics is temporarily unavailable.':e.message});}
 });
 server.requestTimeout=30000;server.headersTimeout=15000;return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const dir=process.env.ANALYTICS_DATA_DIR||'./analytics-data';mkdirSync(dir,{recursive:true});
 const db=new DatabaseSync(join(dir,'analytics.sqlite'));db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
 const server=makeAnalyticsServer(db);server.listen(Number(process.env.PORT||8000),process.env.HOST||'0.0.0.0');
 for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>server.close(()=>{db.close();process.exit(0);}));
}
