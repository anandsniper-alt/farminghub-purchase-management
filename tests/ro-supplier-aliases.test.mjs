import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createRoSupplierDirectory} from '../shared/ro-costing.mjs';
import {RoCostingStore} from '../server/ro-costing-store.mjs';
import {finalizedPoCostings} from '../shared/arrival-costing.mjs';

test('documented aliases and the user-confirmed RO 5260 name share their exact supplier identity',()=>{
 const directory=createRoSupplierDirectory();
 for(const [alias,canonical] of [
  ['CHONGQING SENCI WUGU AGRICULTURAL MACHINERY IMPOR','CHONGQING SENCI WUGU AGRICULTURAL MACHINERY IMPORT & EXPORT CO LTD'],
  ['Chongqing Senci — booking identity','CHONGQING SENCI WUGU AGRICULTURAL MACHINERY IMPORT & EXPORT CO LTD'],
  ['CHONGQING HAOFA MACHINERY MANUFACTURING COMPANY LI','Chongqing Haofa Machinery Manufacturing Company Limited'],
  ['HUNAN DONGFANGHONG ELECTROMECHANICAL MANUFACTURING','HUNAN DONGFANGHONG ELECTROMECHANICAL MANUFACTURING CO LTD'],
  ['JR','ZHEJIANG JIARUI MACHINERY CO LTD'],
  ['CHONGQING HUA TIAN (LUNA HUANG)','CHONGQING HUA TIAN HAO LI MACHINERY LLC'],
  ['Taizhou Haoding — booking identity','TAIZHOU HAODING IMPORT & EXPORT CO LTD']
 ]){
  assert.equal(directory.matches({supplier:alias},canonical),true,alias);
  assert.equal(directory.matches({supplier:canonical},alias),true,canonical);
  assert.equal(directory.options([alias,canonical]).length,1);
 }
 for(const [a,b] of [
  ['YAOHU','Chongqing Weiwang — booking identity'],
  ['LINYI FENGURI PLANT PROTECTION ELECTRONIC EQUIPMENT CO LTD','LINYI FENGRUI PLANT PROTECTION ELECTRONIC EQUIPMENT CO LTD'],
  ['FENGRUI PLANT PROTECTION ELECTRONIC EQUIPMEN','LINYI XINYI INTERNATIONAL TRADE CO.,LTD'],
  ['SHUNANG XIANGDONG MACHINERY','SHUANGFENG XIANGDONG MACHINERY MANUFACTURING CO LTD']
 ])assert.equal(directory.matches({supplier:a},b),false,a);
});

test('canonical filtering preserves vendor masters and finalized PO identities',()=>{
 const state={vendors:[{id:'v',kind:'SUPPLIER',scopes:['LAE_IMPORT'],name:'JR'}],orders:[{id:'o',number:'PO-1',scope:'LAE_IMPORT',vendorId:'v',shipments:[{id:'s',number:'SHP-1',actualArrival:'2026-10-14'}],arrivalCostings:[{id:'c',shipmentId:'s',status:'FINAL',roReference:'RO-123'}]}]},before=structuredClone(state);
 assert.equal(finalizedPoCostings(state,{role:'MANAGER',scopes:['LAE_IMPORT']},{supplier:'ZHEJIANG JIARUI MACHINERY CO LTD'}).length,1);
 assert.equal(createRoSupplierDirectory(state.vendors).options(['JR'])[0].label,'ZHEJIANG JIARUI MACHINERY CO LTD');
 assert.deepEqual(state,before);
});

test('alias union is filtered before pagination and never doubles a shared invoice RO',()=>{
 const db=new DatabaseSync(':memory:');try{
  db.exec('CREATE TABLE ro_costings(ro TEXT,revision INTEGER,payload TEXT,updated_at TEXT,supplier TEXT,status TEXT)');
  const add=db.prepare('INSERT INTO ro_costings VALUES(?,1,?,?,?,?)');
  for(let i=0;i<61;i++){
   const ro='RO-'+i,supplier=i%2?'JR':'ZHEJIANG JIARUI MACHINERY',invoices=i===0?[{supplier:'JR',invoice:'A',currency:'USD',goods:1,extras:0,face:1}]:[];
   add.run(ro,JSON.stringify({ro,supplier,invoices}),'2026-10-17',supplier,'Pending');
  }
  const before=db.prepare('SELECT * FROM ro_costings ORDER BY ro').all();
  const store={db,store:{read:()=>({vendors:[]})},actor:()=>({}),important:()=>({commercialInvoices:[],inwardBoe:[],importerCopies:[]}),sourceLibrary:()=>null};
  for(const supplier of ['JR','ZHEJIANG JIARUI MACHINERY CO LTD']){
   const first=RoCostingStore.prototype.list.call(store,'actor',{supplier});
   const last=RoCostingStore.prototype.list.call(store,'actor',{supplier,offset:50});
   assert.equal(first.total,61);assert.equal(first.rows.length,50);assert.equal(last.rows.length,11);
   assert.equal(new Set([...first.rows,...last.rows].map(r=>r.ro)).size,61);
  }
  assert.deepEqual(db.prepare('SELECT * FROM ro_costings ORDER BY ro').all(),before);
 }finally{db.close();}
});

test('formatting variants share a supplier option without guessing shortened identities',()=>{
 const full='EXAMPLE AGRICULTURAL MACHINERY IMPORT & EXPORT CO LTD';
 const directory=createRoSupplierDirectory([{kind:'SUPPLIER',scopes:['LAE_IMPORT'],name:full}]);
 assert.deepEqual(directory.options([full,'  example  agricultural machinery import & export co ltd ']),[{value:full,label:full}]);
 for(const unverified of ['EXAMPLE AGRICULTURAL MACHINERY','Example — booking identity'])assert.equal(directory.matches({supplier:unverified},full),false);
 assert.equal(directory.matches({supplier:'EXAMPLE AGRICULTURAL MACHINERY IMPORT AND EXPORT CO., LTD.'},full),true);
 assert.equal(directory.options(['FUSITE CO.,LTD','FUSITE CO LTD']).length,1);
 assert.equal(directory.options(['UNKNOWN','UNKNOWN MACHINERY']).length,2);
});

test('formatting cleanup is deterministic and preserves meaningful name distinctions',()=>{
 const directory=createRoSupplierDirectory(),names=['CHONGQING WELLUCK TRADING CO., LTD.','CHONGQING WELLUCK TRADING CO., LTD','CHONGQING WELLUCK TRADING CO LTD'];
 assert.equal(directory.options(names).length,1);
 assert.deepEqual(directory.options(names),directory.options([...names].reverse()));
 for(const [a,b]of [['A-B CO LTD','AB CO LTD'],['ABC MACHINERY','ABC TRADING'],['AC ME CO LTD','ACME CO LTD'],['ABC (NORTH)','ABC (SOUTH)'],['Supplier A','Supplier AB']])assert.equal(directory.matches({supplier:a},b),false);
 assert.equal(directory.options(['  ','.,']).length,0);
});

test('explicit grouped names and invoice suppliers match independently without source changes',()=>{
 const directory=createRoSupplierDirectory(),record={supplier:'Supplier A / Supplier B',invoices:[{supplier:'Supplier C'}]},before=structuredClone(record);
 for(const supplier of ['Supplier A','Supplier B','Supplier C'])assert.equal(directory.matches(record,supplier),true);
 assert.equal(directory.matches(record,'Supplier D'),false);assert.deepEqual(record,before);
 assert.deepEqual(directory.options(['ACME IMPORT/EXPORT CO LTD']),[{value:'ACME IMPORT/EXPORT CO LTD',label:'ACME IMPORT/EXPORT CO LTD'}]);
});

test('server filters include invoice-only suppliers and count shared ROs once',()=>{
 const db=new DatabaseSync(':memory:');try{
  db.exec('CREATE TABLE ro_costings(ro TEXT,revision INTEGER,payload TEXT,updated_at TEXT,supplier TEXT,status TEXT)');
  const add=(ro,supplier,invoices=[])=>db.prepare('INSERT INTO ro_costings VALUES(?,1,?,?,?,?)').run(ro,JSON.stringify({ro,supplier,invoices}),'2026-10-14',supplier,'Pending');
  for(let i=0;i<55;i++)add('RO-'+String(i).padStart(3,'0'),'Supplier A');
  add('SHARED','Supplier A / Supplier B',[{supplier:'Supplier A',invoice:'CI-A',currency:'USD',goods:1,extras:0,face:1}]);
  add('INVOICE','',[{supplier:'Supplier B',invoice:'CI-B',currency:'USD',goods:1,extras:0,face:1}]);add('UNVERIFIED','Supplier A — booking identity');
  const store={db,store:{read:()=>({vendors:[]})},actor:()=>({}),important:()=>({commercialInvoices:[],inwardBoe:[],importerCopies:[]}),sourceLibrary:()=>null};
  const list=args=>RoCostingStore.prototype.list.call(store,'actor',args);
  assert.equal(list({supplier:'Supplier A'}).total,56);assert.equal(list({supplier:'Supplier A',offset:50}).rows.length,6);
  assert.equal(list({supplier:'Supplier B'}).total,2);assert.equal(list({supplier:'Supplier A',roNumber:'SHARED'}).total,1);
  assert.equal(list({supplier:'Supplier A — booking identity'}).total,1);assert.equal(db.prepare('SELECT COUNT(*) n FROM ro_costings').get().n,58);
 }finally{db.close();}
});
