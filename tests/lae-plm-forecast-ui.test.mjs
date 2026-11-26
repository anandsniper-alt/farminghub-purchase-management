import test from 'node:test';
import assert from 'node:assert/strict';
import {setImmediate as settle} from 'node:timers/promises';
import {createLaePlmForecastUI} from '../web/lae-plm-forecast.mjs';

const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
function fixture(api){
 const state={bases:[]},user={id:'buyer',role:'VIEWER',scopes:['LAE_IMPORT']},ui={view:'lae-plm',search:''};
 const ctx={state,user,ui,sandbox:false};
 return {ctx,view:createLaePlmForecastUI({context:()=>ctx,api,esc,head:(division,title,sub,actions)=>actions,button:()=>'<button>Refresh forecast</button>',render:()=>{}})};
}
const source={fileName:'Private.xlsx',sheet:'MASTER'};
const item=(code,sourceRow,extras={})=>({code,name:'Machine',sourceRow,grade:'',category:'Mowers',engine:'',skuStatus:'NO',...extras});
test('all forecast codes stay visible, with searchable source fields and only unique exact scoped technical links',async()=>{
 const {ctx,view}=fixture(async path=>{
  assert.equal(path,'/lae-plm-forecast');
  return {source,items:[item('W1',2),item('W2',3),item('W3',4),item('w4',5,{name:'<Example>'})]};
 });
 ctx.state.bases=[['W1','LAE_IMPORT','a'],['W2','LAE_DOMESTIC','b'],['W3','LAE_IMPORT','c'],['W3','LAE_IMPORT','d'],['W4','LAE_IMPORT','e']].map(([code,scope,id])=>({code,scope,id}));
 assert.match(view.page(),/Loading forecast/);
 await settle();
 const all=view.page();
 assert.match(all,/4 of 4 models/);
 assert.match(all,/href="#\/product\/a"/);
 assert.equal((all.match(/Open technical product/g)||[]).length,1);
 assert.equal((all.match(/Forecast only/g)||[]).length,2);
 assert.match(all,/Multiple technical matches/);
 assert.match(all,/&lt;Example>/);
 assert.match(all,/Private.xlsx · MASTER/);
 ctx.ui.search='w4';
 const filtered=view.page();
 assert.match(filtered,/1 of 4 models/);
 assert.doesNotMatch(filtered,/<td>W1<\/td>/);
 ctx.ui.search='missing';
 assert.match(view.page(),/No models match/);
});
test('account change and retry discard previous requests, and a standalone review never fetches private data',async()=>{
 const pending=[];
 const {ctx,view}=fixture(()=>new Promise((resolve,reject)=>pending.push({resolve,reject})));
 view.page();
 ctx.user.id='other';
 view.page();
 pending[0].resolve({source,items:[item('OLD',10)]});
 pending[1].reject(new Error('Permission denied'));
 await settle();
 assert.match(view.page(),/Permission denied/);
 assert.doesNotMatch(view.page(),/OLD/);
 view.clear();view.page();
 pending[2].resolve({source:null,items:[]});
 await settle();
 assert.match(view.page(),/No forecast workbook/);
 ctx.sandbox=true;
 assert.match(view.page(),/signed-in purchase application/);
 assert.equal(pending.length,3);
});
test('a private review may display a supplied register while the hosted application ignores it',async()=>{
 const previous=globalThis.window;
 try{
  globalThis.window={FH_PLM_FORECAST_CATALOG:{source,items:[item('PREVIEW',12,{engine:null})]}};
  const {ctx,view}=fixture(async()=>({source,items:[item('SERVER',13)]}));
  ctx.sandbox=true;
  ctx.state.bases=[{id:'demo',scope:'LAE_IMPORT',code:'PREVIEW',demo:true}];
  assert.match(view.page(),/PREVIEW/);
  assert.match(view.page(),/No local technical match/);
  assert.doesNotMatch(view.page(),/href="#\/product\/demo"|>null</);
  ctx.sandbox=false;
  view.page();await settle();
  assert.match(view.page(),/SERVER/);
  assert.doesNotMatch(view.page(),/PREVIEW/);
 }finally{if(previous===undefined)delete globalThis.window;else globalThis.window=previous;}
});
