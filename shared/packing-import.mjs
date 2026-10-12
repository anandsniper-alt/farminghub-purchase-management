/** Packing evidence only. Never changes order quantities, reservations or masters. */
export const PACKING_IMPORT_LIMITS={bytes:10*1024*1024,rows:2000,columns:100};
export const PACKING_IMPORT_FIELDS=[
 ['code','Item code',['Item code','Brand item code','Matched brand code','SKU']],
 ['description','Item name / model',['Item name','Description','Packing-list item description','Model']],
 ['po','PO number',['PO number','Purchase order']],
 ['supplier','Supplier',['Supplier','Supplier from document','Supplier from packing list']],
 ['quantity','Product quantity',['Product quantity','Quantity','Qty','Units']],
 ['packages','Package count',['Packages','Cartons','Package count']],
 ['unitsPerPackage','Units per package',['Units per package','Products / package','Products / package at reference','Pcs per carton']],
 ['length','Length',['Length mm','Length cm','Length m','Length']],
 ['width','Width',['Width mm','Width cm','Width m','Width']],
 ['height','Height',['Height mm','Height cm','Height m','Height']],
 ['weight','Gross kg per package',['Gross kg per package','Package gross kg']],
 ['totalWeight','Total gross kg',['Total gross kg','Total gross weight kg']],
 ['lineCBM','Total line CBM',['Total line CBM','Printed line CBM','Line CBM','CBM']],
 ['cbmPerUnit','CBM per product',['CBM per unit','Reference CBM / unit','CBM / product unit']],
 ['cbmPerPackage','CBM per package',['CBM per package','Avg CBM / package']],
 ['sourceRO','RO reference',['Source RO#','Packing reference RO#','RO#']],
 ['sourceInvoice','Invoice reference',['Invoice number','FTWZ invoice reference']],
 ['sourceId','Source record',['Record ID','CBM source record ID']],
 ['notes','Source notes',['Issues / observations','Missing details / packing variations','Notes']],
 ['sharedVolume','CBM shared across items',['Shared CBM cell','Shared volume']]
];
const packingKey=v=>String(v??'').trim().toUpperCase().replace(/\s+/g,' ');
const packingHeader=v=>packingKey(v).replace(/[^A-Z0-9]/g,'');
const packingText=v=>String(v??'').trim().slice(0,1600);
export function packingCSV(text){
 const rows=[];let row=[],cell='',quoted=false;
 text=String(text).replace(/^\uFEFF/,'');const first=text.split(/\r?\n/)[0],sep=first.includes('\t')?'\t':first.includes(';')&&!first.includes(',')?';':',';
 const push=()=>{row.push(cell);cell='';if(row.length>PACKING_IMPORT_LIMITS.columns)throw Error('Maximum 100 columns.');};
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===sep&&!quoted)push();else if(/[\r\n]/.test(c)&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;push();rows.push(row);row=[];if(rows.length>2030)throw Error('Maximum 2,000 packing rows.');}else cell+=c;if(cell.length>10000)throw Error('A cell exceeds 10,000 characters.');}
 if(quoted)throw Error('CSV has an unmatched quotation mark.');push();if(row.some(x=>x.trim()))rows.push(row);return rows;
}
export function packingColumnMap(headers){return Object.fromEntries(PACKING_IMPORT_FIELDS.map(([k,,aliases])=>[k,headers.findIndex(h=>aliases.some(a=>packingHeader(a)===packingHeader(h)))]));}
export function packingHeaderRow(rows){let best=-1,score=0;rows.slice(0,30).forEach((r,i)=>{const m=packingColumnMap(r),s=Object.values(m).filter(v=>v>=0).length;if((m.code>=0||m.description>=0)&&s>score){best=i;score=s;}});return best;}
function packingNumber(value,label,errors){
 if(value==null||String(value).trim()==='')return null;
 const raw=String(value).trim();if(!/^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(raw)){errors.push(label+' must be a positive number using a decimal point.');return null;}
 const n=Number(raw.replace(/,/g,''));if(!Number.isFinite(n)||n<=0||n>1e12){errors.push(label+' must be positive and within range.');return null;}return n;
}
function packingRecord(raw,index,meta={}){
 const errors=[],warnings=Array.isArray(raw.notes)?raw.notes.map(packingText):packingText(raw.notes)?[packingText(raw.notes)]:[];
 const sharedVolume=raw.sharedVolume===true||/^(yes|true|1)$/i.test(String(raw.sharedVolume||'').trim());
 const r={id:String(index),code:packingText(raw.code),description:packingText(raw.description),po:packingText(raw.po),supplier:packingText(raw.supplier),sourceId:packingText(raw.sourceId||index+1),sourceRO:packingText(raw.sourceRO),sourceInvoice:packingText(raw.sourceInvoice),sourceName:packingText(raw.sourceName||meta.name),sourceHash:packingText(raw.sourceHash||meta.hash),sourcePage:packingText(raw.sourcePage),sourceRow:raw.sourceRow??index+1,isReference:!!meta.isReference,errors,warnings};
 for(const k of ['quantity','packages','unitsPerPackage','length','width','height','weight','totalWeight','lineCBM','cbmPerUnit','cbmPerPackage'])r[k]=packingNumber(raw[k],k,errors);
 for(const k of ['quantity','packages'])if(r[k]!=null&&!Number.isSafeInteger(r[k]))errors.push(k+' must be a whole count.');
 if(!r.code&&!r.description)errors.push('Item code or description is required.');
 if(r.unitsPerPackage==null&&r.quantity!=null&&r.packages!=null)r.unitsPerPackage=r.quantity/r.packages;
 if(r.unitsPerPackage!=null&&!Number.isSafeInteger(r.unitsPerPackage))errors.push('Multiple packages per product or mixed/part-filled cartons: confirm a whole units-per-package value in the template; do not average package shapes.');
 if(r.packages&&r.quantity&&r.unitsPerPackage&&Math.ceil(r.quantity/r.unitsPerPackage)!==r.packages)errors.push('Product quantity, package count and units per package do not reconcile.');
 if(r.weight==null&&r.totalWeight!=null)warnings.push('Total gross weight is not a per-package weight. Confirm individual package gross kg before payload checks.');
 if(r.weight&&r.totalWeight&&r.packages&&Math.abs(r.weight*r.packages-r.totalWeight)>.01)warnings.push('Package gross weight × packages differs from total gross weight.');
 if(!r.length||!r.width||!r.height)warnings.push('Dimensions missing — CBM cannot establish a 3D box shape.');
 if(!r.unitsPerPackage)warnings.push('Units per package needs confirmation.');
 if(!r.weight)warnings.push('Package gross weight missing; payload remains unverified.');
 if(r.length&&r.width&&r.height){const v=r.length*r.width*r.height/1e9,declared=r.cbmPerPackage||(r.lineCBM&&r.packages?r.lineCBM/r.packages:null);if(declared&&Math.abs(v-declared)>Math.max(.000001,declared*.01))warnings.push('Dimension volume differs from recorded CBM by more than 1%.');}
 if(r.lineCBM&&r.quantity&&r.cbmPerUnit&&Math.abs(r.lineCBM-r.quantity*r.cbmPerUnit)>Math.max(.000001,r.lineCBM*.01))warnings.push('Recorded CBM per unit does not reconcile to line CBM.');
 if(!meta.preserveReferenceCBM&&!sharedVolume){if(r.cbmPerUnit==null&&r.lineCBM&&r.quantity)r.cbmPerUnit=r.lineCBM/r.quantity;if(r.cbmPerPackage==null&&r.lineCBM&&r.packages)r.cbmPerPackage=r.lineCBM/r.packages;}
 if(sharedVolume){r.cbmPerUnit=null;r.cbmPerPackage=null;errors.push('Shared CBM covers multiple items. Obtain separate package details before using this row.');}
 if(meta.isReference)warnings.unshift('Historical packing reference — confirm the current supplier configuration.');
 return r;
}
export function packingSheetRecords(rows,headerIndex,mapping,unit,meta={}){
 if(!Number.isInteger(headerIndex)||headerIndex<0||headerIndex>=rows.length-1)throw Error('Select the header row above the packing data.');
 const headers=rows[headerIndex],data=rows.slice(headerIndex+1);if(data.length>PACKING_IMPORT_LIMITS.rows)throw Error('Maximum 2,000 packing rows.');
 if(mapping.code<0&&mapping.description<0)throw Error('Map an item code or item description column.');
 const mapped=Object.values(mapping).filter(v=>v>=0);if(new Set(mapped).size!==mapped.length)throw Error('Each source column can be mapped only once.');
 return data.map((row,i)=>{
  if(!row.some(v=>String(v??'').trim()))return null;
  const raw={sourceRow:headerIndex+i+2};for(const [k] of PACKING_IMPORT_FIELDS)raw[k]=mapping[k]>=0?row[mapping[k]]:'';
  const unitErrors=[];for(const k of ['length','width','height'])if(raw[k]!=null&&raw[k]!==''){
   const heading=packingHeader(headers[mapping[k]]),u=/MM$/.test(heading)?'mm':/CM$/.test(heading)?'cm':/M$/.test(heading)?'m':unit;
   if(!['mm','cm','m'].includes(u)){unitErrors.push('Select the dimension unit for '+k+'.');continue;}
   const value=packingNumber(raw[k],k,unitErrors);if(value!=null)raw[k]=String(Number((value*({mm:1,cm:10,m:1000}[u])).toFixed(6)));
  }
  const r=packingRecord(raw,i,meta);r.errors.push(...unitErrors);return r;
 }).filter(Boolean);
}
export function packingLibraryRecords(data,meta={}){
 if(!data||data.version!=='1.0'||!Array.isArray(data.packingProfiles)||data.packingProfiles.length>2000)throw Error('Choose the LAE_Packing_CBM_Data.json library (version 1.0, at most 2,000 records).');
 return data.packingProfiles.map((p,i)=>packingRecord({code:p.code,description:p.description,quantity:p.quantity,packages:p.packages,unitsPerPackage:p.unitsPerPackage,length:p.lengthMM,width:p.widthMM,height:p.heightMM,weight:p.grossWeightKg,lineCBM:p.lineCBM,cbmPerUnit:p.CBMPerUnit,cbmPerPackage:p.CBMPerPackage,sharedVolume:Array.isArray(p.sharedVolumeRows)&&p.sharedVolumeRows.length>0,supplier:p.supplier,sourceId:p.id,sourceName:p.filename,sourceHash:p.sha256,sourcePage:p.page,sourceRow:p.row,sourceRO:Array.isArray(p.ros)?p.ros.join(', '):'',sourceInvoice:p.invoice||p.invoiceHint,notes:p.notes},i,{...meta,isReference:true,preserveReferenceCBM:true}));
}
export function packingMatch(record,planRows){
 if(!record.code)return [];
 return planRows.filter(p=>packingKey(p.code)===packingKey(record.code)&&(!record.po||packingKey(record.po)===packingKey(p.po))&&(!record.supplier||!p.supplier||packingKey(record.supplier)===packingKey(p.supplier))).map(p=>p.id);
}
export function packingImportReview(record,target){
 const warnings=[...record.warnings],errors=[...record.errors];if(!target)errors.push('Choose the original PO item.');
 if(target&&!record.isReference&&record.quantity!=null&&record.quantity!==target.quantity)warnings.push('Packing list has '+record.quantity+' units; plan keeps '+target.quantity+' units.');
 let mismatch=false;if(target){for(const k of ['code','po','supplier'])if(record[k]&&target[k]&&packingKey(record[k])!==packingKey(target[k])){warnings.push(k+' differs from the selected PO item; verify this mapping.');mismatch=true;}}
 return {errors,warnings,mismatch};
}
export function applyPackingImport(planRows,records,selections,{confirmed=false,reason='',importedAt=new Date().toISOString()}={}){
 if(!confirmed)throw Error('Confirm the source mapping and packing configuration before applying.');
 if(!Array.isArray(selections)||!selections.length)throw Error('Select at least one packing row.');
 const targets=new Set(),sourceIds=new Set(),updates=new Map();
 for(const s of selections){const r=records.find(r=>r.id===s.recordId),p=planRows.find(p=>p.id===s.targetId);if(!r)throw Error('Packing source row no longer exists.');const check=packingImportReview(r,p);if(check.errors.length)throw Error(check.errors.join(' '));if(targets.has(p.id)||sourceIds.has(r.id))throw Error('Choose only one packing record for each PO line; revisions and mixed packages cannot be added together.');targets.add(p.id);sourceIds.add(r.id);if(check.mismatch&&String(reason).trim().length<5)throw Error('Enter a reason for the different item, supplier or PO mapping.');
  updates.set(p.id,{...p,unitsPerPackage:r.unitsPerPackage??'',length:r.length??'',width:r.width??'',height:r.height??'',weight:r.weight??'',rotation:'FIXED',maxLayers:1,topLoad:'',dimensionSource:'Packing list · '+r.sourceName,packingEvidence:{sourceName:r.sourceName,sourceHash:r.sourceHash,sourceId:r.sourceId,sourcePage:r.sourcePage,sourceRow:r.sourceRow,sourceRO:r.sourceRO,sourceInvoice:r.sourceInvoice,sourceQuantity:r.quantity,sourcePackages:r.packages,cbmPerUnit:r.cbmPerUnit,cbmPerPackage:r.cbmPerPackage,lineCBM:r.lineCBM,isReference:r.isReference,warnings:check.warnings,mappingReason:String(reason).trim().slice(0,1600),importedAt}});
 }
 return planRows.map(p=>updates.get(p.id)||{...p});
}
export function packingImportTemplate(planRows){
 const headers=['Item code','Item name','PO number','Supplier','Product quantity','Package count','Units per package','Length mm','Width mm','Height mm','Gross kg per package','Total line CBM'];
 const cell=v=>'"'+String(v??'').replace(/^[=+@\-]/,"'$&").replace(/"/g,'""')+'"';
 return '\uFEFF'+[headers,...planRows.map(r=>[r.code,r.name,r.po,r.supplier||'',r.quantity,'','','','','','',''])].map(r=>r.map(cell).join(',')).join('\r\n');
}
