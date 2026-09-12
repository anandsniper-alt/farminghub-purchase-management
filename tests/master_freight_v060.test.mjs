import test from 'node:test';
import assert from 'node:assert/strict';
import {createCleanSeed} from '../shared/clean-seed.mjs';
import {currentApprovedPrice,execute} from '../shared/domain.mjs';
import {agentChargeForRate,benchmarkRateUsd,freightTrendFor,rateVariance} from '../shared/shipping.mjs';

test('final Item Master loads all 129 Base Item Codes and generates 3 ERP Item Codes per base',()=>{
  const s=createCleanSeed('2026-09-12');
  assert.equal(s.bases.length,129);
  assert.equal(s.items.length,387);
  const b=s.bases.find(x=>x.code==='BS20');
  assert.ok(b);
  assert.deepEqual(s.items.filter(i=>i.baseId===b.id).map(i=>i.code).sort(),['GJ-BS20','KD-BS20','TT-BS20']);
  assert.deepEqual(s.bases.filter(b=>!b.vendorId).map(b=>b.code).sort(),['BD1','BD2']);
});

test('filtered price list is base-product keyed and inherited by ERP Item Codes',()=>{
  const s=createCleanSeed('2026-09-12');
  const b=s.bases.find(x=>x.code==='BS20');
  const i=s.items.find(x=>x.code==='GJ-BS20');
  const pByBase=currentApprovedPrice(s,b.vendorId,b.id,'USD','2026-09-12');
  const pByItem=currentApprovedPrice(s,b.vendorId,i.id,'USD','2026-09-12');
  assert.ok(pByBase);
  assert.equal(pByBase.id,pByItem.id);
  assert.equal(pByBase.baseItemCode,'BS20');
  assert.equal(pByBase.unitPriceMinor,1400);
  assert.ok(s.priceLists.every(p=>s.bases.some(b=>b.id===p.baseId)));
});

test('freight agent charge is USD 60 below 3000 and USD 120 from 3000 upward',()=>{
  assert.equal(agentChargeForRate(2999),60);
  assert.equal(agentChargeForRate(3000),120);
  assert.equal(benchmarkRateUsd(2999),3059);
  assert.equal(benchmarkRateUsd(3000),3120);
});

test('latest historical benchmarks and trends match workbook sequence',()=>{
  const s=createCleanSeed('2026-09-12');
  const expected={
    'NINGBO|CHENNAI|1X40HC':[3920,'FALLING'],
    'QINGDAO|CHENNAI|1X40HC':[3370,'FALLING'],
    'SHENZHEN|CHENNAI|1X40HC':[2560,'RISING'],
    'CHONGQING|VIA NINGBO|CHENNAI|1X40HC':[4720,'RISING'],
    'CHONGQING|VIA NANSHA|CHENNAI|1X40HC':[4620,'RISING'],
  };
  for(const [route,[benchmark,direction]] of Object.entries(expected)){
    const tr=freightTrendFor(s,route);
    assert.equal(tr.recent.at(-1).benchmarkUsd,benchmark,route);
    assert.equal(tr.direction,direction,route);
  }
});

test('booked freight warning compares booking to final benchmark, not raw O/F',()=>{
  const s=createCleanSeed('2026-09-12');
  const shipment={rateRouteKey:'NINGBO|CHENNAI|1X40HC',bookedFreightUsdMinor:4050*100};
  const v=rateVariance(s,shipment);
  assert.equal(v.oceanFreight,3800);
  assert.equal(v.agentCharge,120);
  assert.equal(v.market,3920);
  assert.equal(v.difference,130);
  assert.equal(v.flag,true);
});

test('complaint is stored at ERP Item Code and carries Base Item Code for roll-up',()=>{
  const s=createCleanSeed('2026-09-12');
  const item=s.items.find(i=>i.code==='GJ-BS20');
  const base=s.bases.find(b=>b.id===item.baseId);
  const user=s.users.find(u=>u.role==='EXECUTIVE');
  const r=execute(s,{type:'ADD_COMPLAINT',payload:{itemId:item.id,severity:'MAJOR',summary:'Pump issue',remarks:'Field complaint',fileIds:[]}},user,{now:'2026-09-12T10:00:00.000Z',id:(()=>{let n=0;return()=>`test-${++n}`;})()});
  assert.equal(r.state.complaints.length,1);
  assert.equal(r.state.complaints[0].erpItemCode,'GJ-BS20');
  assert.equal(r.state.complaints[0].baseId,base.id);
  assert.equal(r.state.complaints[0].baseItemCode,'BS20');
});
