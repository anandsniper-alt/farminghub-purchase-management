import test from 'node:test';import assert from 'node:assert/strict';
import {previewType,previewCsv,checkPreviewZip} from '../web/file-preview.mjs';
import {EventEmitter} from 'node:events';import {makeServer} from '../server/index.mjs';import {createSeed} from '../shared/seed.mjs';
test('preview supports uploaded evidence types and rejects active HTML/SVG content',()=>{
 for(const [name,type] of [['Art.PDF','pdf'],['art.png','image'],['photo.JPEG','image'],['plan.xlsx','xlsx'],['letter.docx','docx'],['data.csv','csv'],['mail.eml','text'],['notes.txt','text'],['page.html','unsupported'],['image.svg','unsupported'],['old.xls','unsupported']])assert.equal(previewType(name),type);
});
test('CSV preview preserves quoted commas, escaped quotes, newlines and formula text without evaluation',()=>{
 assert.deepEqual(previewCsv('Item,Value\r\n"A,B","line1\nline2"\r\n"quote ""test""",=1+1').rows,[['Item','Value'],['A,B','line1\nline2'],['quote "test"','=1+1']]);
 assert.deepEqual(previewCsv('A;B\n1;2').rows,[['A','B'],['1','2']]);
 const bounded=previewCsv('a\nb\nc\nd',2);assert.equal(bounded.rows.length,2);assert.equal(bounded.truncated,true);
 assert.equal(previewCsv(Array(60).fill('x').join(',')).rows[0].length,50);
});
test('Office preview rejects oversized expanded archives before extracting document XML',()=>{
 assert.throws(()=>checkPreviewZip(Array(4001).fill({})),/too large/);
 assert.throws(()=>checkPreviewZip([{_data:{uncompressedSize:41*1024*1024}}]),/too large/);
 assert.doesNotThrow(()=>checkPreviewZip([{_data:{uncompressedSize:1000}}]));
});
test('preview fetch retains attachment permissions and serves bundled PDF assets locally',async()=>{
 const state=createSeed('2026-10-15'),actor=state.users.find(u=>u.role==='MANAGER');
 state.files.push({id:'private-preview',scope:'LAE_IMPORT',orderIds:[state.orders[0].id],name:'test.txt',mime:'text/plain',demoContent:'Preview test'});
 const before=structuredClone(state),server=makeServer({read:()=>state,session:t=>t==='ok'?{user:actor}:t==='wrong'?{user:{...actor,scopes:[]}}:null},{log:()=>{}});
 const request=(url,token='ok')=>new Promise(resolve=>{const req={url,method:'GET',headers:{host:'localhost',cookie:token?'fh_session='+token:''},socket:{remoteAddress:'127.0.0.1'}},res=new EventEmitter();res.headers={};res.setHeader=(k,v)=>res.headers[k.toLowerCase()]=v;res.writeHead=(s,h)=>{res.statusCode=s;Object.entries(h).forEach(([k,v])=>res.setHeader(k,v));};res.end=b=>{res.emit('finish');resolve({status:res.statusCode,headers:res.headers,body:Buffer.from(b||'')});};server.emit('request',req,res);});
 assert.equal((await request('/api/files/private-preview','')).status,401);assert.equal((await request('/api/files/private-preview','wrong')).status,404);
 const file=await request('/api/files/private-preview');assert.equal(file.status,200);assert.equal(file.body.toString(),'Preview test');assert.equal(file.headers['cache-control'],'no-store');
 for(const path of ['/file-preview.mjs','/xlsx-preview.mjs','/vendor/pdfjs/pdf.min.mjs','/vendor/pdfjs/pdf.worker.min.mjs'])assert.equal((await request(path,'')).status,200);
 for(const path of ['/vendor/pdfjs/wasm/openjpeg.wasm','/vendor/pdfjs/wasm/openjpeg_nowasm_fallback.js','/vendor/pdfjs/cmaps/Adobe-CNS1-UCS2.bcmap'])assert.equal((await request(path,'')).status,200);
 for(const path of ['/server/store.mjs','/shared/clean-seed.mjs','/vendor/pdfjs/LICENSE','/vendor/pdfjs/wasm/LICENSE_OPENJPEG','/vendor/pdfjs/wasm/..','/vendor/pdfjs/wasm/%2e%2e%2f%2e%2e%2fserver%2fstore.mjs','/vendor/pdfjs/wasm/missing.wasm'])assert.equal((await request(path,'')).status,404,path);
 assert.equal((await request('/vendor/pdfjs/wasm/../../server/store.mjs','')).status,404);assert.deepEqual(state,before);
});
