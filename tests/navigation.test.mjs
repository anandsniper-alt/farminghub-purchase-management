import test from 'node:test';
import assert from 'node:assert/strict';
import {createNavigation} from '../web/navigation.mjs';
import {renderModuleShell,moduleDestination,implementsSections} from '../web/implements/shell.mjs';
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const icon=()=>'<svg></svg>';
const host=ui=>({context:()=>({ui}),esc,icon,logo:'/logo.png',vmsNavigation:()=>'<div>Vendor sections</div>'});
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
  assert.ok(shell.header.includes('href="/#/order-management/implements"'));
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
 assert.match(nav.sidebar(),/data-to="order-management\/implements" aria-current="page"/);
});

test('production reviewers have only BOM navigation and clickable home; purchasing users need the separate BOM scope',()=>{
 const make=user=>createNavigation({...host({view:'home'}),context:()=>({ui:{view:'home'},user}),head:()=>'',button:()=>''});
 const nav=make({role:'BOM_REVIEWER',scopes:['BOM_MANAGEMENT','IMPLEMENTS_DOMESTIC']});assert.match(nav.home(),/href="\/bom\/"/);assert.ok(!nav.home().includes('href="#/order-management"'));assert.ok(!nav.sidebar().includes('value="vms"'));assert.match(nav.sidebar(),/aria-label="Farming Hub home"/);
 assert.ok(!make({role:'MANAGER',scopes:['IMPLEMENTS_DOMESTIC']}).home().includes('href="/bom/"'));assert.match(make({role:'MANAGER',scopes:['BOM_MANAGEMENT']}).home(),/href="\/bom\/"/);assert.equal(moduleDestination('bom-management'),'/bom/');
});
test('production operators have stock and BOM modules without commercial navigation and stock-only grants have no dead BOM link',()=>{
 const make=user=>createNavigation({...host({view:'home'}),context:()=>({ui:{view:'home'},user}),head:()=>'',button:()=>''});
 const nav=make({role:'PRODUCTION_OPERATOR',scopes:['PRODUCTION_MANAGEMENT','BOM_MANAGEMENT','IMPLEMENTS_DOMESTIC']});assert.match(nav.home(),/href="\/production\/"/);assert.match(nav.home(),/href="\/bom\/"/);assert.ok(!nav.home().includes('href="#/order-management"'));assert.ok(!nav.sidebar().includes('value="vms"'));assert.match(nav.sidebar(),/value="production-stock"/);
 assert.ok(!make({role:'PRODUCTION_OPERATOR',scopes:['PRODUCTION_MANAGEMENT']}).home().includes('href="/bom/"'));assert.ok(!make({role:'BOM_REVIEWER',scopes:['BOM_MANAGEMENT','PRODUCTION_MANAGEMENT']}).home().includes('href="/production/"'));assert.equal(moduleDestination('production-stock'),'/production/');
});
