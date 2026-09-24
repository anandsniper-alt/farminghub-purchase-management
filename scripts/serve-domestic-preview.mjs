import http from 'node:http';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const page=fileURLToPath(new URL('../test-output/Domestic_BOM_Preview.html',import.meta.url));
const server=http.createServer((req,res)=>{if(req.url!=='/'&&req.url!=='/index.html'){res.writeHead(404);return res.end();}res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(readFileSync(page));});
server.listen(8146,'127.0.0.1',()=>console.log('Domestic BOM test site: http://127.0.0.1:8146/#/domestic/models'));
