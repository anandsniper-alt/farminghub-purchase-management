import {isDeepStrictEqual} from 'node:util';
import {validateRoRecord,RO_ACTUAL_FIELDS} from '../shared/ro-costing.mjs';

/** Reference-only updates must preserve the complete current actual record. */
export function planRoImport(input,existing,mode='record'){
 const incoming=validateRoRecord(input);
 if(!['record','worksheetComparison'].includes(mode))throw Error('Unknown RO import mode.');
 if(mode==='record'){
  if(existing&&!isDeepStrictEqual(existing.record,incoming))throw Error('RO '+incoming.ro+' already differs. Review before importing.');
  return {record:incoming,expectedRevision:existing?.revision||0,action:existing?'skipped':'created'};
 }
 if(!incoming.worksheetComparison)throw Error('Reference imports require worksheetComparison for '+incoming.ro+'.');
 if(!existing){
  const a=incoming.actuals;
  if(RO_ACTUAL_FIELDS.some(k=>a[k]!==null)||a.sureshRate!==null||a.expenseCoverage!=='Pending'||a.currencyConfirmed||a.confirmation)throw Error('New reference records must not supply actual payments or completed coverage.');
  return {record:incoming,expectedRevision:0,action:'created'};
 }
 if(existing.record.ro!==incoming.ro)throw Error('Exact RO identity differs.');
 const current=existing.record.worksheetComparison;
 if(current&&!isDeepStrictEqual(current,incoming.worksheetComparison))throw Error('Conflicting existing worksheet comparison for '+incoming.ro+'. Review source versions before replacing.');
 const record=validateRoRecord({...existing.record,worksheetComparison:incoming.worksheetComparison});
 return {record,expectedRevision:existing.revision,action:current?'skipped':'updated'};
}
