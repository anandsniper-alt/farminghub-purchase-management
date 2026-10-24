import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedPaymentMonths} from '../shared/payment-plan-selection.mjs';

test('selected months default to the route month, current month, or January in another year',()=>{
 assert.deepEqual(selectedPaymentMonths({year:2026,month:'2026-11'},'2026-10-24'),['2026-11']);
 assert.deepEqual(selectedPaymentMonths({year:2026},'2026-10-24'),['2026-10']);
 assert.deepEqual(selectedPaymentMonths({year:2027,month:'2026-11'},'2026-10-24'),['2027-01']);
 assert.deepEqual(selectedPaymentMonths({},'2026-10-24'),['2026-10']);
 assert.deepEqual(selectedPaymentMonths({year:2026,months:' '},'2026-10-24'),['2026-10']);
});

test('month checkboxes have a sorted unique selection and retain explicit empty selection',()=>{
 const query={year:2026,month:'2026-10',months:'2026-11, 2026-01,2026-11'};
 assert.deepEqual(selectedPaymentMonths(query,'2026-10-24'),['2026-01','2026-11']);
 assert.equal(query.months,'2026-11, 2026-01,2026-11');
 assert.deepEqual(selectedPaymentMonths({year:2026,months:'none'},'2026-10-24'),[]);
 const all=Array.from({length:12},(_,i)=>'2026-'+String(i+1).padStart(2,'0'));
 assert.deepEqual(selectedPaymentMonths({year:2026,months:all.join(',')},'2026-10-24'),all);
});

test('explicit invalid selections fail rather than silently expanding or changing the period',()=>{
 for(const months of ['2026-00','2026-13','2027-01','2026-1','2026-11,','2026-11,none','all',202611,['2026-11']]){
  assert.throws(()=>selectedPaymentMonths({year:2026,months},'2026-10-24'),/valid months/);
 }
 for(const year of [1899,10000,'bad'])assert.throws(()=>selectedPaymentMonths({year},'2026-10-24'),/valid planning year/);
});
