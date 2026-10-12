import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../server/store.mjs';
import {emptyState} from '../server/index.mjs';
import {ImplementsStore} from '../server/implements-store.mjs';
import {ProductionStore} from '../server/production-store.mjs';
import {BomManagementStore} from '../server/bom-management-store.mjs';
import {blankState,ensureMonthly,createOrders,applyStock,previewStock,pricePercent,previewPrices} from '../shared/implements/domain.mjs';
import {applyOrderEvent,orderProgress} from '../shared/implements/procurement.mjs';

const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Calcutta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const dayBefore=n=>new Date(Date.parse(today+'T00:00:00Z')-n*86400000).toISOString().slice(0,10);
const old=dayBefore(10),recent=dayBefore(2);
const actor=emptyState().users.find(u=>u.id==='admin');
function fixture({multi=false}={}){
 const s=ensureMonthly(blankState({version:'audit-test',parts:[{id:'bolt',code:'IMP-1',name:'Bolt',uom:'pcs',rate:10,supplier:'vendor',fabricated:false}],suppliers:[{id:'vendor',name:'Supplier'}],models:[{id:'S2.V58',series:'Leader',name:'Leader',configuration:'S2-V-ELITE-7FT-48-MS-OB-CEN',frame:'V',size:'7FT',blades:48,speed:'MS',bladeOrientation:'OB',gearboxOrientation:'CEN',revision:1,history:[],bomAvailable:true,lines:[{partId:'bolt',ppm:4}],fabrication:[],fabricationSupplier:'vendor',costs:{}}]}));
 if(multi){s.parts.push({id:'nut',code:'IMP-2',name:'Nut',uom:'pcs',rate:5,supplier:'vendor',fabricated:false});s.models[0].lines.push({partId:'nut',ppm:4});}
 s.plan={'S2.V58':5};s.orders=createOrders(s,multi?['bolt','nut']:['bolt'],{date:old});s.stock={bolt:{qty:100,asOf:dayBefore(11),source:'Opening count'},...(multi?{nut:{qty:100,asOf:dayBefore(11),source:'Opening count'}}:{})};s.stockAsOf=dayBefore(11);return s;
}
function setup(options){const dir=mkdtempSync(join(tmpdir(),'fh-stock-audit-')),base=emptyState();base.users.push({id:'operator',name:'Operator',role:'PRODUCTION_OPERATOR',active:true,scopes:['PRODUCTION_MANAGEMENT']},{id:'manager',name:'Manager',role:'MANAGER',active:true,scopes:['PRODUCTION_MANAGEMENT','IMPLEMENTS_DOMESTIC','BOM_MANAGEMENT']},{id:'executive',name:'Executive',role:'EXECUTIVE',active:true,scopes:['IMPLEMENTS_DOMESTIC']});const store=new Store(join(dir,'db.sqlite'),base),source=new ImplementsStore(store),production=new ProductionStore(store,source),bom=new BomManagementStore(store,source);source.save({state:fixture(options),expectedRevision:0,requestId:randomUUID(),message:'Fixture'},'admin');
 const save=(s,message='Reviewed save')=>source.save({state:s,expectedRevision:s.revision,requestId:randomUUID(),message},'admin');
 const productionCommand=(who,type,extra={})=>production.command(who,{type,date:recent,reason:'Reviewed physical stock',expectedRevision:source.read().revision,expectedProductionRevision:production.revision(),requestId:randomUUID(),...extra});
 const event=(type,extra={})=>{let s=source.read();applyOrderEvent(s,{id:randomUUID(),poId:s.orders[0].id,type,date:recent,reason:'Reviewed purchase event',...extra},{actor});return save(s,type);};
 return {store,source,production,bom,save,productionCommand,event,close:()=>{store.close();rmSync(dir,{recursive:true,force:true});}};
}

test('older counts, CSV imports and receipts cannot overwrite or double count newer physical stock',()=>{const f=setup();try{
 f.productionCommand('operator','RECEIVE_STOCK',{key:'bolt',qty:5,reference:'D1'});const after=f.source.read();assert.equal(after.stock.bolt.qty,105);
 assert.throws(()=>f.productionCommand('manager','ADJUST_STOCK',{key:'bolt',qty:90,date:old,reference:'Count'}),/latest posting/);
 const s=structuredClone(after),preview=previewStock(s,[['code','qty'],['IMP-1',90]],0,1);assert.throws(()=>applyStock(s,preview,old,'old.csv'),/latest posting/);assert.equal(s.stock.bolt.qty,105);
 const tampered=structuredClone(after);tampered.stock.bolt={qty:90,asOf:old,source:'Old CSV'};assert.throws(()=>f.save(tampered),/latest posting/);
 f.event('APPROVE',{date:old});f.event('ISSUE',{date:old});assert.throws(()=>f.event('ACKNOWLEDGE',{date:old,reference:'Late D2',lines:[{key:'bolt',qty:5}]}),/latest stock posting/);assert.equal(f.source.read().stock.bolt.qty,105);
}finally{f.close();}});

test('an existing stock key cannot be removed and later reintroduced with a backdated balance',()=>{const f=setup();try{
 const removed=f.source.read();delete removed.stock.bolt;assert.throws(()=>f.save(removed),/cannot be removed/);
 for(const asOf of ['', 'not-a-date','2099-01-01']){const changed=f.source.read();changed.stock.bolt={qty:90,asOf,source:'Invalid replacement'};assert.throws(()=>f.save(changed),/valid calendar date|future-dated/);}
 assert.equal(f.source.read().stock.bolt.qty,100);
}finally{f.close();}});

test('unchanged quantity physical count is retained in ledger and gates same-day PO receipt',()=>{const f=setup();try{
 f.event('APPROVE',{date:old});f.event('ISSUE',{date:old});const counted=f.source.read();counted.stock.bolt={qty:100,asOf:recent,source:'Physical count including truck'};f.save(counted,'Reviewed physical count');
 const movement=f.production.page('admin',{kind:'movements',key:'bolt'}).rows[0];assert.equal(movement.type,'PURCHASE_STOCK_UPDATE');assert.equal(movement.delta,0);assert.equal(movement.date,recent);
 assert.throws(()=>f.event('ACKNOWLEDGE',{date:recent,reference:'Truck',lines:[{key:'bolt',qty:5}]}),/may already include/);
 f.event('ACKNOWLEDGE',{date:recent,reference:'Truck',lines:[{key:'bolt',qty:5}],stockAlreadyReconciled:true,reconciliationReason:'Truck was included in reviewed count'});assert.equal(f.source.read().stock.bolt.qty,100);assert.equal(orderProgress(f.source.read(),f.source.read().orders[0].id).lines[0].acknowledged,5);assert.equal(f.production.page('admin',{kind:'movements',key:'bolt'}).rows[0].delta,0);
}finally{f.close();}});

test('late PO receipt already included in a later count advances PO without changing stock',()=>{const f=setup();try{
 f.event('APPROVE',{date:old});f.event('ISSUE',{date:old});assert.throws(()=>f.event('ACKNOWLEDGE',{date:old,reference:'D1',lines:[{key:'bolt',qty:5}],stockAlreadyReconciled:true,reconciliationReason:'Claimed inclusion'}),/No physical count/);f.productionCommand('manager','ADJUST_STOCK',{key:'bolt',qty:105,reference:'Count including earlier truck'});
 assert.throws(()=>f.event('ACKNOWLEDGE',{date:old,reference:'D1',lines:[{key:'bolt',qty:5}]}),/latest stock posting/);
 const s=f.source.read();assert.throws(()=>applyOrderEvent(structuredClone(s),{id:randomUUID(),poId:s.orders[0].id,type:'ACKNOWLEDGE',date:old,reason:'Delivery',reference:'D1',lines:[{key:'bolt',qty:5}],stockAlreadyReconciled:true,reconciliationReason:'Included in later count'},{actor:{id:'operator',name:'Operator',role:'PRODUCTION_OPERATOR'}}),/manager/);
 f.event('ACKNOWLEDGE',{date:old,reference:'D1',lines:[{key:'bolt',qty:5}],stockAlreadyReconciled:true,reconciliationReason:'Truck counted during later review'});let after=f.source.read();assert.equal(after.stock.bolt.qty,105);assert.equal(after.stock.bolt.asOf,recent);assert.equal(orderProgress(after,after.orders[0].id).lines[0].acknowledged,5);const movement=f.production.page('admin',{kind:'movements',key:'bolt'}).rows[0];assert.equal(movement.delta,0);assert.equal(movement.poQty,5);assert.equal(movement.date,old);
 const original=after.procurement.events.at(-1);assert.throws(()=>f.event('CORRECT_ACKNOWLEDGMENT',{date:recent,correctionOf:original.id,lines:[{key:'bolt',qty:4}]}),/counted stock/);f.event('CORRECT_ACKNOWLEDGMENT',{date:recent,correctionOf:original.id,lines:[{key:'bolt',qty:4}],stockAlreadyReconciled:true});after=f.source.read();assert.equal(after.stock.bolt.qty,105);assert.equal(orderProgress(after,after.orders[0].id).lines[0].acknowledged,4);
 const first=after.procurement.events.at(-1);f.event('CORRECT_ACKNOWLEDGMENT',{date:recent,correctionOf:first.id,lines:[{key:'bolt',qty:5}],stockAlreadyReconciled:true});after=f.source.read();assert.equal(after.stock.bolt.qty,105);assert.equal(orderProgress(after,after.orders[0].id).lines[0].acknowledged,5);assert.equal(f.production.page('admin',{kind:'movements',key:'bolt'}).rows[0].delta,0);
}finally{f.close();}});

test('direct save cannot replay a forged manager reconciliation under an executive actor',()=>{const f=setup();try{
 f.event('APPROVE',{date:old});f.event('ISSUE',{date:old});f.productionCommand('manager','ADJUST_STOCK',{key:'bolt',qty:105,reference:'Reviewed count'});const before=f.source.read(),forged=structuredClone(before);
 applyOrderEvent(forged,{id:randomUUID(),poId:before.orders[0].id,type:'ACKNOWLEDGE',date:old,reason:'Delivery review',reference:'Forged review',lines:[{key:'bolt',qty:5}],stockAlreadyReconciled:true,reconciliationReason:'Included in count'},{actor});
 assert.throws(()=>f.source.save({state:forged,expectedRevision:before.revision,requestId:randomUUID(),message:'Forged review'},'executive'),/manager/);assert.deepEqual(f.source.read(),before);assert.equal(f.production.page('admin',{kind:'movements',key:'bolt'}).rows.filter(m=>m.type==='PO_ACKNOWLEDGMENT').length,0);
}finally{f.close();}});

test('multi-item included-in-count receipt requires supporting counts for every line atomically',()=>{const f=setup({multi:true});try{
 f.event('APPROVE',{date:old});f.event('ISSUE',{date:old});f.productionCommand('manager','ADJUST_STOCK',{key:'bolt',qty:105,reference:'Bolt count'});const before=f.source.read();
 const receipt={date:old,reference:'Two-item truck',lines:[{key:'bolt',qty:5},{key:'nut',qty:5}],stockAlreadyReconciled:true,reconciliationReason:'Both included in later counts'};
 assert.throws(()=>f.event('ACKNOWLEDGE',receipt),/No physical count.*nut/);assert.deepEqual(f.source.read(),before);assert.equal(f.production.page('admin',{kind:'movements'}).rows.filter(m=>m.type==='PO_ACKNOWLEDGMENT').length,0);
 f.productionCommand('manager','ADJUST_STOCK',{key:'nut',qty:105,reference:'Nut count'});f.event('ACKNOWLEDGE',receipt);const after=f.source.read(),progress=orderProgress(after,after.orders[0].id);assert.equal(after.stock.bolt.qty,105);assert.equal(after.stock.nut.qty,105);assert.equal(progress.lines.find(l=>l.key==='bolt').acknowledged,5);assert.equal(progress.lines.find(l=>l.key==='nut').acknowledged,5);const rows=f.production.page('admin',{kind:'movements'}).rows.filter(m=>m.type==='PO_ACKNOWLEDGMENT');assert.equal(rows.length,2);assert.ok(rows.every(m=>m.delta===0&&m.poQty===5&&m.stockAlreadyReconciled));
}finally{f.close();}});

test('manual receipt after same-day count needs manager review; included late receipt leaves stock unchanged',()=>{const f=setup();try{
 assert.throws(()=>f.productionCommand('manager','RECEIVE_STOCK',{key:'bolt',qty:2,date:old,reference:'Earlier truck',stockAlreadyReconciled:true,reconciliationReason:'Claimed inclusion'}),/No physical count/);f.productionCommand('manager','ADJUST_STOCK',{key:'bolt',qty:100,reference:'Morning count'});
 assert.throws(()=>f.productionCommand('operator','RECEIVE_STOCK',{key:'bolt',qty:5,reference:'Afternoon truck'}),/may already include/);
 assert.throws(()=>f.productionCommand('operator','RECEIVE_STOCK',{key:'bolt',qty:5,reference:'Afternoon truck',stockNotIncludedInCount:true,reconciliationReason:'After count'}),/manager/);
 assert.throws(()=>f.productionCommand('manager','RECEIVE_STOCK',{key:'bolt',qty:5,reference:'Afternoon truck',stockNotIncludedInCount:true}),/reconciliation reason/);
 f.productionCommand('manager','RECEIVE_STOCK',{key:'bolt',qty:5,reference:'Afternoon truck',stockNotIncludedInCount:true,reconciliationReason:'Delivery arrived after morning count'});assert.equal(f.source.read().stock.bolt.qty,105);
 assert.throws(()=>f.productionCommand('operator','RECEIVE_STOCK',{key:'bolt',qty:2,date:old,reference:'Earlier truck',stockAlreadyReconciled:true,reconciliationReason:'Counted'}),/manager/);
 f.productionCommand('manager','RECEIVE_STOCK',{key:'bolt',qty:2,date:old,reference:'Earlier truck',stockAlreadyReconciled:true,reconciliationReason:'Earlier delivery included in morning count'});assert.equal(f.source.read().stock.bolt.qty,105);const movement=f.production.page('admin',{kind:'movements',key:'bolt'}).rows[0];assert.equal(movement.delta,0);assert.equal(movement.receiptQty,2);assert.equal(movement.stockAlreadyReconciled,true);assert.equal(movement.date,old);
}finally{f.close();}});

test('manual receipt already included in count preserves the aggregate stock date',()=>{const f=setup();try{
 const s=f.source.read(),asOf=s.stockAsOf;s.stock.bolt={qty:105,asOf:recent,source:'Reviewed stock count'};f.save(s,'Reviewed physical count');assert.equal(f.source.read().stockAsOf,asOf);
 f.productionCommand('manager','RECEIVE_STOCK',{key:'bolt',qty:5,date:old,reference:'Truck counted already',stockAlreadyReconciled:true,reconciliationReason:'Included in saved later count'});assert.equal(f.source.read().stock.bolt.qty,105);assert.equal(f.source.read().stockAsOf,asOf);
}finally{f.close();}});

test('receipt ledger uses business date and immutable save timestamp',()=>{const f=setup();try{
 f.event('APPROVE',{date:old});f.event('ISSUE',{date:old});f.event('ACKNOWLEDGE',{date:old,reference:'D1',lines:[{key:'bolt',qty:5}]});
 const rows=f.production.page('admin',{kind:'movements',key:'bolt'}).rows;assert.equal(rows[0].type,'PO_ACKNOWLEDGMENT');assert.equal(rows[0].date,old);assert.ok(rows[0].at.startsWith(today));assert.equal(f.source.read().stock.bolt.asOf,old);
}finally{f.close();}});

test('manager correction reconciles PO and stock, retains original and rejects tampering or unauthorized correction',()=>{const f=setup();try{
 f.event('APPROVE',{date:old});f.event('ISSUE',{date:old});f.event('ACKNOWLEDGE',{date:recent,reference:'D1',lines:[{key:'bolt',qty:6}]});const before=f.source.read(),original=before.procurement.events.at(-1);
 const correction={id:randomUUID(),poId:before.orders[0].id,type:'CORRECT_ACKNOWLEDGMENT',date:recent,reason:'Physical receipt was five',correctionOf:original.id,lines:[{key:'bolt',qty:5}]};
 assert.throws(()=>applyOrderEvent(structuredClone(before),correction,{actor:{id:'operator',name:'Operator',role:'PRODUCTION_OPERATOR'}}),/manager/);
 assert.throws(()=>f.event('CORRECT_ACKNOWLEDGMENT',{correctionOf:original.id,lines:[{key:'bolt',qty:5}],stockAlreadyReconciled:true}),/No later saved physical count/);
 f.event('CORRECT_ACKNOWLEDGMENT',{correctionOf:original.id,lines:[{key:'bolt',qty:5}]});const after=f.source.read(),progress=orderProgress(after,after.orders[0].id);assert.equal(after.stock.bolt.qty,105);assert.equal(progress.lines[0].acknowledged,5);assert.equal(progress.lines[0].outstanding,17);assert.equal(progress.events.find(e=>e.id===original.id).lines[0].qty,6);assert.equal(progress.events.at(-1).deltas[0].delta,-1);assert.equal(f.production.page('admin',{kind:'movements',key:'bolt'}).rows[0].delta,-1);
 assert.throws(()=>f.event('CORRECT_ACKNOWLEDGMENT',{correctionOf:original.id,lines:[{key:'bolt',qty:4}]}),/newer correction/);
 assert.throws(()=>f.store.db.exec('DELETE FROM implements_events'),/append-only/);
}finally{f.close();}});

test('sequential corrections 6 to 5 to 4 to 5 retain every event and roll back stale attempts',()=>{const f=setup();try{
 f.event('APPROVE',{date:old});f.event('ISSUE',{date:old});f.event('ACKNOWLEDGE',{date:recent,reference:'D1',lines:[{key:'bolt',qty:6}]});const original=f.source.read().procurement.events.at(-1);
 let latest=original;for(const [qty,expected] of [[5,105],[4,104],[5,105]]){f.event('CORRECT_ACKNOWLEDGMENT',{correctionOf:latest.id,lines:[{key:'bolt',qty}]});const after=f.source.read();assert.equal(after.stock.bolt.qty,expected);assert.equal(orderProgress(after,after.orders[0].id).lines[0].acknowledged,qty);const correction=after.procurement.events.at(-1);assert.equal(correction.correctionOf,latest.id);assert.equal(correction.deltas[0].delta,qty-latest.lines[0].qty);latest=correction;}
 const before=f.source.read(),ledger=f.production.page('admin',{kind:'movements',key:'bolt'}).rows;
 assert.throws(()=>f.event('CORRECT_ACKNOWLEDGMENT',{correctionOf:original.id,lines:[{key:'bolt',qty:3}]}),/newer correction/);assert.deepEqual(f.source.read(),before);assert.deepEqual(f.production.page('admin',{kind:'movements',key:'bolt'}).rows,ledger);
 assert.throws(()=>f.event('CORRECT_ACKNOWLEDGMENT',{correctionOf:latest.id,lines:[{key:'bolt',qty:5}]}),/different from the latest/);assert.deepEqual(f.source.read(),before);
 assert.equal(before.procurement.events.filter(e=>e.type==='CORRECT_ACKNOWLEDGMENT').length,3);assert.equal(before.procurement.events.find(e=>e.id===original.id).lines[0].qty,6);
}finally{f.close();}});

test('a count between corrections forces subsequent links to remain stock-reconciled',()=>{const f=setup();try{
 f.event('APPROVE',{date:old});f.event('ISSUE',{date:old});f.event('ACKNOWLEDGE',{date:old,reference:'D1',lines:[{key:'bolt',qty:6}]});let latest=f.source.read().procurement.events.at(-1);
 f.event('CORRECT_ACKNOWLEDGMENT',{correctionOf:latest.id,lines:[{key:'bolt',qty:5}]});latest=f.source.read().procurement.events.at(-1);f.productionCommand('manager','ADJUST_STOCK',{key:'bolt',qty:105,reference:'Count after first correction'});const before=f.source.read();
 assert.throws(()=>f.event('CORRECT_ACKNOWLEDGMENT',{correctionOf:latest.id,lines:[{key:'bolt',qty:4}]}),/physical count/);assert.deepEqual(f.source.read(),before);
 f.event('CORRECT_ACKNOWLEDGMENT',{correctionOf:latest.id,lines:[{key:'bolt',qty:4}],stockAlreadyReconciled:true});latest=f.source.read().procurement.events.at(-1);assert.equal(f.source.read().stock.bolt.qty,105);assert.equal(f.production.page('admin',{kind:'movements',key:'bolt'}).rows[0].delta,0);
 assert.throws(()=>f.event('CORRECT_ACKNOWLEDGMENT',{correctionOf:latest.id,lines:[{key:'bolt',qty:5}]}),/already reconciled/);f.event('CORRECT_ACKNOWLEDGMENT',{correctionOf:latest.id,lines:[{key:'bolt',qty:5}],stockAlreadyReconciled:true});assert.equal(f.source.read().stock.bolt.qty,105);assert.equal(orderProgress(f.source.read(),f.source.read().orders[0].id).lines[0].acknowledged,5);
}finally{f.close();}});

test('a count for one corrected line does not reconcile another line in a later link',()=>{const f=setup({multi:true});try{
 f.event('APPROVE',{date:old});f.event('ISSUE',{date:old});f.event('ACKNOWLEDGE',{date:old,reference:'D1',lines:[{key:'bolt',qty:6},{key:'nut',qty:6}]});let latest=f.source.read().procurement.events.at(-1);
 f.productionCommand('manager','ADJUST_STOCK',{key:'bolt',qty:105,reference:'Bolt count'});f.event('CORRECT_ACKNOWLEDGMENT',{correctionOf:latest.id,lines:[{key:'bolt',qty:5},{key:'nut',qty:6}],stockAlreadyReconciled:true});latest=f.source.read().procurement.events.at(-1);const before=f.source.read();
 assert.throws(()=>f.event('CORRECT_ACKNOWLEDGMENT',{correctionOf:latest.id,lines:[{key:'bolt',qty:5},{key:'nut',qty:5}],stockAlreadyReconciled:true}),/No later saved physical count.*nut/);assert.deepEqual(f.source.read(),before);
 f.productionCommand('manager','ADJUST_STOCK',{key:'nut',qty:105,reference:'Nut count'});f.event('CORRECT_ACKNOWLEDGMENT',{correctionOf:latest.id,lines:[{key:'bolt',qty:5},{key:'nut',qty:5}],stockAlreadyReconciled:true});const after=f.source.read();assert.equal(after.stock.bolt.qty,105);assert.equal(after.stock.nut.qty,105);assert.equal(orderProgress(after,after.orders[0].id).lines.find(l=>l.key==='nut').acknowledged,5);
}finally{f.close();}});

test('later physical count can reconcile a PO correction without subtracting stock twice',()=>{const f=setup();try{
 f.event('APPROVE',{date:old});f.event('ISSUE',{date:old});f.event('ACKNOWLEDGE',{date:old,reference:'D1',lines:[{key:'bolt',qty:6}]});const original=f.source.read().procurement.events.at(-1);
 f.productionCommand('manager','ADJUST_STOCK',{key:'bolt',qty:105,reference:'Count after delivery'});
 assert.throws(()=>f.event('CORRECT_ACKNOWLEDGMENT',{correctionOf:original.id,lines:[{key:'bolt',qty:5}]}),/physical count/);
 f.event('CORRECT_ACKNOWLEDGMENT',{correctionOf:original.id,lines:[{key:'bolt',qty:5}],stockAlreadyReconciled:true});const after=f.source.read();assert.equal(after.stock.bolt.qty,105);assert.equal(orderProgress(after,after.orders[0].id).lines[0].acknowledged,5);const movement=f.production.page('admin',{kind:'movements',key:'bolt'}).rows[0];assert.equal(movement.delta,0);assert.equal(movement.poDelta,-1);assert.equal(movement.stockAlreadyReconciled,true);
}finally{f.close();}});

test('repeated human receipts require a reasoned override and preserve both ledger entries',()=>{const f=setup();try{
 f.productionCommand('operator','RECEIVE_STOCK',{key:'bolt',qty:5,reference:'Docket A'});assert.throws(()=>f.productionCommand('operator','RECEIVE_STOCK',{key:'bolt',qty:5,reference:' docket a '}),/Possible duplicate receipt/);assert.equal(f.source.read().stock.bolt.qty,105);
 f.productionCommand('operator','RECEIVE_STOCK',{key:'bolt',qty:5,reference:'Docket A',duplicateOverrideReason:'Second truck with same supplier docket'});assert.equal(f.source.read().stock.bolt.qty,110);const movements=f.production.page('admin',{kind:'movements',key:'bolt'}).rows;assert.equal(movements[0].duplicateOverrideReason,'Second truck with same supplier docket');assert.equal(movements.filter(m=>m.type==='RECEIVE_STOCK').length,2);
}finally{f.close();}});

test('percent imports require explicit units for ambiguous 1 and .01, and future POs fail at creation',()=>{const s=fixture();for(const v of [1,'1',.01,'0.01'])assert.throws(()=>pricePercent(v,'GST percentage'),/ambiguous/);assert.equal(pricePercent('1%','GST percentage'),1);assert.equal(pricePercent('100%','GST percentage'),100);assert.equal(pricePercent('0.01%','GST percentage'),.01);assert.equal(pricePercent(2,'GST percentage'),2);
 const preview=previewPrices(s,[['code','rate','gst'],['IMP-1',100,1]],0,1,{gstColumn:2});assert.equal(preview.matched.length,0);assert.match(preview.errors[0].message,/ambiguous/);s.stock={};assert.throws(()=>createOrders(s,['bolt'],{date:'2099-01-01'}),/future/);
});

test('same-day count blocks ambiguous acknowledgment; reviewed later delivery posts once',()=>{const f=setup();try{
 f.event('APPROVE',{date:old});f.event('ISSUE',{date:old});f.productionCommand('manager','ADJUST_STOCK',{key:'bolt',qty:100,reference:'Morning count'});
 assert.throws(()=>f.event('ACKNOWLEDGE',{date:recent,reference:'Afternoon truck',lines:[{key:'bolt',qty:5}]}),/may already include/);
 const s=f.source.read();assert.throws(()=>applyOrderEvent(s,{id:randomUUID(),poId:s.orders[0].id,type:'ACKNOWLEDGE',date:recent,reason:'Delivery',reference:'Afternoon truck',lines:[{key:'bolt',qty:5}],stockNotIncludedInCount:true,reconciliationReason:'After morning count'},{actor:{id:'operator',name:'Operator',role:'PRODUCTION_OPERATOR'}}),/manager/);
 f.event('ACKNOWLEDGE',{date:recent,reference:'Afternoon truck',lines:[{key:'bolt',qty:5}],stockNotIncludedInCount:true,reconciliationReason:'Truck arrived after manager count'});assert.equal(f.source.read().stock.bolt.qty,105);assert.equal(f.source.read().procurement.events.at(-1).reconciliationReason,'Truck arrived after manager count');
}finally{f.close();}});

test('cross-series copy uses final target syntax and conflicting sticker blocks approval',()=>{const f=setup();try{
 const s=f.source.read();s.parts.push({id:'leader-sticker',code:'IMP-L',name:'Leader sticker',uom:'pcs',rate:1,supplier:'vendor',fabricated:false},{id:'emperor-sticker',code:'IMP-E',name:'Emperor sticker',uom:'pcs',rate:1,supplier:'vendor',fabricated:false});s.stickerPolicy={brandBySeries:{Leader:{partId:'leader-sticker',ppm:1},Emperor:{partId:'emperor-sticker',ppm:1}}};s.models[0].lines.push({partId:'leader-sticker',ppm:1});f.save(s);
 const command=(type,extra={})=>f.bom.command('manager',{type,modelId:'',reason:'Checked cross-series sticker',expectedRevision:f.source.read().revision,expectedReviewRevision:f.bom.revision(),requestId:randomUUID(),...extra});
 command('SUBMIT_CORRECTION',{draft:{newModelId:'S1.V99',copyFrom:'S2.V58',syntax:{series:'Emperor',size:'7FT'}}});command('APPROVE',{reviewId:f.bom.records()[0].id});const copied=f.source.read().models.find(m=>m.id==='S1.V99');assert.ok(copied.lines.some(l=>l.partId==='emperor-sticker'));assert.ok(!copied.lines.some(l=>l.partId==='leader-sticker'));
 command('SUBMIT_CORRECTION',{draft:{newModelId:'S1.V98',copyFrom:'S2.V58',syntax:{series:'Emperor',size:'7FT'},lines:[{partId:'bolt',ppm:4},{partId:'leader-sticker',ppm:1}]}});const review=f.bom.records()[0];assert.throws(()=>command('APPROVE',{reviewId:review.id}),/Emperor BOM must use/);assert.equal(f.bom.records()[0].status,'PENDING');assert.ok(!f.source.read().models.some(m=>m.id==='S1.V98'));
}finally{f.close();}});

test('XLSX percentage formats survive extraction without converting nonpercent or conditional formats',t=>{const python=process.env.FH_PYTHON||'python3';if(spawnSync(python,['-c','import openpyxl'],{windowsHide:true,stdio:'ignore'}).status!==0)return t.skip('openpyxl unavailable');const script=`import sys,io,base64,json,openpyxl,subprocess\nw=openpyxl.Workbook();s=w.active;s.append(['code','rate','gst']);s.append(['IMP-1',100,1]);s['C2'].number_format='0%';s.append(['IMP-2',100,.01]);s['C3'].number_format='0%';s.append(['IMP-3',100,1]);s.append(['IMP-4',100,1]);s['C5'].number_format='0.00;0%';s.append(['IMP-5',100,1]);s['C6'].number_format='0.00_%';s.append(['IMP-6',100,1]);s['C7'].number_format='0.00*%';s.append(['IMP-7',100,2]);s['C8'].number_format='[>=1]0%;0%';b=io.BytesIO();w.save(b);p=subprocess.run([sys.executable,sys.argv[1],'stock'],input=json.dumps({'name':'rates.xlsx','data':base64.b64encode(b.getvalue()).decode()}),text=True,capture_output=True);assert p.returncode==0,p.stderr;print(p.stdout)`;
 const run=spawnSync(python,['-c',script,join(process.cwd(),'server','implements-files','files.py')],{windowsHide:true,encoding:'utf8',maxBuffer:2e6});assert.equal(run.status,0,run.stderr);const rows=JSON.parse(run.stdout).sheets[0].rows;assert.equal(rows[1][2],'100%');assert.equal(rows[2][2],'1%');assert.equal(rows[3][2],1);assert.equal(rows[4][2],1);assert.equal(rows[5][2],1);assert.equal(rows[6][2],1);assert.match(rows[7][2],/Ambiguous Excel percentage format/);assert.throws(()=>pricePercent(rows[7][2],'GST'),/ambiguous Excel percentage format/);});
