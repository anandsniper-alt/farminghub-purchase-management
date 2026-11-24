const roStages = [
  ['SHIPPING_DOCS', 'Shipping documents'],
  ['SAILING', 'Vessel departure'],
  ['BL', 'Final bill of lading'],
  ['INDIA_ARRIVAL', 'India arrival'],
  ['COST_CAPTURE', 'Final costing'],
];

export function poScmBranches(state, order) {
  const invoices = (state.scm?.invoices || []).filter(invoice =>
    !invoice.cancelledAt && invoice.members.some(member => member.orderId === order.id));
  const roIds = new Set(invoices.map(invoice => invoice.roId).filter(Boolean));
  return { invoices, ros: (state.scm?.ros || []).filter(ro => roIds.has(ro.id)) };
}

export function poScmStatus(state, order) {
  if (order.scope !== 'LAE_IMPORT' || order.manualClosed || order.deletedAt || order.testData) return '';
  const shipments = (order.shipments || []).filter(s => s.status !== 'CANCELLED');
  if (!shipments.some(s => s.scmInvoiceId)) return '';
  const {invoices,ros} = poScmBranches(state, order);
  const invoiceById = new Map(invoices.map(i => [i.id,i]));
  const roById = new Map(ros.map(r => [r.id,r]));
  const all = order.lines.reduce((sum,l) => sum+l.quantity,0);
  if (!all) return '';
  const totals = {costed:0,arrived:0,sailed:0,loaded:0,released:0,booked:0};
  for (const s of shipments) {
    const invoice = invoiceById.get(s.scmInvoiceId);
    const ro = roById.get(invoice?.roId);
    const done = key => ro?.stages.some(row => row.stage === key);
    const quantity = s.lines.reduce((sum,l) => sum+l.quantity,0);
    if (done('COST_CAPTURE')) totals.costed += quantity;
    if (done('INDIA_ARRIVAL') || s.actualArrival) totals.arrived += quantity;
    if (done('SAILING') || s.actualDeparture) totals.sailed += quantity;
    if (invoice?.loadedAt || s.actualDeparture || s.actualArrival) totals.loaded += quantity;
    if (invoice?.releasedAt || s.releaseDate) totals.released += quantity;
    if (invoice?.bookedAt || s.bookingDate) totals.booked += quantity;
  }
  for (const [key,complete,partial] of [
    ['costed','Cost capture complete','Partially costed'],['arrived','Arrived in India','Partially arrived in India'],
    ['sailed','In transit','Partially in transit'],['loaded','Loaded','Partially loaded'],
    ['released','Container released','Partially released'],['booked','Booked','Partially booked'],
  ]) {
    if (totals[key]>0) return totals[key] >= all ? complete : partial;
  }
  return '';
}

export function poScmLink(order, esc, label = 'Open SCM', primary = false) {
  return '<a class="button ' + (primary ? 'primary' : 'small ghost') + '" href="#/scm?po=' +
    esc(encodeURIComponent(order.id)) + '">' + esc(label) + '</a>';
}

export function renderPoScmTimeline(state, order, {esc,dt}, trunk='') {
  const {invoices,ros}=poScmBranches(state,order);
  const shipments=(order.shipments||[]).filter(s=>s.status!=='CANCELLED');
  const legacy=shipments.some(s=>!s.scmInvoiceId);
  const ordered=order.lines.reduce((n,l)=>n+l.quantity,0);
  const members=inv=>inv.members.filter(m=>m.orderId===order.id);
  const qty=inv=>members(inv).flatMap(m=>m.lines).reduce((n,l)=>n+l.quantity,0);
  const total=list=>list.reduce((n,inv)=>n+qty(inv),0);
  const pending=invoices.filter(inv=>!inv.roId);
  const reserved=shipments.flatMap(s=>s.lines).reduce((n,l)=>n+l.quantity,0);
  const unallocated=Math.max(0,ordered-reserved);
  const fmt=n=>n.toLocaleString('en-IN');
  const date=v=>v?dt(String(v).slice(0,10)):'';
  const join=parts=>parts.filter(Boolean).map(esc).join(' · ');
  const detailLink=(type,id,label)=>'<a href="#/scm?'+type+'='+esc(encodeURIComponent(id))+'&amp;fromPo='+esc(encodeURIComponent(order.id))+'">'+esc(label)+'</a>';
  const notes=rows=>rows.length?'<ul class="cycle-notes">'+rows.map(parts=>'<li>'+join(parts)+'</li>').join('')+'</ul>':'';
  const followups=list=>(list||[]).map(row=>['Follow-up',date(row.date),row.remarks,row.by]);
  // Decorative outlines reinforce the labels; the adjacent text carries meaning.
  const illustration=kind=>'<svg class="cycle-illustration" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+(kind==='invoice'?'<path d="M8 3.5h11l6 6v19H8z"/><path d="M19 3.5v6h6M12 14h9M12 18h9M12 22h5"/>':'<path d="M4 15h24l-3 9H8zM8 15V7h16v8M12 7v8M16 7v8M20 7v8M3 27c2 2 4 2 6 0 2 2 4 2 6 0 2 2 4 2 6 0 2 2 4 2 7 0"/>')+'</svg>';
  const itemLabel=l=>{const item=order.lines.find(row=>row.id===l.lineId);return join([item?.code||l.lineId,String(l.quantity)+(item?.unit?' '+item.unit:'')]);};
  function step(label,when,parts=[]){
    return '<li data-done="'+Boolean(when)+'"><b>'+esc(label)+'</b><small>'+join([date(when)||'Pending',...parts])+'</small></li>';
  }
  const invoiceMilestones=inv=>[
    ['Container booking',inv?.bookedAt,[inv?.bookingRef]],
    ['Container release',inv?.releasedAt,[inv?.releaseRef]],
    ['Container loading',inv?.loadedAt,[]],
  ];
  const roMilestones=(ro,group)=>roStages.flatMap(([key,label])=>{
    const row=ro?.stages?.find(s=>s.stage===key);
    const milestone=[label,row?.date,[row?.reference,row?.vessel,row?.voyage,row?.reason,row?.remarks]];
    return key==='BL'?[milestone,...(group.length?group:[null]).map(inv=>[
      'Invoice insurance',inv?.insurance?.date||inv?.insurance?.insuredAt,
      [group.length>1?inv?.number:'',inv?.insurance?.reference||inv?.insurance?.policyNumber]
    ])]:[milestone];
  });
  function invoiceNode(inv,{milestones=true}={}){
    const shipmentIds=new Set(members(inv).map(m=>m.shipmentId).filter(Boolean));
    const costingNotes=(order.arrivalCostings||[]).filter(c=>shipmentIds.has(c.shipmentId)&&c.invoiceNumber?.trim().toUpperCase()===inv.number.trim().toUpperCase()).flatMap(c=>[
      ...(c.history||[]).map(h=>['Invoice costing reopened',date(h.reopenedAt),h.reopenReason,h.reopenedBy]),
      [c.status==='FINAL'?'Invoice costing finalized':'Provisional invoice costing',date(c.finalizedAt||c.updatedAt),c.boeNumber&&'BOE '+c.boeNumber]
    ]);
    return '<article class="cycle-invoice"><span class="cycle-invoice-connectors" aria-hidden="true"></span><h3>'+illustration('invoice')+'<span>'+detailLink('invoice',inv.id,'Commercial invoice '+inv.number)+' <small>'+fmt(qty(inv))+' units</small></span></h3>'+
      (milestones?'<ol class="cycle-steps">'+invoiceMilestones(inv).map(args=>step(...args)).join('')+'</ol>':'')+
      notes([...followups(inv.followups),...costingNotes])+'<details><summary>Items and booking details</summary><p>'+members(inv).flatMap(m=>m.lines).map(itemLabel).join(' / ')+'</p><p>'+
      join([inv.origin,inv.destination,inv.etd&&'ETD '+date(inv.etd),inv.eta&&'ETA '+date(inv.eta)])+'</p></details></article>';
  }
  function roNode(ro,group,{milestones=true}={}){
    const ids=new Set(group.map(inv=>inv.id));
    const packs=(ro.containers||[]).map(c=>({c,lines:c.lines.filter(l=>l.orderId===order.id&&ids.has(l.invoiceId))})).filter(x=>x.lines.length);
    const updates=(ro.trackingReports||[]).map(row=>['Forwarder update',date(row.date),row.remarks,row.etd&&'ETD '+date(row.etd),row.eta&&'ETA '+date(row.eta),row.reportedBlNumber&&'Reported BL '+row.reportedBlNumber]);
    const reopened=(ro.costingHistory||[]).map(row=>['Costing reopened',date(row.reopenedAt),row.reason,row.reopenedBy,row.date&&'Previously finalized '+date(row.date),row.reference,row.remarks]);
    return '<section class="cycle-ro"><h3>'+illustration('shipment')+'<span>'+detailLink('ro',ro.id,ro.number)+' <small>'+join([ro.blNumber&&'BL '+ro.blNumber,group.length>1?group.length+' invoices on this RO':''])+'</small></span></h3>'+
      (milestones?'<ol class="cycle-steps">'+roMilestones(ro,group).map(args=>step(...args)).join('')+'</ol>':'')+notes([...updates,...followups(ro.followups),...reopened])+
      packs.map(({c,lines})=>'<details><summary>Container '+esc(c.number)+' · Packing list '+esc(c.packingList)+'</summary><ul>'+lines.map(l=>'<li>'+esc(group.find(i=>i.id===l.invoiceId).number)+' · '+itemLabel(l)+'</li>').join('')+'</ul></details>').join('')+'</section>';
  }
  const revisions=(order.revisions||[]).filter(r=>r.revision>0).map(r=>['PO revision '+r.revision,date(r.at),r.reason]);
  if(order.amendment)revisions.push(['Pending amendment',order.amendment.reason]);
  const cancelled=(state.scm?.invoices||[]).filter(i=>i.cancelledAt&&members(i).length).flatMap(i=>[
    ...followups(i.followups).map(parts=>[i.number,...parts]),
    ['Cancelled invoice '+i.number,date(i.cancelledAt),i.cancelReason,i.cancelledBy]
  ]);
  const branch=(group,ro)=>'<li class="cycle-branch"><div class="cycle-invoices'+(group.length>1?' cycle-merge':'')+'">'+group.map(invoiceNode).join('')+'</div>'+
    (ro?roNode(ro,group):'<p class="cycle-future">RO pending at loading</p>')+'</li>';
  const branches=ros.map(ro=>branch(invoices.filter(inv=>inv.roId===ro.id),ro)).concat(pending.map(inv=>branch([inv],null)));
  const metric=(label,n)=>'<div><dt>'+label+'</dt><dd>'+fmt(n)+'</dd></div>';
  const split=invoices.length>1 || (invoices.length===1 && qty(invoices[0])<ordered);
  const panelId='po-cycle-branches-'+encodeURIComponent(order.id);
  const roFor=inv=>ros.find(ro=>ro.id===inv?.roId);
  const stageKeys={'Production completion':'READY','Commercial invoice':'COMMERCIAL_INVOICE','Container booking':'BOOKING','Container release':'RELEASE','Container loading':'LOADING','Shipping documents':'SHIPPING_DOCS','Vessel departure':'SAILING','Final bill of lading':'BL','Invoice insurance':'INSURANCE','India arrival':'INDIA_ARRIVAL','Final costing':'COST_CAPTURE','Completed':'COMPLETED'};
  function railStep(label,entries,{reference='',quantity=true}={}){
    const completed=entries.filter(entry=>entry.when);
    const amount=completed.reduce((sum,entry)=>sum+entry.quantity,0);
    const done=quantity?ordered>0&&amount>=ordered:completed.length>0;
    const partial=!done&&completed.length>0;
    const dates=[...new Set(completed.map(entry=>date(entry.when)).filter(Boolean))];
    const status=done?'Complete':partial?'Partial':'Pending';
    return '<div class="step po-cycle-step'+(done?' done':partial?' partial':'')+'" data-stage="'+stageKeys[label]+'" data-status="'+status.toLowerCase()+'">'+
      '<span class="step-mark" aria-hidden="true">'+(done?'✓':partial?'◐':'○')+'</span><span class="step-label">'+esc(label)+'</span>'+
      '<small class="step-status">'+esc(status+(quantity&&partial?' · '+fmt(amount)+' / '+fmt(ordered)+' units':''))+'</small>'+
      (dates.length?'<small class="step-date">'+esc(dates.join(' · '))+'</small>':'')+
      (reference?'<small class="step-reference">'+reference+'</small>':'')+'</div>';
  }
  const mainInvoices=invoices.length?invoices:[null];
  const milestoneEntries=(kind,index)=>mainInvoices.map(inv=>{
    const milestones=kind==='invoice'?invoiceMilestones(inv):roMilestones(roFor(inv),inv?[inv]:[]);
    const [label,when,parts]=milestones[index];
    return {label,when,parts,quantity:inv?qty(inv):0};
  });
  function mainMilestone(kind,index){
    const entries=milestoneEntries(kind,index);
    const ro=roFor(invoices[0]);
    const refs=[join(entries[0].parts),kind==='ro'&&index===0&&ro?detailLink('ro',ro.id,ro.number):'',kind==='ro'&&index===2&&ro?.blNumber?esc('BL '+ro.blNumber):''];
    return railStep(entries[0].label,entries,{reference:refs.filter(Boolean).join(' · ')});
  }
  function splitRail(){
    const loaded=total(invoices.filter(inv=>inv.loadedAt));
    const costedByLine=new Map();
    const finalDates=[];
    for(const inv of invoices){
      const final=roFor(inv)?.stages.find(row=>row.stage==='COST_CAPTURE' && row.date);
      if(!final)continue;
      finalDates.push(final.date);
      for(const member of members(inv))for(const line of member.lines){
        costedByLine.set(line.lineId,(costedByLine.get(line.lineId)||0)+line.quantity);
      }
    }
    const complete=ordered>0 && order.lines.every(line=>(costedByLine.get(line.id)||0)>=line.quantity);
    const toggle='<button type="button" class="step po-cycle-split" data-action="toggle-po-branches" aria-expanded="false" aria-controls="'+esc(panelId)+'"><span class="step-mark" aria-hidden="true"></span><span class="step-label">Partial loaded</span><small>'+fmt(loaded)+' / '+fmt(ordered)+' loaded · '+fmt(invoices.length)+(invoices.length===1?' invoice':' invoices')+'</small></button>';
    return toggle+railStep('Completed',[{when:complete?finalDates.sort().at(-1):null,quantity:ordered}]);
  }
  const scmRail=!invoices.length?'':split?splitRail():railStep('Commercial invoice',[{when:invoices[0].bookedAt,quantity:qty(invoices[0])}],{reference:detailLink('invoice',invoices[0].id,invoices[0].number)})+invoiceMilestones(null).map((_,i)=>mainMilestone('invoice',i)).join('')+
    roMilestones(null,[]).map((_,i)=>mainMilestone('ro',i)).join('');
  const singleDetails=invoices.length===1&&!split?'<details class="po-cycle-supplement"><summary>Invoice and RO details</summary>'+invoiceNode(invoices[0],{milestones:false})+
    (roFor(invoices[0])?roNode(roFor(invoices[0]),invoices,{milestones:false}):'<p class="cycle-future">RO pending at loading</p>')+'</details>':'';
  const lead='<div class="po-branch-lead" aria-hidden="true"><svg focusable="false"><path pathLength="1"/></svg></div>';
  const disclosure=split?lead+'<div id="'+esc(panelId)+'" class="po-cycle-branches-panel" hidden><div class="po-branch-bridge" aria-hidden="true"></div><ol class="cycle-branches'+(branches.length>3?' cycle-many':'')+'">'+branches.join('')+'</ol></div>':singleDetails;
  return '<section class="load-board cycle-tree" aria-label="Purchase order timeline"><header class="load-head"><h2>Purchase order timeline</h2>'+poScmLink(order,esc,'View SCM')+'</header>'+
    (invoices.length?'<dl class="load-metrics">'+metric('PO quantity',ordered)+metric(legacy?'On SCM loads':'Loaded',total(invoices)-total(pending))+metric('Awaiting load',total(pending))+metric('Unallocated',unallocated)+'</dl>':'')+
    notes(revisions)+'<div class="po-cycle-rail">'+(trunk||railStep('Production completion',[{when:order.productionCompletedAt,quantity:ordered}],{quantity:false}))+scmRail+'</div>'+
    (branches.length?'':'<p class="cycle-balance">'+(legacy?'Previously recorded shipments are shown in shipment milestones.':order.productionCompletedAt?'Ready for SCM · awaiting first invoice booking.':'Commercial invoice booking follows production completion.')+'</p>')+
    disclosure+notes(cancelled)+(invoices.length&&unallocated?'<p class="cycle-balance">'+fmt(unallocated)+' units remain to book</p>':'')+'</section>';
}
