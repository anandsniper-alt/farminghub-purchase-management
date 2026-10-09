import {assertRoCostAccess} from '../shared/ro-costing.mjs';
import {projectLandingPriceRows,queryLandingPrices} from '../shared/landing-prices.mjs';

const landingFilterKeys=['q','year','month','supplier','product','masterCode','brand','unit','status','page','pageSize','sort','direction'];
const landingMonthNames=['January','February','March','April','May','June','July','August','September','October','November','December'];

export function createLandingPricesUI(host){
 const {context,api,esc,field,button,head,note,badge,render,navigate}=host;
 let cache=null,cacheKey='',loadingKey='',error='',requestId=0,focusAfter='',exporting=false;
 const number=(value,digits=2)=>value===null||value===undefined||!Number.isFinite(Number(value))?'Pending':Number(value).toLocaleString('en-IN',{minimumFractionDigits:digits,maximumFractionDigits:digits});
 const quantity=value=>value===null||value===undefined?'Pending':Number(value).toLocaleString('en-IN',{maximumFractionDigits:4});
 const money=(value,symbol)=>value===null||value===undefined?'Pending':symbol+number(value);
 const query=()=>{const params=new URLSearchParams((location.hash||'').split('?')[1]||'');return Object.fromEntries(landingFilterKeys.filter(key=>params.has(key)).map(key=>[key,params.get(key)]));};
 const queryString=values=>{const params=new URLSearchParams();for(const key of landingFilterKeys)if(values[key]!==undefined&&values[key]!==null&&values[key]!=='')params.set(key,String(values[key]));return params.toString();};
 const key=()=>(context().user?.id||'')+'|'+queryString(query());
 function go(values,focus=''){focusAfter=focus;const path='landing-prices'+(queryString(values)?'?'+queryString(values):'');navigate(path);}
 function localResult(values){
  const entries=Object.values(JSON.parse(localStorage.getItem(host.reviewStore+':ro-costings:'+context().user.id)||'{}'));
  const rows=entries.flatMap(entry=>projectLandingPriceRows(entry.record,context().state));
  const coverage={totalRos:entries.length,rosWithItems:entries.filter(entry=>entry.record.purchaseItems?.rows?.length).length,totalRows:rows.length};coverage.rosWithoutItems=coverage.totalRos-coverage.rosWithItems;
  return queryLandingPrices(rows,values,coverage);
 }
 async function load(force=false){
  const expected=key();if(!force&&(loadingKey===expected||cacheKey===expected))return;
  const token=++requestId;loadingKey=expected;error='';
  try{
   assertRoCostAccess(context().user);
   const result=context().sandbox?localResult(query()):await api('/landing-prices?'+queryString(query()));
   if(token!==requestId||expected!==key())return;
   cache=result;cacheKey=expected;
  }catch(e){if(token===requestId&&expected===key()){cache=null;error=e.message;cacheKey=expected;}}
  finally{if(token===requestId){loadingKey='';if(context().user&&context().ui.view==='landing-prices'){render();if(focusAfter){const selector=focusAfter;focusAfter='';requestAnimationFrame(()=>document.querySelector(selector)?.focus({preventScroll:true}));}}}}
 }
 const displayDate=value=>value?new Date(value+'T12:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'Pending';
 function filterSelect(name,label,values,selected,labels={}){
  const options=[{value:'',label:'All '+label.toLowerCase()}];for(const value of values||[])options.push({value,label:labels[value]||(value==='__missing__'?'Pending':value)});
  if(selected&&!options.some(option=>String(option.value)===String(selected)))options.push({value:selected,label:labels[selected]||(selected==='__missing__'?'Pending':selected)});
  return field(name,label,selected||'','select',{options});
 }
 function filters(values){const facets=cache?.facets||{},months=Object.fromEntries(Array.from({length:12},(_,i)=>[String(i+1).padStart(2,'0'),landingMonthNames[i]]));
  return '<section class="panel landing-filters"><form id="landing-price-filter" class="panel-body"><div class="landing-filter-grid">'+field('q','Search items, RO or invoice',values.q||'','search',{attrs:'placeholder="Code, name, model, supplier…"'})+filterSelect('year','Year',facets.years,values.year)+filterSelect('month','Month',facets.months,values.month,months)+filterSelect('supplier','Supplier',facets.suppliers,values.supplier)+filterSelect('product','Product group',facets.products,values.product)+filterSelect('masterCode','Master code',facets.masterCodes,values.masterCode)+filterSelect('brand','Brand',facets.brands,values.brand)+filterSelect('unit','Unit',facets.units,values.unit)+filterSelect('status','Cost status',facets.statuses,values.status)+'<div class="landing-filter-actions"><button class="button primary" type="submit">Apply</button>'+button('Reset','landing-reset',{},'ghost')+'</div></div></form></section>';
 }
 const columns=[['ro','RO#'],['inwardDate','Inward date'],['vendorName','Vendor name'],['itemName','Item name'],['masterCode','Master code'],['brandCode','Brand code'],['brand','Brand'],['usdUnit','USD / unit'],['aiInrPerUsd','AI INR / USD'],['inrUnitBeforeGst','INR / unit before GST'],['quantity','Qty']];
 function table(values){
  const sort=values.sort||'inwardDate',direction=values.direction||'desc';
  const headers=columns.map(([id,label])=>'<th scope="col"'+(['usdUnit','aiInrPerUsd','inrUnitBeforeGst','quantity'].includes(id)?' class="landing-number"':'')+' aria-sort="'+(sort===id?(direction==='desc'?'descending':'ascending'):'none')+'"><button type="button" class="landing-sort" data-action="landing-sort" data-field="'+id+'" aria-label="Sort by '+esc(label)+'">'+esc(label)+' <span aria-hidden="true">'+(sort===id?(direction==='desc'?'↓':'↑'):'↕')+'</span></button></th>').join('');
  const rows=cache.rows.map(row=>'<tr><td><a class="landing-ro-link" href="#/ro-costings/'+encodeURIComponent(row.ro)+'">'+esc(row.ro)+'</a></td><td class="landing-date">'+esc(displayDate(row.inwardDate))+'</td><td>'+esc(row.vendorName||'Pending')+(row.invoice?'<div class="sub">'+esc(row.invoice)+'</div>':'')+'</td><td class="landing-item">'+esc(row.itemName||'Pending')+([row.productGroup,row.model].filter(Boolean).length?'<div class="sub">'+esc([...new Set([row.productGroup,row.model].filter(Boolean))].join(' · '))+'</div>':'')+'</td><td>'+esc(row.masterCode||'Pending')+'</td><td>'+esc(row.brandCode||'Pending')+'</td><td>'+esc(row.brand||'Pending')+'</td><td class="landing-number">'+number(row.usdUnit)+'</td><td class="landing-number">'+number(row.aiInrPerUsd,4)+'<div class="landing-rate-status">'+esc(row.rateStatus||'Pending')+'</div></td><td class="landing-number strong">'+number(row.inrUnitBeforeGst)+(row.status==='Pending'?'<div class="landing-rate-status">Pending</div>':'')+'</td><td class="landing-number">'+quantity(row.quantity)+'<div class="sub">'+esc(row.unit||'')+'</div></td></tr>').join('');
  return '<div class="table-wrap landing-table-wrap" role="region" aria-label="Landing prices table" tabindex="0"><table class="landing-table"><caption class="landing-sr-only">Purchase and inward quantities. Costs before GST.</caption><thead><tr>'+headers+'</tr></thead><tbody>'+(rows||'<tr><td colspan="11"><div class="landing-empty"><strong>No matching landing prices</strong><span>Change the filters or reset the view.</span></div></td></tr>')+'</tbody></table></div>';
 }
 function summary(){const s=cache.summary,unit=s.totalUnit||'',byUnit=Array.isArray(s.byUnit)?s.byUnit:Object.values(s.byUnit||{}),mixed=!!s.mixedUnits;
  const metric=(label,value,extra='')=>'<div><span>'+esc(label)+'</span><strong>'+value+'</strong>'+(extra?'<small>'+esc(extra)+'</small>':'')+'</div>';
  const text=mixed?'Separate averages by unit below':quantity(s.pairedQuantity)+' '+unit+' priced · '+quantity(s.pendingQuantity)+' '+unit+' pending excluded';
  const unitRows=mixed?'<div class="table-wrap" role="region" aria-label="Weighted averages by unit" tabindex="0"><table><thead><tr><th>Unit</th><th>Priced qty</th><th>Pending qty</th><th>Average USD</th><th>Average INR / USD</th><th>Average INR before GST</th></tr></thead><tbody>'+byUnit.map(group=>'<tr><td>'+esc(group.unit||group.totalUnit||'Pending')+'</td><td>'+quantity(group.pairedQuantity)+'</td><td>'+quantity(group.pendingQuantity)+'</td><td>'+number(group.avgUsd)+'</td><td>'+number(group.effectiveInrPerUsd,4)+'</td><td>'+number(group.avgInr)+'</td></tr>').join('')+'</tbody></table></div>':'';
  return '<section class="panel landing-summary" id="landing-price-summary" aria-labelledby="landing-summary-title"><div class="panel-head"><div><h2 id="landing-summary-title">Selected results · weighted average</h2><p>'+esc(text)+'</p></div>'+badge(quantity(s.rowCount)+' lines · '+quantity(s.roCount)+' ROs','dark')+'</div><div class="panel-body"><div class="landing-summary-values">'+metric('Average USD / unit',mixed?'By unit':money(s.avgUsd,'$'))+metric('Average INR / USD',number(s.effectiveInrPerUsd,4))+metric('Average INR / unit before GST',mixed?'By unit':money(s.avgInr,'₹'))+metric('Purchase / inward quantity',mixed?'By unit':quantity(s.totalQuantity)+' '+esc(unit))+metric('Priced value before GST',money(s.totalInr,'₹'))+'</div>'+((s.unquantifiedRows||s.excludedNonPositiveRows)?'<div class="landing-summary-note">'+(s.unquantifiedRows?quantity(s.unquantifiedRows)+' lines without quantity. ':'')+(s.excludedNonPositiveRows?quantity(s.excludedNonPositiveRows)+' zero / negative quantity lines excluded.':'')+'</div>':'')+'</div>'+unitRows+'</section>';
 }
 function page(){
  try{assertRoCostAccess(context().user);}catch(e){return head('LAE Import','Landing prices','')+note(esc(e.message),'warn');}
  const values=query(),expected=key(),pending=cacheKey!==expected;
  if(pending&&loadingKey!==expected)queueMicrotask(()=>load());
  const downloadButtons=['xlsx','pdf'].map(format=>'<button type="button" class="button ghost" data-action="landing-export" data-format="'+format+'"'+(context().sandbox||exporting?' disabled':'')+'>Download '+(format==='xlsx'?'Excel':'PDF')+'</button>').join('');
  const title=head('LAE Import','Landing prices','',downloadButtons+button('Refresh','landing-refresh',{},'ghost')+(context().sandbox?'<small class="landing-download-hint">Sign in to download</small>':exporting?'<small class="landing-download-hint" role="status">Preparing download…</small>':''));
  const body=title+'<div class="landing-page">'+(context().sandbox?note('Isolated browser review.'): '')+filters(values);
  if(pending)return body+'<div class="note-box" role="status">Loading landing prices…</div></div>';
  if(error)return body+'<div class="note-box warn" role="alert">'+esc(error)+'</div>'+button('Try again','landing-refresh',{},'primary')+'</div>';
  const p=cache.pagination,coverage=cache.coverage||{};
  return body+'<section class="panel landing-results"><div class="panel-head"><div><h2>Purchase landing prices</h2><p>Before GST · purchase / inward quantity</p></div><span class="landing-result-count" role="status">'+quantity(p.total)+' item lines</span></div>'+table(values)+'<div class="pagination landing-pagination"><span>Showing '+p.from+'–'+p.to+' of '+quantity(p.total)+'</span><div class="flex">'+(p.page>1?button('Previous','landing-page',{page:p.page-1},'ghost'):'')+'<span>Page '+p.page+' / '+p.totalPages+'</span>'+(p.page<p.totalPages?button('Next','landing-page',{page:p.page+1},'ghost'):'')+'</div></div></section>'+summary()+(coverage.rosWithoutItems?'<p class="landing-coverage">'+quantity(coverage.rosWithoutItems)+' ROs have item details pending in the full archive. <a href="#/ro-costings">View RO costings</a></p>':'')+'</div>';
 }
 function formValues(form){const values=query();for(const name of ['q','year','month','supplier','product','masterCode','brand','unit','status'])values[name]=String(new FormData(form).get(name)||'').trim();values.page=1;return values;}
 async function formSubmit(event){if(event.target.id!=='landing-price-filter')return false;go(formValues(event.target),'#landing-price-filter [name=q]');return true;}
 async function change(el){if(el.closest?.('#landing-price-filter')&&el.tagName==='SELECT'){go(formValues(el.form),'#landing-price-filter [name="'+el.name+'"]');return true;}return false;}
 async function action(action,data){if(!action.startsWith('landing-'))return false;
  if(action==='landing-refresh'){cacheKey='';await load(true);}
  if(action==='landing-export'){
   if(context().sandbox||exporting)return true;
   assertRoCostAccess(context().user);if(!['xlsx','pdf'].includes(data.format))throw Error('Invalid download format.');
   const selected=queryString(query());exporting=true;render();
   try{
    const response=await fetch('/api/landing-prices/export.'+data.format+'?'+selected,{credentials:'same-origin'});
    if(!response.ok){const failure=await response.json().catch(()=>({}));throw Error(failure.error||'Download failed. Please try again.');}
    const blob=await response.blob(),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='LAE_Landing_Prices.'+data.format;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
   }finally{exporting=false;if(context().user&&context().ui.view==='landing-prices')render();}
  }
  if(action==='landing-reset')go({},'#landing-price-filter [name=q]');
  if(action==='landing-page')go({...query(),page:Number(data.page)},'.landing-table-wrap');
  if(action==='landing-sort'){const values=query(),same=(values.sort||'inwardDate')===data.field;go({...values,sort:data.field,direction:same&&(values.direction||'desc')==='asc'?'desc':'asc',page:1},'[data-action="landing-sort"][data-field="'+data.field+'"]');}
  return true;
 }
 return {page,action,formSubmit,change};
}
