import {domesticPreviewState} from '../scripts/prepare-domestic-preview.mjs';
import {execute} from '../shared/domain.mjs';
// Deliberately synthetic parts, quantities and suppliers; never import into live data.
export function assemblyComparisonFixture(){
 let state=domesticPreviewState();const manager=state.users.find(u=>u.role==='MANAGER');
 const run=(type,payload)=>{state=execute(state,{type,payload},manager).state;};
 for(const [code,name] of [['DEMO-A','SAMPLE Supplier A'],['DEMO-B','SAMPLE Supplier B'],['DEMO-C','SAMPLE Incomplete quote']])run('DOMESTIC_SAVE_VENDOR',{code,name,country:'India'});
 const frame=state.domesticItems.find(i=>i.code==='FH-LAE-D-IT-9'),bush=state.domesticItems.find(i=>i.code==='FH-LAE-D-IT-6');let n=0;
 for(const [code,quoteReference,quoteDate,rates] of [['DEMO-A','SAMPLE-A-OLD','2026-09-20',[900,12]],['DEMO-A','SAMPLE-A-NEW','2026-09-24',[1000,null]],['DEMO-B','SAMPLE-B','2026-09-24',[950,15]],['DEMO-C','SAMPLE-C-PARTIAL','2026-09-24',[800,null]]]){
  const fileId='sample-quote-'+(++n);state.files.push({id:fileId,scope:'LAE_DOMESTIC',name:'sample-only.csv',orderIds:[]});
  const rows=[frame,bush].flatMap((item,i)=>rates[i]===null?[]:[{'Item code':item.code,'Item Description':item.description,UOM:item.uom,'Rate (before GST)':String(rates[i])}]);
  run('DOMESTIC_IMPORT_PRICES',{vendorId:state.vendors.find(v=>v.code===code).id,quoteReference,quoteDate,rows,fileId,sourceHash:String(n).repeat(64),reason:'Local sample only, not an actual supplier quotation.'});
 }
 const assembly=state.domesticBoms.find(b=>b.assemblyType==='FRAME'),unconfirmed=state.domesticBoms.find(b=>b.code==='CS1'),empty=state.domesticBoms.find(b=>b.assemblyType==='FRAME'&&b.id!==assembly.id);
 const lines=[{itemId:frame.id,quantity:'1',rate:'999'},{itemId:bush.id,quantity:'4',rate:'99'}];
 for(const [bom,compositionConfirmed] of [[assembly,true],[unconfirmed,false]])run('DOMESTIC_SAVE_BOM',{bomId:bom.id,revision:bom.revision,lines,compositionConfirmed,notes:'SAMPLE composition only, for comparison testing.',reason:'Verify isolated assembly comparison; not a production composition.'});
 return {state,assemblyId:assembly.id,unconfirmedId:unconfirmed.id,emptyId:empty.id,frame,bush};
}
