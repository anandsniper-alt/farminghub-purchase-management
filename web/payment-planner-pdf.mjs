// Dependency-free PDF writer adapted from the existing loading report.
// Monetary values remain integer minor units; unsupported glyphs use canvas images.
const dateLabel=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')?new Date(value+'T12:00:00Z').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}):String(value??'');
const periodLabel=value=>String(value??'').replace(/\b\d{4}-\d{2}\b/g,m=>new Date(m+'-01T12:00:00Z').toLocaleDateString('en-GB',{month:'long',year:'numeric',timeZone:'UTC'}));
const bucketLabel=b=>b.startDate&&b.endDate?'Week '+b.week+' | '+dateLabel(b.startDate)+' - '+dateLabel(b.endDate):b.label;
const M=32;
const C={ink:'#203a25',muted:'#52664f',line:'#e3e8dc',pale:'#f2f5dd',gold:'#C5DA41',amber:'#9a6a19',amberBg:'#fff3df'};
const rgb=hex=>hex.replace('#','').match(/../g).map(x=>parseInt(x,16)/255);
const color=hex=>rgb(hex).map(x=>x.toFixed(3)).join(' ');
const n=x=>Number(x).toFixed(2);
const clean=s=>String(s??'').replace(/[\r\n\t]/g,' ').replace(/[\u2013\u2014]/g,'-');
const escape=s=>s.replaceAll('\\','\\\\').replaceAll('(','\\(').replaceAll(')','\\)');
const textWidth=(s,size)=>[...s].reduce((w,c)=>w+(c.charCodeAt(0)>255?1:/[ilI.,' :;!|]/.test(c)?.28:/[MW@%]/.test(c)?1:/[A-Z]/.test(c)?.75:/[0-9]/.test(c)?.6:.58),0)*size;
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
 constructor(width,height){this.width=width;this.height=height;this.pages=[];this.images=[];}
 page(){this.current=[];this.pages.push(this.current);return this;}
 emit(s){this.current.push(s);}
 rect(x,y,w,h,fill,stroke=null){this.emit('q '+color(fill)+' rg '+(stroke?color(stroke)+' RG .5 w ':'')+[x,this.height-y-h,w,h].map(n).join(' ')+' re '+(stroke?'B':'f')+' Q');}
 line(x,y,x2,y2,stroke=C.line,width=.5){this.emit('q '+color(stroke)+' RG '+n(width)+' w '+n(x)+' '+n(this.height-y)+' m '+n(x2)+' '+n(this.height-y2)+' l S Q');}
 polygon(points,fill,stroke='#ffffff',width=.25){this.emit('q '+color(fill)+' rg '+color(stroke)+' RG '+n(width)+' w '+points.map((p,i)=>n(p[0])+' '+n(this.height-p[1])+(i?' l':' m')).join(' ')+' h B Q');}
 text(value,x,y,size=10,bold=false,fill=C.ink,bg='#ffffff'){
  const s=clean(value);if(!s)return;
  if(/^[\x20-\x7e]*$/.test(s)){this.emit('BT /'+(bold?'F2':'F1')+' '+n(size)+' Tf '+color(fill)+' rg 1 0 0 1 '+n(x)+' '+n(this.height-y)+' Tm ('+escape(s)+') Tj ET');return;}
  // Keep original multilingual descriptions; do not replace unsupported characters.
  const canvas=document.createElement('canvas'),g=canvas.getContext('2d'),scale=4;
  g.font=(bold?'bold ':'')+(size*scale)+'px Arial, sans-serif';
  canvas.width=Math.ceil(g.measureText(s).width)+8;canvas.height=Math.ceil(size*scale*1.6);
  g.fillStyle=bg;g.fillRect(0,0,canvas.width,canvas.height);g.font=(bold?'bold ':'')+(size*scale)+'px Arial, sans-serif';g.fillStyle=fill;g.fillText(s,2,size*scale*1.15);
  const bytes=Uint8Array.from(atob(canvas.toDataURL('image/jpeg',.99).split(',')[1]),c=>c.charCodeAt(0));
  const id=this.images.push({bytes,width:canvas.width,height:canvas.height})-1;
  this.emit('q '+n(canvas.width/scale)+' 0 0 '+n(canvas.height/scale)+' '+n(x)+' '+n(this.height-y-(canvas.height/scale-size*1.15))+' cm /Im'+id+' Do Q');
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
  this.pages.forEach((commands,i)=>{const id=5+i*2,stream=commands.join('\n');obj(id,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+this.width+' '+this.height+'] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << '+images+' >> >> /Contents '+(id+1)+' 0 R >>');obj(id+1,'<< /Length '+enc.encode(stream).length+' >>\nstream\n'+stream+'\nendstream');});
  this.images.forEach((im,i)=>{const id=imageStart+i;offsets[id]=length;put(id+' 0 obj\n<< /Type /XObject /Subtype /Image /Width '+im.width+' /Height '+im.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+im.bytes.length+' >>\nstream\n');put(im.bytes);put('\nendstream\nendobj\n');});
  const at=length;put('xref\n0 '+offsets.length+'\n0000000000 65535 f \n');offsets.slice(1).forEach(v=>put(String(v).padStart(10,'0')+' 00000 n \n'));put('trailer\n<< /Size '+offsets.length+' /Root 1 0 R >>\nstartxref\n'+at+'\n%%EOF');
  const bytes=new Uint8Array(length);let cursor=0;for(const b of chunks){bytes.set(b,cursor);cursor+=b.length;}return bytes;
 }
}
function amount(value){
 if(value==null)return 'Pending';
 const minor=BigInt(value),negative=minor<0n,abs=negative?-minor:minor;
 return (negative?'-':'')+(abs/100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g,',')+'.'+(abs%100n).toString().padStart(2,'0');
}
function sum(values){return values.some(v=>v==null)?null:values.reduce((a,v)=>a+BigInt(v),0n).toString();}
function rate(value){
 if(value==null)return 'Pending';
 const scaled=BigInt(value);return (scaled/1000000n).toString()+((scaled%1000000n)?'.'+(scaled%1000000n).toString().padStart(6,'0').replace(/0+$/,''):'');
}

/** Read-only supplier-column report. The caller supplies a reconciled complete export model. */
export function paymentPlanPdf(model){
 if(!model||!Array.isArray(model.suppliers)||!Array.isArray(model.buckets)||!model.totals)throw Error('A complete payment plan is required for PDF download.');
 const dual=model.currency==='USD',firstWidth=126;
 // Keep every supplier on the same horizontal page; widen instead of splitting columns.
 const requiredWidth=2*M+firstWidth+(model.suppliers.length+1)*(dual?190:155);
 const W=requiredWidth<=841.89?841.89:Math.max(1190.55,requiredWidth),H=W>841.89?841.89:595.28,CW=W-2*M;
 const pdf=new Report(W,H);
 for(const bucket of model.buckets){
  if(!Array.isArray(bucket.cells)||!bucket.totals)throw Error('Payment plan PDF has an incomplete period.');
  for(const supplier of model.suppliers)if(bucket.cells.filter(c=>c.supplierId===supplier.id).length!==1)throw Error('Payment plan PDF has missing or duplicate supplier cells.');
 }
 const bottom=H-43;let y=0;
 const rowHeight=(label,rateValue)=>Math.max(30,wrap(label,firstWidth-14,8.5).length*12+(dual&&rateValue!==undefined?12:0)+9);
 function page(subtitle){
  pdf.page();pdf.rect(0,0,W,6,'#204321');pdf.text('FARMING HUB / LAE PAYMENT PLANNER',M,27,8,true);
  y=pdf.paragraph(model.title||'Supplier payment plan',M,51,CW,20,true);y+=4;
  y=pdf.paragraph(periodLabel(model.period)+'  |  '+String(model.currency||'')+'  |  '+subtitle,M,y,CW,9,true);
  y=pdf.paragraph('Source: '+(model.source||'PMS workspace'),M,y+3,CW,7.5,false,C.muted);
  y=pdf.paragraph('As of: '+dateLabel(model.asOf||'Not specified')+'  |  Revision: '+(model.revision??'Not specified'),M,y,CW,7.5,false,C.muted);y+=8;
 }
 function tableHeader(suppliers){
  const width=(CW-firstWidth)/(suppliers.length+1),size=8,headings=[...suppliers.map(s=>(s.name||s.id)+(s.code?' / '+s.code:'')),'All selected suppliers'];
  const lines=headings.map(s=>wrap(s,width-12,size)),height=Math.max(37,Math.max(...lines.map(l=>l.length))*11+24);
  pdf.rect(M,y,CW,height,C.pale);pdf.text('Period',M+7,y+16,9,true,C.ink,C.pale);
  headings.forEach((_,i)=>{
   const x=M+firstWidth+i*width;lines[i].forEach((line,j)=>pdf.text(line,x+6,y+13+j*11,size,true,C.ink,C.pale));
   pdf.text(model.currency,x+6,y+height-8,8,true,C.ink,C.pale);
   if(dual)pdf.text('Estimated INR',x+width/2+6,y+height-8,8,true,C.ink,C.pale);
   pdf.line(x,y,x,y+height);
  });
  y+=height;return width;
 }
 function number(value,x,width,baseline,bold,bg){
  const valueText=amount(value),size=Math.min(9,(width-12)/Math.max(textWidth(valueText,1),1));
  pdf.text(valueText,x+width-6-textWidth(valueText,size),baseline,size,bold,value==null?C.amber:C.ink,bg);
 }
 function row(label,suppliers,width,values,totals,rateValue,bold=false){
  const height=rowHeight(label,rateValue),labels=wrap(label,firstWidth-14,8.5),bg=bold?C.pale:'#ffffff';pdf.rect(M,y,CW,height,bg);
  labels.forEach((line,i)=>pdf.text(line,M+7,y+12+i*12,8.5,bold,C.ink,bg));
  if(dual&&rateValue!==undefined)pdf.text('INR / USD: '+rate(rateValue),M+7,y+12+labels.length*12,7,false,rateValue==null?C.amber:C.muted,bg);
  [...suppliers.map(s=>values.find(v=>v.supplierId===s.id)),totals].forEach((cell,i)=>{
   const x=M+firstWidth+i*width,subWidth=dual?width/2:width;
   number(cell.amountMinor,x,subWidth,y+height/2+3,bold,bg);
   if(dual)number(cell.estimatedInrMinor,x+subWidth,subWidth,y+height/2+3,bold,bg);
   pdf.line(x,y,x,y+height);
  });pdf.line(M,y+height,W-M,y+height);y+=height;
 }
 {
  const suppliers=model.suppliers,groupTitle='All suppliers in selected scope';
  page(groupTitle);let width=tableHeader(suppliers);
  for(const bucket of model.buckets){
   if(y+rowHeight(bucketLabel(bucket),bucket.rate)>bottom){page(groupTitle+' - continued');width=tableHeader(suppliers);}
   row(bucketLabel(bucket),suppliers,width,bucket.cells,bucket.totals,bucket.rate);
  }
  if(y+rowHeight('Period total',undefined)>bottom){page(groupTitle+' - totals');width=tableHeader(suppliers);}
  const totals=suppliers.map(s=>{
   const cells=model.buckets.map(b=>b.cells.find(c=>c.supplierId===s.id));
   return {supplierId:s.id,amountMinor:sum(cells.map(c=>c.amountMinor)),estimatedInrMinor:sum(cells.map(c=>c.estimatedInrMinor))};
  });
  row('Period total',suppliers,width,totals,model.totals,undefined,true);
 }
 const notes=[...(dual?['INR amounts are estimates using each period\'s entered rate. Pending means a required rate is missing; it is not zero.']:[]),'Supplier payment planning only. Payment approvals and required documents remain applicable.',...(model.notes||[])];
 if(notes.length){
  if(y+46>bottom)page('Report notes');else y+=20;
  pdf.text('Report notes and assumptions',M,y,11,true);y+=18;
  for(const note of notes){
   for(const line of wrap(note,CW-12,8.5)){
    if(y+12>bottom){page('Report notes - continued');}
    pdf.text(line,M+8,y,8.5,false,C.muted);y+=12;
   }y+=6;
  }
 }
 pdf.pages.forEach((commands,i)=>{pdf.current=commands;pdf.line(M,H-31,W-M,H-31);pdf.text('FARMING HUB / SUPPLIER PAYMENT PLAN',M,H-17,7,true,C.muted);pdf.text('Page '+(i+1)+' of '+pdf.pages.length,W-M-62,H-17,8,true,C.muted);});
 return pdf.bytes();
}
