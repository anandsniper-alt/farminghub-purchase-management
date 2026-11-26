import test from 'node:test';
import assert from 'node:assert/strict';
import {createNavigation,moduleDestination as globalDestination} from '../web/navigation.mjs';
import {renderModuleShell,moduleDestination,implementsSections} from '../web/implements/shell.mjs';
import {LAE_ANALYTICS_SECTIONS} from '../web/lae-sales-analytics.mjs';
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const icon=()=>'<svg></svg>';
const host=(ui,user={role:'ADMIN'},sandbox=false)=>({context:()=>({ui,user,sandbox}),head:()=>'',button:()=>'',esc,icon,logo:'/logo.png',analyticsSections:LAE_ANALYTICS_SECTIONS,vmsNavigation:()=>'<div>Vendor sections</div>'});
const purchaseReports=['stock-aging','current-stock-costing','landing-prices','ro-costings'];
const cardDestinations=html=>[...html.matchAll(/<a class="module-card [^"]*" href="([^"]+)"/g)].map(([,href])=>href);
const currentSections=html=>[...html.matchAll(/data-to="([^"]+)" aria-current="page"/g)].map(([,to])=>to);

test('separate Purchase home and menus omit Implements while old division bookmarks point to the new site',()=>{
 const original=globalThis.window;
 try{
  globalThis.window={FH_APP_MODE:'purchase'};
  const nav=createNavigation(host({view:'home'}));
  for(const markup of [nav.home(),nav.sidebar()]){
   assert.doesNotMatch(markup,/Implements Division|Rotavator purchasing|BOM &amp; Syntax|Monthly plan entry/);
   assert.match(markup,/LAE Division/);
   assert.match(markup,/Price list workings/);
  }
  assert.match(nav.divisionHub('implements'),/href="https:\/\/implements\.dvjassociates\.com\/"/);
  assert.doesNotMatch(nav.divisionHub('implements'),/href="\/(implements|bom|production|planning)\//);
  assert.match(nav.divisionHub('lae'),/href="#\/orders"/);
  globalThis.window={FH_APP_MODE:'implements'};
  const separate=createNavigation(host({view:'home'}));
  assert.match(separate.sidebar(),/Implements Division/);
  assert.doesNotMatch(separate.sidebar(),/LAE Division|Utility price/);
  assert.match(separate.divisionHub('implements'),/href="\/bom\/"/);
 }finally{if(original===undefined)delete globalThis.window;else globalThis.window=original;}
});
test('Implements sections stay local while global navigation leaves the module',()=>{
 for(const [id] of implementsSections){assert.equal(moduleDestination('implements/'+id),'#/'+id);}
 for(const route of ['home','settings','versions','order-management','vms'])assert.equal(moduleDestination(route),'/#/'+route);
});
test('every Implements screen uses shared home, module switcher and one active section',()=>{
 for(const [section,label] of implementsSections){
  const shell=renderModuleShell({section,user:{name:'Buyer <test>',role:'MANAGER'},icon,esc,flagsButton:''});
  assert.match(shell.sidebar,/aria-label="Farming Hub home"/);
  assert.match(shell.sidebar,/data-to="home"/);
  assert.match(shell.sidebar,/id="module-select"/);
  assert.match(shell.sidebar,/data-to="settings"/);
  assert.match(shell.sidebar,/data-to="versions"/);
  assert.equal((shell.sidebar.match(/aria-current="page"/g)||[]).length,1);
  assert.ok(shell.sidebar.includes('data-to="implements/'+section+'" aria-current="page"'));
  assert.ok(shell.header.includes('href="/#/home"'));
  assert.ok(shell.header.includes('href="/#/division/implements"'));
  assert.ok(shell.header.includes('<b>'+esc(label)+'</b>'));
  assert.match(shell.header,/Buyer &lt;test>/);
 }
});
test('existing main, domestic and vendor navigation retains its routes',()=>{
 const cases=[['overview','orders','LAE Import','overview'],['domestic','domestic','LAE Domestic','domestic/items'],['vms','vms','Vendor sections','vms']];
 for(const [view,area,text,to] of cases){
  const nav=createNavigation(host({view,orderId:'items'}));
  assert.equal(nav.area(),area);assert.ok(nav.sidebar().includes(text));
  assert.ok(nav.breadcrumb('Details').includes('href="#/'+to+'"')||nav.sidebar().includes('data-to="'+to+'"'));
  assert.ok(!nav.sidebar().includes('data-to="implements/models"'));
 }
 const nav=createNavigation(host({view:'order-management',orderId:'implements'}));
 assert.match(nav.orderHub(),/href="\/implements\/#\/models"/);assert.ok(!nav.orderHub().includes('LAE Import'));
});

test('production reviewers have only BOM navigation and clickable home; purchasing users need the separate BOM scope',()=>{
 const make=user=>createNavigation({...host({view:'home'}),context:()=>({ui:{view:'home'},user}),head:()=>'',button:()=>''});
 const nav=make({role:'BOM_REVIEWER',scopes:['BOM_MANAGEMENT','IMPLEMENTS_DOMESTIC']});assert.match(nav.divisionHub('implements'),/href="\/bom\/"/);assert.ok(!nav.home().includes('href="#/order-management"'));assert.ok(!nav.sidebar().includes('value="vms"'));assert.match(nav.sidebar(),/aria-label="Farming Hub home"/);
 assert.ok(!make({role:'MANAGER',scopes:['IMPLEMENTS_DOMESTIC']}).divisionHub('implements').includes('href="/bom/"'));assert.match(make({role:'MANAGER',scopes:['BOM_MANAGEMENT']}).divisionHub('implements'),/href="\/bom\/"/);assert.equal(moduleDestination('bom-management'),'/bom/');
});
test('production operators have stock and BOM modules without commercial navigation and stock-only grants have no dead BOM link',()=>{
 const make=user=>createNavigation({...host({view:'home'}),context:()=>({ui:{view:'home'},user}),head:()=>'',button:()=>''});
 const nav=make({role:'PRODUCTION_OPERATOR',scopes:['PRODUCTION_MANAGEMENT','BOM_MANAGEMENT','IMPLEMENTS_DOMESTIC']});assert.match(nav.divisionHub('implements'),/href="\/production\/"/);assert.match(nav.divisionHub('implements'),/href="\/bom\/"/);assert.ok(!nav.home().includes('href="#/order-management"'));assert.ok(!nav.sidebar().includes('value="vms"'));assert.match(nav.sidebar(),/value="production-stock"/);
 assert.ok(!make({role:'PRODUCTION_OPERATOR',scopes:['PRODUCTION_MANAGEMENT']}).divisionHub('implements').includes('href="/bom/"'));assert.ok(!make({role:'BOM_REVIEWER',scopes:['BOM_MANAGEMENT','PRODUCTION_MANAGEMENT']}).divisionHub('implements').includes('href="/production/"'));assert.equal(moduleDestination('production-stock'),'/production/');
});

test('LAE Division opens each LAE module directly and preserves Utility and Implements access',()=>{
 const nav=createNavigation(host({view:'home'}));
 assert.deepEqual(cardDestinations(nav.home()),['#/division/lae','#/division/implements','/price-workings/']);
 const lae=nav.divisionHub('lae'),implementsHub=nav.divisionHub('implements');
 assert.deepEqual(
  [...lae.matchAll(/<a class="module-card [^"]*" href="([^"]+)"[^>]*>[\s\S]*?<h2>([^<]+)<\/h2>/g)].map(([,href,label])=>[href,label]),
  [['#/orders','Orders'],['#/scm','SCM'],['#/lae-plm','PLM'],['#/domestic/models','Domestic'],['#/purchase-analytics','Purchase Analytics'],['/lae-analytics/','Sales Analytics']],
 );
 assert.deepEqual(cardDestinations(implementsHub),['/implements/#/models','/bom/','/production/','/planning/']);
 const categories=nav.orderHub();assert.ok(!categories.includes('href="#/order-management/implements"'));
 for(const [to,path] of [['division/implements','/#/division/implements'],['division/lae','/#/division/lae'],['purchase-analytics','/#/purchase-analytics'],['lae-sales-analytics','/lae-analytics/'],['implements-purchase','/implements/#/models'],['bom-management','/bom/'],['production-stock','/production/']])assert.equal(globalDestination(to),path);
 const sidebar=nav.sidebar();
 assert.match(sidebar,/<optgroup label="LAE Division">/);assert.match(sidebar,/<optgroup label="Implements Division">/);
 for(const [to,label] of [['orders','Orders'],['scm','SCM'],['lae-plm','PLM'],['domestic/models','Domestic'],['purchase-analytics','Purchase Analytics'],['lae-sales-analytics','Sales Analytics']])assert.ok(sidebar.includes('<option value="'+to+'">'+label+'</option>'),to);
});
test('monthly planners see only their cost-free plan entry, even with mistaken commercial or production grants',()=>{
 const nav=createNavigation({...host({view:'home'}),context:()=>({ui:{view:'home'},user:{role:'PLAN_OPERATOR',scopes:['IMPLEMENTS_PLANNING','IMPLEMENTS_DOMESTIC','LAE_IMPORT','BOM_MANAGEMENT','PRODUCTION_MANAGEMENT']}})});
 const hub=nav.divisionHub('implements');assert.match(hub,/href="\/planning\/"/);for(const path of ['/implements/','/bom/','/production/'])assert(!hub.includes(path));assert(!nav.home().includes('division/lae'));assert(!nav.sidebar().includes('value="vms"'));
 assert.equal(globalDestination('monthly-planning'),'/planning/');
 const shell=createNavigation({...host({view:'monthly-planning',orderId:'plans'}),planningSections:[['plans','My plans','clock']]});assert.match(shell.sidebar(),/monthly-planning\/plans/);assert.match(shell.breadcrumb('Monthly plans'),/href="\/#\/division\/implements"/);
});
test('restricted roles cannot see commercial cards even with mistaken commercial scopes',()=>{
 for(const role of ['BOM_REVIEWER','PRODUCTION_OPERATOR']){
 const nav=createNavigation({...host({view:'home'}),context:()=>({ui:{view:'home'},user:{role,scopes:['BOM_MANAGEMENT','PRODUCTION_MANAGEMENT','IMPLEMENTS_DOMESTIC']}})});
 assert.match(nav.home(),/href="#\/division\/implements"/);assert.ok(!nav.home().includes('href="#/division/lae"'));
 assert.ok(!nav.divisionHub('implements').includes('/implements/#/models'));
 assert.ok(!nav.divisionHub('lae').includes('class="module-card'));
 assert.ok(!nav.sidebar().includes('value="implements-purchase"'));assert.ok(!nav.sidebar().includes('optgroup label="LAE Division"'));
 }
});
test('breadcrumbs connect each module to its parent division',()=>{
 for(const view of ['implements','bom-management','production-stock'])assert.match(createNavigation(host({view,orderId:'models'})).breadcrumb('Details'),/href="\/#\/division\/implements"/);
 for(const view of ['overview','domestic','vms','order-management'])assert.match(createNavigation(host({view,orderId:'models'})).breadcrumb('Details'),/href="#\/division\/lae"/);
 const nav=createNavigation(host({view:'division',orderId:'implements'}));assert.match(nav.breadcrumb('Roadmap'),/<b>Implements Division<\/b>/);assert.ok(!nav.breadcrumb('Roadmap').includes('Roadmap'));
});

 test('Utility home and module entry require commercial role and Utility scope',()=>{
 const navFor=user=>createNavigation({...host({view:'home'}),context:()=>({ui:{view:'home'},user})});
 for(const role of ['MANAGER','EXECUTIVE','PRODUCT_MANAGER','VIEWER']){
  const allowed=navFor({role,scopes:['UTILITY_DOMESTIC']});assert.match(allowed.home(),/href="\/price-workings\/"/);assert.match(allowed.sidebar(),/value="price-workings"/);
  const denied=navFor({role,scopes:['LAE_IMPORT']});assert(!denied.home().includes('/price-workings/'));assert(!denied.sidebar().includes('value="price-workings"'));
 }
 for(const role of ['BOM_REVIEWER','PRODUCTION_OPERATOR','PLAN_OPERATOR'])assert(!navFor({role,scopes:['UTILITY_DOMESTIC']}).home().includes('/price-workings/'));
 assert.equal(globalDestination('price-workings'),'/price-workings/');
 });

test('Thyagu scope combination shows Implements and Utility without LAE entries',()=>{
 const ui={view:'home'},user={role:'MANAGER',active:true,scopes:['UTILITY_DOMESTIC','IMPLEMENTS_DOMESTIC','BOM_MANAGEMENT','PRODUCTION_MANAGEMENT']};
 const nav=createNavigation({...host(ui),context:()=>({ui,user})});
 assert.equal((nav.home().match(/class="module-card /g)||[]).length,2);
 assert.match(nav.home(),/href="\/price-workings\/"/);assert.match(nav.home(),/href="#\/division\/implements"/);
 for(const html of [nav.home(),nav.sidebar(),nav.divisionHub('lae'),nav.orderHub()]){
  for(const forbidden of ['href="#/division/lae"','data-to="division/lae"','value="vms"','href="#/overview"','href="#/domestic/models"'])assert(!html.includes(forbidden),forbidden);
 }
 const hub=nav.divisionHub('implements');for(const path of ['/implements/#/models','/bom/','/production/','/planning/'])assert(hub.includes('href="'+path+'"'));
 for(const view of ['overview','orders','vms','domestic','payments','loading'])assert.equal(nav.canAccessView(view),false,view);
 assert.equal(nav.canAccessView('price-workings'),true);
 ui.view='overview';assert.equal(nav.area(),'home');assert(!nav.breadcrumb('Overview').includes('LAE'));assert.match(nav.breadcrumb('Overview'),/Module unavailable/);
});

test('single-scope LAE accounts see only their assigned category and VMS requires Import',()=>{
 for(const scope of ['LAE_IMPORT','LAE_DOMESTIC']){
  const ui={view:'order-management'},user={role:'MANAGER',scopes:[scope]};const nav=createNavigation({...host(ui),context:()=>({ui,user})});
  const own=scope==='LAE_IMPORT'?'overview':'domestic/models',other=scope==='LAE_IMPORT'?'domestic/models':'overview';
  assert.match(nav.home(),/href="#\/division\/lae"/);assert(nav.orderHub().includes('href="#/'+own+'"'));assert(!nav.orderHub().includes('href="#/'+other+'"'));
  assert.deepEqual(cardDestinations(nav.divisionHub('lae')),scope==='LAE_IMPORT'
   ?['#/orders','#/scm','#/lae-plm','#/purchase-analytics','/lae-analytics/']
   :['#/domestic/models','/lae-analytics/']);
  assert.equal(nav.orderHub().includes('href="#/scm"'),scope==='LAE_IMPORT');
  assert.ok(!nav.divisionHub('lae').includes('href="#/vms"'));
  assert.equal(nav.canAccessView('vms'),scope==='LAE_IMPORT');
  assert(!nav.orderHub().includes('Utility Division'));
  ui.orderId=scope==='LAE_IMPORT'?'lae-domestic':'lae-import';assert(!nav.orderHub().includes('class="module-card'));assert.equal(nav.canAccessView(),false);
  ui.view=scope==='LAE_IMPORT'?'domestic':'overview';assert.equal(nav.canAccessView(),false);assert(!nav.sidebar().includes('data-to="'+other+'"'));
 }
});

test('purchase analytics owns the four existing report routes and their active drawer context',()=>{
 const ui={view:'purchase-analytics'},nav=createNavigation(host(ui));
 assert.equal(nav.area(),'purchase-analytics');
 assert.deepEqual(cardDestinations(nav.purchaseAnalyticsHub()),purchaseReports.map(to=>'#/'+to));
 assert.match(nav.breadcrumb('Purchase Analytics'),/href="#\/division\/lae">LAE Division<\/a>/);
 for(const [view,title] of [
  ['stock-aging','Stock Aging'],['current-stock-costing','Current stock costing'],
  ['landing-prices','Landing prices'],['ro-costings','RO costings'],
 ]){
  ui.view=view;ui.orderId=view==='ro-costings'?'RO 1652 / revised':null;
  assert.equal(nav.canAccessView(),true,view);
  assert.equal(nav.area(),'purchase-analytics',view);
  const sidebar=nav.sidebar();
  assert.deepEqual(currentSections(sidebar),[view]);
  for(const to of purchaseReports)assert.ok(sidebar.includes('data-to="'+to+'"'),to);
  for(const to of ['orders','payments','loading','shipments','vms','vendors','items','prices','plm'])assert.ok(!sidebar.includes('data-to="'+to+'"'),to);
  const breadcrumb=nav.breadcrumb(title);
  assert.match(breadcrumb,/href="#\/division\/lae">LAE Division<\/a>/);
  assert.match(breadcrumb,/href="#\/purchase-analytics">Purchase Analytics<\/a>/);
  assert.ok(breadcrumb.includes('<b>'+title+'</b>'),view);
 }
});

test('forecast and technical product routes share the standalone LAE PLM module and Import scope',()=>{
 const ui={view:'lae-plm'},nav=createNavigation(host(ui));
 for(const [view,selected] of [['lae-plm','lae-plm'],['plm','plm'],['product','plm']]){
  ui.view=view;
  assert.equal(nav.area(),'plm');
  assert.deepEqual(currentSections(nav.sidebar()),[selected]);
  assert.match(nav.sidebar(),/data-to="division\/lae"/);
  assert.match(nav.breadcrumb('Details'),/href="#\/division\/lae"/);
  if(view!=='lae-plm')assert.match(nav.breadcrumb('Details'),/href="#\/lae-plm"/);
  for(const scope of ['LAE_DOMESTIC','UTILITY_DOMESTIC','IMPLEMENTS_DOMESTIC']){
   const denied=createNavigation(host(ui,{role:'VIEWER',scopes:[scope]}));
   assert.equal(denied.canAccessView(),false);
   assert.doesNotMatch(denied.sidebar(),/value="lae-plm"/);
  }
 }
});

test('purchase orders retains its scoped operations, supplier tools, and detail navigation',()=>{
 const ui={view:'order-management'},nav=createNavigation(host(ui));
 assert.deepEqual(cardDestinations(nav.orderHub()),['#/overview','#/scm','#/domestic/models']);
 for(const [view,orderId,active] of [['order','PO-123','orders'],['payment-planner',null,'payments']]){
  ui.view=view;ui.orderId=orderId;
  const sidebar=nav.sidebar();
  assert.deepEqual(currentSections(sidebar),[active]);
  for(const to of ['overview','orders','tasks','payments','flow-map','documents','vms','vendors','items','prices','plm'])assert.ok(sidebar.includes('data-to="'+to+'"'),to);
  for(const to of purchaseReports)assert.ok(!sidebar.includes('data-to="'+to+'"'),to);
  assert.match(nav.breadcrumb('Details'),/href="#\/orders">Orders<\/a>/);
  assert.equal(nav.showImportTools(),true);
 }
 ui.view='domestic';ui.orderId='po-123';
 assert.deepEqual(currentSections(nav.sidebar()),['domestic/orders']);
 assert.match(nav.breadcrumb('Details'),/href="#\/domestic\/orders">Purchase orders<\/a>/);
 assert.equal(nav.showImportTools(),false);
 ui.view='vms';ui.orderId='vendor-123';
 assert.match(nav.sidebar(),/Vendor sections/);
 assert.match(nav.breadcrumb('Details'),/href="#\/orders">Orders<\/a>/);
 assert.equal(nav.showImportTools(),false);
});

test('Domestic breadcrumbs follow the selected tab and preserve assembly and PO context',()=>{
 const ui={view:'domestic'},user={role:'MANAGER',scopes:['LAE_DOMESTIC']};
 const state={domesticOrders:[{id:'dom-1',number:'FH-LAE-D-PO-1'}],domesticModels:[{id:'model-1',code:'TX-MM1'}],domesticBoms:[{id:'assembly-1',code:'CAN-1',kind:'CAN_SET'}]};
 const nav=createNavigation({...host(ui,user),context:()=>({ui,user,state})});
 for(const [id,section,label] of [
  ['models','models','Model BOMs'],['sets','sets','Assembly BOMs'],['items','items','Item Master'],
  ['vendors','vendors','Supplier master'],['prices','prices','Price lists'],['orders','orders','Purchase orders'],
  ['model-1','models','TX-MM1'],['assembly-1','sets','CAN-1'],['po-dom-1','orders','FH-LAE-D-PO-1'],
 ]){
  ui.orderId=id;
  assert.deepEqual(currentSections(nav.sidebar()),['domestic/'+section],id);
  const breadcrumb=nav.breadcrumb('Roadmap');
  assert.match(breadcrumb,/href="#\/division\/lae">LAE Division<\/a>/);
  assert.match(breadcrumb,/href="#\/domestic\/models">Domestic<\/a>/);
  assert.ok(breadcrumb.endsWith('<b>'+label+'</b></div>'),id);
  assert.equal(nav.showImportTools(),false);
 }
});

test('purchase analytics is Import-only and Sales Analytics keeps both existing LAE grants',()=>{
 for(const [scope,hasImport,hasSales] of [['LAE_IMPORT',true,true],['LAE_DOMESTIC',false,true],['UTILITY_DOMESTIC',false,false]]){
  const ui={view:'division',orderId:'lae'},nav=createNavigation(host(ui,{role:'MANAGER',scopes:[scope]}));
  const hub=cardDestinations(nav.divisionHub());
  assert.equal(hub.includes('#/purchase-analytics'),hasImport);
  assert.equal(hub.includes('/lae-analytics/'),hasSales);
  assert.equal(nav.sidebar().includes('value="purchase-analytics"'),hasImport);
  assert.equal(nav.sidebar().includes('value="lae-sales-analytics"'),hasSales);
  for(const view of ['purchase-analytics',...purchaseReports]){
   ui.view=view;
   assert.equal(nav.canAccessView(),hasImport,view);
   if(!hasImport){
    assert.equal(nav.area(),'home',view);
    assert.match(nav.breadcrumb('Details'),/Module unavailable/);
    for(const to of purchaseReports)assert.ok(!nav.sidebar().includes('data-to="'+to+'"'),to);
   }
  }
  ui.view='lae-sales-analytics';ui.orderId='stock';
  assert.equal(nav.canAccessView(),hasSales);
  assert.deepEqual(currentSections(nav.sidebar()),hasSales?['lae-sales-analytics/stock']:[]);
 }
});

test('sales analytics in the standalone review returns to its own LAE division hash',()=>{
 const ui={view:'division',orderId:'lae'},nav=createNavigation(host(ui,undefined,true));
 assert.ok(cardDestinations(nav.divisionHub()).includes('#/lae-sales-analytics'));
 ui.view='lae-sales-analytics';ui.orderId='stock';
 assert.match(nav.breadcrumb('Sales Analytics Module'),/href="#\/division\/lae">LAE Division<\/a>/);
 assert.deepEqual(currentSections(nav.sidebar()),['lae-sales-analytics/stock']);
});

test('technical, unassigned and inactive profiles do not receive LAE or Utility navigation',()=>{
 for(const user of [{role:'MANAGER',scopes:[]},{role:'MANAGER',active:false,scopes:['LAE_IMPORT','UTILITY_DOMESTIC']},...['BOM_REVIEWER','PRODUCTION_OPERATOR','PLAN_OPERATOR'].map(role=>({role,scopes:['LAE_IMPORT','LAE_DOMESTIC','UTILITY_DOMESTIC']}))]){
  const ui={view:'order-management'},nav=createNavigation({...host(ui),context:()=>({ui,user})});
  assert(!nav.home().includes('division/lae'));assert(!nav.home().includes('/price-workings/'));assert(!nav.orderHub().includes('class="module-card'));
  assert.equal(nav.canAccessView('overview'),false);assert.equal(nav.canAccessView('domestic'),false);assert.equal(nav.canAccessView('vms'),false);
 }
});


test('Payment planner is nested under Payments, with scoped entry and return navigation',()=>{
 const nav=createNavigation(host({view:'payment-planner'}));
 assert.equal(nav.area(),'orders');assert.equal(nav.canAccessView(),true);
 assert.ok(!nav.sidebar().includes('data-to="payment-planner"'));
 assert.ok(nav.sidebar().includes('data-to="payments" aria-current="page"'));
 assert.match(nav.breadcrumb('Payment planner'),/href="#\/payments">Payments<\/a>/);
 assert.match(nav.paymentSections(),/data-to="payment-planner" aria-current="page"/);
 const payments=createNavigation(host({view:'payments'}));
 assert.match(payments.paymentSections(),/data-to="payments" aria-current="page"/);
 assert.ok(payments.paymentSections().includes('data-to="payment-planner"'));
 const denied=createNavigation({...host({view:'payment-planner'}),context:()=>({ui:{view:'payment-planner'},user:{role:'VIEWER',scopes:['UTILITY_DOMESTIC']}})});
 assert.equal(denied.canAccessView(),false);assert.equal(denied.paymentSections(),'');
});
test('shared navigation starts closed and inaccessible even with stale mobile-open state',()=>{
 for(const view of ['overview','domestic','vms','purchase-analytics',...purchaseReports,'lae-sales-analytics','implements','bom-management','production-stock','monthly-planning']){
  const markup=createNavigation(host({view,orderId:'models',mobile:true})).sidebar();
  assert.match(markup,/<aside id="purchase-navigation" class="sidebar module-sidebar" inert aria-hidden="true">/);
  assert.doesNotMatch(markup,/module-sidebar open/);
  assert.match(markup,/aria-label="Farming Hub home"/);
  assert.match(markup,/id="module-select"/);
 }
});
