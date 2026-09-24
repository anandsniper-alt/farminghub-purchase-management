import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createCleanSeed} from '../shared/clean-seed.mjs';
import {execute} from '../shared/domain.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export function domesticCatalogue(){
 const source=JSON.parse(readFileSync(join(root,'data-reference/domestic-bom.json'),'utf8'));
 const suffix=' WITH SILENCER, NIPPLE';
 return {sourceName:source.sourceName,sourceHash:source.sourceSha256,items:[...source.items,...[
 ['TX-MT1','MONO BLOCK OIL VACUUM PUMP 150LPM 0.5HP WITH SILENCER & NIPPLE & EXTENSION SHAFT'],
 ['GJ-MT1','MONO BLOCK OIL VACUUM PUMP 150LPM 0.5HP'+suffix+', EXTENSION SHAFT & DIGITAL METER'],
 ['GJ-MT2','MONO BLOCK OIL VACUUM PUMP 200LPM 0.75HP'+suffix+', EXTENSION SHAFT & DIGITAL METER'],
 ['GJ-MT3','MONO BLOCK OIL VACUUM PUMP 150LPM 0.5HP WITH SILENCER & NIPPLE & DIGITAL METER']
 ].map(([code,description])=>({code,description,segment:'MOTOR',uom:'PCS',rate:null}))],
 canSets:[{code:'CS1',name:'Can set for TX-MM1'},{code:'CS2',name:'Common can set for GJ-MM2 / GJ-MM3 / GJ-MM4'}],
 models:[
 {code:'TX-MM1',name:'TERMAX - MILKING MACHINE - (SS-202) 150NF-AP-ML',motorCode:'TX-MT1',canSetCode:'CS1'},
 {code:'GJ-MM2',name:'GAJA - MILKING MACHINE - (SS-304) 150MF-AP-ML',motorCode:'GJ-MT1',canSetCode:'CS2'},
 {code:'GJ-MM3',name:'GAJA - MILKING MACHINE - (SS-304) 200LF-AP-ML',motorCode:'GJ-MT2',canSetCode:'CS2'},
 {code:'GJ-MM4',name:'GAJA - MILKING MACHINE - (SS-304) 150ST-AP-ML',motorCode:'GJ-MT3',canSetCode:'CS2'}
 ].map(m=>({...m,imageAsset:m.code+'.png',frameName:'Frame set · '+m.code}))};
}
export function domesticPreviewState(){const state=createCleanSeed();for(const u of state.users)u.scopes.push('LAE_DOMESTIC');return execute(state,{type:'DOMESTIC_IMPORT_CATALOGUE',payload:domesticCatalogue()},state.users.find(u=>u.role==='MANAGER')).state;}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 mkdirSync(join(root,'test-output'),{recursive:true});
 writeFileSync(join(root,'test-output/domestic-preview-state.json'),JSON.stringify(domesticPreviewState()));
 console.log('Prepared isolated preview: 37 items, 4 models, 2 shared can sets and 4 empty frame assemblies. No live data changed.');
}
