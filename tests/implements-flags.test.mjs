import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyReviewFlags} from '../shared/implements/costing.mjs';
const fixture=()=>({settings:{fabricationRate:125,fabricationTransportRate:1.5},parts:[{id:'p',code:'IMP-1',name:'Bearing',rate:10,uom:'pcs'}],models:[{id:'S1.V14',series:'Emperor',bomAvailable:true,revision:1,lines:[{partId:'p',ppm:1}],fabrication:[{partId:'f',code:'IMP-2',name:'Frame',weight:2,ppm:null},{partId:'source-row-33',name:'Shield',weight:null}],costs:{'Gearbox powder coating':0,Assembly:0,'Rack stand':0,'Buffer cost':0}}]});
const classify=(s,flags)=>classifyReviewFlags(s,'S1.V14',flags);
test('old/new differences and reference details stay mild with complete current inputs',()=>{
 const s=fixture(),before=structuredClone(s),flags=[{id:'old',part:'IMP-1',category:'PPM difference'},{id:'spec',partId:'p',category:'Item identity'},{id:'code',partId:'p',category:'Item code pending'}];
 const r=classify(s,flags);assert.deepEqual(r.serious,[]);assert.deepEqual(r.mild,flags);assert.deepEqual(s,before);
});
test('a missing active purchase price is serious while supplier metadata remains mild',()=>{
 const s=fixture();s.parts[0].rate=null;const flags=[{id:'price',part:'IMP-1',category:'Price pending'},{id:'supplier',partId:'p',category:'Supplier pending'}];const r=classify(s,flags);assert.deepEqual(r.serious,[flags[0]]);assert.deepEqual(r.mild,[flags[1]]);
 s.parts[0].rate=0;assert.equal(classify(s,flags).serious.length,0);
});
test('excluded PPM zero and removed historical items do not create serious price flags',()=>{
 const s=fixture();s.parts[0].rate=null;s.models[0].lines[0].ppm=0;
 const r=classify(s,[{partId:'p',category:'Price pending'},{part:'IMP-999',category:'Old item absent'}]);assert.equal(r.serious.length,0);assert.equal(r.mild.length,2);
});
test('unknown purchased quantity is serious, but fabrication pieces and excluded shield are not required',()=>{
 const s=fixture();s.models[0].lines[0].ppm=null;
 const flags=[{partId:'p',category:'Incomplete PPM'},{partId:'f',category:'Quantity pending'},{partId:'source-row-33',category:'Additional part weight pending'}];const r=classify(s,flags);assert.deepEqual(r.serious,[flags[0]]);assert.deepEqual(r.mild,flags.slice(1));
 s.models[0].fabrication[0].weight=null;const weight={part:'IMP-2',category:'Additional part weight pending'};assert.deepEqual(classify(s,[weight]).serious,[weight]);
});
test('resolved records remain out of counts and an unentered BOM is serious',()=>{
 const s=fixture();s.models[0].bomAvailable=false;s.models[0].lines=[];const pending={category:'Purchased BOM pending'};
 const r=classify(s,[pending,{category:'Price pending',resolved:true},{category:'Price pending',status:'Resolved'},{category:'Quantity pending',status:'Weight question resolved'}]);assert.deepEqual(r.serious,[pending]);assert.deepEqual(r.mild,[]);assert.throws(()=>classifyReviewFlags(s,'unknown',[]),/Unknown model/);
});
