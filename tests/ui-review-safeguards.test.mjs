import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createPreviewZipReader,previewSizeAllowed,verifyPreviewImage} from '../web/file-preview.mjs';
import {poFxReviewAdvisory,amendmentImpact,specificationReviewDiff} from '../web/approval-review.mjs';
import {createCiPaymentsUI} from '../web/ci-payments.mjs';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const source=readFileSync(new URL('../web/jszip.min.js',import.meta.url),'utf8');
const sandbox={module:{exports:{}},exports:{},require:()=>{throw Error('Unexpected dependency');},setImmediate,setTimeout,clearTimeout,Uint8Array,ArrayBuffer,Buffer};
vm.runInNewContext(source,sandbox);const JSZip=sandbox.module.exports;

test('preview decompression counts actual ZIP expansion with forged size metadata',async()=>{
 const zip=new JSZip();zip.file('xl/workbook.xml','x'.repeat(256*1024));
 const data=await zip.generateAsync({type:'uint8array',compression:'DEFLATE'}),loaded=await JSZip.loadAsync(data);
 // A malicious ZIP may claim a small inflated size. The streamed reader must stop anyway.
 loaded.file('xl/workbook.xml')._data.uncompressedSize=1;
 const read=createPreviewZipReader(loaded,{entryLimit:64*1024,totalLimit:1024*1024});
 await assert.rejects(read('xl/workbook.xml'),/expands beyond/);
});

test('preview expansion budget covers XML and images, caches repeated reads, and rejects external paths',async()=>{
 const zip=new JSZip();zip.file('xl/workbook.xml','a'.repeat(40));zip.file('xl/media/image.png',new Uint8Array(40));
 const loaded=await JSZip.loadAsync(await zip.generateAsync({type:'uint8array'}));
 const read=createPreviewZipReader(loaded,{entryLimit:100,totalLimit:60});
 assert.equal((await read('xl/workbook.xml')).length,40);assert.equal((await read('xl/workbook.xml')).length,40);
 await assert.rejects(read('xl/media/image.png'),/expands beyond/);
 for(const path of ['../private','https://example.test/image.png','/xl/workbook.xml','xl/../private'])await assert.rejects(read(path),/Unsupported/);
 assert.equal(previewSizeAllowed(11*1024*1024,'xlsx'),false);assert.equal(previewSizeAllowed(26*1024*1024,'pdf'),false);assert.equal(previewSizeAllowed(1024,'image'),true);
});

test('raster preview validates intrinsic PNG, GIF, JPEG and WebP dimensions before browser decode',()=>{
 const png=(w,h)=>{const b=new Uint8Array(33),v=new DataView(b.buffer);b.set([137,80,78,71,13,10,26,10]);v.setUint32(8,13);b.set([73,72,68,82],12);v.setUint32(16,w);v.setUint32(20,h);return b;};
 const gif=(w,h)=>{const b=new Uint8Array(14),v=new DataView(b.buffer);b.set(new TextEncoder().encode('GIF89a'));v.setUint16(6,w,true);v.setUint16(8,h,true);b[13]=59;return b;};
 const jpeg=(w,h)=>{const b=new Uint8Array([255,216,255,192,0,8,8,0,0,0,0,0]),v=new DataView(b.buffer);v.setUint16(7,h);v.setUint16(9,w);return b;};
 const webp=(w,h)=>{const b=new Uint8Array(30),v=new DataView(b.buffer);b.set(new TextEncoder().encode('RIFF'),0);v.setUint32(4,22,true);b.set(new TextEncoder().encode('WEBPVP8X'),8);v.setUint32(16,10,true);for(let i=0;i<3;i++){b[24+i]=((w-1)>>(i*8))&255;b[27+i]=((h-1)>>(i*8))&255;}return b;};
 for(const factory of [png,gif,jpeg,webp]){assert.deepEqual(verifyPreviewImage(factory(640,480)),{width:640,height:480});assert.throws(()=>verifyPreviewImage(factory(8000,8000)),/dimensions exceed/);assert.throws(()=>verifyPreviewImage(factory(8193,1)),/dimensions exceed/);}
 assert.throws(()=>verifyPreviewImage(new Uint8Array([1,2,3])),/could not be verified/);
});

test('manual USD/CNY advisory preserves rate and distinguishes historical DIRECT direction',()=>{
 const fx={quote:'USD_CNY',from:'CNY',to:'USD',rate:150000,date:'2026-10-17'},before=structuredClone(fx);
 assert.match(poFxReviewAdvisory(fx),/1 USD = 0.15 CNY/);assert.match(poFxReviewAdvisory(fx),/does not prevent saving/);assert.deepEqual(fx,before);
 assert.equal(poFxReviewAdvisory({...fx,rate:6780000}),'');assert.equal(poFxReviewAdvisory({...fx,quote:'DIRECT'}),'');
 assert.match(poFxReviewAdvisory({...fx,rate:678000000}),/678 CNY/);
});

test('specification approval compares added, removed and changed fields with safe labels and text',()=>{
 const current={description:'old',fieldValues:{engine:'170F',removed:'yes',same:'0'}},proposed={description:'<script>new</script>',fieldValues:{engine:'177F',added:'<img src=x>',same:'0'}},before=structuredClone({current,proposed});
 const html=specificationReviewDiff(current,proposed,esc,[{key:'engine',label:'Engine model'}]);
 assert.match(html,/Engine model/);assert.match(html,/170F/);assert.match(html,/177F/);assert.match(html,/removed/);assert.match(html,/Not recorded/);assert.match(html,/&lt;img src=x&gt;/);assert.doesNotMatch(html,/<script>|<img|<th>same<\/th>/);assert.deepEqual({current,proposed},before);
 assert.match(specificationReviewDiff(null,proposed,esc),/No earlier approved specification/);
});

test('amendment review explains actual confirmation, PI and unshipped QC resets without mutating records',()=>{
 const o={pi:{status:'APPROVED'},shipments:[{status:'PLANNED'},{status:'PLANNED',actualDeparture:'2026-10-17'},{status:'CANCELLED'}]},before=structuredClone(o),impact=amendmentImpact(o).join(' ');
 assert.match(impact,/acknowledgement and technical confirmation will be cleared/);assert.match(impact,/REVERIFY/);assert.match(impact,/1 unshipped shipment/);assert.match(impact,/recorded payments remain/);assert.deepEqual(o,before);
});

test('supplemental CI evidence never supplies a replacement settlement payload',()=>{
 const o={ciPaymentPolicy:{version:1},commercialInvoices:[{id:'existing',number:'INV-123',shipmentId:'shipment',status:'APPROVED',date:'2026-10-15'}]},before=structuredClone(o);
 const ui=createCiPaymentsUI({context:()=>({state:{payments:[]}})}),fields={invoiceNumber:' inv - 123 ',shipmentId:'shipment',invoiceDate:'2026-10-15',ciAmount:'9999',ciSettlementEnabled:'on'};
 assert.equal(ui.existingUploadInvoice(o,fields).id,'existing');assert.equal(ui.uploadPayload(o,fields),undefined);assert.deepEqual(o,before);
 assert.equal(ui.existingUploadInvoice(o,{...fields,shipmentId:'other'}),undefined);
});
