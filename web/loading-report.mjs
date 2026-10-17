import {companyLines} from '../shared/company-profile.mjs';
// Native PDF text, paths and shaded package faces stay sharp at any zoom.
// Only glyphs outside the standard PDF font use small, high-resolution images.
const W=595.28,H=841.89,M=36,CW=W-2*M;
const C={ink:'#203e32',muted:'#617168',line:'#dce5dc',pale:'#f2f6f0',gold:'#bc9853',amber:'#875313',amberBg:'#fff6e6'};
const PALETTE=['#54875c','#c7a15b','#648aa0','#a6786d','#8086b0','#75a69a','#ae9270','#969b53'];
const rgb=hex=>hex.replace('#','').match(/../g).map(x=>parseInt(x,16)/255);
const color=hex=>rgb(hex).map(x=>x.toFixed(3)).join(' ');
const n=x=>Number(x).toFixed(2);
const clean=s=>String(s??'').replace(/[\r\n\t]/g,' ').replace(/[\u2013\u2014]/g,'-');
const escape=s=>s.replaceAll('\\','\\\\').replaceAll('(','\\(').replaceAll(')','\\)');
const num=(v,d=0)=>v==null?'Pending':Number(v).toLocaleString('en-IN',{maximumFractionDigits:d});
const textWidth=(s,size)=>[...s].reduce((w,c)=>w+(c.charCodeAt(0)>255?1:/[ilI.,' :;!|]/.test(c)?.28:/[MW@%]/.test(c)?.9:/[A-Z0-9]/.test(c)?.65:.55),0)*size;
function wrap(value,width,size){
 const lines=[];let line='';
 for(const word of clean(value).split(/\s+/)){
  if(textWidth((line?line+' ':'')+word,size)<=width){line+=(line?' ':'')+word;continue;}
  if(line){lines.push(line);line='';}
  for(const ch of word){if(textWidth(line+ch,size)>width){lines.push(line);line='';}line+=ch;}
 }
 if(line)lines.push(line);return lines;
}
class Report {
 constructor(){this.pages=[];this.images=[];}
 page(){this.current=[];this.pages.push(this.current);return this;}
 emit(s){this.current.push(s);}
 rect(x,y,w,h,fill,stroke=null){this.emit('q '+color(fill)+' rg '+(stroke?color(stroke)+' RG .5 w ':'')+[x,H-y-h,w,h].map(n).join(' ')+' re '+(stroke?'B':'f')+' Q');}
 line(x,y,x2,y2,stroke=C.line,width=.5){this.emit('q '+color(stroke)+' RG '+n(width)+' w '+n(x)+' '+n(H-y)+' m '+n(x2)+' '+n(H-y2)+' l S Q');}
 polygon(points,fill,stroke='#ffffff',width=.25){this.emit('q '+color(fill)+' rg '+color(stroke)+' RG '+n(width)+' w '+points.map((p,i)=>n(p[0])+' '+n(H-p[1])+(i?' l':' m')).join(' ')+' h B Q');}
 text(value,x,y,size=10,bold=false,fill=C.ink,bg='#ffffff'){
  const s=clean(value);if(!s)return;
  if(/^[\x20-\x7e]*$/.test(s)){this.emit('BT /'+(bold?'F2':'F1')+' '+n(size)+' Tf '+color(fill)+' rg 1 0 0 1 '+n(x)+' '+n(H-y)+' Tm ('+escape(s)+') Tj ET');return;}
  // Keep original multilingual descriptions; do not replace unsupported characters.
  const canvas=document.createElement('canvas'),g=canvas.getContext('2d'),scale=4;
  g.font=(bold?'bold ':'')+(size*scale)+'px Arial, sans-serif';
  canvas.width=Math.ceil(g.measureText(s).width)+8;canvas.height=Math.ceil(size*scale*1.6);
  g.fillStyle=bg;g.fillRect(0,0,canvas.width,canvas.height);g.font=(bold?'bold ':'')+(size*scale)+'px Arial, sans-serif';g.fillStyle=fill;g.fillText(s,2,size*scale*1.15);
  const bytes=Uint8Array.from(atob(canvas.toDataURL('image/jpeg',.99).split(',')[1]),c=>c.charCodeAt(0));
  const id=this.images.push({bytes,width:canvas.width,height:canvas.height})-1;
  this.emit('q '+n(canvas.width/scale)+' 0 0 '+n(canvas.height/scale)+' '+n(x)+' '+n(H-y-(canvas.height/scale-size*1.15))+' cm /Im'+id+' Do Q');
 }
 paragraph(value,x,y,width,size=10,bold=false,fill=C.ink,bg='#ffffff',leading=size*1.4){const lines=wrap(value,width,size);for(const line of lines){this.text(line,x,y,size,bold,fill,bg);y+=leading;}return y;}
 bytes(){
  const enc=new TextEncoder(),chunks=[],offsets=[0];let length=0;
  const put=v=>{const b=typeof v==='string'?enc.encode(v):v;chunks.push(b);length+=b.length;};
  const obj=(id,body)=>{offsets[id]=length;put(id+' 0 obj\n');put(body);put('\nendobj\n');};
  const imageStart=5+this.pages.length*2;
  put('%PDF-1.4\n');obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
  obj(2,'<< /Type /Pages /Count '+this.pages.length+' /Kids ['+this.pages.map((_,i)=>(5+i*2)+' 0 R').join(' ')+'] >>');
  obj(3,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');obj(4,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const images=this.images.map((_,i)=>'/Im'+i+' '+(imageStart+i)+' 0 R').join(' ');
  this.pages.forEach((commands,i)=>{const id=5+i*2,stream=commands.join('\n');obj(id,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+W+' '+H+'] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << '+images+' >> >> /Contents '+(id+1)+' 0 R >>');obj(id+1,'<< /Length '+enc.encode(stream).length+' >>\nstream\n'+stream+'\nendstream');});
  this.images.forEach((im,i)=>{const id=imageStart+i;offsets[id]=length;put(id+' 0 obj\n<< /Type /XObject /Subtype /Image /Width '+im.width+' /Height '+im.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+im.bytes.length+' >>\nstream\n');put(im.bytes);put('\nendstream\nendobj\n');});
  const at=length;put('xref\n0 '+offsets.length+'\n0000000000 65535 f \n');offsets.slice(1).forEach(v=>put(String(v).padStart(10,'0')+' 00000 n \n'));put('trailer\n<< /Size '+offsets.length+' /Root 1 0 R >>\nstartxref\n'+at+'\n%%EOF');
  const bytes=new Uint8Array(length);let cursor=0;for(const b of chunks){bytes.set(b,cursor);cursor+=b.length;}return bytes;
 }
}
function drawLayout(pdf,report,x,y,width,height){
 const c=report.container,yaw=-.68,pitch=.55;
 const rotate=([x,y,z])=>{const a=x*Math.cos(yaw)-z*Math.sin(yaw),b=x*Math.sin(yaw)+z*Math.cos(yaw);return [a,b*Math.sin(pitch)-y*Math.cos(pitch),b*Math.cos(pitch)+y*Math.sin(pitch)];};
 const raw=p=>rotate([p[0]-c.length/2,p[1]-c.height/2,p[2]-c.width/2]);
 const corners=[[0,0,0],[c.length,0,0],[c.length,0,c.width],[0,0,c.width],[0,c.height,0],[c.length,c.height,0],[c.length,c.height,c.width],[0,c.height,c.width]];
 const rot=corners.map(raw),xs=rot.map(p=>p[0]),ys=rot.map(p=>p[1]);
 const scale=Math.min((width-44)/(Math.max(...xs)-Math.min(...xs)),(height-48)/(Math.max(...ys)-Math.min(...ys)));
 const project=p=>{const r=raw(p);return [x+width/2+r[0]*scale,y+height/2+r[1]*scale,r[2]];};
 pdf.rect(x,y,width,height,C.pale);
 pdf.polygon(corners.slice(0,4).map(project),'#e2e9df','#aabca8');
 const faces=[];
 for(const b of report.boxes){const {x,y,z,length:l,height:h,width:w}=b,pts=[[x,y,z],[x+l,y,z],[x+l,y,z+w],[x,y,z+w],[x,y+h,z],[x+l,y+h,z],[x+l,y+h,z+w],[x,y+h,z+w]].map(project);
  for(const [indices,shade] of [[[0,1,5,4],.76],[[1,2,6,5],.88],[[2,3,7,6],.8],[[3,0,4,7],.7],[[4,5,6,7],1]]){const points=indices.map(i=>pts[i]);faces.push({points,depth:points.reduce((n,p)=>n+p[2],0)/4,shade,index:b.index});}}
 faces.sort((a,b)=>a.depth-b.depth);
 for(const f of faces){const hex='#'+rgb(PALETTE[f.index%PALETTE.length]||PALETTE[0]).map(v=>Math.round(v*255*f.shade).toString(16).padStart(2,'0')).join('');pdf.polygon(f.points,hex,'#ffffff',.18);}
 const pc=corners.map(project);pdf.emit('[2 2] 0 d');for(const [a,b] of [[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]])pdf.line(pc[a][0],pc[a][1],pc[b][0],pc[b][1],'#8fa38a',.5);pdf.emit('[] 0 d');
 pdf.text('FRONT',x+12,y+height-12,7,true,C.muted,C.pale);pdf.text('DOORS',x+width-45,y+height-12,7,true,C.muted,C.pale);
}
export async function loadingPdf(report){
 if(!report?.container||!Array.isArray(report.rows)||!Array.isArray(report.boxes))throw Error('Calculate the layout before downloading.');
 const pdf=new Report();let y;
 function page(first=false){pdf.page();pdf.rect(0,0,W,7,C.ink);companyLines().forEach((line,i)=>pdf.text(line,M,26+i*10,i===0?9:7,i===0,i===0?C.ink:C.muted));pdf.text(first?'3D loading plan':'Packing details',M,110,25,true);y=134;y=pdf.paragraph('Plan '+report.plan,M,y,CW,11,true);if(first){pdf.text('Generated '+new Date(report.createdAt).toLocaleString('en-IN'),M,y+2,8,false,C.muted);y+=22;}else y+=8;}
 function section(number,title){pdf.text(number,M,y,8,true,C.gold);pdf.text(title,M+23,y,12,true);y+=16;}
 page(true);
 const cards=[['UNITS PLACED',num(report.loadedUnits),num(report.boxes.length)+' packages'],['UNITS REMAINING',num(report.remainingUnits),report.remainingUnits?'Review unplaced items':'All planned units placed'],['VOLUME USED',num(report.volumePercent,1)+'%',num(report.volumeM3,2)+' m3 occupied'],['CARGO WEIGHT',report.unknownWeight?'Incomplete':num(report.knownWeight,1)+' kg',report.unknownWeight?num(report.unknownWeight)+' weights pending':num(report.payloadPercent,1)+'% of payload']];
 const cardW=(CW-24)/4;
 cards.forEach(([label,value,sub],i)=>{const x=M+i*(cardW+8),bg=i===1&&report.remainingUnits?C.amberBg:C.pale;pdf.rect(x,y,cardW,59,bg);pdf.text(label,x+10,y+15,7,true,C.muted,bg);pdf.text(value,x+10,y+35,value.length>11?14:18,true,i===1&&report.remainingUnits?C.amber:C.ink,bg);pdf.text(sub,x+10,y+49,6.7,false,C.muted,bg);});y+=77;
 const c=report.container;
 section('01','Container & loading layout');
 y=pdf.paragraph((c.name||c.id)+'  |  Inside '+num(c.length)+' x '+num(c.width)+' x '+num(c.height)+' mm',M,y,CW,9);y=pdf.paragraph('Door '+num(c.doorWidth)+' x '+num(c.doorHeight)+' mm  |  Payload '+num(c.payload)+' kg  |  Clearance '+num(c.clearance)+' mm',M,y,CW,8,false,C.muted);y+=7;
 drawLayout(pdf,report,M,y,CW,183);y+=196;pdf.text('Complete calculated layout. All placed packages are shown; colours identify items.',M,y,8,false,C.muted);y+=23;
 const warnings=[];if(report.remainingUnits)warnings.push(num(report.remainingUnits)+' units remain unplaced. Review the item results before arranging loading.');
 if(report.unknownWeight)warnings.push('Payload is not verified: gross weight is missing for '+num(report.unknownWeight)+' placed packages.');
 if(report.rows.some(r=>r.placed&&r.maxLayers>1&&r.topLoad==null))warnings.push('Stack strength pending. Confirm the maximum layers and permitted top load with the supplier.');
 if(warnings.length){const lines=warnings.flatMap(v=>wrap(v,CW-24,8.5)),height=26+lines.length*12;pdf.rect(M,y,CW,height,C.amberBg);pdf.rect(M,y,3,height,C.gold);pdf.text('REVIEW BEFORE LOADING',M+12,y+14,8,true,C.amber,C.amberBg);lines.forEach((s,i)=>pdf.text(s,M+12,y+28+i*12,8.5,false,C.amber,C.amberBg));y+=height+18;}
 else {pdf.text('All selected units fit under the entered geometric rules.',M,y,9,true);y+=19;}
 if(y>650)page();section('02','Item results & package specifications');
 for(const r of report.rows){
  const lines=[['title',r.code],['body',r.name||''],['meta','PO '+r.po+(r.shipmentNumber?'  /  '+r.shipmentNumber:'')],['bold','Placed '+num(r.loadedUnits)+' / '+num(r.quantity)+' units   |   Remaining '+num(r.remainingUnits)+'   |   Packages '+num(r.placed)+' / '+num(r.packages)],['body','Outer L x W x H: '+num(r.length)+' x '+num(r.width)+' x '+num(r.height)+' mm   |   Units/package '+num(r.unitsPerPackage)],['body','Gross weight '+num(r.weight,3)+' kg   |   Rotation '+({FIXED:'Fixed',UPRIGHT:'Keep upright',FREE:'All orientations'}[r.rotation]||r.rotation)+'   |   Max layers '+num(r.maxLayers)+'   |   Top load '+num(r.topLoad,3)+' kg'],['meta','Dimension source: '+(r.dimensionSource||'Not entered')],['result',r.reason||'Fits under the entered rules.']];
  const expanded=lines.flatMap(([type,text])=>wrap(text,CW-25,type==='title'?11:8.5).map(t=>[type,t]));
  const height=expanded.reduce((v,[type])=>v+(type==='title'?17:12),0)+18;
  if(y+Math.min(height,600)>758){page();section('02','Item results & package specifications');}
  pdf.rect(M,y-2,4,14,PALETTE[r.index%PALETTE.length]||PALETTE[0]);
  for(const [type,text] of expanded){if(y+17>758){page();pdf.text('Item '+r.code+' - continued',M,y,10,true);y+=19;}
   pdf.text(text,M+13,y+9,type==='title'?11:8.5,['title','bold'].includes(type),type==='meta'?C.muted:type==='result'&&r.remainingUnits?C.amber:C.ink);y+=type==='title'?17:12;}
  y+=10;pdf.line(M,y,M+CW,y);y+=13;
 }
 pdf.pages.forEach((commands,i)=>{pdf.current=commands;pdf.line(M,778,W-M,778);pdf.text('Planning suggestion only. Confirm equipment, weights, stack strength and safe loading.',M,792,7,false,C.muted);pdf.text('Does not confirm a shipment or verify access, floor / axle loads, lashings or dangerous goods.',M,803,6.8,false,C.muted);pdf.text('FARMING HUB / LOADING PLAN',M,824,6.8,true,C.muted);pdf.text((i+1)+' / '+pdf.pages.length,W-M-25,824,8,true,C.muted);});
 return pdf.bytes();
}
