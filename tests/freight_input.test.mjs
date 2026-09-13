import test from 'node:test';
import assert from 'node:assert/strict';
import {previewRateImport} from '../shared/shipping.mjs';
const preview=value=>previewRateImport({freightRates:[]},[{'PORT OF LOADING':'Ningbo','PORT OF DISCHARGE':'Chennai',VOLUME:'1X40HC','O/F USD':value}],'QA-2026-W38')[0];
test('freight preview never turns a negative or malformed rate into a positive benchmark',()=>{
 for(const value of ['-1','USD -3000','(3000)','abc3000','3000-4000','3,00','0','Infinity',''])assert.equal(preview(value).result,'REJECTED',value);
});
test('freight preview preserves supported USD formats, thousands and fee boundaries',()=>{
 for(const [input,rate,fee] of [['2999',2999,60],['USD 3000',3000,120],['USD 3,001.25',3001.25,120],['$3,800',3800,120],[' 2500 USD ',2500,60]]){
  const p=preview(input);assert.equal(p.result,'READY',input);assert.equal(p.normalized.rateUsd,rate,input);assert.equal(p.normalized.agentChargeUsd,fee,input);assert.equal(p.normalized.benchmarkUsd,rate+fee,input);
 }
});
