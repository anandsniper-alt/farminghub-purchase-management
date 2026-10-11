const lpSource=(state,id)=>{for(const po of state.orders){const line=po.lines.find(l=>l.id===id);if(line)return {po,line};}throw Error('Selected item unavailable.');};
const lpPosition=(state,id)=>({available:lpSource(state,id).line.available});
const lpEscape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function loadingPickerMarkup(){return '<div id="loading-picker"></div><input type="hidden" name="selection-state" value="">';}

// One decision at a time. All selections remain in a form-local draft until Save.
export function mountLoadingPicker(form,state,routeFields){
  const plan=null;
  const supplierLabel=id=>state.supplierNames[id]||id;
  const root=form.querySelector('#loading-picker');
  const lines=new Map((plan?.lines||[]).map(l=>[l.lineId,l.qty]));
  const orderIds=new Set([...lines.keys()].map(id=>lpSource(state,id).po.id));
  const suppliers=new Set(state.orders.filter(o=>orderIds.has(o.id)).map(o=>o.supplier));
  const allSuppliers=[...new Set(state.orders.map(o=>o.supplier))];
  const positions=Object.fromEntries(state.orders.flatMap(o=>o.lines.map(l=>[l.id,lpPosition(state,l.id,plan?.id)])));
  let step=plan?3:1,query='',pendingRemoval=null;
  const orderAvailable=o=>o.lines.reduce((n,l)=>n+positions[l.id].available,0);
  const total=()=>[...lines.values()].reduce((n,q)=>n+(Number.isFinite(q)?q:0),0);
  const selectedLines=()=>[...lines].map(([lineId,qty])=>({lineId,qty}));
  root.innerHTML=`<ol class="lp-picker-steps" aria-label="Loading plan steps">${['Suppliers','Purchase orders','Items & quantities'].map((title,i)=>`<li><button type="button" data-lp-picker-step="${i+1}"><span>${i+1}</span>${title}</button></li>`).join('')}</ol>
    <div class="lp-picker-notice" role="alert" hidden></div>
    <section class="lp-picker-stage" data-lp-picker-panel="1"><h3 tabindex="-1">1. Which supplier?</h3><p>Choose one supplier. Tick another only when combining suppliers in this load.</p><div class="lp-picker-cards">${!allSuppliers.length?'<p class="muted">No items are available to plan. Orders need an approved PI, production started and unreserved quantities.</p>':''}${allSuppliers.map((supplier,i)=>{const orders=state.orders.filter(o=>o.supplier===supplier&&orderAvailable(o)>0),qty=orders.reduce((n,o)=>n+orderAvailable(o),0);return `<label class="lp-picker-card"><input type="checkbox" data-supplier-index="${i}" aria-label="Select ${lpEscape(supplierLabel(supplier))}" ${suppliers.has(supplier)?'checked':''} ${qty?'':'disabled'}><span><b>${lpEscape(supplierLabel(supplier))}</b><small>${orders.length} POs · ${qty} units available to plan</small></span></label>`;}).join('')}</div></section>
    <section class="lp-picker-stage" data-lp-picker-panel="2" hidden><h3 tabindex="-1">2. Which purchase orders?</h3><p>Only POs from your selected suppliers appear here.</p><div class="lp-picker-cards">${state.orders.map(o=>`<label class="lp-picker-card" data-order-card="${o.id}"><input type="checkbox" data-order-id="${o.id}" aria-label="Select ${lpEscape(o.number)}" ${orderIds.has(o.id)?'checked':''} ${orderAvailable(o)?'':'disabled'}><span><b>${lpEscape(o.number)}</b><small>${lpEscape(supplierLabel(o.supplier))} · PI ${lpEscape(o.pi)}</small><small>${orderAvailable(o)} units available to plan</small></span></label>`).join('')}</div></section>
    <section class="lp-picker-stage" data-lp-picker-panel="3" hidden><h3 tabindex="-1">3. Tick items and enter quantities</h3><p>Use “Select all items” for a full order, or tick only what you want to plan.</p><label class="lp-picker-search">Find an item<input type="search" aria-label="Find an item in selected POs" placeholder="Item name, code or brand"></label>
      <div class="lp-picker-groups">${state.orders.map(o=>`<section class="lp-picker-order" data-item-group="${o.id}"><div class="lp-picker-order-head"><div><h4>${lpEscape(o.number)} · ${lpEscape(supplierLabel(o.supplier))}</h4><small>${lpEscape(o.pi)}</small></div><button type="button" class="button small" data-select-order="${o.id}" aria-label="Select all items from ${lpEscape(o.number)}">Select all items</button></div><div class="lp-picker-item-list">${o.lines.map(l=>`<div class="lp-picker-item" data-line-card="${l.id}"><label class="lp-picker-item-label"><input type="checkbox" data-item-id="${l.id}" aria-label="Select ${lpEscape(o.number)} ${lpEscape(l.code)}" ${lines.has(l.id)?'checked':''} ${positions[l.id].available?'':'disabled'}><span><b>${lpEscape(l.name)}</b><small>${lpEscape(l.code)} · ${lpEscape(l.brand)}</small><small>${positions[l.id].available} available</small></span></label><label class="lp-picker-qty">Plan qty<input type="number" data-qty-id="${l.id}" aria-label="Plan quantity ${lpEscape(o.number)} ${lpEscape(l.code)}" min="1" max="${positions[l.id].available}" step="1" required value="${lines.get(l.id)??positions[l.id].available}" ${lines.has(l.id)?'':'disabled'}></label></div>`).join('')}</div><p class="lp-picker-no-match" hidden>No matching items in this PO.</p></section>`).join('')}</div>
      <p class="lp-picker-empty-search" hidden>No items match this search. Clear it to see your selected POs.</p><div class="lp-picker-review" aria-live="polite"></div>
      <div data-loading-route-fields></div><p class="small muted spaced">Planning reserves quantities. Confirming actual loading later reduces the PO balance. Goods can be planned before they are ready.</p></section>`;
  root.querySelector('[data-loading-route-fields]').innerHTML=routeFields;
  const footer=form.querySelector('.modal-foot'),save=footer.querySelector('[type=submit]');
  footer.insertAdjacentHTML('afterbegin','<div class="lp-picker-footer-summary" aria-live="polite"></div>');
  save.insertAdjacentHTML('beforebegin','<button type="button" class="button" data-lp-picker-back>Back</button><button type="button" class="button primary" data-lp-picker-next>Choose purchase orders →</button>');
  const back=footer.querySelector('[data-lp-picker-back]'),next=footer.querySelector('[data-lp-picker-next]'),notice=root.querySelector('.lp-picker-notice');
  function showError(message){notice.hidden=false;notice.textContent=message;notice.tabIndex=-1;notice.focus();}
  function clearNotice(){notice.hidden=true;notice.replaceChildren();pendingRemoval=null;}
  function update(){
    root.querySelectorAll('[data-lp-picker-panel]').forEach(e=>e.hidden=Number(e.dataset.lpPickerPanel)!==step);
    root.querySelectorAll('[data-lp-picker-step]').forEach(e=>{const n=Number(e.dataset.lpPickerStep);e.disabled=n>step;e.setAttribute('aria-current',n===step?'step':'false');});
    root.querySelectorAll('[data-order-card]').forEach(e=>e.hidden=!suppliers.has(state.orders.find(o=>o.id===e.dataset.orderCard).supplier));
    let matchGroups=0;
    root.querySelectorAll('[data-item-group]').forEach(group=>{const o=state.orders.find(o=>o.id===group.dataset.itemGroup);group.hidden=!orderIds.has(o.id);let matches=0;group.querySelectorAll('[data-line-card]').forEach(card=>{const {line}=lpSource(state,card.dataset.lineCard);card.hidden=!!query&&!`${line.name} ${line.code} ${line.brand}`.toLowerCase().includes(query);if(!card.hidden)matches++;});group.querySelector('.lp-picker-no-match').hidden=matches>0;const pickAll=group.querySelector('[data-select-order]');pickAll.textContent=query?'Select matching items':'Select all items';pickAll.setAttribute('aria-label',`${query?'Select matching items':'Select all items'} from ${lpEscape(o.number)}`);pickAll.disabled=!o.lines.some(l=>positions[l.id].available>0&&(!query||`${l.name} ${l.code} ${l.brand}`.toLowerCase().includes(query)));if(!group.hidden&&matches)matchGroups++;});
    root.querySelector('.lp-picker-empty-search').hidden=matchGroups>0;
    root.querySelectorAll('[data-supplier-index]').forEach(e=>e.checked=suppliers.has(allSuppliers[Number(e.dataset.supplierIndex)]));
    root.querySelectorAll('[data-order-id]').forEach(e=>e.checked=orderIds.has(e.dataset.orderId));
    root.querySelectorAll('[data-item-id]').forEach(e=>e.checked=lines.has(e.dataset.itemId));
    root.querySelectorAll('[data-qty-id]').forEach(e=>{e.disabled=!lines.has(e.dataset.qtyId);if(document.activeElement!==e)e.value=String(lines.get(e.dataset.qtyId)??positions[e.dataset.qtyId].available);});
    const finalOrders=new Set([...lines.keys()].map(id=>lpSource(state,id).po.id)),finalSuppliers=new Set([...lines.keys()].map(id=>lpSource(state,id).po.supplier));
    const supplierCount=step===3?finalSuppliers.size:suppliers.size,orderCount=step===3?finalOrders.size:orderIds.size;
    const summary=step===1?`${suppliers.size} supplier${suppliers.size===1?'':'s'} selected`:step===2?`${orderIds.size} purchase order${orderIds.size===1?'':'s'} selected`:`${supplierCount} supplier${supplierCount===1?'':'s'} · ${orderCount} PO${orderCount===1?'':'s'} · ${lines.size} items · ${total()} units`;
    footer.querySelector('.lp-picker-footer-summary').textContent=summary;
    form.elements['selection-state'].value=JSON.stringify({suppliers:[...suppliers].sort(),orderIds:[...orderIds].sort(),lines:selectedLines().sort((a,b)=>a.lineId.localeCompare(b.lineId))});
    const selectedOrders=state.orders.filter(o=>o.lines.some(l=>lines.has(l.id)));
    root.querySelector('.lp-picker-review').innerHTML=`<b>In this loading plan: ${lines.size} items · ${total()} units</b>${selectedOrders.length?`<ul>${selectedOrders.map(o=>`<li>${lpEscape(o.number)} · ${lpEscape(supplierLabel(o.supplier))} — ${o.lines.filter(l=>lines.has(l.id)).reduce((n,l)=>n+(lines.get(l.id)||0),0)} units</li>`).join('')}</ul>`:'<p>Tick at least one item to continue.</p>'}${query?'<small>Summary includes selected items hidden by your search.</small>':''}`;
    back.hidden=step===1;next.hidden=step===3;save.hidden=step!==3;next.disabled=!!pendingRemoval||(step===1?!suppliers.size:!orderIds.size);save.disabled=!!pendingRemoval||!lines.size;
    next.textContent=step===1?'Choose purchase orders →':'Choose items →';
  }
  function go(n){clearNotice();step=n;update();root.querySelector(`[data-lp-picker-panel="${n}"] h3`).focus();form.querySelector('.modal-body').scrollTop=0;}
  function removeOrder(id){orderIds.delete(id);for(const l of state.orders.find(o=>o.id===id).lines)lines.delete(l.id);}
  function removeWithReview(label,affected,action){
    if(!affected.some(id=>lines.has(id))){action();update();return;}
    pendingRemoval=action;notice.hidden=false;notice.innerHTML=`<p>Remove ${lpEscape(label)} and its ${affected.filter(id=>lines.has(id)).length} selected items from this draft?</p><div class="actions spaced"><button type="button" class="button" data-keep-selection>Keep selection</button><button type="button" class="button danger" data-confirm-removal>Remove from draft</button></div>`;update();notice.querySelector('[data-keep-selection]').onclick=()=>{clearNotice();update();};notice.querySelector('[data-confirm-removal]').onclick=()=>{pendingRemoval();clearNotice();update();};notice.querySelector('[data-keep-selection]').focus();
  }
  root.querySelectorAll('[data-supplier-index]').forEach(input=>input.onchange=()=>{clearNotice();const supplier=allSuppliers[Number(input.dataset.supplierIndex)];if(input.checked){suppliers.add(supplier);update();}else{const orders=state.orders.filter(o=>o.supplier===supplier);removeWithReview(supplierLabel(supplier),orders.flatMap(o=>o.lines.map(l=>l.id)),()=>{suppliers.delete(supplier);orders.forEach(o=>removeOrder(o.id));});}});
  root.querySelectorAll('[data-order-id]').forEach(input=>input.onchange=()=>{clearNotice();const id=input.dataset.orderId;if(input.checked){orderIds.add(id);update();}else removeWithReview(state.orders.find(o=>o.id===id).number,state.orders.find(o=>o.id===id).lines.map(l=>l.id),()=>removeOrder(id));});
  root.querySelectorAll('[data-item-id]').forEach(input=>input.onchange=()=>{clearNotice();const id=input.dataset.itemId;if(input.checked)lines.set(id,positions[id].available);else lines.delete(id);update();});
  root.querySelectorAll('[data-qty-id]').forEach(input=>input.oninput=()=>{lines.set(input.dataset.qtyId,input.value===''?NaN:Number(input.value));update();});
  root.querySelectorAll('[data-select-order]').forEach(button=>button.onclick=()=>{clearNotice();const o=state.orders.find(o=>o.id===button.dataset.selectOrder);for(const l of o.lines)if(positions[l.id].available>0&&!lines.has(l.id)&&(!query||`${l.name} ${l.code} ${l.brand}`.toLowerCase().includes(query)))lines.set(l.id,positions[l.id].available);update();});
  root.querySelector('[type=search]').onkeydown=e=>{if(e.key==='Enter')e.preventDefault();};
  root.querySelector('[type=search]').oninput=e=>{query=e.target.value.trim().toLowerCase();update();};
  root.querySelectorAll('[data-lp-picker-step]').forEach(button=>button.onclick=()=>go(Number(button.dataset.lpPickerStep)));
  back.onclick=()=>go(step-1);next.onclick=()=>{if(step===1&&!suppliers.size)return showError('Choose at least one supplier.');if(step===2&&!orderIds.size)return showError('Choose at least one purchase order.');go(step+1);};
  update();
  return {payload(){if(step!==3)throw Error('Choose your suppliers, purchase orders and items first.');return selectedLines();}};
}
