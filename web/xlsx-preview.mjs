import {verifyPreviewImage} from './file-preview.mjs';
// Bounded, local OOXML display. No formula evaluation, external links or active content.
const nodes=(x,n)=>x?[...x.getElementsByTagNameNS('*',n)]:[];
const first=(x,n)=>nodes(x,n)[0];
const attr=(x,n,f='')=>x?.getAttribute(n)??f;
const number=(x,f=0)=>Number.isFinite(Number(x))&&x!==''?Number(x):f;
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const flag=(x,n)=>!!first(x,n)&&attr(first(x,n),'val','1')!=='0';
const builtin={0:'General',1:'0',2:'0.00',3:'#,##0',4:'#,##0.00',9:'0%',10:'0.00%',14:'mm-dd-yy',15:'d-mmm-yy',16:'d-mmm',17:'mmm-yy',18:'h:mm AM/PM',19:'h:mm:ss AM/PM',20:'h:mm',21:'h:mm:ss',22:'m/d/yy h:mm',49:'@'};

export function cellPosition(ref){
 const m=/^\$?([A-Z]{1,3})\$?([1-9]\d{0,6})$/.exec(ref||'');if(!m)return null;
 let c=0;for(const ch of m[1])c=c*26+ch.charCodeAt(0)-64;return {c:c-1,r:Number(m[2])-1};
}
export function localPart(base,target){
 if(!target||/[\\?#:]/.test(target))return null;
 const parts=target.startsWith('/')?[]:base.split('/').slice(0,-1);
 for(const p of target.split('/')){if(p==='..'){if(!parts.length)return null;parts.pop();}else if(p&&p!=='.')parts.push(p);}
 const path=parts.join('/');return path.startsWith('xl/')?path:null;
}
function dateText(value,fmt,date1904){
 if(value<0||value>2958465)return null;
 const days=Math.floor(value),ms=Math.round((value-days)*86400000);
 const d=new Date(Date.UTC(date1904?1904:1899,date1904?0:11,date1904?1:31)+(days-(date1904?0:days>=60?1:0))*86400000+ms);
 const Y=d.getUTCFullYear(),M=d.getUTCMonth(),D=!date1904&&days===60?29:d.getUTCDate();
 const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
 const pad=n=>String(n).padStart(2,'0'),hour=d.getUTCHours(),amp=/AM\/PM/i.test(fmt);
 let seenHour=false;
 return fmt.replace(/AM\/PM|yyyy|yy|mmmm|mmm|mm|m|dddd|ddd|dd|d|hh|h|ss|s/gi,(t,offset)=>{
  switch(t.toLowerCase()){
   case 'yyyy':return String(Y);case 'yy':return pad(Y%100);
   case 'mmmm':return new Intl.DateTimeFormat('en',{month:'long',timeZone:'UTC'}).format(d);
   case 'mmm':return months[M];case 'm':case 'mm':{const minute=seenHour||/^\s*:s/i.test(fmt.slice(offset+t.length));const v=minute?d.getUTCMinutes():M+1;return t.length===2?pad(v):v;}
   case 'dddd':case 'ddd':return new Intl.DateTimeFormat('en',{weekday:t.length===4?'long':'short',timeZone:'UTC'}).format(d);
   case 'dd':return pad(D);case 'd':return D;
   case 'hh':case 'h':seenHour=true;return t.length===2?pad(amp?(hour%12||12):hour):(amp?(hour%12||12):hour);
   case 'ss':return pad(d.getUTCSeconds());case 's':return d.getUTCSeconds();case 'am/pm':return hour>=12?'PM':'AM';default:return t;
  }
 });
}
export function formatCell(value,format='General',date1904=false){
 if(value===''||!Number.isFinite(Number(value)))return String(value);
 const n=Number(value);if(format==='General'||format==='@')return String(value);
 // Unsupported complex formats retain the saved numeric value rather than inventing a value.
 const sections=format.split(';'),section=sections[n<0&&sections.length>1?1:n===0&&sections.length>2?2:0];
 const clean=section.replace(/\[(?:Black|Blue|Cyan|Green|Magenta|Red|White|Yellow)\]/gi,'').replace(/_.|\*./g,'');
 if(/[ymdhis]/i.test(clean.replace(/"[^"]*"|\\./g,''))&&!/[#0]/.test(clean)){
  if(/[\[\]"]/.test(clean))return String(value);
  return dateText(n,clean.replace(/\\/g,''),date1904)??String(value);
 }
 const pattern=/[#0][#0,]*(?:\.[#0]+)?/.exec(clean);if(!pattern||/[Ee][+-]|\?|\[|\]|\//.test(clean))return String(value);
 const parts=pattern[0].split('.'),decimal=parts[1]||'',percent=clean.includes('%');
 const magnitude=n<0&&sections.length>1?Math.abs(n):n;
 let display=new Intl.NumberFormat('en-US',{useGrouping:parts[0].includes(','),minimumFractionDigits:(decimal.match(/0/g)||[]).length,maximumFractionDigits:Math.min(12,decimal.length),minimumIntegerDigits:clamp((parts[0].match(/0/g)||[]).length,1,21)}).format(magnitude*(percent?100:1));
 const literal=s=>s.replace(/"([^"]*)"/g,'$1').replace(/\\(.)/g,'$1');
 return literal(clean.slice(0,pattern.index))+display+literal(clean.slice(pattern.index+pattern[0].length));
}
function color(n,theme,fallback='#000000'){
 let rgb=attr(n,'rgb');if(!/^(?:[0-9a-f]{8}|[0-9a-f]{6})$/i.test(rgb)){
  const i=attr(n,'indexed');rgb=i!==''?(['000000','FFFFFF','FF0000','00FF00','0000FF','FFFF00','FF00FF','00FFFF'][Number(i)%8]||''):theme[Number(attr(n,'theme','-1'))]||'';
 }
 if(!/^(?:[0-9a-f]{8}|[0-9a-f]{6})$/i.test(rgb))return fallback;
 rgb=rgb.slice(-6);const tint=clamp(number(attr(n,'tint')), -1,1);
 return '#'+[0,2,4].map(i=>{const v=parseInt(rgb.slice(i,i+2),16);return Math.round(tint<0?v*(1+tint):v+(255-v)*tint).toString(16).padStart(2,'0');}).join('');
}
function styleSet(doc,theme){
 const fonts=nodes(first(doc,'fonts'),'font'),fills=nodes(first(doc,'fills'),'fill'),borders=nodes(first(doc,'borders'),'border');
 const formats={...builtin};for(const n of nodes(doc,'numFmt'))formats[attr(n,'numFmtId')]=attr(n,'formatCode');
 return nodes(first(doc,'cellXfs'),'xf').map(x=>{
  const f=fonts[number(attr(x,'fontId'))],fill=first(fills[number(attr(x,'fillId'))],'patternFill'),border=borders[number(attr(x,'borderId'))],a=first(x,'alignment');
  const css={fontFamily:attr(first(f,'name'),'val','Calibri')+', Arial, sans-serif',fontSize:clamp(number(attr(first(f,'sz'),'val'),11),6,72)*4/3+'px',fontWeight:flag(f,'b')?'700':'400',fontStyle:flag(f,'i')?'italic':'normal',color:color(first(f,'color'),theme),textDecoration:flag(f,'u')?'underline':flag(f,'strike')?'line-through':'none'};
  if(attr(fill,'patternType')==='solid')css.backgroundColor=color(first(fill,'fgColor'),theme,'#ffffff');
  for(const edge of ['left','right','top','bottom']){
   const b=first(border,edge),s=attr(b,'style');if(s)css['border'+edge[0].toUpperCase()+edge.slice(1)]=(s==='double'?'3px double':s.includes('medium')||s==='thick'?'2px solid':s==='dashed'||s==='dotted'?'1px '+s:'1px solid')+' '+color(first(b,'color'),theme);
  }
  const horizontal=attr(a,'horizontal'),vertical=attr(a,'vertical');
  if(['left','center','right','justify'].includes(horizontal))css.textAlign=horizontal;
  return {css,format:formats[attr(x,'numFmtId')]||'General',wrap:attr(a,'wrapText')==='1',vertical:vertical==='top'?'flex-start':vertical==='center'?'center':'flex-end'};
 });
}
export function sheetGeometry(doc){
 const defaults=first(doc,'sheetFormatPr'),cells=new Map(),rowData=new Map();let rowCount=1,colCount=1,truncated=false;
 for(const row of nodes(doc,'row')){
  const r=number(attr(row,'r'),1)-1;if(r<0||r>=500){truncated=true;continue;}rowData.set(r,row);
  for(const cell of nodes(row,'c')){const p=cellPosition(attr(cell,'r'));if(!p)continue;if(p.c>=50||p.r>=500){if(first(cell,'v')||first(cell,'is'))truncated=true;continue;}
   cells.set(p.r+','+p.c,cell);if(first(cell,'v')||first(cell,'is')||first(cell,'f')){rowCount=Math.max(rowCount,p.r+1);colCount=Math.max(colCount,p.c+1);}
  }
 }
 const mergeNodes=nodes(doc,'mergeCell');if(mergeNodes.length>2000)throw Error('Too many merged ranges for a preview. Download the original workbook.');
 const merges=[];for(const m of mergeNodes){
  const [start,end]=attr(m,'ref').split(':'),a=cellPosition(start),b=cellPosition(end||start);if(!a||!b||a.r>b.r||a.c>b.c||a.r>=500||a.c>=50)continue;
  if(b.r>=500||b.c>=50)truncated=true;b.r=Math.min(499,b.r);b.c=Math.min(49,b.c);merges.push({a,b});rowCount=Math.max(rowCount,b.r+1);colCount=Math.max(colCount,b.c+1);
 }
 const columns=Array.from({length:50},()=>({width:Math.round(number(attr(defaults,'defaultColWidth'),8.43)*7+5),style:0}));
 for(const col of nodes(doc,'col'))for(let c=Math.max(0,number(attr(col,'min'),1)-1);c<Math.min(50,number(attr(col,'max'),1));c++)columns[c]={width:attr(col,'hidden')==='1'?0:clamp(Math.round(number(attr(col,'width'),8.43)*7+5),5,1800),style:number(attr(col,'style'))};
 const rows=Array.from({length:rowCount},(_,r)=>{const row=rowData.get(r);return {height:attr(row,'hidden')==='1'?0:clamp(number(attr(row,'ht'),number(attr(defaults,'defaultRowHeight'),15))*4/3,1,600),style:attr(row,'customFormat')==='1'?number(attr(row,'s')):null};});
 const x=[0],y=[0];for(const c of columns.slice(0,colCount))x.push(x.at(-1)+c.width);for(const r of rows)y.push(y.at(-1)+r.height);
 const owners=new Map();for(const m of merges){let overlaps=false;for(let r=m.a.r;r<=m.b.r;r++)for(let c=m.a.c;c<=m.b.c;c++)if(owners.has(r+','+c))overlaps=true;if(overlaps)continue;for(let r=m.a.r;r<=m.b.r;r++)for(let c=m.a.c;c<=m.b.c;c++)owners.set(r+','+c,m);}
 return {cells,rows,columns,x,y,rowCount,colCount,owners,truncated};
}
function relationshipPath(path){const parts=path.split('/'),name=parts.pop();return parts.join('/')+'/_rels/'+name+'.rels';}
async function pictures(zip,read,readBytes,sheet,path,g){
 const result=[];if(!first(sheet,'drawing')||!zip.file(relationshipPath(path)))return result;
 const rels=await read(relationshipPath(path)),drawingRel=nodes(rels,'Relationship').find(n=>attr(n,'Id')===attr(first(sheet,'drawing'),'r:id'));
 const drawingPath=attr(drawingRel,'TargetMode')!=='External'&&localPart(path,attr(drawingRel,'Target'));if(!drawingPath||!zip.file(drawingPath)||!zip.file(relationshipPath(drawingPath)))return result;
 const drawing=await read(drawingPath),imageRels=await read(relationshipPath(drawingPath));let decodedPixels=0;
 for(const anchor of [...drawing.documentElement.children].slice(0,100)){
  const pic=first(anchor,'pic'),from=first(anchor,'from');if(!pic||!from)continue;
  const c=number(first(from,'col')?.textContent,-1),r=number(first(from,'row')?.textContent,-1);if(c<0||r<0||c>=g.colCount||r>=g.rowCount)continue;
  const rel=nodes(imageRels,'Relationship').find(n=>attr(n,'Id')===attr(first(pic,'blip'),'r:embed'));if(!rel||attr(rel,'TargetMode')==='External')continue;
  const imagePath=localPart(drawingPath,attr(rel,'Target')),mime=({png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp'})[imagePath?.split('.').at(-1)?.toLowerCase()];if(!mime||!zip.file(imagePath)||!readBytes)continue;
  const ext=first(first(pic,'xfrm'),'ext')||first(anchor,'ext'),w=number(attr(ext,'cx'))/9525,h=number(attr(ext,'cy'))/9525;
  if(w<=0||h<=0||w>10000||h>10000)continue;
  const bytes=await readBytes(imagePath),dimensions=verifyPreviewImage(bytes);decodedPixels+=dimensions.width*dimensions.height;if(decodedPixels>32e6)throw Error('Worksheet images exceed the browser preview limit. Download the original to view them.');let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
  result.push({src:'data:'+mime+';base64,'+btoa(binary),left:g.x[c]+number(first(from,'colOff')?.textContent)/9525,top:g.y[r]+number(first(from,'rowOff')?.textContent)/9525,width:w,height:h,alt:attr(first(pic,'cNvPr'),'descr','Worksheet picture')});
 }
 return result;
}
export async function renderXlsxSheet({zip,read,readBytes,doc,path,strings,styleDoc,themeDoc,date1904}){
 const themeNames=['lt1','dk1','lt2','dk2','accent1','accent2','accent3','accent4','accent5','accent6','hlink','folHlink'];
 const theme=themeNames.map(n=>{const node=first(themeDoc,n)?.firstElementChild;return attr(node,'lastClr',attr(node,'val'));});
 const styles=styleSet(styleDoc,theme),g=sheetGeometry(doc),surface=document.createElement('div');
 surface.className='fh-xlsx-sheet';surface.setAttribute('role','table');surface.setAttribute('aria-label','Worksheet content');surface.style.cssText=`position:relative;width:${g.x.at(-1)}px;height:${g.y.at(-1)}px;background:white;color:black;overflow:hidden;isolation:isolate`;
 for(let r=0;r<g.rowCount;r++){
  if(!g.rows[r].height)continue;const rowEl=document.createElement('div');rowEl.setAttribute('role','row');surface.append(rowEl);
  for(let c=0;c<g.colCount;c++){
   if(!g.columns[c].width)continue;const merge=g.owners.get(r+','+c);if(merge&&(merge.a.r!==r||merge.a.c!==c))continue;
   const cell=g.cells.get(r+','+c),style=styles[number(attr(cell,'s'),g.rows[r].style??g.columns[c].style)]||{css:{},format:'General',vertical:'flex-end'};
   const t=attr(cell,'t'),v=first(cell,'v')?.textContent||'',text=t==='s'?strings[Number(v)]||'':t==='inlineStr'?nodes(cell,'t').map(n=>n.textContent).join(''):t==='b'?(v==='1'?'TRUE':'FALSE'):t==='str'||t==='e'?v:v?formatCell(v,style.format,date1904):first(cell,'f')?'[Formula value unavailable]':'';
   const end=merge?.b||{r,c},width=g.x[end.c+1]-g.x[c],height=g.y[end.r+1]-g.y[r];
   const el=document.createElement('div');el.setAttribute('role','cell');el.dataset.cell=attr(cell,'r',String(r+1)+':'+String(c+1));
   if(merge){el.setAttribute('aria-colspan',String(end.c-c+1));el.setAttribute('aria-rowspan',String(end.r-r+1));}
   el.style.cssText=`position:absolute;box-sizing:border-box;left:${g.x[c]}px;top:${g.y[r]}px;width:${width}px;height:${height}px;padding:1px 3px;display:flex;flex-direction:column;overflow:hidden;line-height:1.15;`;
   Object.assign(el.style,style.css);el.style.justifyContent=style.vertical;if(!style.css.textAlign)el.style.textAlign=v&&(!t||t==='n')?'right':'left';
   // Merged edge borders can be stored on the last covered cell.
   if(merge)for(const [edge,key] of [['Right',r+','+end.c],['Bottom',end.r+','+c]]){const s=styles[number(attr(g.cells.get(key),'s'))];if(s?.css['border'+edge])el.style['border'+edge]=s.css['border'+edge];}
   const inner=document.createElement('span');inner.textContent=text;inner.style.cssText=`white-space:${style.wrap?'pre-wrap':'pre'};overflow-wrap:${style.wrap?'break-word':'normal'};flex-shrink:0`;
   // Excel lets unwrapped text continue into adjacent empty cells.
   if(text&&!style.wrap&&!merge&&['s','str','inlineStr'].includes(t)&&(!style.css.textAlign||style.css.textAlign==='left')){
    let stop=c+1;while(stop<g.colCount){const next=g.cells.get(r+','+stop);if(g.owners.has(r+','+stop)||first(next,'v')||first(next,'is')||first(next,'f'))break;stop++;}
    el.style.overflow='visible';inner.style.width=Math.max(0,g.x[stop]-g.x[c]-6)+'px';inner.style.overflow='hidden';inner.style.position='relative';inner.style.zIndex='1';
   }
   el.append(inner);if(text)el.title=text;rowEl.append(el);
  }
 }
 const images=await pictures(zip,read,readBytes,doc,path,g);for(const p of images){const image=document.createElement('img');image.src=p.src;image.alt=p.alt;image.style.cssText=`position:absolute;left:${p.left}px;top:${p.top}px;width:${p.width}px;height:${p.height}px;max-width:none;object-fit:fill;pointer-events:none`;surface.append(image);}
 return {surface,width:g.x.at(-1),height:g.y.at(-1),truncated:g.truncated};
}
