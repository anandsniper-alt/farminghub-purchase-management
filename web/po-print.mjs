import {companyHtml} from '../shared/company-profile.mjs';
import {costCenterName,costCenterReadiness} from '../shared/cost-centres.mjs';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=value=>Number(value).toLocaleString('en-US');
const money=value=>(Number(value)/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const date=value=>value?new Date(value).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}):'Not recorded';

// Issued revisions are self-contained: never fill historical gaps from today's PO.
export function poPrintSource(order,{revisionIndex,vendor,specificationForLine=()=>null,reference='',demo=false}={}) {
 const issued=(order.revisions||[])[revisionIndex??order.revisions?.length-1];
 const snapshot=issued?.snapshot||{...order,vendor,lines:order.lines.map(line=>({...line,specification:specificationForLine(line)})),attachments:[]};
 return {snapshot,issued:!!issued,revision:issued?.revision??0,date:issued?.at||order.createdAt,actor:issued?.actor||'Pending approval',reference,demo};
}

export function poAllocationSummary(snapshot) {
 const lines=snapshot.lines||[],ids=[...new Set([...(snapshot.costCenterIds||[]),...lines.flatMap(l=>(l.costCenterAllocations||[]).map(a=>a.costCenterId))])];
 const rows=lines.map(line=>{
  const allocations=ids.map(id=>{const quantity=(line.costCenterAllocations||[]).filter(a=>a.costCenterId===id).reduce((n,a)=>n+Number(a.quantity),0);return {id,quantity,value:quantity*line.unitPriceMinor};});
  const allocated=allocations.reduce((n,a)=>n+a.quantity,0);
  return {line,allocations,allocated,remaining:line.quantity-allocated};
 });
 const centres=ids.map(id=>({id,name:costCenterName(id),quantity:rows.reduce((n,r)=>n+r.allocations.find(a=>a.id===id).quantity,0),value:rows.reduce((n,r)=>n+r.allocations.find(a=>a.id===id).value,0)}));
 const quantity=lines.reduce((n,l)=>n+l.quantity,0),value=lines.reduce((n,l)=>n+l.quantity*l.unitPriceMinor,0);
 const recorded=Array.isArray(snapshot.costCenterIds)&&snapshot.costCenterIds.length>0;
 const errors=recorded?costCenterReadiness(snapshot,true):['Item-level cost-centre allocations were not recorded in this '+(snapshot.status==='DRAFT'?'draft.':'record.')];
 return {rows,centres,quantity,value,allocatedQuantity:centres.reduce((n,c)=>n+c.quantity,0),allocatedValue:centres.reduce((n,c)=>n+c.value,0),recorded,errors};
}


// Display-only conversion from the selected PO snapshot. Monetary arithmetic is
// rational BigInt; never convert from an already rounded display unit price.
const whole=value=>{if(!Number.isSafeInteger(value)||value<0)throw Error('Invalid PO amount or quantity.');return BigInt(value);};
const roundRatio=(value,numerator,denominator)=>(2n*value*numerator+denominator)/(2n*denominator);
const fixedAmount=(value,places=2)=>{if(value==null)return 'Not available';const s=value.toString().padStart(places+1,'0');return s.slice(0,-places).replace(/\B(?=(\d{3})+(?!\d))/g,',')+'.'+s.slice(-places);};
export function poCurrencyAmounts(snapshot){
 if(!['USD','CNY'].includes(snapshot.currency))return null;
 const native=snapshot.currency,other=native==='USD'?'CNY':'USD',fx=snapshot.priceConversion;
 const validDate=typeof fx?.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(fx.date)&&!Number.isNaN(Date.parse(fx.date))&&new Date(fx.date).toISOString().slice(0,10)===fx.date;
 const valid=fx&&fx.to===native&&fx.from===other&&Number.isSafeInteger(fx.rate)&&fx.rate>0&&validDate&&[undefined,'DIRECT','USD_CNY'].includes(fx.quote);
 let numerator,denominator,rateText='No valid USD/CNY exchange rate saved on this PO revision.';
 if(valid){
  const rate=BigInt(fx.rate),scale=1000000n;
  if(fx.quote==='USD_CNY'){[numerator,denominator]=native==='USD'?[rate,scale]:[scale,rate];}
  else {[numerator,denominator]=[scale,rate];} // legacy DIRECT: saved rate is native currency per source currency
  const rateLabel=fixedAmount(rate,6).replace(/0+$/,'').replace(/\.$/,'');
  rateText=fx.quote==='USD_CNY'?'1 USD = '+rateLabel+' CNY (RMB)':'1 '+fx.from+' = '+rateLabel+' '+fx.to;
  rateText+=' / '+date(fx.date);
 }
 const rows=(snapshot.lines||[]).map(line=>{const unit=whole(line.unitPriceMinor),amount=unit*whole(line.quantity);return {[native]:{unit:unit*100n,amount},[other]:valid?{unit:roundRatio(unit*100n,numerator,denominator),amount:roundRatio(amount,numerator,denominator)}:null};});
 const lineTotal=rows.reduce((n,row)=>n+row[native].amount,0n),nativeTotal=snapshot.totalMinor==null?lineTotal:whole(snapshot.totalMinor),mismatch=nativeTotal!==lineTotal;
 const totals={[native]:nativeTotal,[other]:valid&&!mismatch?rows.reduce((n,row)=>n+row[other].amount,0n):null};
 return {native,other,rows,totals,valid:!!valid,mismatch,rateText};
}
function dualCurrencyTable(data,lines,quantity,esc){
 const unit=(row,c)=>row[c]?fixedAmount(row[c].unit,c===data.native?4:4):'—';
 const nativeUnit=(row,c)=>c===data.native?fixedAmount(row[c].unit/100n):unit(row,c);
 const header=c=>c==='CNY'?'CNY (RMB)':'USD';
 const cols=['CNY','USD'];
 const table='<h2>01 / Order items</h2><table class="po-dual" aria-label="Purchase order items in CNY and USD"><colgroup><col style="width:5%"><col style="width:14%"><col style="width:20%"><col style="width:7%"><col style="width:13%"><col style="width:14%"><col style="width:13%"><col style="width:14%"></colgroup><thead><tr><th rowspan="2">#</th><th rowspan="2">Item Category</th><th rowspan="2">ERP item / description</th><th rowspan="2" class="po-number">Qty</th>'+cols.map(c=>'<th colspan="2" class="po-currency-group">'+header(c)+'<br><span style="font-weight:normal">'+(c===data.native?'PO currency':'Reference equivalent')+'</span></th>').join('')+'</tr><tr>'+cols.map(()=>'<th class="po-number">Unit price</th><th class="po-number">Amount</th>').join('')+'</tr></thead><tbody>'+lines.map((l,i)=>'<tr><td>'+(i+1)+'</td><td>'+esc(String(l.category||'').trim()||'Not recorded')+'</td><td><b>'+esc(l.code)+'</b><div class="po-desc">'+esc(l.name)+'</div></td><td class="po-number">'+num(l.quantity)+'</td>'+cols.map(c=>'<td class="po-number">'+nativeUnit(data.rows[i],c)+'</td><td class="po-number"><b>'+(data.rows[i][c]?fixedAmount(data.rows[i][c].amount):'—')+'</b></td>').join('')+'</tr>').join('')+'</tbody></table>';
 const totals='<div class="po-total"><span><b>'+num(quantity)+' units</b><br><span class="po-muted">'+lines.length+' ERP item lines</span></span><div class="po-currency-totals">'+cols.map(c=>'<div class="po-number"><div class="po-label">'+(c===data.native?'Total purchase value':'Reference total')+'</div><strong>'+header(c)+' '+fixedAmount(data.totals[c])+'</strong></div>').join('')+'</div></div>';
 const note=data.valid?'Payable currency: '+data.native+'. Converted unit prices are shown to 4 decimals. Each converted line amount uses the original PO line value and is rounded to 2 decimals; the reference total sums those line amounts. Do not calculate line amounts from rounded reference unit prices.':'Payable currency: '+data.native+'. The second currency cannot be calculated until a valid exchange rate is recorded on this PO revision.';
 return table+totals+'<div class="po-end">'+esc(note)+(data.mismatch?'<br>Reference total unavailable: the saved PO total does not match its item values.':'')+'</div>';
}

export const poPrintStyles=`
@page fh-po {size:A4;margin:13mm 13mm 17mm;@bottom-left{content:"FARMING HUB / PURCHASE MANAGEMENT";font:7pt Arial;color:#66766c}@bottom-right{content:"Page " counter(page) " of " counter(pages);font:7pt Arial;color:#66766c}}
.po-document{page:fh-po;font:9pt/1.35 Arial,sans-serif!important;color:#203a2b!important;background:#fff;overflow-wrap:anywhere}
.po-document *{box-sizing:border-box}
.po-document h1,.po-document h2,.po-document h3,.po-document p{margin:0;letter-spacing:normal}
.po-document h1{font-size:21pt;line-height:1.1;color:#204321;margin:4pt 0}
.po-document h2{font-size:12pt;color:#204321;margin:13pt 0 7pt;break-after:avoid}
.po-document h3{font-size:10pt;break-after:avoid}
.po-document .po-head{display:flex;justify-content:space-between;gap:16pt;border-bottom:3pt solid #b3cd39;padding-bottom:10pt;margin-bottom:10pt;break-inside:avoid}
.po-document .po-logo{width:100pt;height:22pt;object-fit:contain;object-position:left center;margin-bottom:4pt}
.po-document .po-kicker{font-size:7pt;font-weight:bold;letter-spacing:1.1pt;text-transform:uppercase;color:#657654}
.po-document .po-ref{text-align:right;max-width:230pt;padding-top:6pt}
.po-document .po-ref strong{font-size:16pt;color:#204321;display:block;margin-bottom:8pt}
.po-document .po-ref p{font-size:8pt;margin-top:3pt;color:#59665e}
.po-document .po-status{display:inline-block;background:#f6f0dd;border:1px solid #d9c58b;color:#755a15;padding:4pt 8pt;font-size:8pt;font-weight:bold;margin-top:6pt}
.po-document .po-status.issued{background:#edf3e8;border-color:#c7d6bb;color:#204321}
.po-document .po-info{display:grid;grid-template-columns:1fr 1fr;gap:6pt 20pt;padding:8pt;background:#f4f6ee;border:1px solid #dce2d3;break-inside:avoid}
.po-document .po-label{font-size:7pt;text-transform:uppercase;letter-spacing:.6pt;color:#657060;margin-bottom:3pt}
.po-document .po-info strong{font-size:10pt}.po-document .po-muted{color:#637168;font-size:8pt}
.po-document table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:8.5pt;line-height:1.35}
.po-document thead{display:table-header-group}.po-document tfoot{display:table-row-group}
.po-document th{background:#204321;color:white;font-weight:bold;font-size:7.5pt;text-align:left;padding:7pt 6pt;border:0;white-space:normal;text-transform:none;letter-spacing:0}
.po-document td{padding:3.5pt 6pt;border:0;border-bottom:1px solid #dfe5d9;vertical-align:top;white-space:normal;color:#203a2b}
.po-document tbody tr:nth-child(even){background:#f7f8f3}.po-document tr{break-inside:avoid}
.po-document .po-number{text-align:right;font-variant-numeric:tabular-nums;overflow-wrap:normal;white-space:nowrap}
.po-document .po-desc{font-size:8pt;color:#58695c;margin-top:1pt}
.po-document .po-total{display:flex;justify-content:space-between;align-items:center;gap:12pt;background:#edf2e4;padding:8pt;margin-top:0;break-inside:avoid;border-top:2pt solid #204321}
.po-document .po-total strong{font-size:17pt;color:#204321}
.po-document .po-dual{font-size:7.5pt}.po-document .po-dual th{font-size:7pt;padding:6pt 4pt;white-space:normal}.po-document .po-dual td{padding:5pt 4pt}.po-document .po-currency-group{text-align:center;border-left:1px solid #7a9470}.po-document .po-dual th[rowspan]{vertical-align:middle}.po-document .po-currency-totals{display:flex;gap:22pt}.po-document .po-currency-totals strong{font-size:13pt}
.po-document .po-notes{display:grid;grid-template-columns:1fr 1fr;gap:20pt;margin-top:10pt;break-inside:avoid}
.po-document .po-notes h3{font-size:9pt;margin-bottom:5pt}.po-document .po-pre{white-space:pre-wrap;line-height:1.5;margin:0;font:inherit}
.po-document .po-warning{padding:8pt 10pt;border-left:3pt solid #b29242;background:#faf4e5;color:#715615;font-size:8pt;margin-top:10pt;break-inside:avoid}
.po-document .po-allocation{break-before:page}
.po-document .po-section-head{display:flex;justify-content:space-between;gap:16pt;border-bottom:2pt solid #b3cd39;padding-bottom:10pt;margin-bottom:14pt}
.po-document .po-section-head h2{font-size:20pt;margin:5pt 0}.po-document .po-section-head p{font-size:8pt;color:#647166}
.po-document .po-check{padding:9pt 10pt;background:#edf3e8;border-left:3pt solid #426942;margin:12pt 0;font-size:8pt;break-inside:avoid}
.po-document .po-check strong{display:block;margin-bottom:3pt}
.po-document .po-allocation-table{font-size:7.5pt}.po-document .po-allocation-table th,.po-document .po-allocation-table td{padding:7pt 4pt}
.po-document .po-allocation-table th.group{text-align:center;background:#36593a;border-left:1px solid #7a9470}
.po-document .po-allocation-table .centre-start{border-left:1px solid #d5decc}
.po-document .po-allocation-table tfoot td{background:#edf2e4;font-weight:bold;border-top:2pt solid #204321}
.po-document .po-tech{break-before:page}.po-document .po-requirements td{padding:9pt 7pt}.po-document .po-requirements tr{break-inside:auto}.po-document .po-requirements .po-pre{line-height:1.5;orphans:3;widows:3}.po-document .po-model{font-size:7.5pt;margin-top:6pt;color:#58695c}.po-document .po-packaging{border-top:1px solid #dfe5d9;margin-top:8pt;padding-top:6pt}.po-document .po-packaging b{display:block;margin-bottom:4pt}.po-document .po-missing-spec{color:#715615;font-style:italic}.po-document .po-spec{border-bottom:1px solid #dce2d3;padding:12pt 0;break-inside:auto}
.po-document .po-spec h3{margin-bottom:5pt}.po-document .po-spec p{margin-top:7pt}
.po-document .po-end{font-size:8pt;color:#66766c;border-top:1px solid #dce2d3;padding-top:8pt;margin-top:12pt;break-inside:avoid}
@media print{.print-sheet.po-document{display:block!important;padding:0!important;margin:0!important;width:auto!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.po-document a{color:inherit;text-decoration:none}}
`;

// A separate print document prevents dashboard fonts, table rules and theme
// animations from changing the PDF. Both the app and PDF QA use this markup.
export function poPrintHtml(data,options={}) {
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>'+esc(data.snapshot.number||'Purchase order')+' - Purchase order and allocations</title><style>html,body{margin:0;padding:0;background:white}</style></head><body><main class="po-document">'+renderPoPrint(data,options)+'</main></body></html>';
}

export function printPurchaseOrder(data,options={}) {
 document.querySelector('iframe[data-po-print]')?.remove();
 const frame=document.createElement('iframe');frame.dataset.poPrint='';frame.title='Purchase order print document';
 frame.style.cssText='position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;pointer-events:none';
 frame.onload=async()=>{
  const doc=frame.contentDocument;
  await Promise.all([...doc.images].map(img=>img.decode().catch(()=>{})));
  await doc.fonts.ready;
  if(frame.isConnected){frame.contentWindow.focus();frame.contentWindow.print();}
 };
 frame.srcdoc=poPrintHtml(data,options);document.body.append(frame);
}

export function renderPoPrint(data,{logo='',terms='',fx=''}={}) {
 const s=data.snapshot,currency=esc(s.currency||''),a=poAllocationSummary(s),lines=s.lines||[],total=s.totalMinor??a.value,dual=poCurrencyAmounts(s);
 const exchangeText=dual?dual.rateText:fx;
 const cell=(label,value)=>'<div><div class="po-label">'+label+'</div>'+value+'</div>';
 const title=esc(s.number||'Unnumbered draft');
 const header=`<header class="po-head"><div>${logo?'<img class="po-logo" src="'+esc(logo)+'" alt="Farming Hub">':''}<h1>Purchase order</h1></div><div class="po-ref"><strong>${title}</strong><p>PO revision ${esc(data.revision)} / ${esc(date(data.date))}</p>${data.issued?'':'<span class="po-status">DRAFT / NOT ISSUED</span>'}</div></header>`;
 const orderTable=dual?dualCurrencyTable(dual,lines,a.quantity,esc):`<h2>01 / Order items</h2><table aria-label="Purchase order items"><colgroup><col style="width:7%"><col style="width:18%"><col style="width:39%"><col style="width:9%"><col style="width:13%"><col style="width:14%"></colgroup><thead><tr><th>#</th><th>Item Category</th><th>ERP item / description</th><th class="po-number">Qty</th><th class="po-number">Unit price<br>${currency}</th><th class="po-number">Amount<br>${currency}</th></tr></thead><tbody>${lines.map((l,i)=>`<tr><td>${i+1}</td><td>${esc(String(l.category||'').trim()||'Not recorded')}</td><td><b>${esc(l.code)}</b><div class="po-desc">${esc(l.name)}</div></td><td class="po-number">${num(l.quantity)}</td><td class="po-number">${money(l.unitPriceMinor)}</td><td class="po-number"><b>${money(l.quantity*l.unitPriceMinor)}</b></td></tr>`).join('')}</tbody></table><div class="po-total"><span><b>${num(a.quantity)} units</b><br><span class="po-muted">${lines.length} ERP item lines</span></span><div class="po-number"><div class="po-label">Total purchase value</div><strong>${currency} ${money(total)}</strong></div></div>`;
 const notes=`<div class="po-notes"><div><h3>Commercial remarks</h3><div class="po-pre">${esc(s.notes||'None recorded.')}</div></div><div><h3>${data.issued?'Issued':'Draft'} document manifest</h3><div class="po-pre">${s.attachments?.length?s.attachments.map(d=>esc(d.name)+(d.fileId?' / '+esc(d.fileId):'')).join('<br>'):data.issued?'No additional files attached at the time of issue.':'No issued document manifest yet.'}</div></div></div><div class="po-end">${data.issued?'Issued by':'Approval'}: ${esc(data.actor)}${data.demo?' / DEMONSTRATION ONLY - not a real commercial order.':''}</div>`;
 const summary=`<table aria-label="Cost centre purchase value summary"><colgroup><col style="width:39%"><col style="width:17%"><col style="width:25%"><col style="width:19%"></colgroup><thead><tr><th>Cost centre</th><th class="po-number">Allocated qty</th><th class="po-number">Purchase value (${currency})</th><th class="po-number">Share of value</th></tr></thead><tbody>${a.centres.map(c=>`<tr><td><b>${esc(c.name)}</b><div class="po-desc">${esc(c.id)}</div></td><td class="po-number">${num(c.quantity)}</td><td class="po-number">${money(c.value)}</td><td class="po-number">${a.value?(100*c.value/a.value).toFixed(2)+'%':'N/A'}</td></tr>`).join('')}</tbody></table>`;
 const detail=a.centres.length?`<h2>Item allocation details</h2><table class="po-allocation-table" aria-label="Item cost centre quantities and purchase values"><colgroup><col style="width:17%"><col style="width:8%"><col style="width:12%">${a.centres.map(()=>'<col style="width:'+21/a.centres.length+'%"><col style="width:'+42/a.centres.length+'%">').join('')}</colgroup><thead><tr><th rowspan="2">ERP item</th><th rowspan="2" class="po-number">PO<br>qty</th><th rowspan="2" class="po-number">Unit price<br>${currency}</th>${a.centres.map(c=>'<th colspan="2" class="group">'+esc(c.name)+'</th>').join('')}</tr><tr>${a.centres.map(()=>'<th class="po-number centre-start">Qty</th><th class="po-number">'+currency+'</th>').join('')}</tr></thead><tbody>${a.rows.map(r=>`<tr><td><b>${esc(r.line.code)}</b>${r.remaining?'<div class="po-desc">'+num(r.remaining)+' unallocated</div>':''}</td><td class="po-number">${num(r.line.quantity)}</td><td class="po-number">${money(r.line.unitPriceMinor)}</td>${r.allocations.map(c=>'<td class="po-number centre-start">'+num(c.quantity)+'</td><td class="po-number">'+money(c.value)+'</td>').join('')}</tr>`).join('')}</tbody><tfoot><tr><td>Total</td><td class="po-number">${num(a.quantity)}</td><td></td>${a.centres.map(c=>'<td class="po-number centre-start">'+num(c.quantity)+'</td><td class="po-number">'+money(c.value)+'</td>').join('')}</tr></tfoot></table>`:'';
 const balanced=!a.errors.length&&a.allocatedValue===total&&a.allocatedQuantity===a.quantity;
 const allocation=`<section class="po-allocation"><header class="po-section-head"><div><div class="po-kicker">03 / Cost-centre allocation</div><h2>Quantity & purchase value</h2><p>${data.issued?'Saved issued revision':'Saved draft'} allocations / ${currency}</p></div><div class="po-ref"><b>${title}</b><p>Revision ${esc(data.revision)}</p></div></header>${a.centres.length?summary:'<p>Recorded cost centre: <b>'+esc(s.costCenter||'Not recorded')+'</b></p>'}<div class="${balanced?'po-check':'po-warning'}"><strong>${balanced?'Fully allocated - reconciles to the PO':'Allocation details require review'}</strong>${num(a.allocatedQuantity)} of ${num(a.quantity)} units allocated / ${currency} ${money(a.allocatedValue)} of ${money(total)} purchase value.${a.errors.length?'<br>'+a.errors.map(esc).join('<br>'):''}${a.value!==total?'<br>Recorded PO total differs from the sum of its item values.':''}</div>${detail}<div class="po-end">Purchase value = allocated quantity x PO unit price, in ${currency}. This allocation excludes freight, customs, taxes and other arrival costs. A zero means no quantity is allocated to that centre. Missing legacy allocations are not inferred.</div></section>`;
 const technical=`<section class="po-tech"><header class="po-section-head"><div><div class="po-kicker">02 / Technical specifications</div><h2>Specification details</h2><p>Item configuration and brand packaging requirements</p></div><div class="po-ref"><b>${title}</b><p>Revision ${esc(data.revision)}</p></div></header><table class="po-requirements" aria-label="Purchase order technical specification details"><colgroup><col style="width:18%"><col style="width:27%"><col style="width:55%"></colgroup><thead><tr><th>Item Category</th><th>ERP item / description</th><th>Technical specifications &amp; requirements</th></tr></thead><tbody>${lines.map(l=>`<tr><td>${esc(String(l.category||'').trim()||'Not recorded')}</td><td><b>${esc(l.code)}</b><div class="po-desc">${esc(l.name)}</div>${l.baseItemCode||l.baseCode?'<div class="po-model">Base model: '+esc(l.baseItemCode||l.baseCode)+'</div>':''}</td><td>${String(l.specification?.description||'').trim()?'<div class="po-pre">'+esc(l.specification.description)+'</div>':'<div class="po-missing-spec">Technical specifications not recorded in this '+(data.issued?'issued revision':'draft')+'.</div>'}${String(l.artworkNotes||'').trim()?'<div class="po-packaging"><b>Brand packaging / decal requirements</b><div class="po-pre">'+esc(l.artworkNotes)+'</div></div>':''}</td></tr>`).join('')}</tbody></table><div class="po-end">${data.issued?'Specifications shown are the details saved with this issued PO revision.':'Draft specifications reflect the selected approved product specification.'}</div></section>`;
 return '<style>'+poPrintStyles+'</style>'+header+companyHtml()+'<section class="po-info">'+cell('Supplier','<strong>'+esc(s.vendor?.name||'Not recorded')+'</strong><div class="po-muted">'+esc(s.vendor?.code||'')+'</div>')+cell('Currency / trade term','<strong>'+currency+' / '+esc(s.incoterm||'Not recorded')+'</strong>')+cell('Required port arrival',esc(date(s.requestedPortDate)))+cell('Payment terms',esc(terms||s.paymentTerms?.name||'Not recorded'))+(exchangeText?cell('PO exchange rate',esc(exchangeText)):'')+'</section>'+orderTable+notes+technical+allocation;
}
