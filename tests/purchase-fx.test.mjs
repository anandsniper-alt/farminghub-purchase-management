import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePurchaseFx} from '../shared/ro-costing.mjs';
import {reviewLandingPriceChanges,queryLandingPrices} from '../shared/landing-prices.mjs';
const fx=()=>({rmbUnitPrice:700,rmbPerUsd:7,date:'2026-04-22',invoiceDate:'2026-04-22',basis:'Commercial invoice',status:'Documented',source:'Supplier confirmed rate on CI-2',rmbSource:'CI-2 line 1'});
const row=(ro,extra={})=>({id:ro,ro,invoice:'CI-'+ro,vendorName:'Supplier',brandCode:'GJ-A',masterCode:'A',itemName:'Machine A',modelIdentity:'A electric',quantity:10,unit:'PCS',inwardDate:'2026-04-23',invoiceDate:'2026-04-22',usdUnit:100,rmbUnit:700,rmbPerUsd:7,fxDate:'2026-04-22',fxStatus:'Documented',inrUnitBeforeGst:10000,aiInrPerUsd:100,...extra});
test('exchange metadata validates dates, source and quote direction without inventing them',()=>{
 assert.equal(validatePurchaseFx(fx()).rmbPerUsd,7);
 for(const edit of [{date:''},{rmbPerUsd:0},{source:''},{rmbSource:''},{date:'2026-02-30'},{date:'2026-04-21'},{basis:'Market'}])assert.throws(()=>validatePurchaseFx({...fx(),...edit}));
 const historical=validatePurchaseFx({...fx(),status:'Historical reference',date:'',basis:'Historical worksheet'});assert.equal(historical.date,'');
});
test('same RMB with changed USD separates FX from supplier inflation and preserves all amounts',()=>{
 const input=[row('old',{invoiceDate:'2025-05-22',rmbPerUsd:7.15,usdUnit:700/7.15}),row('new')],original=structuredClone(input);
 const result=reviewLandingPriceChanges(input);assert.deepEqual(input,original);assert.equal(result[1].fxReview,'FX movement consistent');assert.equal(result[1].rmbChangePercent,0);assert.equal(result[1].previousRo,'old');assert.equal(result[1].usdUnit,100);assert.equal(result[1].inrUnitBeforeGst,10000);
});
test('wrong rate is high severity; market references cannot certify an agreed conversion',()=>{
 assert.equal(reviewLandingPriceChanges([row('wrong',{rmbPerUsd:6.7})])[0].fxReview,'Conversion mismatch');
 const reference=reviewLandingPriceChanges([row('ref',{rmbPerUsd:6.7,fxStatus:'Reference only'})])[0];assert.equal(reference.fxReview,'Reference comparison');assert.notEqual(reference.fxSeverity,'High');
 assert.equal(reviewLandingPriceChanges([row('free',{rmbUnit:0,usdUnit:100})])[0].fxReview,'Conversion mismatch');
 assert.equal(reviewLandingPriceChanges([row('free',{rmbUnit:0,usdUnit:0})])[0].fxReview,'Conversion checked');
});
test('RMB changes, missing evidence, equal threshold, and configurations stay distinct',()=>{
 const old=row('old',{invoiceDate:'2025-01-01'});
 assert.equal(reviewLandingPriceChanges([old,row('new',{rmbUnit:707,usdUnit:101})])[1].fxReview,'RMB price change');
 assert.equal(reviewLandingPriceChanges([old,row('new',{rmbUnit:null,usdUnit:110})])[1].fxReview,'Original currency pending');
 const different=reviewLandingPriceChanges([old,row('new',{modelIdentity:'A diesel',usdUnit:110,rmbUnit:770})]);assert.equal(different[1].previousRo,'');
 assert.equal(reviewLandingPriceChanges([old,row('new',{rmbUnit:706.9,usdUnit:100.9857142857})])[1].fxReview,'Conversion checked');
});
test('split inward rows retain purchase quantity and historical comparison before filters/pages',()=>{
 const rows=[row('old',{invoiceDate:'2025-01-01',rmbPerUsd:7.5,usdUnit:700/7.5}),row('new',{id:'new-a',quantity:2}),row('new',{id:'new-b',quantity:8})];
 const result=queryLandingPrices(rows,{q:'new',pageSize:1});assert.equal(result.summary.totalQuantity,10);assert.equal(result.pagination.total,2);assert.equal(result.rows[0].previousRo,'old');assert.equal(result.rows[0].fxReview,'FX movement consistent');
 const filtered=queryLandingPrices(rows,{fxReview:'FX movement consistent'},{},{exportAll:true});assert.equal(filtered.rows.length,2);
});

test('missing USD, uncertain chronology and source conflicts cannot pass as checked',()=>{
 const old=row('old',{invoiceDate:'2025-01-01'});
 assert.equal(reviewLandingPriceChanges([old,row('new',{usdUnit:null,rmbUnit:null})])[1].fxReview,'USD price pending');
 assert.equal(reviewLandingPriceChanges([row('one',{rmbUnit:null,rmbPerUsd:null}),row('two',{rmbUnit:null,rmbPerUsd:null})])[1].fxReview,'Purchase sequence pending');
 const conflicted=reviewLandingPriceChanges([old,row('new',{evidenceIssue:'Document currency conflict',issueDetail:'Original CI has incompatible currency headings.'})])[1];
 assert.equal(conflicted.fxReview,'Document currency conflict');assert.equal(conflicted.fxSeverity,'High');
 const settlement=validatePurchaseFx({...fx(),status:'Reference only',evidenceIssue:'Settlement rate pending',issueDetail:'PI quote; actual payment-date FX required.'});assert.equal(settlement.status,'Reference only');
 assert.throws(()=>validatePurchaseFx({...fx(),evidenceIssue:'Document currency conflict',issueDetail:''}));
});

test('description changes are reviewed without merging models or altering totals',()=>{
 const rows=[row('old',{invoiceDate:'2025-01-01'}),row('new',{modelIdentity:'Different power specification',usdUnit:110,rmbUnit:770})];
 const reviewed=reviewLandingPriceChanges(rows);assert.equal(reviewed[1].fxReview,'Model identity pending');assert.equal(reviewed[1].previousRo,'');
 const report=queryLandingPrices(rows,{fxReview:'Model identity pending'},{},{exportAll:true});assert.equal(report.summary.totalQuantity,10);assert.equal(report.summary.avgUsd,110);
});
