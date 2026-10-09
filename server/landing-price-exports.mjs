import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {RuleError} from '../shared/domain.mjs';
import {LANDING_PRICE_EXPORT_LIMIT} from '../shared/landing-prices.mjs';

let landingExportJobs=0;
async function landingExport(report,format){
 if(!Array.isArray(report?.rows)||report.rows.length>LANDING_PRICE_EXPORT_LIMIT||report.rows.length!==report.pagination?.total)throw new RuleError('The complete filtered result is required for a download.');
 if(landingExportJobs>=2)throw new RuleError('Two downloads are being prepared. Please try again shortly.');
 const payload=JSON.stringify({rows:report.rows,summary:report.summary,filters:report.filters,coverage:report.coverage,generatedAt:new Date().toISOString()});
 if(Buffer.byteLength(payload)>40e6)throw new RuleError('This download is too large. Narrow the filters first.');
 landingExportJobs++;
 try{return await new Promise((resolve,reject)=>{
  const child=spawn(process.env.FH_PYTHON||'python3',[fileURLToPath(new URL('./landing-price-export.py',import.meta.url)),format],{windowsHide:true,env:{...process.env,PYTHONIOENCODING:'utf-8'}});
  const chunks=[];let size=0,failed=false,settled=false;
  const finish=(error,bytes)=>{if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolve(bytes);};
  const timer=setTimeout(()=>{failed=true;child.kill();finish(new RuleError('Download preparation timed out. Narrow the filters and try again.'));},90000);
  child.stdout.on('data',chunk=>{size+=chunk.length;if(size>40e6){failed=true;child.kill();}else chunks.push(chunk);});
  child.stderr.on('data',()=>{});
  child.stdin.on('error',()=>{});
  child.on('error',()=>finish(new RuleError('Download preparation is unavailable. Please try again later.')));
  child.on('close',code=>{const bytes=Buffer.concat(chunks);if(code!==0||failed||!bytes.length)finish(new RuleError('The download could not be prepared. Narrow the filters and try again.'));else finish(null,bytes);});
  child.stdin.end(payload);
 });}finally{landingExportJobs--;}
}
export const buildLandingPricesXlsx=report=>landingExport(report,'xlsx');
export const buildLandingPricesPdf=report=>landingExport(report,'pdf');
