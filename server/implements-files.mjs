import {readFileSync,readdirSync} from 'node:fs';
import {resolve,join,dirname,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {RuleError} from '../shared/domain.mjs';
import {calculateModelCost} from '../shared/implements/costing.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),web=join(root,'web/implements');
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'};
export const implementsAssets=new Map();
function inventory(dir,prefix=''){for(const entry of readdirSync(dir,{withFileTypes:true})){const name=prefix+entry.name;if(entry.isDirectory())inventory(join(dir,entry.name),name+'/');else if(mime[extname(name)])implementsAssets.set('/implements/'+name,{file:join(web,name),type:mime[extname(name)]});}}
inventory(web);for(const name of ['domain.mjs','costing.mjs','sales-pricing.mjs','item-images.mjs'])implementsAssets.set('/shared/implements/'+name,{file:join(root,'shared/implements',name),type:'text/javascript; charset=utf-8'});implementsAssets.set('/implements/',implementsAssets.get('/implements/index.html'));
let jobs=0;
function run(file,args,data){return new Promise((resolveJob,reject)=>{
 const python=process.env.FH_PYTHON||'python3',child=spawn(python,[join(root,'server/implements-files',file),...args],{windowsHide:true,env:{...process.env,PYTHONIOENCODING:'utf-8'}}),chunks=[];let bytes=0,errors='';
 const timer=setTimeout(()=>child.kill(),60000);
 child.stdout.on('data',chunk=>{bytes+=chunk.length;if(bytes>40e6)child.kill();else chunks.push(chunk);});
 child.stderr.on('data',chunk=>errors=(errors+chunk.toString()).slice(-1500));
 child.on('error',()=>{clearTimeout(timer);reject(new RuleError('File processing is unavailable. Please try again later.'));});
 child.on('close',code=>{clearTimeout(timer);if(code===0)resolveJob(Buffer.concat(chunks));else reject(new RuleError(errors.split('\n').filter(Boolean).at(-1)||'File processing failed. Check the file and try again.'));});
 child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify(data));
 });}
const sheetType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export async function implementsExport(path,data,state){
 if(jobs>=2)throw new RuleError('Two files are processing. Please try again shortly.');jobs++;
 try{
  if(path==='/api/implements/read-stock')return {type:'application/json',bytes:await run('files.py',['stock'],data)};
  if(path==='/api/implements/export/costing'){
   if(!Array.isArray(data.models)||!data.models.length||data.models.length>1000)throw new RuleError('Select models to export.');
   const ids=new Set(data.models.map(m=>m.id));if([...ids].some(id=>!state.models.some(m=>m.id===id)))throw new RuleError('Unknown model.');
   const reports=state.models.filter(m=>ids.has(m.id)).map(m=>calculateModelCost(state,m.id));
   if(data.selection&&(reports.length!==1||!Array.isArray(data.selection.ids)||!data.selection.ids.length||data.selection.ids.some(id=>!reports[0].rows.some(r=>r.id===id))))throw new RuleError('Invalid filtered cost selection.');
   return {type:sheetType,name:'Rotavator_Model_Costs.xlsx',bytes:await run('export-costing.py',[],{reports,selection:data.selection||null})};
  }
  if(path==='/api/implements/export/items'){
   if(!Array.isArray(data.rows)||!data.rows.length||data.rows.length>5000)throw new RuleError('Invalid Item Master export.');
   let imageBytes=0;const rows=data.rows.map(row=>{
    const clean={};for(const key of ['code','name','category','type','unit','models','drawing','supplier','imageStatus']){if(typeof row[key]!=='string'||row[key].length>20000)throw new RuleError('Invalid item field.');clean[key]=row[key];}
    const src=row.image;if(typeof src!=='string')throw new RuleError('Invalid item image.');
    if(src.startsWith('data:')){if(src.length>100000||!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(src))throw new RuleError('Invalid uploaded image.');clean.image=src.split(',')[1];}
    else if(src){const asset=implementsAssets.get(src);if(!src.startsWith('/implements/assets/parts/')||!asset?.type.startsWith('image/'))throw new RuleError('Unknown item image.');clean.image=readFileSync(asset.file).toString('base64');}
    imageBytes+=clean.image?.length||0;if(imageBytes>35e6)throw new RuleError('Filter the list into smaller groups to export its photos.');return clean;
   });return {type:sheetType,name:'Rotavator_Item_Master.xlsx',bytes:await run('export-items.py',[],{rows})};
  }
  const po=state.orders.find(po=>po.id===data.id);if(!po)throw new RuleError('Saved purchase order not found.','NOT_FOUND');
  const format=path.split('/').at(-1);if(!['pdf','xlsx'].includes(format))throw new RuleError('Export not found.','NOT_FOUND');
  return {type:format==='pdf'?'application/pdf':sheetType,name:po.id+'.'+format,bytes:await run(format==='pdf'?'files.py':'export-po.py',format==='pdf'?['pdf']:[],po)};
 }finally{jobs--;}
}
