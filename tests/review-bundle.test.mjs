import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {reviewBundle} from '../scripts/review-bundle.mjs';

test('standalone modules retain private names, JSON configuration and dynamic local exports',async()=>{
 const source={
  'shared/a.mjs':"const esc=v=>'a'+v;\nexport function first(v){return esc(v);}",
  'shared/b.mjs':"import profile from './profile.json' with {type:'json'};\nconst esc=v=>'b'+v;\nexport function second(v){return esc(v)+profile.name;}",
  'shared/profile.json':'{"name":"FH"}',
  'web/app.mjs':"import {first} from '../shared/a.mjs';\nconst esc=v=>'app'+v;\nglobalThis.answer=first('1')+esc('2');\nglobalThis.lazy=()=>import('../shared/b.mjs');"
 };
 const bundle=reviewBundle(['web/app.mjs'],p=>source[p]);
 const context={};vm.runInNewContext(bundle.code,context);
 assert.equal(context.answer,'a1app2');assert.equal((await context.lazy()).second('3'),'b3FH');
 assert.equal(bundle.modules.length,3);
});

test('standalone circular domain helpers resolve calls after initialization',()=>{
 const source={
  'shared/a.mjs':"import {second} from './b.mjs';\nexport function first(){return second();}\nexport const VALUE=7;",
  'shared/b.mjs':"import {VALUE} from './a.mjs';\nexport function second(){return VALUE;}",
  'web/app.mjs':"import {first} from '../shared/a.mjs';\nglobalThis.answer=first();"
 };
 const context={};vm.runInNewContext(reviewBundle(['web/app.mjs'],p=>source[p]).code,context);assert.equal(context.answer,7);
});

test('same export name in separate modules retains its importing module identity',async()=>{
 const source={
  'web/a.mjs':"export function render(){return 'A';}",
  'web/b.mjs':"export async function render(){return (await import('./a.mjs')).render()+'B';}",
  'web/app.mjs':"import {render} from './b.mjs';\nglobalThis.answer=render();"
 };
 const context={};vm.runInNewContext(reviewBundle(['web/app.mjs'],p=>source[p]).code,context);assert.equal(await context.answer,'AB');
});
