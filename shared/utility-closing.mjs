import {RuleError} from './domain.mjs';

const specs=entries=>entries.map(([key,label,type='text'])=>({key,label,type}));
export const UTILITY_CLOSING_COLUMNS={
 items:specs([['supplier','Supplier'],['name','SKU'],['stage','Category'],['quality','Quality / brand'],['uom','UOM'],['snapshotDate','Closing date','date'],['quantity','Quantity','number'],['barcodeCount','Barcodes','number'],['batchCount','Date batches','number'],['weightedRate','Weighted landed rate','number'],['value','Costed value','number'],['coveragePercent','Cost coverage %','number'],['evidenceStatus','Evidence']]),
 batches:specs([['date','Purchase / inward date','date'],['dateBasis','Date basis'],['invoiceRefs','Invoice references'],['snapshotDate','Closing date','date'],['quantity','Quantity','number'],['barcodeCount','Barcodes','number'],['weightedRate','Weighted landed rate','number'],['value','Costed value','number'],['coveragePercent','Cost coverage %','number'],['evidenceStatus','Evidence']]),
 barcodes:specs([['barcode','Barcode'],['identifierReview','Identifier review'],['inwardDate','Inward date','date'],['invoiceDate','Invoice / cost reference date','date'],['quantity','Quantity','number'],['uom','UOM'],['originalRate','Recorded rate','number'],['originalValue','Recorded value','number'],['beforeCdRate','Before CD / GST','number'],['cdPercent','CD %','number'],['netGoodsRate','After CD','number'],['transportRate','Transport','number'],['landedRate','Landed rate','number'],['value','Costed value','number'],['invoiceSupplier','Invoice / reference supplier'],['evidenceStatus','Evidence'],['source','Source']])
};
const fail=message=>{throw new RuleError(message,'VALIDATION');};
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const normalized=value=>String(value??'').trim().toLowerCase();
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
const unique=values=>[...new Set(values.filter(value=>value!==null&&value!==undefined&&value!==''))].sort();
const rollFiles=['HDPE Roll Batchwise on 09.10.2026.xlsx','LDPE Roll Batchwise on 09.10.2026.xlsx'];
const openingFile='Stock Report - As on 30-09-2026.xlsx';
const rateFields=['beforeCdRate','cdPercent','netGoodsRate','transportRate','landedRate'];
const descriptiveOpeningReference=(barcode,item)=>/^(?:PRIM|PARIMARY|FLOOR)$/i.test(barcode)||/^\d+(?:\.\d+)?\s*(?:FEET|FT)(?:\s+\d+)?$/i.test(barcode)||/^\d+%\s+\d+(?:\.\d+)?\s*[Xx]\s*\d+(?:\.\d+)?$/.test(barcode)||(normalized(item.name)==='car cover'&&/\s/.test(barcode));

function summarize(rows){
 let quantity=0,costedQuantity=0,value=0,recordedValue=0,recordedValueRows=0;
 const statusCounts={},components=Object.fromEntries(rateFields.map(key=>[key,{quantity:0,value:0}]));
 for(const row of rows){quantity+=row.quantity;statusCounts[row.evidenceStatus]=(statusCounts[row.evidenceStatus]||0)+1;
  if(finite(row.value)){costedQuantity+=row.quantity;value+=row.value;}
  if(finite(row.originalValue)){recordedValue+=row.originalValue;recordedValueRows++;}
  for(const key of rateFields)if(finite(row[key])){components[key].quantity+=row.quantity;components[key].value+=row.quantity*row[key];}
 }
 const statuses=Object.keys(statusCounts).sort(),componentSummary={};
 for(const key of rateFields){const c=components[key];componentSummary[key]={rate:c.quantity?c.value/c.quantity:null,quantity:c.quantity,coveragePercent:quantity?c.quantity/quantity*100:null};}
 return {quantity,barcodeCount:rows.length,costedQuantity,pendingQuantity:quantity-costedQuantity,value:costedQuantity?value:null,weightedRate:costedQuantity?value/costedQuantity:null,coveragePercent:quantity?costedQuantity/quantity*100:null,recordedValue:recordedValueRows?recordedValue:null,recordedValueRows,evidenceStatus:statuses.length===1?statuses[0]:'mixed',statusCounts,componentSummary};
}

/** Derive the explicitly requested closing scopes from immutable row evidence. */
export function buildUtilityClosing(dataset,makeId){
 if(typeof makeId!=='function')fail('A stable date-batch identity function is required.');
 if(dataset.items.length>20000||dataset.batches.length>50000)fail('Closing evidence exceeds its bounded limits.');
 const suppliers=new Map(dataset.suppliers.map(row=>[row.id,row])),items=new Map(dataset.items.map(row=>[row.id,row])),byItem=new Map(),groups=new Map(),exceptions={},included=[];
 let rowCount=0;
 const excluded=(reason,row,item)=>{const counter=exceptions[reason]??={rows:0,quantityByUom:{}};counter.rows++;if(finite(row.quantity)){const uom=row.uom||item?.uom||'Unknown';counter.quantityByUom[uom]=(counter.quantityByUom[uom]||0)+row.quantity;}};
 for(const batch of dataset.batches)for(const original of batch.barcodes||[]){
  if(++rowCount>100000)fail('Closing evidence exceeds 100,000 barcode rows.');
  const item=items.get(batch.itemId);if(!item)fail('Closing item ownership is invalid.');
  if(!['stock','activeStock','october','deferred'].includes(batch.scope)){excluded('excludedScope',original,item);continue;}
  const sourceFile=typeof original.source==='object'?original.source?.file:original.source;
  const opening=String(original.recordId??'').startsWith('Utility:')&&batch.snapshotDate==='2026-10-01'&&sourceFile===openingFile;
  const roll=/^(HDPE|LDPE):/.test(original.recordId??'')&&batch.snapshotDate==='2026-10-09'&&rollFiles.includes(sourceFile)&&normalized(item.stage)==='rolls';
  if(opening&&['hdpe warehouse','ldpe warehouse'].includes(normalized(original.warehouse))){excluded('openingRollSourceUnavailable',original,item);continue;}
  if(!opening&&!roll){excluded(batch.snapshotDate==='2026-10-09'&&normalized(item.stage)!=='rolls'?'laterNonRollSnapshot':'unprovenSourceSnapshot',original,item);continue;}
  if(!finite(original.quantity)){excluded('missingQuantity',original,item);continue;}
  if(original.quantity<=0){excluded(original.quantity<0?'negativeQuantity':'zeroQuantity',original,item);continue;}
  if(typeof original.barcode!=='string'||!original.barcode.trim()){excluded('missingBarcode',original,item);continue;}
  if(/^PRIMARY(?:\s|$)/i.test(original.barcode.trim())){excluded('placeholderBarcode',original,item);continue;}
  if(opening&&descriptiveOpeningReference(original.barcode.trim(),item)){excluded('descriptiveBatchLabel',original,item);continue;}
  const invoiceDate=validDate(original.invoiceDate)?original.invoiceDate:validDate(batch.invoiceDate)?batch.invoiceDate:null;
  const inwardDate=validDate(original.inwardDate)?original.inwardDate:validDate(batch.inwardDate)?batch.inwardDate:null;
  const purchaseDate=validDate(original.purchaseDate)?original.purchaseDate:validDate(batch.purchaseDate)?batch.purchaseDate:null;
  const matched=batch.evidenceStatus==='supported'&&Boolean(batch.voucher),date=matched?(purchaseDate||invoiceDate||inwardDate):inwardDate;
  const dateBasis=matched&&(purchaseDate||invoiceDate)?'Purchase / invoice working match':inwardDate?'Inward date':'Date unavailable';
  const groupKey=JSON.stringify([item.id,dateBasis,date]),batchId='closing-'+makeId(groupKey);
  const row={...original,itemId:item.id,originalBatchId:batch.id,batchId,sourceEvidence:original.source,source:sourceFile||'',sourceScope:batch.scope,sourceSnapshotDate:batch.snapshotDate,snapshotDate:roll?'2026-10-08':'2026-09-30',snapshotBasis:roll?'User-designated 8 October EOD; source report dated 9 October':'30 September closing stock',inwardDate,invoiceDate,costReferenceDate:invoiceDate,date,dateBasis,uom:original.uom||batch.uom||item.uom,invoiceSupplier:batch.actualInvoiceVendor||'',invoiceReferences:unique([...(batch.invoiceRefs||[]),batch.voucher]),evidenceStatus:original.evidenceStatus||batch.evidenceStatus,method:batch.method??'',notes:batch.notes??[],purchaseMatchEvidence:batch.purchaseMatchEvidence??''};
  for(const key of rateFields)row[key]=finite(batch[key])?batch[key]:null;
  row.value=finite(original.landedValue)?original.landedValue:row.landedRate===null?null:row.quantity*row.landedRate;
  const group=groups.get(batchId)||{id:batchId,itemId:item.id,date,dateBasis,rows:[]};group.rows.push(row);groups.set(batchId,group);
  const list=byItem.get(item.id)||[];list.push(row);byItem.set(item.id,list);included.push(row);
 }
 const identifiers=new Map();for(const row of included){const key=row.barcode.trim().toUpperCase();identifiers.set(key,(identifiers.get(key)||0)+1);}for(const row of included){const count=identifiers.get(row.barcode.trim().toUpperCase());row.identifierReview=count>1?'Repeated source identifier: '+count+' stock positions':['MOTTO','FH/ET6377','JAL/RET/213','2'].includes(row.barcode.trim().toUpperCase())?'Legacy source reference: identity needs review':'';}
 const dateBatches=[],batchesByItem=new Map(),rowsByBatch=new Map();
 for(const group of groups.values()){
  const invoiceReferences=unique(group.rows.flatMap(row=>row.invoiceReferences)),summary=summarize(group.rows);
  const batch={id:group.id,itemId:group.itemId,uom:items.get(group.itemId).uom,date:group.date,dateBasis:group.dateBasis,invoiceReferences,invoiceRefs:invoiceReferences.join(', '),snapshotDate:group.rows[0].snapshotDate,sourceSnapshotDates:unique(group.rows.map(row=>row.sourceSnapshotDate)),originalBatchIds:unique(group.rows.map(row=>row.originalBatchId)),...summary};
  dateBatches.push(batch);rowsByBatch.set(group.id,group.rows);const list=batchesByItem.get(group.itemId)||[];list.push(batch);batchesByItem.set(group.itemId,list);
 }
 const closingItems=[];
 for(const [itemId,rows] of byItem){const item=items.get(itemId);closingItems.push({id:item.id,vendorId:item.vendorId,supplier:suppliers.get(item.vendorId)?.name||'Supplier unconfirmed',name:item.name,stage:item.stage,productType:item.productType,quality:item.quality,uom:item.uom,candidateVendorIds:item.candidateVendorIds??[],vendorGroupingBasis:item.vendorGroupingBasis??'',snapshotDate:rows[0].snapshotDate,sourceSnapshotDates:unique(rows.map(row=>row.sourceSnapshotDate)),batchCount:batchesByItem.get(itemId).length,...summarize(rows)});}
 const summaryByUom={};for(const uom of unique(included.map(row=>row.uom)))summaryByUom[uom]=summarize(included.filter(row=>row.uom===uom));
 return {items:closingItems,batches:dateBatches,itemsById:new Map(closingItems.map(row=>[row.id,row])),batchesById:new Map(dateBatches.map(row=>[row.id,row])),rowsByItem:byItem,rowsByBatch,batchesByItem,meta:{snapshotDates:{nonRolls:'2026-09-30',rolls:'2026-10-08'},sourceSnapshotDates:{nonRolls:'2026-10-01',rolls:'2026-10-09'},rollCutoffBasis:'User-designated 8 October EOD cutoff; report dated 9 October, timing not independently verified.',limitations:['Opening HDPE/LDPE warehouse rows are excluded because reliable row quantities/source coverage are unavailable.','Only positive quantities with actual barcodes are included; PRIMARY placeholders, missing quantities and signed negative positions are reported separately.','Estimated or retained price-reference dates do not certify a purchase invoice; those rows use inward date.','Value and weighted rates cover priced quantities only. Pending quantities retain missing costs.'],sourceExclusions:dataset.meta?.id==='utility-price-review-2026-10-13-v1'?[{reason:'Opening HDPE/LDPE warehouse source rows lack reliable quantity/source coverage and were already excluded from immutable v1.',rows:265,basis:'Independent source reconciliation; these are not rows present in the imported dataset.'}]:[],identifierReview:{distinctSourceIdentifiers:identifiers.size,repeatedIdentifiers:[...identifiers].filter(([,count])=>count>1).map(([barcode,count])=>({barcode,count})),legacyReferenceRows:included.filter(row=>row.identifierReview.startsWith('Legacy')).length},counts:{items:closingItems.length,batches:dateBatches.length,barcodes:included.length},summaryByUom,exceptions}};
}

function filterFor(type,raw){
 if(typeof raw!=='string'||raw.length>500)fail('Column filters must be text of at most 500 characters.');
 const value=raw.trim();if(!value)return ()=>true;
 if(['pending','missing','not recorded'].includes(value.toLowerCase()))return actual=>actual===null||actual===undefined||actual===''||normalized(actual)===value.toLowerCase();
 if(type==='number'){
  const range=value.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*\.\.\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))$/);
  if(range){const min=Number(range[1]),max=Number(range[2]);if(!Number.isFinite(min)||!Number.isFinite(max)||min>max)fail('Invalid numeric range.');return actual=>finite(actual)&&actual>=min&&actual<=max;}
  const match=value.match(/^(<=|>=|=|<|>)?\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))$/);if(!match||!Number.isFinite(Number(match[2])))fail('Invalid numeric filter. Use =, >, >=, <, <= or min..max.');
  const expected=Number(match[2]),op=match[1]||'=';return actual=>finite(actual)&&({'=':()=>actual===expected,'>':()=>actual>expected,'>=':()=>actual>=expected,'<':()=>actual<expected,'<=':()=>actual<=expected}[op]());
 }
 if(type==='date'&&value.includes('..')){const parts=value.split('..').map(v=>v.trim());if(parts.length!==2||!parts.every(validDate)||parts[0]>parts[1])fail('Invalid date range. Use YYYY-MM-DD..YYYY-MM-DD.');return actual=>validDate(actual)&&actual>=parts[0]&&actual<=parts[1];}
 return actual=>String(actual??'').toLowerCase().includes(value.toLowerCase());
}

/** All allowlisted predicates and ordering apply to the complete set, before slicing. */
export function queryUtilityClosing(rows,level,input={},paging={offset:0,limit:50}){
 const columns=UTILITY_CLOSING_COLUMNS[level];if(!columns)fail('Invalid closing table.');
 const allowed=new Map(columns.map(column=>[column.key,column.type]));let filters=input.columnFilters??{};
 if(typeof filters==='string'){if(filters.length>20000)fail('Column filters are too large.');try{filters=JSON.parse(filters);}catch{fail('Column filters must be a JSON object.');}}
 if(!filters||typeof filters!=='object'||Array.isArray(filters)||Object.keys(filters).length>columns.length)fail('Column filters must be an object.');
 const predicates=Object.entries(filters).map(([key,value])=>{if(!allowed.has(key))fail('Unknown closing filter column.');return [key,filterFor(allowed.get(key),value)];});
 const sort=input.sort??'',direction=input.direction??'asc';if(typeof sort!=='string'||sort&&!allowed.has(sort)||!['asc','desc'].includes(direction))fail('Invalid closing sort.');
 let selected=rows.filter(row=>predicates.every(([key,predicate])=>predicate(row[key])));
 const compare=(a,b,key)=>{const av=a[key],bv=b[key],an=av===null||av===undefined,bn=bv===null||bv===undefined;if(an||bn)return an===bn?0:an?1:-1;const result=allowed.get(key)==='number'?av-bv:String(av).localeCompare(String(bv),'en',{numeric:true,sensitivity:'base'});return direction==='desc'?-result:result;};
 selected=selected.slice().sort((a,b)=>sort?(compare(a,b,sort)||String(a.id).localeCompare(String(b.id))):level==='items'?(stageRank(a.stage)-stageRank(b.stage)||((b.value??-Infinity)-(a.value??-Infinity))||a.name.localeCompare(b.name)||a.id.localeCompare(b.id)):level==='batches'?String(a.date??'9999').localeCompare(String(b.date??'9999'))||a.id.localeCompare(b.id):String(a.barcode).localeCompare(String(b.barcode),'en',{numeric:true})||a.id.localeCompare(b.id));
 const total=selected.length;return {rows:selected.slice(paging.offset,paging.offset+paging.limit),total,...paging,nextOffset:paging.offset+paging.limit<total?paging.offset+paging.limit:null};
}
const stageRank=stage=>({'raw materials':0,raw:0,rolls:1,roll:1,'finished goods':2,finished:2}[normalized(stage)]??3);
