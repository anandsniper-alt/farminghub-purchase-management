import {createSalesUI} from './sales-ui.mjs';
import {createPlanningUI} from './planning-ui.mjs';
/** Read-only analytics views. Private source data is fetched through the scoped API. */
export const LAE_ANALYTICS_SECTIONS=[['overview','Purchasing overview','grid'],['purchases','Purchase requirements','orders'],['months','Monthly buying plan','orders'],['plan','ABP & remaining demand','money'],['issues','Gaps & decisions','file'],['targets','Sales history','money'],['stock','Stock & pipeline','box'],['sources','Data sources','file']];
export const LAE_ANALYTICS_CENTRES=['B2C - TN','B2B - TN','B2B - AP / TS','B2B - Karnal'];

export function createLaeSalesAnalyticsUI({context,esc,head,icon,render,api}){
 const sales=createSalesUI({context,esc,render,api});
 const planning=createPlanningUI({context,esc,render,api}),planningSections=['overview','purchases','months','plan','issues'];
 const selection={centre:'',month:''};
 const query={category:'',engine:'',grade:'',search:'',level:'category',offset:0};
 let result=null,error='',requestKey='',requestNumber=0,owner='';
 const identity=()=>JSON.stringify([context().user?.id,context().user?.role,context().user?.scopes,context().user?.active]);
 const syncOwner=()=>{const next=identity();if(next!==owner){owner=next;result=null;error='';requestKey='';requestNumber++;Object.assign(query,{category:'',engine:'',grade:'',search:'',level:'category',offset:0});}};
 const format=value=>value===null||value===undefined?'—':Number(value).toLocaleString('en-IN');
 const measure=value=>!value?'—':format(value.quantity)+(value.missing?' + '+value.missing+' unknown':'');
 const actionButton=(label,action,extra='')=>'<button type="button" class="button ghost" data-action="lae-analytics-'+action+'" '+extra+'>'+esc(label)+'</button>';
 const sourceNote=()=>'<section class="panel analytics-rules"><h2>MASTER balances</h2><p>'+esc(result.meta.fileName)+' · '+result.sourceItems+' item codes. Stock cutoff is not confirmed; the stock balance stays fixed when the pipeline month changes.</p><p>Chennai is shared stock, counted once in the all-centre total. For a selected cost centre, Chennai is shown separately and is not allocated to it. Pipeline is shared and unallocated.</p><p>'+esc(result.meta.periodNote)+'</p></section>';
 const exceptions=()=>'<details class="panel analytics-rules"><summary>Source discrepancies — reported balances retained ('+result.exceptions.length+')</summary>'+result.exceptions.map(e=>'<p><b>'+esc(e.item)+'</b> — '+esc(e.detail)+' <span class="muted">'+esc(e.source)+'</span></p>').join('')+'</details>';
 const cards=()=>'<div class="analytics-metrics">'+[['Reported stock',result.totals.stock,selection.centre||'MASTER total; includes shared Chennai'],['Shared Chennai stock',result.totals.shared,selection.centre?'Separate; not allocated to this centre':'Already included in reported stock'],['Pipeline quantity',result.totals.pipeline,(selection.month||'All source months')+' · shared / unallocated']].map(([title,v,note])=>'<article class="panel analytics-metric"><h2>'+title+'</h2><strong>'+measure(v)+'</strong><p>'+esc(note)+'</p></article>').join('')+'</div>';
 function stockReport(){
  const levels=['category','engine','grade','item'],labels={category:'Product category',engine:'Engine / blade / specification',grade:'Grade',item:'Item code / model'};
  const crumbs=actionButton('All categories','level','data-level="category"')+['category','engine','grade'].filter(k=>query[k]).map((k,i)=>'<span> / </span>'+actionButton(query[k],'level','data-level="'+levels[i+1]+'"')).join('');
  const rows=result.rows.map((r,i)=>'<tr><th scope="row">'+(query.level==='item'?esc(r.label)+'<div class="sub">'+esc(r.model)+'</div><details><summary>Source and warehouses</summary><p>'+esc(r.description)+'</p><p>MASTER row '+r.sourceRow+' · Stock CD'+r.sourceRow+' · Pipeline BU'+r.sourceRow+'</p>'+['B2C - TN','B2B - TN','B2B - AP / TS','B2B - Karnal','Shared Chennai'].map((n,j)=>'<p>'+n+': '+format(r.locations[j])+'</p>').join('')+'</details>':actionButton(r.label,'drill','data-index="'+i+'"'))+'</th><td>'+r.items+'</td><td>'+measure(r.stock)+'</td><td>'+measure(r.shared)+'</td><td>'+measure(r.pipeline)+'</td></tr>').join('');
  return cards()+sourceNote()+'<section class="panel analytics-register"><h2>Stock & pipeline by '+labels[query.level].toLowerCase()+'</h2><div class="analytics-report-tools"><nav aria-label="Stock reporting hierarchy">'+crumbs+'</nav><label for="lae-analytics-search">Find an item or model<input type="search" id="lae-analytics-search" value="'+esc(query.search)+'" maxlength="200" placeholder="Item code, model or category"></label>'+actionButton('Refresh','refresh')+'</div><div class="analytics-table" role="region" aria-label="Stock and pipeline grouped register" tabindex="0"><table><thead><tr><th scope="col">'+labels[query.level]+'</th><th scope="col">Item codes</th><th scope="col">Reported stock</th><th scope="col">Shared Chennai</th><th scope="col">Pipeline (unallocated)</th></tr></thead><tbody>'+rows+(rows?'':'<tr><td colspan="5">No matching items.</td></tr>')+'</tbody></table></div><div class="analytics-report-tools"><span>'+result.total+' groups / items · '+result.totals.items+' item codes in this selection</span>'+(query.offset?actionButton('Previous','page','data-offset="'+Math.max(0,query.offset-50)+'"'):'')+(result.nextOffset!==null?actionButton('Next','page','data-offset="'+result.nextOffset+'"'):'')+'</div></section>'+exceptions();
 }
 function invalidate(focus){result=null;error='';requestKey='';requestNumber++;render();if(focus)globalThis.document?.getElementById(focus)?.focus();}
 const renderResult=()=>{const focus=globalThis.document?.activeElement?.id;render();if(focus?.startsWith('lae-analytics-'))globalThis.document?.getElementById(focus)?.focus();};
 function afterRender(){
  if(planningSections.includes(context().ui.orderId)&&api&&!context().sandbox){planning.afterRender();return;}
  if(context().ui.orderId==='targets'&&api&&!context().sandbox){sales.afterRender();return;}
  syncOwner();if(!api||context().sandbox||context().ui.view!=='lae-sales-analytics')return;
  const params=new URLSearchParams({...selection,...query}),key=owner+'|'+params;if(requestKey===key)return;requestKey=key;const number=++requestNumber,actor=owner;
  api('/lae-analytics/workspace?'+params).then(data=>{if(number!==requestNumber||actor!==identity())return;result=data;error='';if(context().ui.view==='lae-sales-analytics')renderResult();}).catch(e=>{if(number!==requestNumber||actor!==identity())return;result=null;error=e.message||'Stock data could not be loaded.';if(context().ui.view==='lae-sales-analytics')renderResult();});
 }
 function action(name,data){
  if(planningSections.includes(context().ui.orderId)&&planning.action(name,data))return true;
  if(context().ui.orderId==='targets'&&sales.action(name,data))return true;
  if(!name.startsWith('lae-analytics-')||context().ui.view!=='lae-sales-analytics')return false;
  if(name==='lae-analytics-drill'){const row=result?.rows[Number(data.index)],levels=['category','engine','grade','item'],index=levels.indexOf(query.level);if(!row||index<0||index>=3)return true;query[query.level]=row.key;query.level=levels[index+1];query.offset=0;}
  else if(name==='lae-analytics-level'){const index=['category','engine','grade','item'].indexOf(data.level);if(index<0)return true;query.level=data.level;['category','engine','grade'].slice(index).forEach(k=>query[k]='');query.offset=0;}
  else if(name==='lae-analytics-page'){const n=Number(data.offset);if(!Number.isSafeInteger(n)||n<0)return true;query.offset=n;}
  else if(name!=='lae-analytics-refresh')return false;
  invalidate();return true;
 }
 const metrics=[['Annual target','Annual business plan'],['Net sales','Sales and returns'],['Available stock','Dated stock snapshot'],['Pipeline quantity','Open purchases and arrival dates'],['Purchase requirement','Item-wise demand and supply']];
 const sources=[['Annual business plan','Financial year, cost centre, segment, target quantity and target value.'],['Monthly forecast','Month, cost centre, item code and forecast quantity.'],['Sales','Date, cost centre, item code, quantity, sales value and returns.'],['Stock','Snapshot date, warehouse, item code and available quantity.'],['Pipeline','Purchase reference, item code, pending quantity and expected arrival date.'],['Product classification','Main segment, product category, engine or specification, grade and item code.']];
 const section=()=>LAE_ANALYTICS_SECTIONS.some(([id])=>id===context().ui.orderId)?context().ui.orderId:'overview';
 const empty=(title,body)=>'<div class="analytics-empty">'+icon('box',30)+'<h2>'+esc(title)+'</h2><p>'+esc(body)+'</p><a class="button" href="#/lae-sales-analytics/sources">View required data</a></div>';
 const columns={targets:['Cost centre','Main segment','Product category','Annual target','Monthly forecast','Net sales','Achievement'],stock:['Product category','Engine / blade / specification','Grade','Item code','Warehouse','Available stock','Pipeline','Expected arrival'],purchases:['Product category','Engine / blade / specification','Grade','Item code','Remaining demand','Available supply','Purchase quantity']};
 function page(){
  syncOwner();
  const active=section(),label=LAE_ANALYTICS_SECTIONS.find(([id])=>id===active)[1];
  const controls='<div class="analytics-filters"><label for="lae-analytics-centre">Cost centre<select id="lae-analytics-centre"><option value="">All cost centres</option>'+LAE_ANALYTICS_CENTRES.map(x=>'<option'+(selection.centre===x?' selected':'')+'>'+esc(x)+'</option>').join('')+'</select></label><label for="lae-analytics-month">Month<input type="month" id="lae-analytics-month" value="'+esc(selection.month)+'"></label><p class="analytics-selection" role="status">'+esc(selection.centre||'All cost centres')+' · '+esc(selection.month||'All months')+' · No data added</p></div>';
  const tabs='<nav class="analytics-tabs" aria-label="Analytics sections">'+LAE_ANALYTICS_SECTIONS.map(([id,title])=>'<a href="#/lae-sales-analytics/'+id+'"'+(id===active?' aria-current="page"':'')+'>'+esc(title)+'</a>').join('')+'</nav>';
  if(planningSections.includes(active)&&api&&!context().sandbox)return '<div class="lae-analytics">'+head('Farming Hub','LAE Sales Analytics','Purchasing guidance by category, engine / blade, grade and item code.')+tabs+planning.page()+'</div>';
  if(active==='targets'&&api&&!context().sandbox)return '<div class="lae-analytics">'+head('Farming Hub','LAE Sales Analytics','Monthly sales by engine, blade specification and grade.')+tabs+sales.page()+'</div>';
  let content;
  if(active==='overview')content='<div class="analytics-metrics">'+metrics.map(([title,source])=>'<article class="panel analytics-metric"><h2>'+esc(title)+'</h2><strong aria-label="Not available">—</strong><p>Awaiting '+esc(source.toLowerCase())+'</p></article>').join('')+'</div><section class="panel">'+empty('Your analytics workspace is ready','Add the business plan, forecast, sales, stock and pipeline data to begin the analysis.')+'</section><section class="panel analytics-rules"><h2>Reporting structure</h2><p>Main segment → Product category → Engine / blade / specification → Grade → Item code / model</p><p>Reports combine brands. Purchase requirements remain separate for each item code.</p><p>Chennai is a shared warehouse. Its stock is counted once across the four cost centres.</p></section>';
  else if(active==='sources')content='<section class="panel analytics-rules"><h2>No data has been added</h2><p>This release provides the workspace structure. Data import and calculations will be enabled when the source formats and mappings are confirmed.</p></section><div class="analytics-sources">'+sources.map(([title,detail])=>'<article class="panel analytics-source"><span class="badge">Awaiting data</span><h2>'+esc(title)+'</h2><p>'+esc(detail)+'</p></article>').join('')+'</div>';
  else {const cols=columns[active]||columns.purchases;content='<section class="panel analytics-register"><h2>'+esc(label)+'</h2><div class="analytics-table" role="region" aria-label="'+esc(label)+' register" tabindex="0"><table><thead><tr>'+cols.map(x=>'<th scope="col">'+esc(x)+'</th>').join('')+'</tr></thead><tbody><tr><td colspan="'+cols.length+'">No data added for this view.</td></tr></tbody></table></div>'+empty(active==='targets'?'Targets and sales are awaiting data':active==='stock'?'Stock and pipeline are awaiting data':'Purchase quantities are not yet available',active==='purchases'?'Requirements will be calculated for each item code using demand, usable stock and pipeline due in the selected period. Surplus on another model will not offset its shortage.':'Choose Data sources to see the inputs needed for this view.')+'</section>';}
  if(result?.meta&&result.totals){
   if(active==='stock')content=stockReport();
   else if(active==='overview')content=cards()+'<section class="panel analytics-rules"><h2>Stock and pipeline are ready</h2><p>Explore category, engine/specification, grade and item code. Open Annual plan &amp; sales for monthly comparisons and ABP achievement. Purchase requirements await item-wise target allocation.</p><a class="button" href="#/lae-sales-analytics/stock">Open stock & pipeline</a></section>'+sourceNote();
   else if(active==='sources')content=sourceNote()+'<section class="panel analytics-rules"><h2>Source coverage</h2><p>Stock, pipeline and product classification are loaded from MASTER. Sales history retains its original reconciliation. ABP &amp; remaining demand adds provisional B2C and North closure plans. Purchase requirements use the separately imported MASTER monthly forecast; missing allocations and source issues are listed under Gaps &amp; decisions. Higher-level main segments remain unassigned.</p><p>Source SHA256: <span class="analytics-hash">'+esc(result.meta.sha256)+'</span></p><p>Imported '+esc(result.importedAt)+'.</p></section>'+exceptions();
  }
  if(error)content='<section class="panel analytics-rules" role="alert"><h2>Stock data unavailable</h2><p>'+esc(error)+'</p>'+actionButton('Retry','refresh')+'</section>'+(['targets','purchases'].includes(active)?content:'');
  else if(api&&!context().sandbox&&!result&&['overview','stock','sources'].includes(active))content='<section class="panel analytics-rules" role="status">Loading MASTER balances…</section>';
  const status=error?'Data unavailable':result?.meta?'MASTER balances loaded':api&&!context().sandbox&&!result?'Loading data':'No data added';
  return '<div class="lae-analytics">'+head('Farming Hub','LAE Sales Analytics','Sales performance, stock coverage and purchase requirements.')+tabs+controls.replace('No data added',status).replace('>Month<input','>Pipeline month<input')+content+'</div>';
 }
 function change(el){
  if(planningSections.includes(context().ui.orderId)&&planning.change(el))return true;
  if(context().ui.orderId==='targets'&&sales.change(el))return true;
  if(context().ui.view!=='lae-sales-analytics')return false;
  if(el.id==='lae-analytics-centre')selection.centre=LAE_ANALYTICS_CENTRES.includes(el.value)?el.value:'';
  else if(el.id==='lae-analytics-month')selection.month=/^\d{4}-(0[1-9]|1[0-2])$/.test(el.value)?el.value:'';
  else if(el.id==='lae-analytics-search'){query.search=String(el.value||'').slice(0,200);query.offset=0;}
  else return false;
  query.offset=0;invalidate(el.id);return true;
 }
 return {page,change,action,afterRender};
}
