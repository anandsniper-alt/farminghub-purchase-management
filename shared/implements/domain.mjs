// Quantities: whole pcs; kg/ltr support 3 decimals. Fabrication weights: kg per machine.
import {validateItemImages} from './item-images.mjs';
import {visualFor} from './part-icons.mjs';
// These pure rules can later be called from the production shared-domain dispatcher.
export const normalizeCode=v=>String(v??'').trim().toUpperCase().replace(/^IMP[\s-]*0*(\d+)$/,'IMP-$1');
export const clone=v=>structuredClone(v);
export const round=(v,d=3)=>Math.round((v+Number.EPSILON)*10**d)/10**d;
export const quantityUnit=part=>['kg','ltr'].includes(part?.uom)?part.uom:'pcs';
export function quantity(value,label,part,options={}){
 const unit=quantityUnit(part),n=number(value,label,{integer:unit==='pcs',...options});
 if(n==null)return n;if(unit!=='pcs'&&Math.abs(round(n,3)-n)>1e-8)throw Error(label+' supports up to 3 decimal places for '+unit+'.');return n;
}
export function number(v,label,{integer=false,nullable=false,max=1e8}={}){
 if(v===''||v===null||v===undefined){if(nullable)return null;throw Error(`${label} is required.`);}
 if(!['number','string'].includes(typeof v)||(typeof v==='string'&&!v.trim()))throw Error(`${label} must be numeric.`);
 const n=Number(v);if(!Number.isFinite(n)||n<0||n>max||(integer&&!Number.isSafeInteger(n)))throw Error(`${label} must be a non-negative ${integer?'whole number':'number'} up to ${max.toLocaleString()}.`);return n;
}
export function validDate(value,label='Date'){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value))||!Number.isFinite(Date.parse(value+'T00:00:00Z'))||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value)throw Error(label+' must be a valid calendar date.');return value;}
export const blankState=seed=>({schema:1,seedVersion:seed.version,revision:0,models:clone(seed.models),parts:clone(seed.parts),suppliers:clone(seed.suppliers),plan:{},stock:{},stockAsOf:'',adjustments:{},orders:[],settings:{fabricationRate:null,fabricationTransportRate:0,bufferPercent:10,buyer:'Farming Hub Private Limited',address:'',gstin:'',phone:''},audit:[]});
export function fabricationPrice(settings){const baseRate=number(settings.fabricationRate,'Fabrication rate',{nullable:true}),transportRate=number(settings.fabricationTransportRate??0,'Fabrication transport rate');return {baseRate,transportRate,effectiveRate:baseRate==null?null:number(round(baseRate+transportRate,2),'Combined fabrication rate')};}
// Transport percentages on older price imports are reference-only. Inclusion is explicit.
export function purchasePrice(part){
 const baseRate=number(part.rate,'Purchase price',{nullable:true}),transportPercent=part.transportInCost?number(part.transportPercent,'Transport percentage',{nullable:true,max:100}):0;
 if(!part.transportInCost)return {baseRate,transportPercent:0,transportAmount:baseRate==null?null:0,effectiveRate:baseRate};
 const transportAmount=baseRate==null||transportPercent==null?null:round(baseRate*transportPercent/100,2);
 const effectiveRate=transportAmount==null?null:number(round(baseRate+transportAmount,2),'Purchase price including transport');
 return {baseRate,transportPercent,transportAmount,effectiveRate};
}
// User-confirmed 2026-10-01: retain Input Shaft Shield and its PPM in every BOM,
// but ignore it for fabrication weight/cost. Use its stable identity, not editable names/codes.
export const fabricationCalculationExcluded=row=>row.partId==='source-row-33';
export function fabricationTotals(model){
 const all=model.fabrication||[],rows=all.filter(r=>!fabricationCalculationExcluded(r)),knownWeight=round(rows.reduce((a,r)=>a+(r.weight??0),0),6);
 const pending=rows.filter(r=>r.weight==null&&r.ppm!==0).length;
 return {knownWeight,totalWeight:rows.length&&!pending&&knownWeight>0?knownWeight:null,pending,excluded:all.length-rows.length,syntaxWeight:model.syntaxWeight};
}
function calculatePlan(state){
 const parts=new Map(state.parts.map(p=>[p.id,p])),items=new Map(),issues=[],fabPrice=fabricationPrice(state.settings);
 function add(key,part,model,ppm,machines,weight=null,children=[]){
  if(ppm==null){issues.push({model:model.id,item:part.name,message:'PPM pending'});return;}
  if(ppm===0)return;
  ppm=quantity(ppm,'PPM',part,{max:1e6});
  let r=items.get(key);
  if(!r){r={key,partId:part.id,code:part.code||'',name:part.name,category:part.category||'',fabricated:!!part.fabricated,supplier:part.supplier||'',demand:0,rate:part.fabricated?fabPrice.effectiveRate:part.rate,rateUnit:part.fabricated?'kg':quantityUnit(part),...(quantityUnit(part)!=='pcs'?{uom:quantityUnit(part)}:{}),fabricationBaseRate:part.fabricated?fabPrice.baseRate:null,fabricationTransportRate:part.fabricated?fabPrice.transportRate:null,weightPerPiece:weight,children:clone(children),models:[]};items.set(key,r);}
  if(!part.fabricated){const price=purchasePrice(part);r.rate=price.effectiveRate;if(part.transportInCost)Object.assign(r,{purchaseBaseRate:price.baseRate,purchaseTransportPercent:price.transportPercent,purchaseTransportAmount:price.transportAmount,transportInCost:true});}
  r.demand=round(r.demand+ppm*machines,3);if(r.demand>1e8)throw Error('Combined item demand exceeds the supported limit of 100 million units.');r.models.push({model:model.id,ppm,machines,quantity:round(ppm*machines,3)});
 }
 for(const [id,raw] of Object.entries(state.plan)){
  const machines=number(raw,'Planned machines',{integer:true,max:100000});if(!machines)continue;
  const model=state.models.find(m=>m.id===id);if(!model)throw Error('Unknown planned model.');
  if(!model.bomAvailable){issues.push({model:id,item:'Model BOM',message:'BOM pending; copy or enter a BOM first'});continue;}
  if(!model.lines.length)issues.push({model:id,item:'Model BOM',message:'Component list is empty; enter the purchased components first'});
  for(const l of model.lines){const p=parts.get(l.partId);if(!p)throw Error(`Missing component ${l.partId}.`);add(p.id,p,model,l.ppm,machines);}
  if(model.fabrication.length){const totals=fabricationTotals(model);add('fab:'+id,{id:'fab:'+id,code:model.fabricationCode,name:`${id} fabricated parts`,fabricated:true,category:'Fabrication subassembly',supplier:model.fabricationSupplier},model,1,machines,totals.totalWeight,model.fabrication);}
  else issues.push({model:id,item:'Fabricated parts',message:'Fabrication list / weight pending'});
 }
 const rows=[...items.values()].map(r=>{
  const stockEntry=state.stock[r.key],stock=stockEntry?.qty??0,stockKnown=stockEntry!=null;
  const mrp=round(Math.max(0,r.demand-stock),3),adjust=state.adjustments[r.key]||{},percent=number(adjust.bufferPercent??state.settings.bufferPercent,'Buffer %',{max:1000});
  const scale=quantityUnit(r)==='pcs'?1:1000,buffer=Math.ceil(round(mrp*percent/100*scale,8))/scale,extras=quantity(adjust.extras??0,'Extras',r),orderQty=round(mrp+buffer+extras,3);
  const weight=r.fabricated&&r.weightPerPiece!=null?round(orderQty*r.weightPerPiece,6):null;
  const amount=r.rate==null||(r.fabricated&&weight==null)?null:Math.round((r.fabricated?weight:orderQty)*r.rate*100)/100;
  return {...r,stock,stockKnown,mrp,bufferPercent:percent,buffer,extras,orderQty,weight,amount,supplier:adjust.supplier??r.supplier};
 }).sort((a,b)=>a.fabricated-b.fabricated||a.code.localeCompare(b.code,undefined,{numeric:true})||a.name.localeCompare(b.name));
 return {rows,issues,machines:Object.values(state.plan).reduce((a,n)=>a+Number(n||0),0)};
}
export const currentMonth=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Calcutta',year:'numeric',month:'2-digit'}).format(new Date());
export function validMonth(value){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(value))||value<'2000-01'||value>'2100-12')throw Error('Choose a month between January 2000 and December 2100.');return value;}
export function ensureMonthly(state,month=currentMonth()){
 if(!state.monthlyPlans){state.activeMonth=validMonth(month);state.monthlyPlans={[month]:clone(state.plan)};state.monthlyAdjustments={[month]:clone(state.adjustments)};}
 state.monthlyAdjustments??={};validMonth(state.activeMonth);return state;
}
export function syncMonthly(state){if(state.monthlyPlans){state.monthlyPlans[state.activeMonth]=clone(state.plan);state.monthlyAdjustments[state.activeMonth]=clone(state.adjustments);}}
export function activateMonth(state,month){validMonth(month);ensureMonthly(state);syncMonthly(state);if(!state.monthlyPlans[month]&&Object.keys(state.monthlyPlans).length>=120)throw Error('Monthly planning supports up to 120 saved months.');state.activeMonth=month;state.plan=clone(state.monthlyPlans[month]||{});state.adjustments=clone(state.monthlyAdjustments[month]||{});syncMonthly(state);}
export function calculateMRP(state,month=state.activeMonth){
 const remaining=(plan,month)=>Object.fromEntries(Object.entries(plan||{}).map(([id,qty])=>[id,Math.max(0,Number(qty)-Number(state.productionConsumed?.[month]?.[id]||0))]));
 if(!state.monthlyPlans)return calculatePlan({...state,plan:remaining(state.plan,month)});
 validMonth(month);const plans={...state.monthlyPlans,[state.activeMonth]:state.plan},stock=clone(state.stock),used={},priorIssues=[];
 // Only existing stock carries forward. Unreceived purchases, buffers and extras are not receipts.
 for(const earlier of Object.keys(plans).filter(m=>m<month).sort()){
  const prior=calculatePlan({...state,plan:remaining(plans[earlier],earlier),stock:{},adjustments:{}});
  priorIssues.push(...prior.issues.map(i=>({...i,message:`Earlier month ${earlier}: ${i.message}; stock allocation may change when completed`})));
  for(const row of prior.rows){if(!stock[row.key])continue;const consume=Math.min(stock[row.key].qty,row.demand);stock[row.key].qty=round(stock[row.key].qty-consume,3);used[row.key]=round((used[row.key]||0)+consume,3);}
 }
 const report=calculatePlan({...state,plan:remaining(plans[month],month),stock,adjustments:month===state.activeMonth?state.adjustments:state.monthlyAdjustments[month]||{}});
 return {...report,issues:[...report.issues,...priorIssues],month,stockAllocation:'Earliest planned month first; only existing stock carries forward',rows:report.rows.map(row=>({...row,originalStock:state.stock[row.key]?.qty??0,stockUsedEarlier:used[row.key]||0,closingStock:round(Math.max(0,row.stock-row.demand),3)}))};
}
export function pricePercent(value,label){if(value==null||value==='')return null;if(typeof value==='boolean')throw Error(label+' must be numeric.');const raw=typeof value==='string'?value.trim().replace(/%$/,''):value,percent=typeof raw==='number'&&raw<=1?raw*100:raw;return round(number(percent,label,{max:100}),6);}
export function previewPrices(state,rows,codeColumn,rateColumn,{headerRow=0,unitColumn=-1,supplier='',supplierColumn=-1,gstColumn=-1,transportColumn=-1}={}){
 const index=codeIndex(state),seen=new Map(),matched=[],errors=[];
 if(codeColumn===rateColumn||[codeColumn,rateColumn].includes(unitColumn))throw Error('Choose separate item code, price and unit columns.');
 const columns=[codeColumn,rateColumn,unitColumn,supplierColumn,gstColumn,transportColumn].filter(c=>c>=0);if(new Set(columns).size!==columns.length)throw Error('Choose a separate column for each price-list field.');
 if(supplier&&!state.suppliers.some(s=>s.id===supplier))throw Error('Choose a known supplier.');
 for(let i=headerRow+1;i<rows.length;i++){
  const row=rows[i];if(row.every(v=>v==null||v===''))continue;const code=normalizeCode(row[codeColumn]);
  if(!code){errors.push({row:i+1,code,message:'Item code missing'});continue;}
  if(seen.has(code)){const prev=matched.findIndex(r=>r.code===code);if(prev>=0){const removed=matched.splice(prev,1)[0];errors.push({row:removed.row,code,message:'Duplicate item code; choose one price per item'});}errors.push({row:i+1,code,message:'Duplicate item code; choose one price per item'});continue;}seen.set(code,i);
  if(!code||!index.has(code)){errors.push({row:i+1,code,message:code?'Unmatched item code':'Item code missing'});continue;}
  const key=index.get(code),part=state.parts.find(p=>p.id===key);
  if(!part||part.fabricated){errors.push({row:i+1,code,message:'Fabrication uses the common INR/kg rate in Purchase prices'});continue;}
  try{
   const unit=unitColumn<0?quantityUnit(part):String(row[unitColumn]??'').trim().toLowerCase(),aliases={pcs:['pcs','pc','piece','pieces','nos','no','each','ea'],kg:['kg','kgs','kilogram','kilograms'],ltr:['ltr','l','litre','litres','liter','liters']};if(!aliases[quantityUnit(part)].includes(unit))throw Error('Price unit must match this item: '+quantityUnit(part));
   const raw=row[rateColumn];if(typeof raw==='boolean')throw Error('Enter a numeric purchase price');let value=raw;
   if(typeof raw==='string'){value=raw.trim().replace(/^(?:₹|INR\s*|Rs\.?\s*)/i,'').trim();if(!/^(?:\d+|\d{1,3}(?:,\d{2,3})+)(?:\.\d+)?$/.test(value))throw Error('Enter a numeric price in INR per '+quantityUnit(part));value=value.replaceAll(',','');}
   let rowSupplier=supplier||part.supplier||'';
   if(!supplier&&supplierColumn>=0){const vendor=String(row[supplierColumn]??'').trim().toUpperCase(),found=state.suppliers.find(s=>s.id.toUpperCase()===vendor||s.name.toUpperCase()===vendor);if(!found)throw Error('Supplier name is missing or unmatched');rowSupplier=found.id;}
   const metadata={};if(gstColumn>=0)metadata.gstPercent=pricePercent(row[gstColumn],'GST percentage');if(transportColumn>=0)metadata.transportPercent=pricePercent(row[transportColumn],'Transport percentage');
   const rate=number(value,'Purchase price');matched.push({key,code,name:part.name,oldRate:part.rate??null,rate,supplier:rowSupplier,row:i+1,...metadata});
  }catch(e){errors.push({row:i+1,code,message:e.message});}
 }
 return {matched,errors:errors.map(e=>({...e,sourceValues:clone(rows[e.row-1])}))};
}
export function applyPrices(state,preview,asOf,source){
 if(!preview.matched.length)throw Error('No matched prices to import.');if(!/^\d{4}-\d{2}-\d{2}$/.test(asOf))throw Error('Choose a price list date.');
 validDate(asOf,'Price list date');
 const at=new Date().toISOString();
 for(const row of preview.matched){const p=state.parts.find(p=>p.id===row.key);if(!p||p.fabricated)throw Error('Price item is no longer available.');p.priceHistory??=[];p.priceHistory.push({rate:p.rate??null,supplier:p.supplier||'',gstPercent:p.gstPercent??null,transportPercent:p.transportPercent??null,replacedAt:at,source:p.priceSource||'Earlier working price'});p.rate=row.rate;p.supplier=row.supplier;p.priceAsOf=asOf;p.priceSource=source;if('gstPercent' in row)p.gstPercent=row.gstPercent;if('transportPercent' in row)p.transportPercent=row.transportPercent;}
 state.priceImports??=[];state.priceImports.push({at,asOf,source,matched:preview.matched.length,excluded:preview.errors.length,excludedRows:clone(preview.errors)});
}
export function codeIndex(state){
 const index=new Map();
 for(const p of state.parts){if(p.fabricated)continue;const code=normalizeCode(p.code);if(!code)continue;if(index.has(code))throw Error(`Duplicate item code ${code}. Correct the item master before importing stock.`);index.set(code,p.id);}
 for(const m of state.models){const code=normalizeCode(m.fabricationCode);if(!code)continue;if(index.has(code))throw Error(`Duplicate item code ${code}.`);index.set(code,'fab:'+m.id);}
 return index;
}
export function previewStock(state,rows,codeColumn,qtyColumn,headerRow=0){
 const index=codeIndex(state),seen=new Set(),matched=[],errors=[];
 for(let i=headerRow+1;i<rows.length;i++){
  const row=rows[i];if(row.every(c=>c===null||c===undefined||c===''))continue;
  const code=normalizeCode(row[codeColumn]);if(!code){errors.push({row:i+1,code:'',message:'Item code missing'});continue;}
  if(seen.has(code)){const prior=matched.findIndex(m=>m.code===code);if(prior>=0){const removed=matched.splice(prior,1)[0];errors.push({row:removed.row,code,message:'Duplicate code; combine stock rows before importing'});}errors.push({row:i+1,code,message:'Duplicate code; combine stock rows before importing'});continue;}seen.add(code);
  if(!index.has(code)){errors.push({row:i+1,code,message:'Unmatched code'});continue;}
  try{const key=index.get(code),p=state.parts.find(p=>p.id===key),qty=quantity(row[qtyColumn],`Stock at row ${i+1}`,p);matched.push({key,code,qty,row:i+1});}catch(e){errors.push({row:i+1,code,message:e.message});}
 }
 return {matched,errors};
}
export function applyStock(state,preview,asOf,filename){
 if(!preview.matched.length)throw Error('No matched stock rows to import.');
 validDate(asOf,'Stock date');
 // Merge only the explicitly previewed matches; absent codes retain their stock.
 for(const r of preview.matched)state.stock[r.key]={qty:r.qty,asOf,source:filename};
 state.stockAsOf=asOf;
}
export function copyBom(state,targetId,sourceId){
 if(targetId===sourceId)throw Error('Choose a different source model.');
 const target=state.models.find(m=>m.id===targetId),source=state.models.find(m=>m.id===sourceId);
 if(!source?.bomAvailable||!target)throw Error('Choose a model with an existing BOM.');
 const next=clone(target);next.lines=clone(source.lines);next.fabrication=clone(source.fabrication);
 // Retain the target's confirmed PTO variant when copying a different series' BOM.
 const ownPto=target.lines.filter(l=>state.parts.find(p=>p.id===l.partId)?.componentFamily==='PTO');
 if(ownPto.length){next.lines=next.lines.filter(l=>state.parts.find(p=>p.id===l.partId)?.componentFamily!=='PTO');next.lines.push(...clone(ownPto));}
 // Keep target identity/stock keys. Source weights are not evidence for another model.
 const own=new Map(target.fabrication.map(l=>[l.drawingCode||l.name,l]));
 next.fabrication=next.fabrication.map(l=>{const original=own.get(l.drawingCode||l.name);return {...l,weight:original?.weight??null,weightSource:original?.weightSource||'',source:`Copied from ${sourceId}; check model differences`};});
 next.bomAvailable=true;next.copiedFrom=sourceId;return next;
}
export function validateModel(model,state){
 if(!Array.isArray(model.lines)||!Array.isArray(model.fabrication)||model.lines.length>5000||model.fabrication.length>5000)throw Error('Invalid model component list.');
 for(const value of Object.values(model.costs||{}))number(value,'Additional cost',{nullable:true});
 const ids=new Set(state.parts.map(p=>p.id)),seen=new Set();
 for(const l of model.lines){if(!ids.has(l.partId)||seen.has(l.partId))throw Error('BOM contains an unknown or duplicate component.');seen.add(l.partId);l.ppm=quantity(l.ppm,'PPM',state.parts.find(p=>p.id===l.partId),{nullable:true,max:1e6});}
 for(const l of model.fabrication){l.ppm=number(l.ppm,'Fabricated PPM',{integer:true,nullable:true,max:1e6});l.weight=number(l.weight,'Weight per machine',{nullable:true,max:1e5});}
 if(model.fabricationCode){const candidate=clone(state);candidate.models=candidate.models.map(m=>m.id===model.id?model:m);codeIndex(candidate);}
 return model;
}
export function createOrders(state,selectedKeys,{date,delivery='',notes='',quantityOnly=true}={}){
 const report=calculateMRP(state),selected=new Set(selectedKeys),rows=report.rows.filter(r=>selected.has(r.key)&&r.orderQty>0);
 if(!rows.length)throw Error('Select at least one item with a purchase quantity.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('Enter a valid PO date.');
 validDate(date,'PO date');if(delivery){validDate(delivery,'Delivery date');if(delivery<date)throw Error('Delivery date cannot be before the PO date.');}
 for(const row of rows){if(!row.supplier||!state.suppliers.some(s=>s.id===row.supplier))throw Error(`Assign a supplier for ${row.code||row.name}.`);if(!quantityOnly&&row.amount==null)throw Error(`Price or weight pending for ${row.code||row.name}. Use a quantity-only PO or complete the value.`);}
 const groups=new Map();for(const row of rows){if(state.suppliers.find(s=>s.id===row.supplier)?.active===false)throw Error('Choose an active supplier for '+row.name);if(!groups.has(row.supplier))groups.set(row.supplier,[]);const saved=clone(row);saved.supplierPartCode=supplierPartCode(state,row.key,row.supplier);saved.image=itemImage(state,row.partId,row.name);saved.children=saved.children.map(c=>({...c,supplierPartCode:supplierPartCode(state,c.partId,row.supplier),image:itemImage(state,c.partId,c.name)}));groups.get(row.supplier).push(saved);}
 let n=Math.max(state.orders.length,...state.orders.map(po=>Number(String(po.id).match(/^FH-IMP-PO-(\d+)$/)?.[1]||0)));
 return [...groups].map(([supplier,lines])=>({id:`FH-IMP-PO-${String(++n).padStart(4,'0')}`,date,delivery,notes,planningMonth:state.activeMonth||'',stockAllocation:report.stockAllocation||'',quantityOnly,status:'Saved review PO',createdAt:new Date().toISOString(),supplier:clone(state.suppliers.find(s=>s.id===supplier)),buyer:clone(state.settings),lines,total:quantityOnly?null:round(lines.reduce((a,l)=>a+l.amount,0),2),plan:clone(state.plan),warnings:clone(report.issues),stockAsOf:state.stockAsOf,bufferRule:lines.some(l=>quantityUnit(l)!=='pcs')?'10% default on net MRP; whole pcs or 3 decimal places for kg/ltr; per-item overrides shown':'10% default on net MRP, rounded up to whole pcs; per-item overrides shown',snapshot:true}));
}
export function validateOrder(po){
 if(!po?.id||!Array.isArray(po.lines)||!po.lines.length||po.lines.length>1000||!po.supplier?.name||!po.buyer||typeof po.quantityOnly!=='boolean')throw Error('Invalid saved purchase order.');
 validDate(po.date,'PO date');if(po.delivery){validDate(po.delivery,'Delivery date');if(po.delivery<po.date)throw Error('Delivery date cannot be before the PO date.');}
 for(const l of po.lines){validateProductImage(l.image);if(l.supplierPartCode!==undefined)supplierText(l.supplierPartCode,'PO supplier part code',120);for(const c of l.children||[]){validateProductImage(c.image);if(c.supplierPartCode!==undefined)supplierText(c.supplierPartCode,'PO supplier part code',120);}for(const key of ['mrp','buffer','extras','orderQty'])quantity(l[key],'PO '+key,l);if(round(l.mrp+l.buffer+l.extras,3)!==l.orderQty)throw Error('Purchase order quantities do not reconcile.');if(!po.quantityOnly){number(l.rate,'PO rate');number(l.amount,'PO amount');const basis=l.fabricated?number(l.weight,'PO weight'):l.orderQty;if(Math.abs(round(basis*l.rate,2)-l.amount)>.011)throw Error('Purchase order amount does not reconcile.');}}
 if(!po.quantityOnly){number(po.total,'PO total');if(Math.abs(round(po.lines.reduce((a,l)=>a+l.amount,0),2)-po.total)>.011)throw Error('Purchase order total does not reconcile.');}return po;
}
export function validateState(s){
 validateItemImages(s?.itemImages);
 if(s?.schema!==1||!Array.isArray(s.models)||!Array.isArray(s.parts)||!Array.isArray(s.orders)||!Array.isArray(s.suppliers)||!s.settings||!s.stock||!s.plan||!s.adjustments)throw Error('This is not a rotavator workspace backup.');
 if(s.models.length>1000||s.parts.length>5000||s.orders.length>1000)throw Error('Workspace exceeds local trial limits.');
 if(new Set(s.models.map(m=>m.id)).size!==s.models.length||new Set(s.parts.map(p=>p.id)).size!==s.parts.length)throw Error('Duplicate model or component identity.');
 if(s.suppliers.length>1000||new Set(s.suppliers.map(x=>x.id)).size!==s.suppliers.length||s.suppliers.some(x=>!x.id||!String(x.name||'').trim()))throw Error('Invalid or duplicate supplier identity.');
 validateSuppliers(s);
 number(s.revision,'Workspace revision',{integer:true});if(!Array.isArray(s.audit))throw Error('Workspace audit history is missing.');
 const stockKeys=new Set([...s.parts.filter(p=>!p.fabricated).map(p=>p.id),...s.models.map(m=>'fab:'+m.id)]),suppliers=new Set(s.suppliers.map(x=>x.id));
 for(const key of Object.keys(s.stock))if(!stockKeys.has(key))throw Error('Unknown stock item '+key);
 const adjustments=values=>{for(const [key,r] of Object.entries(values)){if(!stockKeys.has(key))throw Error('Unknown purchase adjustment item.');if(r.extras!=null)quantity(r.extras,'Extras',s.parts.find(p=>p.id===key));if(r.bufferPercent!=null)number(r.bufferPercent,'Buffer %',{max:1000});if(r.supplier&&!suppliers.has(r.supplier))throw Error('Unknown adjustment supplier.');}};
 adjustments(s.adjustments);for(const values of Object.values(s.monthlyAdjustments||{}))adjustments(values);
 if(new Set(s.orders.map(o=>o.id)).size!==s.orders.length)throw Error('Duplicate purchase order identity.');for(const po of s.orders)validateOrder(po);
 number(s.settings.bufferPercent,'Buffer %',{max:1000});fabricationPrice(s.settings);
 for(const m of s.models)validateModel(m,s);
 for(const [key,r] of Object.entries(s.stock))quantity(r.qty,'Stock',s.parts.find(p=>p.id===key));codeIndex(s);
 for(const p of s.parts){number(p.rate,'Purchase price',{nullable:true});number(p.gstPercent,'GST percentage',{nullable:true,max:100});number(p.transportPercent,'Transport percentage',{nullable:true,max:100});if(p.transportInCost!=null&&typeof p.transportInCost!=='boolean')throw Error('Transport inclusion must be a boolean.');purchasePrice(p);}
 if(s.monthlyPlans){validMonth(s.activeMonth);if(!s.monthlyAdjustments||Object.keys(s.monthlyPlans).length>120)throw Error('Monthly planning supports up to 120 saved months.');for(const [month,plan] of Object.entries(s.monthlyPlans)){validMonth(month);calculatePlan({...s,plan,stock:{},adjustments:s.monthlyAdjustments[month]||{}});}}
 calculateMRP(s);return s;
}

// Item identity stays fixed when a purchasing name or Tally code changes.
export function masterItems(s){
 const items=new Map(s.parts.map(p=>[p.id,{...p,scope:'shared',models:[]} ]));
 for(const m of s.models){
  for(const l of m.lines){const p=items.get(l.partId);if(p&&!p.models.includes(m.id))p.models.push(m.id);}
  for(const l of m.fabrication){
   if(!items.has(l.partId))items.set(l.partId,{id:l.partId,code:l.code||'',name:l.name,category:'FABRICATED PARTS RT',fabricated:true,uom:'pcs',scope:'syntax',models:[],drawingCode:l.drawingCode||''});
   const p=items.get(l.partId);if(!p.models.includes(m.id))p.models.push(m.id);
  }
 }
 return [...items.values()];
}
export function updateMasterItem(s,id,values,reason){
 const current=masterItems(s).find(p=>p.id===id);if(!current)throw Error('Item not found.');
 const code=normalizeCode(values.code),name=String(values.name||'').trim();
 if(!name||name.length>500)throw Error('Enter an item name (up to 500 characters).');
 if(code&&!/^IMP-[1-9]\d{0,8}$/.test(code))throw Error('Use a Tally code such as IMP-123, or leave it blank while pending.');
 if(code&&(masterItems(s).some(p=>p.id!==id&&normalizeCode(p.code)===code)||s.models.some(m=>normalizeCode(m.fabricationCode)===code)))throw Error('This Tally code is already assigned to another item or subassembly.');
 if(!String(reason||'').trim())throw Error('Enter a reason for this change.');
 const images={...(s.itemImages||{}),[id]:{originalName:s.itemImages?.[id]?.originalName||current.name,image:values.image??null}};
 validateItemImages(images);
 const p=s.parts.find(p=>p.id===id);
 if(p){
  const rate=p.fabricated?p.rate:number(values.rate,'Rate',{nullable:true});
  Object.assign(p,{code,name,rate,supplier:values.supplier??p.supplier});
 }
 for(const m of s.models){
  if(!m.fabrication.some(l=>l.partId===id&&(l.name!==name||(l.code||'')!==code)))continue;
  m.history=m.history||[];m.history.push({revision:m.revision,savedAt:new Date().toISOString(),reason:'Item master: '+reason,lines:clone(m.lines),fabrication:clone(m.fabrication)});
  for(const l of m.fabrication)if(l.partId===id)Object.assign(l,{code,name});
  m.revision++;
 }
 s.itemHistory=s.itemHistory||[];
 s.itemHistory.push({at:new Date().toISOString(),id,reason:String(reason).trim(),before:{code:current.code,name:current.name},after:{code,name},photoChanged:(s.itemImages?.[id]?.image??null)!==(values.image??null)});
 s.itemHistory=s.itemHistory.slice(-1000);
 s.itemImages=images;
}

// Vendor references are independent of internal IMP identities and current prices.
const supplierText=(value,label,max=300)=>{if(typeof value!=='string'||value.length>max||(/address|terms|note|reason/.test(label)?/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/:/[\x00-\x1f\x7f]/).test(value))throw Error('Invalid '+label+'.');return value.trim();};
export function supplierPartCode(state,itemKey,supplierId){return (state.supplierItems||[]).find(r=>r.itemKey===itemKey&&r.supplierId===supplierId)?.partCode||'';}
export function supplierItems(state,id){const all=masterItems(state),keys=new Set(all.filter(p=>p.supplier===id).map(p=>p.id));for(const m of state.models)if(m.fabricationSupplier===id){keys.add('fab:'+m.id);for(const l of m.fabrication)if(l.partId)keys.add(l.partId);}for(const r of state.supplierItems||[])if(r.supplierId===id)keys.add(r.itemKey);return [...keys].map(key=>{const m=key.startsWith('fab:')?state.models.find(m=>'fab:'+m.id===key):null,p=m?{id:key,code:m.fabricationCode,name:m.id+' fabricated parts',fabricated:true,models:[m.id]}:all.find(p=>p.id===key);return {...p,itemKey:key,supplierPartCode:supplierPartCode(state,key,id)};}).filter(p=>p.id);}
export function itemImage(state,id,name){const entry=state.itemImages?.[id];return entry?.image||visualFor(entry?.originalName||name).image||'';}
export function validateProductImage(src){if(src===undefined||src==='')return;if(typeof src!=='string'||src.length>100000||!(/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(src)||/^\/implements\/assets\/parts\/(?:photos\/)?[A-Za-z0-9_-]+\.(?:png|jpg|jpeg|webp)$/.test(src)))throw Error('Invalid product image.');}
export function validateSuppliers(state){
 const keys=new Set([...masterItems(state).map(p=>p.id),...state.models.map(m=>'fab:'+m.id)]),suppliers=new Set(state.suppliers.map(s=>s.id)),seen=new Set();
 for(const s of state.suppliers){for(const [key,max] of Object.entries({name:300,code:80,contact:200,address:2000,gstin:30,phone:80,email:200,terms:1200,notes:1200}))if(s[key]!==undefined)supplierText(s[key],key,max);if(s.active!==undefined&&typeof s.active!=='boolean')throw Error('Invalid supplier status.');}
 if(state.supplierItems!==undefined&&!Array.isArray(state.supplierItems))throw Error('Invalid supplier item list.');if((state.supplierItems||[]).length>20000)throw Error('Limit: 20,000 supplier item mappings.');
 for(const r of state.supplierItems||[]){if(!r||Object.keys(r).some(k=>!['supplierId','itemKey','partCode','notes'].includes(k))||!suppliers.has(r.supplierId)||!keys.has(r.itemKey))throw Error('Unknown supplier or item in vendor mapping.');supplierText(r.partCode,'supplier part code',120);if(r.notes!==undefined)supplierText(r.notes,'supplier item note',500);const key=JSON.stringify([r.supplierId,r.itemKey]);if(seen.has(key))throw Error('Duplicate supplier item mapping.');seen.add(key);}
}
export function saveSupplier(state,id,values,reason){
 reason=supplierText(reason,'change reason',1200);if(!reason)throw Error('Enter a reason for this change.');const before=state.suppliers.find(s=>s.id===id);if(id&&!before)throw Error('Supplier not found.');
 const record={...(before||{id:'supplier-'+crypto.randomUUID()}),...Object.fromEntries(Object.entries(values).filter(([k])=>['name','code','contact','address','gstin','phone','email','terms','notes','active'].includes(k)))};
 record.name=supplierText(record.name,'supplier name',300);if(!record.name)throw Error('Supplier name is required.');if(state.suppliers.some(s=>s.id!==record.id&&s.name.trim().toLowerCase()===record.name.toLowerCase()))throw Error('A supplier with this name already exists.');
 if(record.code&&state.suppliers.some(s=>s.id!==record.id&&s.code?.toLowerCase()===record.code.toLowerCase()))throw Error('Supplier code is already used.');
 const next={...state,suppliers:before?state.suppliers.map(s=>s.id===id?record:s):[...state.suppliers,record]};validateSuppliers(next);state.suppliers=next.suppliers;state.supplierHistory??=[];state.supplierHistory.push({at:new Date().toISOString(),supplierId:record.id,reason,before:before?clone(before):null,after:clone(record)});return record;
}
export function saveSupplierItem(state,supplierId,itemKey,partCode,notes,reason){
 reason=supplierText(reason,'change reason',1200);if(!reason)throw Error('Enter a reason for this change.');const before=(state.supplierItems||[]).find(r=>r.supplierId===supplierId&&r.itemKey===itemKey),record={supplierId,itemKey,partCode:supplierText(partCode,'supplier part code',120),notes:supplierText(notes||'','supplier item note',500)};
 const rows=before?state.supplierItems.map(r=>r===before?record:r):[...(state.supplierItems||[]),record];validateSuppliers({...state,supplierItems:rows});state.supplierItems=rows;state.supplierHistory??=[];state.supplierHistory.push({at:new Date().toISOString(),supplierId,itemKey,reason,before:before?clone(before):null,after:clone(record)});
}
