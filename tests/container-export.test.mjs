import test from 'node:test';
import assert from 'node:assert/strict';
import {loadingSnapshot,loadingFilename,loadingPdf} from '../web/container-export.mjs';
import {solvePacking,PACKING_PRESETS} from '../shared/container-packing.mjs';
test('JSON snapshot retains positions, pending values and references without changing the draft',()=>{
 const draft={reference:'PO/0001',groupKey:'shipment-1'},result={rows:[{code:'0007',weight:null}],boxes:[{x:12,y:34,z:56,sequence:1}],remainingUnits:35};
 const before=structuredClone({draft,result}),snapshot=loadingSnapshot(draft,result,'2026-10-14T12:00:00Z');
 assert.deepEqual(JSON.parse(JSON.stringify(snapshot)).boxes,result.boxes);assert.equal(snapshot.rows[0].weight,null);assert.equal(snapshot.remainingUnits,35);assert.equal(snapshot.plan,'PO/0001');
 snapshot.boxes[0].x=99;assert.deepEqual({draft,result},before);assert.throws(()=>loadingSnapshot(draft,null),/Calculate/);
 assert.equal(loadingFilename(draft.reference,'pdf'),'Loading-layout-PO-0001.pdf');assert.equal(loadingFilename(draft.reference,'json'),'Loading-layout-PO-0001.json');
});
const fixture=()=>loadingSnapshot({reference:'00031',shipmentNames:{ship:'SHP-1'}},solvePacking(PACKING_PRESETS[2],[{id:'line',shipmentId:'ship',code:'0007',name:'Test product',po:'PO-001',quantity:260,unitsPerPackage:1,length:780,width:460,height:660,weight:80,rotation:'FIXED',maxLayers:3,topLoad:160}]),'2026-10-14T12:00:00Z');
function checkOffsets(pdf){const text=pdf.toString('latin1'),offset=Number(text.match(/startxref\n(\d+)/)[1]);assert.equal(pdf.subarray(offset,offset+4).toString(),'xref');const count=Number(text.slice(offset).split('\n')[1].split(' ')[1]);text.slice(offset).split('\n').slice(3,count+2).forEach((entry,i)=>{assert.ok(pdf.subarray(Number(entry.slice(0,10))).toString('latin1').startsWith((i+1)+' 0 obj'));});}
test('PDF uses selectable text and vector package faces, preserves inputs and fits one item on one page',async()=>{
 const report=fixture(),before=structuredClone(report),pdf=Buffer.from(await loadingPdf(report)),text=pdf.toString('latin1');checkOffsets(pdf);
 assert.match(text,/\/BaseFont \/Helvetica/);assert.match(text,/\(3D loading plan\) Tj/);assert.match(text,/\(0007\) Tj/);assert.match(text,/\/Count 1\b/);assert.ok(!text.includes('/DCTDecode'));assert.match(text,/ h B Q/);assert.deepEqual(report,before);
});
test('PDF paginates long item lists with complete text, warnings and valid references',async()=>{
 const report=fixture();report.rows=Array.from({length:20},(_,i)=>({...report.rows[0],code:'PRODUCT-'+i,name:'Long description '.repeat(30)}));report.unknownWeight=2;report.rows[0].topLoad=null;
 const pdf=Buffer.from(await loadingPdf(report)),text=pdf.toString('latin1');checkOffsets(pdf);assert.ok(Number(text.match(/\/Count (\d+)/)[1])>2);assert.match(text,/\(PRODUCT-19\) Tj/);assert.match(text,/Payload is not verified/);assert.match(text,/Stack strength pending/);await assert.rejects(()=>loadingPdf(null),/Calculate/);
});
