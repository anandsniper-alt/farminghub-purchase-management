const collection='/api/development-requests';
const register='/development-requests.html';
const statuses=['Open','In progress','Resolved','Closed'];
const priorities=['Normal','High','Low'];
const openSelector='[data-development-request-open]';
const titles={
 home:'Modules',overview:'Purchase overview',orders:'Order pipeline',order:'Purchase order',
 'order-management':'Order Management',division:'Division',domestic:'Domestic purchase',scm:'LAE Import SCM',
 'purchase-analytics':'Purchase Analytics','lae-plm':'Product Lifecycle',product:'Product detail',plm:'Technical products',
 'lae-sales-analytics':'LAE Sales Analytics','flow-map':'Purchase flow map',tasks:'Tasks & follow-ups',
 payments:'Payments & settlement','payment-planner':'Payment planner',loading:'Loading',shipments:'Shipping & freight',
 documents:'QC & documents',vms:'Vendor Management System',vendors:'Vendor master',prices:'Supplier price lists',
 items:'Item Master','ro-costings':'RO costings','landing-prices':'Landing prices','stock-aging':'Stock Aging',
 'current-stock-costing':'Current stock costing','price-workings':'Utility price workings',settings:'Users & settings',
 references:'Software references',versions:'Version & edit log',roadmap:'Roadmap',implements:'Implements',
 'implements-purchase':'Rotavator purchasing','bom-management':'BOM & Syntax','production-stock':'Production & Stock',
 'monthly-planning':'Monthly plan entry',models:'Models',model:'Model detail',segments:'Segments',plan:'Monthly plan',mrp:'MRP',stock:'Stock',
 suppliers:'Suppliers',costing:'Costing',sales:'Sales',pipeline:'Purchase pipeline',quotes:'Quotes',
 'price-analysis':'Price analysis','development-requests':'Development requests',checks:'BOM checks',
 item:'Item detail',batch:'Batch detail',requests:'Plan requests',request:'Plan request',batches:'Production batches',units:'Finished units',
 dashboard:'Dashboard',picking:'Stores & material issue',movements:'Stock movements',entry:'New entry',
 stage:'Production stage',serial:'Serial detail',plans:'My plans & approvals','stock-entry':'Stock entry',
};
const routes={
 '/':'Purchase Management','/index.html':'Purchase Management','/implements/':'Rotavator purchasing',
 '/bom/':'BOM & Syntax','/production/':'Production & Stock','/planning/':'Monthly plan entry',
 '/price-workings/':'Utility price workings','/lae-analytics/':'LAE Sales Analytics','/development-requests.html':'Development requests',
};
const routeSections={
 division:['lae','implements'],
 'order-management':['lae-import','lae-domestic','implements'],
 domestic:['models','sets','items','bom','vendors','prices','quotes','orders','suppliers','costing'],
};
const vmsTitles={
 dashboard:'Dashboard',followups:'Vendor follow-up',vendors:'Vendors',analytics:'Analytics',expos:'Expos & fairs',
 products:'Product lines',components:'Component tags',risk:'Sourcing risk',pending:'Pending sync',app:'Get the app',
 users:'Users & roles',settings:'Settings',
};
const analyticsTitles={
 overview:'Overview',review:'Review',sales:'Sales',targets:'Annual plan & sales',stock:'Stock & pipeline',
 purchases:'Purchase requirements',sources:'Data sources',
};
const dialogs={
 'new-order':'Create purchase order','edit-draft':'Edit draft purchase order',amendment:'Propose PO revision',
 vendor:'Supplier', 'vendor-edit':'Edit supplier','vendor-request':'Supplier request','vendor-view':'Supplier details',
 'item-edit':'Edit item','price-edit':'Edit price','price-history':'Price history','po-payment-terms':'PO payment terms',
 'order-payment-terms':'PO payment terms','initial-payment':'Initial payment',payment:'Payment',receipt:'Receipt',
 task:'Add task',note:'Log interaction',pi:'Pro forma invoice',shipment:'Shipment','container-book':'Container booking',
 'bulk-qc':'Bulk QC','arrival':'Arrival',document:'Document','payment-plan-edit':'Edit payment plan',
 'po-create':'Create purchase order','po-edit':'Edit purchase order',
};
const requestIdPattern=/^[A-Za-z0-9_-]{1,100}$/;
const dateFormat=new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short'});
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const options=(values,selected)=>values.map(value=>`<option${value===selected?' selected':''}>${esc(value)}</option>`).join('');
const time=stamp=>`<time datetime="${esc(stamp)}" title="${esc(stamp)}">${Number.isFinite(Date.parse(stamp))?esc(dateFormat.format(new Date(stamp))):'—'}</time>`;
const statusBadge=status=>`<span class="dev-request-badge" data-status="${esc(status)}">${esc(status)}</span>`;
let session=null;
let capture=null;
const mounted=new Map();

export function developmentRequestContext(pageHref,{route,dialog}={}){
 // Only the names of known screens are copied from a route. Record IDs, query values,
 // form values and displayed order or supplier labels stay on the original page.
 const pageUrl=new URL(pageHref);
 let url;
 try{url=new URL(route||pageUrl.href,pageUrl);}catch{url=pageUrl;}
 if(url.origin!==pageUrl.origin)url=pageUrl;
 let path=url.pathname;
 if(!Object.hasOwn(routes,path)&&Object.hasOwn(routes,path+'/'))path+='/';
 const [hashPath,query]=url.hash.replace(/^#\/?/,'').split('?');
 const [section,subsection,detail]=hashPath.split('/');
 const known=Object.hasOwn(titles,section);
 const vmsSubpage=section==='vms'&&subsection==='module'&&Object.hasOwn(vmsTitles,detail)?detail:'';
 const analyticsSubpage=section==='lae-sales-analytics'&&Object.hasOwn(analyticsTitles,subsection)?subsection:'';
 const safeChild=known&&Object.hasOwn(routeSections,section)&&routeSections[section].includes(subsection)?subsection:'';
 const nestedRoute=vmsSubpage?'module/'+vmsSubpage:analyticsSubpage||safeChild;
 const knownPath=Object.hasOwn(routes,path);
 const base=knownPath?routes[path]:'Purchase workspace';
 const area=known&&(path==='/'||path==='/index.html'||titles[section]===base)?titles[section]:[base,known?titles[section]:''].filter(Boolean).join(' · ');
 const params=section==='scm'?new URLSearchParams(query):null;
 const scmTitle=params?.has('invoice')?'Commercial invoice review':
  params?.has('ro')?'RO review':params?.has('book')?'Commercial invoice booking':params?.has('po')?'PO records':'';
 const subpageTitle=scmTitle||(vmsSubpage?vmsTitles[vmsSubpage]:'')||(analyticsSubpage?analyticsTitles[analyticsSubpage]:'')||
  (path==='/lae-analytics/'&&!section?analyticsTitles.stock:'');
 const dialogTitle=Object.hasOwn(dialogs,dialog)?dialogs[dialog]:'';
 return {
  screen:[area,subpageTitle,dialogTitle].filter(Boolean).join(' · ').slice(0,120),
  route:knownPath?path+(known?'#/'+[section,nestedRoute].filter(Boolean).join('/'):''):'',
 };
}

async function request(path='',{data,signal}={}){
 const timeout=AbortSignal.timeout(15000);
 let response;
 try{
  response=await fetch(collection+path,{
   credentials:'same-origin',cache:'no-store',signal:signal?AbortSignal.any([signal,timeout]):timeout,
   ...(data===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':session?.csrf||''},body:JSON.stringify(data)}),
  });
 }catch(error){
  if(signal?.aborted)throw error;
  if(timeout.aborted)throw new Error(data===undefined?'The server took too long to respond. Try again.':'The server took too long to confirm the save. Retry with the same entries.');
  throw new Error('Could not reach Farming Hub. Check your connection and try again.');
 }
 const result=await response.json().catch(()=>null);
 if(!response.ok||!result){
  const error=new Error(response.status===401?'Your sign-in has expired. Sign in again before retrying.':result?.error||'The request could not be completed. Try again.');
  error.status=response.status;
  throw error;
 }
 return result;
}

function nextAttempt(previous,payload){
 const signature=JSON.stringify(payload);
 return previous?.signature===signature?previous:{signature,id:crypto.randomUUID()};
}

function showMessage(element,message=''){
 element.textContent=message;
 element.hidden=!message;
}

function confirmDiscard(notice,stay,discard){
 notice.hidden=false;
 notice.querySelector('[data-request-keep]').onclick=()=>{notice.hidden=true;stay();};
 notice.querySelector('[data-request-discard]').onclick=()=>{notice.hidden=true;discard();};
 notice.querySelector('[data-request-keep]').focus();
}

const discardNotice=`<div class="dev-request-discard" hidden>
 <strong>Discard unsaved changes?</strong>
 <div class="dev-request-actions"><button type="button" class="button primary" data-request-keep>Keep editing</button><button type="button" class="button" data-request-discard>Discard changes</button></div>
</div>`;

export function configureDevelopmentRequests(next){
 const identityChanged=session?.user?.id!==next?.user?.id;
 if(identityChanged){
  capture?.close();
  for(const dispose of mounted.values())dispose();
  mounted.clear();
 }
 session=next?.user?next:null;
}

export function openDevelopmentRequest(trigger=document.activeElement){
 if(!session||capture)return false;
 const actor=session.user;
 const context=developmentRequestContext(location.href,session.getContext?.());
 const dialog=document.createElement('dialog');
 dialog.id='development-request-dialog';
 dialog.className='dev-request-dialog';
 dialog.setAttribute('aria-labelledby','development-request-dialog-title');
 dialog.innerHTML=`<header class="dev-request-dialog-head">
  <h2 id="development-request-dialog-title" tabindex="-1">Log development</h2>
  <button type="button" class="button dev-request-close" aria-label="Close dialog" data-request-close>×</button>
 </header>
 <form class="dev-request-form">
  <div class="dev-request-origin"><span>Reported by <strong>${esc(actor.name)}</strong></span><span>Screen <strong>${esc(context.screen)}</strong></span></div>
  <div class="dev-request-field"><label for="development-request-title">Title</label><input id="development-request-title" name="title" required maxlength="120" autocomplete="off"></div>
  <div class="dev-request-field"><label for="development-request-description">Description</label><textarea id="development-request-description" name="description" required maxlength="4000" rows="5" aria-describedby="development-request-description-help"></textarea><small id="development-request-description-help">Describe what happened or what should change, and how it affects your work.</small></div>
  <div class="dev-request-field dev-request-priority"><label for="development-request-priority">Priority</label><select id="development-request-priority" name="priority">${options(priorities,'Normal')}</select></div>
  <p class="dev-request-error" role="alert" hidden></p>
  ${discardNotice}
  <div class="dev-request-dialog-foot">
   <a href="${register}" target="_blank" rel="noopener" aria-label="Development requests (opens in a new tab)">View development requests</a>
   <div class="dev-request-actions"><button type="button" class="button" data-request-close>Cancel</button><button type="submit" class="button primary">Submit request</button></div>
  </div>
 </form>
 <div class="dev-request-success" hidden>
  <h3 tabindex="-1">Request logged</h3>
  <p data-development-request-status role="status"></p>
  <div class="dev-request-actions"><a class="button" data-request-saved-link target="_blank" rel="noopener" aria-label="Open logged request (opens in a new tab)">Open request</a><button type="button" class="button primary" data-request-close>Done</button></div>
 </div>`;
 const form=dialog.querySelector('form');
 const heading=dialog.querySelector('h2');
 const errorBox=dialog.querySelector('.dev-request-error');
 const submit=form.querySelector('[type="submit"]');
 const values=()=>Object.fromEntries(new FormData(form));
 const isDirty=()=>!saved&&!!(form.elements.title.value||form.elements.description.value||form.elements.priority.value!=='Normal');
 let pending=false,attempt=null,saved=false;
 const beforeUnload=event=>{if(isDirty()){event.preventDefault();event.returnValue='';}};
 const close=()=>{if(dialog.open)dialog.close();};
 const cancel=()=>{
  if(pending)return;
  if(isDirty())confirmDiscard(dialog.querySelector('.dev-request-discard'),()=>form.elements.title.focus(),close);
  else close();
 };
 const onClose=()=>{
  window.removeEventListener('beforeunload',beforeUnload);
  dialog.remove();
  if(capture?.dialog===dialog)capture=null;
  if(trigger?.isConnected)trigger.focus({preventScroll:true});
 };
 dialog.addEventListener('close',onClose,{once:true});
 dialog.addEventListener('cancel',event=>{event.preventDefault();cancel();});
 dialog.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.stopPropagation();return;}
  if(event.key!=='Tab')return;
  event.stopPropagation();
  const controls=[...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]')].filter(element=>element.getClientRects().length);
  if(!controls.length){event.preventDefault();return;}
  const focused=document.activeElement;
  const first=controls[0],last=controls.at(-1);
  if(event.shiftKey&&(focused===first||!controls.includes(focused))){event.preventDefault();last.focus();}
  if(!event.shiftKey&&(focused===last||!controls.includes(focused))){event.preventDefault();first.focus();}
 });
 dialog.querySelectorAll('[data-request-close]').forEach(element=>element.addEventListener('click',cancel));
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  event.stopPropagation();
  if(pending)return;
  const input=values();
  const payload={...context,title:input.title.trim(),description:input.description.trim(),priority:input.priority};
  if(!payload.title||!payload.description){
   showMessage(errorBox,'Enter a title and description.');
   form.elements[payload.title?'description':'title'].focus();
   return;
  }
  attempt=nextAttempt(attempt,payload);
  pending=true;
  form.setAttribute('aria-busy','true');
  showMessage(errorBox);
  for(const control of form.elements)control.disabled=true;
  submit.textContent='Submitting…';
  try{
   const result=await request('',{data:{...payload,requestId:attempt.id}});
   if(!dialog.open)return;
   saved=true;
   form.hidden=true;
   const success=dialog.querySelector('.dev-request-success');
   success.hidden=false;
   success.querySelector('[data-development-request-status]').textContent=result.request.title+' was added to your requests.';
   success.querySelector('[data-request-saved-link]').href=register+'#'+encodeURIComponent(result.request.id);
   success.querySelector('h3').focus();
   document.dispatchEvent(new CustomEvent('development-request-created',{detail:{id:result.request.id}}));
  }catch(error){
   if(dialog.open)showMessage(errorBox,error.message);
  }finally{
   pending=false;
   form.removeAttribute('aria-busy');
   for(const control of form.elements)control.disabled=false;
   submit.textContent='Submit request';
  }
 });
 document.body.append(dialog);
 capture={dialog,close};
 window.addEventListener('beforeunload',beforeUnload);
 dialog.showModal();
 heading.focus({preventScroll:true});
 dialog.dispatchEvent(new Event('development-request-dialog-open',{bubbles:true}));
 return true;
}

function statusChange(event){
 if(!event.fromStatus)return 'Request logged';
 return event.fromStatus===event.toStatus?'Note added':event.fromStatus+' → '+event.toStatus;
}

function codexBrief({request:record,history}){
 const fields=[
  '# Development request '+record.id,record.title,
  'Reported by '+record.createdBy.name,'Status '+record.status+' · Priority '+record.priority,
  record.screen?'Screen '+record.screen:'',record.route?'Route '+record.route:'',
  'Logged '+record.createdAt,'Updated '+record.updatedAt,
  '',record.description,
 ];
 if(history.length)fields.push('','## History',...history.map(entry=>[
  '- '+entry.at+' · '+entry.actor.name+' · '+statusChange(entry),entry.note?'  '+entry.note.replaceAll('\n','\n  '):'',
 ].filter(Boolean).join('\n')));
 return fields.join('\n');
}

const countLabel=count=>count===1?'1 request':count+' requests';

function renderRows(records){
 return `<div class="dev-request-table" role="region" aria-label="Development requests table" tabindex="0"><table>
  <thead><tr><th scope="col">Request</th><th scope="col">Reported by</th><th scope="col">Status</th><th scope="col">Priority</th><th scope="col">Updated</th></tr></thead>
  <tbody>${records.map(record=>`<tr>
   <th scope="row"><button class="dev-request-link" type="button" data-request-detail="${esc(record.id)}">${esc(record.title)}</button>${record.screen?`<span class="dev-request-meta">${esc(record.screen)}</span>`:''}</th>
   <td>${esc(record.createdBy.name)}</td><td>${statusBadge(record.status)}</td><td>${esc(record.priority)}</td><td>${time(record.updatedAt)}</td>
  </tr>`).join('')}</tbody></table></div>`;
}

export function mountDevelopmentRequests(root){
 if(!root||!session||mounted.has(root))return;
 const actorId=session.user.id;
 root.classList.add('dev-requests');
 root.innerHTML=`<section data-request-list-view>
  <div class="dev-request-page-head"><h1>Development requests</h1></div>
  <div class="dev-request-panel">
   <div class="dev-request-scopes" role="group" aria-label="Request scope" hidden>
    <button type="button" class="button" data-request-scope="mine" aria-pressed="true">My requests</button>
    <button type="button" class="button" data-request-scope="all" aria-pressed="false">All requests</button>
   </div>
   <form class="dev-request-filters" aria-label="Filter development requests">
    <div class="dev-request-field"><label for="dev-request-search">Search requests</label><input id="dev-request-search" name="search" type="search" maxlength="120" autocomplete="off"></div>
    <div class="dev-request-field"><label for="dev-request-status">Status</label><select id="dev-request-status" name="status"><option value="">All statuses</option>${options(statuses)}</select></div>
    <div class="dev-request-field" data-request-reporter-field hidden><label for="dev-request-reporter">Reported by</label><select id="dev-request-reporter" name="reporterId"><option value="">All users</option></select></div>
    <button type="submit" class="button">Apply filters</button>
   </form>
  </div>
  <section class="dev-request-panel" aria-label="Request results">
   <div class="dev-request-results-head"><h2 data-request-list-heading>My requests</h2><p role="status" data-request-list-count></p><p data-request-reporter-summary hidden></p></div>
   <div data-request-results></div>
   <div class="dev-request-pagination" data-request-pagination hidden>
    <button type="button" class="button" data-request-page="-1">Previous</button><span data-request-page-label></span><button type="button" class="button" data-request-page="1">Next</button>
   </div>
  </section>
 </section><section data-request-detail-view hidden></section>`;
 const listView=root.querySelector('[data-request-list-view]');
 const detailView=root.querySelector('[data-request-detail-view]');
 const filters=root.querySelector('form');
 const reporterField=root.querySelector('[data-request-reporter-field]');
 const results=root.querySelector('[data-request-results]');
 const count=root.querySelector('[data-request-list-count]');
 const scopes=root.querySelector('.dev-request-scopes');
 const pagination=root.querySelector('[data-request-pagination]');
 let canManage=false,scope='mine',page=1,reporters=[],selectedReporter='',activeFilters={},listController,detailController;
 let currentId='',detailData=null,update=null,lastDetailTrigger=null;
 const stillActive=()=>root.isConnected&&session?.user.id===actorId;
 const ownBeforeUnload=event=>{if(update?.isDirty()){event.preventDefault();event.returnValue='';}};
 const listenerController=new AbortController();
 const listenerOptions={signal:listenerController.signal};
 mounted.set(root,()=>{
  listenerController.abort();
  listController?.abort();
  detailController?.abort();
  root.replaceChildren();
 });

 function showScopes(){
  scopes.hidden=!canManage;
  reporterField.hidden=!(canManage&&scope==='all');
  const names=reporters.map(row=>row.name);
  const total=reporters.reduce((sum,row)=>sum+row.count,0);
  const mine=reporters.find(row=>row.id===actorId)?.count||0;
  const mineButton=scopes.querySelector('[data-request-scope="mine"]');
  const allButton=scopes.querySelector('[data-request-scope="all"]');
  mineButton.innerHTML=`My requests <span class="dev-request-scope-count">${mine}</span>`;
  allButton.innerHTML=`All requests <span class="dev-request-scope-count">${total}</span>`;
  mineButton.setAttribute('aria-pressed',String(scope==='mine'));
  allButton.setAttribute('aria-pressed',String(scope==='all'));
  root.querySelector('[data-request-list-heading]').textContent=scope==='mine'?'My requests':'All requests';
  const select=filters.elements.reporterId;
  select.innerHTML='<option value="">All users</option>'+reporters.map(reporter=>{
   const duplicate=names.indexOf(reporter.name)!==names.lastIndexOf(reporter.name);
   const name=reporter.name+(duplicate?' · '+reporter.id:'');
   return `<option value="${esc(reporter.id)}">${esc(name)} (${reporter.count})</option>`;
  }).join('');
  select.value=selectedReporter;
 }

 async function loadList(){
  listController?.abort();
  const controller=new AbortController();
  listController=controller;
  const {search='',status='',reporterId=''}=activeFilters;
  const params=new URLSearchParams({search,status,page:String(page),pageSize:'20'});
  if(scope==='mine')params.set('mine','1');
  else if(reporterId)params.set('reporterId',reporterId);
  count.textContent='Loading requests…';
  results.setAttribute('aria-busy','true');
  pagination.hidden=true;
  try{
   const data=await request('?'+params,{signal:controller.signal});
   if(controller.signal.aborted||!stillActive())return;
   canManage=data.canManage;
   reporters=data.reporters||[];
   if(!canManage)scope='mine';
   showScopes();
   const pageCount=Math.max(1,Math.ceil(data.total/data.pageSize));
   if(page>pageCount){page=pageCount;return void loadList();}
   count.textContent=countLabel(data.total);
   const reporter=scope==='all'&&reporters.find(row=>row.id===activeFilters.reporterId);
   showMessage(root.querySelector('[data-request-reporter-summary]'),reporter?reporter.name+' · '+countLabel(reporter.count)+' logged in total':'');
   results.innerHTML=data.requests.length?renderRows(data.requests):`<p class="dev-request-empty">${activeFilters.search||activeFilters.status||activeFilters.reporterId?'No requests match these filters.':scope==='mine'?'You have not logged any concerns yet.':'No concerns have been logged yet.'}</p>`;
   pagination.hidden=pageCount<=1;
   pagination.querySelector('[data-request-page="-1"]').disabled=data.page<=1;
   pagination.querySelector('[data-request-page="1"]').disabled=data.page>=pageCount;
   pagination.querySelector('[data-request-page-label]').textContent='Page '+data.page+' of '+pageCount;
  }catch(error){
   if(controller.signal.aborted||!stillActive())return;
   count.textContent='';
   results.innerHTML=`<div class="dev-request-empty"><p class="dev-request-error" role="alert">${esc(error.message)}</p><button type="button" class="button" data-request-retry-list>Try again</button></div>`;
  }finally{
   if(listController===controller)results.removeAttribute('aria-busy');
  }
 }

 function changeFilter(){
  const data=Object.fromEntries(new FormData(filters));
  selectedReporter=data.reporterId||'';
  activeFilters={search:data.search.trim(),status:data.status,...(scope==='all'&&selectedReporter?{reporterId:selectedReporter}:{})};
  page=1;
  void loadList();
 }

 function setFragment(id=''){
  const url=location.pathname+location.search+(id?'#'+encodeURIComponent(id):'');
  window.history.replaceState(window.history.state,'',url);
 }

 function backToList(){
  detailController?.abort();
  currentId='';
  detailData=null;
  update=null;
  setFragment();
  detailView.hidden=true;
  detailView.replaceChildren();
  listView.hidden=false;
  const focus=lastDetailTrigger?.isConnected?lastDetailTrigger:listView.querySelector('h1');
  if(focus.tagName==='H1')focus.tabIndex=-1;
  focus.focus({preventScroll:true});
 }

 async function openDetail(id,trigger=null){
  if(!requestIdPattern.test(id))return;
  if(trigger)lastDetailTrigger=trigger;
  currentId=id;
  setFragment(id);
  listView.hidden=true;
  detailView.hidden=false;
  const back='<button type="button" class="button" data-request-back>Back to requests</button>';
  detailView.innerHTML=`<div class="dev-request-detail-nav">${back}</div><p role="status">Loading request…</p>`;
  detailView.querySelector('[data-request-back]').focus({preventScroll:true});
  detailController?.abort();
  const controller=new AbortController();
  detailController=controller;
  try{
   const data=await request('/'+encodeURIComponent(id),{signal:controller.signal});
   if(controller.signal.aborted||!stillActive())return;
   renderDetail(data,back);
  }catch(error){
   if(controller.signal.aborted||!stillActive())return;
   detailView.innerHTML=`<div class="dev-request-detail-nav">${back}</div><p class="dev-request-error" role="alert">${esc(error.message)}</p><button type="button" class="button" data-request-retry-detail>Try again</button>`;
   detailView.querySelector('[data-request-back]').focus({preventScroll:true});
  }
 }

 function renderDetail(data,back,preserved,{saved=false}={}){
  detailData=data;
  update=null;
  const {request:record,history}=data;
  detailView.innerHTML=`<div class="dev-request-detail-nav">${back}</div>
   <div class="dev-request-panel dev-request-detail">
    <div class="dev-request-page-head"><div><p class="dev-request-meta">${esc(record.id)}</p><h1 tabindex="-1">${esc(record.title)}</h1></div>${statusBadge(record.status)}</div>
    ${saved?'<p role="status">Request updated.</p>':''}
    <dl class="dev-request-facts">
     <div><dt>Reported by</dt><dd>${esc(record.createdBy.name)}</dd></div>
     <div><dt>Priority</dt><dd>${esc(record.priority)}</dd></div>
     ${record.screen?`<div><dt>Source screen</dt><dd>${esc(record.screen)}</dd></div>`:''}
     ${record.route?`<div><dt>Route</dt><dd>${esc(record.route)}</dd></div>`:''}
     <div><dt>Logged</dt><dd>${time(record.createdAt)}</dd></div>
     <div><dt>Updated</dt><dd>${time(record.updatedAt)}</dd></div>
    </dl>
    <h2>Description</h2><p class="dev-request-long">${esc(record.description)}</p>
    <div class="dev-request-actions"><button type="button" class="button" data-request-copy>Copy Codex brief</button><p data-request-copy-result role="status"></p></div>
    <div class="dev-request-field" data-request-copy-fallback hidden><label for="dev-request-copy-text">Codex brief</label><textarea id="dev-request-copy-text" rows="8" readonly></textarea></div>
   </div>
   <div class="dev-request-panel dev-request-detail"><h2>Request history</h2>
    <ol class="dev-request-history">${history.map(entry=>`<li>
     <div><strong>${esc(statusChange(entry))}</strong><span>${time(entry.at)}</span></div>
     <p>${esc(entry.actor.name)}</p>${entry.note?`<p class="dev-request-long">${esc(entry.note)}</p>`:''}
    </li>`).join('')}</ol>
   </div>
   ${data.canManage?`<form class="dev-request-panel dev-request-detail" data-request-update-form>
    <h2>Update request</h2>
    <div class="dev-request-field dev-request-priority"><label for="dev-request-edit-status">Status</label><select id="dev-request-edit-status" name="status">${options(statuses,preserved?.status||record.status)}</select></div>
    <div class="dev-request-field"><label for="dev-request-note">Note</label><textarea id="dev-request-note" rows="3" name="note" maxlength="2000">${esc(preserved?.note)}</textarea></div>
    <p class="dev-request-error" role="alert" hidden></p>
    <button class="button" type="button" data-request-reload-detail hidden>Reload latest status</button>
    ${discardNotice}
    <div class="dev-request-actions"><button type="submit" class="button primary">Save update</button></div>
   </form>`:''}`;
  detailView.querySelector('h1').focus({preventScroll:true});
  if(data.canManage)bindUpdate(record,back);
 }

 function bindUpdate(record,back){
  const form=detailView.querySelector('[data-request-update-form]');
  const errorBox=form.querySelector('.dev-request-error');
  const reload=form.querySelector('[data-request-reload-detail]');
  const submit=form.querySelector('[type="submit"]');
  const drafted=()=>({status:form.elements.status.value,note:form.elements.note.value});
  let pending=false,attempt=null;
  update={
   isDirty:()=>{const values=drafted();return values.status!==record.status||!!values.note;},
   isPending:()=>pending,
   cancel:()=>confirmDiscard(form.querySelector('.dev-request-discard'),()=>form.elements.status.focus(),backToList),
  };
  reload.addEventListener('click',async()=>{
   if(pending)return;
   pending=true;
   reload.disabled=true;
   try{
    const latest=await request('/'+encodeURIComponent(record.id));
    if(stillActive()&&currentId===record.id)renderDetail(latest,back,drafted());
   }catch(error){
    if(stillActive()&&currentId===record.id)showMessage(errorBox,error.message);
   }finally{
    pending=false;
    reload.disabled=false;
   }
  });
  form.addEventListener('submit',async event=>{
   event.preventDefault();
   if(pending)return;
   const values=drafted();
   const payload={status:values.status,note:values.note.trim(),expectedVersion:record.version};
   if(payload.status===record.status&&!payload.note){
    showMessage(errorBox,'Choose a different status or enter a note.');
    return;
   }
   attempt=nextAttempt(attempt,payload);
   pending=true;
   form.setAttribute('aria-busy','true');
   showMessage(errorBox);
   for(const control of form.elements)control.disabled=true;
   submit.textContent='Saving…';
   try{
    const next=await request('/'+encodeURIComponent(record.id),{data:{...payload,requestId:attempt.id}});
    if(!stillActive()||currentId!==record.id)return;
    renderDetail(next,back,null,{saved:true});
    void loadList();
   }catch(error){
    if(!stillActive()||currentId!==record.id)return;
    const conflict=error.status===409;
    showMessage(errorBox,conflict?'This request changed. Reload the latest status to review it and keep your note.':error.message);
    reload.hidden=!conflict;
   }finally{
    pending=false;
    form.removeAttribute('aria-busy');
    for(const control of form.elements)control.disabled=false;
    submit.textContent='Save update';
   }
  });
 }

 async function copyBrief(){
  if(!detailData)return;
  const brief=codexBrief(detailData);
  const copyResult=detailView.querySelector('[data-request-copy-result]');
  try{
   await navigator.clipboard.writeText(brief);
   copyResult.textContent='Brief copied.';
  }catch{
   if(!copyResult.isConnected)return;
   const fallback=detailView.querySelector('[data-request-copy-fallback]');
   const text=fallback.querySelector('textarea');
   fallback.hidden=false;
   text.value=brief;
   text.focus();
   text.select();
   copyResult.textContent='Copy the selected brief.';
  }
 }

 filters.addEventListener('submit',event=>{event.preventDefault();changeFilter();});
 filters.elements.status.addEventListener('change',changeFilter);
 filters.elements.reporterId.addEventListener('change',changeFilter);
 root.addEventListener('click',event=>{
  const button=event.target.closest('button');
  if(!button)return;
  if(button.dataset.requestScope&&button.dataset.requestScope!==scope){
   scope=button.dataset.requestScope;
   showScopes();
   changeFilter();
  }else if(button.dataset.requestPage){
   page+=Number(button.dataset.requestPage);
   void loadList();
  }else if(button.hasAttribute('data-request-retry-list'))void loadList();
  else if(button.dataset.requestDetail)void openDetail(button.dataset.requestDetail,button);
  else if(button.hasAttribute('data-request-retry-detail'))void openDetail(currentId);
  else if(button.hasAttribute('data-request-back')){
   if(update?.isPending())return;
   if(update?.isDirty())update.cancel();
   else backToList();
  }else if(button.hasAttribute('data-request-copy'))void copyBrief();
 },listenerOptions);
 window.addEventListener('beforeunload',ownBeforeUnload,listenerOptions);
 document.addEventListener('development-request-created',()=>{
  if(!stillActive())return;
  page=1;
  void loadList();
 },listenerOptions);
 document.addEventListener('visibilitychange',()=>{
  if(!document.hidden&&!listView.hidden&&stillActive())void loadList();
 },listenerOptions);
 const fragment=location.hash.slice(1);
 if(requestIdPattern.test(fragment))void openDetail(fragment);
 void loadList();
}

if(typeof document!=='undefined')document.addEventListener('click',event=>{
 const trigger=event.target.closest?.(openSelector);
 if(trigger&&openDevelopmentRequest(trigger))event.preventDefault();
});
