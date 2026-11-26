export function createLaePlmForecastUI({context,api,esc,head,button,render}){
 let request=null;

 function clear(){request=null;}

 function load(account){
  const current={account,status:'loading'};
  request=current;
  api('/lae-plm-forecast').then(data=>{
   if(request!==current)return;
   if(!Array.isArray(data.items)||(!data.source&&data.items.length))throw new Error('The forecast response is incomplete.');
   current.data=data;
   current.status='ready';
  }).catch(error=>{
   if(request!==current)return;
   current.status='error';
   current.message=error.message;
  }).finally(()=>{
   if(request===current&&context().ui.view==='lae-plm')render();
  });
 }

 function page(){
  const {ui,user,state,sandbox}=context();
  const heading=head('LAE Division','PLM','Browse the forecast model register and open technical product records.','<a class="button" href="#/plm">Technical products</a>');
  const refresh=sandbox?'':button('Refresh forecast','plm-forecast-refresh',{},'small ghost');
  let catalog;
  if(sandbox){
   catalog=globalThis.window?.FH_PLM_FORECAST_CATALOG;
   if(!catalog)return heading+'<p class="panel">The forecast register is available in the signed-in purchase application.</p>';
  }else{
   const account=JSON.stringify([user.id,user.role,user.scopes]);
   if(request?.account!==account)load(account);
   if(request.status==='loading')return heading+'<p role="status">Loading forecast models…</p>';
   if(request.status==='error')return heading+'<div class="panel"><h2>Forecast unavailable</h2><p role="alert">'+esc(request.message)+'</p>'+refresh+'</div>';
   catalog=request.data;
  }
  const {source,items}=catalog;
  if(!source)return heading+'<div class="panel"><h2>Forecast models</h2><p>No forecast workbook has been loaded.</p>'+refresh+'</div>';
  const query=(ui.search||'').trim().toLowerCase();
  const fields=['code','name','category','engine','grade','skuStatus'];
  const rows=query?items.filter(item=>fields.some(key=>String(item[key]??'').toLowerCase().includes(query))):items;
  const byCode=new Map();
  for(const base of state.bases){
   if(base.scope==='LAE_IMPORT'&&base.code&&!(sandbox&&base.demo))byCode.set(base.code,byCode.has(base.code)?null:base);
  }
  function product(item){
   if(!byCode.has(item.code))return sandbox?'No local technical match':'Forecast only';
   const base=byCode.get(item.code);
   return base?'<a href="#/product/'+esc(encodeURIComponent(base.id))+'">Open technical product</a>':'Multiple technical matches';
  }
  const headers=['Model code','Model name','Product category','Engine / specification','Grade','Source SKU status','Source row','Technical product'];
  const value=v=>v==null||v===''?'—':esc(String(v));
  return heading+'<section class="panel"><div class="toolbar"><div><h2>Forecast models</h2><p class="sub">'+esc(source.fileName)+' · '+esc(source.sheet)+'</p></div>'+refresh+'</div>'+
   '<div class="toolbar"><label class="filters">Search forecast models <input id="view-search" type="search" value="'+esc(ui.search||'')+'" placeholder="Code, name, category, engine, grade or SKU status"></label><span role="status">'+rows.length+' of '+items.length+' models</span></div>'+
   '<div class="table-wrap" role="region" aria-label="Forecast model register" tabindex="0"><table><thead><tr>'+headers.map(label=>'<th scope="col">'+label+'</th>').join('')+'</tr></thead><tbody>'+
   (rows.map(item=>'<tr>'+[...fields,'sourceRow'].map(key=>'<td>'+value(item[key])+'</td>').join('')+'<td>'+product(item)+'</td></tr>').join('')||'<tr><td colspan="8">'+(items.length?'No models match your search.':'The source sheet contains no models.')+'</td></tr>')+
   '</tbody></table></div></section>';
 }
 return {page,clear};
}
