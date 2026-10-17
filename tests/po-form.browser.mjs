// Browser integration checks. Run only against an isolated createSeed() workspace.
// The local harness supplies the actual app handlers; no business API is used.
export async function runPoFormChecks({context,showDialog,onInput,onChange,onClick,onSubmit,closeModal}) {
 const results=[],assert=(ok,message)=>{if(!ok)throw Error(message);};
 const q=s=>document.querySelector(s),field=name=>q('[name="'+name+'"]');
 const input=(name,value)=>{const el=field(name);assert(el,'Missing '+name);el.value=value;onInput({target:el});return el;};
 const change=async(name,value)=>{const el=field(name);assert(el,'Missing '+name);el.focus({preventScroll:true});el.value=value;await onChange({target:el});return el;};
 const click=async selector=>{const el=q(selector);assert(el,'Missing '+selector);await onClick({target:el});};
 const {state}=context(),base=state.bases[0],vendor=state.vendors.find(v=>v.id===base.vendorId);
 // The old bundled seed predates explicit brandPrefix on mapped ERP items.
 for(const item of state.items.filter(i=>i.baseId))item.brandPrefix ||= state.brands.find(b=>b.name===item.brand)?.prefix;
 // Two products for one supplier, with different approved technical versions.
 const other={...structuredClone(base),id:'test-second-base',code:'TEST-SECOND',productName:'Demo second item',specifications:base.specifications.map(s=>({...structuredClone(s),id:'second-'+s.id}))};
 state.bases.push(other);
 for(const item of state.items.filter(i=>i.baseId===base.id))state.items.push({...structuredClone(item),id:'second-'+item.id,baseId:other.id,code:'SECOND-'+item.code});
 const confirm=window.confirm;let approve=true;window.confirm=()=>approve;
 try {
  showDialog('new-order');await change('vendorId',vendor.id);
  const form=q('#dialog-form'),body=q('.modal-body'),sheet=q('.po-sheet-scroll'),notes=field('notes');
  q('.po-terms').open=true;input('notes','Keep my unsaved commercial remarks');input('warehouse','Demo warehouse');
  body.scrollTop=300;sheet.scrollLeft=90;const top=body.scrollTop,left=sheet.scrollLeft;
  const stable=()=>{assert(q('#dialog-form')===form,'Dialog form was rebuilt');assert(q('.modal-body')===body&&q('.po-sheet-scroll')===sheet,'Scroll containers replaced');assert(field('notes')===notes&&notes.value==='Keep my unsaved commercial remarks','Remarks lost');assert(q('.po-terms').open,'Expanded terms collapsed');};
  const select=await change('base-0',base.id);stable();assert(field('base-0')===select&&document.activeElement===select,'Item selector lost focus/identity');assert(body.scrollTop===top&&sheet.scrollLeft===left,'Selecting item moved scroll');
  assert(!field('qty-0-GJ').disabled,'Item quantity not enabled');assert(field('spec-0').value===context().ui.draft.basePlans[0].specId,'Technical version stale');
  const qty=input('qty-0-GJ','5');input('baseprice-0','123.45');assert(q('[data-po-total]').textContent.includes('617.25'),'Total not recalculated');assert(field('allocation-0-GJ-TN').value==='5','Cost centre allocation stale');results.push('Item selection preserves form, focus and scroll; quantities, versions, prices and allocations update.');
  await click('[data-action="add-base-plan"]');stable();assert(field('qty-0-GJ')===qty&&qty.value==='5','Adding row lost quantity');assert(![...field('base-1').options].some(o=>o.value===base.id),'Duplicate item offered');
  await change('base-1',other.id);input('qty-1-GJ','3');input('baseprice-1','20');assert(q('[data-po-total]').textContent.includes('677.25'),'Second row total incorrect');
  const snapshot=JSON.stringify(context().ui.draft);approve=false;await change('base-0','');assert(JSON.stringify(context().ui.draft)===snapshot&&field('base-0').value===base.id,'Cancelled item change modified draft');approve=true;
  await click('[data-action="remove-base-plan"][data-index="1"]');stable();assert(!field('base-1')&&field('qty-0-GJ').value==='5','Remove row corrupted remaining row');
  await click('[data-action="pick-po-item"][data-base="'+other.id+'"]');stable();assert(field('base-1').value===other.id,'Catalog Add failed');assert(body.scrollTop===top&&sheet.scrollLeft===left,'Catalog Add moved scroll');
  input('qty-1-GJ','3');input('baseprice-1','20');await click('[data-action="remove-base-plan"][data-index="0"]');stable();assert(field('base-0').value===other.id&&field('qty-0-GJ').value==='3'&&field('baseprice-0').value==='20','Removing first row left stale controls');results.push('Add/remove rows, catalog Add, duplicate prevention and cancellation work without rebuilding the form.');
  const manual=field('baseprice-0').value;await change('currency','USD');
  await change('priceListCurrency','CNY');stable();assert(field('priceListFxRate'),'FX fields missing');assert(field('baseprice-0').value===manual,'Manual price overwritten');
  await change('priceListCurrency','USD');stable();assert(!field('priceListFxRate'),'Obsolete FX fields retained');
  const terms=field('terms'),option=[...terms.options].find(o=>o.value&&o.value!==terms.value);if(option){await change('terms',option.value);stable();assert(field('terms')===terms,'Payment terms control replaced');}
  const days=field('productionDays');days.focus({preventScroll:true});input('productionDays','91');stable();assert(document.activeElement===days&&field('productionDays')===days,'Production input lost focus');assert(field('productionOverrideReason'),'Override reason not added');input('productionOverrideReason','Demo agreed extension');input('productionDays','92');assert(field('productionOverrideReason').value==='Demo agreed extension','Override reason lost while typing');
  results.push('Currency/FX fields, payment templates and production-day typing retain entered data and focus.');
  q('.cost-centre-dropdown').open=true;const centre=q('[data-cost-centre]:not(:checked)');centre.checked=true;centre.focus({preventScroll:true});await onChange({target:centre});stable();assert(q('[data-cost-centre="'+centre.value+'"]')===centre&&centre.checked,'Cost centre checkbox replaced/reset');
  const split=field('allocation-0-GJ-TN');input(split.name,'2');input('allocation-0-GJ-'+centre.value,'1');const allocScroll=q('.cost-centre-scroll');input('qty-0-GJ','4');assert(q('.cost-centre-scroll')===allocScroll&&field(split.name)===split&&split.value==='2','Quantity edit reset allocation form');assert(q('[data-cost-centre-status]').textContent.includes('1 remaining'),'Allocation mismatch not reported');input('qty-0-GJ','3');
  // Confirm replacing an item clears that row's quantities and cost splits.
  await change('base-0',base.id);stable();assert(field('qty-0-GJ').value==='0'&&!q('[data-cost-allocation]'),'Confirmed item replacement retained obsolete quantities');
  input('qty-0-GJ','5');input('baseprice-0','123.45');input('allocation-0-GJ-TN','3');input('allocation-0-GJ-'+centre.value,'2');
  results.push('Cost centre selection and split editing remain stable; confirmed item replacement clears obsolete allocations.');
  // Exercise real save validation and commands, confined to test localStorage.
  const count=context().state.orders.length;assert(form.checkValidity(),'Fixture has invalid HTML fields');await onSubmit({target:form,preventDefault(){}});
  assert(context().state.orders.length===count+1,'Draft save failed: '+(q('#modal-error')?.textContent||''));
  const saved=context().state.orders.at(-1);assert(saved.notes==='Keep my unsaved commercial remarks'&&saved.lines[0].quantity===5,'Saved draft values incorrect');
  showDialog('edit-draft',{id:saved.id});const edit=q('#dialog-form'),editSelect=field('base-0');await click('[data-action="add-base-plan"]');assert(q('#dialog-form')===edit&&field('base-0')===editSelect,'Edit draft rebuilt');await click('[data-action="remove-base-plan"][data-index="1"]');input('qty-0-GJ','6');input('allocation-0-GJ-TN','4');await onSubmit({target:edit,preventDefault(){}});assert(context().state.orders.find(o=>o.id===saved.id).lines[0].quantity===6,'Edited draft did not save');
  results.push('New draft save, reopen and edit-save retain the correct quantities and allocations.');
  closeModal();showDialog('new-order');const supplierForm=q('#dialog-form');await change('vendorId',vendor.id);await change('base-0',base.id);input('qty-0-GJ','2');
  const nextVendor=state.vendors.find(v=>v.id!==vendor.id&&v.kind==='SUPPLIER'&&v.status==='ACTIVE');const prior=JSON.stringify(context().ui.draft);approve=false;await change('vendorId',nextVendor.id);assert(JSON.stringify(context().ui.draft)===prior,'Cancelled supplier change lost draft');approve=true;await change('vendorId',nextVendor.id);assert(q('#dialog-form')===supplierForm&&!field('base-0').value&&field('qty-0-GJ').disabled,'Supplier change did not reset item controls correctly');
  results.push('Supplier-change cancellation and confirmed reset both preserve the dialog correctly.');
  return results;
 } finally {window.confirm=confirm;}
}
