import {DOMESTIC_DEFAULT_BILL_TO,DOMESTIC_SCOPE,domesticCanEdit,domesticIsAssembly,domesticBomTotals} from './domestic.mjs';
import {ensureRecordReferences,softwareReference} from './references.mjs';

export function applyDomesticOrderCommand(state,type,p,ctx,h){
 const {ensure,toMinor,event}=h,{user,now,id}=ctx;
 ensure(domesticCanEdit(user),'LAE Domestic purchase access is required.','FORBIDDEN');
 state.domesticOrders??=[];
 const text=(value,label,max=1500)=>{ensure(typeof value==='string'&&value.trim()&&value.length<=max&&!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value),label+' is required.');return value.trim();};
 const reason=()=>text(p.reason,'Reason for change');
 const order=p.orderId?state.domesticOrders.find(o=>o.id===p.orderId&&o.scope===DOMESTIC_SCOPE):null;
 if(p.orderId){ensure(order,'Domestic purchase order not found.','NOT_FOUND');ensure(p.revision===order.revision,'This purchase order changed. Reload and review it before saving.','CONFLICT');}
 const visibleVendor=vendorId=>state.vendors.find(v=>v.id===vendorId&&v.kind==='SUPPLIER'&&v.status==='ACTIVE'&&v.scopes?.includes(DOMESTIC_SCOPE));
 const record=(o,action,before)=>event('domestic',o.id,action,o.history.at(-1)?.reason||'Domestic purchase order created.',before,structuredClone(o));
 if(type==='DOMESTIC_PO_SAVE'){
  ensure(!p.orderId||order.status==='DRAFT','Issued or cancelled purchase orders cannot be edited.');
  const bom=(state.domesticBoms||[]).find(b=>b.id===(order?.bom.id||p.bomId)&&b.scope===DOMESTIC_SCOPE&&domesticIsAssembly(b));
  ensure(bom&&bom.compositionConfirmed===true&&bom.lines.length,'Save and confirm the complete assembly BOM first.');
  ensure(p.bomRevision===bom.revision&&(!order||order.bom.revision===bom.revision),'The assembly BOM changed. Create a new draft from the current revision.','CONFLICT');
  const vendor=visibleVendor(p.vendorId);ensure(vendor,'Select an active LAE Domestic supplier.');
  const count=Number(p.assemblyQuantity);ensure(/^\d+$/.test(String(p.assemblyQuantity))&&Number.isSafeInteger(count)&&count>=1&&count<=10000,'Enter 1 to 10,000 whole assemblies.');
  ensure(Array.isArray(p.lines)&&p.lines.length>0&&p.lines.length<=300,'Select between 1 and 300 assembly parts.');
  ensure(new Set(p.lines.map(l=>l.itemId)).size===p.lines.length,'A part cannot be selected twice.');
  const lines=p.lines.map(raw=>{
   const part=bom.lines.find(l=>l.itemId===raw.itemId&&!l.assemblyId),item=(state.domesticItems||[]).find(i=>i.id===raw.itemId&&i.scope===DOMESTIC_SCOPE&&i.active);
   ensure(part&&item,'Select active parts from this saved assembly.');
   ensure(part.uom===item.uom,'Item UOM changed. Review and revise the BOM before ordering.');
   const quantityMilli=part.quantityMilli*count;
   ensure(Number.isSafeInteger(part.quantityMilli)&&part.quantityMilli>0&&Number.isSafeInteger(quantityMilli)&&quantityMilli<=1000000000&&(!['PCS','SET'].includes(part.uom)||quantityMilli%1000===0),'Complete valid BOM quantities before ordering.');
   ensure(raw.rate!==null&&raw.rate!==undefined&&String(raw.rate).trim()!==''&&/^\d+(?:\.\d{1,2})?$/.test(String(raw.rate)),'Enter a non-negative INR rate with at most two decimals for '+part.code+'.');
   const rateMinor=toMinor(raw.rate);ensure(Number.isSafeInteger(rateMinor)&&rateMinor>=0,'Invalid item rate.');
   let quotation=null;
   if(raw.quoteId){const q=(state.domesticPriceLists||[]).find(q=>q.id===raw.quoteId&&q.vendorId===vendor.id&&q.currency==='INR'),l=q?.lines.find(l=>l.itemId===item.id);ensure(l&&l.uom===part.uom&&l.rateMinor===rateMinor,'The selected supplier quote does not match this part or rate.');quotation={id:q.id,reference:q.quoteReference,date:q.quoteDate};}
   return {itemId:part.itemId,code:part.code,description:part.description,uom:part.uom,imageAsset:part.imageAsset||null,imageFileId:part.imageFileId||null,perAssemblyMilli:part.quantityMilli,quantityMilli,rateMinor,quotation};
  });
  const totalMinor=domesticBomTotals(lines).totalMinor;
  const deliveryDate=text(p.deliveryDate,'Required delivery date',10);ensure(/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate)&&Number.isFinite(Date.parse(deliveryDate))&&new Date(deliveryDate).toISOString().slice(0,10)===deliveryDate,'Enter a valid delivery date.');
  const billingAddress=text(p.billingAddress===undefined?(order?.billingAddress??DOMESTIC_DEFAULT_BILL_TO):p.billingAddress,'Bill to details'),shipToSameAsBillTo=p.shipToSameAsBillTo===true;
  const deliveryAddress=shipToSameAsBillTo?billingAddress:text(p.deliveryAddress,'Ship to details');
  const purchaseContactPhone=p.purchaseContactPhone===undefined?(order?.purchaseContactPhone||''):p.purchaseContactPhone;
  ensure(typeof purchaseContactPhone==='string'&&purchaseContactPhone.length<=80&&(!purchaseContactPhone.trim()||(/^[+0-9() .-]+$/.test(purchaseContactPhone.trim())&&purchaseContactPhone.replace(/\D/g,'').length>=7&&purchaseContactPhone.replace(/\D/g,'').length<=15)),'Enter a valid purchase contact phone number or leave it blank.');
  const reasonText=reason(),before=order?structuredClone(order):null;
  const data={vendorId:vendor.id,vendor:{id:vendor.id,code:vendor.code,name:vendor.name,address:vendor.address||'',contact:vendor.contact||'',phone:vendor.phone||'',pinCode:vendor.pinCode||'',gstin:vendor.gstin||'',pan:vendor.pan||''},bom:{id:bom.id,code:bom.code,name:bom.name,reference:softwareReference(state,'domesticBoms',bom.id),revision:bom.revision,partCount:bom.lines.length},assemblyQuantity:count,lines,totalMinor,currency:'INR',deliveryDate,billingAddress,shipToSameAsBillTo,deliveryAddress,purchaseContactPhone:purchaseContactPhone.trim(),paymentTerms:text(p.paymentTerms,'Payment terms'),taxTerms:text(p.taxTerms,'GST / tax terms'),freightTerms:text(p.freightTerms,'Freight terms'),notes:typeof p.notes==='string'?p.notes.slice(0,3000):'',updatedAt:now,updatedBy:user.name};
  const o=order||{id:id(),scope:DOMESTIC_SCOPE,status:'DRAFT',number:'',numberSource:'SOFTWARE_REFERENCE',revision:0,createdAt:now,createdBy:user.name,history:[]};
  o.history.push({at:now,actor:user.name,reason:reasonText,action:order?'DRAFT_UPDATED':'DRAFT_CREATED',previous:before?{...before,history:undefined,issuedSnapshot:undefined}:null});Object.assign(o,data);o.revision++;
  if(!order){state.domesticOrders.push(o);ensureRecordReferences(state);o.number=softwareReference(state,'domesticOrders',o.id);}
  record(o,order?'DOMESTIC_PO_UPDATED':'DOMESTIC_PO_CREATED',before);return {id:o.id};
 }
 ensure(order,'Select a saved Domestic purchase order.');
 ensure(['ADMIN','MANAGER'].includes(user.role),'Purchase Manager or Admin access is required to issue or cancel a Domestic PO.','FORBIDDEN');
 const before=structuredClone(order),reasonText=reason();
 if(type==='DOMESTIC_PO_ISSUE'){
  ensure(order.status==='DRAFT','Only a draft can be issued.');ensure(p.confirm===true,'Confirm the vendor, quantities, prices and commercial terms.');
  ensure(visibleVendor(order.vendorId),'The supplier is no longer active for LAE Domestic.');
  const bom=(state.domesticBoms||[]).find(b=>b.id===order.bom.id);ensure(bom?.revision===order.bom.revision&&bom.compositionConfirmed===true,'The BOM changed. Cancel this draft and create a new one from the current revision.','CONFLICT');
  for(const l of order.lines)ensure((state.domesticItems||[]).some(i=>i.id===l.itemId&&i.active&&i.uom===l.uom),'An ordered item changed or became inactive. Review the draft.');
  ensure(typeof order.billingAddress==='string'&&order.billingAddress.trim()&&typeof order.deliveryAddress==='string'&&order.deliveryAddress.trim(),'Edit this draft and complete Bill to and Ship to details before issuing.');
  ensure(order.deliveryDate>=now.slice(0,10),'Update the required delivery date before issuing.');
  ensure(order.totalMinor===domesticBomTotals(order.lines).totalMinor,'Purchase order total is invalid.');
  order.status='ISSUED';order.issuedAt=now;order.issuedBy=user.name;order.revision++;
  order.issuedSnapshot=structuredClone({...order,history:undefined,issuedSnapshot:undefined});
 }else if(type==='DOMESTIC_PO_CANCEL'){
  ensure(['DRAFT','ISSUED'].includes(order.status),'This PO is already cancelled.');order.status='CANCELLED';order.cancelledAt=now;order.cancelledBy=user.name;order.revision++;
 }else throw new Error('Unsupported Domestic purchase order command.');
 order.history.push({at:now,actor:user.name,reason:reasonText,action:type==='DOMESTIC_PO_ISSUE'?'ISSUED':'CANCELLED',previous:{status:before.status,revision:before.revision}});
 order.updatedAt=now;order.updatedBy=user.name;record(order,type,before);return {id:order.id};
}
