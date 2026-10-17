import {posix} from 'node:path';

// Keep module-private names private in the single-file review. The hosted app
// still uses native ESM; no seed or review registry enters its module graph.
export function reviewBundle(roots,read){
 const sources=new Map(),order=[],visiting=new Set();
 const resolve=(file,dep)=>posix.normalize(posix.join(posix.dirname(file),dep));
 const imports=s=>[...s.matchAll(/^import\s+([^;\n]+?)\s+from\s+['"]([^'"]+)['"](?:\s+with\s+\{[^}]+\})?;?/gm)];
 const dynamic=s=>[...s.matchAll(/\bimport\(\s*['"](\.[^'"]+\.mjs)['"]\s*\)/g)];
 function visit(file){
  if(sources.has(file)||visiting.has(file))return;
  visiting.add(file);const source=read(file);
  for(const match of [...imports(source),...source.matchAll(/^export\s+\{[^}]+\}\s+from\s+['"]([^'"]+)['"];?/gm)]){
   const dep=match[2]||match[1];if(dep.startsWith('.')&&!dep.endsWith('.json'))visit(resolve(file,dep));
  }
  for(const match of dynamic(source)){const target=resolve(file,match[1]);if(!target.includes('/vendor/'))visit(target);}
  visiting.delete(file);sources.set(file,source);order.push(file);
 }
 for(const root of roots)visit(root);
 const publicNames=new Set(),bindingsByFile=new Map();
 for(const file of order){
  const names=[...sources.get(file).matchAll(/^export\s+(?:(?:async\s+)?function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/gm)].map(m=>m[1]),bindings=new Map();
  for(const name of names){const binding=publicNames.has(name)?`__fh_${bindingsByFile.size}_${name}`:name;publicNames.add(binding);bindings.set(name,binding);}
  bindingsByFile.set(file,bindings);
 }
 let bundle='const __fhReviewModules=Object.create(null);\n';
 for(const file of order){
  const original=sources.get(file),exports=[...original.matchAll(/^export\s+(?:(?:async\s+)?function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/gm)].map(m=>m[1]);
  const forwarded=[...original.matchAll(/^export\s+\{([^}]+)\}\s+from\s+['"][^'"]+['"];?/gm)].flatMap(m=>m[1].split(',').map(x=>x.trim()));
  let code=original;
  for(const match of imports(original)){
   const bindings=match[1].trim(),dep=match[2];let replacement='';
   if(dep.endsWith('.json'))replacement=`const ${bindings}=${read(resolve(file,dep))};`;
   else if(bindings.startsWith('{'))replacement=bindings.slice(1,-1).split(',').filter(x=>x.trim()).map(x=>{const [name,alias=name]=x.trim().split(/\s+as\s+/),binding=bindingsByFile.get(resolve(file,dep))?.get(name)||name;return alias===binding?'':`const ${alias}=${binding};`;}).join('\n');
   else if(bindings.startsWith('* as '))replacement=`const ${bindings.slice(5)}=__fhReviewModules[${JSON.stringify(resolve(file,dep))}];`;
   else throw new Error('Unsupported standalone import in '+file);
   code=code.replace(match[0],replacement);
  }
  code=code.replace(/^export\s+\{[^}]+\}\s+from\s+['"][^'"]+['"];?/gm,'').replace(/^export\s+/gm,'');
  code=code.replace(/\bimport\(\s*['"](\.[^'"]+\.mjs)['"]\s*\)/g,(whole,dep)=>{const target=resolve(file,dep);return sources.has(target)?`Promise.resolve(__fhReviewModules[${JSON.stringify(target)}])`:whole;});
  const bindings=bindingsByFile.get(file),mapped=exports.map(name=>name===bindings.get(name)?name:`${name}:${bindings.get(name)}`);
  const declared=exports.length?`const {${mapped.join(',')}}=`:'';
  bundle+=`\n// ${file}\n${declared}(()=>{\n${code}\nreturn {${exports.join(',')}};\n})();\n`;
  bundle+=`__fhReviewModules[${JSON.stringify(file)}]={${[...mapped,...forwarded].join(',')}};\n`;
 }
 return {code:bundle,modules:order};
}
