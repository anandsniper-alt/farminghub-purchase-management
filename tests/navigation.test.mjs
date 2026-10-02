import test from 'node:test';
import assert from 'node:assert/strict';
import {createNavigation,moduleDestination as globalDestination} from '../web/navigation.mjs';
import {renderModuleShell,moduleDestination,implementsSections} from '../web/implements/shell.mjs';
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const icon=()=>'<svg></svg>';
const host=ui=>({context:()=>({ui,user:{role:'ADMIN'}}),head:()=>'',button:()=>'',esc,icon,logo:'/logo.png',vmsNavigation:()=>'<div>Vendor sections</div>'});
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
 const cases=[['overview','orders','LAE Import','overview'],['domestic','orders','LAE Domestic','domestic/items'],['vms','vms','Vendor sections','vms']];
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

test('home separates two divisions, their modules and legacy Implements links',()=>{
 const nav=createNavigation(host({view:'home'}));
 assert.equal((nav.home().match(/class="module-card /g)||[]).length,2);
 assert.match(nav.home(),/href="#\/division\/lae"/);assert.match(nav.home(),/href="#\/division\/implements"/);
 const lae=nav.divisionHub('lae'),implementsHub=nav.divisionHub('implements');
 assert.equal((lae.match(/class="module-card /g)||[]).length,2);
 assert.match(lae,/href="#\/order-management"/);assert.match(lae,/href="#\/vms"/);assert.ok(!lae.includes('/bom/'));
 assert.equal((implementsHub.match(/class="module-card /g)||[]).length,3);
 for(const url of ['/implements/#/models','/bom/','/production/'])assert.ok(implementsHub.includes('href="'+url+'"'));
 const categories=nav.orderHub();assert.ok(!categories.includes('href="#/order-management/implements"'));
 for(const [to,path] of [['division/implements','/#/division/implements'],['division/lae','/#/division/lae'],['implements-purchase','/implements/#/models'],['bom-management','/bom/'],['production-stock','/production/']])assert.equal(globalDestination(to),path);
 assert.match(nav.sidebar(),/<optgroup label="LAE Division">/);assert.match(nav.sidebar(),/<optgroup label="Implements Division">/);
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
