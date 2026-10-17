import test from 'node:test';import assert from 'node:assert/strict';import {queryLaeStockAging,validateLaeAgingQuery} from '../shared/lae-stock-aging.mjs';
import {mkdtempSync,rmSync} from 'node:fs';import {join} from 'node:path';import {tmpdir} from 'node:os';import {Store} from '../server/store.mjs';import {emptyState} from '../server/index.mjs';import {RoCostingStore} from '../server/ro-costing-store.mjs';
const snapshot={stockDate:'2026-09-30'},date=days=>new Date(Date.parse('2026-09-30T00:00:00Z')-days*86400000).toISOString().slice(0,10);
const row=(id,days,quantity=1,more={})=>({id:String(id),masterCode:'CC1',brandCode:'GJ-CC1',itemName:'Cutter',productGroup:'Cutters',unit:'pcs',warehouse:'SASTHA',brand:'Gaja',batch:'B-'+id,assignedRo:'1232',invoice:'CI1',quantity,importDate:days===null?'':date(days),inwardDate:'2026-09-29',...more});
test('age boundaries have no gaps/overlaps and every source quantity reconciles to one bucket',()=>{
 const days=[0,60,61,120,121,180,181,240,241,360,361,900],rows=days.map((d,i)=>row(i,d));rows.push(row(20,61,-2),row(21,null,5),row(22,-1,3),row(23,60,0));const before=structuredClone(rows),r=queryLaeStockAging(rows,{},snapshot),s=r.summary[0];
 assert.deepEqual(['0-60','61-120','121-180','181-240','241-360','361+','pending'].map(k=>s.buckets[k].quantity),[2,0,2,2,2,2,8]);assert.equal(s.quantity,18);assert.equal(Object.values(s.buckets).reduce((v,b)=>v+b.rows,0),rows.length);assert.equal(s.buckets['61-120'].negative,-2);assert.equal(r.coverage.futureRows,1);assert.deepEqual(rows,before);
 for(const g of r.groups)for(const b of r.buckets){const models=r.models.filter(m=>m.productGroup===g.productGroup&&m.unit===g.unit&&m.bucket===b.id);assert.equal(models.reduce((v,m)=>v+m.quantity,0),g.buckets[b.id].quantity);}
});
test('date basis and selected age date are explicit, strict and calendar-day based',()=>{
 const r=row(1,61,4);assert.equal(queryLaeStockAging([r],{basis:'warehouse'},snapshot).summary[0].buckets['0-60'].quantity,4);assert.equal(queryLaeStockAging([r],{asOf:'2026-11-30'},snapshot).summary[0].buckets['121-180'].quantity,4);
 for(const q of [{basis:'made-up'},{asOf:'2026-02-30'},{asOf:'2026-09-29'},{page:'2'},{q:[]}])assert.throws(()=>validateLaeAgingQuery(q,snapshot));
 const leap=queryLaeStockAging([row(1,0,1,{importDate:'2024-02-29'})],{}, {stockDate:'2024-04-29'});assert.equal(leap.models[0].oldestDays,60);
 assert.equal(queryLaeStockAging([row(1,0,1,{importDate:'2026-02-30'})],{},snapshot).coverage.invalidDateRows,1);
});
test('purchase date fallback requires exact RO, invoice, brand code and unit, and cannot hide conflicting dates',()=>{
 const r=row(1,null,10),p={ro:'1232',invoice:'CI1',brandCode:'GJ-CC1',unit:'pcs',inwardDate:date(121)},before=structuredClone(r);
 assert.equal(queryLaeStockAging([r],{},snapshot,[p]).summary[0].buckets['121-180'].quantity,10);
 for(const changes of [{ro:'1232-A'},{invoice:'CI2'},{brandCode:'KD-CC1'},{unit:'nos'},{inwardDate:''}])assert.equal(queryLaeStockAging([r],{},snapshot,[{...p,...changes}]).coverage.pendingRows,1);
 assert.equal(queryLaeStockAging([r],{},snapshot,[p,{...p,inwardDate:date(120)}]).coverage.pendingRows,1);
 assert.equal(queryLaeStockAging([{...r,assignedRo:'',priceRo:'1232'}],{},snapshot,[p]).coverage.pendingRows,1);assert.equal(queryLaeStockAging([{...r,assignedRo:'1232; 1233'}],{},snapshot,[p]).coverage.pendingRows,1);
 assert.equal(queryLaeStockAging([{...r,assignedRo:'1232-a'}],{},snapshot,[{...p,ro:'1232-A'}]).coverage.pendingRows,1);
 assert.equal(queryLaeStockAging([{...r,importDate:date(60)}],{},snapshot,[p]).summary[0].buckets['0-60'].quantity,10);assert.equal(queryLaeStockAging([{...r,inwardDate:''}],{basis:'warehouse'},snapshot,[p]).coverage.pendingRows,1);assert.deepEqual(r,before);
});
test('product and model drilldowns share filters, units and all source rows, without merging unmapped models',()=>{
 const rows=[row(1,61,5),row(2,61,2,{masterCode:'CC2'}),row(3,61,3,{warehouse:'HYD',brand:'Titan'}),row(4,61,10,{unit:'nos'}),row(5,61,4,{productGroup:'Other'}),row(6,null,1,{masterCode:'',brandCode:'Unknown 1'}),row(7,null,1,{masterCode:'',brandCode:'Unknown 2'})];
 const r=queryLaeStockAging(rows,{productGroup:'Cutters',warehouse:'SASTHA',unit:'pcs',q:'Cutter',brand:'Gaja'},snapshot);assert.equal(r.summary.length,1);assert.equal(r.summary[0].quantity,9);assert.equal(r.models.length,4);assert.equal(r.models.find(m=>m.masterCode==='CC1').quantity,5);assert.deepEqual(r.models.find(m=>m.masterCode==='CC1').warehouses,['SASTHA']);
 assert.equal(queryLaeStockAging(rows,{},snapshot).summary.length,2);assert.equal(queryLaeStockAging(rows,{q:'absent'},snapshot).groups.length,0);
});
test('RO date lookup is read-only, scoped and returns only requested purchase-date evidence',()=>{
 const dir=mkdtempSync(join(tmpdir(),'stock-aging-dates-')),state=emptyState();state.users.push({id:'other',role:'VIEWER',scopes:['LAE_DOMESTIC']});const store=new Store(join(dir,'test.sqlite'),state),ros=new RoCostingStore(store);
 try{for(const ro of ['1232','1232-A']){const record={inwardDate:'2026-07-01',purchaseItems:{version:1,rows:[{invoice:'CI1',itemCode:'GJ-CC1',unit:'pcs',inwardDate:'2026-07-02'},{invoice:'CI1',itemCode:'GJ-CC2',unit:'pcs'}]}};store.db.prepare('INSERT INTO ro_costings VALUES(?,?,?,?,?,?)').run(ro,1,'Synthetic','Pending',JSON.stringify(record),'2026-09-30');}
  const before=store.db.prepare('SELECT * FROM ro_costings ORDER BY ro').all();assert.throws(()=>ros.stockAgingDates('other',['1232']),/required/);assert.deepEqual(ros.stockAgingDates('admin',[]),[]);const dates=ros.stockAgingDates('admin',['1232','1232','1232/legacy','1'.repeat(61)]);assert.equal(dates.length,2);assert.deepEqual(dates.map(r=>r.inwardDate),['2026-07-02','2026-07-01']);assert(dates.every(r=>r.ro==='1232'));assert.deepEqual(store.db.prepare('SELECT * FROM ro_costings ORDER BY ro').all(),before);
 }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
