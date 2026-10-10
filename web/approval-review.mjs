import {orderTotal,paymentTermsSummary,paymentSchedule,issueReadiness,approvedSpec,formatMoney} from '../shared/domain.mjs';

export const REVIEW_ACTIONS=Object.freeze({
 'submit-po':['SUBMIT_ORDER','Review and submit purchase order','Submit for approval'],
 'approve-po':['APPROVE_ORDER','Review purchase order','Approve & issue'],
 'verify-pi':['VERIFY_PI','Review supplier PI','Confirm verification'],
 'approve-pi':['APPROVE_PI','Review PI approval','Approve PI'],
 'approve-amendment':['APPROVE_AMENDMENT','Review PO revision','Approve revision'],
 'authorize-payment':['AUTHORIZE_PAYMENT','Review payment authorization','Authorize payment'],
 'approve-artwork':['APPROVE_ARTWORK','Review order artwork','Approve artwork'],
 'approve-spec':['APPROVE_SPEC','Review technical specification','Approve specification'],
 'approve-brand-delta':['APPROVE_BRAND_DELTA','Review brand requirements','Approve requirements'],
 'approve-brand-artwork':['APPROVE_BRAND_ARTWORK','Review brand artwork','Approve artwork']
});

export function approvalReviewCommand(d,form){
 const entry=REVIEW_ACTIONS[d.approvalAction];
 if(!entry)throw new Error('Unknown approval review.');
 if(!form.has('reviewConfirmed'))throw new Error('Review the details and confirm before continuing.');
 let type=entry[0],payload={orderId:d.id};
 if(['approve-po','approve-pi'].includes(d.approvalAction)){
  if(!['APPROVE','RETURN'].includes(form.get('decision')))throw new Error('Choose approve or return for correction.');
  if(form.get('decision')==='RETURN'){
   const remarks=String(form.get('remarks')||'').trim();
   if(!remarks)throw new Error('Enter a reason for returning this document.');
   type=d.approvalAction==='approve-po'?'RETURN_ORDER':'RETURN_PI';payload.remarks=remarks;
  }
 }
 if(type==='AUTHORIZE_PAYMENT')Object.assign(payload,{termIndex:Number(d.term),shipmentId:d.shipment||null});
 if(type==='APPROVE_SPEC')payload={baseId:d.base,specId:d.spec};
 if(type==='APPROVE_BRAND_DELTA')payload={itemId:d.item};
 if(type==='APPROVE_BRAND_ARTWORK')payload={itemId:d.item,artworkId:d.artwork};
 return {type,payload};
}

export function approvalReviewModal(state,d,{esc,kv,field,checkbox,note,button}){
 const entry=REVIEW_ACTIONS[d.approvalAction];if(!entry)throw new Error('Unknown approval review.');
 const o=state.orders.find(x=>x.id===d.id),base=state.bases.find(x=>x.id===d.base),item=state.items.find(x=>x.id===d.item);
 const files=x=>[...new Set([...(x?.fileIds||[]),x?.fileId].filter(Boolean))].map(id=>{const f=state.files.find(x=>x.id===id);return f?button('Preview '+f.name,'preview-review-file',{file:id},'small')+button('Download','file',{file:id},'small ghost'):note('Evidence file unavailable.','warn');}).join('');
 const terms=t=>{const summary=paymentTermsSummary(t);return `<h3>Payment terms</h3>${t?.name&&t.name!==summary?`<p>${esc(t.name)}</p>`:''}<p>${esc(summary)}</p>`;};
 const lines=(rows,currency)=>`<div class="table-wrap" role="region" aria-label="Order items for review" tabindex="0"><table><thead><tr><th>Item / category</th><th>Brand / specification</th><th>Quantity</th><th>Unit price</th><th>Amount</th></tr></thead><tbody>${rows.map(l=>{const b=state.bases.find(x=>x.id===l.baseId),spec=approvedSpec(state,l.baseId,l.specId);return `<tr><td><b>${esc(l.code)}</b><div>${esc(l.name)}</div><small>${esc(b?.category||'Uncategorised')}</small></td><td>${esc(l.brand)}<div>${esc(spec?.version||'PLM unavailable')}</div></td><td>${l.quantity}</td><td>${formatMoney(l.unitPriceMinor,currency)}</td><td>${formatMoney(l.quantity*l.unitPriceMinor,currency)}</td></tr>`;}).join('')}</tbody></table></div>`;
 let body='';
 if(o){
  const v=state.vendors.find(x=>x.id===o.vendorId);
  body=`<div class="kv-grid">${kv('Supplier',esc(v?.name||''))}${kv('PO / revision',esc(o.number)+' / '+o.revision)}${kv('Purchase owner',esc(state.users.find(x=>x.id===o.buyerId)?.name||''))}${kv('Order total',formatMoney(orderTotal(o),o.currency))}${kv('Required India-port date',esc(o.requestedPortDate||'Not entered'))}${kv('Supplier production days',esc(o.productionDays))}${kv('Total planned days to India port',esc(o.planningTat||'Not entered'))}${kv('Route',esc(state.routes.find(x=>x.id===o.routeId)?.name||'Not selected'))}${kv('Payment method / trade term',esc(o.paymentMethod)+' / '+esc(o.incoterm||''))}${kv('Planning basis',esc(o.planningMode||'Previously recorded total'))}${kv('Planning override reason',esc(o.planningOverrideReason||'None'))}${kv('Production override reason',esc(o.productionOverrideReason||'None'))}${kv('Cost centre / warehouse',esc(o.costCenter||'Not set')+' / '+esc(o.warehouse||'Not set'))}${kv('Channel / demand reference',esc(o.channel||'Not set')+' / '+esc(o.demandReference||'Not set'))}</div>${terms(o.paymentTerms)}${lines(o.lines,o.currency)}<h3>Commercial remarks</h3><p class="spec-text">${esc(o.notes||'None')}</p>`;
  if(['submit-po','approve-po','approve-amendment'].includes(d.approvalAction)){
   body+=o.lines.map(l=>{const spec=approvedSpec(state,l.baseId,l.specId);return `<details><summary>${esc(l.code)} — technical and brand requirements</summary><pre class="spec-text">${esc(spec?.description||'No approved PLM specification. This remains a visible warning.')}</pre><dl>${Object.entries(spec?.fieldValues||{}).map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl><p>${esc(l.artworkNotes||'No additional brand requirements.')}</p>${files(spec)}</details>`;}).join('');
   const gaps=issueReadiness(state,o);if(gaps.length){body+=note('Complete before submission / issue: '+gaps.map(esc).join('; '),'warn');if(d.approvalAction==='submit-po')return {title:entry[1],sub:o.number,wide:true,submit:null,body:body+button('Edit planning and order details','edit-draft',{id:o.id},'primary')};}
  }
  if(['verify-pi','approve-pi'].includes(d.approvalAction)){
   const pi=o.pi;if(!pi)throw new Error('PI is no longer available. Close and refresh.');
   const values=[['Currency',o.currency,pi.currency],['Quantity',o.lines.reduce((n,l)=>n+l.quantity,0),pi.quantity],['Total',formatMoney(orderTotal(o),o.currency),formatMoney(pi.amountMinor,pi.currency)]];
   body=`<h3>Supplier PI ${esc(pi.number)}</h3><p>Date: ${esc(pi.date)} · Status: ${esc(pi.status)}</p><div class="table-wrap"><table><thead><tr><th>Check</th><th>PO</th><th>Supplier PI</th><th>Result</th></tr></thead><tbody>${values.map(([label,a,b])=>`<tr><th>${label}</th><td>${esc(a)}</td><td>${esc(b)}</td><td>${a===b?'Match':'Mismatch — correction required'}</td></tr>`).join('')}</tbody></table></div><p>Payment terms confirmed: ${pi.termsConfirmed?'Yes':'No'} · Production commitment confirmed: ${pi.commitmentConfirmed?'Yes':'No'}</p>${pi.returnReason?note('Returned for correction: '+esc(pi.returnReason),'warn'):''}<div class="flex wrap">${files(pi)}</div><div class="gap"></div>`+body;
  }
  if(d.approvalAction==='approve-amendment'){
   const a=o.amendment;if(!a)throw new Error('No revision is pending.');
   body+=`<h3>Proposed revision</h3><p>${esc(a.reason)}</p>${lines(a.lines,o.currency)}${terms(a.paymentTerms)}${note('Approval issues a new revision and requires renewed supplier acknowledgement and PI verification.','warn')}`;
  }
  if(d.approvalAction==='authorize-payment'){
   const m=paymentSchedule(state,o).find(x=>x.index===Number(d.term)&&(x.shipmentId||'')===(d.shipment||''));if(!m)throw new Error('Payment milestone is no longer available.');
   body=`<h3>${esc(m.name)}</h3><div class="kv-grid">${kv('Obligation',formatMoney(m.amount,o.currency))}${kv('Already reported',formatMoney(m.reported,o.currency))}${kv('Remaining obligation',formatMoney(Math.max(0,m.amount-m.reported),o.currency))}${kv('Due / trigger',esc(m.due||'Awaiting '+m.trigger))}</div>${note('Authorization records permission. It does not transfer money.','blue')}`+body;
  }
  if(d.approvalAction==='approve-artwork'){const a=o.artwork.pending;if(!a)throw new Error('No artwork is pending.');body=`<h3>${esc(a.label)}</h3><p>${esc(a.remarks)}</p>${files(a)}`+body;}
 }else if(base){
  const spec=base.specifications.find(x=>x.id===d.spec);if(!spec)throw new Error('Specification unavailable.');
  body=`<h3>${esc(base.code)} · ${esc(base.productName)} · ${esc(spec.version)}</h3><p>${esc(spec.changeSummary||'')}</p><p>${esc(spec.reason||'')}</p><pre class="spec-text">${esc(spec.description||'')}</pre><dl>${Object.entries(spec.fieldValues||{}).map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>${files(spec)}`;
 }else if(item){
  const a=d.approvalAction==='approve-brand-artwork'?item.artworkRevisions?.find(x=>x.id===d.artwork):item;
  if(!a)throw new Error('Brand revision unavailable.');
  body=`<h3>${esc(item.code)} · ${esc(item.name)}</h3><p>${esc(item.brand)}</p><pre class="spec-text">${esc(a===item?item.artworkNotes||Object.entries(item.brandDelta||{}).map(([k,v])=>k+': '+v).join('\n'):a.description||a.remarks||'No additional remarks recorded.')}</pre>${files(a)}`;
 }else throw new Error('Review record unavailable. Close and refresh.');
 body+='<div id="approval-document-preview" aria-live="polite"></div><div class="gap"></div>';
 const choose=['approve-po','approve-pi'].includes(d.approvalAction);
 if(choose)body+=field('decision','Decision','','select',{required:true,options:[{value:'',label:'Select a decision'},{value:'APPROVE',label:entry[2]},{value:'RETURN',label:'Return for correction'}]})+field('remarks','Reason if returning for correction','','textarea');
 body+=checkbox('reviewConfirmed','I have reviewed these details and the supporting documents.');
 return {title:entry[1],sub:o?.number||base?.code||item?.code,body,wide:true,submit:choose?'Confirm decision':entry[2]};
}
