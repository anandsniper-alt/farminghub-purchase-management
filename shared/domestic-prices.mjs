// Domestic quotations are immutable purchasing references, never automatic BOM repricing.
export const DOMESTIC_PRICE_HEADERS=['Item code','Item Description','UOM','Rate (before GST)'];
export function previewDomesticPrices(state,rows){
 const norm=v=>String(v??'').trim(),counts=new Map();
 for(const r of rows){const code=norm(r['Item code']).toUpperCase();if(code)counts.set(code,(counts.get(code)||0)+1);}
 return rows.map((r,n)=>{const code=norm(r['Item code']).toUpperCase(),item=(state.domesticItems||[]).find(i=>i.code.toUpperCase()===code),raw=norm(r['Rate (before GST)']),errors=[];
  if(!code||!item||!item.active)errors.push('Use an active Item Master code');
  if(counts.get(code)>1)errors.push('Duplicate item code in this file');
  if(item&&norm(r.UOM)!==item.uom)errors.push('UOM must be '+item.uom);
  if(item&&norm(r['Item Description'])!==item.description)errors.push('Description differs; download a fresh template');
  let rateMinor=null;
  if(raw!==''){if(!/^\d+(?:\.\d{1,2})?$/.test(raw))errors.push('Enter a non-negative INR rate with at most 2 decimals');else{const [a,b='']=raw.split('.');const minor=BigInt(a)*100n+BigInt(b.padEnd(2,'0'));if(minor>BigInt(Number.MAX_SAFE_INTEGER))errors.push('Rate is too large');else rateMinor=Number(minor);}}
  return {row:n+2,itemId:item?.id,code,description:item?.description||norm(r['Item Description']),uom:item?.uom||norm(r.UOM),rateMinor,result:errors.length?'REJECTED':raw===''?'SKIP':'SAVE',errors};
 });
}
export function latestDomesticPrices(state,itemId){
 const byVendor=new Map();
 for(const q of state.domesticPriceLists||[]){const line=q.lines.find(l=>l.itemId===itemId);if(!line)continue;const old=byVendor.get(q.vendorId);if(!old||q.quoteDate>=old.quoteDate)byVendor.set(q.vendorId,{...line,quoteId:q.id,vendorId:q.vendorId,vendorCode:q.vendorCode,vendorName:q.vendorName,quoteDate:q.quoteDate,quoteReference:q.quoteReference});}
 return [...byVendor.values()].sort((a,b)=>a.rateMinor-b.rateMinor||a.vendorCode.localeCompare(b.vendorCode));
}

// Comparisons are read-only views of saved quotation lines, never automatic repricing.
export function domesticQuoteHistory(state,vendorId){
 return (state.domesticPriceLists||[]).map((quote,index)=>({quote,index})).filter(x=>x.quote.vendorId===vendorId).sort((a,b)=>a.quote.quoteDate.localeCompare(b.quote.quoteDate)||a.index-b.index).map(x=>x.quote);
}
export function compareDomesticSuppliers(state,vendorIds){
 const selected=[...new Set(vendorIds)];
 return (state.domesticItems||[]).map(item=>{
  const quotes=latestDomesticPrices(state,item.id).filter(q=>selected.includes(q.vendorId));
  const comparable=quotes.filter(q=>q.uom===item.uom),lowest=comparable.length>1?Math.min(...comparable.map(q=>q.rateMinor)):null;
  return {item,cells:selected.map(vendorId=>{const quote=quotes.find(q=>q.vendorId===vendorId)||null;return {vendorId,quote,unitMismatch:!!quote&&quote.uom!==item.uom,lowest:!!quote&&quote.uom===item.uom&&quote.rateMinor===lowest};})};
 }).filter(row=>row.cells.some(c=>c.quote));
}
export function domesticPriceDifference(oldLine,newLine){
 if(!oldLine)return {status:'NEW_ITEM',deltaMinor:null,percentText:null};
 if(!newLine)return {status:'NOT_QUOTED',deltaMinor:null,percentText:null};
 if(oldLine.uom!==newLine.uom)return {status:'UOM_CHANGED',deltaMinor:null,percentText:null};
 const deltaMinor=newLine.rateMinor-oldLine.rateMinor,status=deltaMinor>0?'INCREASED':deltaMinor<0?'DECREASED':'UNCHANGED';
 if(oldLine.rateMinor===0)return {status,deltaMinor,percentText:null};
 const absolute=BigInt(Math.abs(deltaMinor))*10000n,base=BigInt(oldLine.rateMinor),rounded=(absolute+base/2n)/base;
 const percentText=(deltaMinor<0?'-':deltaMinor>0?'+':'')+(rounded/100n)+'.'+String(rounded%100n).padStart(2,'0')+'%';
 return {status,deltaMinor,percentText};
}
export function compareDomesticQuotes(state,vendorId,oldId,newId){
 const history=domesticQuoteHistory(state,vendorId),oldIndex=history.findIndex(q=>q.id===oldId),newIndex=history.findIndex(q=>q.id===newId);
 if(oldIndex<0||newIndex<0)throw Error('Choose two saved quotations from the same supplier.');
 if(oldIndex>=newIndex)throw Error('Choose an earlier quotation as Old and a later quotation as New.');
 const oldQuote=history[oldIndex],newQuote=history[newIndex],ids=[...new Set([...oldQuote.lines,...newQuote.lines].map(l=>l.itemId))];
 return {oldQuote,newQuote,rows:ids.map(itemId=>{const oldLine=oldQuote.lines.find(l=>l.itemId===itemId)||null,newLine=newQuote.lines.find(l=>l.itemId===itemId)||null,item=(state.domesticItems||[]).find(i=>i.id===itemId)||{...(newLine||oldLine),id:itemId};return {item,oldLine,newLine,...domesticPriceDifference(oldLine,newLine)};})};
}
