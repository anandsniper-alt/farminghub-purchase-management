export async function loadingPdf(report){return (await import('./loading-report.mjs')).loadingPdf(report);}
const NOTICE='Planning suggestion only. Confirm equipment, package weights, stack strength and safe loading. Does not confirm a shipment.';
export function loadingSnapshot(draft,result,now=new Date().toISOString()){
 if(!result)throw Error('Calculate the loading layout before downloading.');
 return structuredClone({...result,rows:result.rows.map(r=>({...r,shipmentNumber:draft.shipmentNames?.[r.shipmentId]||r.shipmentNumber||''})),kind:'Farming Hub loading suggestion',version:1,plan:draft.reference,sourcePlanKey:draft.groupKey,createdAt:now,notice:NOTICE});
}
export const loadingFilename=(reference,extension)=>'Loading-layout-'+String(reference).replace(/[^a-z0-9_-]/gi,'-')+'.'+extension;

export function saveLoadingFile(bytes,type,name){const url=URL.createObjectURL(new Blob([bytes],{type})),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
