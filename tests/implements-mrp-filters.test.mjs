import test from 'node:test';
import assert from 'node:assert/strict';
import {filterMrpRows,calculateMRP} from '../shared/implements/domain.mjs';
const rows=[
 {key:'a',code:'IMP-1',name:'Bearing',category:'BEARING',supplier:'A',fabricated:false,orderQty:3,models:[{model:'S2.V12'}]},
 {key:'b',code:'IMP-2',name:'Bolt',category:'FASTENERS',supplier:'B',fabricated:false,orderQty:0,models:[{model:'S2.V12'}]},
 {key:'c',code:'IMP-3',name:'Nut',category:'FASTENERS',supplier:'A',fabricated:false,orderQty:4,models:[{model:'S3.V16'}]},
 {key:'fab:S2.V12',name:'Fabricated parts',category:'Fabrication subassembly',supplier:'',fabricated:true,orderQty:2,models:[{model:'S2.V12'}]},
 {key:'d',code:'IMP-4',name:'Unclassified',category:'',supplier:'',fabricated:false,orderQty:1,models:[]}
];
test('MRP filters combine exact segment, effective supplier, type, search and purchase scope without mutation',()=>{
 const before=structuredClone(rows);
 assert.deepEqual(filterMrpRows(rows,{segment:'FASTENERS',supplier:'A',type:'non',search:' s3.v16 ',purchaseOnly:true}).map(r=>r.key),['c']);
 assert.deepEqual(filterMrpRows(rows,{segment:'FASTENERS',supplier:'B',purchaseOnly:true}),[]);
 assert.deepEqual(filterMrpRows(rows,{segment:'FASTENERS',supplier:'B'}).map(r=>r.key),['b']);
 assert.deepEqual(filterMrpRows(rows,{search:'imp-1'}).map(r=>r.key),['a']);
 assert.deepEqual(filterMrpRows(rows),rows);assert.deepEqual(rows,before);
});
test('unassigned suppliers, uncategorised parts and fabricated subassemblies remain discoverable',()=>{
 assert.deepEqual(filterMrpRows(rows,{supplier:'__unassigned__'}).map(r=>r.key),['fab:S2.V12','d']);
 assert.deepEqual(filterMrpRows(rows,{segment:'__unassigned__'}).map(r=>r.key),['d']);
 assert.deepEqual(filterMrpRows(rows,{type:'fab',segment:'Fabrication subassembly'}).map(r=>r.key),['fab:S2.V12']);
 assert.deepEqual(filterMrpRows(rows,{segment:'BEARING',supplier:'B'}),[]);
});
test('supplier filtering uses the calculated override and leaves allocation and MRP quantities intact',()=>{
 const s={parts:[{id:'p',code:'IMP-1',name:'Bearing',category:'BEARING',supplier:'A',rate:10}],models:[{id:'S2.V12',bomAvailable:true,lines:[{partId:'p',ppm:2}],fabrication:[]}],plan:{'S2.V12':10},stock:{p:{qty:3}},adjustments:{p:{supplier:'B'}},settings:{bufferPercent:10,fabricationRate:125,fabricationTransportRate:1.5}};
 const before=structuredClone(s),report=calculateMRP(s),filtered=filterMrpRows(report.rows,{supplier:'B'});
 assert.equal(filtered.length,1);assert.equal(filtered[0].mrp,17);assert.equal(filtered[0].orderQty,19);assert.equal(filtered[0],report.rows[0]);assert.equal(filterMrpRows(report.rows,{supplier:'A'}).length,0);assert.deepEqual(s,before);
});
