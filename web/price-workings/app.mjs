const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const finite=v=>typeof v==='number'&&Number.isFinite(v),num=(v,d=2)=>finite(v)?v.toLocaleString('en-IN',{maximumFractionDigits:d}):'—',money=v=>finite(v)?'₹'+num(v):'Pending';
const statusLabels={supported:'Supported',retained:'Recorded cost',estimated:'Estimated',provisional:'Provisional',pending:'Pending',mixed:'Mixed evidence'};
let state,result,remark,inherited,query=new URLSearchParams(),page='items',csrf='',dirty=false,busy=false,retry=null,lastHash=location.hash,leave=null,routeSerial=0;
const href=(p,params={})=>'#/'+p+'?'+new URLSearchParams(params);
const button=(label,action,attrs='')=>'<button type="button" class="button ghost" data-action="'+action+'" '+attrs+'>'+esc(label)+'</button>';
const status=v=>'<span class="chip '+esc(v||'pending')+'">'+esc(statusLabels[v]||v||'Pending')+'</span>';
const evidence=(value,title)=>'<details><summary>'+esc(title)+'</summary><pre>'+esc(JSON.stringify(value,null,2))+'</pre></details>';
async function api(path,body){
 const response=await fetch('/api/utility-prices/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:body?JSON.stringify(body):undefined,cache:'no-store'});
 if(response.status===401){location.replace('/#/home');throw Error('Sign in to review Utility stock.');}
 const data=await response.json();if(!response.ok){const error=Error(data.error||'Could not load Utility stock.');error.status=response.status;throw error;}return data;
}
function shell(body){$('#app').innerHTML='<a class="skip" href="#main-content">Skip to stock</a><main id="main-content" class="closing-content '+(page==='items'?'register':'detail')+'" tabindex="-1">'+body+'</main>';}
function heading(title,subtitle){
 const i=result?.item,b=result?.batch;
 return '<div class="compact-head"><div><nav aria-label="Breadcrumb"><a href="/#/home">Farming Hub home</a><span>/</span><a href="#/items">Utility closing stock</a>'+(i?'<span>/</span><a href="'+esc(href('items',{vendor:i.vendorId}))+'">'+esc(i.supplier||'Supplier')+'</a>':'')+(b?'<span>/</span><a href="'+esc(href('item',{id:i.id}))+'">'+esc(i.name)+'</a>':'')+'</nav><h1>'+esc(title)+'</h1><p>'+esc(subtitle)+'</p></div><div class="actions">'+button('Refresh','refresh')+'<span class="account-name">'+esc(state?.user?.name||'')+'</span></div></div>';
}
function basis(){return '<div class="basis-line"><span><strong>FG, bundles & other items:</strong> 30 Sep 2026</span><span><strong>Rolls:</strong> 8 Oct 2026 EOD*</span><details><summary>Stock basis & exceptions</summary><p>*Your requested cutoff. Roll source reports are dated 9 October; the exact EOD timing has not been independently verified. The original opening workbook is unavailable; the retained opening extract is used.</p><p>Only positive quantities with identifiable barcodes appear. PRIMARY/PRIM placeholders and descriptive batch labels, missing quantities, purchase history and pipeline are excluded. Repeated or legacy identifiers remain separate stock positions and are flagged for review. Unreliable opening HDPE/LDPE records remain unavailable; this is not a complete physical-stock certification. Supplier unconfirmed means evidence has not established the supplier.</p>'+evidence(state.closingMeta,'Source counts, exclusions & provenance')+'</details></div>';}
function cols(){return state.columns[page==='items'?'items':page==='item'?'batches':'barcodes'];}
function currentFilters(){try{return JSON.parse(query.get('columnFilters')||'{}');}catch{return {};}}
function toolbar(){return '<form id="grid-filters"><div class="grid-toolbar"><div class="actions">'+(page==='items'?'<label class="supplier-picker">Supplier<select name="vendor"><option value="">All suppliers with closing stock</option>'+state.vendors.map(v=>'<option value="'+esc(v.id)+'" '+(query.get('vendor')===v.id?'selected':'')+'>'+esc(v.name)+'</option>').join('')+'</select></label>':'<strong>Filter any column below</strong>')+'<button class="button primary" type="submit">Apply filters</button>'+button('Clear filters','clear-filters')+'</div><details class="filter-help"><summary>Filter help</summary><p>Text: contains a word. Numbers: <code>&gt;100</code>, <code>&lt;=250</code>, <code>100..250</code> or an exact number. Dates: <code>2026-09</code> or <code>2026-09-01..2026-09-30</code>. Use <code>missing</code> for unrecorded values or pending prices. Blank clears a filter. Click a heading to sort every matching record, across all pages.</p></details></div></form>';}
function cell(row,col){
 const v=row[col.key];
 if(col.key==='evidenceStatus')return status(v);
 if(page==='items'&&col.key==='name')return '<a class="drill" href="'+esc(href('item',{id:row.id}))+'">'+esc(v)+'</a>';
 if(page==='item'&&col.key==='date')return '<a class="drill" href="'+esc(href('batch',{id:row.id}))+'">'+esc(v||'Date pending')+'</a>';
 if(page==='batch'&&col.key==='barcode')return '<details class="row-trace"><summary>'+esc(v)+'</summary><p>Original source record and inherited costing evidence:</p><pre>'+esc(JSON.stringify(row,null,2))+'</pre></details>';
 if(col.key==='coveragePercent'||col.key==='cdPercent')return finite(v)?num(v,1)+'%':'Pending';
 if(['weightedRate','value','originalRate','originalValue','landedRate','beforeCdRate','netGoodsRate','transportRate'].includes(col.key))return money(v);
 if(col.type==='number'||col.type==='numeric')return num(v,col.key==='quantity'?3:0);
 return esc(v===null||v===undefined||v===''?'Not recorded':v);
}
function grid(){
 const columns=cols(),filters=currentFilters();
 const headers=columns.map(c=>'<th scope="col" aria-sort="'+(query.get('sort')===c.key?(query.get('direction')==='desc'?'descending':'ascending'):'none')+'"><button class="sort-button" type="button" data-action="sort" data-key="'+esc(c.key)+'">'+esc(c.label)+' <span aria-hidden="true">'+(query.get('sort')===c.key?(query.get('direction')==='desc'?'↓':'↑'):'↕')+'</span></button></th>').join('');
 const inputs=columns.map(c=>'<th><input form="grid-filters" name="column:'+esc(c.key)+'" aria-label="Filter '+esc(c.label)+'" value="'+esc(filters[c.key]||'')+'" placeholder="'+(['number','numeric'].includes(c.type)?'=, >, <, range':'Filter…')+'" maxlength="200"></th>').join('');
 const rows=result.rows.map(r=>'<tr>'+columns.map(c=>'<td class="'+(['number','numeric'].includes(c.type)?'num':'')+' '+(['name','source','invoiceRefs'].includes(c.key)?'wide-cell':'')+'">'+cell(r,c)+'</td>').join('')+'</tr>').join('');
 return '<section class="stock-grid"><div class="table-wrap" tabindex="0" role="region" aria-label="'+(page==='items'?'Supplier SKU closing stock':page==='item'?'SKU purchase and inward batches':'Batch closing barcodes')+'"><table><thead><tr>'+headers+'</tr><tr class="column-filters">'+inputs+'</tr></thead><tbody>'+(rows||'<tr><td colspan="'+columns.length+'" class="empty">No closing-stock records match these filters. Clear filters or select another supplier.</td></tr>')+'</tbody></table></div>'+pager()+'</section>';
}
function pager(){const params=Object.fromEntries(query);return '<div class="pager"><span>'+num(result.total,0)+' matching '+(page==='items'?'SKUs':page==='item'?'dated batches':'barcode records')+' · '+(result.total?result.offset+1:0)+'–'+Math.min(result.offset+result.limit,result.total)+'</span><div class="actions">'+(result.offset?'<a class="button ghost" href="'+esc(href(page,{...params,offset:Math.max(0,result.offset-result.limit)}))+'">Previous</a>':'')+(result.nextOffset!==null?'<a class="button ghost" href="'+esc(href(page,{...params,offset:result.nextOffset}))+'">Next</a>':'')+'</div></div>';}
function totals(row){return '<div class="totals"><span><strong>'+num(row.quantity,3)+'</strong> '+esc(row.uom)+' closing stock</span><span><strong>'+money(row.weightedRate)+'</strong> average / '+esc(row.uom)+'</span><span><strong>'+money(row.value)+'</strong> costed value</span><span><strong>'+num(row.coveragePercent,1)+'%</strong> quantity costed</span><span>'+num(row.barcodeCount,0)+' barcode records</span></div>';}
function remarkHistoryRow(h){return '<li><strong>'+esc(h.actor?.name||'Reviewer')+'</strong> · revision '+h.version+' · '+esc(new Date(h.at).toLocaleString('en-IN',{timeZone:'Asia/Calcutta'}))+'<p>'+esc(h.text||'(Remark cleared)')+'</p>'+(h.scope?evidence(h.scope,'Affected records at this revision'):'')+'</li>';}
function remarkEditor(){return '<section class="remark-panel"><form id="remark-form"><div class="remark-title"><label for="remark-text">'+(page==='batch'?'Batch remark':'SKU remark')+'</label><span>'+(page==='batch'?'Applies to every barcode in this batch':'Applies to all dated batches and barcodes in this SKU')+'</span></div><div class="remark-controls"><textarea id="remark-text" maxlength="4000" rows="2" '+(state.canWrite?'':'readonly')+' placeholder="Purchase manager: record the correction or evidence for review…">'+esc(remark.text)+'</textarea>'+(state.canWrite?'<button class="button primary" type="submit">Save remark</button>':'')+'</div><div class="remark-status"><span id="save-state">Saved revision '+remark.version+(state.canWrite?'':' · Read-only access')+'</span><span>Remarks do not change stock or prices until a requested review is completed.</span></div><p id="remark-error" class="error" role="alert" tabindex="-1"></p><div id="conflict"></div></form><details><summary>Complete remark history · '+num(remark.total,0)+' revisions</summary><ol class="history">'+(remark.history.map(remarkHistoryRow).join('')||'<li>No saved remarks yet.</li>')+'</ol>'+(remark.nextOffset!==null?button('Load older remarks','remark-history','data-offset="'+remark.nextOffset+'"'):'')+'</details></section>';}
function sourceNotes(){
 const info=result.sourceRemarksPage;if(!info?.total)return '';
 const rows=(result.sourceRemarks||[]).map(n=>'<li><strong>'+esc(n.actor?.name||'Reviewer')+'</strong> · revision '+n.version+' · '+esc(new Date(n.at).toLocaleString('en-IN',{timeZone:'Asia/Calcutta'}))+'<p>'+esc(n.text||'(Remark cleared)')+'</p><p>Applies to '+num(n.appliesToBarcodeIds.length,0)+' barcode records from this original source batch only.</p>'+evidence(n,'Original batch and affected barcode identities')+'</li>').join('');
 return '<details class="source-notes"><summary>Earlier source-batch remarks · '+num(info.total,0)+'</summary><p>These remarks retain their original purchase-group scope; they do not automatically apply to every record in the combined date batch.</p><ol class="history">'+rows+'</ol>'+(info.offset?'<a class="button ghost" href="'+esc(href(page,{...Object.fromEntries(query),sourceRemarkOffset:Math.max(0,info.offset-info.limit)}))+'">Previous source remarks</a>':'')+(info.nextOffset!==null?'<a class="button ghost" href="'+esc(href(page,{...Object.fromEntries(query),sourceRemarkOffset:info.nextOffset}))+'">Next source remarks</a>':'')+'</details>';
}
function content(){
 if(page==='items')return heading('Utility closing stock','Supplier → SKU → purchase / inward batch → barcode')+basis()+toolbar()+grid();
 const i=result.item,b=result.batch;
 return heading(b?i.name+' · '+(b.date||'Date pending'):i.name,(i.supplier||'Supplier unconfirmed')+' · '+(i.quality||'')+' · '+i.uom+' · '+(b?'Barcode details':'Dated purchase / inward batches'))+totals(b||i)+'<p class="calculation-note">Average = costed value ÷ costed quantity, before GST. Pending prices are excluded from the average and remain in closing quantity. '+(b?'Each barcode retains its individual source rate and costing evidence.':'Batches combine the same purchase date, or inward date when purchase date is missing; mixed prices are quantity-weighted.')+'</p>'+toolbar()+grid()+(b?'<section class="inherited"><strong>SKU remark · applies to this batch and every barcode</strong><p>'+esc(inherited?.text||'No SKU remark saved.')+'</p><a href="'+esc(href('item',{id:i.id}))+'">Edit at SKU level</a></section>':'')+(b?sourceNotes():'')+remarkEditor()+evidence(b||i,'Stock, costing and source-group details');
}
async function route(){
 const serial=++routeSerial,[part='items',qs='']=location.hash.replace(/^#\/?/,'').split('?');page=['item','batch'].includes(part)?part:'items';query=new URLSearchParams(qs);
 const ws=await api('workspace?closing=1');if(serial!==routeSerial)return;state=ws;csrf=state.csrf;
 let data,notes,parent;
 if(state.meta){
  data=await api(page+'?'+new URLSearchParams({...Object.fromEntries(query),closing:'1',limit:'100'}));
  if(page!=='items')notes=await api('remarks?'+new URLSearchParams({targetType:page,targetId:query.get('id'),closing:'1',limit:'20'}));
  if(page==='batch')parent=await api('remarks?'+new URLSearchParams({targetType:'item',targetId:data.item.id,closing:'1',limit:'1'}));
  if(data.datasetId!==state.datasetId||notes&&notes.datasetId!==state.datasetId||parent&&parent.datasetId!==state.datasetId)throw Error('The dataset changed while loading. Refresh to use one consistent version.');
 }
 if(serial!==routeSerial)return;result=data;remark=notes;inherited=parent;dirty=false;retry=null;lastHash=location.hash;
 shell(state.meta?content():heading('Utility closing stock','No review dataset has been imported yet.'));window.scrollTo({top:0,left:0,behavior:'instant'});
}
async function safeRoute(){try{await route();}catch(error){shell(heading('Utility closing stock','')+'<section class="error"><h2>Could not load this view</h2><p role="alert">'+esc(error.message)+'</p><div class="actions"><a class="button ghost" href="#/items">Closing stock</a>'+button('Retry','refresh')+'</div></section>');}}
function toast(text){$('#toast-root').textContent=text;setTimeout(()=>{$('#toast-root').textContent='';},6500);}
const guard=$('#guard');
function guardLeave(action){if(busy){toast('Wait for the remark save to finish.');return;}if(dirty){leave=action;guard.showModal();}else action();}
$('#keep').onclick=()=>{leave=null;guard.close();};$('#discard').onclick=()=>{dirty=false;guard.close();const action=leave;leave=null;action?.();};guard.addEventListener('cancel',()=>leave=null);
window.addEventListener('beforeunload',e=>{if(dirty||busy){e.preventDefault();e.returnValue='';}});
window.addEventListener('hashchange',()=>{if(location.hash==='#main-content'){$('#main-content')?.focus();return;}const destination=location.hash;if(dirty||busy){history.replaceState(null,'',lastHash||'#/items');guardLeave(()=>{location.hash=destination;});}else safeRoute();});
document.addEventListener('input',e=>{if(e.target.id==='remark-text'){dirty=e.target.value!==remark.text;$('#save-state').textContent=dirty?'Unsaved changes':'Saved revision '+remark.version;}});
document.addEventListener('click',async e=>{
 const link=e.target.closest('a[href]');if(link&&(dirty||busy)&&link.getAttribute('href')!=='#main-content'){e.preventDefault();guardLeave(()=>location.href=link.href);return;}
 const el=e.target.closest('[data-action]');if(!el)return;
 try{
  const a=el.dataset.action;
  if(a==='refresh')guardLeave(()=>safeRoute());
  if(a==='sort'){const next=new URLSearchParams(query);next.set('sort',el.dataset.key);next.set('direction',query.get('sort')===el.dataset.key&&query.get('direction')!=='desc'?'desc':'asc');next.delete('offset');guardLeave(()=>{location.hash=href(page,Object.fromEntries(next));});}
  if(a==='clear-filters'){const next=new URLSearchParams(query);for(const key of ['columnFilters','offset','sort','direction','search','stage','type','quality','status'])next.delete(key);guardLeave(()=>{location.hash=href(page,Object.fromEntries(next));});}
  if(a==='remark-history'){const data=await api('remarks?'+new URLSearchParams({targetType:page,targetId:query.get('id'),closing:'1',offset:el.dataset.offset,limit:'20'}));el.previousElementSibling.insertAdjacentHTML('beforeend',data.history.map(remarkHistoryRow).join(''));if(data.nextOffset!==null)el.dataset.offset=data.nextOffset;else el.remove();}
  if(a==='review-conflict'){const latest=await api('remarks?'+new URLSearchParams({targetType:page,targetId:query.get('id'),closing:'1',limit:'20'}));$('#conflict').innerHTML='<div class="notice"><strong>Latest saved remark · revision '+latest.version+'</strong><p>'+esc(latest.text)+'</p><p>Your text remains in the editor. Review the difference, then save again to create the next revision.</p></div>';remark=latest;retry=null;$('#save-state').textContent='Editing against revision '+latest.version;}
 }catch(error){toast(error.message);}
});
document.addEventListener('submit',async e=>{
 if(e.target.id==='grid-filters'){
  e.preventDefault();const params=new URLSearchParams(query),filters={};for(const [key,value] of new FormData(e.target)){if(key.startsWith('column:')&&value.trim())filters[key.slice(7)]=value.trim();else if(key==='vendor'){if(value)params.set(key,value);else params.delete(key);}}params.delete('offset');if(Object.keys(filters).length)params.set('columnFilters',JSON.stringify(filters));else params.delete('columnFilters');guardLeave(()=>{location.hash=href(page,Object.fromEntries(params));});return;
 }
 if(e.target.id!=='remark-form')return;e.preventDefault();if(busy||!state.canWrite)return;
 const input={targetType:page,targetId:query.get('id'),text:$('#remark-text').value,expectedVersion:remark.version,datasetId:state.datasetId,closing:true},fingerprint=JSON.stringify(input);
 if(retry?.fingerprint!==fingerprint)retry={fingerprint,requestId:crypto.randomUUID()};input.requestId=retry.requestId;busy=true;
 e.target.querySelector('[type=submit]').disabled=true;$('#remark-text').readOnly=true;$('#remark-error').textContent='';
 try{remark=await api('remarks',input);dirty=false;retry=null;await safeRoute();toast('Remark saved with author, revision and affected records.');}
 catch(error){$('#remark-error').textContent=error.message;$('#remark-error').focus();if(error.status===409)$('#conflict').innerHTML=button('Review latest saved remark','review-conflict');}
 finally{busy=false;const current=$('#remark-form [type=submit]');if(current)current.disabled=false;if($('#remark-text'))$('#remark-text').readOnly=!state.canWrite;}
});
await safeRoute();
