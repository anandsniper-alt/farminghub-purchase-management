// Isolated local trial. Units: quantities are integer pcs; weights are kg per machine.
import {validateItemImages} from './item-images.mjs';
// These pure rules can later be called from the production shared-domain dispatcher.
export const normalizeCode=v=>String(v??'').trim().toUpperCase().replace(/^IMP[\s-]*0*(\d+)$/,'IMP-$1');
export const clone=v=>structuredClone(v);
export const round=(v,d=3)=>Math.round((v+Number.EPSILON)*10**d)/10**d;
export function number(v,label,{integer=false,nullable=false,max=1e8}={}){
 if(v===''||v===null||v===undefined){if(nullable)return null;throw Error(`${label} is required.`);}
 if(!['number','string'].includes(typeof v)||(typeof v==='string'&&!v.trim()))throw Error(`${label} must be numeric.`);
 const n=Number(v);if(!Number.isFinite(n)||n<0||n>max||(integer&&!Number.isSafeInteger(n)))throw Error(`${label} must be a non-negative ${integer?'whole number':'number'} up to ${max.toLocaleString()}.`);return n;
}
export function validDate(value,label='Date'){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value))||!Number.isFinite(Date.parse(value+'T00:00:00Z'))||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value)throw Error(label+' must be a valid calendar date.');return value;}
export const blankState=seed=>({schema:1,seedVersion:seed.version,revision:0,models:clone(seed.models),parts:clone(seed.parts),suppliers:clone(seed.suppliers),plan:{},stock:{},stockAsOf:'',adjustments:{},orders:[],settings:{fabricationRate:null,fabricationTransportRate:0,bufferPercent:10,buyer:'Farming Hub Private Limited',address:'',gstin:'',phone:''},audit:[]});
export function fabricationPrice(settings){const baseRate=number(settings.fabricationRate,'Fabrication rate',{nullable:true}),transportRate=number(settings.fabricationTransportRate??0,'Fabrication transport rate');return {baseRate,transportRate,effectiveRate:baseRate==null?null:number(round(baseRate+transportRate,2),'Combined fabrication rate')};}
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
  let r=items.get(key);
  if(!r){r={key,partId:part.id,code:part.code||'',name:part.name,category:part.category||'',fabricated:!!part.fabricated,supplier:part.supplier||'',demand:0,rate:part.fabricated?fabPrice.effectiveRate:part.rate,rateUnit:part.fabricated?'kg':'pcs',fabricationBaseRate:part.fabricated?fabPrice.baseRate:null,fabricationTransportRate:part.fabricated?fabPrice.transportRate:null,weightPerPiece:weight,children:clone(children),models:[]};items.set(key,r);}
  r.demand+=ppm*machines;if(!Number.isSafeInteger(r.demand)||r.demand>1e8)throw Error('Combined item demand exceeds the supported limit of 100 million pcs.');r.models.push({model:model.id,ppm,machines,quantity:ppm*machines});
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
  const mrp=Math.max(0,r.demand-stock),adjust=state.adjustments[r.key]||{},percent=number(adjust.bufferPercent??state.settings.bufferPercent,'Buffer %',{max:1000});
  const buffer=Math.ceil(round(mrp*percent/100,8)),extras=number(adjust.extras??0,'Extras',{integer:true}),orderQty=mrp+buffer+extras;
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
 if(!state.monthlyPlans)return calculatePlan(state);
 validMonth(month);const plans={...state.monthlyPlans,[state.activeMonth]:state.plan},stock=clone(state.stock),used={},priorIssues=[];
 // Only existing stock carries forward. Unreceived purchases, buffers and extras are not receipts.
 for(const earlier of Object.keys(plans).filter(m=>m<month).sort()){
  const prior=calculatePlan({...state,plan:plans[earlier],stock:{},adjustments:{}});
  priorIssues.push(...prior.issues.map(i=>({...i,message:`Earlier month ${earlier}: ${i.message}; stock allocation may change when completed`})));
  for(const row of prior.rows){if(!stock[row.key])continue;const consume=Math.min(stock[row.key].qty,row.demand);stock[row.key].qty-=consume;used[row.key]=(used[row.key]||0)+consume;}
 }
 const report=calculatePlan({...state,plan:plans[month]||{},stock,adjustments:month===state.activeMonth?state.adjustments:state.monthlyAdjustments[month]||{}});
 return {...report,issues:[...report.issues,...priorIssues],month,stockAllocation:'Earliest planned month first; only existing stock carries forward',rows:report.rows.map(row=>({...row,originalStock:state.stock[row.key]?.qty??0,stockUsedEarlier:used[row.key]||0,closingStock:Math.max(0,row.stock-row.demand)}))};
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
   const unit=unitColumn<0?'pcs':String(row[unitColumn]??'').trim().toLowerCase();if(!['pcs','pc','piece','pieces','nos','no','each','ea'].includes(unit))throw Error('Price unit must be pcs; kg/set/box rates need conversion before import');
   const raw=row[rateColumn];if(typeof raw==='boolean')throw Error('Enter a numeric purchase price');let value=raw;
   if(typeof raw==='string'){value=raw.trim().replace(/^(?:₹|INR\s*|Rs\.?\s*)/i,'').trim();if(!/^(?:\d+|\d{1,3}(?:,\d{2,3})+)(?:\.\d+)?$/.test(value))throw Error('Enter a numeric price in INR per piece');value=value.replaceAll(',','');}
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
  try{const qty=number(row[qtyColumn],`Stock at row ${i+1}`,{integer:true});matched.push({key:index.get(code),code,qty,row:i+1});}catch(e){errors.push({row:i+1,code,message:e.message});}
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
 // Keep target identity/stock keys. Source weights are not evidence for another model.
 const own=new Map(target.fabrication.map(l=>[l.drawingCode||l.name,l]));
 next.fabrication=next.fabrication.map(l=>{const original=own.get(l.drawingCode||l.name);return {...l,weight:original?.weight??null,weightSource:original?.weightSource||'',source:`Copied from ${sourceId}; check model differences`};});
 next.bomAvailable=true;next.copiedFrom=sourceId;return next;
}
export function validateModel(model,state){
 if(!Array.isArray(model.lines)||!Array.isArray(model.fabrication)||model.lines.length>5000||model.fabrication.length>5000)throw Error('Invalid model component list.');
 for(const value of Object.values(model.costs||{}))number(value,'Additional cost',{nullable:true});
 const ids=new Set(state.parts.map(p=>p.id)),seen=new Set();
 for(const l of model.lines){if(!ids.has(l.partId)||seen.has(l.partId))throw Error('BOM contains an unknown or duplicate component.');seen.add(l.partId);l.ppm=number(l.ppm,'PPM',{integer:true,nullable:true,max:1e6});}
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
 const groups=new Map();for(const row of rows){if(!groups.has(row.supplier))groups.set(row.supplier,[]);groups.get(row.supplier).push(clone(row));}
 let n=Math.max(state.orders.length,...state.orders.map(po=>Number(String(po.id).match(/^FH-IMP-PO-(\d+)$/)?.[1]||0)));
 return [...groups].map(([supplier,lines])=>({id:`FH-IMP-PO-${String(++n).padStart(4,'0')}`,date,delivery,notes,planningMonth:state.activeMonth||'',stockAllocation:report.stockAllocation||'',quantityOnly,status:'Saved review PO',createdAt:new Date().toISOString(),supplier:clone(state.suppliers.find(s=>s.id===supplier)),buyer:clone(state.settings),lines,total:quantityOnly?null:round(lines.reduce((a,l)=>a+l.amount,0),2),plan:clone(state.plan),warnings:clone(report.issues),stockAsOf:state.stockAsOf,bufferRule:'10% default on net MRP, rounded up to whole pcs; per-item overrides shown',snapshot:true}));
}
export function validateOrder(po){
 if(!po?.id||!Array.isArray(po.lines)||!po.lines.length||po.lines.length>1000||!po.supplier?.name||!po.buyer||typeof po.quantityOnly!=='boolean')throw Error('Invalid saved purchase order.');
 validDate(po.date,'PO date');if(po.delivery){validDate(po.delivery,'Delivery date');if(po.delivery<po.date)throw Error('Delivery date cannot be before the PO date.');}
 for(const l of po.lines){for(const key of ['mrp','buffer','extras','orderQty'])number(l[key],'PO '+key,{integer:true});if(l.mrp+l.buffer+l.extras!==l.orderQty)throw Error('Purchase order quantities do not reconcile.');if(!po.quantityOnly){number(l.rate,'PO rate');number(l.amount,'PO amount');const basis=l.fabricated?number(l.weight,'PO weight'):l.orderQty;if(Math.abs(round(basis*l.rate,2)-l.amount)>.011)throw Error('Purchase order amount does not reconcile.');}}
 if(!po.quantityOnly){number(po.total,'PO total');if(Math.abs(round(po.lines.reduce((a,l)=>a+l.amount,0),2)-po.total)>.011)throw Error('Purchase order total does not reconcile.');}return po;
}
export function validateState(s){
 validateItemImages(s?.itemImages);
 if(s?.schema!==1||!Array.isArray(s.models)||!Array.isArray(s.parts)||!Array.isArray(s.orders)||!Array.isArray(s.suppliers)||!s.settings||!s.stock||!s.plan||!s.adjustments)throw Error('This is not a rotavator workspace backup.');
 if(s.models.length>1000||s.parts.length>5000||s.orders.length>1000)throw Error('Workspace exceeds local trial limits.');
 if(new Set(s.models.map(m=>m.id)).size!==s.models.length||new Set(s.parts.map(p=>p.id)).size!==s.parts.length)throw Error('Duplicate model or component identity.');
 if(s.suppliers.length>1000||new Set(s.suppliers.map(x=>x.id)).size!==s.suppliers.length||s.suppliers.some(x=>!x.id||!String(x.name||'').trim()))throw Error('Invalid or duplicate supplier identity.');
 number(s.revision,'Workspace revision',{integer:true});if(!Array.isArray(s.audit))throw Error('Workspace audit history is missing.');
 const stockKeys=new Set([...s.parts.filter(p=>!p.fabricated).map(p=>p.id),...s.models.map(m=>'fab:'+m.id)]),suppliers=new Set(s.suppliers.map(x=>x.id));
 for(const key of Object.keys(s.stock))if(!stockKeys.has(key))throw Error('Unknown stock item '+key);
 const adjustments=values=>{for(const [key,r] of Object.entries(values)){if(!stockKeys.has(key))throw Error('Unknown purchase adjustment item.');if(r.extras!=null)number(r.extras,'Extras',{integer:true});if(r.bufferPercent!=null)number(r.bufferPercent,'Buffer %',{max:1000});if(r.supplier&&!suppliers.has(r.supplier))throw Error('Unknown adjustment supplier.');}};
 adjustments(s.adjustments);for(const values of Object.values(s.monthlyAdjustments||{}))adjustments(values);
 if(new Set(s.orders.map(o=>o.id)).size!==s.orders.length)throw Error('Duplicate purchase order identity.');for(const po of s.orders)validateOrder(po);
 number(s.settings.bufferPercent,'Buffer %',{max:1000});fabricationPrice(s.settings);
 for(const m of s.models)validateModel(m,s);
 for(const r of Object.values(s.stock))number(r.qty,'Stock',{integer:true});codeIndex(s);
 for(const p of s.parts){number(p.rate,'Purchase price',{nullable:true});number(p.gstPercent,'GST percentage',{nullable:true,max:100});number(p.transportPercent,'Transport percentage',{nullable:true,max:100});}
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
