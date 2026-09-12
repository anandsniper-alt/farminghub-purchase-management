/** PLM template definitions and pure helpers.
 * These are configurable seed defaults for the review build, not final production schema.
 */
export const PLM_TEMPLATES = [
  {
    id:'tpl-power-weeder', category:'POWER WEEDER', name:'Power Weeder detailed technical template v2', active:true, source:'User-supplied PLM technical specification sample · 2026-09-12',
    fields:[
      // Engine & fuel system
      ['engineModel','Engine model / specification','text','Engine & fuel system',true,null,true,true,true,true],
      ['engineBrand','Engine brand / manufacturer','text','Engine & fuel system',true,null,true,true,true,true],
      ['fuelType','Fuel type','select','Engine & fuel system',true,['Petrol','Diesel','Other'],true,true,true,true],
      ['startingType','Starting type','select','Engine & fuel system',true,['Manual','Electric','Manual + Electric','Other'],true,true,true,true],
      ['carburetor','Carburetor specification','text','Engine & fuel system',false,null,true,true,true,true],
      ['e20Compatibility','E20 petrol compatibility','select','Engine & fuel system',true,['Required','Not required','Not applicable'],true,true,true,true],
      ['camshaft','Camshaft specification','text','Engine & fuel system',false,null,true,true,false,true],
      ['fuelTankCap','Fuel tank cap','text','Engine & fuel system',true,null,true,true,false,true],
      ['fuelTankProtection','Fuel tank / foam protection','text','Engine & fuel system',false,null,true,true,false,true],

      // Transmission & controls
      ['gearType','Gear / drive type','text','Transmission & controls',true,null,true,true,true,true],
      ['forwardSpeeds','Forward speeds','text','Transmission & controls',true,null,true,true,true,true],
      ['reverseSpeeds','Reverse speeds','text','Transmission & controls',true,null,true,true,true,true],
      ['ptoShaft','PTO shaft','select','Transmission & controls',true,['Yes','No','Not applicable'],true,true,true,true],
      ['gearboxBrand','Gearbox brand / specification','text','Transmission & controls',true,null,true,true,true,true],
      ['clutchType','Clutch type','select','Transmission & controls',true,['Release to go','Hold to go','Other'],true,true,true,true],
      ['handleType','Handle type / toolbox','text','Transmission & controls',true,null,true,true,true,true],
      ['switchType','Switch type','text','Transmission & controls',false,null,true,true,false,true],

      // Chassis & wheels
      ['centreWheelType','Centre wheel type','select','Chassis & wheels',true,['Air tube tyre','Tube tyre','Solid tyre','Other'],true,true,true,true],
      ['centreWheelSize','Centre wheel size','text','Chassis & wheels',true,null,true,true,true,true],
      ['frontFender','Front fender specification','text','Chassis & wheels',false,null,true,true,false,true],

      // Blade / working equipment
      ['bladeCount','Blade quantity','text','Blade system',true,null,true,true,true,true],
      ['bladeArrangement','Blade arrangement','text','Blade system',true,null,true,true,true,true],
      ['bladeWeight','Blade weight','text','Blade system',true,null,true,true,true,true],
      ['bladeType','Blade / dry-land blade specification','text','Blade system',false,null,true,true,false,true],

      // Finish & packing — technical requirements only. Brand colours stay in brand delta.
      ['paintFinish','Paint / powder-coat quality','text','Finish & packing',false,null,true,true,false,true],
      ['packingType','Packing type','text','Finish & packing',true,null,true,true,true,true],
      ['woodPackingThickness','Wooden packing thickness','text','Finish & packing',false,null,true,true,true,true],
      ['packingProtection','Packing / protection requirements','textarea','Finish & packing',false,null,true,true,false,true],

      // General technical notes
      ['criticalDimensions','Critical dimensions / thicknesses','textarea','Technical notes',false,null,true,true,true,true],
      ['safetyRequirements','Safety requirements','textarea','Technical notes',false,null,true,true,true,true],
      ['accessories','Accessories / spares supplied','textarea','Technical notes',false,null,true,true,true,true],
      ['otherTechnicalRequirements','Other technical requirements','textarea','Technical notes',false,null,true,true,true,true]
    ].map(([key,label,type,group,required,options,qcPreproduction,qcBulk,poPrint,supplierConfirm])=>({key,label,type,group,required,options:options||null,qcPreproduction:!!qcPreproduction,qcBulk:!!qcBulk,poPrint:!!poPrint,supplierConfirm:!!supplierConfirm,active:true}))
  },
  {
    id:'tpl-chaff-cutter', category:'CHAFF CUTTER', name:'Chaff Cutter technical template', active:true,
    fields:[
      ['machineSpecification','Chaff cutter specification','textarea','Machine',true],
      ['motorSpecification','Motor specification','textarea','Motor',false],
      ['motorPurchasedSeparately','Motor purchased separately','select','Motor',true,['Yes','No','Not applicable']],
      ['blade','Blade specification','textarea','Cutting',true],
      ['bodyMaterial','Body material','text','Structure',true],
      ['thickness','Body / critical thickness','text','Structure',true],
      ['rpm','RPM','text','Drive',false],
      ['pulley','Pulley','text','Drive',false],
      ['belt','Belt','text','Drive',false],
      ['frame','Frame specification','textarea','Structure',false],
      ['paint','Paint / finish','text','Appearance',false],
      ['colourCodes','Colour code','textarea','Appearance',false],
      ['safetyGuards','Safety guards','textarea','Safety',true],
      ['packing','Packaging','textarea','Packing',true]
    ].map(([key,label,type,group,required,options])=>({key,label,type,group,required,options:options||null,active:true}))
  },
  {
    id:'tpl-brush-cutter', category:'BRUSH CUTTER', name:'Brush Cutter technical template', active:true,
    fields:[
      ['engine','Engine specification','textarea','Engine',true],
      ['e20Compatibility','E20 petrol compatibility','select','Engine',true,['Required','Not required','Not applicable']],
      ['shaft','Shaft / stick specification','textarea','Drive',true],
      ['gearHead','Gear head','text','Drive',false],
      ['handle','Handle type','text','Controls',false],
      ['harness','Harness','text','Accessories',false],
      ['blade','Blade / cutter supplied','textarea','Accessories',true],
      ['guard','Safety guard','textarea','Safety',true],
      ['toolKit','Tool kit / accessories','textarea','Accessories',false],
      ['enginePacking','Engine carton / master carton','textarea','Packing',true],
      ['shaftPacking','Shaft carton / master carton','textarea','Packing',true],
      ['colourCodes','Colour codes','textarea','Appearance',false]
    ].map(([key,label,type,group,required,options])=>({key,label,type,group,required,options:options||null,active:true}))
  },
  {
    id:'tpl-battery-sprayer', category:'BATTERY SPRAYER', name:'Battery Sprayer technical template', active:true,
    fields:[
      ['tankCapacity','Tank capacity','text','Product',true],
      ['battery','Battery specification','textarea','Electrical',true],
      ['pump','Pump specification','textarea','Hydraulic',true],
      ['charger','Charger specification','text','Electrical',false],
      ['lance','Lance / gun','text','Accessories',false],
      ['nozzles','Nozzles supplied','textarea','Accessories',false],
      ['hose','Hose specification','text','Accessories',false],
      ['colourCodes','Colour codes','textarea','Appearance',false],
      ['labels','Labels / branding positions','textarea','Branding',false],
      ['packing','Packing / master carton','textarea','Packing',true]
    ].map(([key,label,type,group,required,options])=>({key,label,type,group,required,options:options||null,active:true}))
  },
  {
    id:'tpl-generic-lae', category:'*', name:'Generic LAE technical template', active:true,
    fields:[
      ['configuration','Product configuration','textarea','Product',true],
      ['materials','Materials / grades','textarea','Materials',false],
      ['criticalDimensions','Critical dimensions / thicknesses','textarea','Dimensions',false],
      ['safety','Safety requirements','textarea','Safety',false],
      ['colourCodes','Colours / colour codes','textarea','Appearance',false],
      ['accessories','Accessories / spares','textarea','Accessories',false],
      ['labels','Labels / branding positions','textarea','Branding',false],
      ['packing','Packing requirements','textarea','Packing',true]
    ].map(([key,label,type,group,required,options])=>({key,label,type,group,required,options:options||null,active:true}))
  }
];
export function templateForCategory(state, category){
  const c=String(category||'').trim().toUpperCase();
  return state.plmTemplates?.find(t=>t.active!==false&&String(t.category).toUpperCase()===c)
    ||state.plmTemplates?.find(t=>t.active!==false&&t.category==='*')||null;
}
export function specDescriptionFromValues(template, values={}){
  if(!template)return '';
  const groups=[];
  for(const f of template.fields.filter(f=>f.active!==false)){
    const v=String(values[f.key]??'').trim();
    if(!v)continue;
    let g=groups.find(x=>x.name===f.group);if(!g){g={name:f.group,lines:[]};groups.push(g);}
    g.lines.push(`${f.label}: ${v}`);
  }
  return groups.map(g=>`${g.name}\n${g.lines.join('\n')}`).join('\n\n');
}
export function brandDeltaSummary(delta={}){
  const colours=[
    delta.primaryColourName&&`Primary colour: ${delta.primaryColourName}${delta.primaryColourCode?' · '+delta.primaryColourCode:''}${delta.primaryColourComponents?' · '+delta.primaryColourComponents:''}`,
    delta.secondaryColourName&&`Secondary colour: ${delta.secondaryColourName}${delta.secondaryColourCode?' · '+delta.secondaryColourCode:''}${delta.secondaryColourComponents?' · '+delta.secondaryColourComponents:''}`
  ].filter(Boolean).join('\n');
  return [
    ['Branding',delta.branding],['Sticker / decal',delta.decals],['Sticker application',delta.stickerApplication],
    ['Embossing',delta.embossing],['Packaging / carton',delta.packaging],['Labels',delta.labels],
    ['Colour mapping',colours||delta.colourNotes],['Other brand-specific changes',delta.remarks]
  ].filter(([,v])=>String(v||'').trim()).map(([k,v])=>`${k}: ${String(v).trim()}`).join('\n');
}
export function qcChecklistForSpec(template,values={},phase='PREPRODUCTION'){
  if(!template)return [];
  const flag=phase==='BULK'?'qcBulk':'qcPreproduction';
  return template.fields.filter(f=>f.active!==false&&f[flag]).map(f=>({key:f.key,label:f.label,value:String(values[f.key]??'').trim(),group:f.group,required:!!f.required}));
}
export function poFieldsForSpec(template,values={}){
  if(!template)return [];
  return template.fields.filter(f=>f.active!==false&&f.poPrint).map(f=>({key:f.key,label:f.label,value:String(values[f.key]??'').trim(),group:f.group}));
}
export function supplierConfirmationFields(template,values={}){
  if(!template)return [];
  return template.fields.filter(f=>f.active!==false&&f.supplierConfirm).map(f=>({key:f.key,label:f.label,value:String(values[f.key]??'').trim(),group:f.group}));
}
