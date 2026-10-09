import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRoRecord} from '../shared/ro-costing.mjs';
import {queryLandingPrices,projectLandingPriceRows} from '../shared/landing-prices.mjs';
import {createLandingPricesUI} from '../web/landing-prices.mjs';

const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const fixture=(ro='SYNTHETIC-1',quantity=10,price=20,unit='pcs',rate=100)=>validateRoRecord({ro,supplier:'Synthetic vendor',inwardDate:'2026-09-18',invoices:[{supplier:'Synthetic vendor',invoice:'CI-'+ro,currency:'USD',goods:quantity*price,extras:0,face:quantity*price}],actuals:{supplierInr:quantity*price*rate,bankNet:0,forwarderNet:0,otherNet:0,bcd:0,sws:0,currencyConfirmed:true,expenseCoverage:'Complete',confirmation:'Synthetic verified fixture.'},purchaseItems:{version:1,basis:'Synthetic fixture',reviewedOn:'2026-10-08',rows:[{id:'row-1',supplier:'Synthetic vendor',invoice:'CI-'+ro,itemCode:'GJ-PW8',masterCode:'PW8',description:'Synthetic power weeder',productGroup:'Power weeder',quantity,unit,currency:'USD',unitPrice:price,usdUnitPrice:price,status:'Verified reference',source:{file:'synthetic.xlsx',row:'2'}}]}});
function hostFor(records,sandbox=false){
 const context={user:{id:'admin',role:'ADMIN',scopes:['LAE_IMPORT']},state:{items:[]},ui:{view:'landing-prices'},sandbox},calls=[];
 const entries=Object.fromEntries(records.map(record=>[record.ro,{record,revision:1}]));
 globalThis.location={hash:'#/landing-prices'};globalThis.localStorage={getItem:()=>JSON.stringify(entries)};globalThis.requestAnimationFrame=()=>{};
 const host={context:()=>context,reviewStore:'synthetic',api:async path=>{calls.push(path);const query=Object.fromEntries(new URLSearchParams(path.split('?')[1]));return queryLandingPrices(records.flatMap(record=>projectLandingPriceRows(record,context.state)),query,{totalRos:records.length,rosWithItems:records.length,rosWithoutItems:0});},esc:escape,field:(name,label,value,type,opt={})=>'<label>'+escape(label)+'<input name="'+escape(name)+'" value="'+escape(value)+'"></label>',head:(eyebrow,title,sub,actions='')=>'<h1>'+title+'</h1>'+actions,button:(label,action,data={})=>'<button data-action="'+escape(action)+'">'+label+'</button>',note:body=>'<p>'+body+'</p>',badge:label=>'<span>'+escape(label)+'</span>',render:()=>{},navigate:path=>{location.hash='#/'+path;}};
 return {host,context,calls};
}
for(const sandbox of [false,true])test(`landing screen uses filtered totals, preserves quantity and escapes sources (${sandbox?'standalone':'server'})`,async()=>{
 const records=[fixture(),fixture('SYNTHETIC-2',30,40,'pcs',110)];records[0].purchaseItems.rows[0].description='<img src=x onerror=alert(1)>';
 const {host,calls}=hostFor(records,sandbox),ui=createLandingPricesUI(host);location.hash='#/landing-prices?pageSize=1';await ui.action('landing-refresh',{});const html=ui.page();
 assert.match(html,/40 pcs priced · 0 pcs pending excluded/);assert.match(html,/\$35\.00/);assert.match(html,/₹3,800\.00/);assert.match(html,/108\.5714/);assert.match(html,/Showing 1–1 of 2/);assert.match(html,/Purchase \/ inward quantity/);
 assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);assert.doesNotMatch(html,/<img/);assert.match(html,/href="#\/ro-costings\/SYNTHETIC-1"/);assert.equal(calls.length,sandbox?0:1);assert.match(html,/Download Excel/);assert.match(html,/Download PDF/);if(sandbox){assert.match(html,/data-format="xlsx" disabled/);assert.match(html,/Sign in to download/);}else assert.doesNotMatch(html,/data-format="xlsx" disabled/);
 await ui.action('landing-sort',{field:'usdUnit'});assert.match(location.hash,/pageSize=1/);assert.match(location.hash,/sort=usdUnit/);assert.match(location.hash,/direction=asc/);await ui.action('landing-refresh',{});
 const saved=location.hash;location.hash='#/ro-costings/SYNTHETIC-1';location.hash=saved;assert.match(ui.page(),/aria-sort="ascending"/);
 await ui.action('landing-page',{page:2});await ui.action('landing-refresh',{});assert.match(ui.page(),/Showing 2–2 of 2/);assert.match(ui.page(),/\$35\.00/);
 await ui.action('landing-reset',{});assert.equal(location.hash,'#/landing-prices');
});
test('pending rows do not become zero prices and different units get separate average rows',async()=>{
 const pending=fixture('SYNTHETIC-PENDING',12,20);pending.actuals={};const {host}=hostFor([fixture(),fixture('SYNTHETIC-SETS',2,100,'sets'),pending]);const ui=createLandingPricesUI(host);await ui.action('landing-refresh',{});const html=ui.page();
 assert.match(html,/Separate averages by unit/);assert.match(html,/Weighted averages by unit/);assert.match(html,/Pending/);assert.match(html,/>12<\/td>/);assert.match(html,/>sets<\/td>/);assert.match(html,/>By unit<\/strong>/);
 location.hash='#/landing-prices?unit=pcs';await ui.action('landing-refresh',{});const pcs=ui.page();assert.match(pcs,/10 pcs priced · 12 pcs pending excluded/);assert.match(pcs,/\$20\.00/);assert.match(pcs,/₹2,000\.00/);assert.doesNotMatch(pcs,/Weighted averages by unit/);
});
test('landing authorization blocks API reads and errors retain reset/retry controls',async()=>{
 const {host,context,calls}=hostFor([fixture()]);context.user={id:'vendor',role:'VENDOR',scopes:[]};const denied=createLandingPricesUI(host);assert.match(denied.page(),/access|required|authorized/i);assert.equal(calls.length,0);
 context.user={id:'admin',role:'ADMIN',scopes:['LAE_IMPORT']};host.api=async()=>{throw Error('Synthetic network failure <private>');};const ui=createLandingPricesUI(host);await ui.action('landing-refresh',{});const html=ui.page();assert.match(html,/Synthetic network failure &lt;private&gt;/);assert.match(html,/Try again/);assert.match(html,/Reset/);assert.doesNotMatch(html,/<private>/);
});


test('loading and empty results show no stale totals',async()=>{
 const {host}=hostFor([]),ui=createLandingPricesUI(host);assert.match(ui.page(),/Loading landing prices/);await ui.action('landing-refresh',{});const html=ui.page();assert.match(html,/No matching landing prices/);assert.match(html,/Showing 0–0 of 0/);assert.match(html,/Pending/);assert.doesNotMatch(html,/₹0.00/);
 location.hash='#/landing-prices?q=does-not-exist';const loading=ui.page();assert.match(loading,/Loading landing prices/);assert.doesNotMatch(loading,/landing-price-summary/);await ui.action('landing-refresh',{});
});

test('download uses the complete selected query and standalone never contacts the server',async()=>{
 const {host}=hostFor([fixture()]),ui=createLandingPricesUI(host),fetchOriginal=globalThis.fetch,URLOriginal=globalThis.URL,documentOriginal=globalThis.document;
 const requests=[],links=[];globalThis.fetch=async url=>{requests.push(url);return {ok:true,blob:async()=>({type:'synthetic'})};};globalThis.URL={createObjectURL:()=> 'blob:synthetic',revokeObjectURL:()=>{}};globalThis.document={createElement:()=>({click(){links.push({href:this.href,download:this.download});},remove(){}}),body:{append(){}}};
 try{location.hash='#/landing-prices?year=2026&month=09&supplier=Synthetic+vendor&masterCode=PW8&unit=pcs&sort=usdUnit&direction=asc&page=2&pageSize=1';await ui.action('landing-export',{format:'xlsx'});assert.equal(requests.length,1);assert.match(requests[0],/^\/api\/landing-prices\/export.xlsx\?/);assert.match(requests[0],/supplier=Synthetic\+vendor/);assert.match(requests[0],/masterCode=PW8/);assert.match(requests[0],/sort=usdUnit/);assert.equal(links[0].download,'LAE_Landing_Prices.xlsx');
 const review=hostFor([fixture()],true),reviewUi=createLandingPricesUI(review.host);await reviewUi.action('landing-export',{format:'pdf'});assert.equal(requests.length,1);
 }finally{globalThis.fetch=fetchOriginal;globalThis.URL=URLOriginal;globalThis.document=documentOriginal;}
});

test('an inflight landing read cannot render private results after sign out',async()=>{
 const {host,context}=hostFor([fixture()]);let resolveRequest,renders=0;host.api=()=>new Promise(resolve=>{resolveRequest=resolve;});host.render=()=>{renders++;};const ui=createLandingPricesUI(host),pending=ui.action('landing-refresh',{});context.user=null;resolveRequest(queryLandingPrices(projectLandingPriceRows(fixture())));await pending;assert.equal(renders,0);
});
