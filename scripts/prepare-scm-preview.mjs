import {createSeed} from '../shared/seed.mjs';
import {addDays,paymentSchedule} from '../shared/domain.mjs';
import {ARRIVAL_COST_FIELDS} from '../shared/arrival-costing.mjs';

// Isolated review examples. Use the same business commands as the application.
export function scmPreviewState(today='2026-11-24',{tenCycles=false}={}){
 return createSeed(today,({state,create,order,run,pi,pay,confirmArtwork,produce,evidence})=>{
  const day=n=>addDays(today,-n);
  const ready=(sku,quantity,price,offset=0)=>{
   const id=create('SCM review',sku,quantity,price,45+offset);
   pi(id,day(44+offset));pay(id,0,null,day(43+offset));confirmArtwork(id,day(42+offset));produce(id,day(42+offset),day(7+offset));
   return order(id);
  };
  const split=ready('GJPW12',120,'245.00');
  const other=state().vendors.find(v=>v.kind==='SUPPLIER'&&v.id!==split.vendorId);
  // The review assumes a second supplier produces the sprayer.
  state().bases.find(b=>b.code==='BS01').vendorId=other.id;
  state().items.find(i=>i.code==='GJBS01').vendorCode=other.code;
  const single=ready('GJBS01',40,'35.00');
  ready('GJBC10',36,'82.50');
  const book=(po,number,quantity,offset=0)=>{
   const members=[{orderId:po.id,lines:[{lineId:po.lines[0].id,quantity}]}];
   return run('SCM_BOOK_INVOICE',{members,number,bookingRef:'BK-'+number,forwarderId:'demo-forwarder',date:day(5+offset),origin:'Ningbo',destination:'Chennai',etd:day(offset),eta:addDays(day(offset),18),fileId:evidence(po.id,number),invoiceDate:day(5+offset)},day(5+offset)).invoiceId;
  };
  const release=invoiceId=>run('SCM_RELEASE_INVOICE',{invoiceId,date:day(4),reference:'REL-'+invoiceId},day(4));
  const load=(invoiceId,po,quantities)=>run('SCM_LOAD_INVOICE',{invoiceId,roNumber:'DEMO-RO-301',date:day(3),containers:quantities.map((quantity,i)=>({number:'DEMO-CN-'+(i+1),packingList:'DEMO-PL-'+(i+1),lines:[{orderId:po.id,lineId:po.lines[0].id,quantity}]}))},day(3));
  const first=book(split,'DEMO-CI-A01',10);
  release(first);load(first,split,[6,4]);
  for(let n=2;n<=10;n++)book(split,'DEMO-CI-A'+String(n).padStart(2,'0'),10);
  const second=book(single,'DEMO-CI-B01',40);
  release(second);
  const {roId}=load(second,single,[40]);
  const sharedFile=name=>{
   const id=evidence(split.id,name);
   state().files.find(f=>f.id===id).orderIds.push(single.id);
   return id;
  };
  const stage=(name,fields={})=>run('SCM_RO_STAGE',{roId,stage:name,date:day(2),remarks:'Illustrative review evidence.',...fields},day(2));
  stage('SHIPPING_DOCS',{packingListFiles:[{number:'DEMO-CN-1',fileId:sharedFile('packing-list-1')},{number:'DEMO-CN-2',fileId:evidence(split.id,'packing-list-2')}]});
  for(const invoiceId of [first,second]){
   const {orderId,shipmentId}=state().scm.invoices.find(i=>i.id===invoiceId).members[0];
   for(const term of paymentSchedule(state(),order(orderId)).filter(t=>t.trigger==='SHIPMENT'&&t.shipmentId===shipmentId))pay(orderId,term.index,shipmentId,day(2));
  }
  stage('SAILING',{vessel:'Demo Carrier',voyage:'V-301',reason:'Shipping / forwarder'});
  stage('BL',{reference:'DEMO-BL-301',fileId:sharedFile('bill-of-lading')});
  run('SCM_FOLLOWUP',{roId,date:day(1),nextDue:today,remarks:'Confirm invoice A01 insurance with the supplier.'},day(1));
  run('SCM_INSURE_INVOICE',{invoiceId:second,date:day(1),reference:'DEMO-INS-B01',masterPolicy:'DEMO-MASTER',currency:'USD',insuredValue:'1400',fileId:evidence(single.id,'insurance-B01')},day(1));
  const next=state().scm.invoices.find(inv=>inv.number==='DEMO-CI-A02');
  run('SCM_RELEASE_INVOICE',{invoiceId:next.id,date:today,reference:'DEMO-REL-A02'},today);
  run('SCM_LOAD_INVOICE',{invoiceId:next.id,roNumber:'DEMO-RO-302',date:today,containers:[{
   number:'DEMO-CN-3',packingList:'DEMO-PL-3',
   lines:[{orderId:split.id,lineId:split.lines[0].id,quantity:10}]
  }]},today);
  if(!tenCycles)return;
  create('SCM review','TTPW12',60,'247.00',1);
  const confirm=id=>run('CONFIRM_SUPPLIER',{orderId:id,channel:'EMAIL',remarks:'Supplier accepted the demo PO.',fileId:evidence(id,'supplier-confirmation',day(3))},day(3));
  const waitingPi=create('SCM review','GJCC01',75,'188.00',4);
  confirm(waitingPi);
  const reviewingPi=create('SCM review','GJBS01',100,'35.00',5);
  confirm(reviewingPi);
  run('RECORD_PI',{orderId:reviewingPi,number:'DEMO-PI-06',date:day(2),currency:'USD',amount:'3500.00',quantity:100,termsConfirmed:true,commitmentConfirmed:true,fileId:evidence(reviewingPi,'supplier-PI',day(2))},day(2));
  const advance=create('SCM review','KDPW12',50,'242.00',8);
  pi(advance,day(6));
  const building=create('SCM review','GJCC01',80,'188.00',28);
  pi(building,day(26));pay(building,0,null,day(25));confirmArtwork(building,day(24));produce(building,day(24));
  const released=ready('GJBC10',90,'82.50');
  release(book(released,'DEMO-CI-09',90));

  const costed=ready('GJBS01',100,'35.00',20);
  const invoiceId=book(costed,'DEMO-CI-10',100,20);
  run('SCM_RELEASE_INVOICE',{invoiceId,date:day(24),reference:'DEMO-REL-10'},day(24));
  const lines=[{orderId:costed.id,lineId:costed.lines[0].id,quantity:100}];
  const arrival=run('SCM_LOAD_INVOICE',{invoiceId,roNumber:'DEMO-RO-310',date:day(23),containers:[{number:'DEMO-CN-10',packingList:'DEMO-PL-10',lines}]},day(23));
  const event=(stage,age,extra={})=>run('SCM_RO_STAGE',{roId:arrival.roId,stage,date:day(age),remarks:'Sample shipment.',...extra},day(age));
  event('SHIPPING_DOCS',22,{packingListFiles:[{number:'DEMO-CN-10',fileId:evidence(costed.id,'packing-list-10')}]});
  const member=state().scm.invoices.find(i=>i.id===invoiceId).members[0];
  for(const term of paymentSchedule(state(),order(costed.id)).filter(t=>t.trigger==='SHIPMENT'&&t.shipmentId===member.shipmentId))pay(costed.id,term.index,member.shipmentId,day(21));
  event('SAILING',20,{vessel:'Demo Carrier',voyage:'V-310',reason:'Shipping / forwarder'});
  event('BL',19,{reference:'DEMO-BL-310',fileId:evidence(costed.id,'BL-310')});
  run('SCM_INSURE_INVOICE',{invoiceId,date:day(18),reference:'DEMO-INS-10',masterPolicy:'DEMO-MASTER',currency:'USD',insuredValue:'3500',fileId:evidence(costed.id,'insurance-10')},day(18));
  event('INDIA_ARRIVAL',2,{reason:'Shipping / forwarder'});
  const costs=Object.fromEntries(ARRIVAL_COST_FIELDS.map(([key])=>[key,'0']));
  Object.assign(costs,{supplierPayment:'299250',bcd:'30000',sws:'3000',oceanFreight:'15000',insurance:'800',clearance:'2500'});
  const {id:costingId}=run('SAVE_ARRIVAL_COSTING',{orderId:costed.id,shipmentId:member.shipmentId,invoiceNumber:'DEMO-CI-10',invoiceAmount:'3500',lines:[{lineId:costed.lines[0].id,quantity:100,unitPrice:'35'}],boeNumber:'DEMO-BOE-310',boeDate:day(2),costs,gst:'62500',boeTotals:{bcd:'30000',sws:'3000',gst:'62500'},boeFileIds:[evidence(costed.id,'BOE-310')],supportFileIds:[evidence(costed.id,'costs-310')],allocationNote:'Illustrative costs allocated to this single invoice.'},day(1));
  run('FINALIZE_ARRIVAL_COSTING',{orderId:costed.id,costingId,confirmActuals:true},today);
  event('COST_CAPTURE',0);
 });
}
