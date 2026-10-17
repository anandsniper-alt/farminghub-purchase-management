import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createRoSupplierDirectory} from '../shared/ro-costing.mjs';
import {RoCostingStore} from '../server/ro-costing-store.mjs';

test('only recorded case and whitespace variants share a supplier option',()=>{
 const full='EXAMPLE AGRICULTURAL MACHINERY IMPORT & EXPORT CO LTD';
 const directory=createRoSupplierDirectory([{kind:'SUPPLIER',scopes:['LAE_IMPORT'],name:full}]);
 assert.deepEqual(directory.options([full,'  example  agricultural machinery import & export co ltd ']),[{value:full,label:full}]);
 for(const unverified of ['EXAMPLE AGRICULTURAL MACHINERY','Example — booking identity','EXAMPLE AGRICULTURAL MACHINERY IMPORT AND EXPORT CO LTD'])assert.equal(directory.matches({supplier:unverified},full),false);
 assert.equal(directory.options(['FUSITE CO.,LTD','FUSITE CO LTD']).length,2);
 assert.equal(directory.options(['JR','ZHEJIANG JIARUI MACHINERY']).length,2);
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
