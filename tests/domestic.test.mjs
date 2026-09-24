import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {domesticPreviewState,domesticCatalogue} from '../scripts/prepare-domestic-preview.mjs';
import {createCleanSeed} from '../shared/clean-seed.mjs';
import {execute} from '../shared/domain.mjs';
import {domesticBomTotals} from '../shared/domestic.mjs';
import {softwareReference} from '../shared/references.mjs';
import {Store} from '../server/store.mjs';
import {makeServer,scopedState} from '../server/index.mjs';
const user=s=>s.users.find(u=>u.role==='MANAGER');
const run=(s,type,p)=>execute(s,{type,payload:p},user(s)).state;
const save=(s,b,lines,extra={})=>run(s,'DOMESTIC_SAVE_BOM',{bomId:b.id,revision:b.revision,lines,compositionConfirmed:true,notes:'Local test',reason:'Verify BOM calculation',...extra});
test('frame assemblies contain assembly parts and roll into the major BOM without repricing saved models',()=>{
 let s=domesticPreviewState();const model=s.domesticModels[0];let major=s.domesticBoms.find(b=>b.modelId===model.id),frame=s.domesticBoms.find(b=>b.id===major.lines.find(l=>l.assemblyType==='FRAME').assemblyId);
 assert.equal(frame.lines.length,0);assert.equal(frame.status,'DRAFT');assert.ok(frame.code.startsWith('FH-LAE-D-BOM-'));
 s=save(s,frame,[{itemId:s.domesticItems[7].id,quantity:'1',rate:'100'},{itemId:s.domesticItems[5].id,quantity:'4',rate:'5'}]);frame=s.domesticBoms.find(b=>b.id===frame.id);assert.equal(domesticBomTotals(frame.lines).totalMinor,12000);
 s=save(s,major,[{assemblyId:frame.id,assemblyRevision:frame.revision,quantity:'2'}]);major=s.domesticBoms.find(b=>b.id===major.id);assert.equal(domesticBomTotals(major.lines).totalMinor,24000);assert.equal(major.lines[0].components.length,2);
 s=save(s,frame,[{itemId:s.domesticItems[7].id,quantity:'1',rate:'110'},{itemId:s.domesticItems[5].id,quantity:'4',rate:'5'}]);assert.equal(domesticBomTotals(s.domesticBoms.find(b=>b.id===major.id).lines).totalMinor,24000);assert.equal(major.lines[0].components[0].rateMinor,10000);
 frame=s.domesticBoms.find(b=>b.id===frame.id);assert.throws(()=>save(s,frame,[{assemblyId:major.id,assemblyRevision:major.revision,quantity:'1'}]),/purchased items only/);
});
test('create other assembly types with immutable reference and reject invalid type or duplicate code',()=>{
 let s=domesticPreviewState();for(const assemblyType of ['MOTOR','ENGINE','OTHER']){s=run(s,'DOMESTIC_CREATE_ASSEMBLY',{assemblyType,name:assemblyType+' parts'});const b=s.domesticBoms.at(-1);assert.equal(b.assemblyType,assemblyType);assert.equal(b.kind,'ASSEMBLY');assert.equal(b.code,softwareReference(s,'domesticBoms',b.id));}
 assert.throws(()=>run(s,'DOMESTIC_CREATE_ASSEMBLY',{assemblyType:'SPARES',name:'Wrong classification'}),/assembly type/);
 assert.throws(()=>run(s,'DOMESTIC_CREATE_ASSEMBLY',{assemblyType:'FRAME',code:'cs1',name:'Duplicate'}),/already exists/);
});
test('catalogue exactly preserves all 33 descriptions, units and source picture bytes',()=>{
 const source=JSON.parse(readFileSync(new URL('../data-reference/domestic-bom.json',import.meta.url))),s=domesticPreviewState();assert.equal(s.domesticItems.length,37);assert.equal(s.domesticModels.length,4);assert.equal(s.domesticBoms.length,10);
 source.items.forEach((raw,n)=>{const row=s.domesticItems[n];assert.equal(row.description,raw.description);assert.equal(row.uom,raw.uom);assert.equal(row.segment,raw.segment);assert.equal(row.rateMinor,null);const bytes=readFileSync(new URL('../web/assets/domestic-bom/'+row.imageAsset,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),raw.imageSha256);});
 assert.equal(new Set(s.domesticItems.map(i=>i.code)).size,37);assert.ok(s.domesticItems.every(i=>softwareReference(s,'domesticItems',i.id)));assert.ok(s.domesticBoms.every(b=>softwareReference(s,'domesticBoms',b.id)));
});
test('CS1/CS2 mapping is shared, draft, and import retry cannot duplicate it',()=>{let s=domesticPreviewState();const sets=s.domesticBoms.filter(b=>b.kind==='CAN_SET');assert.deepEqual(sets.map(b=>b.code),['CS1','CS2']);for(const m of s.domesticModels){const b=s.domesticBoms.find(b=>b.modelId===m.id);assert.equal(b.lines[1].code,m.code==='TX-MM1'?'CS1':'CS2');assert.equal(b.lines[0].quantityMilli,null);assert.equal(domesticBomTotals(b.lines).totalMinor,null);assert.equal(b.status,'DRAFT');}const r=execute(s,{type:'DOMESTIC_IMPORT_CATALOGUE',payload:domesticCatalogue()},user(s));assert.equal(r.result.alreadyImported,true);assert.deepEqual(r.state.domesticBoms,s.domesticBoms);assert.equal(r.state.events.length,s.events.length);});
test('purchase scope and active role required, including for catalogue writes',()=>{const s=domesticPreviewState();for(const actor of [{...user(s),scopes:['LAE_IMPORT']},{...user(s),role:'VIEWER'},{...user(s),active:false}])assert.throws(()=>execute(s,{type:'DOMESTIC_SAVE_ITEM',payload:{}},actor),/access|login/i);const hidden=scopedState(s,{...user(s),scopes:['LAE_IMPORT']});assert.deepEqual(hidden.domesticItems,[]);assert.deepEqual(hidden.domesticBoms,[]);assert.ok(!Object.values(hidden.recordReferences.entries).some(e=>e.type.startsWith('domestic')));assert.ok(!hidden.events.some(e=>e.entityType==='domestic'));});
test('blank values remain pending; free items, fractional lengths and half-up paise rounding are distinct',()=>{
 assert.equal(domesticBomTotals([{code:'A',quantityMilli:1000,rateMinor:null}]).totalMinor,null);
 assert.equal(domesticBomTotals([{code:'A',quantityMilli:1000,rateMinor:0}]).totalMinor,0);
 assert.equal(domesticBomTotals([{code:'A',quantityMilli:1500,rateMinor:1}]).totalMinor,2);
 assert.equal(domesticBomTotals([]).totalMinor,null);
 assert.throws(()=>domesticBomTotals([{quantityMilli:1000000000,rateMinor:Number.MAX_SAFE_INTEGER}]),/too large/);
});
test('can set cost rolls up once and old model snapshots remain unchanged until explicitly saved',()=>{
 let s=domesticPreviewState();let cs=s.domesticBoms.find(b=>b.code==='CS2');const item=s.domesticItems[0];s=save(s,cs,[{itemId:item.id,quantity:'2',rate:'10.25'}]);cs=s.domesticBoms.find(b=>b.id===cs.id);
 const model=s.domesticModels.find(m=>m.code==='GJ-MM2');let b=s.domesticBoms.find(b=>b.modelId===model.id);assert.equal(b.lines[1].assemblyRevision,1);assert.equal(domesticBomTotals(b.lines).totalMinor,null);
 s=save(s,b,[{itemId:b.lines[0].itemId,quantity:'1',rate:'500'},{assemblyId:cs.id,assemblyRevision:cs.revision,quantity:'1'}]);b=s.domesticBoms.find(x=>x.id===b.id);assert.equal(domesticBomTotals(b.lines).totalMinor,52050);assert.equal(b.status,'COSTED');assert.equal(b.history.length,1);
 s=save(s,cs,[{itemId:item.id,quantity:'2',rate:'12'}]);const saved=s.domesticBoms.find(x=>x.id===b.id);assert.equal(domesticBomTotals(saved.lines).totalMinor,52050);assert.equal(saved.lines[1].assemblyRevision,2);
 assert.throws(()=>save(s,saved,[{assemblyId:cs.id,assemblyRevision:2,quantity:'1'}]),/linked assembly changed/);
 s=save(s,saved,[{itemId:b.lines[0].itemId,quantity:'1',rate:'500'},{assemblyId:cs.id,assemblyRevision:3,quantity:'1'}]);b=s.domesticBoms.find(x=>x.id===b.id);assert.equal(domesticBomTotals(b.lines).totalMinor,52400);assert.equal(domesticBomTotals(b.history[1].lines).totalMinor,52050);
});
test('reject duplicate parts, recursive sets, arbitrary set rates, stale revisions and fractional SET quantities',()=>{
 const s=domesticPreviewState(),cs=s.domesticBoms.find(b=>b.code==='CS1'),model=s.domesticBoms.find(b=>b.kind==='MODEL'),l={itemId:s.domesticItems[0].id,quantity:'1',rate:'10'};
 assert.throws(()=>save(s,cs,[l,l]),/only once/);assert.throws(()=>save(s,cs,[{assemblyId:cs.id,assemblyRevision:1,quantity:'1'}]),/purchased items only/);
 assert.throws(()=>save(s,model,[{assemblyId:cs.id,assemblyRevision:1,quantity:'1',rate:'50'}]),/cost comes from/);
 assert.throws(()=>save(s,model,[{assemblyId:cs.id,assemblyRevision:1,quantity:'0.5'}]),/whole/);
 assert.throws(()=>save(s,cs,[l],{revision:0}),/BOM changed/);assert.throws(()=>save(s,cs,[l],{reason:''}),/Reason/);
 assert.throws(()=>save(s,cs,[{...l,quantity:'-1'}]),/Quantity/);assert.throws(()=>save(s,cs,[{...l,rate:'-1'}]),/negative|positive/);
 assert.throws(()=>save(s,cs,[]),/Add components/);
});
test('item rate edits retain BOM costs and codes; new items and can sets have permanent references',()=>{
 let s=domesticPreviewState(),cs=s.domesticBoms.find(b=>b.code==='CS1'),i=s.domesticItems[0];s=save(s,cs,[{itemId:i.id,quantity:'1',rate:'100'}]);
 const p={itemId:i.id,description:i.description,segment:i.segment,uom:i.uom,rate:'200',imageAsset:i.imageAsset,reason:'New quote'};
 assert.throws(()=>run(s,'DOMESTIC_SAVE_ITEM',{...p,code:'changed'}),/code cannot change/);assert.throws(()=>run(s,'DOMESTIC_SAVE_ITEM',{...p,uom:i.uom==='SET'?'PCS':'SET'}),/UOM cannot change/);
 s=run(s,'DOMESTIC_SAVE_ITEM',p);assert.equal(domesticBomTotals(s.domesticBoms.find(b=>b.id===cs.id).lines).totalMinor,10000);
 s=run(s,'DOMESTIC_SAVE_ITEM',{description:'Extra component',segment:'OTHER',uom:'PCS',rate:''});assert.equal(s.domesticItems.at(-1).rateMinor,null);assert.match(s.domesticItems.at(-1).code,/FH-LAE-D-IT-38/);
 s=run(s,'DOMESTIC_CREATE_CAN_SET',{code:'CS3',name:'New can set'});assert.ok(softwareReference(s,'domesticBoms',s.domesticBoms.at(-1).id));assert.throws(()=>run(s,'DOMESTIC_CREATE_CAN_SET',{code:'cs3',name:'Duplicate'}),/already exists/);
});
test('SQLite persists new BOM revisions and photos require a scoped signed-in session',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'fh-domestic-')),path=join(dir,'data.sqlite');let store=new Store(path,domesticPreviewState());store.addAccount('u-manager','domestic@example.test','test-preview-only-1234');store.addAccount('u-viewer','viewer@example.test','test-preview-only-1234');
 const server=makeServer(store);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 try{assert.equal((await fetch(base+'/assets/domestic-bom/image1.png')).status,401);const login=await fetch(base+'/api/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({email:'domestic@example.test',password:'test-preview-only-1234'})}),cookie=login.headers.get('set-cookie').split(';')[0];assert.equal((await fetch(base+'/assets/domestic-bom/image1.png',{headers:{Cookie:cookie}})).status,200);
 const s=store.read(),cs=s.domesticBoms.find(b=>b.code==='CS1');store.transact({type:'DOMESTIC_SAVE_BOM',payload:{bomId:cs.id,revision:1,lines:[{itemId:s.domesticItems[0].id,quantity:'1',rate:'23.45'}],compositionConfirmed:true,reason:'Persist test'}},user(s).id,s.revision);assert.equal(store.read().domesticBoms.find(b=>b.id===cs.id).revision,2);
 }finally{await new Promise(r=>server.close(r));store.close();}store=new Store(path);assert.equal(store.read().domesticBoms.find(b=>b.code==='CS1').lines[0].rateMinor,2345);store.close();
});


