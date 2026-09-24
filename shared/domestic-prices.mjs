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
