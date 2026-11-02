import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {validateLaeStockSnapshot,validateLaeStockQuery,queryLaeStock} from '../shared/lae-stock-costing.mjs';
import {buildLaeStockXlsx,buildLaeStockPdf} from '../server/lae-stock-exports.mjs';

const row=(id,quantity=10,more={})=>({id:String(id),sourceSheet:'Synthetic',sourceRow:Number(id),batch:'B-'+id,masterCode:'CC1',brandCode:'DA-CC1',itemName:'Machine',productGroup:'CUTTERS',brand:'Dawn Agro',warehouse:'SASTHA',unit:'pcs',assignedRo:'1232',originalRo:'',priceRo:'5678',quantity,usdUnit:1,originalInrUnit:100,revisedInrUnit:120,interestInrUnit:10,rentInrUnit:5,dutyInrUnit:5,quantityOnly:false,usdApplicable:true,freeApproved:false,rentExcluded:false,...more});
const ready=rows=>validateLaeStockSnapshot({schemaVersion:1,version:'synthetic',stockDate:'2026-09-30',costDate:'2026-10-01',source:{filename:'synthetic.xlsx',sha256:'a'.repeat(64),dataSha256:'b'.repeat(64)},basis:'Synthetic read-only projection',controls:{rows:rows.length,net:rows.reduce((s,r)=>s+r.quantity,0),positive:rows.reduce((s,r)=>s+Math.max(r.quantity,0),0),negative:rows.reduce((s,r)=>s+Math.min(r.quantity,0),0)},rows});
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);

test('dashboard groups full item codes, categories and units without conflating shared masters or unmapped rows',()=>{
 const data=ready([row(1),row(2,20,{itemName:'Machine alternate name'}),row(3,4,{brandCode:'DA-CC10'}),row(4,3,{brandCode:'KD-CC1'}),row(5,2,{unit:'sets'}),row(6,7,{productGroup:'MOTORS'}),row(7,1,{brandCode:''}),row(8,2,{brandCode:''}),row(9,3,{brandCode:'da-cc1'}),row(10,5,{productGroup:''})]),before=structuredClone(data);
 const categories=queryLaeStock(data.rows,{view:'categories'}),items=queryLaeStock(data.rows,{view:'items',productGroup:'CUTTERS',unit:'pcs'});
 assert.equal(categories.rows.length,4);assert.equal(categories.rows.find(r=>r.productGroup==='CUTTERS'&&r.unit==='pcs').itemCount,6);
 assert.equal(items.rows.length,6);const da=items.rows.find(r=>r.brandCode==='DA-CC1');assert.equal(da.netQuantity,30);assert.deepEqual(da.itemNames,['Machine','Machine alternate name']);assert.equal(da.masterCode,'CC1');
 assert.equal(items.rows.filter(r=>r.unmapped).length,2);for(const unmapped of items.rows.filter(r=>r.unmapped)){const drill=queryLaeStock(data.rows,{sourceId:unmapped.sourceId});assert.equal(drill.rows.length,1);assert.equal(drill.summary.netQuantity,unmapped.netQuantity);}
 const exact=queryLaeStock(data.rows,{itemCode:'DA-CC1',productGroup:'CUTTERS',unit:'pcs'});assert.equal(exact.rows.length,2);assert.equal(exact.summary.netQuantity,30);assert.equal(queryLaeStock(data.rows,{itemCode:'DA-CC'}).rows.length,0);
 assert.equal(queryLaeStock(data.rows,{view:'items',categoryMissing:'1'}).rows.length,1);assert.equal(queryLaeStock(data.rows,{categoryMissing:'1'}).summary.netQuantity,5);assert.throws(()=>validateLaeStockQuery({categoryMissing:'yes'}),/missing-category/);
 assert.deepEqual(data,before);assert.equal(validateLaeStockQuery().view,'batches');assert.equal(queryLaeStock(data.rows,{view:'models'}).rows.length,4);
});

test('revised breakup reconciles on the same priced population while original coverage, pending, quantity-only and negatives stay intact',()=>{
 const data=ready([row(1,10),row(2,30,{originalInrUnit:200,revisedInrUnit:230,interestInrUnit:20,rentInrUnit:0,dutyInrUnit:10,rentExcluded:true,usdUnit:2}),row(3,20,{originalInrUnit:50,revisedInrUnit:null,interestInrUnit:null,rentInrUnit:null,dutyInrUnit:null,usdUnit:null,usdApplicable:false}),row(4,8,{originalInrUnit:null,revisedInrUnit:null,interestInrUnit:null}),row(5,4,{quantityOnly:true,originalInrUnit:0,revisedInrUnit:0,interestInrUnit:0,rentInrUnit:0,dutyInrUnit:0}),row(6,-2),row(7,0)]);
 for(const view of ['batches','models','categories','items']){const report=queryLaeStock(data.rows,{view,pageSize:1}),s=report.summary,b=s.breakup;assert.equal(s.netQuantity,70);near(s.originalAverage,8000/60);assert.equal(s.revisedAverage,202.5);assert.equal(s.originalPendingQuantity,8);assert.equal(s.revisedPendingQuantity,28);assert.equal(s.quantityOnlyQuantity,4);assert.equal(b.quantity,40);assert.equal(b.rentExcludedQuantity,30);near(b.originalAverage,175);near(b.interestAverage,17.5);near(b.rentAverage,1.25);near(b.dutyAverage,8.75);near(b.originalAverage+b.interestAverage+b.rentAverage+b.dutyAverage,b.revisedAverage);near(s.originalRate,100);near(s.averageUsd,1.75);if(view!=='batches')assert.deepEqual(report.rows[0].breakup,b);}
 const missing=queryLaeStock(ready([row(1,3,{originalInrUnit:null,revisedInrUnit:null})]).rows).summary.breakup;assert.equal(missing.quantity,0);for(const key of ['originalAverage','interestAverage','rentAverage','dutyAverage','revisedAverage'])assert.equal(missing[key],null);
 const mixed=queryLaeStock([...data.rows,row(8,1,{unit:'sets'})]).summary;assert.equal(mixed.breakup,undefined);assert.equal(mixed.byUnit.length,2);assert.equal(mixed.byUnit.find(r=>r.unit==='sets').breakup.quantity,1);
});

test('categories and items paginate their full grouped populations, retain all-source summaries, and export every selected group',()=>{
 const data=ready(Array.from({length:205},(_,i)=>row(i+1,i+1,{productGroup:'CAT-'+String(i).padStart(3,'0'),brandCode:'CODE-'+i})));
 for(const view of ['categories','items']){const first=queryLaeStock(data.rows,{view,pageSize:200,sort:'netQuantity',direction:'desc'}),last=queryLaeStock(data.rows,{view,pageSize:200,page:2,sort:'revisedValue',direction:'desc'});assert.equal(first.rows.length,200);assert.equal(last.rows.length,5);assert.equal(last.pagination.total,205);assert.equal(first.rows[0].netQuantity,205);assert.equal(last.rows.at(-1).netQuantity,1);assert.equal(first.summary.netQuantity,21115);const all=queryLaeStock(data.rows,{view,pageSize:1},data,{exportAll:true});assert.equal(all.rows.length,205);assert.equal(all.pagination.to,205);}
 assert.throws(()=>queryLaeStock(data.rows,{view:'categories',pageSize:201}),/page/);
});

test('new dashboard XLSX and PDF exports contain aggregate costs and exact item identities',async()=>{
 const data=ready([row(1,10,{brandCode:'DA-CC1'}),row(2,20,{brandCode:'KD-CC1'})]);
 for(const view of ['categories','items']){const report=queryLaeStock(data.rows,{view,pageSize:1},data,{exportAll:true}),xlsx=await buildLaeStockXlsx(report),pdf=await buildLaeStockPdf(report);
  const inspected=spawnSync(process.env.FH_PYTHON||'python3',['-c',"import sys,io,json,openpyxl; w=openpyxl.load_workbook(io.BytesIO(sys.stdin.buffer.read()),data_only=True); s=w.worksheets[0]; print(json.dumps({'title':s.title,'headers':[c.value for c in s[6]],'rows':list(s.iter_rows(min_row=7,values_only=True))}))"],{input:xlsx,encoding:'utf8'});assert.equal(inspected.status,0,inspected.stderr);const sheet=JSON.parse(inspected.stdout),get=(row,label)=>row[sheet.headers.indexOf(label)];assert.equal(sheet.title,view==='items'?'Item costs':'Category costs');assert.equal(sheet.rows.length,view==='items'?2:1);assert.equal(get(sheet.rows[0],'Landing INR per unit'),100);assert.equal(get(sheet.rows[0],'Revised INR per unit'),120);assert.equal(get(sheet.rows[0],'Breakup base INR per unit'),100);assert.equal(get(sheet.rows[0],'Breakup interest INR per unit'),10);assert.equal(get(sheet.rows[0],'Closing stock date'),'2026-09-30');if(view==='items')assert.deepEqual(sheet.rows.map(r=>get(r,'Item code')),['DA-CC1','KD-CC1']);
  const extracted=spawnSync(process.env.FH_PYTHON||'python3',['-c',"import sys,io,pypdf; print(' '.join(p.extract_text() for p in pypdf.PdfReader(io.BytesIO(sys.stdin.buffer.read())).pages))"],{input:pdf,encoding:'utf8'});assert.equal(extracted.status,0,extracted.stderr);assert.match(extracted.stdout,/Landing INR/);assert.match(extracted.stdout,/120\.00/);if(view==='items'){assert.match(extracted.stdout,/DA-CC1/);assert.match(extracted.stdout,/KD-CC1/);}
 }
});
