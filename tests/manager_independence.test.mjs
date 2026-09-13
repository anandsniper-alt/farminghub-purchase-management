import test from 'node:test';
import assert from 'node:assert/strict';
import {createCleanSeed} from '../shared/clean-seed.mjs';
import {execute,managerWorkflowStages,APPROVAL_STAGES,canPerformApproval,previewMasterImport,previewImport} from '../shared/domain.mjs';
import {scopedState} from '../server/index.mjs';
const setup=()=>{const state=createCleanSeed();state.files.push({id:'proof',name:'quote.txt',scope:'LAE_IMPORT',orderIds:[]});return {state,manager:state.users.find(u=>u.role==='MANAGER'),admin:state.users.find(u=>u.role==='ADMIN')};};
test('independent manager preset grants every stage, preserves other roles and remains reversible',()=>{
 const {state,manager,admin}=setup();state.approvalControls={revision:3,stages:{APPROVE_ARTWORK:['EXECUTIVE']}};const stages=managerWorkflowStages(state);
 assert.deepEqual(stages.APPROVE_ARTWORK,['MANAGER','EXECUTIVE']);const next=execute(state,{type:'SAVE_APPROVAL_CONTROLS',payload:{stages,confirm:true,remarks:'DEC-030 manager coverage'}},admin).state;
 for(const stage of APPROVAL_STAGES){assert.ok(canPerformApproval(manager,stage.command,'LAE_IMPORT',null,next));assert.ok(canPerformApproval({...manager,id:'second-manager'},stage.command,'LAE_IMPORT',null,next));assert.equal(canPerformApproval({...manager,active:false},stage.command,'LAE_IMPORT',null,next),false);assert.equal(canPerformApproval({...manager,scopes:[]},stage.command,'LAE_IMPORT',null,next),false);}
 assert.equal(next.approvalControls.revision,4);assert.equal(next.events.at(-1).actorId,admin.id);
 assert.throws(()=>execute(next,{type:'SAVE_APPROVAL_CONTROLS',payload:{stages,confirm:true,remarks:'unauthorized'}},manager),e=>e.code==='FORBIDDEN');
 const restored=execute(next,{type:'SAVE_APPROVAL_CONTROLS',payload:{stages:Object.fromEntries(APPROVAL_STAGES.map(s=>[s.command,[...s.roles]])),confirm:true,remarks:'Restore standard roles'}},admin).state;
 assert.equal(canPerformApproval(manager,'REJECT_SPEC','LAE_IMPORT',null,restored),false);assert.equal(restored.events.filter(e=>e.action==='APPROVAL_CONTROLS_UPDATED').length,2);
});
const vendorRow={code:'V99-QATM',vendorSerial:'V99',fixedSupplierCode:'QATM',name:'Isolated QA vendor',kind:'SUPPLIER',status:'ACTIVE',defaultTerms:'30-70',defaultPriceListCurrency:'CNY',defaultBillingCurrency:'USD',defaultPaymentMethod:'TT',productionDays:'60'};
test('exposed item importer rejects ambiguous suppliers and foreign item identities',()=>{
 const {state}=setup(),vendor=state.vendors.find(v=>v.kind==='SUPPLIER');vendor.fixedSupplierCode='QAAMB';state.vendors.push({...vendor,id:'other-vendor',code:'V99-QAAMB',fullReference:'V99-QAAMB',fixedSupplierCode:'QAAMB'});
 const row={'ITEM CODE':'QA-IMPORT','ITEM NAME':'QA item','VENDOR CODE':'QAAMB','PRODUCT CATEGORY':state.categories.find(c=>c.active).name};assert.equal(previewImport(state,[row])[0].result,'REJECTED');
 row['VENDOR CODE']=vendor.code;assert.notEqual(previewImport(state,[row])[0].result,'REJECTED');state.items.push({id:'foreign',code:'QA-IMPORT',scope:'LAE_DOMESTIC'});assert.equal(previewImport(state,[row])[0].result,'REJECTED');
});
test('master imports validate, preserve snapshots, audit and commit one revision atomically',()=>{
 const {state,manager}=setup(),before=structuredClone(state);assert.equal(previewMasterImport(state,[vendorRow],'vendor',manager)[0].result,'CREATE');assert.deepEqual(state,before);
 const command={type:'COMMIT_MASTER_IMPORT',payload:{kind:'vendor',rows:[vendorRow],filename:'vendors.csv',sourceFileId:'proof'}};
 const next=execute(state,command,manager).state;assert.equal(next.revision,state.revision+1);assert.equal(next.vendorImports.at(-1).count,1);assert.equal(next.vendors.at(-1).code,'V99-QATM');assert.equal(next.events.at(-2).actorId,manager.id);assert.equal(next.events.at(-1).action,'MASTER_IMPORTED');
 for(const rows of [[vendorRow,vendorRow],[vendorRow,{...vendorRow,code:'V98-QATM',vendorSerial:'V98',defaultTerms:'UNKNOWN'}],[]])assert.throws(()=>execute(state,{...command,payload:{...command.payload,rows}},manager));
 assert.deepEqual(state,before);assert.throws(()=>execute(state,command,{...manager,role:'EXECUTIVE'}),e=>e.code==='FORBIDDEN');
 assert.throws(()=>execute(state,command,{...manager,scopes:[]}),e=>e.code==='FORBIDDEN');
 const hidden=scopedState({...next,priceImports:[{private:true}]},{...manager,scopes:['LAE_DOMESTIC']});assert.deepEqual(hidden.priceImports,[]);assert.deepEqual(hidden.vendorImports,[]);
});
test('price import reuses money, currency, supplier and base validation',()=>{
 const {state,manager}=setup(),b=state.bases.find(b=>b.vendorId),v=state.vendors.find(v=>v.id===b.vendorId);const row={vendorCode:v.code,baseItemCode:b.code,currency:'USD',unitPrice:'12.34',effectiveDate:'2026-09-13'};
 for(const patch of [{unitPrice:''},{unitPrice:'-2'},{unitPrice:'abc'},{currency:'XYZ'},{vendorCode:'UNKNOWN'},{baseItemCode:'UNKNOWN'},{effectiveDate:'bad'}])assert.equal(previewMasterImport(state,[{...row,...patch}],'price',manager)[0].result,'REJECTED');
 assert.equal(previewMasterImport(state,[{...row,unitPrice:'0'}],'price',manager)[0].result,'APPEND','Preserve existing zero-price master policy');
 assert.ok(previewMasterImport(state,[row,row],'price',manager).every(r=>r.result==='REJECTED'));
 const next=execute(state,{type:'COMMIT_MASTER_IMPORT',payload:{kind:'price',rows:[row],filename:'prices.csv',sourceFileId:'proof'}},manager).state;assert.equal(next.priceLists.at(-1).unitPriceMinor,1234);assert.equal(next.priceImports.at(-1).count,1);assert.deepEqual(next.orders,state.orders);
});
