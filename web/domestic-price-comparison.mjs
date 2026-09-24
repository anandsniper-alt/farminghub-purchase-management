import {compareDomesticSuppliers,compareDomesticQuotes,domesticQuoteHistory} from '../shared/domestic-prices.mjs';
import {softwareReference} from '../shared/references.mjs';

export function createDomesticPriceComparison(host){
 const {context,esc,field,note,showDialog,renderModal,money,picture,identity,hydrate,badge}=host;
 let view=null;
 const state=()=>context().state;
 function vendors(){const map=new Map();for(const q of state().domesticPriceLists||[])map.set(q.vendorId,{id:q.vendorId,code:q.vendorCode,name:q.vendorName});return [...map.values()].sort((a,b)=>a.code.localeCompare(b.code));}
 function resetQuotes(){const history=domesticQuoteHistory(state(),view.vendorId);view.oldId=history.at(-2)?.id||'';view.newId=history.at(-1)?.id||'';}
 function options(){return [{value:'',label:'Select quotation'},...domesticQuoteHistory(state(),view.vendorId).slice().reverse().map(q=>({value:q.id,label:q.quoteDate+' · '+q.quoteReference+' · '+softwareReference(state(),'domesticPriceLists',q.id)}))];}
 function priceCell(line){return line?money(line.rateMinor)+'<div class="sub">per '+esc(line.uom)+(line.rateMinor===0?' · Zero rate':'')+'</div>':'<span class="muted">Not quoted</span>';}
 function table(){
  const filter=item=>(item.code+' '+item.description).toLowerCase().includes(view.query.trim().toLowerCase());
  if(view.mode==='SUPPLIERS'){
   const selected=vendors().filter(v=>view.vendorIds.includes(v.id)),rows=compareDomesticSuppliers(state(),selected.map(v=>v.id)).filter(r=>filter(r.item));
   if(!selected.length)return note('Select at least one supplier.');if(!rows.length)return note('No quoted items match this selection.');
   return '<p class="small muted">Latest quote by date for each item and supplier. Same-date ties use the last saved quote. Missing prices are not zero. Lowest marks comparable unit rates only.</p><div class="table-wrap"><table class="domestic-price-comparison" aria-label="Supplier prices side by side"><thead><tr><th>Picture</th><th>Item / BOM code</th><th>UOM</th>'+selected.map(v=>'<th>'+esc(v.code)+'<div class="sub">'+esc(v.name)+'</div></th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr><td>'+picture(r.item)+'</td><td>'+identity(r.item)+'</td><td>'+esc(r.item.uom)+'</td>'+r.cells.map(c=>'<td>'+priceCell(c.quote)+(c.quote?'<div class="sub">'+esc(c.quote.quoteReference)+' · '+esc(c.quote.quoteDate)+'</div>':'')+(c.unitMismatch?badge('Different UOM','amber'):c.lowest?badge('Lowest','green'):'')+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
  }
  if(!view.oldId||!view.newId)return note('Choose two quotations from this supplier. Save another quotation if only one is available.');
  let compared;try{compared=compareDomesticQuotes(state(),view.vendorId,view.oldId,view.newId);}catch(e){return note(e.message,'warn');}
  const rows=compared.rows.filter(r=>filter(r.item));if(!rows.length)return note('No quoted items match this search.');
  const labels={NEW_ITEM:'Newly quoted',NOT_QUOTED:'Not in new quote',UOM_CHANGED:'Different UOM',INCREASED:'Increased',DECREASED:'Decreased',UNCHANGED:'Unchanged'};
  return '<p class="small muted">Only the two selected quotations are compared. A missing item is not treated as zero. Percentage change is unavailable when the old rate is zero or the UOM differs.</p><div class="table-wrap"><table class="domestic-price-comparison" aria-label="Old and new supplier prices"><thead><tr><th>Picture</th><th>Item / BOM code</th><th>Old price<div class="sub">'+esc(compared.oldQuote.quoteReference)+' · '+esc(compared.oldQuote.quoteDate)+'</div></th><th>New price<div class="sub">'+esc(compared.newQuote.quoteReference)+' · '+esc(compared.newQuote.quoteDate)+'</div></th><th>Difference</th><th>Change</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+picture(r.item)+'</td><td>'+identity(r.item)+'</td><td>'+priceCell(r.oldLine)+'</td><td>'+priceCell(r.newLine)+'</td><td>'+(r.deltaMinor==null?'—':(r.deltaMinor>0?'+':'')+money(r.deltaMinor))+'<div class="sub">'+(r.percentText||'Percentage not applicable')+'</div></td><td>'+badge(labels[r.status],r.status==='DECREASED'?'green':r.status==='INCREASED'?'red':r.status==='UNCHANGED'?'gray':'amber')+'</td></tr>').join('')+'</tbody></table></div>';
 }
 function refresh(){const target=document.getElementById('domestic-compare-results');if(target){target.innerHTML=table();hydrate();}}
 function modal(){
  queueMicrotask(refresh);
  const list=vendors();return {title:'Compare supplier prices',sub:'INR per item UOM · before GST, freight and other charges',wide:true,submit:null,body:!list.length?note('Save a supplier price list using Enter prices or Upload price list, then return here to compare.'):field('priceCompareMode','Comparison',view.mode,'select',{options:[{value:'SUPPLIERS',label:'Across suppliers'},{value:'HISTORY',label:'Same supplier · old vs new'}]})+(view.mode==='SUPPLIERS'?'<fieldset class="domestic-compare-suppliers"><legend>Suppliers to compare</legend>'+list.map(v=>'<label><input type="checkbox" data-compare-supplier="'+esc(v.id)+'" '+(view.vendorIds.includes(v.id)?'checked':'')+'> '+esc(v.code+' · '+v.name)+'</label>').join('')+'</fieldset>':'<div class="form-grid">'+field('priceCompareVendor','Supplier',view.vendorId,'select',{options:list.map(v=>({value:v.id,label:v.code+' · '+v.name}))})+field('priceCompareOld','Old quotation',view.oldId,'select',{options:options()})+field('priceCompareNew','New quotation',view.newId,'select',{options:options()})+'</div>')+field('priceCompareSearch','Find item',view.query,'search',{attrs:'placeholder="Item name or code"'})+'<div id="domestic-compare-results" aria-live="polite"></div>'};
 }
 function action(a){if(a!=='domestic-price-compare')return false;const list=vendors();view={mode:'SUPPLIERS',vendorIds:list.map(v=>v.id),vendorId:list[0]?.id||'',oldId:'',newId:'',query:''};resetQuotes();showDialog(a,{});return true;}
 function change(el){if(context().ui.modal!=='domestic-price-compare')return false;
  if(el.name==='priceCompareMode'||el.name==='priceCompareVendor'){if(el.name==='priceCompareMode')view.mode=el.value;else{view.vendorId=el.value;resetQuotes();}renderModal();queueMicrotask(()=>document.querySelector('[name="'+el.name+'"]')?.focus());return true;}
  if(el.hasAttribute('data-compare-supplier')){view.vendorIds=[...document.querySelectorAll('[data-compare-supplier]:checked')].map(e=>e.dataset.compareSupplier);refresh();return true;}
  if(el.name==='priceCompareOld'||el.name==='priceCompareNew'){view[el.name==='priceCompareOld'?'oldId':'newId']=el.value;refresh();return true;}
  if(el.name==='priceCompareSearch'){view.query=el.value;refresh();return true;}return false;
 }
 return {modal,action,change};
}
