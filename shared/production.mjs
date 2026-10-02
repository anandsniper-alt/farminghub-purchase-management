import {quantity,number,round,validDate,validMonth} from './implements/domain.mjs';
import {technicalModel,technicalParts} from './bom-management.mjs';
export const PRODUCTION_SCOPE='PRODUCTION_MANAGEMENT';
export const canWriteProduction=u=>u?.active!==false&&['ADMIN','MANAGER','EXECUTIVE','PRODUCTION_OPERATOR'].includes(u?.role);
export const canManageProduction=u=>u?.active!==false&&['ADMIN','MANAGER'].includes(u?.role);
export const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function productionItems(state){return [
 ...technicalParts(state).filter(p=>!p.fabricated).map(p=>({...p,key:p.id,unit:p.uom||'pcs',kind:'Component'})),
 ...state.models.filter(m=>m.fabrication?.length).map(m=>({key:'fab:'+m.id,id:'fab:'+m.id,code:m.fabricationCode||'',name:m.id+' fabricated subassembly',category:'Fabrication',unit:'pcs',kind:'Fabricated set',modelId:m.id}))
];}
export function materialRequirements(state,modelId,count){
 const qty=number(count,'Machines',{integer:true,max:1000});if(!qty)throw Error('Enter at least one machine.');
 const model=state.models.find(m=>m.id===modelId);if(!model?.bomAvailable||!model.lines?.length)throw Error('A detailed model BOM is required before production entry.');
 const items=new Map(productionItems(state).map(p=>[p.key,p])),seen=new Set(),rows=[];
 for(const l of model.lines){const p=items.get(l.partId);if(!p)throw Error('Missing item in the BOM: '+l.partId);if(seen.has(p.key))throw Error('Duplicate BOM item: '+p.name);seen.add(p.key);if(l.ppm===0)continue;
  const ppm=l.ppm==null?null:quantity(l.ppm,'PPM',p,{max:1e6});rows.push({key:p.key,code:p.code,name:p.name,unit:p.unit,ppm,required:ppm==null?null:round(ppm*qty,3),kind:p.kind});
 }
 const fab=items.get('fab:'+modelId);if(!fab)throw Error('Fabricated subassembly is required before production entry.');rows.push({key:fab.key,code:fab.code,name:fab.name,unit:'pcs',ppm:1,required:qty,kind:fab.kind});
 return {model:technicalModel(model),quantity:qty,materials:rows};
}
export function actualMaterials(requirements,overrides=[],{allowPending=false}={}){
 if(!Array.isArray(overrides)||overrides.length>5000)throw Error('Invalid material quantities.');const map=new Map();
 for(const row of overrides){if(!row||Object.keys(row).some(k=>!['key','qty'].includes(k))||typeof row.key!=='string'||map.has(row.key)||!requirements.some(r=>r.key===row.key))throw Error('Invalid or duplicate material item.');map.set(row.key,row.qty);}
 return requirements.map(row=>{const raw=map.has(row.key)?map.get(row.key):row.required;if(!allowPending&&(raw==null||raw===''))throw Error('Confirm the missing consumption quantity for '+row.name+'.');const qty=quantity(raw,'Consumption for '+row.name,{uom:row.unit},{nullable:allowPending});return {...row,qty,overridden:qty!==row.required};});
}
export function stockAfter(state,materials,direction,date,reference){const next=structuredClone(state.stock||{});
 for(const row of materials){if(!row.qty)continue;const before=next[row.key]?.qty;if(direction<0&&(before==null||before<row.qty))throw Error('Insufficient stock for '+row.name+': available '+(before??'not entered')+', required '+row.qty+' '+row.unit+'. Receive or reconcile stock first.');const qty=round((before||0)+row.qty*direction,3);if(qty<0||qty>1e8)throw Error('Stock balance exceeds supported limits.');next[row.key]={...(next[row.key]||{}),qty,asOf:date,source:'Production: '+reference};}
 return next;
}
export function serialNumbers(values,count){if(values===undefined||values===''||values===null||Array.isArray(values)&&!values.length)return [];
 const rows=Array.isArray(values)?values:String(values).split(/[\n,]+/);if(rows.length!==count)throw Error('Enter exactly '+count+' serial numbers, or leave blank for automatic numbering.');
 const result=rows.map(value=>String(value).trim().toUpperCase());if(result.some(s=>!s||s.length>80||!/^[A-Z0-9][A-Z0-9._/-]*$/.test(s))||new Set(result).size!==result.length)throw Error('Serial numbers must be unique, up to 80 characters, using letters, numbers, dot, slash, hyphen or underscore.');return result;
}
export function productionDate(date,today){validDate(date);if(date>today)throw Error('Production and stock dates cannot be in the future.');return date;}
export function assertInventoryOnly(before,after){for(const key of new Set([...Object.keys(before),...Object.keys(after)]))if(!['stock','stockAsOf','productionConsumed','revision','audit'].includes(key)&&!same(before[key],after[key]))throw Error('Production commands may change stock and production consumption only.');}
export function remainingPlan(plan={},consumed={}){return Object.fromEntries(Object.entries(plan).map(([id,qty])=>[id,Math.max(0,Number(qty)-Number(consumed[id]||0))]));}
export function validateConsumed(state){const records=state.productionConsumed;if(records===undefined)return; if(!records||Array.isArray(records)||typeof records!=='object'||Object.keys(records).length>120)throw Error('Invalid production consumption history.');for(const [month,models]of Object.entries(records)){validMonth(month);if(!models||typeof models!=='object'||Array.isArray(models))throw Error('Invalid production planning month.');for(const [id,qty]of Object.entries(models)){if(!state.models.some(m=>m.id===id))throw Error('Unknown produced model.');number(qty,'Produced machines',{integer:true,max:1e8});}}}
