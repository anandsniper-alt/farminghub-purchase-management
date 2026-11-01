import {assertLaeStockAccess} from '../shared/lae-stock-costing.mjs';
import {LAE_AGING_ALLOCATION_QUERY_KEYS,LAE_AGING_DIVISIONS,queryLaeAgingAllocation} from '../shared/lae-stock-aging-allocation.mjs';

export function createLaeStockAgingUI(host){
 const {context,api,esc,field,button,head,note,render,navigate,showDialog,renderModal=render}=host;
 let cache=null,cacheKey='',loadingKey='',error='',sequence=0,focus='',focusQuery='',detail=null,detailError='',detailLoading=false,detailSequence=0,detailQuery=null,moreFiltersOpen=null;
 const qty=v=>Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:4});
 const money=v=>v==null?'Pending':Number(v).toLocaleString('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2});
 const query=()=>Object.fromEntries([...new URLSearchParams((location.hash||'').split('?')[1]||'')].filter(([k])=>LAE_AGING_ALLOCATION_QUERY_KEYS.includes(k)));
 const qs=q=>{const p=new URLSearchParams();for(const k of LAE_AGING_ALLOCATION_QUERY_KEYS)if(q[k]!=null&&q[k]!=='')p.set(k,q[k]);return p.toString();};
 const key=()=>JSON.stringify([context().user?.id,context().user?.role,context().user?.scopes])+'|'+qs(query());
 const go=(q,target='',resetMore=false)=>{const disclosure=typeof document!=='undefined'?document.querySelector('.aging-more-filters'):null;if(resetMore)moreFiltersOpen=null;else if(disclosure)moreFiltersOpen=disclosure.open;focus=target;focusQuery=qs(q);detail=null;detailSequence++;navigate('stock-aging'+(qs(q)?'?'+qs(q):''));};
 const getReport=q=>context().sandbox?Promise.resolve(globalThis.FH_LAE_AGING_SNAPSHOT?queryLaeAgingAllocation(globalThis.FH_LAE_AGING_SNAPSHOT,q):{snapshot:null,facets:{},summary:[],groups:[]}):api('/lae-stock-aging?'+qs(q));
 const divisions=()=>LAE_AGING_DIVISIONS.map(id=>({id,label:({TNWL:'TNWL',HYD:'Hyderabad / AP',NORTH:'North / Karnal',FH:'Farming Hub'})[id]||id}));
 const divLabel=id=>divisions().find(d=>d.id===id)?.label||id||'';
 const dateLabel=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(v+'T00:00:00Z')):v||'Pending';
 const scopeLabel=()=>cache?.filters?.view==='allocated'?((cache.divisions||[]).filter(d=>d.selected).map(d=>divLabel(d.id)).join(' · ')||'No divisions selected'):'Overall stock · all forecast items';
 const valueLabel=c=>c.valueInr!=null?money(c.valueInr):!c.rows?money(0):c.quantityOnlyQty&&!c.pendingQty?'Not valued':'Pending';
 async function load(force=false){
  const expected=key();if(!force&&(cacheKey===expected||loadingKey===expected))return;
  const token=++sequence;loadingKey=expected;error='';
  try{assertLaeStockAccess(context().user);const result=await getReport(query());if(token!==sequence||expected!==key())return;cache=result;cacheKey=expected;}
  catch(e){if(token===sequence&&expected===key()){cache=null;error=e.message;cacheKey=expected;}}
  finally{if(token===sequence){loadingKey='';if(context().user&&context().ui.view==='stock-aging'){render();}}}
 }
 function filters(q){
  const allocated=q.view==='allocated',selected=q.divisions==='none'?[]:q.divisions?q.divisions.split(','):divisions().map(d=>d.id);
  const select=(name,label,options)=>field(name,label,q[name]||'','select',{options:[{value:'',label:'All '+label.toLowerCase()},...options.map(value=>({value,label:value}))]});
  return '<section class="panel aging-controls"><div class="panel-body"><div class="aging-view-switch" role="group" aria-label="Stock view">'+
   '<button class="button '+(!allocated?'primary':'ghost')+'" data-action="stock-aging-view" data-view="overall" aria-pressed="'+!allocated+'">Overall stock</button><button class="button '+(allocated?'primary':'ghost')+'" data-action="stock-aging-view" data-view="allocated" aria-pressed="'+allocated+'">Division allocations</button></div>'+
   '<form id="stock-aging-filter"><fieldset class="aging-divisions" '+(!allocated?'hidden':'')+'><legend>Show allocated stock for</legend>'+divisions().map(d=>'<label><input type="checkbox" name="division" value="'+esc(d.id)+'" '+(selected.includes(d.id)?'checked':'')+'>'+esc(d.label)+'</label>').join('')+'<button type="button" class="button ghost" data-action="stock-aging-all">All divisions</button></fieldset>'+
   '<p class="aging-scope-help">'+(allocated?'Choose one or more divisions. Selection shows existing allocations; it does not reassign stock.':'Includes allocated and unallocated stock once. Choose Division allocations to compare planned divisions.')+'</p><div class="aging-main-filters">'+field('q','Search item code or name',q.q||'','search')+select('productGroup','Product category',cache?.facets?.productGroups||[])+
   field('basis','Value basis',q.basis||'revised','select',{options:[{value:'revised',label:'Revised landing cost'},{value:'original',label:'Original landing cost'}]})+
   '<div class="aging-filter-actions"><button class="button primary" type="submit">Search</button>'+button('Reset','stock-aging-reset',{},'ghost')+'</div></div><details class="aging-more-filters" '+((moreFiltersOpen??Boolean(q.unit||(q.asOf&&q.asOf!==cache?.snapshot?.stockDate)))?'open':'')+'><summary>More filters</summary><div class="aging-extra-fields">'+select('unit','Unit',cache?.facets?.units||[])+field('asOf','Age as of',q.asOf||cache?.snapshot?.stockDate||'','date',{attrs:cache?.snapshot?.stockDate?'min="'+esc(cache.snapshot.stockDate)+'"':''})+'</div><p class="aging-scope-help">Changing the age date does not refresh the closing stock or its costs.</p></details></form></div></section>';
 }
 function cell(c,g,b){
  if(!c?.rows)return '<td class="landing-number"><span class="muted">—</span></td>';
  return '<td class="landing-number"><button class="stock-aging-cell aging-value-cell" data-action="stock-aging-models" data-group="'+esc(g.productGroup||'')+'" data-unit="'+esc(g.unit)+'" data-division="'+esc(g.division||'')+'" data-bucket="'+esc(b.id)+'" aria-label="'+esc('View item summary: '+divLabel(g.division)+' '+g.productGroup+', '+b.label+', '+qty(c.quantity)+' '+g.unit)+'"><strong>'+valueLabel(c)+'</strong><span>'+qty(c.quantity)+' '+esc(g.unit)+'</span></button>'+(c.pendingPositiveQty?'<small class="aging-pending">Cost pending: '+qty(c.pendingPositiveQty)+'</small>':'')+'</td>';
 }
 function page(){
  try{assertLaeStockAccess(context().user);}catch(e){return head('LAE Division','LAE Stock Aging','')+note(esc(e.message),'warn');}
  const q=query(),pending=cacheKey!==key();if(pending&&loadingKey!==key())queueMicrotask(()=>load());
  let html=head('LAE Division','LAE Stock Aging','Forecast items by age, product category and planned division.',button('Refresh','stock-aging-refresh',{},'ghost'))+'<div class="landing-page aging-page">'+filters(q);
  if(pending)return html+'<p role="status">Loading stock aging…</p></div>';
  if(focus&&focusQuery===qs(q)){const target=focus,expected=key();requestAnimationFrame(()=>{if(expected===key()&&context().ui.view==='stock-aging')document.querySelector(target)?.focus({preventScroll:true});});}
  if(error)return html+note(esc(error),'warn')+button('Try again','stock-aging-refresh',{},'primary')+'</div>';
  if(!cache?.snapshot)return html+note('No approved forecast and stock snapshot is available. Review mode contains no private stock unless a separate demo snapshot is supplied.')+'</div>';
  const allocated=cache.filters.view==='allocated';
  html+='<div class="aging-report-context"><strong>'+esc(scopeLabel())+'</strong><span>'+esc(cache.filters.basis==='original'?'Original landing cost':'Revised landing cost')+' · INR before GST</span><span>Stock: '+esc(dateLabel(cache.snapshot.stockDate))+' · Age as of: '+esc(dateLabel(cache.filters.asOf))+' · Costs through: '+esc(dateLabel(cache.snapshot.costDate))+'</span>';
  if(cache.snapshot.metadata?.planPeriod)html+='<span class="aging-forecast-period">Forecast: '+esc(cache.snapshot.metadata.planPeriod)+'</span>';
  if(context().sandbox)html+='<span class="aging-demo-label">LOCAL DEMO · Copied stock and forecast; changes stay here.</span>';
  html+='</div>';
  html+=cache.summary.map(s=>'<section class="aging-summary-grid" aria-label="Stock summary in '+esc(s.unit)+'"><div class="panel aging-metric"><span>Stock in this view</span><strong>'+qty(s.quantity)+' '+esc(s.unit)+'</strong></div><div class="panel aging-metric"><span>Known stock value</span><strong>'+valueLabel(s)+'</strong><small>Excludes missing costs</small></div><div class="panel aging-metric"><span>Cost pending</span><strong>'+qty(s.pendingPositiveQty??s.pendingQty)+' '+esc(s.unit)+'</strong><small>Positive stock needing a cost</small></div><div class="panel aging-metric"><span>Age unknown</span><strong>'+qty(s.buckets.unknown?.quantity||0)+' '+esc(s.unit)+'</strong><small>Shown in its own column</small></div></section>').join('');
  html+='<section class="panel aging-report"><div class="panel-head"><div><h2>'+(allocated?'Aging by division and category':'Aging by product category')+'</h2><p>Click an age-band value: item summary first, then barcode details.</p></div><span class="aging-table-hint">Scroll sideways for all age bands →</span></div><div class="table-wrap aging-table-region" role="region" aria-label="LAE stock aging values" tabindex="0"><table class="stock-aging-table"><thead><tr><th scope="col">Product category'+(allocated?' / division':'')+'</th><th scope="col" class="landing-number" aria-sort="descending">Total known value ↓</th>'+cache.buckets.map(b=>'<th scope="col" class="landing-number">'+esc(b.label)+'</th>').join('')+'</tr></thead><tbody>'+cache.groups.map(g=>'<tr><th scope="row" class="aging-row-label">'+esc(g.productGroup)+(allocated?'<span>'+esc(divLabel(g.division))+'</span>':'')+'<small>'+esc(g.unit)+'</small></th><td class="landing-number aging-row-total"><strong>'+valueLabel(g)+'</strong><div>'+qty(g.quantity)+' '+esc(g.unit)+'</div></td>'+cache.buckets.map(b=>cell(g.buckets[b.id],g,b)).join('')+'</tr>').join('')+(!cache.groups.length?'<tr><td colspan="'+(cache.buckets.length+2)+'">No stock matches this selection.</td></tr>':'')+'</tbody><tfoot>'+cache.summary.map(g=>'<tr><th scope="row">Total · '+esc(g.unit)+'</th><td class="landing-number">'+valueLabel(g)+'<div>'+qty(g.quantity)+' '+esc(g.unit)+'</div></td>'+cache.buckets.map(b=>'<td class="landing-number">'+valueLabel(g.buckets[b.id])+'<div>'+qty(g.buckets[b.id].quantity)+' '+esc(g.unit)+'</div></td>').join('')+'</tr>').join('')+'</tfoot></table></div></section>';
  html+=allocationSummary();
  html+='<details class="panel aging-notes"><summary>How to read this report</summary><div class="panel-body"><p>Only items in the forecast are included. Values use physical stock costs; virtual motor additions from the price list are excluded.</p><p>Oldest stock is allocated first. Shortages are shared in proportion to each division’s planned quantity. Selecting fewer divisions does not reassign stock.</p><p>Unknown dates remain in their own column. Missing costs are not zero. Signed adjustments stay in overall stock and are not assigned to a division.</p>'+(cache.snapshot.metadata?.planPeriod?'<p><strong>Forecast period:</strong> '+esc(cache.snapshot.metadata.planPeriod)+'. '+esc(cache.snapshot.metadata.planBasis||'')+'</p>':'')+'</div></details>';
  return html+'</div>';
 }
 function allocationSummary(){
  const totals=new Map();
  for(const v of cache?.allocation?.divisionControls||[]){totals.set(v.division+'|'+v.unit,{division:v.division,unit:v.unit,planned:v.plannedQuantity,allocated:v.allocatedQuantity,shortfall:v.shortfallQuantity});}
  if(!totals.size)return '';
  return '<details class="panel aging-coverage"><summary>Division plans, shortages and unallocated stock</summary><div class="panel-body"><p>All four divisions for the matching items. Remaining stock stays unallocated.</p>'+(cache.allocation?.summary||[]).map(s=>'<p><strong>Unallocated stock: '+qty(s.unallocated.quantity)+' '+esc(s.unit)+'</strong> · '+valueLabel(s.unallocated)+' known value · '+qty(s.unallocated.pendingPositiveQty??s.unallocated.pendingQty)+' cost pending</p>').join('')+'</div><div class="table-wrap" role="region" aria-label="Division allocation coverage" tabindex="0"><table><thead><tr><th>Division</th><th>Unit</th><th class="landing-number">Planned</th><th class="landing-number">Allocated</th><th class="landing-number">Shortfall</th></tr></thead><tbody>'+[...totals.values()].map(t=>'<tr><th scope="row">'+esc(divLabel(t.division))+'</th><td>'+esc(t.unit)+'</td><td class="landing-number">'+qty(t.planned)+'</td><td class="landing-number">'+qty(t.allocated)+'</td><td class="landing-number">'+qty(t.shortfall)+'</td></tr>').join('')+'</tbody></table></div></details>';
 }

 async function loadDetail(q){
  const token=++detailSequence,expected=key();detailQuery=q;detail=null;detailError='';detailLoading=true;showDialog('stock-aging-models',{});
  try{assertLaeStockAccess(context().user);const result=await getReport(q);if(token!==detailSequence||expected!==key())return;detail=result;}
  catch(e){if(token===detailSequence)detailError=e.message;}
  finally{if(token===detailSequence&&expected===key()){detailLoading=false;if(context().ui.modal==='stock-aging-models')renderModal();}}
 }
 function itemSummaryHtml(){
  const s=detail.itemSummary;
  if(!s)return '';
  return '<section class="aging-item-summary"><h3>Item summary</h3><p class="sub">All matching barcodes for the selected age band and division, including barcode pages below.</p><div class="table-wrap" role="region" aria-label="Item summary" tabindex="0"><table><thead><tr><th>Division</th><th>Master code</th><th>Item code / name</th><th class="landing-number">Stock</th><th class="landing-number">Known value</th><th class="landing-number">Cost pending</th></tr></thead><tbody>'+s.rows.map(r=>'<tr><td>'+esc(divLabel(r.division)||'Overall')+'</td><td>'+esc(r.masterCode)+'</td><th scope="row">'+esc(r.brandCode||r.masterCode)+'<div class="sub">'+esc(r.itemName)+'</div></th><td class="landing-number">'+qty(r.quantity)+' '+esc(r.unit)+'</td><td class="landing-number">'+valueLabel(r)+'</td><td class="landing-number">'+qty(r.pendingPositiveQty)+' '+esc(r.unit)+'</td></tr>').join('')+(!s.rows.length?'<tr><td colspan="6">No matching items.</td></tr>':'')+'</tbody><tfoot>'+s.summary.map(r=>'<tr><th colspan="3" scope="row">All matching items total</th><td class="landing-number">'+qty(r.quantity)+' '+esc(r.unit)+'</td><td class="landing-number">'+valueLabel(r)+'</td><td class="landing-number">'+qty(r.pendingPositiveQty)+' '+esc(r.unit)+'</td></tr>').join('')+'</tfoot></table></div>'+(s.pages>1?'<div class="aging-pagination"><button class="button ghost" data-action="stock-aging-item-page" data-page="'+(s.page-1)+'" '+(s.page<=1?'disabled':'')+'>Previous items</button><span>Item page '+s.page+' of '+s.pages+'</span><button class="button ghost" data-action="stock-aging-item-page" data-page="'+(s.page+1)+'" '+(s.page>=s.pages?'disabled':'')+'>Next items</button></div>':'')+'</section><h3 class="aging-barcode-heading">Barcode list</h3>';
 }
 function modal(type){
  assertLaeStockAccess(context().user);if(type!=='stock-aging-models')return {title:'LAE Stock Aging',body:note('Refresh the aging report.')};
  if(detailLoading)return {title:'Stock details',body:'<p role="status">Loading matching stock…</p>'};
  if(detailError)return {title:'Stock details',body:note(esc(detailError),'warn')+button('Try again','stock-aging-detail-retry',{},'primary')};
  if(!detail||cacheKey!==key())return {title:'Stock details',body:note('Refresh the report to view this selection.')};
  const d=detail.drilldown,rows=d.rows||[],bucket=detail.buckets.find(b=>b.id===detailQuery.bucket);
  return {title:(detailQuery.productGroup||'Stock')+' · '+(bucket?.label||'All ages'),sub:(detail.filters.view==='allocated'?(detail.divisions||[]).filter(d=>d.selected).map(d=>divLabel(d.id)).join(' · ')||'No divisions selected':'Overall stock')+' · '+qty(d.total)+' matching stock records · '+(detail.filters.basis==='original'?'Original':'Revised')+' landing cost · INR before GST.',wide:true,body:itemSummaryHtml()+'<div class="table-wrap" role="region" aria-label="Matching stock batches" tabindex="0"><table><thead><tr><th>Division</th><th>Item code / name</th><th>Barcode / batch</th><th>Warehouse</th><th class="landing-number">Age days</th><th class="landing-number">Stock</th><th class="landing-number">Unit cost</th><th class="landing-number">Value</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+esc(divLabel(r.division)||'Overall')+'</td><th scope="row">'+esc(r.brandCode||r.masterCode)+'<div class="sub">'+esc(r.itemName)+'</div></th><td>'+esc(r.batch||r.id)+'</td><td>'+esc(r.warehouse)+'</td><td class="landing-number">'+(r.ageDays==null?'Unknown':qty(r.ageDays))+'</td><td class="landing-number">'+qty(r.quantity)+' '+esc(r.unit)+'</td><td class="landing-number">'+(r.quantityOnly?'Quantity only':money(r.unitCost))+'</td><td class="landing-number">'+(r.quantityOnly?'Not valued':money(r.valueInr))+'</td></tr>').join('')+(!rows.length?'<tr><td colspan="8">No matching stock.</td></tr>':'')+'</tbody></table></div><div class="aging-pagination"><button class="button ghost" data-action="stock-aging-detail-page" data-page="'+(d.page-1)+'" '+(d.page<=1?'disabled':'')+'>Previous barcodes</button><span>Barcode page '+d.page+' of '+d.pages+'</span><button class="button ghost" data-action="stock-aging-detail-page" data-page="'+(d.page+1)+'" '+(d.page>=d.pages?'disabled':'')+'>Next barcodes</button></div>'};
 }
 function values(form){const data=new FormData(form);return Object.fromEntries(['q','productGroup','unit','basis','asOf'].map(k=>[k,String(data.get(k)||'').trim()]));}
 async function formSubmit(e){if(e.target.id!=='stock-aging-filter')return false;go({...query(),...values(e.target)},'#stock-aging-filter [name=q]');return true;}
 async function change(el){if(!el.closest?.('#stock-aging-filter'))return false;
  if(el.name==='division'){const chosen=[...new FormData(el.form).getAll('division')];go({...query(),...values(el.form),view:'allocated',divisions:chosen.join(',')||'none'},'#stock-aging-filter input[value="'+el.value+'"]');return true;}
  if(el.tagName==='SELECT'||el.name==='asOf'){go({...query(),...values(el.form)},'#stock-aging-filter [name="'+el.name+'"]');return true;}return false;
 }
 async function action(name,data={}){if(!name.startsWith('stock-aging-'))return false;assertLaeStockAccess(context().user);
  if(name==='stock-aging-refresh'){focus='';await load(true);}
  if(name==='stock-aging-reset')go({},'#stock-aging-filter [name=q]',true);
  if(name==='stock-aging-view')go({...query(),view:data.view});
  if(name==='stock-aging-all')go({...query(),view:'allocated',divisions:''});
  if(name==='stock-aging-models'&&cache&&cacheKey===key())await loadDetail({...query(),bucket:data.bucket,productGroup:data.group,unit:data.unit,...(data.division?{divisions:data.division}:{}),page:'1',itemPage:'1',pageSize:'50'});
  if(name==='stock-aging-item-page'&&detailQuery)await loadDetail({...detailQuery,itemPage:String(data.page)});
  if(name==='stock-aging-detail-page'&&detailQuery)await loadDetail({...detailQuery,page:String(data.page)});
  if(name==='stock-aging-detail-retry'&&detailQuery)await loadDetail(detailQuery);
  return true;
 }
 return {page,modal,action,formSubmit,change};
}
