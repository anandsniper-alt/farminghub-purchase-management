/** Read-only product review and sales filtering; source imports remain unchanged. */
export const LAE_ANALYTICS_SECTIONS=[['review','Stock & sales review'],['sales','Sales filter']];
export const LAE_ANALYTICS_CENTRES=['B2B - Karnal','B2B - AP / TS','B2B - TN','B2C - TN'];
const zones=[['B2B - Karnal','North'],['B2B - AP / TS','AP / Telangana'],['B2B - TN','Tamil Nadu'],['B2C - TN','Farming Hub']];
const levels=[['category','Category'],['engine','Engine / blade'],['grade','Grade'],['item','SKU / model']];
const months=[4,5,6,7,8,9,10,11,12,1,2,3];
const monthName=m=>new Date(Date.UTC(2000,m-1,1)).toLocaleString('en-GB',{month:'short',timeZone:'UTC'});
const number=v=>v===null||v===undefined?'—':Number(v).toLocaleString('en-IN');
export const csvCell=value=>{const s=String(value??'');const numeric=typeof value==='number'&&Number.isFinite(value);return '"'+(!numeric&&(/^[\t\r\n]/.test(s)||/^\s*[=+\-@]/.test(s))?"'"+s:s).replaceAll('"','""')+'"';};

export function createLaeSalesAnalyticsUI({context,esc,head,render,api}) {
  const initial=()=>({category:'',engine:'',grade:'',item:'',centre:'',search:'',level:'category',fy:'',period:'quarterly',months:'4,5,6,7,8,9',offset:0,sort:'name'});
  let focusAfterLoad='';
  let monthDraft='4,5,6,7,8,9',query=initial(),result=null,error='',owner='',requestKey='',requestNumber=0,exporting=false;
  const view=()=>context().ui.orderId==='sales'?'sales':'review';
  const identity=()=>JSON.stringify([context().user?.id,context().user?.role,context().user?.scopes,context().user?.active]);
  function syncOwner(){const next=identity();if(next!==owner){owner=next;focusAfterLoad='';query=initial();monthDraft=query.months;result=null;error='';requestKey='';requestNumber++;exporting=false;}}
  const button=(label,action,extra='')=>`<button type="button" class="button ghost" data-action="review-${action}" ${extra}>${esc(label)}</button>`;
  function measure(m){if(!m||m.quantity===null)return '<span class="review-missing" title="Not supplied for this scope">—</span>';return `<span${m.complete?'':' class="review-partial" title="Recorded quantity only; source coverage or period is incomplete"'}>${number(m.quantity)}${m.complete?'':'<sup>*</sup>'}</span>`;}
  const periodLabel=p=>p.id==='currentH1'&&result.lastSixMatchesH1?p.label+' · last 6 months':p.label;
  const visibleBuckets=()=>result.buckets.filter(p=>view()!=='review'||p.id!=='lastSix'||!result.lastSixMatchesH1);
  function select(name,label,options,empty='All',extra=''){
    return `<label for="review-${name}">${esc(label)}<select id="review-${name}" ${extra}>${empty!==null?`<option value="">${esc(empty)}</option>`:''}${options.map(o=>{const [v,t]=Array.isArray(o)?o:[o,o];return `<option value="${esc(v)}"${String(query[name])===String(v)?' selected':''}>${esc(t)}</option>`;}).join('')}</select></label>`;
  }
  function filters(){
    const o=result.options;
    let html=`<section class="panel review-filters" aria-label="Product filters">${select('category','Product category',o.categories,'All categories')}${select('engine','Engine / blade',o.engines,'All engines / blades')}${select('grade','Grade',o.grades,'All grades')}${select('item','SKU / model',o.items.map(i=>[i.id,i.label]),'All models')}${select('centre','Sales / plan zone',zones,'All four zones')}${select('level','Group rows by',levels,null)}<label for="review-search">Find item<input type="search" id="review-search" value="${esc(query.search)}" maxlength="200" placeholder="Code or model"></label>${select('sort','Sort by',[['name','Product name'],['stock','Highest stock'],['sales','Highest sales'],['plan','Largest entered plan']],null)}<div class="review-filter-actions">${button('Reset filters','reset')}${button('Refresh','refresh')}</div></section>`;
    if(view()==='sales')html+=`<section class="panel review-periods" aria-label="Sales period filters">${select('fy','Financial year',result.years,null)}${select('period','Period',[['quarterly','Quarterly · Q1 to Q4'],['half','Half-yearly · H1 and H2'],['Q1','Q1 · Apr–Jun'],['Q2','Q2 · Jul–Sep'],['Q3','Q3 · Oct–Dec'],['Q4','Q4 · Jan–Mar'],['H1','H1 · Apr–Sep'],['H2','H2 · Oct–Mar'],['full','Full financial year'],['custom','Choose months']],null)}${query.period==='custom'?`<fieldset class="review-months"><legend>Select months</legend>${months.map(m=>`<label><input type="checkbox" data-review-month="${m}"${monthDraft.split(',').includes(String(m))?' checked':''}>${monthName(m)}</label>`).join('')}${button('Apply months','months')}</fieldset>`:''}</section>`;
    return html;
  }
  function sourceNotes(){
    return `<details class="panel review-notes"><summary>Data notes & source checks</summary><p>Stock: ${esc(result.source.stockFile)} · MASTER balances retained. Stock date is ${result.source.stockAsOf?esc(result.source.stockAsOf):'not confirmed'}. Pipeline arrival dates and whether all quantities remain open need confirmation.</p><p>Sales: ${esc(result.source.salesFile)} · through ${esc(result.cutoff)}. H1 = April–September; H2 = October–March. October is partial. Last six months means the last six completed calendar months.</p><p>Prior-year Farming Hub data was not supplied. Prior-year Tamil Nadu contains only Battery Sprayer Spares; its other categories remain unknown. Recorded totals are shown with an asterisk where coverage is incomplete; no missing history is replaced with zero.</p><p>Plans are the quantities entered in MASTER, not ABP-derived allocations. Plan left deducts recorded sales in the same forecast month and item/zone, with a minimum of zero. Blank forecast entries remain blank. Supply above an incomplete plan is a review signal, not a confirmed surplus or purchase approval. No surplus is transferred between item codes.</p><p>Stock and pipeline always refer to all warehouses for the selected products. Chennai is included once. Zone stock is shown separately; pipeline is not allocated to zones. ${result.totals.unmapped} sales item identities in this selection lack MASTER stock/classification matches.</p><p>H1, H2 and full-year columns are overlapping comparisons; do not add those columns together.</p>${result.source.exceptions.map(e=>`<p>${esc(e.item)}: ${esc(e.detail)}</p>`).join('')}${result.source.forecastExceptions.map(e=>`<p>Forecast ${esc(e.cells.join(', '))}: brand inputs total ${number(e.brands.reduce((n,q)=>n+(q??0),0))}; MASTER total ${number(e.cached)} retained.</p>`).join('')}</details>`;
  }
  const region=(label,table)=>`<div class="analytics-table review-table" role="region" aria-label="${esc(label)}" tabindex="0">${table}</div>`;
  function inventoryCards(){return `<div class="analytics-metrics review-metrics">${[['Stock on hand',result.totals.stock],['Pipeline',result.totals.pipeline],['Stock + pipeline',result.totals.supply]].map(([title,m])=>`<article class="panel analytics-metric"><h2>${title}</h2><strong>${measure(m)}</strong><p>All warehouses · selected products</p></article>`).join('')}</div>`;}
  function reportTable(){
    const overview=view()==='review',buckets=visibleBuckets(),rowName=levels.find(([v])=>v===query.level)[1];
    const columns=[rowName,...(overview?['Stock','Pipeline','Stock + pipeline']:[]),...buckets.map(p=>periodLabel(p)+(p.partial?' · partial':'')),...(overview?['Entered plan','Plan left','Supply − plan left']:['Selected total'])];
    const cells=r=>`${overview?['stock','pipeline','supply'].map(k=>`<td>${measure(r[k])}</td>`).join(''):''}${buckets.map(p=>`<td>${measure(r.sales[p.id])}</td>`).join('')}${overview?`<td>${measure(r.plan)}</td><td>${measure(r.remaining)}</td><td>${r.balance===null?'—':number(r.balance)}</td>`:`<td>${measure(r.totalSales)}</td>`}`;
    const body=result.rows.map((r,i)=>`<tr><th scope="row">${button(r.label,'drill',`data-index="${i}"`)}${r.model?`<span class="review-sub">${esc(r.model)}</span>`:''}${r.path?`<span class="review-sub">${esc(r.path)}</span>`:''}${overview?`<span class="review-check">${esc(r.check)}</span>`:''}</th>${cells(r)}</tr>`).join('');
    return `<section class="panel review-register"><div class="review-section-head"><div><h2>${overview?'Stock, sales & entered plan':'Sales quantities'}</h2><p>${result.total} ${query.level==='item'?'models':'groups'} · ${result.totals.items} item identities${query.centre?' · '+esc(zones.find(z=>z[0]===query.centre)[1]):' · all four zones'}</p></div>${button(exporting?'Exporting…':'Export filtered CSV','export',exporting?'disabled':'')}</div>${region(overview?'Product stock sales and plan':'Filtered sales quantities',`<table><thead><tr>${columns.map(c=>`<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>${body||`<tr><td colspan="${columns.length}">No matching items. Clear a filter to widen the view.</td></tr>`}</tbody><tfoot><tr><th scope="row">Filtered total</th>${cells(result.totals)}</tr></tfoot></table>`)}<div class="review-pagination"><span>${result.total?query.offset+1:0}–${Math.min(query.offset+50,result.total)} of ${result.total}</span>${query.offset?button('Previous','page',`data-offset="${Math.max(0,query.offset-50)}"`):''}${result.nextOffset!==null?button('Next','page',`data-offset="${result.nextOffset}"`):''}</div><p class="review-legend">— not supplied · * partial period or incomplete inputs. ${overview?'Positive supply − plan left means supply above the entered plan; negative means a gap. Blank plans can change this balance.':''}</p></section>`;
  }
  function zoneTable(){
    const overview=view()==='review',buckets=visibleBuckets();
    const rows=result.zones.map(z=>`<tr${query.centre===z.centre?' class="review-selected"':''}><th scope="row">${esc(z.label)}</th>${overview?`<td>${measure(z.stock)}</td>`:''}${buckets.map(p=>`<td>${measure(z.sales[p.id])}</td>`).join('')}${overview?`<td>${measure(z.plan)}</td><td>${measure(z.remaining)}</td>`:`<td>${measure(z.totalSales)}</td>`}</tr>`).join('');
    return `<section class="panel review-register"><h2>Who sold it? Four-zone split</h2><p>Same product filters · all four zones shown for comparison${overview?' · shared Chennai stock '+number(result.sharedStock.quantity)+' is additional to zone balances':''}.</p>${region('Four zone sales and plan',`<table><thead><tr><th scope="col">Zone</th>${overview?'<th scope="col">Zone stock</th>':''}${buckets.map(p=>`<th scope="col">${esc(periodLabel(p))}${p.partial?' · partial':''}</th>`).join('')}${overview?'<th scope="col">Entered plan</th><th scope="col">Plan left</th>':'<th scope="col">Selected total</th>'}</tr></thead><tbody>${rows}</tbody></table>`)}</section>`;
  }
  function forecastTable(){
    if(!result.forecastMonths.length)return '<section class="panel"><p>Forecast data has not been supplied.</p></section>';
    const rows=result.forecastMonths.map(m=>`<tr><th scope="row">${esc(m.month)}</th>${m.zones.map(z=>`<td>${measure(z)}<span class="review-sub">${z.entered} entries${z.blank?' · '+z.blank+' blank':''}</span></td>`).join('')}</tr>`).join('');
    return `<details class="panel review-register"><summary>Check the entered monthly plan by zone</summary><p>Original MASTER forecast quantities for the selected products. No ABP reallocation or invented February/March quantities.</p>${region('Original forecast by month and zone',`<table><thead><tr><th scope="col">Month</th>${zones.map(z=>`<th scope="col">${z[1]}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`)}</details>`;
  }
  function page(){
    syncOwner();if(result&&result.view&&result.view!==view()){result=null;requestKey='';}
    const tabs=`<nav class="analytics-tabs" aria-label="Analytics sections">${LAE_ANALYTICS_SECTIONS.map(([id,title])=>`<a href="#/lae-sales-analytics/${id}"${view()===id?' aria-current="page"':''}>${title}</a>`).join('')}</nav>`;
    const heading=head('LAE Sales Analytics',view()==='review'?'Stock, sales & plan':'Filter sales quantities',view()==='review'?'Category → Engine / blade → Grade → SKU / model':'Compare quantities by item, zone, quarter, half-year or selected months.');
    if(error)return `<div class="review-report">${heading}${tabs}<section class="panel" role="alert"><h2>Report unavailable</h2><p>${esc(error)}</p>${button('Retry','refresh')}</section></div>`;
    if(!result)return `<div class="review-report">${heading}${tabs}<section class="panel" role="status">${api?'Loading stock, sales and plan…':'No data available.'}</section></div>`;
    if(!result.ready)return `<div class="review-report">${heading}${tabs}<section class="panel"><h2>Awaiting data</h2><p>MASTER stock and sales imports are required. Existing source data is preserved.</p></section></div>`;
    return `<div class="review-report">${heading}${tabs}<p class="review-asof">Sales through ${esc(result.cutoff)} · H1 Apr–Sep · H2 Oct–Mar · stock date unconfirmed</p>${filters()}${view()==='review'?inventoryCards():''}${query.centre&&view()==='review'?'<p class="review-scope">Sales and plan are filtered to the selected zone. Stock and pipeline stay consolidated; a zone purchase balance is not calculated without supply allocation.</p>':''}${reportTable()}${zoneTable()}${view()==='review'?forecastTable():''}${sourceNotes()}</div>`;
  }
  function invalidate(focus){focusAfterLoad=focus||'';result=null;error='';requestKey='';requestNumber++;render();if(focus)globalThis.document?.getElementById(focus)?.focus();}
  function afterRender(){
    syncOwner();if(!api||context().sandbox||context().ui.view!=='lae-sales-analytics')return;
    const params=new URLSearchParams({...query,view:view()}),k=owner+'|'+params;
    if(requestKey===k)return;requestKey=k;const number=++requestNumber,actor=owner;
    api('/lae-review/workspace?'+params).then(data=>{
      if(number!==requestNumber||actor!==identity())return;
      result=data;if(data.fy&&!query.fy)query.fy=data.fy;
      requestKey=owner+'|'+new URLSearchParams({...query,view:view()});
      const focus=focusAfterLoad||globalThis.document?.activeElement?.id;focusAfterLoad='';render();if(focus?.startsWith('review-'))globalThis.document?.getElementById(focus)?.focus();
    }).catch(e=>{if(number!==requestNumber||actor!==identity())return;error=e.message||'Report could not be loaded.';render();});
  }
  async function exportRows(){
    const actor=owner,request=requestNumber,selectedView=view(),params=new URLSearchParams({...query,view:selectedView,export:'1',offset:'0'});
    exporting=true;render();
    try {
      const data=await api('/lae-review/workspace?'+params);
      if(actor!==identity()||request!==requestNumber)return;
      const overview=selectedView==='review',buckets=data.buckets.filter(p=>!overview||p.id!=='lastSix'||!data.lastSixMatchesH1);
      const headings=['Category','Engine / blade','Grade','Item / group','Model',...(overview?['Stock','Pipeline','Stock + pipeline']:[]),...buckets.map(p=>p.label),...(overview?['Entered plan','Plan left','Supply minus plan left','Review']:['Selected sales total']),'Coverage note','Sales cutoff','Stock cutoff','Sales / plan zone','Supply scope'];
      const value=m=>m?.quantity===null?'':m?.quantity??'';
      const lines=data.rows.map(r=>{
        const ms=[...(overview?[r.stock,r.pipeline,r.supply]:[]),...buckets.map(p=>r.sales[p.id]),...(overview?[r.plan,r.remaining]:[r.totalSales])];
        return [r.category,data.level==='category'?data.filters.engine:r.engine,['category','engine'].includes(data.level)?data.filters.grade:r.grade,r.label,r.model,...(overview?[value(r.stock),value(r.pipeline),value(r.supply)]:[]),...buckets.map(p=>value(r.sales[p.id])),...(overview?[value(r.plan),value(r.remaining),r.balance??'',r.check]:[value(r.totalSales)]),ms.every(m=>m.complete)?'Complete':'Partial / missing inputs; blank does not mean zero',data.cutoff,data.source.stockAsOf||'Unconfirmed',data.centre||'All four zones','All warehouses; not allocated to zone'];
      });
      const csv='\uFEFF'+[headings,...lines].map(row=>row.map(csvCell).join(',')).join('\r\n');
      const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=`LAE-${selectedView}-${data.fy}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(e){error=e.message||'Export failed.';}finally{exporting=false;render();}
  }
  function action(name,data={}){
    if(!name.startsWith('review-')||context().ui.view!=='lae-sales-analytics')return false;
    if(name==='review-export'){if(result?.ready&&!exporting)void exportRows();return true;}
    if(name==='review-drill'){
      const row=result?.rows[Number(data.index)];if(!row)return true;
      if(query.level==='item'){query.item=row.item;}
      else {const i=levels.findIndex(([v])=>v===query.level);for(const [k] of levels.slice(0,i+1))query[k]=row[k];query.level=levels[i+1][0];query.item='';}
      query.offset=0;
    }else if(name==='review-reset'){query=initial();monthDraft=query.months;}
    else if(name==='review-page'){const offset=Number(data.offset);if(!Number.isSafeInteger(offset)||offset<0)return true;query.offset=offset;}
    else if(name==='review-months'){if(!monthDraft){error='Choose at least one month.';render();return true;}query.months=monthDraft;query.offset=0;}
    else if(name!=='review-refresh')return false;
    invalidate();return true;
  }
  function change(el){
    if(context().ui.view!=='lae-sales-analytics')return false;
    if(el.dataset?.reviewMonth){const selected=new Set(monthDraft.split(',').filter(Boolean));el.checked?selected.add(el.dataset.reviewMonth):selected.delete(el.dataset.reviewMonth);monthDraft=months.filter(m=>selected.has(String(m))).join(',');return true;}
    if(!el.id?.startsWith('review-'))return false;
    const name=el.id.slice(7);if(!Object.hasOwn(query,name)||name==='offset')return false;
    const value=String(el.value||'').slice(0,1000);
    if(name==='level'&&!levels.some(([v])=>v===value)||name==='centre'&&value&&!LAE_ANALYTICS_CENTRES.includes(value))return true;
    query[name]=value;query.offset=0;
    if(name==='category'){query.engine='';query.grade='';query.item='';}
    if(name==='engine'){query.grade='';query.item='';}
    if(name==='grade')query.item='';
    if(name==='item'&&value)query.level='item';
    if(name==='period'&&value==='custom'&&!query.months)query.months='4,5,6,7,8,9';
    if(name==='period')monthDraft=query.months;
    invalidate(el.id);return true;
  }
  return {page,afterRender,action,change};
}
