import test from 'node:test';
import assert from 'node:assert/strict';
import {createSeed} from '../shared/seed.mjs';
import {execute} from '../shared/domain.mjs';
import {vmsConfig,vmsEvaluation,vmsFollowups,vmsConcentration,vmsBusinessDay,vmsInteractionDates,vmsInteractionHistory,vmsProfileSnapshot,VMS_CRITERIA} from '../shared/vms.mjs';
import {scopedState,makeServer} from '../server/index.mjs';
import {Store} from '../server/store.mjs';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
function fixture(){let state=createSeed('2026-09-11'),n=0;const user=state.users.find(u=>u.role==='MANAGER'),vendorId=state.vendors.find(v=>v.scopes.includes('LAE_IMPORT')).id;return {get state(){return state;},user,vendorId,run(type,p={},actor=user){const r=execute(state,{type,payload:{vendorId,...p}},actor,{now:'2026-09-13T12:00:00Z',id:()=>`vms-test-${++n}`});state=r.state;return r.result;},profile(p={}){return {contacts:[{name:'Contact person',phone:'123',email:'test@example.test'}],products:[],components:[],...p};}};}
test('VMS evaluation preserves weighted partial calculation and exact grade boundaries',()=>{
 assert.equal(VMS_CRITERIA.reduce((n,x)=>n+x[2],0),100);
 assert.deepEqual(vmsEvaluation(),{score:null,percentage:null,grade:null,status:'Not evaluated',count:0});
 const partial=vmsEvaluation({evalProductQuality:5,evalQualityControl:3});assert.equal(partial.score,4.14);assert.equal(partial.percentage,82.8);assert.equal(partial.grade,'A');assert.equal(partial.count,2);
 for(const n of [1,2,3,4,5])assert.equal(vmsEvaluation(Object.fromEntries(VMS_CRITERIA.map(([k])=>[k,n]))).score,n);
 assert.equal(vmsEvaluation({evalProductQuality:5}).grade,'A+');assert.equal(vmsEvaluation({evalProductQuality:3}).grade,'C');assert.equal(vmsEvaluation({evalProductQuality:2}).grade,'D');
});
test('VMS profile shares vendor identity and leaves commercial data, POs and issued snapshots untouched',()=>{
 const f=fixture(),before=structuredClone(f.state),v=before.vendors.find(v=>v.id===f.vendorId);f.run('VMS_SAVE_PROFILE',f.profile({city:'Ningbo',country:'China',stageId:'stage-0',remarks:'Sourcing note'}));
 const after=f.state.vendors.find(v=>v.id===f.vendorId);assert.deepEqual(Object.fromEntries(Object.entries(after).filter(([k])=>!['crm','contact','email','phone','wechat','city','country','updatedAt'].includes(k))),Object.fromEntries(Object.entries(v).filter(([k])=>!['contact','email','phone','wechat','city','country','updatedAt'].includes(k))));assert.deepEqual(f.state.orders,before.orders);assert.deepEqual(f.state.payments,before.payments);assert.equal(after.name,v.name);assert.equal(after.contact,'Contact person');assert.equal(after.city,'Ningbo');assert.equal(after.crm.contacts[0].name,'Contact person');assert.deepEqual(f.state.events.slice(0,before.events.length),before.events);assert.equal(f.state.events.at(-1).entityId,f.vendorId);
 f.run('VMS_SAVE_EVALUATION',{scores:{evalProductQuality:1}});assert.equal(f.state.vendors.find(v=>v.id===f.vendorId).status,v.status);
});
test('VMS roles are server enforced and legacy viewer never gains write permission',()=>{
 const f=fixture();for(const role of ['EXECUTIVE','PRODUCT_MANAGER','VIEWER']){const actor=f.state.users.find(u=>u.role===role);for(const type of ['VMS_SAVE_PROFILE','VMS_SAVE_EVALUATION','VMS_SAVE_SAMPLE','VMS_SAVE_CATALOG'])assert.throws(()=>f.run(type,f.profile({kind:'products',name:'Test'}),actor),e=>e.code==='FORBIDDEN');}
 for(const role of ['PRODUCT_MANAGER','VIEWER'])assert.throws(()=>f.run('VMS_ADD_INTERACTION',{notes:'x'},f.state.users.find(u=>u.role===role)),e=>e.code==='FORBIDDEN');
 assert.throws(()=>f.run('VMS_SAVE_PROFILE',f.profile(),{...f.user,scopes:['UTILITY_DOMESTIC']}),e=>e.code==='FORBIDDEN');assert.throws(()=>f.run('VMS_SAVE_PROFILE',f.profile(),{...f.user,active:false}),e=>e.code==='FORBIDDEN');
});
test('VMS validation rejects malformed contacts, references, dates, numbers and foreign file links atomically',()=>{
 const f=fixture(),before=structuredClone(f.state);
 for(const change of [{contacts:[{name:''}]},{contacts:[{name:'x',email:'invalid'}]},{stageId:'unknown'},{expoId:'unknown'},{products:['missing']},{assignedToId:'u-viewer'},{annualVolume:'-1'},{website:'javascript:alert(1)'}])assert.throws(()=>f.run('VMS_SAVE_PROFILE',f.profile(change)));
 for(const scores of [{evalProductQuality:6},{evalProductQuality:1.5},{evalProductQuality:'nonsense'}])assert.throws(()=>f.run('VMS_SAVE_EVALUATION',{scores}));
 for(const change of [{occurredAt:'2026-02-30'},{occurredAt:'2026-09-14'},{nextFollowUpAt:'2026-09-10'},{nextFollowUpAt:'invalid'},{fileIds:['missing']},{notes:'',fileIds:[]}])assert.throws(()=>f.run('VMS_ADD_INTERACTION',{type:'NOTE',notes:'Test',occurredAt:'2026-09-11',nextFollowUpAt:'2026-09-13',...change}));
 assert.deepEqual(f.state,before);
});
test('VMS catalogues retain inactive entries, unique names and all links',()=>{
 const f=fixture(),tag=f.run('VMS_SAVE_CATALOG',{kind:'products',name:'Engines'}).id;f.run('VMS_SAVE_PROFILE',f.profile({products:[tag]}));f.run('VMS_SAVE_CATALOG',{kind:'products',id:tag,name:'Engines',active:false});assert.equal(vmsConfig(f.state).products[0].active,false);assert.deepEqual(f.state.vendors.find(v=>v.id===f.vendorId).crm.products,[tag]);assert.throws(()=>f.run('VMS_SAVE_CATALOG',{kind:'products',name:' engines '}),/already exists/);assert.throws(()=>f.run('VMS_SAVE_CATALOG',{kind:'expos',name:'Expo',startDate:'2026-10-10',endDate:'2026-10-01'}),/precedes/);
});
test('shared vendor master and CRM keep primary contact and location synchronized without losing secondary contacts',()=>{
 const f=fixture(),before=f.state.vendors.find(v=>v.id===f.vendorId);f.run('VMS_SAVE_PROFILE',f.profile({contacts:[{name:'First',phone:'123'},{name:'Second',email:'second@example.test'}],city:'Ningbo',country:'China'}));assert.equal(f.state.events.at(-1).oldValue.primaryContact.contact,before.contact||'');const saved=f.state.vendors.find(v=>v.id===f.vendorId);f.run('SAVE_VENDOR',{...saved,contact:'Changed in master',phone:'456',city:'Shanghai'});const v=f.state.vendors.find(v=>v.id===f.vendorId);assert.equal(v.crm.contacts[0].name,'Changed in master');assert.equal(v.crm.contacts[0].phone,'456');assert.equal(v.crm.contacts[1].name,'Second');assert.equal(v.crm.city,'Shanghai');assert.equal(v.crm.country,v.country);
});
test('VMS keeps every open follow-up visible after newer contact completion and backfill',()=>{
 const f=fixture(),exec=f.state.users.find(u=>u.role==='EXECUTIVE');f.run('VMS_ADD_INTERACTION',{type:'CALL',notes:'Latest',occurredAt:'2026-09-13',nextFollowUpAt:'2026-09-13'},exec);f.run('VMS_ADD_INTERACTION',{type:'VISIT',notes:'Older',occurredAt:'2026-09-11',nextFollowUpAt:'2026-09-12'});
 let rows=vmsFollowups(f.state.vendors,'2026-09-13');assert.deepEqual(rows.map(r=>[r.interaction.notes,r.status]),[['Older','Overdue'],['Latest','Today']]);const id=rows[1].interaction.id;
 f.run('VMS_UPDATE_FOLLOWUP',{interactionId:id,completed:true,remarks:'Reached supplier',nextFollowUpAt:'2026-09-13'},exec);assert.deepEqual(vmsFollowups(f.state.vendors,'2026-09-14').map(r=>r.status),['Overdue','Completed']);
 f.run('VMS_UPDATE_FOLLOWUP',{interactionId:id,completed:false,remarks:'Reopened',nextFollowUpAt:'2026-09-13'});assert.deepEqual(vmsFollowups(f.state.vendors,'2026-09-14').map(r=>r.status),['Overdue','Overdue']);assert.equal(f.state.vendors.find(v=>v.id===f.vendorId).crm.interactions.length,2);
 assert.deepEqual(vmsInteractionHistory(f.state.vendors.find(v=>v.id===f.vendorId).crm.interactions).map(i=>i.notes),['Latest','Older']);assert.ok(f.state.events.some(e=>JSON.stringify(e).includes('Reached supplier')));
});
test('historical visits without a next action create history without artificial reminders',()=>{
 const f=fixture();f.run('VMS_ADD_INTERACTION',{type:'VISIT',notes:'Completed factory visit',occurredAt:'2026-09-11'});const i=f.state.vendors.find(v=>v.id===f.vendorId).crm.interactions[0];assert.equal(i.nextFollowUpAt,'');assert.equal(vmsFollowups(f.state.vendors,'2026-09-13').length,0);assert.equal(i.type,'VISIT');
});
test('VMS dates use India midnight, reject invalid dates and preserve date-only history',()=>{
 assert.equal(vmsBusinessDay('2026-09-13T18:29:59Z'),'2026-09-13');assert.equal(vmsBusinessDay('2026-09-13T18:30:00Z'),'2026-09-14');
 const f=fixture(),cmd={type:'VMS_ADD_INTERACTION',payload:{vendorId:f.vendorId,type:'VISIT',notes:'Today in India',occurredAt:'2026-09-14'}};
 const s=execute(f.state,cmd,f.user,{now:'2026-09-13T18:30:00Z'}).state;assert.equal(s.vendors.find(v=>v.id===f.vendorId).crm.interactions[0].occurredAt,'2026-09-14');
 assert.throws(()=>execute(f.state,cmd,f.user,{now:'2026-09-13T18:29:59Z'}),/future/);
 for(const occurredAt of ['2026-02-30','2026-9-01',null])assert.throws(()=>vmsInteractionDates({occurredAt},'2026-09-14T00:00:00Z'),/valid/);
});
test('VMS samples use explicit currency and integer minor units',()=>{
 const f=fixture();f.run('VMS_SAVE_SAMPLE',{name:'Engine',status:'REQUESTED',currency:'CNY',price:'125.25'});const s=f.state.vendors.find(v=>v.id===f.vendorId).crm.samples[0];assert.equal(s.priceMinor,12525);assert.equal(s.currency,'CNY');f.run('VMS_SAVE_SAMPLE',{id:s.id,name:'Engine',status:'APPROVED',currency:'CNY',price:'125.25',qualityRemarks:'Checked'});assert.equal(f.state.vendors.find(v=>v.id===f.vendorId).crm.samples.length,1);assert.throws(()=>f.run('VMS_SAVE_SAMPLE',{name:'Bad',status:'APPROVED',currency:'CNY',price:'-1'}));
});
test('a notes-only CRM save never restores stale geography after a master location change',()=>{
 const f=fixture(),country=f.run('VMS_SAVE_CATALOG',{kind:'countries',name:'China'}).id,region=f.run('VMS_SAVE_CATALOG',{kind:'regions',name:'Zhejiang',parentId:country}).id,district=f.run('VMS_SAVE_CATALOG',{kind:'districts',name:'Ningbo',parentId:region}).id;
 f.run('VMS_SAVE_PROFILE',f.profile({countryId:country,regionId:region,districtId:district}));
 let vendor=f.state.vendors.find(v=>v.id===f.vendorId);f.run('SAVE_VENDOR',{...vendor,city:'Shanghai'});vendor=f.state.vendors.find(v=>v.id===f.vendorId);
 assert.equal(vendor.crm.districtId,'');assert.equal(vendor.crm.regionId,'');assert.equal(vendor.crm.countryId,country);
 f.run('VMS_SAVE_PROFILE',{...vmsProfileSnapshot(vendor),remarks:'Only notes changed'});vendor=f.state.vendors.find(v=>v.id===f.vendorId);assert.equal(vendor.city,'Shanghai');assert.equal(vendor.country,'China');
 // A record left inconsistent by an older version is repaired only on its next explicit save.
 vendor.crm.regionId=region;vendor.crm.districtId=district;vendor.crm.region='Zhejiang';
 f.run('VMS_SAVE_PROFILE',{...vmsProfileSnapshot(vendor),remarks:'Legacy stale links'});vendor=f.state.vendors.find(v=>v.id===f.vendorId);assert.equal(vendor.city,'Shanghai');assert.equal(vendor.crm.districtId,'');assert.equal(vendor.crm.region,'');
 f.run('SAVE_VENDOR',{...vendor,country:'India'});vendor=f.state.vendors.find(v=>v.id===f.vendorId);assert.equal(vendor.crm.countryId,'');f.run('VMS_SAVE_PROFILE',{...vmsProfileSnapshot(vendor),remarks:'More notes'});assert.equal(f.state.vendors.find(v=>v.id===f.vendorId).country,'India');
});
test('VMS sourcing coverage reports zero, single, and multiple supplier gaps',()=>{
 const config={products:[{id:'p',name:'Engines'}]};assert.equal(vmsConcentration([],config)[0].risk,'CRITICAL');const supplier={status:'ACTIVE',crm:{products:['p']}};assert.equal(vmsConcentration([supplier],config)[0].risk,'CRITICAL');assert.equal(vmsConcentration([supplier,supplier],config)[0].risk,'HIGH');assert.equal(vmsConcentration([supplier,supplier,supplier],config)[0].equalShare,33);assert.equal(vmsConcentration(Array(4).fill(supplier),config)[0].risk,'LOW');
});
test('VMS component coverage preserves the original stage-based risk rule separately from product coverage',()=>{
 const config={components:[{id:'c',name:'Motor'}],stages:[{id:'lead',countsInSourcing:false},{id:'potential',countsInSourcing:true}]},v=stageId=>({status:'ACTIVE',crm:{stageId,components:['c']}});assert.equal(vmsConcentration([v('lead')],config,'components')[0].total,0);const report=vmsConcentration([v('lead'),v('potential'),v('')],config,'components')[0];assert.equal(report.total,2);assert.equal(report.risk,'MEDIUM');assert.equal(report.equalShare,50);
});
test('VMS rejects follow-up edits by another executive and retains file links without rewriting order evidence',()=>{
 const f=fixture(),executive=f.state.users.find(u=>u.role==='EXECUTIVE');f.run('VMS_ADD_INTERACTION',{type:'NOTE',notes:'Owned by manager',occurredAt:'2026-09-13',nextFollowUpAt:'2026-09-13'});const i=f.state.vendors.find(v=>v.id===f.vendorId).crm.interactions[0];assert.throws(()=>f.run('VMS_UPDATE_FOLLOWUP',{interactionId:i.id,nextFollowUpAt:'2026-09-14',remarks:'Unauthorized'},executive),e=>e.code==='FORBIDDEN');assert.throws(()=>f.run('VMS_ADD_DOCUMENT',{fileIds:[f.state.files.find(x=>x.orderIds.length)?.id]}));const file={id:'vendor-file',name:'vendor.txt',scope:'LAE_IMPORT',orderIds:[],size:5};f.state.files.push(file);f.run('VMS_ADD_DOCUMENT',{fileIds:[file.id],caption:'Vendor evidence'},executive);assert.equal(f.state.events.at(-1).newValue.fileIds[0],file.id);assert.equal(f.state.events.at(-1).oldValue,null);assert.deepEqual(f.state.files.find(x=>x.id===file.id),file);
});
test('VMS state, audit and files remain division scoped',()=>{
 const f=fixture();f.run('VMS_SAVE_PROFILE',f.profile());f.run('VMS_SAVE_CATALOG',{kind:'products',name:'Private tag'});const restricted=scopedState(f.state,{id:'other',role:'VIEWER',scopes:['UTILITY_DOMESTIC']});assert.equal(restricted.vms,undefined);assert.equal(restricted.vendors.some(v=>v.id===f.vendorId),false);assert.equal(restricted.events.some(e=>e.entityId===f.vendorId),false);
});
test('VMS authenticated transactions persist and reject stale revision and forged role',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'fh-vms-')),file=join(dir,'vms.sqlite'),seed=createSeed('2026-09-11');let store=new Store(file,seed);store.addAccount('u-manager','manager@example.test','VMS-test-only-pass-2026');store.addAccount('u-viewer','viewer@example.test','VMS-test-only-pass-2026');const server=makeServer(store);await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const login=async(email)=>{const r=await fetch(origin+'/api/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({email,password:'VMS-test-only-pass-2026'})});const cookie=r.headers.get('set-cookie').split(';')[0];const b=await(await fetch(origin+'/api/bootstrap',{headers:{Cookie:cookie}})).json();return {cookie,...b};};
 try{const m=await login('manager@example.test'),p={type:'VMS_SAVE_PROFILE',payload:{vendorId:seed.vendors[0].id,contacts:[{name:'HTTP test'}],products:[],components:[]},expectedRevision:m.state.revision},send=async(auth,payload)=>fetch(origin+'/api/commands',{method:'POST',headers:{Origin:origin,Cookie:auth.cookie,'X-CSRF-Token':auth.csrf,'Content-Type':'application/json'},body:JSON.stringify(payload)});assert.equal((await send(m,p)).status,200);assert.equal((await send(m,p)).status,409);const v=await login('viewer@example.test');assert.equal((await send(v,{...p,expectedRevision:v.state.revision,payload:{...p.payload,user:{role:'ADMIN'}}})).status,403);for(const path of ['/vms.mjs','/shared/vms.mjs'])assert.equal((await fetch(origin+path)).status,200);assert.equal(store.read().vendors[0].crm.contacts[0].name,'HTTP test');
 }finally{await new Promise(r=>server.close(r));store.close();store=new Store(file);assert.equal(store.read().vendors[0].crm.contacts[0].name,'HTTP test');store.close();rmSync(dir,{recursive:true,force:true});}
});
