import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {projectLandingPriceRows,queryLandingPrices,summarizeLandingPrices,validateLandingPriceQuery} from '../shared/landing-prices.mjs';
import {validateRoRecord,calculateRoCosting} from '../shared/ro-costing.mjs';
import {Store} from '../server/store.mjs';
import {RoCostingStore} from '../server/ro-costing-store.mjs';
import {emptyState,makeServer} from '../server/index.mjs';

const side=rate=>({rate,goodsUsd:100,totalInr:100*rate,basis:'Synthetic worksheet',rows:[]});
const item=(id='a',quantity=2,usd=10)=>({id,supplier:'Supplier A',invoice:'CI-1',itemCode:'GJ-PW8',masterCode:'PW8',masterCodeRaw:'PW-8',description:'Synthetic water pump',model:'500P',productGroup:'WATER PUMP',quantity,unit:'PCS',currency:'USD',unitPrice:usd,usdUnitPrice:usd,status:'Verified reference',source:{file:'synthetic.xlsx',sheet:'Purchases',row:'2',sha256:'a'.repeat(64)},flags:[]});
const record=(ro='RO-100-A')=>({ro,supplier:'Supplier A',inwardDate:'2026-09-14',invoices:[{supplier:'Supplier A',invoice:'CI-1',currency:'USD',goods:100,extras:0,face:100}],actuals:{},worksheetComparison:{version:1,status:'Historical reference',basis:'Synthetic worksheet',reviewedOn:'2026-10-09',source:'Synthetic',selectedWorkingIds:['chosen'],ai:side(110),suresh:side(90),workings:[{id:'chosen',invoice:'CI-1',supplier:'Supplier A',status:'Historical reference',source:{file:'synthetic.xlsx'},ai:side(120),suresh:side(90)}]},purchaseItems:{version:1,rows:[item()]}});
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);

test('projection preserves identities, source metadata and selected AI rates without changing actuals',()=>{
 const input=record(),before=JSON.stringify(input),actual=calculateRoCosting(input);
 input.purchaseItems.rows[0].workingId='chosen';input.purchaseItems.rows[0].inwardDate='2026-09-18';input.purchaseItems.rows[0].brand='TITAN';
 const master={items:[{scope:'LAE_IMPORT',code:'GJ-PW8',brand:'Gaja',baseItemCode:'PW8'}]};
 const row=projectLandingPriceRows(input,master)[0];
 assert.equal(row.ro,'RO-100-A');assert.equal(row.brandCode,'GJ-PW8');assert.equal(row.masterCodeRaw,'PW-8');assert.equal(row.invoice,'CI-1');assert.equal(row.aiInrPerUsd,120);assert.equal(row.inrUnitBeforeGst,1200);assert.equal(row.brand,'TITAN');assert.equal(row.inwardDate,'2026-09-18');assert.equal(row.roInwardDate,'2026-09-14');assert.equal(row.inwardDateBasis,'Purchase source row');assert.deepEqual(row.source,input.purchaseItems.rows[0].source);assert.deepEqual(calculateRoCosting(input),actual);
 const old=JSON.parse(before),clean=validateRoRecord(old).purchaseItems.rows[0];assert.equal(Object.hasOwn(clean,'brand'),false);assert.equal(Object.hasOwn(clean,'inwardDate'),false);
 input.purchaseItems.rows[0].brand='';assert.equal(projectLandingPriceRows(input,master)[0].brand,'');
 input.purchaseItems.rows[0].inwardDate='2026-02-31';assert.throws(()=>validateRoRecord(input),/valid YYYY/);
});

test('exact unique master mappings never erase variants or infer a brand from a prefix',()=>{
 const input=record(),master={items:[{scope:'LAE_IMPORT',code:'GJ-PW8',brand:'Gaja',baseItemCode:'PW8'}]};
 let row=projectLandingPriceRows(input,master)[0];assert.equal(row.brand,'Gaja');assert.equal(row.brandBasis,'Exact ERP item master');
 input.purchaseItems.rows[0].itemCode='GJ-PW-8';row=projectLandingPriceRows(input,master)[0];assert.equal(row.brand,'');assert.equal(row.brandCode,'GJ-PW-8');
 input.purchaseItems.rows[0].itemCode='GJ-PW8';master.items.push({...master.items[0],brand:'Other'});assert.equal(projectLandingPriceRows(input,master)[0].brand,'');
});

test('weighted prices and effective rate use paired quantities, never an average of rates',()=>{
 const input=record();input.purchaseItems.rows=[item('a',2,10),{...item('b',1,30),workingId:'chosen'},item('missing-price',5,null),{...item('zero',0,40)}];
 const rows=projectLandingPriceRows(input),summary=summarizeLandingPrices(rows);
 assert.equal(summary.totalQuantity,8);assert.equal(summary.pairedQuantity,3);assert.equal(summary.pendingQuantity,5);assert.equal(summary.totalUsd,50);assert.equal(summary.totalInr,5800);close(summary.avgUsd,50/3);close(summary.avgInr,5800/3);assert.equal(summary.effectiveInrPerUsd,116);close(summary.avgUsd*summary.effectiveInrPerUsd,summary.avgInr);assert.equal(summary.excludedNonPositiveRows,1);
 const pending=record('RO-PENDING');pending.worksheetComparison.status='Partial reference';pending.purchaseItems.rows=[item('usd-only',4,5),item('unknown-qty',null,15)];
 const all=summarizeLandingPrices([...rows,...projectLandingPriceRows(pending)]);assert.equal(all.usdPricedQuantity,7);assert.equal(all.pairedQuantity,3);assert.equal(all.pendingQuantity,9);assert.equal(all.totalUsd,70);assert.equal(all.pairedUsd,50);assert.equal(all.usdPricedAvg,10);assert.equal(all.effectiveInrPerUsd,116);assert.equal(all.unquantifiedRows,1);
});

test('USD prices without an AI rate remain pending, even when Suresh has a rate',()=>{
 const input=record();input.worksheetComparison.ai.rate=null;input.worksheetComparison.workings[0].ai.rate=null;
 const row=projectLandingPriceRows(input)[0],summary=summarizeLandingPrices([row]);assert.equal(row.aiInrPerUsd,null);assert.equal(row.inrUnitBeforeGst,null);assert.equal(row.status,'Pending');assert.equal(summary.totalInr,null);assert.equal(summary.avgInr,null);assert.equal(summary.avgUsd,null);assert.equal(summary.usdPricedAvg,10);assert.equal(summary.pairedQuantity,0);
 const empty=summarizeLandingPrices([]);assert.equal(empty.avgInr,null);assert.equal(empty.totalUsd,null);assert.equal(empty.effectiveInrPerUsd,null);
});

test('mixed quantity units have separate weighted averages and a matching INR/USD denominator',()=>{
 const input=record();input.purchaseItems.rows=[item('a',2,10),{...item('b',3,40),unit:'SETS'},item('c',null,10)];
 const rows=projectLandingPriceRows(input),summary=summarizeLandingPrices(rows);assert.equal(summary.mixedUnits,true);assert.equal(summary.totalQuantity,null);assert.equal(summary.avgInr,null);assert.equal(summary.avgUsd,null);assert.equal(summary.totalUsd,140);assert.equal(summary.totalInr,15400);assert.equal(summary.effectiveInrPerUsd,110);assert.deepEqual(summary.byUnit.map(r=>[r.totalUnit,r.totalQuantity,r.avgUsd]),[['pcs',2,10],['sets',3,40]]);
 const pcs=queryLandingPrices(rows,{unit:'pcs'});assert.equal(pcs.summary.mixedUnits,false);assert.equal(pcs.summary.totalQuantity,2);assert.equal(pcs.rows.length,2);assert.deepEqual(pcs.facets.units,['pcs','sets']);
});

test('all filtered rows contribute to totals before bounded pages and missing-last numeric sorting',()=>{
 const input=record();input.purchaseItems.rows=Array.from({length:123},(_,i)=>item('line-'+i,1,i+1));const rows=projectLandingPriceRows(input);
 rows.push({...rows[0],id:'unknown',inwardDate:'',usdUnit:null,inrUnitBeforeGst:null,usdLineTotal:null,inrLineTotal:null,status:'Pending'});
 const page=queryLandingPrices(rows,{q:'water',year:'2026',month:'09',supplier:'Supplier A',product:'WATER PUMP',masterCode:'PW8',page:2,pageSize:50,sort:'usdUnit',direction:'desc'});
 assert.equal(page.pagination.total,123);assert.equal(page.rows.length,50);assert.equal(page.rows[0].usdUnit,73);assert.equal(page.summary.totalQuantity,123);assert.equal(page.summary.totalUsd,123*124/2);assert.equal(page.summary.avgUsd,62);
 const pending=queryLandingPrices(rows,{year:'__missing__'});assert.equal(pending.rows.length,1);assert.equal(pending.rows[0].id,'unknown');
 for(const direction of ['asc','desc'])assert.equal(queryLandingPrices(rows,{sort:'usdUnit',direction,pageSize:100,page:2}).rows.at(-1).id,'unknown');
 assert.equal(queryLandingPrices(rows,{q:'CI-1'}).pagination.total,124);assert.equal(queryLandingPrices(rows,{q:'NO SUCH ROW'}).summary.totalInr,null);
 const exported=queryLandingPrices(rows,{year:'2026',page:3,pageSize:5,sort:'usdUnit',direction:'asc'},{},{exportAll:true});assert.equal(exported.rows.length,123);assert.equal(exported.rows[0].usdUnit,1);assert.equal(exported.rows.at(-1).usdUnit,123);assert.equal(exported.summary.totalUsd,page.summary.totalUsd);
 const tooMany=Array.from({length:25001},(_,i)=>({...rows[0],id:'export-'+i}));assert.throws(()=>queryLandingPrices(tooMany,{},{},{exportAll:true}),/25,000/);
 for(const invalid of [{pageSize:101},{page:0},{month:'13'},{year:'20'},{sort:'payload'},{direction:'sideways'},{q:'a'.repeat(201)},{supplier:['A']}])assert.throws(()=>validateLandingPriceQuery(invalid));
});

test('protected report is read-only, paginated and refreshes cached rows after RO or master revisions',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'fh-landing-prices-')),state=emptyState();state.users.push({id:'viewer',name:'Viewer',role:'VIEWER',scopes:['LAE_IMPORT']},{id:'other',name:'Other',role:'MANAGER',scopes:['LAE_DOMESTIC']});
 state.items.push({id:'master',scope:'LAE_IMPORT',code:'GJ-PW8',brand:'Gaja',baseItemCode:'PW8'});
 const store=new Store(join(dir,'synthetic.sqlite'),state),module=new RoCostingStore(store),server=makeServer(store,{log:()=>{}});
 try{
  for(const user of state.users)store.addAccount(user.id,user.id+'@example.test','Synthetic-only-password');
  const input=record();input.purchaseItems.rows=Array.from({length:105},(_,i)=>item('item-'+i,2,10));
  module.import('admin',{records:[{record:input,expectedRevision:0},{record:{ro:'NO-ITEMS',actuals:{}},expectedRevision:0}],reason:'Synthetic source import'},randomUUID());
  const snapshot=()=>JSON.stringify({workspace:store.read(),records:store.db.prepare('SELECT * FROM ro_costings ORDER BY ro').all(),events:store.db.prepare('SELECT * FROM ro_costing_events ORDER BY id').all()});const before=snapshot();
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
  const login=async id=>{const response=await fetch(base+'/api/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({email:id+'@example.test',password:'Synthetic-only-password'})});return response.headers.get('set-cookie').split(';')[0];};
  const viewer=await login('viewer'),other=await login('other');
  assert.equal((await fetch(base+'/api/landing-prices')).status,401);assert.equal((await fetch(base+'/api/landing-prices',{headers:{Cookie:other}})).status,403);
  for(const extension of ['xlsx','pdf']){
   const path='/api/landing-prices/export.'+extension;assert.equal((await fetch(base+path)).status,401);assert.equal((await fetch(base+path,{headers:{Cookie:other}})).status,403);
   const downloaded=await fetch(base+path+'?page=2&pageSize=100',{headers:{Cookie:viewer}});assert.equal(downloaded.status,200);assert.match(downloaded.headers.get('content-disposition'),/attachment/);assert.match(downloaded.headers.get('cache-control'),/no-store/);const bytes=Buffer.from(await downloaded.arrayBuffer());assert.equal(bytes.subarray(0,extension==='xlsx'?2:5).toString(),extension==='xlsx'?'PK':'%PDF-');
  }
  const response=await fetch(base+'/api/landing-prices?page=2&pageSize=100',{headers:{Cookie:viewer}});assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');const result=await response.json();
  assert.equal(result.rows.length,5);assert.equal(result.summary.totalQuantity,210);assert.deepEqual(result.coverage,{totalRos:2,rosWithItems:1,rosWithoutItems:1,totalRows:105});assert.equal(result.rows[0].brand,'Gaja');assert.equal(result.rows[0].aiInrPerUsd,110);assert.equal(JSON.stringify(result).includes('actuals'),false);assert.equal(snapshot(),before);
  assert.equal(module.landingPricesExport('viewer',{page:2,pageSize:100}).rows.length,105);
  assert.equal((await fetch(base+'/api/landing-prices?pageSize=101',{headers:{Cookie:viewer}})).status,400);
  assert.throws(()=>module.landingPrices('other'),/access/);const cached=module.landingPrices('viewer');assert.equal(cached.rows[0].usdUnit,10);
  input.purchaseItems.rows[0]={...input.purchaseItems.rows[0],unitPrice:20,usdUnitPrice:20,brand:'TITAN',inwardDate:'2026-09-18'};
  module.save('admin',{record:input,expectedRevision:1,reason:'Synthetic reviewed row metadata'},randomUUID());
  const refreshed=module.landingPrices('viewer',{q:'TITAN'});assert.equal(refreshed.rows.length,1);assert.equal(refreshed.rows[0].usdUnit,20);assert.equal(refreshed.rows[0].brand,'TITAN');assert.equal(refreshed.rows[0].inwardDate,'2026-09-18');
  const prior=store.read(),next=structuredClone(prior);next.items.find(item=>item.id==='master').brand='Renamed exact master';next.revision++;store.commit(next,prior.revision,prior);
  assert.equal(module.landingPrices('viewer',{q:'Renamed exact master'}).pagination.total,104);
 }finally{if(server.listening)await new Promise(r=>server.close(r));store.close();rmSync(dir,{recursive:true,force:true});}
});
