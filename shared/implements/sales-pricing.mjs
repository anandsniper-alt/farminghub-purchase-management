import {clone,number,round,validMonth} from './domain.mjs';
import {calculateModelCost} from './costing.mjs';

export const salesBasis='INR per machine, before GST. BOM parts + fabrication including transport/kg + entered additional costs. Item GST and item transport percentages are reference only.';
export const netMargin=(price,cost)=>price==null||cost==null||price<=0?null:round((price-cost)/price*100,4);
export function forwardPrice(cost,factor=1.25,increment=100,mode='up',adjustment=null){
 factor=number(factor,'Cost multiplier',{max:10});if(factor<=0)throw Error('Cost multiplier must be greater than zero.');
 increment=number(increment,'Rounding increment',{max:100000});if(!['up','nearest','down'].includes(mode))throw Error('Choose a rounding method.');
 if(adjustment!==null){if(typeof adjustment==='boolean'||String(adjustment).trim()===''||!Number.isFinite(Number(adjustment))||Math.abs(Number(adjustment))>1e8)throw Error('Round off must be a number between -100 million and 100 million.');adjustment=round(Number(adjustment),2);}
 if(cost==null)return {calculated:null,roundOff:null,price:null,margin:null,profit:null};
 cost=number(cost,'Model cost');const calculated=round(cost*factor,2);
 const cents=Math.round(calculated*100),step=Math.round(increment*100),automatic=step?(mode==='up'?Math.ceil(cents/step):mode==='down'?Math.floor(cents/step):Math.round(cents/step))*step/100:calculated;
 const price=round(calculated+(adjustment??round(automatic-calculated,2)),2);number(price,'Selling price');if(price<=0)throw Error('Selling price must be greater than zero.');
 return {calculated,roundOff:round(price-calculated,2),price,margin:netMargin(price,cost),profit:round(price-cost,2)};
}
export const salesState=s=>s.sales||{lists:[],currentId:null,activationHistory:[]};
export const activeSalesList=s=>salesState(s).lists.find(l=>l.id===salesState(s).currentId)||null;
export function salesRows(s){const current=activeSalesList(s),prices=new Map((current?.rows||[]).map(r=>[r.modelId,r]));return s.models.map(m=>{const cost=calculateModelCost(s,m.id),old=prices.get(m.id);return {modelId:m.id,series:m.series,size:m.size,salesConfirmed:m.salesConfirmed,bomAvailable:m.bomAvailable,cost:cost.total,pending:cost.pending,currentPrice:old?.price??null,margin:netMargin(old?.price,cost.total),savedCost:old?.cost??null};});}
export function previewSalesImport(s,rows,modelColumn,priceColumn,headerRow=0){
 if(!Number.isInteger(modelColumn)||modelColumn<0||!Number.isInteger(priceColumn)||priceColumn<0||modelColumn===priceColumn)throw Error('Choose separate model and selling price columns.');
 const models=new Set(s.models.map(m=>m.id)),seen=new Set(),matched=[],errors=[];
 for(let i=headerRow+1;i<rows.length;i++){const row=rows[i];if(row.every(v=>v==null||v===''))continue;const id=String(row[modelColumn]??'').trim().toUpperCase();
  if(seen.has(id)){const previous=matched.findIndex(r=>r.modelId===id);if(previous>=0){const removed=matched.splice(previous,1)[0];errors.push({row:removed.row,modelId:id,message:'Duplicate model; choose one price'});}errors.push({row:i+1,modelId:id,message:'Duplicate model; choose one price'});continue;}seen.add(id);
  try{if(!models.has(id))throw Error('Model number missing or unmatched');const value=row[priceColumn];if(typeof value==='boolean')throw Error('Enter a numeric selling price');const text=String(value??'').trim().replace(/^(?:₹|INR\s*|Rs\.?\s*)/i,'').trim();if(!/^(?:\d+|\d{1,3}(?:,\d{2,3})+)(?:\.\d+)?$/.test(text))throw Error('Enter a selling price in INR before GST');const price=number(text.replaceAll(',',''),'Selling price');if(!price)throw Error('Selling price must be greater than zero');matched.push({modelId:id,price:round(price,2),row:i+1});}catch(e){errors.push({row:i+1,modelId:id,message:e.message});}
 }return {matched,errors};
}
export function createSalesList(s,input,{id,at=new Date().toISOString()}={}){
 const sales=salesState(s);if(sales.lists.length>=240)throw Error('Local trial supports 240 saved price lists. Download history before archiving in the online system.');
 validMonth(input.month);const name=String(input.name||'').trim();if(!name||name.length>150)throw Error('Enter a price list name, up to 150 characters.');
 if(!['current','proposal'].includes(input.kind))throw Error('Choose current or proposed prices.');
 if(!Array.isArray(input.rows)||!input.rows.length||input.rows.length>1000)throw Error('Include at least one model, up to 1,000.');
 if(!id||sales.lists.some(l=>l.id===id))throw Error('Price list identity already exists or is missing.');
 const seen=new Set(),old=activeSalesList(s),rows=input.rows.map(row=>{if(seen.has(row.modelId))throw Error('Duplicate model in price list.');seen.add(row.modelId);const m=s.models.find(m=>m.id===row.modelId);if(!m)throw Error('Unknown model '+row.modelId);const c=calculateModelCost(s,m.id),prior=old?.rows.find(r=>r.modelId===m.id);let p;
  if(input.kind==='proposal'){if(c.total==null)throw Error(m.id+': complete the BOM, weights and costs before saving a calculated price.');p=forwardPrice(c.total,row.factor??input.factor,input.increment,input.rounding,row.adjustment??null);}
  else{const price=round(number(row.price,'Selling price'),2);if(price<=0)throw Error(m.id+': selling price must be greater than zero.');p={price,calculated:null,roundOff:0,margin:netMargin(price,c.total),profit:c.total==null?null:round(price-c.total,2)};}
  return {modelId:m.id,series:m.series,size:m.size,salesConfirmed:m.salesConfirmed,modelRevision:m.revision,cost:c.total,partsCost:c.partsTotal,fabricationCost:c.fabricationTotal,otherCost:c.otherTotal,pending:c.pending,previousPrice:prior?.price??null,previousMargin:netMargin(prior?.price,c.total),factor:input.kind==='proposal'?Number(row.factor??input.factor):null,...p};
 });
 return {id,name,month:input.month,version:sales.lists.filter(l=>l.month===input.month).length+1,kind:input.kind,createdAt:at,sourceRevision:s.revision,sourceListId:old?.id||null,basis:salesBasis,factor:input.kind==='proposal'?Number(input.factor):null,increment:input.increment??100,rounding:input.rounding||'up',notes:String(input.notes||'').slice(0,2000),rows,excludedRows:clone(input.excludedRows||[])};
}
export function saveSalesList(s,input,options){const list=createSalesList(s,input,options);s.sales??={lists:[],currentId:null,activationHistory:[]};s.sales.lists.push(list);return list;}
export function activateSalesList(s,id,reason,at=new Date().toISOString()){
 const sales=salesState(s);if(!sales.lists.some(l=>l.id===id))throw Error('Saved price list not found.');if(sales.currentId===id)throw Error('This price list is already current.');if(!String(reason||'').trim())throw Error('Enter a reason for changing the current price list.');
 if(sales.activationHistory.length>=1000)throw Error('The current-list history has reached its supported limit of 1,000 changes. Contact your administrator to archive it.');
 sales.activationHistory.push({at,previousId:sales.currentId,id,reason:String(reason).trim().slice(0,1000)});sales.currentId=id;s.sales=sales;
}
export function validateSalesState(s){
 if(!s.sales)return s;const x=s.sales;if(!Array.isArray(x.lists)||x.lists.length>240||!Array.isArray(x.activationHistory)||x.activationHistory.length>1000)throw Error('Invalid sales price history.');const ids=new Set();
 for(const l of x.lists){validMonth(l.month);if(!l.id||ids.has(l.id)||!l.name||!Array.isArray(l.rows)||!l.rows.length||l.rows.length>1000||!['current','proposal'].includes(l.kind))throw Error('Invalid saved sales price list.');ids.add(l.id);const models=new Set();for(const r of l.rows){if(!s.models.some(m=>m.id===r.modelId)||models.has(r.modelId))throw Error('Unknown or duplicate sales model.');models.add(r.modelId);if(!number(r.price,'Selling price'))throw Error('Selling price must be greater than zero.');number(r.cost,'Saved cost',{nullable:true});if(l.kind==='proposal'&&r.cost==null)throw Error('Calculated price requires a complete saved cost.');if(r.margin!==netMargin(r.price,r.cost))throw Error('Saved margin does not reconcile.');
  if(r.cost!=null&&r.profit!==round(r.price-r.cost,2))throw Error('Saved profit does not reconcile.');
  if(l.kind==='proposal'){const expected=forwardPrice(r.cost,r.factor,l.increment,l.rounding,r.roundOff);if(r.calculated!==expected.calculated||r.price!==expected.price)throw Error('Saved forward price does not reconcile.');}
 }}
 if(x.currentId&&!ids.has(x.currentId))throw Error('Current price list is missing from history.');return s;
}
