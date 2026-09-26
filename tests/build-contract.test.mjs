import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync,cpSync,existsSync,statSync} from 'node:fs';
import {dirname,resolve,relative,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {REVIEW_MODULES,stripReviewModule} from '../scripts/review-sources.mjs';
import {makeServer} from '../server/index.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
test('review build succeeds in a fresh checkout without an output directory',()=>{
 const dir=mkdtempSync(join(tmpdir(),'fh-fresh-review-'));
 try{
  for(const name of ['scripts','shared','web','templates','data-reference','package.json'])cpSync(join(root,name),join(dir,name),{recursive:true});
  assert.equal(existsSync(join(dir,'test-output')),false);
  execFileSync(process.execPath,[join(dir,'scripts/build.mjs'),'--domestic-preview'],{cwd:dir,stdio:'pipe'});
  assert.ok(statSync(join(dir,'test-output/Domestic_BOM_Preview.html')).size>1000000);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('review bundle contains its local ESM dependencies and compiles without symbol collisions',()=>{
 assert.equal(new Set(REVIEW_MODULES).size,REVIEW_MODULES.length);
 for(const file of REVIEW_MODULES){const source=readFileSync(join(root,file),'utf8');for(const match of source.split('\n').filter(line=>/^import\s/.test(line)).join('\n').matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)){const dependency=relative(root,resolve(root,dirname(file),match[1])).replaceAll('\\','/');assert.ok(REVIEW_MODULES.includes(dependency),file+' requires '+dependency);}}
 const dir=mkdtempSync(join(tmpdir(),'fh-review-contract-'));
 try{const path=join(dir,'bundle.mjs');writeFileSync(path,REVIEW_MODULES.map(p=>stripReviewModule(readFileSync(join(root,p),'utf8'))).join('\n'));execFileSync(process.execPath,['--check',path],{stdio:'pipe'});}finally{rmSync(dir,{recursive:true,force:true});}
});
test('every review source is also served as the matching native module',async()=>{
 const server=makeServer({});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const origin='http://127.0.0.1:'+server.address().port;for(const file of REVIEW_MODULES){const response=await fetch(origin+'/'+file.replace(/^web\//,''));assert.equal(response.status,200,file);assert.equal(await response.text(),readFileSync(join(root,file),'utf8'),file);}}finally{await new Promise(r=>server.close(r));}
});
