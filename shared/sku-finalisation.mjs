// SKU FINALISATION = YES in the syntax sheet confirms a model for sales.
// This view parameter never changes BOM readiness or excludes operational records.
export const skuFinalised=model=>model?.salesConfirmed===true;
export const skuFinalisationLabel=model=>skuFinalised(model)?'YES · Confirmed for sales':'Not finalised';
export function matchesSkuFinalisation(model,filter=''){
 if(!filter||filter==='all')return true;
 if(filter==='yes')return skuFinalised(model);
 if(filter==='no')return !skuFinalised(model);
 return false;
}
export function skuFinalisationCounts(models){
 const yes=models.filter(skuFinalised).length;
 return {yes,no:models.length-yes};
}
