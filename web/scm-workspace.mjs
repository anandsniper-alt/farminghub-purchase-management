import {canApprove, canCreate, canEdit, isBusinessOrder, scopeAllowed, REASONS, isoDay} from '../shared/domain.mjs';
import {SCM_RO_NUMBER_MAX_LENGTH,scmInvoiceDocumentReady,scmInvoiceCostReady} from '../shared/scm.mjs';
import {orderJourney} from '../shared/order-progress.mjs';

const STAGES = [
 ['SHIPPING_DOCS', 'Shipping documents'], ['SAILING', 'Vessel departure'],
 ['BL', 'Final bill of lading'], ['INDIA_ARRIVAL', 'India arrival'], ['COST_CAPTURE', 'Arrival costs captured']
];

export function createScmUI({context, esc, head, command, uploadMany, legacyShipments, arrivalCosts, orderDocs}) {
 const data = () => context().state;
 const visible = o=>o.scope==='LAE_IMPORT'&&!o.deletedAt&&isBusinessOrder(o)&&scopeAllowed(context().user,o.scope);
 const order = id => data().orders.find(o=>o.id===id&&visible(o));
 let renderedModel;
 const model = () => {
  if(renderedModel)return renderedModel;
  const raw=data().scm||{invoices:[],ros:[]}, ids=new Set(data().orders.filter(visible).map(o=>o.id));
  const invoices=raw.invoices.filter(i=>i.members.length&&i.members.every(m=>ids.has(m.orderId)));
  const accessible=new Set(invoices.map(i=>i.id));
  const ros=raw.ros.filter(r=>raw.invoices.some(i=>i.roId===r.id)&&raw.invoices.every(i=>i.roId!==r.id||accessible.has(i.id))&&r.containers.every(c=>c.lines.every(l=>accessible.has(l.invoiceId)&&ids.has(l.orderId))));
  return renderedModel={invoices,ros};
 };
 const supplier = id => data().vendors.find(v=>v.id===id)?.name || 'Supplier unavailable';
 const invoiceOrders = inv => inv.members.map(m=>order(m.orderId));
 const editable = orders => orders.length>0 && orders.every(o=>o && canEdit(context().user,o));
 const roInvoices = ro => model().invoices.filter(inv=>inv.roId===ro.id);
 const params = () => new URLSearchParams((globalThis.location?.hash||'').split('?')[1]||'');
 const origin = () => order(params().get('fromPo')||params().get('po'))?.id;
 const scmHref=(key,id,po=origin(),focus='')=>'#/scm?'+key+'='+encodeURIComponent(id)+(po&&key!=='po'?'&fromPo='+encodeURIComponent(po):'')+(focus?'&focus='+encodeURIComponent(focus):'');
 const link = (key,id,title) => '<a class="scm-link" href="'+esc(scmHref(key,id))+'">'+esc(title)+'</a>';
 const back = '<a class="scm-link" href="#/scm">All SCM records</a>';
 const detailBack = () => origin()?link('po',origin(),'Back to SCM for '+order(origin()).number):back;
 const attrs = (o={}) => Object.entries(o).filter(([,v])=>v!=null && v!==false).map(([k,v])=>v===true?k:k+'="'+esc(v)+'"').join(' ');
 const input = (name,label,type='text',extra={}) => '<label>'+esc(label)+'<input '+attrs({name,type,required:true,...extra})+'></label>';
 const select = (name,label,values,blank='Select',extra={},selected=null)=>'<label>'+esc(label)+'<select '+attrs({name,required:true,...extra})+'><option value="">'+esc(blank)+'</option>'+values.map(([v,n])=>'<option value="'+esc(v)+'"'+(v===selected?' selected':'')+'>'+esc(n)+'</option>').join('')+'</select></label>';
 const dated = (label='Date')=>input('date',label,'date',{value:isoDay(),max:isoDay()});
 const panel = (title,body) => '<section class="panel scm-panel"><div class="panel-head"><h2>'+esc(title)+'</h2></div><div class="panel-body">'+body+'</div></section>';
 const action = (name,label) => '<button type="button" class="button ghost" data-action="'+name+'">'+esc(label)+'</button>';
 const submit = label=>'<button class="button primary" type="submit">'+esc(label)+'</button>';
 const form = (type,id,contents,caption) => '<form data-scm-form="'+type+'" data-record="'+esc(id||'')+'">'+contents+'<p role="alert" class="scm-error" hidden></p>'+submit(caption)+'</form>';
 const list = (cols,rows,empty) => rows.length?'<div class="scm-scroll" role="region" tabindex="0" aria-label="'+esc(cols.join(', '))+'"><table><thead><tr>'+cols.map(x=>'<th scope="col">'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(x=>'<td>'+x+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>':'<p class="muted">'+esc(empty)+'</p>';
 const status = inv=>inv.cancelledAt?'Cancelled':inv.loadedAt?'Loaded':inv.releasedAt?'Container released':'Booked';
 const poLink = id=>order(id)?'<a href="#/order/'+encodeURIComponent(id)+'">'+esc(order(id).number)+'</a>':'PO unavailable';
 const poLinks = inv=>inv.members.map(m=>poLink(m.orderId)).join(', ');
 const stageLabel = code=>STAGES.find(([key])=>key===code)?.[1]||code;
 const nextStage = ro=>STAGES.find(([s])=>!(ro.stages||[]).some(step=>step.stage===s));
 function prerequisites(ro,stage,po){
  const needs=[];
  for(const inv of roInvoices(ro)){
   const invoiceNeed=(label,focus)=>needs.push({label,href:scmHref('invoice',inv.id,po,focus)});
   if(stage==='INDIA_ARRIVAL'&&!inv.insurance?.date)invoiceNeed('Record insurance for '+inv.number,'insurance');
   if(stage==='SHIPPING_DOCS'&&!inv.members.every(m=>scmInvoiceDocumentReady(order(m.orderId),m.shipmentId,inv.number)))invoiceNeed('Attach commercial invoice '+inv.number,'document');
   if(stage==='SAILING'||stage==='COST_CAPTURE')for(const m of inv.members){
    const o=order(m.orderId),shipment=o.shipments.find(s=>s.id===m.shipmentId);
    if(stage==='COST_CAPTURE'&&!scmInvoiceCostReady(o,shipment,inv.number)){
     needs.push({label:'Finalize costing for '+inv.number+' on '+o.number,href:scmHref('po',o.id,po,'costing')});
    }
    if(stage==='SAILING'){
     const blockers=orderJourney(data(),o).shipments.find(s=>s.id===m.shipmentId)?.blockers||[];
     for(const label of blockers)needs.push({label,href:'#/order/'+encodeURIComponent(o.id)+(/payment|advance|balance|remit|PI\b/i.test(label)?'?tab=finance':'')});
    }
   }
  }
  return needs;
 }
 function roNext(ro,po){
  const stage=nextStage(ro);
  if(!stage)return null;
  const label=stage[0]==='INDIA_ARRIVAL'?'India arrival':stage[0]==='COST_CAPTURE'?'final cost capture':stage[1].toLowerCase();
  return prerequisites(ro,stage[0],po)[0]||{label:'Record '+label+' for '+ro.number,href:scmHref('ro',ro.id,po)};
 }
 function orderAction(o){
  renderedModel=null;
  const fallback={label:'View SCM records',href:scmHref('po',o.id)};
  if(!editable([o]))return fallback;
  const invoices=model().invoices.filter(i=>!i.cancelledAt&&i.members.some(m=>m.orderId===o.id));
  const ros=model().ros.filter(r=>invoices.some(i=>i.roId===r.id)&&editable(roInvoices(r).flatMap(invoiceOrders))).sort((a,b)=>b.stages.length-a.stages.length);
  for(const ro of ros){const next=roNext(ro,o.id);if(next)return next;}
  const waiting=invoices.filter(i=>!i.loadedAt&&editable(invoiceOrders(i)));
  const invoice=waiting.find(i=>i.releasedAt)||waiting[0];
  if(invoice)return {label:(invoice.releasedAt?'Load ':'Record release for ')+invoice.number,href:scmHref('invoice',invoice.id,o.id)};
  if(canCreate(context().user)&&bookable().some(row=>row.id===o.id))return {label:'Book commercial invoice',href:'#/scm?book=1&po='+encodeURIComponent(o.id)};
  return fallback;
 }
 const actionLink=({href,label})=>'<a class="scm-link" href="'+esc(href)+'">'+esc(label)+'</a>';
 const roLink = id=>{const ro=model().ros.find(r=>r.id===id);return ro?link('ro',ro.id,ro.number):'RO unavailable';};
 const invoiceTable = rows=>list(['Commercial invoice','Supplier','Purchase orders','Booking','Status','RO'],rows.map(i=>[link('invoice',i.id,i.number),esc(supplier(i.vendorId)),poLinks(i),esc(i.bookingRef),esc(status(i)),i.roId?roLink(i.roId):i.cancelledAt?'—':'Pending loading']),'No SCM commercial invoices booked.');
 function nextActionLink(ro,po){const next=roNext(ro,po);return next?actionLink(next):'Complete';}
 function orderRecords(o){
  renderedModel=null;
  const invoices=model().invoices.filter(i=>i.members.some(m=>m.orderId===o.id));
  const rows=invoices.map(inv=>{
   const ro=model().ros.find(r=>r.id===inv.roId);
   return [actionLink({href:scmHref('invoice',inv.id,o.id),label:inv.number}),esc(status(inv)),
    ro?actionLink({href:scmHref('ro',ro.id,o.id),label:ro.number}):'—'];
  });
  return panel('Linked SCM records',list(['Commercial invoice','Loading status','RO'],rows,'No commercial invoices booked for this PO.')+link('po',o.id,'Open SCM for '+o.number));
 }
 function register(){
  const poId=params().get('po'), scopedOrder=poId&&order(poId);
  if(poId&&!scopedOrder)return head('SCM','PO unavailable','Open the register to choose an accessible PO.',back);
  const invoices=model().invoices.filter(i=>!poId||i.members.some(m=>m.orderId===poId));
  const ros=model().ros.filter(r=>!poId||invoices.some(i=>i.roId===r.id));
  const canBook=canCreate(context().user)&&bookable().some(o=>!poId||o.id===poId);
  const bookingHref='#/scm?book=1'+(poId?'&amp;po='+encodeURIComponent(poId):'');
  const intro=head('LAE Import',scopedOrder?'SCM · '+esc(scopedOrder.number):'Supply Chain Management','Commercial invoices, container loading and RO tracking.',(scopedOrder?poLink(poId)+' '+back:'')+(canBook?'<a class="button primary" href="'+bookingHref+'">Book commercial invoice</a>':''));
  const costs=scopedOrder&&(scopedOrder.arrivalCostings?.length||scopedOrder.shipments.some(s=>s.actualArrival))&&arrivalCosts?arrivalCosts(scopedOrder):'';
  const focusCosts=params().get('focus')==='costing';
  let out=intro+(focusCosts?costs:'')+panel('Commercial invoices',invoiceTable([...invoices].reverse()))+panel('RO tracking',list(['RO number','BL number','Commercial invoices','Containers','Next action'],[...ros].reverse().map(r=>[link('ro',r.id,r.number),esc(r.blNumber||'Pending'),String(roInvoices(r).length),String(r.containers.length),nextActionLink(r,poId)]),'A tracking record appears when a commercial invoice is loaded against an RO.'));
  const legacy=data().orders.filter(o=>(!poId||o.id===poId)&&visible(o)&&o.shipments.some(s=>!s.scmInvoiceId));
  if(!poId&&legacy.length)out+=panel('Existing shipments',list(['Purchase order','Supplier','Existing shipments'],legacy.map(o=>[link('po',o.id,o.number),esc(supplier(o.vendorId)),String(o.shipments.filter(s=>!s.scmInvoiceId).length)]),''));
  if(scopedOrder&&legacy.length&&legacyShipments)out+=legacyShipments(scopedOrder);
  if(!focusCosts)out+=costs;
  if(scopedOrder&&orderDocs)out+=panel('PO document register',orderDocs(scopedOrder));
  return out;
 }
 function remaining(o,line){
  const used=(o.shipments||[]).filter(s=>s.status!=='CANCELLED').reduce((sum,s)=>sum+s.lines.filter(l=>l.lineId===line.id).reduce((n,l)=>n+l.quantity,0),0);
  return Math.max(0,line.quantity-used);
 }
 const savedPlan=s=>s.status==='PLANNED'&&(!s.bookingStatus||s.bookingStatus==='PLANNED')&&!s.scmInvoiceId&&!s.roGroupId&&!s.forwarderRef&&!s.actualDeparture;
 const bookable = () => data().orders.filter(o=>visible(o) && !o.manualClosed && o.productionCompletedAt && o.bulkQc?.result==='PASS' && o.revisions?.length && !o.amendment && editable([o]) && (o.lines.some(l=>remaining(o,l)>0)||o.shipments.some(savedPlan)));
 function quantities(lines,col='Unbooked'){
  return list(['PO','Item',col,'Quantity'],lines.map(({o,line,qty,plan})=>[
   poLink(o.id),esc(line.code||line.name||line.id),String(qty),
   '<input '+attrs({type:'number',min:0,max:qty,step:1,'aria-label':'Quantity for '+o.number+' '+(line.code||line.name||line.id), 'data-scm-line':line.id,'data-order':o.id,'data-plan':plan,placeholder:'0'})+'>'
  ]),'No quantities available for this supplier.');
 }
 function supplierLines(vendorId){
  const orders=bookable().filter(o=>o.vendorId===vendorId);
  const unbooked=orders.flatMap(o=>o.lines.map(line=>({o,line,qty:remaining(o,line)})).filter(x=>x.qty>0));
  const plans=orders.flatMap(o=>o.shipments.filter(savedPlan).map(s=>{
   const items=s.lines.map(l=>(o.lines.find(x=>x.id===l.lineId)?.code||l.lineId)+' Ã— '+l.quantity).join(', ');
   const checked=params().get('po')===o.id&&params().get('plan')===s.id?' checked':'';
   return [poLink(o.id),esc(s.number),esc(items),'<input type="checkbox"'+checked+' data-scm-plan="'+esc(s.id)+'" data-order="'+esc(o.id)+'" aria-label="Use '+esc(s.number)+'">'];
  }));
  return quantities(unbooked)+(plans.length?'<h3>Use a saved loading plan</h3><p>Select one complete plan per PO, or enter its unbooked quantities above.</p>'+list(['PO','Plan','Items','Use plan'],plans,''):'');
 }
 function booking(){
  const requested=order(params().get('po')),eligible=bookable(), suppliers=[...new Set(eligible.map(o=>o.vendorId))].sort((a,b)=>supplier(a).localeCompare(supplier(b)));
  const defaultVendor=requested&&suppliers.includes(requested.vendorId)?requested.vendorId:suppliers.length===1?suppliers[0]:null;
  const blank=panel('Available PO items','<p>Booking opens after production completion and a passed bulk QC. Check the orderâ€™s production and QC milestones.</p><a href="#/orders">Open order pipeline</a>');
  const title=head('SCM','Book commercial invoice','Allocate quantities from the supplierâ€™s POs to this invoice.',detailBack());
  if(!suppliers.length)return title+blank;
  const forwarders=data().vendors.filter(v=>v.kind==='LOGISTICS' && v.status==='ACTIVE').map(v=>[v.id,v.name]);
  const fields=select('vendorId','Supplier',suppliers.map(id=>[id,supplier(id)]),'Select',{},defaultVendor) +input('number','Commercial invoice number')+dated('Booking date')+select('forwarderId','Forwarding agent',forwarders)+input('bookingRef','Booking reference')+input('origin','Origin')+input('destination','Destination')+input('etd','Expected departure','date')+input('eta','Expected arrival','date')+input('evidence','Commercial invoice file (optional)','file',{required:false})+input('invoiceDate','Invoice date if attaching a file','date',{required:false,max:isoDay()});
  return title+panel('Booking',form('book','',(!forwarders.length?'<p>Add an active logistics provider in <a href="#/vendors">Vendor master</a> to book a container.</p>':'')+'<div class="scm-fields">'+fields+'</div><fieldset><legend>Invoice quantities by PO item</legend><div data-scm-available>'+(defaultVendor?supplierLines(defaultVendor):'Select the supplier to see available PO items.')+'</div></fieldset>','Save booking'));
 }
 function addContainer(inv,first){
  const rows=inv.members.flatMap(m=>m.lines.map(l=>{const o=order(m.orderId);return {o,line:o?.lines.find(x=>x.id===l.lineId),qty:l.quantity};})).filter(x=>x.o&&x.line);
  return '<fieldset data-scm-container><legend>Container and packing list</legend><div class="scm-fields">'+input('container','Container number')+input('packingList','Packing list reference')+'</div>'+quantities(rows,'Invoice quantity')+(first?'':action('scm-remove-container','Remove this container'))+'</fieldset>';
 }
 const roForm = inv => form('load',inv.id,'<div class="scm-fields">'+dated('Loading date')+input('roNumber','Shipping agent RO number','text',{list:'scm-existing-ro',maxlength:SCM_RO_NUMBER_MAX_LENGTH})+'</div><datalist id="scm-existing-ro">'+model().ros.filter(r=>!r.stages.length&&r.forwarderId===inv.forwarderId).map(r=>'<option value="'+esc(r.number)+'">').join('')+'</datalist><p>Use the same RO number to combine invoices. Allocate every invoice item across its containers.</p><div data-scm-containers>'+addContainer(inv,true)+'</div>'+action('scm-add-container','Add another container'),'Record loading');
 function followups(target,id,entries,canWrite){
  const rows=(entries||[]).map(f=>[esc(f.date),esc(f.remarks),esc(f.nextDue||'—'),esc(f.assignedOwner||'Not recorded')]);
  let editor='';
  if(canWrite){
   const invoices=target==='ro'?roInvoices(model().ros.find(ro=>ro.id===id)):[model().invoices.find(inv=>inv.id===id)];
   const orders=invoices.flatMap(invoiceOrders);
   const current=context().user;
   const owners=(data().users||[]).filter(user=>user.id!==current.id&&user.active!==false&&orders.every(order=>canEdit(user,order)));
   const fields=dated('Follow-up date')+input('remarks','Follow-up notes','text',{maxlength:4000})+
    input('nextDue','Next follow-up due (optional)','date',{required:false})+
    select('assignedOwnerId','Assigned owner (optional)',owners.map(user=>[user.id,user.name]),'Me (default)',{required:false});
   editor=form('follow-'+target,id,'<div class="scm-fields">'+fields+'</div>','Save follow-up');
  }
  return panel('Follow-ups',list(['Date','Update','Next due','Assigned owner'],rows,'No follow-ups recorded.')+editor);
 }
 function invoicePage(inv){
  const canWrite=editable(invoiceOrders(inv)),ro=model().ros.find(r=>r.id===inv.roId);
  const allocations=inv.members.flatMap(m=>m.lines.map(l=>[poLink(m.orderId),esc(order(m.orderId)?.lines.find(x=>x.id===l.lineId)?.code||l.lineId),String(l.quantity)]));
  const recorded='<dl class="scm-facts"><div><dt>Booking</dt><dd>'+esc(inv.bookingRef)+' Â· '+esc(inv.bookedAt)+'</dd></div><div><dt>Container release</dt><dd>'+esc(inv.releasedAt?inv.releaseRef+' Â· '+inv.releasedAt:'Pending')+'</dd></div><div><dt>Loading / RO</dt><dd>'+(ro?link('ro',ro.id,ro.number)+' Â· '+esc(inv.loadedAt):inv.cancelledAt?'—':'Pending')+'</dd></div></dl>';
  const header=head('SCM / Commercial invoice',esc(inv.number),esc(supplier(inv.vendorId)),detailBack());
  let out=panel('Invoice status',recorded+list(['PO','Item','Invoice quantity'],allocations,'No item allocations.'));
  if(inv.cancelledAt){
   const cancelled=panel('Booking cancelled','<p>'+esc(inv.cancelledAt.slice(0,10))+' · '+esc(inv.cancelledBy)+'</p><p>'+esc(inv.cancelReason)+'</p>');
   return header+out+cancelled+followups('invoice',inv.id,inv.followups,false);
  }
  if(canWrite&&!inv.releasedAt)out+=panel('Container release',form('release',inv.id,'<div class="scm-fields">'+dated('Release date')+input('reference','Release reference')+'</div>','Record release'));
  if(canWrite&&inv.releasedAt&&!inv.loadedAt)out+=panel('Load invoice',roForm(inv));
  out+=panel('PO payments',inv.members.map(m=>'<a class="button ghost" href="#/order/'+encodeURIComponent(m.orderId)+'?tab=finance">'+esc(order(m.orderId).number)+' Â· PI and invoice payments</a>').join(' '));
  const hasInvoice=inv.members.every(m=>scmInvoiceDocumentReady(order(m.orderId),m.shipmentId,inv.number));
  const documentPanel=!hasInvoice&&canWrite?panel('Commercial invoice document',form('invoice-document',inv.id,'<div class="scm-fields">'+input('invoiceDate','Commercial invoice date','date',{max:inv.bookedAt})+input('evidence','Commercial invoice file','file')+'</div>','Attach invoice')):'';
  const insuranceFields=dated('Insurance date')+input('reference','Insurance declaration number')+input('masterPolicy','Master policy number')+input('currency','Insured currency','text',{value:invoiceOrders(inv)[0]?.currency,maxlength:3})+input('insuredValue','Insured invoice value','number',{min:'0.01',step:'0.01'})+input('evidence','Insurance evidence','file');
  const insurancePanel=panel('Invoice insurance',inv.insurance?'<p>'+esc(inv.insurance.reference||inv.insurance.policyNumber)+' Â· '+esc(inv.insurance.date)+'</p>':canWrite&&ro?.blNumber?form('insure',inv.id,'<div class="scm-fields">'+insuranceFields+'</div>','Record invoice insurance'):'<p>Pending final BL or insurance declaration.</p>');
  const focus=params().get('focus');
  out=header+(focus==='insurance'?insurancePanel:'')+(focus==='document'?documentPanel:'')+out+(focus==='document'?'':documentPanel)+(focus==='insurance'?'':insurancePanel);
  if(ro)out+='<p>Record further follow-ups on '+link('ro',ro.id,'RO '+ro.number)+'.</p>';
  out+=followups('invoice',inv.id,inv.followups,canWrite&&!ro);
  if(canWrite&&canApprove(context().user)&&!inv.roId&&!inv.loadedAt)out+='<details class="panel scm-panel"><summary>Cancel this booking</summary><div class="panel-body"><p>Cancelling releases the reserved quantities back to their POs.</p>'+form('cancel',inv.id,input('remarks','Cancellation reason','text',{maxlength:2000}),'Cancel invoice booking')+'</div></details>';
  return out;
 }
 function packing(ro){
  return ro.containers.map(c=>'<details><summary>'+esc(c.number)+' Â· '+esc(c.packingList)+'</summary>'+list(['Invoice','PO','Item','Packed quantity'],c.lines.map(l=>[link('invoice',l.invoiceId,model().invoices.find(i=>i.id===l.invoiceId)?.number||'Invoice'),poLink(l.orderId),esc(order(l.orderId)?.lines.find(x=>x.id===l.lineId)?.code||l.lineId),String(l.quantity)]),'No lines recorded.')+'</details>').join('');
 }
 function roStage(ro,stage,label){
  let fields=dated(label+' date');
  if(stage==='SHIPPING_DOCS'){
   fields+=input('reference','Draft BL number (optional)','text',{required:false})+input('evidence','Verified draft BL file (optional)','file',{required:false});
   for(const c of ro.containers.filter(c=>!c.packingListFileId))fields+=input('packing-file','Packing list Â· '+c.number,'file',{'data-packing-for':c.number});
  }
  if(stage==='SAILING')fields+=input('vessel','Vessel')+input('voyage','Voyage');
  if(stage==='BL')fields+=input('reference','Final BL number')+input('evidence','Final BL evidence','file');
  if(stage==='INDIA_ARRIVAL')fields+=input('reference','Arrival reference (optional)','text',{required:false});
  if(stage==='COST_CAPTURE')fields+=input('reference','Costing reference (optional)','text',{required:false});
  if(['SAILING','INDIA_ARRIVAL'].includes(stage))fields+=select('reason','Delay reason',REASONS.map(x=>[x,x]),'On time',{required:false});
  fields+=input('remarks','Remarks','text',{required:['SAILING','INDIA_ARRIVAL'].includes(stage)});
  return form('ro-stage',ro.id,'<input type="hidden" name="stage" value="'+stage+'"><div class="scm-fields">'+fields+'</div>','Record '+label.toLowerCase());
 }
 function evidenceActions(invoices,stage){
  if(stage==='SHIPPING_DOCS'){
   return list(['Commercial invoice','Invoice file'],invoices.map(i=>[link('invoice',i.id,i.number),i.members.every(m=>scmInvoiceDocumentReady(order(m.orderId),m.shipmentId,i.number))?'Attached':link('invoice',i.id,'Attach invoice')]),'');
  }
  if(stage==='INDIA_ARRIVAL')return list(['Commercial invoice','Insurance'],invoices.map(i=>[link('invoice',i.id,i.number),i.insurance?esc(i.insurance.reference):link('invoice',i.id,'Record invoice insurance')]),'');
  if(stage==='COST_CAPTURE')return list(['Commercial invoice','Arrival costing by PO'],invoices.map(i=>[link('invoice',i.id,i.number),i.members.map(m=>link('po',m.orderId,'Open '+order(m.orderId).number+' costing')).join(' Â· ')]),'');
  return '';
 }
 function roPage(ro){
  const invoices=roInvoices(ro),write=editable(invoices.flatMap(invoiceOrders)),next=nextStage(ro);
  let out=head('SCM / Shipping agent RO','RO '+esc(ro.number),ro.blNumber?'BL '+esc(ro.blNumber):'Final BL pending',detailBack());
  out+=panel('RO tracking',list(['Stage','Date','Reference / update'],ro.stages.map(s=>[esc(stageLabel(s.stage)),esc(s.date),esc([s.reference,s.remarks].filter(Boolean).join(' Â· '))]),'Loading recorded. Shipping documents are the next stage.'));
  if(ro.trackingReports?.length)out+=panel('Forwarder tracking updates',list(['Report date','Forwarder status','ETD','ETA','Reported BL'],ro.trackingReports.map(r=>[esc(r.date),esc(r.remarks||'â€”'),esc(r.etd||'â€”'),esc(r.eta||'â€”'),esc(r.reportedBlNumber||'â€”')]),''));
  if(next){
   const needs=prerequisites(ro,next[0],origin());
   if(needs.length)out+=panel('Before '+(next[0]==='INDIA_ARRIVAL'?'India arrival':next[1].toLowerCase()),'<ul>'+needs.map(n=>'<li>'+actionLink(n)+'</li>').join('')+'</ul>');
   else if(write)out+=panel(next[1],evidenceActions(invoices,next[0])+roStage(ro,...next));
  }
  return out+panel('Invoices on this RO',invoiceTable(invoices))+panel('Container packing lists',packing(ro))+followups('ro',ro.id,ro.followups,write);
 }
 function page(){
  renderedModel=null;
  const p=params(),inv=model().invoices.find(i=>i.id===p.get('invoice')),ro=model().ros.find(r=>r.id===p.get('ro'));
  let body;
  if(p.has('invoice')||p.has('ro'))body=inv?invoicePage(inv):ro?roPage(ro):head('SCM','Record unavailable','Open the SCM register to choose a record.',back);
  else body=p.has('book')?booking():register();
  return '<div class="scm-workspace">'+body+'</div>';
 }
 function change(el){
  if(el?.name!=='vendorId'||el.closest('[data-scm-form]')?.dataset.scmForm!=='book')return false;
  el.form.querySelector('[data-scm-available]').innerHTML=supplierLines(el.value);return true;
 }
 function handleAction(name,d,el){
  if(!['scm-add-container','scm-remove-container'].includes(name))return false;
  const f=el.closest('[data-scm-form]'),inv=model().invoices.find(i=>i.id===f.dataset.record);
  if(name==='scm-add-container'){const wrap=f.querySelector('[data-scm-containers]');wrap.insertAdjacentHTML('beforeend',addContainer(inv,false));wrap.lastElementChild.querySelector('input').focus();}
  else el.closest('[data-scm-container]').remove();
  return true;
 }
 const lines = wrapper=>[...wrapper.querySelectorAll('[data-scm-line]')].filter(el=>Number(el.value)>0).map(el=>({orderId:el.dataset.order,lineId:el.dataset.scmLine,quantity:Number(el.value)}));
 function members(wrapper){
  const grouped=new Map();
  for(const {orderId,lineId,quantity} of lines(wrapper)){
   if(!grouped.has(orderId))grouped.set(orderId,{orderId,lines:[]});
   grouped.get(orderId).lines.push({lineId,quantity});
  }
  for(const el of wrapper.querySelectorAll('[data-scm-plan]:checked')){
   const orderId=el.dataset.order;
   if(grouped.has(orderId))throw Error('Use one saved plan or unbooked quantities for each PO.');
   const s=order(orderId)?.shipments.find(s=>s.id===el.dataset.scmPlan);
   if(!s)throw Error('The saved load plan could not be found.');
   grouped.set(orderId,{orderId,shipmentId:s.id,lines:s.lines.map(({lineId,quantity})=>({lineId,quantity}))});
  }
  return [...grouped.values()];
 }
 async function formSubmit(event){
  const f=event.target;if(!f.matches?.('[data-scm-form]'))return false;event.preventDefault();
  if(f.dataset.saving==='1')return true;
  const id=f.dataset.record,type=f.dataset.scmForm,values=Object.fromEntries(new FormData(f)),error=f.querySelector('.scm-error'),save=f.querySelector('[type=submit]');
  delete values.evidence;delete values['packing-file'];
  error.hidden=true;f.dataset.saving='1';save.disabled=true;
  try{
   const inv=model().invoices.find(i=>i.id===id),ro=model().ros.find(r=>r.id===id);
   let name,payload;
   if(type==='book'){
    const allocations=members(f);if(!allocations.length)throw Error('Enter the quantity for at least one PO item.');
    name='SCM_BOOK_INVOICE';payload={...values,members:allocations};
   }else if(type==='invoice-document'){name='SCM_INVOICE_DOCUMENT';payload={...values,invoiceId:id};}
   else if(type==='cancel'){name='SCM_CANCEL_INVOICE';payload={invoiceId:id,remarks:values.remarks};}
   else if(type==='release'){name='SCM_RELEASE_INVOICE';payload={...values,invoiceId:id};}
   else if(type==='load'){
    const containers=[...f.querySelectorAll('[data-scm-container]')].map(row=>({number:row.querySelector('[name=container]').value.trim(),packingList:row.querySelector('[name=packingList]').value.trim(),lines:lines(row)}));
    name='SCM_LOAD_INVOICE';payload={invoiceId:id,date:values.date,roNumber:values.roNumber,containers};
   }else if(type==='insure'){name='SCM_INSURE_INVOICE';payload={...values,invoiceId:id};}
   else if(type==='ro-stage'){name='SCM_RO_STAGE';payload={...values,roId:id};}
   else if(type==='follow-invoice'||type==='follow-ro'){name='SCM_FOLLOWUP';payload={...values,[type==='follow-ro'?'roId':'invoiceId']:id};}
   else throw Error('Unknown SCM form.');
   const files=f.querySelector('[name=evidence]')?.files;
   if(type==='ro-stage'&&values.stage==='SHIPPING_DOCS'){
    if(Boolean(values.reference.trim())!==Boolean(files?.length))throw Error('To verify a draft BL, enter its number and attach its file.');
    if(files?.length&&!values.remarks.trim())throw Error('Enter the draft BL verification remarks.');
   }
   if(type==='book'&&files?.length){
    if(!values.invoiceDate)throw Error('Enter the date of the attached commercial invoice.');
    if(values.invoiceDate>values.date)throw Error('Invoice date cannot follow booking.');
   }
   for(const el of f.querySelectorAll('[data-packing-for]')){
    const c=ro.containers.find(c=>c.number===el.dataset.packingFor);
    const [fileId]=await uploadMany([...el.files],[...new Set(c.lines.map(l=>l.orderId))]);
    (payload.packingListFiles ||= []).push({number:c.number,fileId});
   }
   if(files?.length){const owners=type==='book'?payload.members.map(m=>order(m.orderId)):inv?invoiceOrders(inv):roInvoices(ro).flatMap(invoiceOrders);[payload.fileId]=await uploadMany([...files],[...new Set(owners.map(o=>o.id))]);}
   const result=await command(name,payload,{close:false,message:'SCM record saved.'});
   renderedModel=null;
   if(type==='book'&&result){const created=model().invoices.find(i=>i.id===result.id)||model().invoices.find(i=>!i.cancelledAt&&i.vendorId===values.vendorId&&i.number.toUpperCase()===values.number.trim().toUpperCase());if(created)location.hash=scmHref('invoice',created.id);}
  }catch(e){error.textContent=e.message||'The record could not be saved.';error.hidden=false;error.scrollIntoView?.({block:'nearest'});}
  finally{save.disabled=false;delete f.dataset.saving;}
  return true;
 }
 return {page,formSubmit,change,action:handleAction,orderAction,orderRecords};
}
