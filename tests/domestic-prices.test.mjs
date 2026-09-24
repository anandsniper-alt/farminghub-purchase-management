import test from 'node:test';
import assert from 'node:assert/strict';
import {domesticPreviewState} from '../scripts/prepare-domestic-preview.mjs';
import {execute} from '../shared/domain.mjs';
import {previewDomesticPrices,latestDomesticPrices} from '../shared/domestic-prices.mjs';
import {scopedState} from '../server/index.mjs';
import {softwareReference} from '../shared/references.mjs';
const user=s=>s.users.find(u=>u.role==='MANAGER');
const run=(s,type,p,u=user(s))=>execute(s,{type,payload:p},u,{now:'2026-09-24T10:00:00.000Z'}).state;
const setup=()=>{let s=domesticPreviewState();s=run(s,'DOMESTIC_SAVE_VENDOR',{code:'TEST-D1',name:'Test domestic supplier',country:'India',paymentTermsText:'On delivery'});s.files.push({id:'quote-file',scope:'LAE_DOMESTIC',name:'prices.xlsx',orderIds:[]});return s;};
const row=(s,rate='10.25',n=0)=>({'Item code':s.domesticItems[n].code,'Item Description':s.domesticItems[n].description,UOM:s.domesticItems[n].uom,'Rate (before GST)':rate});
const payload=s=>({vendorId:s.vendors.at(-1).id,quoteDate:'2026-09-23',quoteReference:'Q1',reason:'Supplier written quotation',sourceHash:'a'.repeat(64),fileId:'quote-file',rows:[row(s)]});
test('price preview skips blanks, preserves zero and rejects wrong identity, unit, precision and duplicate rows',()=>{
 const s=setup();assert.equal(previewDomesticPrices(s,[row(s,'')])[0].result,'SKIP');assert.equal(previewDomesticPrices(s,[row(s,'0')])[0].rateMinor,0);
 for(const invalid of ['-1','10.001','1e3','=10*2','NaN','9007199254740992'])assert.equal(previewDomesticPrices(s,[row(s,invalid)])[0].result,'REJECTED');
 for(const invalid of [{...row(s),UOM:'Wrong'},{...row(s),'Item code':'UNKNOWN'},{...row(s),'Item Description':'Different item'}])assert.equal(previewDomesticPrices(s,[invalid])[0].result,'REJECTED');
 assert.ok(previewDomesticPrices(s,[row(s),row(s)]).every(r=>r.result==='REJECTED'));
});
test('supplier price imports are atomic, retain evidence and references, reject retries and invalid dates',()=>{
 let s=setup(),p=payload(s),before=structuredClone(s);assert.throws(()=>run(s,'DOMESTIC_IMPORT_PRICES',{...p,rows:[row(s),row(s,'-1',1)]}),/rejected/);assert.deepEqual(s,before);
 s=run(s,'DOMESTIC_IMPORT_PRICES',{...p,rows:[row(s),row(s,'',1),row(s,'0',2)]});const q=s.domesticPriceLists[0];assert.equal(q.lines.length,2);assert.equal(q.lines[0].rateMinor,1025);assert.equal(q.fileId,'quote-file');assert.match(softwareReference(s,'domesticPriceLists',q.id),/^FH-LAE-D-PRC-1$/);
 assert.throws(()=>run(s,'DOMESTIC_IMPORT_PRICES',p),/already been/);
 for(const quoteDate of ['2026-02-30','2026-09-25','invalid'])assert.throws(()=>run(s,'DOMESTIC_IMPORT_PRICES',{...p,quoteDate}),/valid quote date/);
 assert.throws(()=>run(s,'DOMESTIC_IMPORT_PRICES',{...p,sourceHash:'b'.repeat(64),fileId:'missing'}),/Attach/);
 assert.throws(()=>run(s,'DOMESTIC_IMPORT_PRICES',{...p,rows:[row(s,'')]}),/at least one price/);
});
test('quotes compare latest supplier dates and BOM selects a verified immutable price snapshot',()=>{
 let s=setup();s=run(s,'DOMESTIC_IMPORT_PRICES',payload(s));const q=s.domesticPriceLists[0],b=s.domesticBoms.find(b=>b.code==='CS1'),p={bomId:b.id,revision:b.revision,lines:[{itemId:s.domesticItems[0].id,quantity:'2',rate:'10.25',quoteId:q.id}],compositionConfirmed:true,reason:'Selected supplier quotation'};
 assert.throws(()=>run(s,'DOMESTIC_SAVE_BOM',{...p,lines:[{...p.lines[0],rate:'11'}]}),/Selected supplier price/);
 s=run(s,'DOMESTIC_SAVE_BOM',p);s=run(s,'DOMESTIC_IMPORT_PRICES',{...payload(s),quoteReference:'Q2',sourceHash:'b'.repeat(64),rows:[row(s,'12')]});
 assert.equal(latestDomesticPrices(s,s.domesticItems[0].id)[0].rateMinor,1200);assert.equal(s.domesticBoms.find(x=>x.id===b.id).lines[0].rateMinor,1025);assert.equal(s.domesticBoms.find(x=>x.id===b.id).lines[0].priceSource.quoteId,q.id);
 s=run(s,'DOMESTIC_IMPORT_PRICES',{...payload(s),quoteDate:'2026-09-20',quoteReference:'OLD',rows:[row(s,'2')]});assert.equal(latestDomesticPrices(s,s.domesticItems[0].id)[0].rateMinor,1200);
});
test('Domestic-only Manager can add a supplier, Executive can upload, Import-only and Viewer cannot',()=>{
 let s=setup();const manager={...user(s),scopes:['LAE_DOMESTIC']},executive={...manager,role:'EXECUTIVE'};
 s=run(s,'DOMESTIC_SAVE_VENDOR',{code:'TEST-D2',name:'Second supplier',country:'India'},manager);assert.deepEqual(s.vendors.at(-1).scopes,['LAE_DOMESTIC']);
 assert.throws(()=>run(s,'DOMESTIC_SAVE_VENDOR',{code:'TEST-D3',name:'No',country:'India'},executive),/Manager/);
 s=run(s,'DOMESTIC_IMPORT_PRICES',payload(s),executive);assert.equal(s.domesticPriceLists.length,1);
 for(const u of [{...manager,scopes:['LAE_IMPORT']},{...manager,role:'VIEWER'}])assert.throws(()=>run(s,'DOMESTIC_IMPORT_PRICES',payload(s),u),/access/);
 const out=scopedState(s,{...manager,scopes:['LAE_IMPORT']});assert.equal(out.domesticPriceLists.length,0);assert.equal(out.domesticItems.length,0);assert.ok(!Object.values(out.recordReferences.entries).some(r=>r.type==='domesticPriceLists'));
});
test('editing a shared vendor preserves its original Domestic division',()=>{
 let s=setup(),v=s.vendors.at(-1);s=run(s,'SAVE_VENDOR',{...v,productionDays:30,defaultTerms:'30-70',name:'Corrected supplier name'});assert.deepEqual(s.vendors.at(-1).scopes,['LAE_DOMESTIC']);
});
