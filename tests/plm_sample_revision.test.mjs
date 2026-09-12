import test from 'node:test';
import assert from 'node:assert/strict';
import {createCleanSeed} from '../shared/clean-seed.mjs';
import {createSeed} from '../shared/seed.mjs';
import {qcChecklistForSpec,poFieldsForSpec,supplierConfirmationFields,brandDeltaSummary} from '../shared/plm.mjs';

test('Power Weeder template maps the supplied technical-spec structure into controlled fields',()=>{
  const s=createCleanSeed('2026-09-12');
  const t=s.plmTemplates.find(x=>x.id==='tpl-power-weeder');
  assert.equal(t.name,'Power Weeder detailed technical template v2');
  for(const key of ['engineModel','engineBrand','fuelType','startingType','carburetor','fuelTankCap','clutchType','centreWheelType','centreWheelSize','frontFender','bladeCount','bladeArrangement','bladeWeight','gearType','forwardSpeeds','reverseSpeeds','ptoShaft','gearboxBrand','packingType','woodPackingThickness']) assert.ok(t.fields.some(f=>f.key===key),key);
  assert.ok(t.source.includes('technical specification sample'));
});

test('PLM field metadata generates PP-sample, bulk-QC, PO and supplier-confirmation checklists',()=>{
  const s=createCleanSeed('2026-09-12'),t=s.plmTemplates.find(x=>x.id==='tpl-power-weeder');
  const values=Object.fromEntries(t.fields.map(f=>[f.key,'SPEC-'+f.key]));
  const pp=qcChecklistForSpec(t,values,'PREPRODUCTION'),bulk=qcChecklistForSpec(t,values,'BULK'),po=poFieldsForSpec(t,values),supplier=supplierConfirmationFields(t,values);
  assert.ok(pp.length>20); assert.ok(bulk.length>20); assert.ok(po.length>10); assert.ok(supplier.length>20);
  assert.ok(pp.some(x=>x.key==='bladeWeight')); assert.ok(po.some(x=>x.key==='gearboxBrand')); assert.ok(supplier.some(x=>x.key==='fuelTankCap'));
});

test('brand delta summary carries structured sticker, embossing and component-colour mapping',()=>{
  const text=brandDeltaSummary({branding:'GAJA',decals:'GAJA sticker',stickerApplication:'Fully paste',embossing:'Engine / Fender / Gearbox',primaryColourName:'Orange',primaryColourCode:'021C',primaryColourComponents:'Mud fender / fan cover',secondaryColourName:'Grey',secondaryColourCode:'PT-425C',secondaryColourComponents:'Gearbox / wheel rim'});
  assert.match(text,/Sticker \/ decal: GAJA sticker/);
  assert.match(text,/Embossing: Engine \/ Fender \/ Gearbox/);
  assert.match(text,/Primary colour: Orange · 021C · Mud fender \/ fan cover/);
  assert.match(text,/Secondary colour: Grey · PT-425C · Gearbox \/ wheel rim/);
});

test('demo seed remains compatible with expanded required Power Weeder template',()=>{
  const s=createSeed('2026-09-12');
  const b=s.bases.find(x=>x.category==='POWER WEEDER');
  const t=s.plmTemplates.find(x=>x.id===b.templateId);
  for(const f of t.fields.filter(x=>x.required)) assert.ok(String(b.specifications[0].fieldValues[f.key]||'').trim(),f.key);
});
