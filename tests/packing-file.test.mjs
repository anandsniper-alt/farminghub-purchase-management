import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readPackingFile} from '../web/packing-import.mjs';
test('local file reader preserves CSV bytes provenance and refuses unsupported or empty files',async()=>{const file=new File(['Item code,Length mm\nA,840'],'pack.csv'),r=await readPackingFile(file);assert.equal(r.meta.hash,createHash('sha256').update(await file.bytes()).digest('hex'));assert.equal(r.sheets[0].rows[1][1],'840');await assert.rejects(readPackingFile(new File([],'pack.csv')),/non-empty/);await assert.rejects(readPackingFile(new File(['x'],'pack.xls')),/Save legacy XLS/);await assert.rejects(readPackingFile({size:11*1024*1024}),/10 MB/);});
test('PDF lookup requires exact content hash in loaded library and never guesses source rows',async()=>{const file=new File(['%PDF-1.7\nsynthetic test'],'packing.pdf'),hash=createHash('sha256').update(await file.bytes()).digest('hex'),library=[{id:'same',sourceHash:hash},{id:'other',sourceHash:'other'}];await assert.rejects(readPackingFile(file),/no extracted records/);const r=await readPackingFile(file,library);assert.equal(r.records.length,1);assert.equal(r.records[0].id,'same');assert.equal(r.library,false);});
test('JSON library is parsed as data, not HTML or executable content',async()=>{const d={version:'1.0',packingProfiles:[{id:'a',code:'<script>bad</script>',quantity:1,packages:1,notes:['<img onerror="bad">']}]};const r=await readPackingFile(new File([JSON.stringify(d)],'data.json'));assert.equal(r.records[0].code,'<script>bad</script>');assert.ok(r.library);await assert.rejects(readPackingFile(new File(['{}'],'data.json')),/version 1.0/);});

test('XLSX actual expansion pauses before reading the remaining forged-size stream',async()=>{
 const original=globalThis.JSZip,chunk=new Uint8Array(1024*1024).fill(65);let emitted=0,paused=false;
 const entry={_data:{uncompressedSize:1},internalStream(type){assert.equal(type,'uint8array');const handlers={};const stream={on(event,fn){handlers[event]=fn;return stream;},pause(){paused=true;return stream;},resume(){for(let i=0;i<30&&!paused;i++){emitted++;handlers.data(chunk);}if(!paused)handlers.end();return stream;}};return stream;}};
 globalThis.JSZip={loadAsync:async()=>({files:{'xl/workbook.xml':entry},file:path=>path==='xl/workbook.xml'?entry:null})};
 try{await assert.rejects(readPackingFile(new File(['synthetic compressed input'],'forged.xlsx')),/expands beyond the permitted size/);assert.ok(paused);assert.equal(emitted,26,'stop on first chunk exceeding25MiB, without consuming remaining input');}
 finally{if(original===undefined)delete globalThis.JSZip;else globalThis.JSZip=original;}
});

test('XLSX actual expansion also enforces the aggregate bound across XML entries',async()=>{
 const originalZip=globalThis.JSZip,originalParser=globalThis.DOMParser,chunk=new Uint8Array(1024*1024).fill(65),emitted={strings:0,workbook:0};
 const entry=name=>({_data:{uncompressedSize:1},internalStream(){let paused=false;const handlers={};const stream={on(event,fn){handlers[event]=fn;return stream;},pause(){paused=true;return stream;},resume(){for(let i=0;i<21&&!paused;i++){emitted[name]++;handlers.data(chunk);}if(!paused)handlers.end();return stream;}};return stream;}});
 const files={'xl/sharedStrings.xml':entry('strings'),'xl/workbook.xml':entry('workbook')};
 globalThis.JSZip={loadAsync:async()=>({files,file:path=>files[path]||null})};
 globalThis.DOMParser=class{parseFromString(){return {querySelector:()=>null,getElementsByTagNameNS:()=>[]};}};
 try{await assert.rejects(readPackingFile(new File(['synthetic compressed input'],'aggregate.xlsx')),/expands beyond the permitted size/);assert.deepEqual(emitted,{strings:21,workbook:20});}
 finally{if(originalZip===undefined)delete globalThis.JSZip;else globalThis.JSZip=originalZip;if(originalParser===undefined)delete globalThis.DOMParser;else globalThis.DOMParser=originalParser;}
});
