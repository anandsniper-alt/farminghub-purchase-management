import {ensureRecordReferences,softwareReference} from './references.mjs';
import {previewDomesticPrices,latestDomesticPrices,domesticPriceDifference} from './domestic-prices.mjs';

export const DOMESTIC_SCOPE='LAE_DOMESTIC';
export const DOMESTIC_SEGMENTS=['ACCESSORIES','FRAME - FAB','MILKING UNIT','TUBES','MOTOR','ENGINE','OTHER'];
export const DOMESTIC_UOMS=['PCS','SET','Feet','Metre','Kg'];
export const DOMESTIC_ASSEMBLY_TYPES={CAN_SET:'Can set',FRAME:'Frame set',MOTOR:'Motor / pump set',ENGINE:'Engine set',OTHER:'Other assembly'};
export const domesticIsAssembly=b=>['CAN_SET','ASSEMBLY'].includes(b?.kind);
export const domesticCanEdit=u=>!!u&&u.active!==false&&['ADMIN','MANAGER','EXECUTIVE'].includes(u.role)&&(u.role==='ADMIN'||u.scopes?.includes(DOMESTIC_SCOPE));
export const domesticImageAsset=s=>typeof s==='string'&&/^(image(?:[1-9]|[12][0-9]|30)|TX-MM1|GJ-MM[234])\.png$/.test(s);
export function domesticBomTotals(lines){
 let knownMinor=0;const missing=[];
 for(const l of lines){
  const rate=l.assemblyId?(l.assemblyConfirmed?domesticBomTotals(l.components).totalMinor:null):l.rateMinor;
  if(l.quantityMilli==null||rate==null){missing.push(l.code);continue;}
  if(!Number.isSafeInteger(l.quantityMilli)||l.quantityMilli<=0||!Number.isSafeInteger(rate)||rate<0)throw new Error('Invalid BOM quantity or rate.');
  const amount=(BigInt(l.quantityMilli)*BigInt(rate)+500n)/1000n;
  if(amount>BigInt(Number.MAX_SAFE_INTEGER)||!Number.isSafeInteger(knownMinor+Number(amount)))throw new Error('BOM total is too large.');
  knownMinor+=Number(amount);
 }
 return {knownMinor,totalMinor:lines.length&&!missing.length?knownMinor:null,missing};
}
export function domesticAssemblyLine(bom){return {assemblyId:bom.id,assemblyRevision:bom.revision,assemblyConfirmed:bom.compositionConfirmed,assemblyType:bom.assemblyType||'CAN_SET',components:structuredClone(bom.lines),code:bom.code,description:bom.name,segment:DOMESTIC_ASSEMBLY_TYPES[bom.assemblyType||'CAN_SET'],uom:'SET',quantityMilli:1000,rateMinor:null};}
// Read-only supplier scenarios for one current saved assembly; never reprice a BOM.
export function compareDomesticAssemblySuppliers(state,bomId,vendorIds,baselineVendorId){
 const bom=(state.domesticBoms||[]).find(b=>b.id===bomId&&b.scope===DOMESTIC_SCOPE&&domesticIsAssembly(b));
 if(!bom)throw new Error('Select a saved assembly BOM.');
 const selected=[...new Set(vendorIds)],baselineId=selected.includes(baselineVendorId)?baselineVendorId:selected[0]||'',issues=[];
 if(!bom.lines.length)issues.push('Add assembly parts to this BOM.');
 if(bom.compositionConfirmed!==true)issues.push('Confirm the complete assembly composition in Edit BOM.');
 if(new Set(bom.lines.map(l=>l.itemId)).size!==bom.lines.length)issues.push('Correct duplicate assembly parts in Edit BOM.');
 const sources=new Map((state.domesticPriceLists||[]).map(q=>[q.id,q]));
 const rows=bom.lines.map(line=>{
  const quotes=new Map(latestDomesticPrices(state,line.itemId).map(q=>[q.vendorId,q]));
  return {line,cells:selected.map(vendorId=>{
   const quote=quotes.get(vendorId)||null;let issue='',amountMinor=null;
   if(line.assemblyId||!line.itemId)issue='Use purchased parts in this assembly BOM.';
   else if(!Number.isSafeInteger(line.quantityMilli)||line.quantityMilli<=0||line.quantityMilli>1000000000||(['PCS','SET'].includes(line.uom)&&line.quantityMilli%1000))issue='Enter a valid BOM quantity.';
   else if(!quote)issue='Not quoted';
   else if(quote.uom!==line.uom)issue='Different UOM';
   else if(sources.get(quote.quoteId)?.currency!=='INR')issue='Quote must be in INR';
   else if(!Number.isSafeInteger(quote.rateMinor)||quote.rateMinor<0)issue='Invalid quoted rate';
   else try{amountMinor=domesticBomTotals([{...line,rateMinor:quote.rateMinor}]).totalMinor;}catch(e){issue=e.message;}
   return {vendorId,quote,amountMinor,issue};
  })};
 });
 const cells=selected.map((vendorId,index)=>{
  const parts=rows.map(r=>r.cells[index]),pricedParts=parts.filter(p=>p.amountMinor!==null).length;
  let knownMinor=0,issue='';
  for(const part of parts)if(part.amountMinor!==null){if(!Number.isSafeInteger(knownMinor+part.amountMinor)){knownMinor=null;issue='BOM total is too large.';break;}knownMinor+=part.amountMinor;}
  const complete=!issues.length&&parts.length>0&&pricedParts===parts.length&&knownMinor!==null;
  return {vendorId,pricedParts,knownMinor,totalMinor:complete?knownMinor:null,complete,issue,lowest:false,deltaMinor:null,percentText:null};
 });
 const complete=cells.filter(c=>c.complete),lowest=complete.length>1?Math.min(...complete.map(c=>c.totalMinor)):null,baseline=cells.find(c=>c.vendorId===baselineId);
 for(const cell of cells){cell.lowest=cell.complete&&cell.totalMinor===lowest;if(cell.complete&&baseline?.complete)Object.assign(cell,domesticPriceDifference({uom:'SET',rateMinor:baseline.totalMinor},{uom:'SET',rateMinor:cell.totalMinor}));}
 return {bom,issues,baselineVendorId:baselineId,rows,cells};
}
export function applyDomesticCommand(state,type,p,ctx,h){
 const {ensure,toMinor,event}=h,{user,now,id}=ctx;
 ensure(domesticCanEdit(user),'LAE Domestic purchase access is required.','FORBIDDEN');
 const clean=(v,label,max=600)=>{ensure(typeof v==='string'&&v.trim()&&v.length<=max&&!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v),label+' is required.');return v.trim();};
 const reason=()=>clean(p.reason,'Reason for change',1000);
 const rate=v=>v==null||v===''?null:toMinor(v);
 const quantity=v=>{if(v==null||v==='')return null;const s=String(v);ensure(/^\d+(?:\.\d{1,3})?$/.test(s),'Quantity must be positive, with at most three decimals.');const [a,b='']=s.split('.'),n=Number(a)*1000+Number(b.padEnd(3,'0'));ensure(Number.isSafeInteger(n)&&n>0&&n<=1000000000,'Quantity must be between 0.001 and 1,000,000.');return n;};
 state.domesticItems??=[];state.domesticModels??=[];state.domesticBoms??=[];
 const find=(type,recordId)=>{const r=state[type].find(r=>r.id===recordId);ensure(r&&r.scope===DOMESTIC_SCOPE,'Domestic record not found.','NOT_FOUND');return r;};
 const stamp={updatedAt:now,updatedBy:user.name};
 const supplierAddress=()=>{
  ensure(p.address==null||typeof p.address==='string','Supplier address must be text.');
  const address=(p.address||'').replace(/\r\n?/g,'\n').trim();
  ensure(address.length<=1500&&!/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(address),'Supplier address must be at most 1,500 characters without control characters.');
  return address;
 };
 const supplierContact=(previous={})=>{
  const pin=p.pinCode===undefined?(previous.pinCode||''):p.pinCode,phone=p.phone===undefined?(previous.phone||''):p.phone;
  ensure(typeof pin==='string'&&(!pin.trim()||/^[1-9][0-9]{5}$/.test(pin.trim())),'Enter a six-digit supplier PIN code or leave it blank.');
  ensure(typeof phone==='string'&&phone.length<=80&&(!phone.trim()||(/^[+0-9() .-]+$/.test(phone.trim())&&phone.replace(/\D/g,'').length>=7&&phone.replace(/\D/g,'').length<=15)),'Enter a valid supplier mobile / phone number or leave it blank.');
  return {pinCode:pin.trim(),phone:phone.trim()};
 };
 if(type==='DOMESTIC_UPDATE_VENDOR_ADDRESS'){
  ensure(['ADMIN','MANAGER'].includes(user.role),'Purchase Manager access is required for vendor master changes.','FORBIDDEN');
  const v=state.vendors.find(v=>v.id===p.vendorId&&v.kind==='SUPPLIER'&&v.scopes?.includes(DOMESTIC_SCOPE));ensure(v,'Domestic supplier not found.','NOT_FOUND');
  const address=supplierAddress(),contactDetails=supplierContact(v),why=reason(),before=structuredClone(v);Object.assign(v,{address},contactDetails,stamp);
  event('vendor',v.id,'DOMESTIC_VENDOR_ADDRESS_UPDATED',why,before,structuredClone(v));return {id:v.id};
 }
 const taxDetails=()=>{
  const normalized=(value,label)=>{ensure(value==null||typeof value==='string',label+' must be text.');return (value||'').trim().toUpperCase();};
  const gstin=normalized(p.gstin,'GSTIN'),pan=normalized(p.pan,'PAN');
  ensure(!gstin||/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin),'Enter a valid 15-character GSTIN or leave it blank.');
  ensure(!pan||/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan),'Enter a valid 10-character PAN or leave it blank.');
  ensure(!gstin||!pan||gstin.slice(2,12)===pan,'PAN must match the PAN within the GSTIN.');
  return {gstin,pan};
 };
 if(type==='DOMESTIC_UPDATE_VENDOR_TAX'){
  ensure(['ADMIN','MANAGER'].includes(user.role),'Purchase Manager access is required for vendor master changes.','FORBIDDEN');
  const v=state.vendors.find(v=>v.id===p.vendorId&&v.kind==='SUPPLIER'&&v.scopes?.includes(DOMESTIC_SCOPE));ensure(v,'Domestic supplier not found.','NOT_FOUND');
  const details=taxDetails(),why=reason(),before=structuredClone(v);Object.assign(v,details,stamp);
  event('vendor',v.id,'DOMESTIC_VENDOR_TAX_UPDATED',why,before,structuredClone(v));return {id:v.id};
 }
 if(type==='DOMESTIC_SAVE_VENDOR'){
  ensure(['ADMIN','MANAGER'].includes(user.role),'Purchase Manager access is required for vendor master changes.','FORBIDDEN');
  const code=clean(p.code,'Supplier code',80).toUpperCase();ensure(!state.vendors.some(v=>v.code.toUpperCase()===code||v.fullReference?.toUpperCase()===code),'Supplier code already exists. Use the existing supplier.');
  const v={...taxDetails(),address:supplierAddress(),...supplierContact(),id:id(),code,fullReference:code,name:clean(p.name,'Supplier name',200),kind:'SUPPLIER',status:'ACTIVE',scopes:[DOMESTIC_SCOPE],country:clean(p.country,'Country',100),contact:typeof p.contact==='string'?p.contact.slice(0,200):'',email:'',currency:'INR',defaultBillingCurrency:'INR',defaultPriceListCurrency:'INR',paymentTermsText:typeof p.paymentTermsText==='string'?p.paymentTermsText.slice(0,1000):'',source:'Domestic vendor master',createdAt:now,...stamp};
  state.vendors.push(v);event('vendor',v.id,'DOMESTIC_VENDOR_CREATED','Domestic supplier created in the shared vendor master.',null,v);return {id:v.id};
 }
 if(type==='DOMESTIC_IMPORT_PRICES'){
  const v=state.vendors.find(v=>v.id===p.vendorId);ensure(v&&v.kind==='SUPPLIER'&&v.status==='ACTIVE'&&v.scopes?.some(s=>user.role==='ADMIN'||user.scopes?.includes(s)),'Select an active supplier within your assigned divisions.');
  ensure(typeof p.quoteDate==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(p.quoteDate)&&Number.isFinite(Date.parse(p.quoteDate))&&new Date(p.quoteDate).toISOString().slice(0,10)===p.quoteDate&&p.quoteDate<=now.slice(0,10),'Enter a valid quote date, not in the future.');
  const quoteReference=clean(p.quoteReference,'Supplier quote reference',180),changeReason=reason(),entryMethod=p.entryMethod??'UPLOAD';
  ensure(['UPLOAD','MANUAL'].includes(entryMethod),'Select a supported price-entry method.');
  ensure(/^[a-f0-9]{64}$/.test(p.sourceHash),'Invalid upload fingerprint.');
  ensure(Array.isArray(p.rows)&&p.rows.length>0&&p.rows.length<=500&&p.rows.every(r=>r&&typeof r==='object'&&!Array.isArray(r)&&Object.values(r).every(v=>['string','number'].includes(typeof v)&&String(v).length<=2000)),'Upload between 1 and 500 valid item rows.');
  const preview=previewDomesticPrices(state,p.rows);ensure(!preview.some(r=>r.errors.length),'Correct the rejected price rows before saving.');const lines=preview.filter(r=>r.result==='SAVE').map(({itemId,code,description,uom,rateMinor})=>({itemId,code,description,uom,rateMinor}));ensure(lines.length,'Enter at least one price; blank rates are skipped.');
  state.domesticPriceLists??=[];
  ensure(!state.domesticPriceLists.some(q=>q.vendorId===v.id&&q.quoteDate===p.quoteDate&&q.quoteReference.toUpperCase()===quoteReference.toUpperCase()&&q.sourceHash===p.sourceHash),'This supplier quotation has already been uploaded.');
  const file=state.files.find(f=>f.id===p.fileId);ensure(file&&file.scope===DOMESTIC_SCOPE&&/\.(xlsx|csv)$/i.test(file.name),'Attach the uploaded price-list file.');
  const q={id:id(),scope:DOMESTIC_SCOPE,vendorId:v.id,vendorCode:v.code,vendorName:v.name,quoteDate:p.quoteDate,quoteReference,currency:'INR',lines,fileId:file.id,sourceHash:p.sourceHash,entryMethod,reason:changeReason,createdAt:now,createdBy:user.name};state.domesticPriceLists.push(q);event('domestic',q.id,'DOMESTIC_PRICES_IMPORTED','Supplier prices saved; existing BOM costs remain unchanged.',null,q);return {id:q.id,count:lines.length};
 }
 const image=(asset,fileId)=>{if(fileId){const f=state.files.find(f=>f.id===fileId);ensure(f&&f.scope===DOMESTIC_SCOPE&&['image/png','image/jpeg','image/webp'].includes(f.mime),'Select an uploaded Domestic item picture.');return {imageAsset:null,imageFileId:f.id};}ensure(!asset||domesticImageAsset(asset),'Invalid item picture.');return {imageAsset:asset||null,imageFileId:null};};
 const itemLine=i=>({itemId:i.id,code:i.code,description:i.description,segment:i.segment,uom:i.uom,imageAsset:i.imageAsset,imageFileId:i.imageFileId,quantityMilli:null,rateMinor:i.rateMinor});
 function addItem(raw){const code=raw.code?clean(raw.code,'Item code',80).toUpperCase():'';ensure(!code||!state.domesticItems.some(i=>i.code.toUpperCase()===code),'Item code already exists.');ensure(DOMESTIC_SEGMENTS.includes(raw.segment)&&DOMESTIC_UOMS.includes(raw.uom),'Select a supported segment and UOM.');const item={id:id(),code,scope:DOMESTIC_SCOPE,segment:raw.segment,description:clean(raw.description,'Item description'),uom:raw.uom,rateMinor:rate(raw.rate),...image(raw.imageAsset,raw.imageFileId),active:true,createdAt:now,...stamp};ensure(item.rateMinor==null||item.rateMinor>=0,'Rate cannot be negative.');state.domesticItems.push(item);ensureRecordReferences(state);if(!item.code)item.code=softwareReference(state,'domesticItems',item.id);return item;}
 function addAssembly(code,name,assemblyType='CAN_SET'){ensure(Object.hasOwn(DOMESTIC_ASSEMBLY_TYPES,assemblyType),'Select an assembly type.');code=code?clean(code,'Assembly code',80).toUpperCase():'';ensure(!code||!state.domesticBoms.some(b=>b.code===code),'BOM code already exists.');const b={id:id(),code,name:clean(name,'Assembly name'),kind:assemblyType==='CAN_SET'?'CAN_SET':'ASSEMBLY',assemblyType,scope:DOMESTIC_SCOPE,revision:1,status:'DRAFT',lines:[],compositionConfirmed:false,history:[],notes:'Add the assembly parts and quantity per assembly.',createdAt:now,...stamp};state.domesticBoms.push(b);ensureRecordReferences(state);if(!b.code)b.code=softwareReference(state,'domesticBoms',b.id);return b;}
 if(type==='DOMESTIC_IMPORT_CATALOGUE'){
  ensure(['ADMIN','MANAGER'].includes(user.role),'Purchase Manager access is required for catalogue import.','FORBIDDEN');
  ensure(/^[a-f0-9]{64}$/.test(p.sourceHash)&&Array.isArray(p.items)&&p.items.length>0&&p.items.length<=500&&Array.isArray(p.models)&&p.models.length<=50,'Invalid catalogue source.');
  if(state.domesticImports?.some(x=>x.sourceHash===p.sourceHash))return {alreadyImported:true};
  const sourceName=clean(p.sourceName,'Source name',180),added=[];
  for(const raw of p.items){const item=addItem(raw);item.source={name:sourceName,hash:p.sourceHash,row:raw.sourceRow||null,cell:raw.sourceCell||null};added.push(item.id);}
  ensure(Array.isArray(p.canSets)&&p.canSets.length<=50,'Provide can-set definitions.');
  for(const raw of p.canSets)addAssembly(raw.code,raw.name);
  for(const raw of p.models){
   const code=clean(raw.code,'Model code',80).toUpperCase();ensure(!state.domesticModels.some(m=>m.code.toUpperCase()===code),'Model code already exists.');
   const model={id:id(),code,name:clean(raw.name,'Model name'),scope:DOMESTIC_SCOPE,...image(raw.imageAsset),createdAt:now,...stamp};state.domesticModels.push(model);
   const motor=state.domesticItems.find(i=>i.code===raw.motorCode),canSet=state.domesticBoms.find(b=>b.kind==='CAN_SET'&&b.code===raw.canSetCode);ensure(motor&&canSet,'Model motor or can-set is missing.');
   const frame=raw.frameName?addAssembly('',raw.frameName,'FRAME'):null;
   state.domesticBoms.push({id:id(),modelId:model.id,kind:'MODEL',scope:DOMESTIC_SCOPE,revision:1,status:'DRAFT',lines:[itemLine(motor),domesticAssemblyLine(canSet),...(frame?[domesticAssemblyLine(frame)]:[])],compositionConfirmed:false,history:[],notes:'Major BOM: motor/pump, can set, frame set and other required major components. Open each assembly to maintain its parts.',createdAt:now,...stamp});
  }
  ensureRecordReferences(state);state.domesticImports??=[];state.domesticImports.push({sourceName,sourceHash:p.sourceHash,itemIds:added,at:now,by:user.name});event('domestic','catalogue','DOMESTIC_CATALOGUE_IMPORTED','Workbook catalogue and model links created; costs and composition remain pending.',null,{sourceName,sourceHash:p.sourceHash,items:added.length,models:p.models.length});return {items:added.length,models:p.models.length};
 }
 if(type==='DOMESTIC_CREATE_CAN_SET'){const b=addAssembly(p.code,p.name);event('domestic',b.id,'DOMESTIC_CAN_SET_CREATED','Reusable can-set BOM created.',null,b);return {id:b.id};}
 if(type==='DOMESTIC_CREATE_ASSEMBLY'){const b=addAssembly(p.code,p.name,p.assemblyType);event('domestic',b.id,'DOMESTIC_ASSEMBLY_CREATED','Reusable assembly-parts BOM created.',null,b);return {id:b.id};}
 if(type==='DOMESTIC_SAVE_ITEM'){
  if(!p.itemId){const item=addItem(p);event('domestic',item.id,'DOMESTIC_ITEM_CREATED','Domestic purchasing item created.',null,item);return {id:item.id};}
  const item=find('domesticItems',p.itemId),old=structuredClone(item);reason();ensure(!p.code||p.code===item.code,'An assigned item code cannot change.');ensure(DOMESTIC_SEGMENTS.includes(p.segment)&&DOMESTIC_UOMS.includes(p.uom),'Select a supported segment and UOM.');ensure(p.uom===item.uom||!state.domesticBoms.some(b=>b.lines.some(l=>l.itemId===item.id)),'UOM cannot change while the item is used in a BOM. Create a separate item for a different purchasing unit.');Object.assign(item,{description:clean(p.description,'Item description'),segment:p.segment,uom:p.uom,rateMinor:rate(p.rate),...image(p.imageAsset,p.imageFileId),...stamp});ensure(item.rateMinor==null||item.rateMinor>=0,'Rate cannot be negative.');event('domestic',item.id,'DOMESTIC_ITEM_UPDATED','Domestic item updated; saved BOM versions retained.',old,{...item,reason:p.reason});return {id:item.id};
 }
 if(type==='DOMESTIC_SAVE_BOM'){
  const bom=find('domesticBoms',p.bomId),old=structuredClone(bom);ensure(p.revision===bom.revision,'The BOM changed. Reopen it before saving.','CONFLICT');reason();ensure(Array.isArray(p.lines)&&p.lines.length<=300,'Use at most 300 BOM lines.');const seen=new Set();
  const lines=p.lines.map(l=>{
   let row;if(l.assemblyId){ensure(bom.kind==='MODEL','Assembly BOMs contain purchased items only.');const assembly=find('domesticBoms',l.assemblyId);ensure(domesticIsAssembly(assembly)&&assembly.id!==bom.id,'Select an assembly BOM.');ensure(l.assemblyRevision===assembly.revision,'The linked assembly changed. Reopen the model BOM before saving.','CONFLICT');row=domesticAssemblyLine(assembly);ensure(l.rate==null||l.rate==='','Assembly cost comes from its parts BOM.');}
   else {const item=find('domesticItems',l.itemId);ensure(item.active,'Choose an active component.');row=itemLine(item);row.rateMinor=rate(l.rate);ensure(row.rateMinor==null||row.rateMinor>=0,'Rate cannot be negative.');if(l.quoteId){const quote=(state.domesticPriceLists||[]).find(q=>q.id===l.quoteId),priced=quote?.lines.find(x=>x.itemId===item.id),vendor=quote&&state.vendors.find(v=>v.id===quote.vendorId);ensure(priced&&priced.uom===item.uom&&priced.rateMinor===row.rateMinor,'Selected supplier price changed. Select it again or enter a manual rate.');ensure(vendor?.status==='ACTIVE'&&vendor.scopes?.some(s=>user.role==='ADMIN'||user.scopes?.includes(s)),'Selected quotation supplier is not available.');row.priceSource={quoteId:quote.id,vendorId:quote.vendorId,vendorCode:quote.vendorCode,vendorName:quote.vendorName,quoteReference:quote.quoteReference,quoteDate:quote.quoteDate};}}
   const key=row.assemblyId||row.itemId;ensure(!seen.has(key),'Select each component or can set only once.');seen.add(key);row.quantityMilli=quantity(l.quantity);ensure(!['PCS','SET'].includes(row.uom)||row.quantityMilli==null||row.quantityMilli%1000===0,'PCS and SET quantities must be whole numbers.');return row;
  });
  const totals=domesticBomTotals(lines);ensure(typeof p.compositionConfirmed==='boolean','Confirm whether the component selection is complete.');ensure(!p.compositionConfirmed||lines.length>0,'Add components before confirming the BOM.');
  bom.history.push({revision:old.revision,status:old.status,lines:old.lines,compositionConfirmed:old.compositionConfirmed,notes:old.notes,updatedAt:old.updatedAt,updatedBy:old.updatedBy,replacedAt:now,replacedBy:user.name,reason:p.reason});Object.assign(bom,{lines,compositionConfirmed:p.compositionConfirmed,notes:typeof p.notes==='string'?p.notes.slice(0,2000):'',status:p.compositionConfirmed&&totals.totalMinor!==null?'COSTED':'DRAFT',revision:bom.revision+1,...stamp});event('domestic',bom.id,'DOMESTIC_BOM_REVISED','BOM saved with prior version and reason retained.',{revision:old.revision,status:old.status},{revision:bom.revision,status:bom.status,reason:p.reason,lines});return {id:bom.id};
 }
 ensure(false,'Unsupported Domestic command.');
}
