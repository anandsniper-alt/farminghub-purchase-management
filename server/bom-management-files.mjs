import {readFileSync,readdirSync} from 'node:fs';
import {resolve,join,dirname,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {implementsAssets} from './implements-files.mjs';
import {RuleError} from '../shared/domain.mjs';
import {technicalIssues} from '../shared/bom-management.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
export const bomAssets=new Map();
for(const name of readdirSync(join(root,'web/bom-management')))if(mime[extname(name)])bomAssets.set('/bom/'+name,{file:join(root,'web/bom-management',name),type:mime[extname(name)]});
bomAssets.set('/bom/',bomAssets.get('/bom/index.html'));
bomAssets.set('/shared/bom-management.mjs',{file:join(root,'shared/bom-management.mjs'),type:mime['.mjs']});
for(const [url,asset] of implementsAssets)if(url.startsWith('/implements/assets/parts/')&&asset.type.startsWith('image/'))bomAssets.set(url.replace('/implements/','/bom/'),asset);
const cell=value=>{const str=String(value??'');return '"'+(/^[=+\-@\t\r]/.test(str)?"'"+str:str).replaceAll('"','""')+'"';};
export function exportTechnical(data,selection={},kind='bom'){
 if(!['bom','syntax','flags','reviews'].includes(kind))throw new RuleError('Unknown technical export.');
 if(selection.modelIds!==undefined&&(!Array.isArray(selection.modelIds)||selection.modelIds.length>1000||selection.modelIds.some(id=>!data.models.some(m=>m.id===id))))throw new RuleError('Invalid model selection.');
 const selected=selection.modelIds?new Set(selection.modelIds):null,models=data.models.filter(m=>!selected||selected.has(m.id));const index=new Map(data.parts.map(p=>[p.id,p]));let headers,rows;
 if(kind==='syntax'){headers=['Model','Series','Configuration','Frame','Size','Blade count','Gearbox speed','Blade orientation','Gearbox position','SKU finalisation','BOM available','Model revision'];rows=models.map(m=>[m.id,m.series,m.configuration,m.frame,m.size,m.blades,m.speed,m.bladeOrientation,m.gearboxOrientation,m.salesConfirmed?'YES':'NO',m.bomAvailable?'YES':'NO',m.revision]);}
 else if(kind==='bom'){headers=['Model','Series','Type','Segment','Item code','Item name','PPM','Unit','Combined weight per machine kg','Drawing code','Included in fabrication weight','Model revision'];rows=models.flatMap(m=>[...m.lines.map(l=>{const p=index.get(l.partId);return [m.id,m.series,'Component',p?.category,p?.code,p?.name,l.ppm,p?.uom||'pcs','','','',m.revision];}),...m.fabrication.map(l=>[m.id,m.series,'Fabrication','Fabrication',l.code,l.name,l.ppm,'pcs',l.weight,l.drawingCode,l.excluded?'NO':'YES',m.revision])]);}
 else if(kind==='flags'){headers=['Model','Segment','Item / check','Issue','Old PPM','New PPM','Confirmed PPM','Source flag status'];rows=models.flatMap(m=>[...technicalIssues(m,data.parts).map(f=>[m.id,f.segment,f.id,f.message,'','','','']),...(data.sourceFlags||[]).filter(f=>f.modelId===m.id).map(f=>[m.id,f.category,f.itemCode,f.name,f.oldPpm,f.newPpm,f.confirmedPpm,f.confirmed?'Confirmed; retained in source history':'Review'])]);}
 else {headers=['Model','Type','Status','Model revision checked','Date','Checked / submitted by','Checking note'];rows=data.reviews.filter(r=>!selected||selected.has(r.modelId)).map(r=>[r.modelId,r.kind,r.status,r.modelRevision,r.createdAt,r.createdBy.name,r.reason]);}
 return {type:'text/csv; charset=utf-8',name:'Rotavator_'+kind+'_technical.csv',bytes:Buffer.from('\ufeff'+[headers,...rows].map(row=>row.map(cell).join(',')).join('\r\n'),'utf8')};
}
