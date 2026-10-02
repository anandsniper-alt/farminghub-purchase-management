import {number,round,fabricationTotals,fabricationPrice,purchasePrice} from './domain.mjs';

const amount=(quantity,rate)=>{
 const value=round(quantity*rate,2);
 if(!Number.isFinite(value)||value>Number.MAX_SAFE_INTEGER/100)throw Error('This cost exceeds the supported calculation range.');
 return value;
};
const add=rows=>round(rows.reduce((sum,r)=>sum+(r.amount??0),0),2);
const groupTotal=rows=>rows.some(r=>r.amount==null)?null:add(rows);
export function calculateModelCost(state,id){
 const m=state.models.find(m=>m.id===id);if(!m)throw Error('Unknown model.');
 for(const row of m.fabrication){number(row.weight,'Fabrication weight',{nullable:true,max:1000000});number(row.ppm,'Fabrication PPM',{nullable:true,integer:true,max:1000000});}
 const parts=new Map(state.parts.map(p=>[p.id,p]));
 const rows=m.lines.map(l=>{
  const p=parts.get(l.partId);if(!p)throw Error('Missing component '+l.partId);
  const ppm=number(l.ppm,'PPM',{nullable:true,integer:true,max:1000000}),price=purchasePrice(p),rate=price.effectiveRate;
  const pending=[];if(ppm==null)pending.push('PPM pending');if(ppm!==0&&rate==null)pending.push('Price pending');
  return {id:p.id,code:p.code||'',name:p.name,segment:p.category||'Other components',kind:'part',type:'Non-fabricated',supplier:p.supplier||'',ppm,unit:'pcs',rate,...(p.transportInCost?{purchaseBaseRate:price.baseRate,purchaseTransportPercent:price.transportPercent,transportInCost:true}:{}),weight:null,amount:ppm===0?0:pending.length?null:amount(ppm,rate),status:ppm===0?'Excluded · PPM 0':pending.join(' · ')||'Complete',pending};
 });
 const weight=fabricationTotals(m),fabPrice=fabricationPrice(state.settings),fabRate=fabPrice.effectiveRate,fabPending=[];
 if(!m.fabrication.length)fabPending.push('Fabrication BOM pending');
 if(weight.totalWeight==null)fabPending.push('Weight pending');
 if(fabRate==null)fabPending.push('Price pending');
 const fabrication={id:'fab:'+m.id,code:m.fabricationCode||'',name:m.id+' fabricated parts',segment:'Fabrication',kind:'fabrication',type:'Fabricated subassembly',supplier:m.fabricationSupplier||'',ppm:1,unit:'kg',rate:fabRate,fabricationBaseRate:fabPrice.baseRate,fabricationTransportRate:fabPrice.transportRate,weight:weight.totalWeight,knownWeight:weight.knownWeight,amount:fabPending.length?null:amount(weight.totalWeight,fabRate),pending:fabPending,status:fabPending.join(' · ')||'Complete'};
 const costNames=[...new Set(['Gearbox powder coating','Assembly','Rack stand','Buffer cost',...Object.keys(m.costs||{})])];
 const other=costNames.map(name=>{const rate=number(m.costs?.[name],'Additional cost',{nullable:true});return {id:'cost:'+name,code:'',name,segment:'Other costs',kind:'other',type:'Per-machine charge',supplier:'',ppm:1,unit:'machine',rate,weight:null,amount:rate==null?null:amount(1,rate),pending:rate==null?['Cost pending']:[],status:rate==null?'Cost pending':'Complete'};});
 const all=[...rows,fabrication,...other],segments=[...new Set(all.map(r=>r.segment))].map(name=>{const lines=all.filter(r=>r.segment===name);return {name,count:lines.length,known:add(lines),total:groupTotal(lines),pending:lines.filter(r=>r.amount==null).length};});
 const pending=all.filter(r=>r.amount==null).length+(!m.bomAvailable||!m.lines.length?1:0);
 return {id:m.id,series:m.series,size:m.size,blades:m.blades,salesConfirmed:m.salesConfirmed,bomAvailable:m.bomAvailable,revision:m.revision,rows:all,segments,partsTotal:m.bomAvailable?groupTotal(rows):null,partsKnown:add(rows),fabricationTotal:fabrication.amount,otherTotal:groupTotal(other),otherKnown:add(other),knownTotal:add(all),total:pending?null:add(all),pending,status:!m.bomAvailable?'BOM pending':pending?'Cost pending':'Complete'};
}

export const verificationValue=(row,key)=>row[key]==null?'Pending':String(row[key]);
export function filterVerificationRows(rows,view={}){
 const q=String(view.search||'').toLowerCase(),filters=view.filters||{};
 const result=rows.filter(r=>(!q||`${r.code} ${r.name} ${r.segment} ${r.supplierName||r.supplier}`.toLowerCase().includes(q))&&Object.entries(filters).every(([key,values])=>values.includes(verificationValue(r,key))));
 const sort=view.sort;
 if(sort?.key)result.sort((a,b)=>{const av=a[sort.key],bv=b[sort.key];if(av==null&&bv==null)return 0;if(av==null)return 1;if(bv==null)return -1;const n=typeof av==='number'&&typeof bv==='number'?av-bv:String(av).localeCompare(String(bv),undefined,{numeric:true});return sort.direction==='desc'?-n:n;});
 return result;
}
