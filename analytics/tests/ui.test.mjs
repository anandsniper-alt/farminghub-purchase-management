import test from 'node:test';
import assert from 'node:assert/strict';
import {createLaeSalesAnalyticsUI,LAE_ANALYTICS_SECTIONS} from '../web/lae-sales-analytics.mjs';
const analyticsEscape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uiHost=(ui,user)=>({context:()=>({ui,user}),esc:analyticsEscape,icon:()=>'',head:(a,b,c)=>`<h1>${b}</h1><p>${c}</p>`,button:()=>'',logo:'',analyticsSections:LAE_ANALYTICS_SECTIONS});
test('empty analytics never interprets existing purchase data as sales or forecasts',()=>{
 const state={orders:[{quantity:987654,number:'PRIVATE-PO'}],items:[{code:'PRIVATE-SKU'}]};
 const ui={view:'lae-sales-analytics'};const page=createLaeSalesAnalyticsUI({...uiHost(ui,{role:'ADMIN'}),context:()=>({ui,state}),render:()=>{throw Error('Unexpected render');}});
 for(const [id] of LAE_ANALYTICS_SECTIONS){ui.orderId=id;const html=page.page();assert.match(html,/No data|Awaiting data/);assert.doesNotMatch(html,/PRIVATE-|987654|<input[^>]+type="file"|0%/);}
 ui.orderId='overview';assert.equal((page.page().match(/aria-label="Not available"/g)||[]).length,5);
 ui.orderId='purchases';assert.match(page.page(),/Surplus on another model will not offset its shortage/);
});
test('filters remain local, preserve unknown inputs as empty and handle unsupported sections',()=>{
 const ui={view:'lae-sales-analytics',orderId:'not-a-section'},before=JSON.stringify(ui);let renders=0;
 const page=createLaeSalesAnalyticsUI({...uiHost(ui,{role:'ADMIN'}),render:()=>renders++});
 assert.match(page.page(),/Your analytics workspace is ready/);
 assert.equal(page.change({id:'lae-analytics-centre',value:'B2B - Karnal'}),true);assert.match(page.page(),/B2B - Karnal · All months/);
 page.change({id:'lae-analytics-month',value:'2026-10'});assert.match(page.page(),/B2B - Karnal · 2026-10/);
 page.change({id:'lae-analytics-centre',value:'<script>alert(1)</script>'});page.change({id:'lae-analytics-month',value:'2026-13'});
 assert.match(page.page(),/All cost centres · All months/);assert.doesNotMatch(page.page(),/<script>/);assert.equal(renders,4);assert.equal(JSON.stringify(ui),before);
 ui.view='overview';assert.equal(page.change({id:'lae-analytics-centre',value:'B2C - TN'}),false);
});
test('late analytics responses cannot replace newer filters or cross account boundaries',async()=>{
 const ui={view:'lae-sales-analytics',orderId:'overview'};let user={id:'first',role:'ADMIN'},requests=[];
 const page=createLaeSalesAnalyticsUI({...uiHost(ui,user),context:()=>({ui,user,sandbox:false}),render:()=>{},api:()=>new Promise(resolve=>requests.push(resolve))});
 const response=n=>({meta:{fileName:'synthetic.xlsx',periodNote:'Synthetic',sha256:'a'.repeat(64)},sourceItems:1,totals:{stock:{quantity:n,missing:0},shared:{quantity:0,missing:0},pipeline:{quantity:0,missing:0}},exceptions:[]});
 page.page();page.afterRender();page.change({id:'lae-analytics-centre',value:'B2B - TN'});page.afterRender();requests[0](response(99999));await new Promise(r=>setImmediate(r));assert.doesNotMatch(page.page(),/99,999/);requests[1](response(12345));await new Promise(r=>setImmediate(r));assert.match(page.page(),/12,345/);
 user={id:'second',role:'ADMIN'};assert.doesNotMatch(page.page(),/12,345/);page.afterRender();assert.equal(requests.length,3);
});
