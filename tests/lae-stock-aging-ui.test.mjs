import test from 'node:test';import assert from 'node:assert/strict';
import {createLaeStockAgingUI} from '../web/lae-stock-aging.mjs';
import {queryLaeAgingAllocation} from '../shared/lae-stock-aging-allocation.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function setup(sandbox=false){
 const snapshot={schemaVersion:1,stockDate:'2026-10-31',costDate:'2026-10-31',plans:[{id:'p',productGroup:'Cutters',masterCode:'CC1',unit:'pcs',quantities:{TNWL:60,HYD:0,NORTH:0,FH:40}}],rows:[{id:'1',planKey:'p',productGroup:'Cutters',masterCode:'CC1',brandCode:'GJ-CC1',itemName:'Cutter <script>',unit:'pcs',warehouse:'SASTHA',quantity:50,importDate:'2026-07-31',originalInrUnit:90,revisedInrUnit:100,quantityOnly:false}]};
 const ctx={user:{id:'reader',role:'VIEWER',scopes:['LAE_IMPORT']},ui:{view:'stock-aging'},sandbox},calls=[],dialogs=[];globalThis.location={hash:'#/stock-aging'};globalThis.requestAnimationFrame=()=>{};
 const host={context:()=>ctx,api:async path=>{calls.push(path);return queryLaeAgingAllocation(snapshot,Object.fromEntries(new URLSearchParams(path.split('?')[1])));},esc,field:(name,label,value)=>'<label>'+label+'<input name="'+name+'" value="'+esc(value)+'"></label>',button:(l,a)=>'<button data-action="'+a+'">'+l+'</button>',head:(a,b,c,d='')=>'<h1>'+b+'</h1>'+c+d,note:s=>'<p>'+s+'</p>',render:()=>{},navigate:path=>{location.hash='#/'+path;},showDialog:(t,d)=>{ctx.ui.modal=t;dialogs.push({t,d});}};
 return {host,ctx,calls,dialogs,snapshot};
}
test('forecast aging shows requested bands, value, allocated division and safe bounded drilldown',async()=>{
 const {host,dialogs}=setup(),ui=createLaeStockAgingUI(host);await ui.action('stock-aging-refresh');let html=ui.page();assert.match(html,/Above 1080 days/);assert.match(html,/121–240 days/);assert.match(html,/50 pcs/);assert.match(html,/5,000.00/);assert.match(html,/Hyderabad \/ AP/);
 await ui.action('stock-aging-models',{group:'Cutters',unit:'pcs',bucket:'61-120'});assert.equal(dialogs[0].t,'stock-aging-models');let modal=ui.modal('stock-aging-models');assert.match(modal.body,/&lt;script&gt;/);assert.doesNotMatch(modal.body,/<script>/);assert.match(modal.body,/50 pcs/);
 location.hash='#/stock-aging?view=allocated&divisions=TNWL';await ui.action('stock-aging-refresh');html=ui.page();assert.match(html,/30 pcs/);await ui.action('stock-aging-models',{group:'Cutters',unit:'pcs',bucket:'61-120',division:'TNWL'});modal=ui.modal('stock-aging-models');assert.match(modal.body,/30 pcs/);assert.doesNotMatch(modal.body,/50 pcs/);
});
test('no selected division does not silently show all; empty review exposes no private data',async()=>{
 const a=setup();location.hash='#/stock-aging?view=allocated&divisions=none';const ui=createLaeStockAgingUI(a.host);await ui.action('stock-aging-refresh');assert.match(ui.page(),/No stock matches/);
 const b=setup(true),review=createLaeStockAgingUI(b.host);delete globalThis.FH_LAE_AGING_SNAPSHOT;await review.action('stock-aging-refresh');assert.equal(b.calls.length,0);assert.match(review.page(),/no private stock/);
});
test('authorization and stale response protect cached page and detail data',async()=>{
 const a=setup(),ui=createLaeStockAgingUI(a.host);await ui.action('stock-aging-refresh');a.ctx.user={id:'other',role:'VIEWER',scopes:['LAE_DOMESTIC']};assert.match(ui.page(),/required/);assert.throws(()=>ui.modal('stock-aging-models'),/required/);
 const slow=setup();let resolve,renders=0;slow.host.api=()=>new Promise(r=>resolve=r);slow.host.render=()=>renders++;const p=createLaeStockAgingUI(slow.host).action('stock-aging-refresh');slow.ctx.user=null;resolve(queryLaeAgingAllocation(slow.snapshot,{}));await p;assert.equal(renders,0);
});
test('view switching and reset use bookmarkable routes without a business write',async()=>{
 const a=setup(),ui=createLaeStockAgingUI(a.host);await ui.action('stock-aging-view',{view:'allocated'});assert.match(location.hash,/view=allocated/);await ui.action('stock-aging-all');assert.match(location.hash,/view=allocated/);await ui.action('stock-aging-reset');assert.equal(location.hash,'#/stock-aging');assert.equal(a.calls.length,0);
});

test('asynchronous detail completion refreshes the shared modal, not the background page',async()=>{
 const a=setup();let pageRenders=0,modalRenders=0;a.host.render=()=>pageRenders++;a.host.renderModal=()=>modalRenders++;
 const ui=createLaeStockAgingUI(a.host);await ui.action('stock-aging-refresh');const before=pageRenders;
 await ui.action('stock-aging-models',{group:'Cutters',unit:'pcs',bucket:'61-120'});
 assert.equal(modalRenders,1);assert.equal(pageRenders,before);const body=ui.modal('stock-aging-models').body;assert.match(body,/5,000.00/);assert.ok(body.indexOf('Item summary')<body.indexOf('Barcode list'));assert.match(body,/All matching items total/);assert.match(body,/Master code/);
});

test('redesigned report makes scope, dated costs and pending coverage explicit',async()=>{
 const a=setup();a.snapshot.metadata={planPeriod:'November 2026 - April 2027'};
 const ui=createLaeStockAgingUI(a.host);await ui.action('stock-aging-refresh');let html=ui.page();
 assert.match(html,/aging-divisions" hidden/);assert.match(html,/Overall stock · all forecast items/);
 assert.match(html,/Stock: 31 Oct 2026/);assert.match(html,/Costs through: 31 Oct 2026/);
 assert.match(html,/Forecast: November 2026 - April 2027/);assert.match(html,/Revised landing cost · INR before GST/);
 assert.match(html,/Known stock value/);assert.match(html,/Excludes missing costs/);assert.match(html,/Cost pending/);assert.match(html,/Age unknown/);
 assert.ok(html.indexOf('aging-summary-grid')<html.indexOf('Aging by product category'));
 assert.match(html,/<details class="aging-more-filters" ><summary>More filters/);
 assert.match(html,/View item summary: .*Cutters, 61–120 days, 50 pcs/);
 location.hash='#/stock-aging?view=allocated&divisions=TNWL';await ui.action('stock-aging-refresh');html=ui.page();
 assert.doesNotMatch(html,/aging-divisions" hidden/);assert.match(html,/aging-report-context"><strong>TNWL<\/strong>/);
 assert.match(html,/30 pcs/);assert.match(html,/3,000.00/);
 location.hash='#/stock-aging?view=allocated&divisions=none';await ui.action('stock-aging-refresh');assert.match(ui.page(),/No divisions selected/);
});

test('barcode and item paging retain the selected scope and each other query page',async()=>{
 const a=setup(),ui=createLaeStockAgingUI(a.host);location.hash='#/stock-aging?view=allocated&divisions=TNWL&basis=original&asOf=2026-11-01';
 await ui.action('stock-aging-refresh');await ui.action('stock-aging-models',{group:'Cutters',unit:'pcs',bucket:'61-120',division:'TNWL'});
 await ui.action('stock-aging-item-page',{page:2});await ui.action('stock-aging-detail-page',{page:3});
 const q=new URLSearchParams(a.calls.at(-1).split('?')[1]);
 for(const [k,v] of Object.entries({itemPage:'2',page:'3',basis:'original',asOf:'2026-11-01',divisions:'TNWL',productGroup:'Cutters',bucket:'61-120',unit:'pcs'}))assert.equal(q.get(k),v);
 const modal=ui.modal('stock-aging-models');assert.match(modal.sub,/TNWL/);assert.match(modal.sub,/Original landing cost/);
 assert.match(modal.body,/Previous barcodes/);assert.match(modal.body,/Next barcodes/);
 assert.ok(modal.body.indexOf('Item summary')<modal.body.indexOf('Barcode list'));
 await ui.action('stock-aging-view',{view:'overall'});await ui.action('stock-aging-refresh');
 await ui.action('stock-aging-models',{group:'Cutters',unit:'pcs',bucket:'61-120'});
 assert.match(ui.modal('stock-aging-models').sub,/Overall stock/);assert.doesNotMatch(ui.modal('stock-aging-models').sub,/TNWL/);
 assert.match(ui.modal('stock-aging-models').body,/50 pcs/);
});
