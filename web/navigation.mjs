import {scopeAllowed} from '../shared/domain.mjs';
import {domesticIsAssembly} from '../shared/domestic.mjs';
let purchaseDrawerInstalled=false;
/** One DOM-only drawer controller for every shell; never rerender an editable page. */
function installPurchaseDrawer(){
 if(purchaseDrawerInstalled||typeof document==='undefined'||typeof window==='undefined'||typeof MutationObserver==='undefined'||!document.querySelector('#app'))return;
 purchaseDrawerInstalled=true;
 let side=null,toggle=null,pinned=false,opened=false,hovering=false,closeTimer=null;
 const finePointer=()=>window.matchMedia('(hover: hover) and (pointer: fine)').matches;
 const clearClose=()=>{if(closeTimer!==null){clearTimeout(closeTimer);closeTimer=null;}};
 const inDrawer=target=>target instanceof Element&&(side?.contains(target)||toggle?.contains(target));
 const modalOpen=()=>Boolean(document.querySelector('dialog[open],#modal-root .modal'));
 function sync(){
  if(!side||!toggle)return;
  const bottom=toggle.closest('.topbar')?.getBoundingClientRect().bottom||76;
  document.body.style.setProperty('--fh-drawer-top',Math.max(0,Math.ceil(bottom))+'px');
  side.classList.toggle('open',opened);side.inert=!opened;side.setAttribute('aria-hidden',String(!opened));
  toggle.setAttribute('aria-expanded',String(opened));toggle.setAttribute('aria-controls',side.id);toggle.setAttribute('aria-label',pinned?'Close navigation':'Open navigation');
  let scrim=document.querySelector('[data-purchase-drawer-scrim]');
  if(opened&&!scrim){scrim=document.createElement('button');scrim.type='button';scrim.className='nav-scrim purchase-drawer-scrim';scrim.dataset.purchaseDrawerScrim='';scrim.setAttribute('aria-label','Close navigation');scrim.tabIndex=-1;side.after(scrim);}
  if(!opened)scrim?.remove();
 }
 function close(restore=false){clearClose();const hadFocus=side?.contains(document.activeElement);pinned=false;opened=false;hovering=false;sync();if(restore||hadFocus)toggle?.focus({preventScroll:true});}
 function show(pin=false,keyboard=false){if(!side||modalOpen())return;clearClose();pinned=pin||pinned;opened=true;sync();if(keyboard)(side.querySelector('.nav-link:not(:disabled),a[href],button:not(:disabled)'))?.focus({preventScroll:true});}
 function scheduleClose(){clearClose();closeTimer=setTimeout(()=>{closeTimer=null;if(!pinned&&!hovering&&!side?.contains(document.activeElement))close();},220);}
 function attach(){
  const next=document.querySelector('.module-sidebar'),button=document.querySelector('.topbar .mobile-toggle');
  document.body.classList.toggle('fh-drawer-shell',Boolean(next&&button));
  if(next!==side||button!==toggle){clearClose();side=next;toggle=button;pinned=false;opened=false;hovering=false;document.querySelectorAll('[data-purchase-drawer-scrim]').forEach(el=>el.remove());if(side&&!side.id)side.id='purchase-navigation';sync();}
 }
 document.addEventListener('pointerover',event=>{if(event.pointerType!=='mouse'||!finePointer()||!inDrawer(event.target))return;hovering=true;clearClose();if(toggle?.contains(event.target))show();},true);
 document.addEventListener('pointerout',event=>{if(event.pointerType!=='mouse'||!inDrawer(event.target))return;if(inDrawer(event.relatedTarget))return;hovering=false;scheduleClose();},true);
 document.addEventListener('click',event=>{
  const target=event.target instanceof Element?event.target:null;if(!target)return;
  if(toggle?.contains(target)){event.preventDefault();event.stopImmediatePropagation();if(pinned)close(true);else show(true,event.detail===0);return;}
  if(target.closest('[data-purchase-drawer-scrim],.drawer-close')){event.preventDefault();event.stopImmediatePropagation();close(true);return;}
  if(!opened)return;
  if(!side?.contains(target)){close(false);return;}
  if(target.closest('[data-action="nav"],a[href]'))close(false);
 },true);
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&opened&&!modalOpen()){event.preventDefault();event.stopImmediatePropagation();close(true);}},true);
 document.addEventListener('focusin',event=>{if(opened&&!inDrawer(event.target))close(false);},true);
 document.addEventListener('focusout',event=>{if(inDrawer(event.target)&&!inDrawer(event.relatedTarget)&&!pinned)scheduleClose();},true);
 document.addEventListener('change',event=>{if(event.target?.id==='module-select')close(false);},true);
 window.addEventListener('hashchange',()=>close(false));window.addEventListener('resize',()=>{sync();requestAnimationFrame(sync);});
 new MutationObserver(attach).observe(document.querySelector('#app'),{childList:true,subtree:true});attach();
}
/** Presentation hierarchy only. Existing routes and server scopes stay authoritative. */
export function moduleDestination(to){const path=to==='lae-sales-analytics'?'/lae-analytics/':to==='price-workings'?'/price-workings/':to==='bom-management'?'/bom/':to==='production-stock'?'/production/':to==='monthly-planning'?'/planning/':to==='implements-purchase'?'/implements/#/models':'/#/'+to;return typeof location!=='undefined'&&location.protocol==='file:'?'https://purchase.dvjassociates.com'+path:path;}
export function createNavigation(host){
 installPurchaseDrawer();
 const {icon,esc,head,button}=host,ctx=host.context;
 const divisions=[['lae-import','LAE Import Order Management','overview','LAE_IMPORT'],['lae-domestic','LAE Domestic','domestic/models','LAE_DOMESTIC']];
 const laeModules=[
  ['orders','Orders','orders','Import purchase orders, approvals, payments and follow-ups.','LAE_IMPORT'],
  ['scm','SCM','ship','Commercial invoices, container loading, RO tracking and arrival costing.','LAE_IMPORT'],
  ['domestic/models','Domestic','box','Milking machine BOMs, suppliers, price lists and purchase orders.','LAE_DOMESTIC'],
  ['purchase-analytics','Purchase Analytics','money','Stock aging, current stock costs, landing prices and RO costings.','LAE_IMPORT'],
  ['lae-sales-analytics','Sales Analytics','grid','Sales performance, stock coverage and purchase requirements.'],
 ];
 const work=[['overview','Overview','grid'],['orders','Order pipeline','orders'],['tasks','Tasks & follow-ups','clock'],['payments','Payments','money'],['flow-map','Purchase flow map','grid'],['documents','QC & documents','file']];
 const scmPages=[['scm','Invoices & RO tracking','ship'],['loading','Loading plans','box'],['shipments','Earlier shipments & freight rates','ship']];
 const domesticPages=[['models','Model BOMs','box'],['sets','Assembly BOMs','box'],['items','Item Master','orders'],['vendors','Supplier master','users'],['prices','Price lists','money'],['orders','Purchase orders','orders']];
 const purchaseReports=[['stock-aging','Stock Aging','clock','Age buckets, stock values and division allocations.'],['current-stock-costing','Current stock costing','money','Closing stock by item, barcode and warehouse.'],['landing-prices','Landing prices','money','Purchase prices and landed cost comparisons.'],['ro-costings','RO costings','money','RO-wise landed costs and supporting workings.']];
 const masters=[['vendors','Vendor master','users'],['items','Item master','orders'],['prices','Supplier price lists','money'],['plm','Product Lifecycle (PLM)','box']];
 const activeView=()=>ctx().ui.view==='payment-planner'?'payments':ctx().ui.view==='order'?'orders':ctx().ui.view==='product'?'plm':ctx().ui.view;
 function area(){
  const {view}=ctx().ui;
  if(!canAccessView(view))return 'home';
  if(scmPages.some(([id])=>id===view))return 'scm';
  if(view==='lae-sales-analytics')return 'analytics';
  if(view==='purchase-analytics'||purchaseReports.some(([id])=>id===view))return 'purchase-analytics';
  if(['bom-management','production-stock'].includes(view))return 'production';
  if(['vms','domestic'].includes(view))return view;
  if(['implements','order-management'].includes(view)||[...work,...masters].some(([id])=>id===activeView()))return 'orders';
  return 'home';
 }
 const allowedScope=scope=>(globalThis.window?.FH_APP_MODE!=='implements'||['IMPLEMENTS_DOMESTIC','BOM_MANAGEMENT','PRODUCTION_MANAGEMENT','IMPLEMENTS_PLANNING'].includes(scope))&&scopeAllowed(ctx().user,scope);
 const laeImportAllowed=()=>allowedScope('LAE_IMPORT');
 const laeDomesticAllowed=()=>allowedScope('LAE_DOMESTIC');
 const laeAllowed=()=>laeImportAllowed()||laeDomesticAllowed();
 const visibleDivisions=()=>divisions.filter(([, , ,scope])=>allowedScope(scope));
 const visibleLaeModules=()=>laeModules.filter(([,,,,scope])=>scope?allowedScope(scope):laeAllowed());
 function domesticLocation(){
  const {ui,state}=ctx(),id=ui.orderId||'models';
  if(domesticPages.some(([to])=>to===id))return {section:id};
  if(id.startsWith('po-')){
   const order=state?.domesticOrders?.find(o=>o.id===id.slice(3));
   return {section:'orders',detail:order?.number||'Purchase order'};
  }
  const model=state?.domesticModels?.find(m=>m.id===id),bom=state?.domesticBoms?.find(b=>b.id===id);
  return {section:domesticIsAssembly(bom)?'sets':'models',detail:model?.code||bom?.code};
 }
 const utilityAllowed=()=>['ADMIN','MANAGER','EXECUTIVE','PRODUCT_MANAGER','VIEWER'].includes(ctx().user?.role)&&allowedScope('UTILITY_DOMESTIC');
 const bomAllowed=()=>allowedScope('BOM_MANAGEMENT');
 const productionAllowed=()=>allowedScope('PRODUCTION_MANAGEMENT');
 const purchaseAllowed=()=>allowedScope('IMPLEMENTS_DOMESTIC');
 const planningAllowed=()=>allowedScope('IMPLEMENTS_PLANNING')||['ADMIN','MANAGER'].includes(ctx().user?.role)&&purchaseAllowed();
 const implementsAllowed=()=>purchaseAllowed()||bomAllowed()||productionAllowed()||planningAllowed();
 const showImplementsDivision=()=>globalThis.window?.FH_APP_MODE!=='purchase'&&implementsAllowed();
 const nav=(to,label,ic,active=false)=>'<button type="button" class="nav-link '+(active?'active':'')+'" data-action="nav" data-to="'+to+'"'+(active?' aria-current="page"':'')+'>'+icon(ic,16)+'<span>'+esc(label)+'</span></button>';
 const divisionLinks=()=>'<div class="nav-label">Divisions</div>'+(laeAllowed()?nav('division/lae','LAE Division','box',ctx().ui.view==='division'&&ctx().ui.orderId==='lae'):'')+(showImplementsDivision()?nav('division/implements','Implements Division','box',ctx().ui.view==='division'&&ctx().ui.orderId==='implements'):'');
 function sidebar(){const {ui}=ctx(),section=area();let inside=divisionLinks();
  const laeBack=nav('division/lae','LAE Division','arrow');
  if(laeAllowed()&&(ui.view==='division'&&ui.orderId==='lae'||ui.view==='order-management'&&ui.orderId!=='implements'))inside='<div class="nav-section-title">LAE Division</div>'+visibleLaeModules().map(([to,label,ic])=>nav(to,label,ic)).join('');
  if(section==='orders'&&laeImportAllowed()&&!['order-management','implements'].includes(ui.view))inside=laeBack+'<div class="nav-section-title">LAE Import Orders</div>'+work.map(([to,label,ic])=>nav(to,label,ic,activeView()===to)).join('')+nav('vms','Vendor Management System','users')+'<details class="nav-catalogues" '+(masters.some(([id])=>id===activeView())?'open':'')+'><summary>Master data & products</summary>'+masters.map(([to,label,ic])=>nav(to,label,ic,activeView()===to)).join('')+'</details>';
  if(section==='scm')inside=laeBack+'<div class="nav-section-title">SCM</div>'+scmPages.map(([to,label,ic])=>nav(to,label,ic,ui.view===to)).join('');
  if(section==='purchase-analytics')inside=laeBack+nav('purchase-analytics','Purchase Analytics','grid',ui.view==='purchase-analytics')+purchaseReports.map(([to,label,ic])=>nav(to,label,ic,ui.view===to)).join('');
  if(ui.view==='implements')inside=nav('division/implements','Implements Division','arrow')+'<div class="nav-section-title">Implements purchase</div>'+(host.implementsSections||[]).map(([to,label,ic])=>nav('implements/'+to,label,ic,ui.orderId===to)).join('');
  if(section==='domestic'){
   const current=domesticLocation().section;
   inside=laeBack+'<div class="nav-section-title">LAE Domestic</div>'+domesticPages.map(([to,label,ic])=>nav('domestic/'+to,label,ic,current===to)).join('');
  }
  if(ui.view==='bom-management')inside=nav('division/implements','Implements Division','arrow')+'<div class="nav-section-title">BOM & Syntax</div>'+(host.bomSections||[]).map(([to,label,ic])=>nav('bom-management/'+to,label,ic,ui.orderId===to)).join('');
  if(ui.view==='production-stock')inside=nav('division/implements','Implements Division','arrow')+'<div class="nav-section-title">Production & Stock</div>'+(host.productionSections||[]).map(([to,label,ic])=>nav('production-stock/'+to,label,ic,ui.orderId===to)).join('');
  if(ui.view==='monthly-planning')inside=nav('division/implements','Implements Division','arrow')+'<div class="nav-section-title">Monthly plans</div>'+(host.planningSections||[]).map(([to,label,ic])=>nav('monthly-planning/'+to,label,ic,ui.orderId===to)).join('');
  if(section==='analytics')inside=laeBack+'<div class="nav-section-title">Sales Analytics</div>'+(host.analyticsSections||[]).map(([to,label,ic])=>nav('lae-sales-analytics/'+to,label,ic,(ui.orderId||'overview')===to)).join('');
  if(ui.view==='price-workings')inside='<div class="nav-section-title">Price list workings</div>'+nav('price-workings','Utility price','money',true);
  if(section==='vms')inside=nav('orders','Orders','arrow')+'<div class="nav-section-title">Vendor workspace</div>'+host.vmsNavigation();
  const options=(utilityAllowed()?'<optgroup label="Price list workings"><option value="price-workings">Utility price</option></optgroup>':'')+(laeAllowed()?'<optgroup label="LAE Division"><option value="division/lae">All LAE modules</option>'+visibleLaeModules().map(([to,label])=>'<option value="'+to+'">'+esc(label)+'</option>').join('')+'</optgroup>':'')+(showImplementsDivision()?'<optgroup label="Implements Division"><option value="division/implements">All Implements modules</option>'+(purchaseAllowed()?'<option value="implements-purchase">Rotavator purchasing</option>':'')+(bomAllowed()?'<option value="bom-management">BOM &amp; Syntax</option>':'')+(productionAllowed()?'<option value="production-stock">Production &amp; Stock</option>':'')+(planningAllowed()?'<option value="monthly-planning">Monthly plan entry</option>':'')+'</optgroup>':'');
  const sectionLabel={vms:'VMS sections',scm:'SCM sections',orders:'Orders sections',domestic:'Domestic sections','purchase-analytics':'Purchase Analytics sections',analytics:'Sales Analytics sections'};
  return '<aside id="purchase-navigation" class="sidebar module-sidebar" inert aria-hidden="true"><button type="button" class="brand brand-logo-block brand-home" data-action="nav" data-to="home" aria-label="Farming Hub home"><div class="brand-logo-shell"><img class="brand-logo" src="'+host.logo+'" alt="Farming Hub"></div></button><nav class="module-navigation" aria-label="'+(ui.view==='implements'?'Implements sections':sectionLabel[section]||'Workspace')+'">'+inside+'</nav><div class="sidebar-bottom">'+nav('settings','Users & settings','settings',ui.view==='settings')+nav('versions','Version & edit log','history',ui.view==='versions')+'<div class="module-switcher"><label for="module-select">Modules</label><select id="module-select"><option value="" selected disabled>Select module...</option>'+options+'</select></div></div></aside>';
 }
 const card=(title,description,to,ic,pending=false)=>'<a class="module-card '+(pending?'pending':'')+'" href="'+(to==='lae-sales-analytics'&&ctx().sandbox?'#/'+to:['lae-sales-analytics','price-workings','bom-management','production-stock','monthly-planning','implements-purchase'].includes(to)?moduleDestination(to):'#/'+to)+'"><span class="module-card-icon">'+icon(ic,24)+'</span><span class="module-card-copy"><h2>'+esc(title)+'</h2><p>'+esc(description)+'</p><span class="module-card-state">'+(pending?'Pending development':'Open '+(to.startsWith('division/')?'division':'module')+' '+icon('arrow',14))+'</span></span></a>';
 function home(){return head('Farming Hub','Your workspace','Choose a division or workspace.')+'<div class="module-cards division-cards">'+(laeAllowed()?card('LAE Division',visibleLaeModules().map(([,label])=>label).join(' · '),'division/lae','orders'):'')+(showImplementsDivision()?card('Implements Division',[purchaseAllowed()?'Rotavator purchasing':'',bomAllowed()?'BOM & Syntax':'',productionAllowed()?'Production & Stock':'',planningAllowed()?'Monthly plan entry':''].filter(Boolean).join(', ')+'.','division/implements','box'):'')+(utilityAllowed()?card('Price list workings','Utility price · supplier, item, batch and barcode cost review.','price-workings','money'):'')+'</div>';}
 function divisionHub(id=ctx().ui.orderId){
  if(id==='implements'&&globalThis.window?.FH_APP_MODE==='purchase'&&implementsAllowed())return head('Farming Hub','Implements has moved','Use the separate Implements site for purchasing, BOMs, production and planning.')+'<a class="button primary" href="https://implements.dvjassociates.com/">Open Implements site</a>';
  const lae=id==='lae',allowed=lae?laeAllowed():id==='implements'&&implementsAllowed();
  if(!allowed)return head('Farming Hub','Division unavailable','Your account does not have access to this division.',button('Home','nav',{to:'home'},'ghost','arrow'));
  if(lae)return head('Farming Hub','LAE Division','Choose a module.')+'<div class="module-cards">'+visibleLaeModules().map(([to,label,ic,description])=>card(label,description,to,ic)).join('')+'</div>';
  return head('Farming Hub','Implements Division','Choose a module.')+'<div class="module-cards">'+(purchaseAllowed()?card('Rotavator purchasing','Purchase prices, monthly MRP, costing and supplier purchase orders.','implements-purchase','money'):'')+(bomAllowed()?card('BOM & Syntax','Model definitions, component quantities and fabrication checks.','bom-management','box'):'')+(productionAllowed()?card('Production & Stock','Material issue, finished machines and serial tracking.','production-stock','box'):'')+(planningAllowed()?card('Monthly plan entry','Submit monthly machine plans and track purchase approval. No costs.','monthly-planning','clock'):'')+'</div>';
 }
 function purchaseAnalyticsHub(){if(!laeImportAllowed())return head('LAE Division','Module unavailable','Your account does not have access to this module.',button('LAE Division','nav',{to:'division/lae'},'ghost','arrow'));return head('LAE Division','Purchase Analytics','Choose a report.')+'<div class="module-cards">'+purchaseReports.map(([to,label,ic,description])=>card(label,description,to,ic)).join('')+'</div>';}
 function orderHub(){if(ctx().ui.orderId==='implements')return divisionHub('implements');if(!laeAllowed())return divisionHub('lae');const division=divisions.find(([id])=>id===ctx().ui.orderId);if(division&&!allowedScope(division[3]))return head('Order Management','Module unavailable','Your account does not have access to this module.',button('Home','nav',{to:'home'},'ghost','arrow'));if(division&&division[0]==='lae-domestic')return head('Order Management','LAE Domestic','')+card('Milking machines','Model BOMs and component Item Master.','domestic/models','box');if(division&&division[0]!=='lae-import')return head('Order Management',division[1],'',button('All categories','nav',{to:'order-management'},'ghost','arrow'))+'<div class="division-pending panel"><span class="module-card-icon">'+icon('clock',24)+'</span><h2>Pending development</h2><p>This division is not available yet.</p>'+button('Open LAE Import','nav',{to:'overview'},'primary','arrow')+'</div>';return head('LAE Division','LAE Purchase Order Module','Orders and supply-chain coordination.')+'<div class="module-cards division-cards">'+visibleDivisions().map(([id,label,to])=>card(label,id==='lae-domestic'?'Milking machines - items & BOMs':to?'Masters, supplier sourcing, purchase orders, production and QC.':'',to||'order-management/'+id,to?'box':'clock',!to)+(id==='lae-import'?card('LAE Import SCM','Commercial invoices, loading plans, RO tracking, India arrival and cost capture.','scm','ship'):'')).join('')+'</div>';}
 function breadcrumb(last){if(!canAccessView())return '<div class="breadcrumb"><a href="#/home">Farming Hub</a><b>Module unavailable</b></div>';const {ui}=ctx(),section=area(),parts=[['home','Farming Hub']],implementsView=['implements','bom-management','production-stock','monthly-planning'].includes(ui.view)||ui.view==='order-management'&&ui.orderId==='implements';
  if(ui.view==='division')last=ui.orderId==='lae'?'LAE Division':'Implements Division';
  else if(implementsView){parts.push(['division/implements','Implements Division']);if(ui.view==='implements')parts.push(['implements-purchase','Rotavator purchasing']);else if(ui.view==='bom-management')parts.push(['bom-management','BOM & Syntax']);else if(ui.view==='production-stock')parts.push(['production-stock','Production & Stock']);else if(ui.view==='monthly-planning')parts.push(['monthly-planning','Monthly plan entry']);else last='Implements Division';}
  else if(section==='analytics'){parts.push(['division/lae','LAE Division']);last='Sales Analytics';}
  else if(section==='scm'){parts.push(['division/lae','LAE Division'],['scm','SCM']);if(ui.view==='scm')last='SCM';}
  else if(section==='purchase-analytics'){parts.push(['division/lae','LAE Division'],['purchase-analytics','Purchase Analytics']);if(ui.view==='purchase-analytics')last='Purchase Analytics';}
  else if(section==='domestic'){
   const {section:page,detail}=domesticLocation();
   const [,label]=domesticPages.find(([to])=>to===page);
   parts.push(['division/lae','LAE Division'],['domestic/models','Domestic']);
   if(page!=='models')parts.push(['domestic/'+page,label]);
   last=detail||label;
  }
  else if(ui.view==='price-workings')parts.push(['price-workings','Price list workings']);
  else if(section==='orders'){
   parts.push(['division/lae','LAE Division']);
   if(ui.view==='order-management')last=divisions.find(([id])=>id===ui.orderId)?.[1]||'LAE Purchase Order Module';
   else{parts.push(['orders','Orders']);if(ui.view==='orders')last='Orders';}
  }
  else if(section==='vms')parts.push(['division/lae','LAE Division'],['orders','Orders'],['vms','Vendor Management System']);
  if(ui.view==='payment-planner')parts.push(['payments','Payments']);
  if(ui.view!=='home'&&last!==parts.at(-1)[1])parts.push([null,last]);const external=['price-workings','implements','bom-management','production-stock','monthly-planning'].includes(ui.view);
  return '<div class="breadcrumb">'+parts.map(([to,title],i)=>(i?icon('chevron',11):'')+(to&&i<parts.length-1?'<a href="'+(['price-workings','implements-purchase','bom-management','production-stock'].includes(to)?moduleDestination(to):(external?'/#/':'#/')+to)+'">'+esc(title)+'</a>':'<b>'+esc(title)+'</b>')).join('')+'</div>';
 }
 function canAccessView(view=ctx().ui.view){
  if(view==='division')return ctx().ui.orderId==='lae'?laeAllowed():ctx().ui.orderId==='implements'&&implementsAllowed();
  if(view==='order-management')return ctx().ui.orderId==='implements'?implementsAllowed():ctx().ui.orderId==='lae-import'?laeImportAllowed():ctx().ui.orderId==='lae-domestic'?laeDomesticAllowed():laeAllowed();
  if(view==='lae-sales-analytics')return laeAllowed();
  if(view==='domestic')return laeDomesticAllowed();
  if(view==='price-workings')return utilityAllowed();
  if(scmPages.some(([id])=>id===view))return laeImportAllowed();
  if(view==='purchase-analytics'||purchaseReports.some(([id])=>id===view))return laeImportAllowed();
  if(view==='vms'||['order','product','payment-planner',...work.map(([id])=>id),...masters.map(([id])=>id)].includes(view))return laeImportAllowed();
  return true;
 }
 function paymentSections(){
  if(!['payments','payment-planner'].includes(ctx().ui.view)||!laeImportAllowed())return '';
  return '<nav class="tabs" aria-label="Payments sections">'+[['payments','Payments & settlement'],['payment-planner','Payment planner']].map(([to,label])=>'<button type="button" class="tab '+(ctx().ui.view===to?'active':'')+'" data-action="nav" data-to="'+to+'"'+(ctx().ui.view===to?' aria-current="page"':'')+'>'+label+'</button>').join('')+'</nav>';
 }
 const showImportTools=()=>area()==='orders'&&!['order-management','implements'].includes(ctx().ui.view);
 return {sidebar,home,divisionHub,orderHub,purchaseAnalyticsHub,breadcrumb,area,canAccessView,paymentSections,showImportTools};
}
