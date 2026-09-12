import http from 'node:http';
import {readFileSync} from 'node:fs';
const file=new URL('./preview.html',import.meta.url);
const server=http.createServer((req,res)=>{if(req.method!=='GET'||!['/','/preview.html'].includes(req.url?.split('?')[0])){res.writeHead(404);res.end('Preview only');return;}res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(readFileSync(file));});
server.listen(Number(process.env.FH_THEME_PORT||8137),'127.0.0.1',()=>console.log('Theme preview: http://127.0.0.1:'+server.address().port+'/#/orders'));
