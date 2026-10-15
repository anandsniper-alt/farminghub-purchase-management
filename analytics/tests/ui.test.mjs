import test from 'node:test';
import assert from 'node:assert/strict';
import {createLaeSalesAnalyticsUI,LAE_ANALYTICS_SECTIONS,csvCell} from '../web/lae-sales-analytics.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const host=context=>({context,esc,head:(a,b,c)=>`<h1>${b}</h1><p>${c}</p>`,render:()=>{}});
test('replacement navigation has only two views and never treats purchase records as analytics data',()=>{
  assert.deepEqual(LAE_ANALYTICS_SECTIONS.map(x=>x[0]),['review','sales']);
  const ui={view:'lae-sales-analytics',orderId:'review'},page=createLaeSalesAnalyticsUI(host(()=>({ui,user:{id:'a'},state:{orders:[{code:'PRIVATE',quantity:987654}]}})));
  assert.match(page.page(),/Stock, sales & plan/);assert.match(page.page(),/No data available/);assert.doesNotMatch(page.page(),/PRIVATE|987654|Monthly buying plan|Purchasing overview/);
  ui.orderId='sales';assert.match(page.page(),/Filter sales quantities/);
  assert.equal(csvCell(-5),'"-5"');assert.equal(csvCell('  =1+1'),'"\'  =1+1"');
  assert.equal(csvCell('=1+1'),'"\'=1+1"');assert.equal(csvCell('safe "quote"'),'"safe ""quote"""');
});
test('late responses cannot overwrite a newer filter or cross account boundaries',async()=>{
  const ui={view:'lae-sales-analytics',orderId:'review'};let user={id:'first',role:'ADMIN'},requests=[];
  const page=createLaeSalesAnalyticsUI({...host(()=>({ui,user})),api:()=>new Promise(resolve=>requests.push(resolve))});
  page.page();page.afterRender();page.change({id:'review-centre',value:'B2B - TN'});page.afterRender();
  requests[0]({ready:false,view:'review'});await new Promise(r=>setImmediate(r));assert.match(page.page(),/Loading/);
  requests[1]({ready:false,view:'review'});await new Promise(r=>setImmediate(r));assert.match(page.page(),/Awaiting data/);
  user={id:'second',role:'ADMIN'};assert.match(page.page(),/Loading/);page.afterRender();assert.equal(requests.length,3);
  assert.equal(page.change({id:'review-centre',value:'<script>'}),true);
  ui.view='home';assert.equal(page.change({id:'review-search',value:'A'}),false);
});
