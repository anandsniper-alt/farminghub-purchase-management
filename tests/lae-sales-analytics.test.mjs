import test from 'node:test';
import assert from 'node:assert/strict';
import {createLaeSalesAnalyticsUI,LAE_ANALYTICS_SECTIONS} from '../web/lae-sales-analytics.mjs';
import {createNavigation} from '../web/navigation.mjs';
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
test('analytics navigation honors LAE scopes and cannot be reached by technical or unassigned roles',()=>{
 const cases=[{user:{role:'ADMIN',scopes:[]},allowed:true},...['LAE_IMPORT','LAE_DOMESTIC'].map(scope=>({user:{role:'VIEWER',scopes:[scope]},allowed:true})),...['MANAGER','BOM_REVIEWER','PRODUCTION_OPERATOR','PLAN_OPERATOR'].map(role=>({user:{role,scopes:role==='MANAGER'?['IMPLEMENTS_DOMESTIC']:['LAE_IMPORT','LAE_DOMESTIC']},allowed:false})),{user:{role:'MANAGER',active:false,scopes:['LAE_IMPORT']},allowed:false}];
 for(const {user,allowed} of cases){const ui={view:'lae-sales-analytics',orderId:'stock'},nav=createNavigation(uiHost(ui,user));assert.equal(nav.canAccessView(),allowed,JSON.stringify(user));assert.equal(nav.divisionHub('lae').includes('LAE Sales Analytics'),false);assert.equal(nav.home().includes('href="/lae-analytics/"'),allowed);assert.equal(nav.sidebar().includes('value="lae-sales-analytics"'),allowed);assert.equal(nav.sidebar().includes('data-to="lae-sales-analytics/stock"'),allowed);if(allowed){assert.equal(nav.area(),'analytics');assert.doesNotMatch(nav.breadcrumb('LAE Sales Analytics'),/href="#\/division\/lae"/);}else assert.equal(nav.area(),'home');}
});
