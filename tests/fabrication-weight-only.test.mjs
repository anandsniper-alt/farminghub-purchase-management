import test from 'node:test';
import assert from 'node:assert/strict';
import {blankState,fabricationTotals} from '../shared/implements/domain.mjs';
import {calculateModelCost} from '../shared/implements/costing.mjs';
import {technicalIssues,technicalWorkspace,validateTechnicalDraft} from '../shared/bom-management.mjs';
import {exportTechnical} from '../server/bom-management-files.mjs';
const fixture=()=>blankState({version:'test',suppliers:[],parts:[{id:'bolt',code:'IMP-1',name:'Bolt',uom:'pcs',rate:10}],models:[{id:'S2.V50',name:'Leader',series:'Leader',configuration:'S2-V-ELITE-7FT-48-MS-OB-CEN',frame:'V',size:'7FT',blades:48,speed:'MS',bladeOrientation:'OB',gearboxOrientation:'CEN',revision:1,bomAvailable:true,lines:[{partId:'bolt',ppm:2}],fabrication:[{partId:'patta',name:'Namaste patta',weight:4.4},{partId:'source-row-33',name:'Input shaft shield',weight:null}],costs:{'Gearbox powder coating':0,Assembly:0,'Rack stand':0,'Buffer cost':0}}]});
test('fabrication uses combined weight regardless of absent, null or historical piece quantity',()=>{
 const s=fixture();s.settings.fabricationRate=125;s.settings.fabricationTransportRate=1.5;
 for(const ppm of [undefined,null,0,4,8]){s.models[0].fabrication[0].ppm=ppm;assert.equal(fabricationTotals(s.models[0]).totalWeight,4.4);assert.equal(calculateModelCost(s,'S2.V50').fabricationTotal,556.6);assert.equal(technicalIssues(s.models[0],s.parts).filter(i=>i.segment==='Fabrication').length,0);}
 assert.equal(calculateModelCost(s,'S2.V50').partsTotal,20);
});
test('a missing fabrication weight remains pending even if historical piece quantity was zero',()=>{
 const s=fixture();s.models[0].fabrication[0].ppm=0;s.models[0].fabrication[0].weight=null;assert.equal(fabricationTotals(s.models[0]).pending,1);assert.equal(fabricationTotals(s.models[0]).totalWeight,null);assert(technicalIssues(s.models[0],s.parts).some(i=>i.id==='weight:patta'));assert(!technicalIssues(s.models[0],s.parts).some(i=>i.id==='weight:source-row-33'));
});
test('weight-only drafts and technical exports do not require or publish fabrication piece quantities',()=>{
 const s=fixture(),draft=validateTechnicalDraft({fabrication:[{partId:'patta',name:'Namaste patta',weight:4.4}]},s);assert.equal(draft.fabrication[0].ppm,null);assert.equal(draft.fabrication[0].weight,4.4);
 const csv=exportTechnical({...technicalWorkspace(s),reviews:[]},{},'bom').bytes.toString('utf8');const row=csv.split('\r\n').find(r=>r.includes('"Namaste patta"'));assert(row.includes('"Namaste patta","","kg","4.4"'));assert(csv.includes('"Bolt","2","pcs"'));
});
