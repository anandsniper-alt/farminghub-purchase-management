import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {RuleError,scopeAllowed} from '../shared/domain.mjs';
import {ARRIVAL_COST_FIELDS} from '../shared/arrival-costing.mjs';

// Use the saved calculation, including its allocation rounding. Export is read-only.
export function arrivalCostExportReport(state,actor,orderId,costingId){
 const o=state.orders.find(x=>x.id===orderId);
 if(!actor||actor.active===false||actor.role==='PLAN_OPERATOR'||!o||o.scope!=='LAE_IMPORT'||o.deletedAt||!scopeAllowed(actor,o.scope))throw new RuleError('Order is unavailable or outside your access.','FORBIDDEN');
 const c=(o.arrivalCostings||[]).find(x=>x.id===costingId);
 if(!c?.calculation?.lines?.length)throw new RuleError('Saved invoice costing not found.');
 if(c.calculation.lines.length>500)throw new RuleError('This invoice exceeds the export line limit.');
 const vendor=state.vendors.find(v=>v.id===o.vendorId),shipment=(o.shipments||[]).find(s=>s.id===c.shipmentId);
 const amount=n=>n==null?null:n/100,rate=n=>n==null?null:n/1e6;
 return {
  po:o.number,supplier:vendor?.name||'',shipment:shipment?.number||'',ro:c.roReference||'',invoice:c.invoiceNumber,
  boe:c.boeNumber,boeDate:c.boeDate,status:c.status,finalizedBy:c.finalizedBy||'',finalizedAt:c.finalizedAt||'',
  currency:c.currency,invoiceTotal:amount(c.calculation.invoiceMinor),usdTotal:amount(c.calculation.invoiceUsdMinor),
  total:amount(c.calculation.totalMinor),costPerUsd:rate(c.calculation.costPerUsd),gst:amount(c.gstMinor),
  expenses:ARRIVAL_COST_FIELDS.map(([key,label])=>({key,label,amount:amount(c.costs?.[key])})),
  boeTotals:Object.fromEntries(['bcd','sws','gst'].map(k=>[k,amount(c.boeTotals?.[k])])),
  allocation:c.allocationNote||'',remarks:c.remarks||'',currencyPerUsd:rate(c.currencyPerUsd),fxDate:c.fxDate||'',fxSource:c.fxSource||'',
  lines:c.calculation.lines.map(l=>({code:l.code,name:l.name,quantity:l.quantity,unitPrice:amount(l.unitPriceMinor),invoice:amount(l.invoiceMinor),usd:amount(l.usdMinor),unitCost:rate(l.unitCostInr),landed:amount(l.landedMinor)})),
  exportedAt:new Date().toISOString()
 };
}
export function arrivalCostExportFilename(report){
 const safe=v=>String(v||'').replace(/[^a-zA-Z0-9._-]+/g,'_').slice(0,80);
 return `Arrival-cost-${safe(report.po)}-${safe(report.invoice)}.xlsx`;
}
let jobs=0;
export async function buildArrivalCostXlsx(report){
 const payload=JSON.stringify(report);
 if(Buffer.byteLength(payload)>5e6)throw new RuleError('Invoice costing is too large to export.');
 if(jobs>=2)throw new RuleError('Two Excel downloads are being prepared. Please try again shortly.');
 jobs++;
 try{return await new Promise((resolve,reject)=>{
  const child=spawn(process.env.FH_PYTHON||'python3',[fileURLToPath(new URL('./arrival-cost-export.py',import.meta.url))],{windowsHide:true,env:{...process.env,PYTHONIOENCODING:'utf-8'}});
  const chunks=[];let size=0,settled=false,failed=false;
  const finish=(error,bytes)=>{if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolve(bytes);};
  const timer=setTimeout(()=>{child.kill();finish(new RuleError('Excel export timed out. Please try again.'));},30000);
  child.stdout.on('data',chunk=>{size+=chunk.length;if(size>20e6){failed=true;child.kill();}else chunks.push(chunk);});
  child.stderr.on('data',()=>{});child.stdin.on('error',()=>{});
  child.on('error',()=>finish(new RuleError('Excel export is unavailable. Please try again later.')));
  child.on('close',code=>{const bytes=Buffer.concat(chunks);if(code!==0||failed||!bytes.length)finish(new RuleError('The Excel export could not be prepared. Please try again.'));else finish(null,bytes);});
  child.stdin.end(payload);
 });}finally{jobs--;}
}
