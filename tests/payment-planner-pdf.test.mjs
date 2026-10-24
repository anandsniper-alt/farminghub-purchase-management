import test from 'node:test';
import assert from 'node:assert/strict';
import {paymentPlanPdf} from '../web/payment-planner-pdf.mjs';

function model({suppliers=2,rows=3,currency='USD'}={}){
 const vendorList=Array.from({length:suppliers},(_,i)=>({id:'s'+i,name:'Supplier '+(i+1),code:'V'+i}));
 const buckets=Array.from({length:rows},(_,i)=>({label:'Month '+(i+1),rate:'96000000',cells:vendorList.map(s=>({supplierId:s.id,amountMinor:'12345',estimatedInrMinor:'1185120'})),totals:{amountMinor:String(12345*suppliers),estimatedInrMinor:String(1185120*suppliers)}}));
 return {title:'Three-month supplier forecast',period:'2026-11 to 2027-01',currency,source:'Live data copy - demo only',asOf:'2026-10-24',revision:1970,suppliers:vendorList,buckets,totals:{amountMinor:String(12345*suppliers*rows),estimatedInrMinor:String(1185120*suppliers*rows)},notes:['Undated amounts are excluded and require review.']};
}
const read=value=>new TextDecoder().decode(paymentPlanPdf(value));

test('PDF preserves supplier/date orientation, dual currencies, exact money, assumptions and landscape media',()=>{
 const result=read(model());
 assert.match(result,/^%PDF-1.4/);assert.match(result,/MediaBox \[0 0 841.89 595.28\]/);
 for(const text of ['Supplier 1 / V0','Supplier 2 / V1','Month 1','Month 3','USD','Estimated INR','123.45','11,851.20','Period total','740.70','71,107.20','November 2026 to January 2027','Revision: 1970','Live data copy - demo only','Undated amounts are excluded','Page 1 of 1'])assert.ok(result.includes(text),text);
 assert.match(result,/\/Count 1 /);
 const offset=Number(result.match(/startxref\n(\d+)/)[1]);assert.equal(result.slice(offset,offset+4),'xref');
});

test('PDF keeps every supplier side by side and totals only once',()=>{
 for(const suppliers of [4,5,20]){
  const result=read(model({suppliers}));assert.match(result,/\/Count 1 /);
  for(let i=1;i<=suppliers;i++)assert.ok(result.includes('Supplier '+i+' / V'+(i-1)));
  assert.ok(!result.includes('Supplier group'));
  assert.equal(result.match(/\(Period total\)/g).length,1);
  const width=Number(result.match(/MediaBox \[0 0 ([\d.]+)/)[1]);assert.ok(width>=1190.55);
 }
});

test('Vertical continuation repeats every supplier header without splitting columns',()=>{
 const result=read(model({suppliers:5,rows:52}));
 const streams=[...result.matchAll(/stream\n([\s\S]*?)\nendstream/g)].map(m=>m[1]).filter(s=>s.includes('(Period)'));
 assert.ok(streams.length>1);
 for(const stream of streams)for(let i=1;i<=5;i++)assert.ok(stream.includes('Supplier '+i+' / V'+(i-1)));
 assert.equal(result.match(/\(Period total\)/g).length,1);
});

test('PDF paginates rows, repeats column headers, and wraps long supplier names',()=>{
 const input=model({rows:52});input.suppliers[0].name='CHONGQING SENCI WUGU AGRICULTURAL MACHINERY IMPORT AND EXPORT COMPANY LIMITED';
 const result=read(input),count=Number(result.match(/\/Count (\d+) /)[1]);assert.ok(count>=4);
 assert.ok(result.includes('Month 52'));const text=[...result.matchAll(/\(([^()]*)\) Tj/g)].map(m=>m[1]).join(' ');assert.ok(text.includes(input.suppliers[0].name));
 assert.ok(result.match(/\(All selected suppliers\)/g).length>=count-1); // A separate notes page has no table.
 assert.ok(result.includes('Page '+count+' of '+count));
});

test('PDF pending estimates stay pending and monetary values beyond Number safe precision remain exact',()=>{
 const input=model({suppliers:1,rows:1});input.buckets[0].rate=null;
 input.buckets[0].cells[0].amountMinor='9007199254740993123';input.buckets[0].cells[0].estimatedInrMinor=null;
 input.buckets[0].totals={amountMinor:'9007199254740993123',estimatedInrMinor:null};input.totals={...input.buckets[0].totals};
 const result=read(input);assert.ok(result.includes('90,071,992,547,409,931.23'));assert.ok(result.includes('INR / USD: Pending'));assert.ok(result.includes('(Pending)'));
});

test('native INR and CNY PDFs use only their own currency with all suppliers together',()=>{
 for(const currency of ['INR','CNY']){
  const result=read(model({currency,suppliers:3}));assert.match(result,/\/Count 1 /);assert.ok(result.includes('('+currency+')'));
  assert.ok(!result.includes('Estimated INR'));assert.ok(!result.includes('INR / USD'));
 }
});

test('PDF multilingual names use canvas fallback without silently replacing source glyphs',()=>{
 const prior=globalThis.document,seen=[];
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({measureText:s=>({width:s.length*25}),fillRect(){},fillText(s){seen.push(s);}}),toDataURL:()=> 'data:image/jpeg;base64,/9j/2Q=='})};
 try{const input=model({suppliers:1,rows:1});input.suppliers[0].name='湖南供应商';const result=read(input);assert.ok(seen.includes('湖南供应商 / V0'));assert.ok(result.includes('/Subtype /Image'));assert.ok(result.includes('/Im0'));}
 finally{if(prior===undefined)delete globalThis.document;else globalThis.document=prior;}
});

test('empty plan produces an explicit zero total and malformed model is rejected',()=>{
 const result=read(model({suppliers:0,rows:0}));assert.ok(result.includes('(0.00)'));assert.ok(result.includes('All selected suppliers'));
 assert.throws(()=>paymentPlanPdf(null),/complete payment plan/);
 const incomplete=model();incomplete.buckets[0].cells.pop();assert.throws(()=>paymentPlanPdf(incomplete),/missing or duplicate/);
});

test('weekly date ranges wrap inside the period column without hiding either boundary',()=>{
 const input=model();input.buckets[0].label='Week 2 | 2026-11-08 to 2026-11-14';const result=read(input);
 assert.ok(result.includes('(Week 2 | 2026-11-08 to)')||result.includes('(Week 2 | 2026-11-08)'));assert.ok(result.includes('2026-11-14'));
});


test('PDF dates match planner and Excel labels, including leap days and selected months',()=>{
 const input=model();input.period='2026-10, 2026-12';
 Object.assign(input.buckets[0],{week:1,startDate:'2026-10-01',endDate:'2026-10-07'});
 Object.assign(input.buckets[1],{week:4,startDate:'2028-02-22',endDate:'2028-02-29'});
 const result=read(input),text=[...result.matchAll(/\(([^()]*)\) Tj/g)].map(m=>m[1]).join(' ');
 for(const label of ['October 2026, December 2026','As of: 24 Oct 2026','Week 1 | 01 Oct 2026 - 07 Oct 2026','Week 4 | 22 Feb 2028 - 29 Feb 2028','740.70','71,107.20'])assert.ok(text.includes(label),label);
 assert.ok(!text.includes('2026-10-01'));
});
