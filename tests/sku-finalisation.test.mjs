import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesSkuFinalisation,skuFinalisationCounts,skuFinalisationLabel} from '../shared/sku-finalisation.mjs';
import {technicalWorkspace} from '../shared/bom-management.mjs';
import {exportTechnical,bomAssets} from '../server/bom-management-files.mjs';
import {implementsAssets} from '../server/implements-files.mjs';
import {productionAssets} from '../server/production-files.mjs';

test('syntax confirmation is independent of BOM readiness and filters do not change records',()=>{
 const models=[{id:'S2.V1',salesConfirmed:true,bomAvailable:false},{id:'S2.V2',salesConfirmed:false,bomAvailable:true},{id:'S2.V3',bomAvailable:true}];
 const before=structuredClone(models);
 assert.deepEqual(models.filter(m=>matchesSkuFinalisation(m,'yes')).map(m=>m.id),['S2.V1']);
 assert.deepEqual(models.filter(m=>matchesSkuFinalisation(m,'no')).map(m=>m.id),['S2.V2','S2.V3']);
 assert.equal(models.filter(m=>matchesSkuFinalisation(m)).length,3);
 assert.equal(matchesSkuFinalisation({salesConfirmed:'yes'},'yes'),false);
 assert.equal(matchesSkuFinalisation(models[0],'unexpected'),false);
 assert.deepEqual(skuFinalisationCounts(models),{yes:1,no:2});
 assert.equal(skuFinalisationLabel(models[0]),'YES · Confirmed for sales');
 assert.equal(skuFinalisationLabel(models[1]),'Not finalised');
 assert.deepEqual(models,before);
});
test('technical BOM export includes SKU finalisation, respects selected models, and contains no costs',()=>{
 const source={revision:1,models:[{id:'S2.V1',series:'Leader',salesConfirmed:true,revision:1,rate:999,lines:[{partId:'bolt',ppm:4}],fabrication:[]},{id:'S2.V2',series:'Leader',salesConfirmed:false,revision:1,lines:[],fabrication:[]}],parts:[{id:'bolt',code:'IMP-1',name:'Bolt',rate:1234,uom:'pcs'}]};
 const data={...technicalWorkspace(source),reviews:[]};
 const bytes=exportTechnical(data,{modelIds:['S2.V1']},'bom').bytes.toString();
 assert.match(bytes,/SKU finalisation/);assert.match(bytes,/"YES"/);assert.match(bytes,/"4"/);
 assert.doesNotMatch(bytes,/S2.V2|1234|999|Price|Cost/);
 const syntax=exportTechnical(data,{modelIds:['S2.V2']},'syntax').bytes.toString();assert.match(syntax,/"NO"/);assert.doesNotMatch(syntax,/S2.V1/);
});
test('all three scoped apps serve the same SKU helper through their own protected paths',()=>{
 const paths=[implementsAssets.get('/implements/sku-finalisation.mjs'),bomAssets.get('/bom/sku-finalisation.mjs'),productionAssets.get('/production/sku-finalisation.mjs')];
 assert.ok(paths.every(p=>p&&p.file===paths[0].file&&p.type.startsWith('text/javascript')));
});
