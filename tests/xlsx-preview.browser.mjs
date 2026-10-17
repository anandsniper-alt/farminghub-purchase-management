// Run through the local browser test harness with the browser's native XML parser.
import {sheetGeometry,renderXlsxSheet} from '/xlsx-preview.mjs';
const parse=s=>new DOMParser().parseFromString(s,'application/xml');
const xml=s=>parse('<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+s+'</worksheet>');
const check=(ok,message)=>{if(!ok)throw Error(message);};
const results=[];
async function run(name,fn){try{await fn();results.push('PASS: '+name);}catch(e){results.push('FAIL: '+name+' - '+e.message);}}
await run('Merged headings, sparse rows and saved dimensions',()=>{
 const g=sheetGeometry(xml('<cols><col min="1" max="1" width="20"/><col min="2" max="3" width="10"/></cols><sheetData><row r="1" ht="40"><c r="A1" t="inlineStr"><is><t>Invoice</t></is></c></row><row r="5"><c r="C5"><v>12</v></c></row></sheetData><mergeCells><mergeCell ref="A1:C1"/></mergeCells>'));
 check(g.rowCount===5&&g.colCount===3,'Sparse positions lost');check(g.x[3]===295,'Column widths lost');check(g.y[1]===40*4/3,'Row height lost');check(g.owners.get('0,2').a.c===0,'Merge coverage missing');
});
await run('Bounded malformed and overlapping ranges; hidden rows and columns',()=>{
 const g=sheetGeometry(xml('<cols><col min="2" max="16384" hidden="1"/></cols><sheetData><row r="2" hidden="1"><c r="C2"><v>1</v></c></row><row r="600"><c r="A600"><v>2</v></c></row></sheetData><mergeCells><mergeCell ref="A1:B1"/><mergeCell ref="B1:C1"/><mergeCell ref="INVALID"/><mergeCell ref="AX499:XFD1048576"/></mergeCells>'));
 check(g.colCount===50&&g.rowCount===500&&g.truncated,'Preview bounds failed');check(g.columns[1].width===0&&g.rows[1].height===0,'Hidden geometry lost');check(g.owners.get('0,1').a.c===0,'Overlap overwrote earlier merge');
});
await run('Rendering preserves merge layout, numeric formatting, and literal unsafe text',async()=>{
 const doc=xml('<sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>&lt;img src=x onerror=alert(1)&gt;</t></is></c></row><row r="2"><c r="A2" s="1"><f>1+1</f><v>1234.5</v></c></row></sheetData><mergeCells><mergeCell ref="A1:C1"/></mergeCells>');
 const styleDoc=parse('<styleSheet><cellXfs><xf/><xf numFmtId="4"/></cellXfs></styleSheet>');
 const {surface}=await renderXlsxSheet({zip:{file:()=>null},read:()=>{throw Error('Unexpected read');},doc,path:'xl/worksheets/sheet1.xml',strings:[],styleDoc});
 check(surface.querySelector('[data-cell="A1"]').getAttribute('aria-colspan')==='3','Missing merged span');check(!surface.querySelector('img'),'Active markup was injected');check(surface.textContent.includes('<img src=x onerror=alert(1)>'),'Text escaped incorrectly');check(surface.textContent.includes('1,234.50'),'Cached formula value not formatted');
});
await run('External embedded-image relationships are never loaded',async()=>{
 const doc=xml('<sheetData><row r="1"><c r="A1"><v>1</v></c></row></sheetData><drawing xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="r1"/>');
 let reads=0;await renderXlsxSheet({zip:{file:()=>true},read:async()=>{reads++;return parse('<Relationships><Relationship Id="r1" TargetMode="External" Target="https://example.com/drawing.xml"/></Relationships>');},doc,path:'xl/worksheets/sheet1.xml',strings:[]});check(reads===1,'External drawing fetched');
});
document.getElementById('results').textContent=results.join('\n');
