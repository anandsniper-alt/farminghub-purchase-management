// Local-only attachment viewer. Office files are rendered as data, never executed.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let active=null;
export function previewType(name){return ({pdf:'pdf',png:'image',jpg:'image',jpeg:'image',webp:'image',gif:'image',txt:'text',csv:'csv',eml:'text',json:'text',xlsx:'xlsx',docx:'docx'})[String(name).split('.').at(-1).toLowerCase()]||'unsupported';}
export function previewCsv(text,maxRows=500){
 const rows=[];let row=[],cell='',quoted=false,truncated=false;
 const delimiter=text.split(/\r?\n/)[0].includes(';')&&!text.split(/\r?\n/)[0].includes(',')?';':',';
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===delimiter&&!quoted){if(row.length<50)row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;if(row.length<50)row.push(cell);rows.push(row);row=[];cell='';if(rows.length>=maxRows){truncated=i<text.length-1;break;}}else cell+=c;}
 if(!truncated&&(cell||row.length)){if(row.length<50)row.push(cell);rows.push(row);}return {rows,truncated};
}
export function checkPreviewZip(entries){if(entries.length>4000||entries.reduce((n,e)=>n+(e._data?.uncompressedSize||0),0)>40*1024*1024)throw Error('This document is too large for a content preview. Download the original to view it.');}
export function previewSizeAllowed(size,type){return Number.isFinite(size)&&size>=0&&size<=({xlsx:10,docx:10,pdf:25,image:20}[type]||50)*1024*1024;}

// Inspect dimensions before asking the browser to decode compressed raster data.
export function verifyPreviewImage(bytes){
 const data=new Uint8Array(bytes.buffer,bytes.byteOffset,bytes.byteLength),view=new DataView(data.buffer,data.byteOffset,data.byteLength);
 const ascii=(p,n)=>String.fromCharCode(...data.subarray(p,p+n)),u16=p=>view.getUint16(p,true),u24=p=>data[p]+data[p+1]*256+data[p+2]*65536;
 let width=0,height=0,frames=0,pixels=0;
 const check=(w,h)=>{if(!Number.isSafeInteger(w)||!Number.isSafeInteger(h)||w<1||h<1||w>8192||h>8192||w*h>16e6)throw Error('Image dimensions exceed the browser preview limit. Download the original to view it.');};
 const frame=(w,h)=>{check(w,h);frames++;pixels+=Math.max(width*height,w*h);if(frames>100||pixels>32e6)throw Error('Animated image exceeds the browser preview limit. Download the original to view it.');};
 if(data.length>=24&&data[0]===137&&ascii(1,3)==='PNG'&&ascii(12,4)==='IHDR'){
  width=view.getUint32(16);height=view.getUint32(20);check(width,height);
  for(let p=8;p+12<=data.length;){const length=view.getUint32(p),tag=ascii(p+4,4);if(length>data.length-p-12)throw Error('Invalid image structure.');if(tag==='fcTL'){if(length<26)throw Error('Invalid animated image structure.');frame(view.getUint32(p+16),view.getUint32(p+20));}p+=12+length;}
 }else if(data.length>=10&&/^GIF8[79]a$/.test(ascii(0,6))){
  width=u16(6);height=u16(8);check(width,height);if(data.length<13)throw Error('Invalid image structure.');let p=13+(data[10]&128?3*(2**((data[10]&7)+1)):0);
  const skipBlocks=()=>{while(p<data.length){const n=data[p++];if(!n)return;p+=n;if(p>data.length)throw Error('Invalid image structure.');}throw Error('Invalid image structure.');};
  while(p<data.length){const marker=data[p++];if(marker===59)break;if(marker===33){p++;skipBlocks();}else if(marker===44){if(p+9>data.length)throw Error('Invalid image structure.');frame(u16(p+4),u16(p+6));const flags=data[p+8];p+=9+(flags&128?3*(2**((flags&7)+1)):0);p++;skipBlocks();}else throw Error('Invalid image structure.');}
 }else if(data.length>=4&&data[0]===255&&data[1]===216){
  for(let p=2;p+4<=data.length;){if(data[p++]!==255)throw Error('Invalid JPEG structure.');while(data[p]===255)p++;const marker=data[p++];if(marker===218||marker===217)break;if(marker===1||marker>=208&&marker<=215)continue;if(p+2>data.length)break;const length=view.getUint16(p);if(length<2||p+length>data.length)throw Error('Invalid JPEG structure.');if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)){if(length<8)throw Error('Invalid JPEG dimensions.');height=view.getUint16(p+3);width=view.getUint16(p+5);check(width,height);break;}p+=length;}
 }else if(data.length>=30&&ascii(0,4)==='RIFF'&&ascii(8,4)==='WEBP'){
  // WebP RIFF/VP8X dimensions follow RFC 9649; also check embedded bitstream sizes.
  const chunks=(start,end,depth=0)=>{if(depth>1)throw Error('Invalid nested WebP animation.');for(let p=start;p+8<=end;){const tag=ascii(p,4),length=view.getUint32(p+4,true),body=p+8;if(length>end-body)throw Error('Invalid WebP structure.');let w=0,h=0;
   if(tag==='VP8X'){if(length<10)throw Error('Invalid WebP dimensions.');width=u24(body+4)+1;height=u24(body+7)+1;check(width,height);}
   if(tag==='VP8 '){if(length<10||ascii(body+3,3)!=='\x9d\x01\x2a')throw Error('Invalid WebP dimensions.');w=u16(body+6)&16383;h=u16(body+8)&16383;}
   if(tag==='VP8L'){if(length<5||data[body]!==47)throw Error('Invalid WebP dimensions.');w=1+data[body+1]+((data[body+2]&63)<<8);h=1+(data[body+2]>>6)+(data[body+3]<<2)+((data[body+4]&15)<<10);}
   if(w){check(w,h);if(!width){width=w;height=h;}}
   if(tag==='ANMF'){if(length<16)throw Error('Invalid WebP animation.');frame(u24(body+6)+1,u24(body+9)+1);chunks(body+16,body+length,depth+1);}
   p=body+length+(length&1);
  }};chunks(12,data.length);
 }
 if(!width||!height)throw Error('Image dimensions could not be verified. Download the original to view it.');
 return {width,height};
}

// Count actual inflated bytes. ZIP headers are untrusted and may understate size.
export function createPreviewZipReader(zip,{entryLimit=25*1024*1024,totalLimit=40*1024*1024,alive=()=>true}={}){
 let expanded=0;const cache=new Map();
 return function readBytes(path){
  if(!path||path.startsWith('/')||path.includes('\\')||path.split('/').includes('..')||path.includes(':'))return Promise.reject(Error('Unsupported document content path.'));
  if(cache.has(path))return cache.get(path);
  const file=zip.file(path);if(!file)return Promise.reject(Error('Document content is missing.'));
  const result=new Promise((resolve,reject)=>{const stream=file.internalStream('uint8array'),parts=[];let size=0,failed=false;
   const fail=e=>{if(failed)return;failed=true;stream.pause();reject(e);};
   stream.on('data',chunk=>{if(failed)return;if(!alive())return fail(Error('Preview closed.'));size+=chunk.byteLength;expanded+=chunk.byteLength;
    if(size>entryLimit||expanded>totalLimit)return fail(Error('This document expands beyond the preview limit. Download the original to view it.'));
    parts.push(chunk);
   }).on('error',fail).on('end',()=>{if(failed)return;const bytes=new Uint8Array(size);let offset=0;for(const chunk of parts){bytes.set(chunk,offset);offset+=chunk.byteLength;}resolve(bytes);}).resume();
  });cache.set(path,result);return result;
 };
}
function table(rows){return '<div class="fh-file-table"><table><tbody>'+rows.map(r=>'<tr>'+r.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';}
const elements=(x,name)=>[...x.getElementsByTagNameNS('*',name)];
function xml(text){if(/<!DOCTYPE|<!ENTITY/i.test(text))throw Error('Unsupported document XML.');const x=new DOMParser().parseFromString(text,'application/xml');if(x.querySelector('parsererror'))throw Error('This document could not be read.');return x;}
async function office(blob,type,target,alive,setCleanup){
 if(!window.JSZip)throw Error('Office preview is unavailable in this browser. Download the original.');
 const zip=await window.JSZip.loadAsync(await blob.arrayBuffer());checkPreviewZip(Object.values(zip.files));
 const readBytes=createPreviewZipReader(zip,{alive}),read=async path=>xml(new TextDecoder('utf-8',{fatal:true}).decode(await readBytes(path)));
 const note=document.createElement('p');note.textContent='Read-only content preview. Original formatting, drawings and charts may differ. Download the original for the complete document.';target.replaceChildren(note);
 if(type==='xlsx')note.textContent='Read-only Excel preview - use Fit to width or zoom to inspect the sheet. Download keeps the original workbook.';
 if(type==='docx'){
  const doc=await read('word/document.xml');if(!alive())return;
  const content=document.createElement('div');content.className='fh-file-word';
  const body=elements(doc,'body')[0];if(!body)throw Error('Word document content is missing.');
  for(const n of [...body.children].slice(0,2000)){
   if(n.localName==='p'){const p=document.createElement('p');p.textContent=elements(n,'t').map(t=>t.textContent).join('');content.append(p);}
   if(n.localName==='tbl'){const holder=document.createElement('div');holder.innerHTML=table(elements(n,'tr').slice(0,500).map(r=>[...r.children].filter(c=>c.localName==='tc').slice(0,50).map(c=>elements(c,'t').map(t=>t.textContent).join(' '))));content.append(holder);}
  }
  target.append(content);if(body.children.length>2000)target.append('Preview limited to the first 2,000 document blocks.');return;
 }
 const {renderXlsxSheet}=await import('./xlsx-preview.mjs');if(!alive())return;
 const wb=await read('xl/workbook.xml'),rels=await read('xl/_rels/workbook.xml.rels');
 const strings=zip.file('xl/sharedStrings.xml')?elements(await read('xl/sharedStrings.xml'),'si').map(s=>elements(s,'t').map(t=>t.textContent).join('')):[];
 const styleDoc=zip.file('xl/styles.xml')?await read('xl/styles.xml'):null,themeDoc=zip.file('xl/theme/theme1.xml')?await read('xl/theme/theme1.xml'):null,date1904=['1','true'].includes(elements(wb,'workbookPr')[0]?.getAttribute('date1904'));
 if(!alive())return;
 const sheets=elements(wb,'sheet');if(!sheets.length||sheets.length>100)throw Error('This workbook has an unsupported worksheet count. Download the original to view it.');
 const select=document.createElement('select'),label=document.createElement('label'),area=document.createElement('div');
 label.textContent='Worksheet ';select.setAttribute('aria-label','Preview worksheet');sheets.forEach((s,i)=>select.add(new Option(s.getAttribute('name')||'Sheet '+(i+1),String(i))));label.append(select);target.append(label,area);
 let serial=0,observer;setCleanup(()=>observer?.disconnect());
 const show=async()=>{const request=++serial;observer?.disconnect();area.textContent='Loading worksheet…';try{
  const sheet=sheets[Number(select.value)],rid=sheet?.getAttribute('r:id'),rel=elements(rels,'Relationship').find(r=>r.getAttribute('Id')===rid);
  if(!rel||rel.getAttribute('TargetMode')==='External')throw Error('Worksheet is unavailable.');
  let path=rel.getAttribute('Target')||'';path=path.startsWith('/')?path.slice(1):'xl/'+path.replace(/^\.\//,'');
  if(path.includes('..')||!path.startsWith('xl/'))throw Error('Unsupported worksheet location.');
  const doc=await read(path);if(!alive()||request!==serial)return;
  const rendered=await renderXlsxSheet({zip,read,readBytes,doc,path,strings,styleDoc,themeDoc,date1904});if(!alive()||request!==serial)return;
  const controls=document.createElement('div'),zoom=document.createElement('select'),zoomLabel=document.createElement('label'),viewport=document.createElement('div'),sizer=document.createElement('div'),hint=document.createElement('p');
  zoom.setAttribute('aria-label','Worksheet zoom');for(const [value,text] of [['fit','Fit to width'],['0.75','75%'],['1','100%'],['1.25','125%'],['1.5','150%']])zoom.add(new Option(text,value));
  zoomLabel.textContent='Zoom ';zoomLabel.append(zoom);controls.append(zoomLabel);viewport.style.cssText='overflow:auto;max-width:100%;background:#e8ede5;padding:8px;box-sizing:border-box';sizer.style.position='relative';sizer.append(rendered.surface);viewport.append(sizer);
  hint.textContent='Formula results show saved values. Charts and advanced Excel features may differ.'+(rendered.truncated?' Preview limited to 500 rows and 50 columns; download for the complete sheet.':'');
  area.replaceChildren(controls,viewport,hint);
  const resize=()=>{const scale=zoom.value==='fit'?Math.min(1,Math.max(0.1,(viewport.clientWidth-16)/rendered.width)):Number(zoom.value);rendered.surface.style.transformOrigin='top left';rendered.surface.style.transform='scale('+scale+')';sizer.style.width=rendered.width*scale+'px';sizer.style.height=rendered.height*scale+'px';};
  zoom.onchange=resize;observer=new ResizeObserver(resize);observer.observe(viewport);resize();

 }catch(e){if(alive()&&request===serial)area.textContent=e.message;}};
 select.addEventListener('change',show);await show();
}
function styles(){if(document.getElementById('fh-file-preview-style'))return;const style=document.createElement('style');style.id='fh-file-preview-style';style.textContent=`
 .fh-file-preview{padding:0;width:min(1180px,94vw);max-width:94vw;height:90vh;max-height:94vh;border:1px solid var(--line,#e3e8dc);border-radius:16px;background:#fff;color:var(--text,#203a25);box-shadow:0 18px 70px #0004;font:inherit;line-height:1.5}
 .fh-file-preview::backdrop{background:#11291899}.fh-file-shell{height:100%;display:flex;flex-direction:column}.fh-file-head{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:18px 24px;border-bottom:1px solid var(--line,#e3e8dc)}.fh-file-head h2{font-size:20px;margin:0;overflow-wrap:anywhere}.fh-file-head p{margin:4px 0 0;color:var(--muted,#748176);font-size:13px}.fh-file-actions{display:flex;gap:10px;flex-shrink:0}.fh-file-preview button{padding:10px 18px;border:1px solid #cbd9c7;border-radius:8px;background:#fff;color:var(--text,#203a25);cursor:pointer;font:inherit;font-weight:600;min-height:44px}.fh-file-preview button[data-download]{background:#204321;color:white}.fh-file-preview button:disabled{opacity:.5;cursor:wait}.fh-file-body{flex:1;min-height:0;overflow:auto;padding:20px 24px;background:var(--bg,#f7f8f1)}.fh-file-body iframe{width:100%;height:100%;border:0;background:white}.fh-file-image{display:block;max-width:100%;height:auto;margin:auto;background:white}.fh-file-body pre{white-space:pre-wrap;overflow-wrap:anywhere;color:var(--text,#203a25);background:white;padding:20px}.fh-file-table{overflow:auto;max-width:100%}.fh-file-table table{border-collapse:collapse;min-width:100%;background:white}.fh-file-table td{border:1px solid var(--line,#e3e8dc);padding:8px 12px;white-space:pre-wrap;min-width:80px;max-width:450px;overflow-wrap:anywhere}.fh-file-word{background:white;padding:24px}.fh-file-body select{margin:0 0 16px 10px;padding:10px;max-width:70%}@media(max-width:600px){.fh-file-head{align-items:flex-start;flex-direction:column;padding:14px}.fh-file-body{padding:12px}.fh-file-preview{height:94vh}}
 `;document.head.append(style);}
async function pdfPreview(blob,target,alive,setCleanup){
 const pdfjs=await import('./vendor/pdfjs/pdf.min.mjs');if(!alive())return;
 pdfjs.GlobalWorkerOptions.workerSrc='/vendor/pdfjs/pdf.worker.min.mjs';
 const task=pdfjs.getDocument({data:new Uint8Array(await blob.arrayBuffer()),cMapUrl:'/vendor/pdfjs/cmaps/',cMapPacked:true,standardFontDataUrl:'/vendor/pdfjs/standard_fonts/',wasmUrl:'/vendor/pdfjs/wasm/',maxImageSize:16e6,isEvalSupported:false});
 setCleanup(()=>task.destroy());const pdf=await task.promise;if(!alive()){await task.destroy();return;}
 const controls=document.createElement('div'),prev=document.createElement('button'),next=document.createElement('button'),label=document.createElement('span'),canvas=document.createElement('canvas'),pageArea=document.createElement('div');
 prev.type=next.type='button';prev.textContent='Previous page';next.textContent='Next page';controls.style.cssText='display:flex;align-items:center;justify-content:center;gap:18px;margin-bottom:16px';controls.append(prev,label,next);canvas.style.cssText='display:block;max-width:100%;height:auto;margin:auto;background:white;box-shadow:0 2px 12px #0002';pageArea.append(canvas);target.replaceChildren(controls,pageArea);
 let number=1,rendering=false;
 const render=async()=>{if(rendering||!alive())return;rendering=true;prev.disabled=next.disabled=true;label.textContent='Page '+number+' of '+pdf.numPages;canvas.setAttribute('role','img');canvas.setAttribute('aria-label','PDF page '+number+' of '+pdf.numPages);
  try{const page=await pdf.getPage(number);if(!alive())return;const base=page.getViewport({scale:1});if(!Number.isFinite(base.width)||!Number.isFinite(base.height)||base.width<=0||base.height<=0)throw Error('Invalid PDF page size.');const width=Math.min(1600,Math.max(800,target.clientWidth*1.5)),scale=Math.min(3,width/base.width,4096/base.width,4096/base.height,Math.sqrt(8e6/(base.width*base.height))),viewport=page.getViewport({scale});canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;}
  catch(e){if(alive())label.textContent='Page could not be rendered. Download the original.';}
  finally{rendering=false;if(alive()){prev.disabled=number<=1;next.disabled=number>=pdf.numPages;}}
 };prev.onclick=()=>{if(!rendering&&number>1){number--;render();}};next.onclick=()=>{if(!rendering&&number<pdf.numPages){number++;render();}};await render();
}
export async function previewAttachment({name,load}){
 active?.();styles();const focus=document.activeElement,dialog=document.createElement('dialog');dialog.className='fh-file-preview';dialog.setAttribute('aria-label','File preview');
 dialog.innerHTML='<div class="fh-file-shell"><header class="fh-file-head"><div><h2>'+esc(name)+'</h2><p>File preview · download only when needed</p></div><div class="fh-file-actions"><button type="button" data-download disabled>Download</button><button type="button" data-close>Close preview</button></div></header><div class="fh-file-body" aria-live="polite">Loading file preview…</div></div>';
 const body=dialog.querySelector('.fh-file-body'),save=dialog.querySelector('[data-download]');let blob,url,closed=false,cleanup;
 const close=()=>{if(closed)return;closed=true;if(url)URL.revokeObjectURL(url);if(cleanup)Promise.resolve(cleanup()).catch(()=>{});dialog.close();dialog.remove();window.removeEventListener('hashchange',close);window.removeEventListener('pagehide',close);if(active===close)active=null;if(focus?.isConnected)focus.focus();};active=close;
 dialog.querySelector('[data-close]').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.addEventListener('keydown',e=>{if(e.key==='Escape'||e.key==='Tab')e.stopPropagation();});
 save.onclick=()=>{if(!blob)return;const downloadUrl=URL.createObjectURL(blob),a=document.createElement('a');a.href=downloadUrl;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(downloadUrl),30000);};
 window.addEventListener('hashchange',close);window.addEventListener('pagehide',close);document.body.append(dialog);dialog.showModal();dialog.querySelector('[data-close]').focus();
 try{blob=await load();if(closed)return;if(!blob)throw Error('File content is unavailable.');save.disabled=false;const type=previewType(name);if(!previewSizeAllowed(blob.size,type))throw Error('This file is too large for a browser preview. Download the original to view it.');
  if(type==='pdf')await pdfPreview(blob,body,()=>!closed,fn=>{cleanup=fn;if(closed)Promise.resolve(fn()).catch(()=>{});});
  else if(type==='image'){
   verifyPreviewImage(new Uint8Array(await blob.arrayBuffer()));if(closed)return;
   const ext=name.split('.').at(-1).toLowerCase(),mime=type==='pdf'?'application/pdf':({jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif'})[ext];
   url=URL.createObjectURL(new Blob([blob],{type:mime}));const el=document.createElement(type==='pdf'?'iframe':'img');if(type==='pdf'){el.title='PDF preview';el.src=url;}else{el.alt=name;el.className='fh-file-image';el.src=url;el.onerror=()=>{body.textContent='This image cannot be displayed. Download the original to inspect it.';};}body.replaceChildren(el);
  }else if(type==='xlsx'||type==='docx')await office(blob,type,body,()=>!closed,fn=>{cleanup=fn;if(closed)fn();});
  else if(type==='csv'){const text=await blob.slice(0,2*1024*1024).text();if(closed)return;const result=previewCsv(text);body.innerHTML='<p>Read-only preview: up to 500 rows and 50 columns.</p>'+table(result.rows)+((result.truncated||blob.size>2*1024*1024)?'<p>Preview shortened. Download for the complete file.</p>':'');}
  else if(type==='text'){const text=await blob.slice(0,1024*1024).text();if(closed)return;const pre=document.createElement('pre');pre.textContent=text;body.replaceChildren(pre);if(blob.size>1024*1024)body.append('Preview shortened. Download for the complete file.');}
  else body.textContent='A preview is not available for this file type. Use Download to open the original.';
 }catch(e){if(!closed)body.textContent='Preview could not be displayed. '+e.message;}
}
export async function previewAttachmentUrl(name,url){
 const target=new URL(url,location.href);if(target.origin!==location.origin)throw Error('Only local ERP attachments can use this viewer.');
 return previewAttachment({name,load:async()=>{const r=await fetch(target,{credentials:'same-origin'});if(!r.ok)throw Error(r.status===401?'Please sign in again.':'File unavailable or access denied.');return r.blob();}});
}
