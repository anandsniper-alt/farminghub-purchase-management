// Loopback-only standalone review. No database, credentials or live APIs.
import http from 'node:http';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const file=fileURLToPath(new URL('../Farming_Hub_Purchase_Management_Clean_Review.html',import.meta.url)),port=Number(process.env.FH_VMS_PREVIEW_PORT||8138);
const server=http.createServer((req,res)=>{if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}const path=new URL(req.url,'http://localhost').pathname;if(!['/','/index.html'].includes(path)){res.writeHead(404);return res.end();}const html=readFileSync(file);res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:html);});
server.listen(port,'127.0.0.1',()=>console.log(`VMS isolated browser review: http://127.0.0.1:${port}/#/vms\nReview roles only; no connection to the live website.`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
