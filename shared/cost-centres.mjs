/** LAE Import PO quantity destinations. IDs, rather than display names, are saved. */
export const COST_CENTRES=Object.freeze([
 Object.freeze({id:'TN',name:'Tamil Nadu'}),
 Object.freeze({id:'AP',name:'Andhra Pradesh'}),
 Object.freeze({id:'HR',name:'Haryana'})
]);
const costCentreHasOwn=(value,key)=>!!value&&Object.hasOwn(value,key);
const costCentreHasFields=value=>costCentreHasOwn(value,'costCenterIds')||(Array.isArray(value?.lines)?value.lines:[]).some(line=>costCentreHasOwn(line,'costCenterAllocations'));
export const costCenterName=id=>COST_CENTRES.find(centre=>centre.id===id)?.name||id;
export const costCenterSummary=ids=>COST_CENTRES.filter(centre=>Array.isArray(ids)&&ids.includes(centre.id)).map(centre=>centre.name).join(', ');
// Retained issued snapshots prevent an enabled order from being silently downgraded.
export const hasCostCenterAllocations=order=>costCentreHasFields(order)||(order?.revisions||[]).some(revision=>costCentreHasFields(revision.snapshot));
export class CostCenterError extends Error{}
function costCentreEnsure(condition,message){if(!condition)throw new CostCenterError(message);}
function costCentreSelectedIds(input){
 costCentreEnsure(Array.isArray(input)&&input.length>0&&input.length<=COST_CENTRES.length,'Select at least one valid cost centre.');
 const seen=new Set();
 for(const id of input){
  costCentreEnsure(typeof id==='string'&&COST_CENTRES.some(centre=>centre.id===id),'Select a valid cost centre: Tamil Nadu, Andhra Pradesh or Haryana.');
  costCentreEnsure(!seen.has(id),'Cost centres must be selected only once.');seen.add(id);
 }
 return COST_CENTRES.filter(centre=>seen.has(centre.id)).map(centre=>centre.id);
}
function costCentreLineAllocations(line,ids,{autoAssignSingle=false}={}){
 costCentreEnsure(line&&typeof line==='object'&&!Array.isArray(line),'Select a valid item before allocating cost centres.');
 const label=line.code||line.itemId||'Item';
 let rows=line.costCenterAllocations;
 if(!costCentreHasOwn(line,'costCenterAllocations')&&autoAssignSingle&&ids.length===1)rows=[{costCenterId:ids[0],quantity:line.quantity}];
 costCentreEnsure(Array.isArray(rows)&&rows.length>0&&rows.length<=ids.length,`${label}: allocate the ordered quantity to the selected cost centres.`);
 const seen=new Set();let total=0;
 for(const row of rows){
  costCentreEnsure(row&&typeof row==='object'&&!Array.isArray(row)&&typeof row.costCenterId==='string'&&COST_CENTRES.some(centre=>centre.id===row.costCenterId),`${label}: allocation has an unknown cost centre.`);
  costCentreEnsure(ids.includes(row.costCenterId),`${label}: allocation uses an unselected cost centre.`);
  costCentreEnsure(!seen.has(row.costCenterId),`${label}: each cost centre may appear only once.`);seen.add(row.costCenterId);
  costCentreEnsure(Number.isSafeInteger(row.quantity)&&row.quantity>0,`${label}: allocated quantities must be positive whole numbers; omit zero cells.`);
  total+=row.quantity;costCentreEnsure(Number.isSafeInteger(total),`${label}: allocated quantity exceeds the supported limit.`);
 }
 costCentreEnsure(Number.isSafeInteger(line.quantity)&&line.quantity>0,`${label}: ordered quantity must be a positive whole number.`);
 costCentreEnsure(total===line.quantity,`${label}: allocated quantity (${total}) must equal the ordered quantity (${line.quantity}).`);
 return ids.filter(id=>seen.has(id)).map(id=>({costCenterId:id,quantity:rows.find(row=>row.costCenterId===id).quantity}));
}
/**
 * Legacy callers with no allocation properties remain legacy. An enabled order's
 * unrelated edits retain its allocations; explicit replacement lines must carry
 * their complete splits. Only deliberate first-time single-centre selection may
 * assign an otherwise omitted split. Multiple-centre splits are never inferred.
 */
export function normalizeCostCenterAllocationInput(input,lines,previous=null,{autoAssignSingle=false}={}){
 const wasEnabled=hasCostCenterAllocations(previous),enabled=wasEnabled||costCentreHasFields(input);
 if(!enabled)return {lines};
 const ids=costCentreSelectedIds(costCentreHasOwn(input,'costCenterIds')?input.costCenterIds:previous?.costCenterIds);
 if(costCentreHasOwn(input,'costCenter')&&!costCentreHasOwn(input,'costCenterIds'))costCentreEnsure(input.costCenter===previous?.costCenter,'Select cost centres and provide item allocations; a legacy cost-centre value cannot replace saved allocations.');
 const assign=autoAssignSingle&&!wasEnabled&&costCentreHasOwn(input,'costCenterIds');
 return {costCenterIds:ids,costCenter:costCenterSummary(ids),lines:lines.map(line=>({...line,costCenterAllocations:costCentreLineAllocations(line,ids,{autoAssignSingle:assign})}))};
}
/** Persisted data is checked without repairing or inferring missing splits. */
export function costCenterReadiness(order,requireEnabled=false){
 if(!requireEnabled&&!hasCostCenterAllocations(order))return [];
 try{
  const ids=costCentreSelectedIds(order?.costCenterIds);
  costCentreEnsure(Array.isArray(order?.lines)&&order.lines.length>0,'Add order items before allocating cost centres.');
  for(const line of order.lines)costCentreLineAllocations(line,ids);
  return [];
 }catch(error){if(!(error instanceof CostCenterError))throw error;return [error.message];}
}
