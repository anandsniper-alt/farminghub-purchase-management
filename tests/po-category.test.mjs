import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../web/app.mjs',import.meta.url),'utf8');
const functions=source.slice(source.indexOf('function poCategory('),source.indexOf('// Keep the dialog, focus'));
function fixture(approve=true){const calls=[],select={value:'OTHER'},ctx={ui:{draft:{basePlans:[{baseId:'weeder',unitPrice:'15.00',specId:'v1',quantities:{GJ:7},costCenterQuantities:{GJ:{c:7}}},{baseId:'other',unitPrice:'9.00',quantities:{GJ:3}}]}},state:{bases:[{id:'weeder',category:'POWER WEEDER'}]},confirm:()=>{calls.push('confirm');return approve;},document:{querySelector:()=>select},refreshPoWorksheet:i=>calls.push(i),renderModal:()=>{throw Error('Form must not be rebuilt');}};vm.createContext(ctx);vm.runInContext(functions,ctx);return {ctx,calls,select};}
test('empty-row category selection only filters choices, retaining entered values in other rows',()=>{
 const {ctx,calls}=fixture();ctx.ui.draft.basePlans[0]={baseId:'',unitPrice:'0.00',quantities:{GJ:0}};const other=structuredClone(ctx.ui.draft.basePlans[1]);ctx.changePoCategory(0,'POWER WEEDER');assert.deepEqual(calls,[null]);assert.equal(ctx.ui.draft.basePlans[0].itemCategory,'POWER WEEDER');assert.deepEqual(ctx.ui.draft.basePlans[1],other);
});
test('cancelled category replacement preserves every row value and restores the category select',()=>{
 const {ctx,calls,select}=fixture(false),before=structuredClone(ctx.ui.draft);ctx.changePoCategory(0,'BRUSH CUTTER');assert.deepEqual(ctx.ui.draft,before);assert.equal(select.value,'POWER WEEDER');assert.deepEqual(calls,['confirm']);
});
test('confirmed category replacement clears only the affected item and its allocations',()=>{
 const {ctx,calls}=fixture(),other=structuredClone(ctx.ui.draft.basePlans[1]);ctx.changePoCategory(0,'BRUSH CUTTER');const row=ctx.ui.draft.basePlans[0];assert.equal(row.baseId,'');assert.equal(row.specId,'');assert.equal(row.unitPrice,'0.00');assert.equal(row.quantities.GJ,0);assert.equal(Object.keys(row.costCenterQuantities).length,0);assert.equal(row.itemCategory,'BRUSH CUTTER');assert.deepEqual(ctx.ui.draft.basePlans[1],other);assert.deepEqual(calls,['confirm',0]);
});
test('matching category and all-categories retain the selected item, quantities and price',()=>{
 const {ctx,calls}=fixture();ctx.changePoCategory(0,'POWER WEEDER');ctx.changePoCategory(0,'');assert.equal(ctx.ui.draft.basePlans[0].baseId,'weeder');assert.equal(ctx.ui.draft.basePlans[0].quantities.GJ,7);assert.equal(ctx.ui.draft.basePlans[0].unitPrice,'15.00');assert.deepEqual(calls,[null,null]);
});
