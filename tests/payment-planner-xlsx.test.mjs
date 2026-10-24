import test from 'node:test';
import assert from 'node:assert/strict';
import '../web/jszip.min.js';
import {paymentPlanXlsx} from '../web/payment-planner-xlsx.mjs';

const fixture=()=>({title:'3-month forecast',period:'November 2026–January 2027',currency:'USD',source:'Local copied workspace',asOf:'2026-10-24',revision:1970,suppliers:[{id:'a',name:'Supplier & Co',code:'甲',totals:{amountMinor:1101,estimatedInrMinor:null}},{id:'b',name:'=HYPERLINK("https://bad.example")',code:'B',totals:{amountMinor:0,estimatedInrMinor:0}}],buckets:[{label:'November 2026',rate:96000000,cells:[{supplierId:'a',amountMinor:1001,estimatedInrMinor:96096},{supplierId:'b',amountMinor:0,estimatedInrMinor:0}],totals:{amountMinor:1001,estimatedInrMinor:96096}},{label:'December 2026',rate:null,cells:[{supplierId:'a',amountMinor:100,estimatedInrMinor:null},{supplierId:'b',amountMinor:0,estimatedInrMinor:0}],totals:{amountMinor:100,estimatedInrMinor:null}},{label:'January 2027',rate:null,cells:[{supplierId:'a',amountMinor:0,estimatedInrMinor:0},{supplierId:'b',amountMinor:0,estimatedInrMinor:0}],totals:{amountMinor:0,estimatedInrMinor:0}}],totals:{amountMinor:1101,estimatedInrMinor:null},notes:['Undated payments are excluded.','Blocked payments are already included.']});
async function unpack(model){const bytes=await paymentPlanXlsx(model);assert.ok(bytes instanceof Uint8Array);assert.equal(new TextDecoder().decode(bytes.slice(0,2)),'PK');const zip=await globalThis.JSZip.loadAsync(bytes);return {zip,sheet:await zip.file('xl/worksheets/sheet1.xml').async('string'),notes:await zip.file('xl/worksheets/sheet2.xml').async('string')};}
function cell(sheet,ref){return sheet.match(new RegExp(`<c r="${ref}"[^>]*>[\\s\\S]*?<\\/c>`))?.[0];}

test('XLSX is a genuine OOXML workbook with paired supplier currencies, exact values and snapshot qualifications',async()=>{
 const model=fixture(),before=JSON.stringify(model),{zip,sheet,notes}=await unpack(model);
 assert.equal(JSON.stringify(model),before);assert.ok(zip.file('[Content_Types].xml'));assert.ok(zip.file('xl/styles.xml'));
 assert.match(sheet,/mergeCell ref="B7:C7"/);assert.match(sheet,/mergeCell ref="D7:E7"/);assert.match(sheet,/xSplit="1" ySplit="8" topLeftCell="B9"/);
 assert.match(cell(sheet,'B8'),/>USD</);assert.match(cell(sheet,'C8'),/>Estimated INR</);assert.match(cell(sheet,'B9'),/<v>10\.01<\/v>/);assert.match(cell(sheet,'C9'),/<v>960\.96<\/v>/);assert.match(cell(sheet,'C10'),/>Pending</);assert.match(cell(sheet,'C11'),/<v>0\.00<\/v>/);assert.match(cell(sheet,'B12'),/<v>11\.01<\/v>/);assert.match(cell(sheet,'G12'),/>Pending</);
 assert.match(sheet,/Supplier &amp; Co \(甲\)/);assert.match(notes,/96\.000000/);assert.match(notes,/Undated payments are excluded/);assert.match(notes,/Blocked payments are already included/);assert.match(notes,/Local copied workspace/);assert.match(notes,/1970/);
 assert.match(cell(sheet,'D7'),/t="inlineStr"/);assert.match(cell(sheet,'D7'),/=HYPERLINK/);assert.doesNotMatch(sheet,/<f[ >]/);
});

test('CNY and INR export native values without invented USD conversion',async()=>{
 for(const currency of ['CNY','INR']){const model=fixture();model.currency=currency;const {sheet,notes}=await unpack(model);assert.match(cell(sheet,'B8'),new RegExp('>'+currency+'<'));assert.doesNotMatch(sheet,/Estimated INR/);assert.doesNotMatch(notes,/Exchange rates/);assert.match(cell(sheet,'D12'),/<v>11\.01<\/v>/);assert.doesNotMatch(sheet,/mergeCell ref="B7:C7"/);}
});

test('Excel precision boundary exports exact decimal text rather than rounding financial values',async()=>{
 const model=fixture();model.buckets[0].cells[0].amountMinor=9007199254740991;model.buckets[0].cells[0].estimatedInrMinor='123456789012345678901';
 const {sheet,notes}=await unpack(model);assert.match(cell(sheet,'B9'),/t="inlineStr"/);assert.match(cell(sheet,'B9'),/>90071992547409\.91</);assert.match(cell(sheet,'C9'),/>1234567890123456789\.01</);assert.match(notes,/exact decimal text/);
 model.buckets[0].cells[0].amountMinor=999999999999999;const safe=await unpack(model);assert.match(cell(safe.sheet,'B9'),/<v>9999999999999\.99<\/v>/);
 model.buckets[0].cells[0].amountMinor=9007199254740992;await assert.rejects(paymentPlanXlsx(model),/exact integer/);
});

test('Negative amounts, zero, whitespace and XML-reserved labels remain literal snapshot values',async()=>{
 const model=fixture();model.suppliers[0].name=' +SUM(A1:A2)<x>\u0001';model.buckets[0].cells[0].amountMinor=-19;const {sheet}=await unpack(model);assert.match(cell(sheet,'B9'),/<v>-0\.19<\/v>/);assert.match(sheet,/ \+SUM\(A1:A2\)&lt;x&gt;/);assert.doesNotMatch(sheet,/\u0001/);assert.doesNotMatch(sheet,/<f[ >]/);
});

test('Incomplete cells, duplicate suppliers, unsupported currencies and missing totals fail clearly',async()=>{
 let model=fixture();model.buckets[0].cells.pop();await assert.rejects(paymentPlanXlsx(model),/missing a supplier cell/);
 model=fixture();model.suppliers[1].id='a';await assert.rejects(paymentPlanXlsx(model),/duplicate suppliers/);
 model=fixture();model.currency='EUR';await assert.rejects(paymentPlanXlsx(model),/incomplete/);
 model=fixture();delete model.suppliers[0].totals;await assert.rejects(paymentPlanXlsx(model),/missing supplier totals/);
 model=fixture();model.buckets[0].cells.push(model.buckets[0].cells[0]);await assert.rejects(paymentPlanXlsx(model),/inconsistent supplier cells/);
});

test('Weekly labels and long supplier names receive room for wrapping',async()=>{
 const model=fixture();model.buckets[0].label='Week 2 | 2026-11-08 to 2026-11-14';model.suppliers[0].name='A long supplier legal name '.repeat(10);
 const {sheet}=await unpack(model);assert.ok(Number(sheet.match(/<row r="9" ht="(\d+)"/)[1])>=40);assert.ok(Number(sheet.match(/<row r="7" ht="(\d+)"/)[1])>=100);
});

test('Excel dates match planner labels in the table and rate assumptions',async()=>{
 const model=fixture();model.period='2026-10, 2026-12';
 Object.assign(model.buckets[0],{week:1,startDate:'2026-10-01',endDate:'2026-10-07'});
 Object.assign(model.buckets[1],{week:4,startDate:'2028-02-22',endDate:'2028-02-29'});
 const {sheet,notes}=await unpack(model);
 assert.match(cell(sheet,'A9'),/Week 1\n01 Oct 2026 – 07 Oct 2026/);
 assert.match(cell(sheet,'A10'),/22 Feb 2028 – 29 Feb 2028/);
 assert.match(cell(sheet,'A2'),/October 2026, December 2026/);
 assert.match(cell(sheet,'A4'),/As of: 24 Oct 2026/);
 assert.match(notes,/Week 1\n01 Oct 2026 – 07 Oct 2026/);
 assert.ok(Number(sheet.match(/<row r="9" ht="(\d+)"/)[1])>=42);
 assert.ok(Number(notes.match(/<row r="10" ht="(\d+)"/)[1])>=42);
 assert.match(cell(sheet,'B9'),/<v>10\.01<\/v>/);
});
