import assert from 'node:assert/strict';
import test from 'node:test';
import {developmentRequestContext} from '../web/development-requests.mjs';

const origin='https://purchase.example.test';
const context=(route,metadata)=>developmentRequestContext(origin+route,metadata);

test('request context identifies SCM screens without saving record or filter values',()=>{
 for(const [query,screen] of [
  ['book=1&po=PRIVATE-ORDER&supplier=PRIVATE-SUPPLIER','Commercial invoice booking'],
  ['invoice=PRIVATE-INVOICE&book=1','Commercial invoice review'],
  ['ro=PRIVATE-RO&fromPo=PRIVATE-PO&focus=costing','RO review'],
  ['po=PRIVATE-ORDER','PO records'],
  ['search=invoice',''],
 ]){
  assert.deepEqual(context('/#/scm?'+query),{
   screen:['LAE Import SCM',screen].filter(Boolean).join(' · '),
   route:'/#/scm',
  });
 }
});

test('request context keeps only known LAE Analytics section paths',()=>{
 for(const [section,screen] of [
  ['review','Review'],['sales','Sales'],['targets','Annual plan & sales'],
  ['stock','Stock & pipeline'],['sources','Data sources'],
 ]){
  const route='/lae-analytics/#/lae-sales-analytics/'+section;
  assert.deepEqual(context(route+'/PRIVATE-ID?search=PRIVATE-TEXT'),{
   screen:'LAE Sales Analytics · '+screen,
   route,
  });
 }
 assert.deepEqual(context('/lae-analytics/#/lae-sales-analytics/PRIVATE-SECTION'),{
  screen:'LAE Sales Analytics',
  route:'/lae-analytics/#/lae-sales-analytics',
 });
});

test('request context discards unknown paths, routes, dialogs and arbitrary labels',()=>{
 assert.deepEqual(context('/PRIVATE-PATH/#/PRIVATE-ROUTE?secret=PRIVATE',{dialog:'PRIVATE-DIALOG',screen:'PRIVATE-LABEL'}),{
  screen:'Purchase workspace',
  route:'',
 });
 assert.deepEqual(context('/#/order/PRIVATE-ORDER?secret=PRIVATE',{
  route:'https://foreign.example.test/#/home?secret=PRIVATE',dialog:'edit-draft',
 }),{
  screen:'Purchase order · Edit draft purchase order',
  route:'/#/order',
 });
 assert.deepEqual(context('/price-workings/?secret=PRIVATE#/item?code=PRIVATE-ITEM'),{
  screen:'Utility price workings · Item detail',
  route:'/price-workings/#/item',
 });
 assert.deepEqual(context('/#/vms/module/vendors/PRIVATE-VENDOR?secret=PRIVATE'),{
  screen:'Vendor Management System · Vendors',
  route:'/#/vms/module/vendors',
 });
});
