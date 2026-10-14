/** Empty analytics workspace. No source data or purchase commands are loaded. */
export const LAE_ANALYTICS_SECTIONS=[['overview','Overview','grid'],['targets','Annual plan & sales','money'],['stock','Stock & pipeline','box'],['purchases','Purchase requirements','orders'],['sources','Data sources','file']];
export const LAE_ANALYTICS_CENTRES=['B2C - TN','B2B - TN','B2B - AP / TS','B2B - Karnal'];

export function createLaeSalesAnalyticsUI({context,esc,head,icon,render}){
 const selection={centre:'',month:''};
 const metrics=[['Annual target','Annual business plan'],['Net sales','Sales and returns'],['Available stock','Dated stock snapshot'],['Pipeline quantity','Open purchases and arrival dates'],['Purchase requirement','Item-wise demand and supply']];
 const sources=[['Annual business plan','Financial year, cost centre, segment, target quantity and target value.'],['Monthly forecast','Month, cost centre, item code and forecast quantity.'],['Sales','Date, cost centre, item code, quantity, sales value and returns.'],['Stock','Snapshot date, warehouse, item code and available quantity.'],['Pipeline','Purchase reference, item code, pending quantity and expected arrival date.'],['Product classification','Main segment, product category, engine or specification, grade and item code.']];
 const section=()=>LAE_ANALYTICS_SECTIONS.some(([id])=>id===context().ui.orderId)?context().ui.orderId:'overview';
 const empty=(title,body)=>'<div class="analytics-empty">'+icon('box',30)+'<h2>'+esc(title)+'</h2><p>'+esc(body)+'</p><a class="button" href="#/lae-sales-analytics/sources">View required data</a></div>';
 const columns={targets:['Cost centre','Main segment','Product category','Annual target','Monthly forecast','Net sales','Achievement'],stock:['Product category','Engine / specification','Grade','Item code','Warehouse','Available stock','Pipeline','Expected arrival'],purchases:['Product category','Engine / specification','Grade','Item code','Remaining demand','Available supply','Purchase quantity']};
 function page(){
  const active=section(),label=LAE_ANALYTICS_SECTIONS.find(([id])=>id===active)[1];
  const controls='<div class="analytics-filters"><label for="lae-analytics-centre">Cost centre<select id="lae-analytics-centre"><option value="">All cost centres</option>'+LAE_ANALYTICS_CENTRES.map(x=>'<option'+(selection.centre===x?' selected':'')+'>'+esc(x)+'</option>').join('')+'</select></label><label for="lae-analytics-month">Month<input type="month" id="lae-analytics-month" value="'+esc(selection.month)+'"></label><p class="analytics-selection" role="status">'+esc(selection.centre||'All cost centres')+' · '+esc(selection.month||'All months')+' · No data added</p></div>';
  const tabs='<nav class="analytics-tabs" aria-label="Analytics sections">'+LAE_ANALYTICS_SECTIONS.map(([id,title])=>'<a href="#/lae-sales-analytics/'+id+'"'+(id===active?' aria-current="page"':'')+'>'+esc(title)+'</a>').join('')+'</nav>';
  let content;
  if(active==='overview')content='<div class="analytics-metrics">'+metrics.map(([title,source])=>'<article class="panel analytics-metric"><h2>'+esc(title)+'</h2><strong aria-label="Not available">—</strong><p>Awaiting '+esc(source.toLowerCase())+'</p></article>').join('')+'</div><section class="panel">'+empty('Your analytics workspace is ready','Add the business plan, forecast, sales, stock and pipeline data to begin the analysis.')+'</section><section class="panel analytics-rules"><h2>Reporting structure</h2><p>Main segment → Product category → Engine / specification → Grade → Item code / model</p><p>Reports combine brands. Purchase requirements remain separate for each item code.</p><p>Chennai is a shared warehouse. Its stock is counted once across the four cost centres.</p></section>';
  else if(active==='sources')content='<section class="panel analytics-rules"><h2>No data has been added</h2><p>This release provides the workspace structure. Data import and calculations will be enabled when the source formats and mappings are confirmed.</p></section><div class="analytics-sources">'+sources.map(([title,detail])=>'<article class="panel analytics-source"><span class="badge">Awaiting data</span><h2>'+esc(title)+'</h2><p>'+esc(detail)+'</p></article>').join('')+'</div>';
  else content='<section class="panel analytics-register"><h2>'+esc(label)+'</h2><div class="analytics-table" role="region" aria-label="'+esc(label)+' register" tabindex="0"><table><thead><tr>'+columns[active].map(x=>'<th scope="col">'+esc(x)+'</th>').join('')+'</tr></thead><tbody><tr><td colspan="'+columns[active].length+'">No data added for this view.</td></tr></tbody></table></div>'+empty(active==='targets'?'Targets and sales are awaiting data':active==='stock'?'Stock and pipeline are awaiting data':'Purchase quantities are not yet available',active==='purchases'?'Requirements will be calculated for each item code using demand, usable stock and pipeline due in the selected period. Surplus on another model will not offset its shortage.':'Choose Data sources to see the inputs needed for this view.')+'</section>';
  return '<div class="lae-analytics">'+head('LAE Division','LAE Sales Analytics','Sales performance, stock coverage and purchase requirements.')+tabs+controls+content+'</div>';
 }
 function change(el){
  if(context().ui.view!=='lae-sales-analytics')return false;
  if(el.id==='lae-analytics-centre')selection.centre=LAE_ANALYTICS_CENTRES.includes(el.value)?el.value:'';
  else if(el.id==='lae-analytics-month')selection.month=/^\d{4}-(0[1-9]|1[0-2])$/.test(el.value)?el.value:'';
  else return false;
  render();globalThis.document?.getElementById(el.id)?.focus();return true;
 }
 return {page,change};
}
