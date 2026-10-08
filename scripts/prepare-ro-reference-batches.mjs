/** Private preparation only: no network calls, credentials or website writes. */
import {readFileSync,writeFileSync,mkdirSync,realpathSync} from 'node:fs';
import {resolve,relative,isAbsolute,dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {validateRoRecord} from '../shared/ro-costing.mjs';
import {planRoImport} from './ro-import-plan.mjs';
import {prepareRoDriveReferences} from './ro-drive-reference-plan.mjs';

export function prepareRoReferenceBatches(patches,creations,driveManifest,expectedReleaseSha){
 if(!Array.isArray(patches)||!patches.length||!Array.isArray(creations))throw Error('Provide comparison patch and creation-record arrays.');
 const byRo=new Map();for(const entry of creations){const r=validateRoRecord(entry.record||entry);planRoImport(r,null,'worksheetComparison');if(byRo.has(r.ro))throw Error('Duplicate creation RO.');byRo.set(r.ro,r);}
 const seen=new Set(),records=patches.map(entry=>{
  const r=validateRoRecord(entry.record||entry);if(!r.worksheetComparison||seen.has(r.ro))throw Error('Missing comparison or duplicate exact patch RO.');seen.add(r.ro);
  const creationRecord=byRo.get(r.ro);if(!creationRecord||!isDeepStrictEqual(r.worksheetComparison,creationRecord.worksheetComparison))throw Error('Exact RO creation and comparison sources differ.');
  return {record:{ro:r.ro,worksheetComparison:r.worksheetComparison},creationRecord};
 });
 if(byRo.size!==seen.size)throw Error('Creation and patch RO catalogues differ.');
 const refs=prepareRoDriveReferences(driveManifest);if(refs.some(d=>!seen.has(d.ro)))throw Error('Drive document association is outside the exact catalogue.');
 const batches=[];for(let offset=0;offset<records.length;offset+=30){const batch=records.slice(offset,offset+30),ros=new Set(batch.map(e=>e.record.ro));batches.push({mode:'worksheetComparison',expectedReleaseSha,reason:'Add audited worksheet references and essential private Drive links; preserve existing actuals',records:batch,driveDocuments:refs.filter(d=>ros.has(d.ro))});}
 return batches;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [patchFile,creationFile,manifestFile,outputDir,expectedReleaseSha]=process.argv.slice(2);
 if(!patchFile||!creationFile||!manifestFile||!outputDir)throw Error('Usage: node scripts/prepare-ro-reference-batches.mjs <comparison-patches.json> <validated-creation-records.json> <verified-drive-manifest.json> <private-output-directory> [verified-live-release-sha]');
 const read=path=>JSON.parse(readFileSync(path,'utf8')),patches=read(patchFile),creations=read(creationFile);
 const batches=prepareRoReferenceBatches(Array.isArray(patches)?patches:patches.records,Array.isArray(creations)?creations:creations.records,read(manifestFile),expectedReleaseSha||null);
 const repo=resolve(dirname(fileURLToPath(import.meta.url)),'..'),output=resolve(outputDir),rel=relative(repo,output);
 if(!rel.startsWith('..')&&!isAbsolute(rel)&&!rel.startsWith('test-output/'))throw Error('Private output must be outside the repository or inside ignored test-output.');
 mkdirSync(output,{recursive:true,mode:0o700});const resolved=realpathSync(output),actual=relative(repo,resolved);
 if(!actual.startsWith('..')&&!isAbsolute(actual)&&!actual.startsWith('test-output/'))throw Error('Private output symlink resolves into public repository files.');
 batches.forEach((batch,n)=>writeFileSync(join(resolved,'ro-reference-batch-'+String(n+1).padStart(2,'0')+'.json'),JSON.stringify(batch,null,2),{mode:0o600,flag:'wx'}));
 console.log('Prepared '+batches.length+' private batches; no website writes.');
}
