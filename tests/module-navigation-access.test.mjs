import test from 'node:test';
import assert from 'node:assert/strict';
import {Store} from '../server/store.mjs';
import {emptyState} from '../server/index.mjs';
import {ImplementsStore} from '../server/implements-store.mjs';
import {BomManagementStore} from '../server/bom-management-store.mjs';
import {ProductionStore} from '../server/production-store.mjs';
import {PlanningStore} from '../server/planning-store.mjs';
import {createNavigation} from '../web/navigation.mjs';

const navigation=user=>createNavigation({context:()=>({user,ui:{view:'home'}}),icon:()=>'',esc:String,head:()=>'',button:()=>'',logo:'',vmsNavigation:()=>''});
test('workspace profiles preserve cross-module navigation without changing account scopes or business data',()=>{
 const state=emptyState(),scopes=['UTILITY_DOMESTIC','IMPLEMENTS_DOMESTIC','BOM_MANAGEMENT','PRODUCTION_MANAGEMENT'];
 state.users.push({id:'multi-manager',name:'Review manager',role:'MANAGER',active:true,scopes});
 const store=new Store(':memory:',state);
 try{
  const source=new ImplementsStore(store),modules=[new BomManagementStore(store,source),new ProductionStore(store,source),new PlanningStore(store,source)],before=structuredClone(store.read()),purchase=structuredClone(source.read());
  for(const module of modules){const profile=module.read('multi-manager').user;assert.deepEqual(profile.scopes,scopes);const nav=navigation(profile);assert(!nav.home().includes('division/lae'));assert(nav.home().includes('/price-workings/'));
   for(const path of ['/implements/#/models','/bom/','/production/','/planning/'])assert(nav.divisionHub('implements').includes('href="'+path+'"'),module.constructor.name+' '+path);
  }
  assert.deepEqual(store.read(),before);assert.deepEqual(source.read(),purchase);
 }finally{store.close();}
});

test('planning workspace retains planner navigation while accidental commercial scopes grant no extra modules',()=>{
 const state=emptyState();state.users.push({id:'planner',name:'Planner',role:'PLAN_OPERATOR',active:true,scopes:['IMPLEMENTS_PLANNING','LAE_IMPORT','UTILITY_DOMESTIC','IMPLEMENTS_DOMESTIC','BOM_MANAGEMENT','PRODUCTION_MANAGEMENT']});
 const store=new Store(':memory:',state);
 try{
  const source=new ImplementsStore(store),module=new PlanningStore(store,source),workspace=module.read('planner'),nav=navigation(workspace.user);
  assert(nav.sidebar().includes('value="monthly-planning"'));assert(nav.divisionHub('implements').includes('href="/planning/"'));
  for(const token of ['value="price-workings"','value="vms"','value="implements-purchase"','value="bom-management"','value="production-stock"'])assert(!nav.sidebar().includes(token),token);
  for(const key of ['parts','suppliers','orders','costs','priceLists','settings'])assert(!Object.hasOwn(workspace,key),key);
  assert.equal(workspace.canApprove,false);
 }finally{store.close();}
});
