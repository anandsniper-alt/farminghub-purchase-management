// Production-facing contract: explicit technical fields, never a price-bearing state clone.
export const BOM_SCOPE='BOM_MANAGEMENT';
export const SYNTAX_FIELDS=['series','configuration','frame','size','blades','speed','bladeOrientation','gearboxOrientation','salesConfirmed'];
const modelFields=['id','name',...SYNTAX_FIELDS,'syntaxRow','bomAvailable','revision','fabricationCode','syntaxWeight'];
const partFields=['id','code','name','category','fabricated','uom'];
const fabricationFields=['partId','code','drawingCode','name','ppm','weight'];
const select=(value,fields)=>Object.fromEntries(fields.filter(k=>value?.[k]!==undefined).map(k=>[k,value[k]]));
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export const canReviewBom=actor=>actor?.active!==false&&['ADMIN','MANAGER','EXECUTIVE','PRODUCT_MANAGER','BOM_REVIEWER','PRODUCTION_OPERATOR'].includes(actor?.role);
export const canApproveBom=actor=>actor?.active!==false&&['ADMIN','MANAGER'].includes(actor?.role);
export function technicalModel(m){return {...select(m,modelFields),lines:(m.lines||[]).map(l=>select(l,['partId','ppm'])),fabrication:(m.fabrication||[]).map(l=>({...select(l,fabricationFields),excluded:l.partId==='source-row-33'}))};}
export function technicalParts(state){const brands=new Map(Object.entries(state.stickerPolicy?.brandBySeries||{}).map(([series,line])=>[line.partId,series]));return (state.parts||[]).map(p=>({...select(p,partFields),supplierPartCode:(state.supplierItems||[]).find(r=>r.itemKey===p.id&&r.supplierId===p.supplier)?.partCode||'',...(brands.has(p.id)?{brandSeries:brands.get(p.id)}:{})}));}
export function technicalWorkspace(state){
 const categories=new Set(['Item identity','Item code pending','Old item absent','Incomplete PPM','Unmapped item','PPM difference','Family/specification','Quantity pending','Blank new PPM','New tabs differ','Additional part weight pending','Incomplete syntax','Purchased BOM pending','Name/PPM outlier','Model label','Source gap','Weight comparison']);
 const sourceFlags=(state.reviewFlags||[]).filter(f=>categories.has(f.category)&&state.models.some(m=>m.id===f.model)).map(f=>({id:String(f.id),modelId:f.model,category:f.category,itemCode:typeof f.part==='string'?f.part:'',name:typeof f.name==='string'?f.name:'',...(f.category.includes('PPM')||f.category==='New tabs differ'?{oldPpm:typeof f.old==='number'?f.old:null,newPpm:typeof f.new==='number'?f.new:null,confirmedPpm:typeof f.confirmedPpm==='number'?f.confirmedPpm:null}:{}),confirmed:/\b(confirmed|resolved|closed)\b/i.test(String(f.status||''))}));
 return {revision:state.revision,sourceFlags,models:(state.models||[]).map(technicalModel),parts:technicalParts(state)};
}
export function technicalIssues(model,parts=[]){
 const index=new Map(parts.map(p=>[p.id,p]));const out=[];
 if(!model.bomAvailable)out.push({id:'bom',segment:'BOM',message:'Detailed BOM not available'});
 for(const field of ['series','configuration','frame','size','blades','speed','bladeOrientation','gearboxOrientation'])if(model[field]==null||model[field]==='')out.push({id:'syntax:'+field,segment:'Syntax',message:field+' pending'});
 for(const l of model.lines||[]){const p=index.get(l.partId);if(l.ppm==null)out.push({id:l.partId,segment:p?.category||'Components',message:(p?.name||l.partId)+': PPM pending'});if(!p?.code)out.push({id:'code:'+l.partId,segment:p?.category||'Components',message:(p?.name||l.partId)+': item code pending'});}
 for(const l of model.lines||[]){const p=index.get(l.partId);if(p?.brandSeries&&p.brandSeries!==model.series)out.push({id:'series:'+l.partId,segment:'Brand stickers',message:p.name+': does not match model series '+model.series});}
 for(const l of model.fabrication||[]){if(l.partId==='source-row-33')continue;if(l.ppm==null)out.push({id:'ppm:'+l.partId,segment:'Fabrication',message:l.name+': PPM pending'});if(l.weight==null&&l.ppm!==0)out.push({id:'weight:'+l.partId,segment:'Fabrication',message:l.name+': weight pending'});}
 const config=String(model.configuration||'').split('-');if(config.length===8){const values={frame:config[1],size:config[3],blades:Number(config[4]),speed:config[5],bladeOrientation:config[6],gearboxOrientation:config[7]};for(const [key,value] of Object.entries(values)){if(model[key]!=null&&String(model[key]).replaceAll(' ','').toUpperCase()!==String(value).replaceAll(' ','').toUpperCase())out.push({id:'configuration:'+key,segment:'Syntax',message:'Configuration string and '+key+' disagree'});}if(config[0]!==model.id.split('.')[0])out.push({id:'configuration:series',segment:'Syntax',message:'Configuration series code and model number disagree'});}
 return out;
}
const fail=message=>{throw Error(message);};
const text=(value,label,max=300)=>{if(typeof value!=='string'||value.length>max||/[\x00-\x1f\x7f]/.test(value))fail('Invalid '+label+'.');return value.trim();};
const numeric=(value,label,integer=false,max=1e6)=>{if(value===null)return null;if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>max||(integer&&!Number.isSafeInteger(value)))fail('Invalid '+label+'.');return value;};
export function validateTechnicalDraft(draft,state){
 if(!draft||typeof draft!=='object'||Array.isArray(draft)||Object.keys(draft).some(k=>!['syntax','lines','fabrication','copyFrom','newModelId'].includes(k)))fail('Only BOM quantities, fabrication details and syntax may be changed.');
 const out={};
 if(draft.newModelId!==undefined){const id=text(draft.newModelId,'model number',80).toUpperCase();if(!/^[A-Z0-9][A-Z0-9._-]{1,79}$/.test(id)||state.models.some(m=>m.id===id))fail('Enter a unique model number.');out.newModelId=id;}
 if(draft.syntax!==undefined){if(!draft.syntax||typeof draft.syntax!=='object'||Array.isArray(draft.syntax)||Object.keys(draft.syntax).some(k=>!SYNTAX_FIELDS.includes(k)))fail('Invalid syntax field.');out.syntax={};for(const [k,v] of Object.entries(draft.syntax)){if(k==='blades')out.syntax[k]=numeric(v,'blade count',true,10000);else if(k==='salesConfirmed'){if(typeof v!=='boolean')fail('Sales status must be yes or no.');out.syntax[k]=v;}else out.syntax[k]=text(v,k,k==='configuration'?300:100);}
  for(const [k,allowed] of Object.entries({frame:['','L','V'],speed:['','MS','SS'],bladeOrientation:['','IB','OB'],gearboxOrientation:['','CEN','OFF']}))if(out.syntax[k]!==undefined&&!allowed.includes(out.syntax[k]))fail('Invalid '+k+'.');
  if(out.newModelId&&(!out.syntax.series||!out.syntax.size))fail('Series and size are required for a new model.');
 }
 if(draft.lines!==undefined){if(!Array.isArray(draft.lines)||draft.lines.length>5000)fail('Invalid component list.');const seen=new Set();out.lines=draft.lines.map(l=>{if(!l||Object.keys(l).some(k=>!['partId','ppm'].includes(k)))fail('Only component identity and PPM are allowed.');const p=state.parts.find(p=>p.id===l.partId);if(!p||seen.has(p.id))fail('Unknown or repeated component.');seen.add(p.id);const ppm=numeric(l.ppm,'PPM',!['kg','ltr'].includes(p.uom));if(ppm!=null&&['kg','ltr'].includes(p.uom)&&Math.abs(Math.round(ppm*1000)-ppm*1000)>1e-7)fail('PPM supports three decimal places.');return {partId:p.id,ppm};});}
 if(draft.fabrication!==undefined){if(!Array.isArray(draft.fabrication)||draft.fabrication.length>5000)fail('Invalid fabrication list.');const seen=new Set();out.fabrication=draft.fabrication.map(l=>{if(!l||Object.keys(l).some(k=>!fabricationFields.includes(k)))fail('Only fabrication identities, quantities and weights are allowed.');const partId=text(l.partId,'fabrication identity',120);if(!partId||seen.has(partId))fail('Missing or repeated fabrication identity.');seen.add(partId);return {partId,code:text(l.code||'','item code',100),drawingCode:text(l.drawingCode||'','drawing code',100),name:text(l.name,'fabrication name',500),ppm:numeric(l.ppm,'fabricated PPM',true),weight:numeric(l.weight,'combined weight per machine',false,1e5)};});}
 if(draft.copyFrom!==undefined){const source=state.models.find(m=>m.id===draft.copyFrom);if(!source?.bomAvailable)fail('Choose a source model with a BOM.');out.copyFrom=source.id;}
 if(out.newModelId&&!out.syntax)fail('Model syntax is required for a new model.');
 if(out.fabrication?.some(l=>!l.name))fail('A name is required for every fabricated component.');
 if(!Object.keys(out).length)fail('No technical changes supplied.');return out;
}
// Defence in depth on the full shared workspace, after building the technical-only command.
export function assertTechnicalOnly(previous,next){
 for(const key of new Set([...Object.keys(previous),...Object.keys(next)]))if(!['models','revision','audit'].includes(key)&&!equal(previous[key],next[key]))fail('Production review cannot change purchasing records or settings.');
 for(const old of previous.models){const m=next.models.find(m=>m.id===old.id);if(!m)fail('Existing models must be retained.');for(const key of new Set([...Object.keys(old),...Object.keys(m)]))if(![...SYNTAX_FIELDS,'name','lines','fabrication','revision','history','bomAvailable','copiedFrom'].includes(key)&&!equal(old[key],m[key]))fail('Production review cannot change model financial or source fields.');}
 for(const m of next.models.filter(m=>!previous.models.some(old=>old.id===m.id)))if(Object.values(m.costs||{}).some(v=>v!==null)||m.fabricationSupplier)fail('New technical models cannot set costs or suppliers.');
}
