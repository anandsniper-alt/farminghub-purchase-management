// Presentation-only export of the already-authorized, already-filtered CSV snapshot.
// No fetch of business data, recalculation, formulas or writes to the workspace.
const NS='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const xml=v=>String(v??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const col=i=>{let s='';for(let n=i+1;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;};
export function parseTableCsv(csv){
 const rows=[];let row=[],cell='',quoted=false;const text=String(csv).replace(/^\uFEFF/,'');
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else if(quoted||!cell)quoted=!quoted;else cell+=c;}
  else if(c===','&&!quoted){row.push(cell);cell='';}
  else if((c==='\r'||c==='\n')&&!quoted){row.push(cell);rows.push(row);row=[];cell='';if(c==='\r'&&text[i+1]==='\n')i++;}
  else cell+=c;
 }
 if(quoted)throw Error('The table contains an incomplete quoted value. Download CSV to review it.');
 if(cell||row.length){row.push(cell);rows.push(row);}
 return rows.length?rows:[['No rows']];
}
let zipLoading;
async function zipEngine(){
 if(typeof globalThis.JSZip==='function')return globalThis.JSZip;
 if(!zipLoading)zipLoading=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/jszip.min.js';script.onload=()=>resolve(globalThis.JSZip);script.onerror=()=>{zipLoading=null;script.remove();reject(Error('Excel preparation failed. Try again or download CSV.'));};document.head.append(script);});
 return zipLoading;
}
const styles=`<styleSheet xmlns="${NS}"><fonts count="2"><font><sz val="11"/><name val="Calibri"/><color rgb="FF204321"/></font><font><b/><sz val="11"/><name val="Calibri"/><color rgb="FFFFFFFF"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF204321"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border>${['left','right','top','bottom'].map(s=>`<${s} style="thin"><color rgb="FFA8BAA4"/></${s}>`).join('')}<diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2">${[0,1].map(i=>`<xf numFmtId="0" fontId="${i}" fillId="${i?2:0}" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>`).join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
export async function tableXlsx(csv,Zip){
 const rows=parseTableCsv(csv),count=rows.reduce((n,r)=>Math.max(n,r.length),0);
 if(rows.length>50001||count>200)throw Error('This table is too large for formatted Excel. Download CSV instead.');
 const widths=Array.from({length:count},(_,i)=>Math.min(55,Math.max(14,...rows.slice(0,1000).map(r=>Math.max(...String(r[i]??'').split('\n').map(l=>l.length))+3))));
 const numeric=rows[0].map(h=>!/(code|phone|id\b|date)/i.test(h)&&/(qty|quantity|amount|cost|rate|price|stock|ppm|weight|kg|pieces|buffer|extras|ordered|acknowledged|outstanding|count|revision|total|margin|markup|percent|factor|machines|round)/i.test(h));
 const data=rows.map((r,i)=>{
  const height=Math.min(409,Math.max(28,...r.map((v,c)=>String(v).split('\n').reduce((n,l)=>n+Math.max(1,Math.ceil(l.length/(widths[c]-3))),0)*15+12)));
  return `<row r="${i+1}" ht="${height}" customHeight="1">${Array.from({length:count},(_,c)=>{
   const v=r[c]??'',ref=col(c)+(i+1);if(v.length>32767)throw Error('A cell exceeds Excel’s text limit. Download CSV instead.');
   if(i&&numeric[c]&&/^-?(0|[1-9]\d*)(\.\d+)?$/.test(v)&&v.replace(/[-.]/g,'').length<=15)return `<c r="${ref}" s="0"><v>${v}</v></c>`;
   return `<c r="${ref}" s="${i?0:1}" t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`;
  }).join('')}</row>`;
 }).join('');
 const end=col(count-1)+rows.length,zip=new Zip();
 zip.file('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>');
 zip.file('_rels/.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
 zip.file('xl/workbook.xml',`<workbook xmlns="${NS}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Export" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm.Print_Titles" localSheetId="0">'Export'!$1:$1</definedName><definedName name="_xlnm.Print_Area" localSheetId="0">'Export'!$A$1:$${col(count-1)}$${rows.length}</definedName></definedNames></workbook>`);
 zip.file('xl/_rels/workbook.xml.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
 zip.file('xl/styles.xml',styles);
 zip.file('xl/worksheets/sheet1.xml',`<worksheet xmlns="${NS}"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:${end}"/><sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="28"/><cols>${widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${data}</sheetData><autoFilter ref="A1:${end}"/><printOptions horizontalCentered="1"/><pageMargins left="0.3" right="0.3" top="0.45" bottom="0.45" header="0.2" footer="0.2"/><pageSetup paperSize="${count>8?8:9}" orientation="landscape" fitToWidth="1" fitToHeight="0"/><headerFooter><oddFooter>&amp;CPage &amp;P of &amp;N</oddFooter></headerFooter></worksheet>`);
 return zip.generateAsync({type:'uint8array',compression:'DEFLATE',compressionOptions:{level:6}});
}
export function saveDownload(name,contents,type='application/json'){
 const url=URL.createObjectURL(new Blob([contents],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
export function tableDownload(name,csv){
 const previous=document.activeElement,dialog=document.createElement('dialog');dialog.setAttribute('aria-labelledby','table-download-title');
 dialog.style.cssText='width:min(460px,calc(100vw - 32px));box-sizing:border-box;border:1px solid #a8baa4;border-radius:16px;padding:24px;color:#204321;background:white;font-family:inherit';
 dialog.innerHTML='<h2 id="table-download-title" style="margin-top:0">Download table</h2><p>Excel includes bordered, centred tables. CSV keeps the original plain data.</p><div style="display:flex;gap:12px;flex-wrap:wrap"><button type="button" data-format="xlsx" autofocus>Excel (.xlsx)</button><button type="button" data-format="csv">CSV (.csv)</button><button type="button" data-cancel>Cancel</button></div><p role="status" aria-live="polite" style="overflow-wrap:anywhere"></p>';
 for(const b of dialog.querySelectorAll('button'))b.style.cssText='min-height:44px;padding:10px 14px;border:1px solid #a8baa4;border-radius:8px;background:#f7f8f1;color:#204321;font:inherit;cursor:pointer';
 const close=()=>dialog.close();dialog.addEventListener('close',()=>{dialog.remove();if(previous?.isConnected)previous.focus();});
 dialog.querySelector('[data-cancel]').onclick=close;
 dialog.querySelector('[data-format="csv"]').onclick=()=>{saveDownload(name,csv,'text/csv;charset=utf-8');close();};
 dialog.querySelector('[data-format="xlsx"]').onclick=async()=>{
  const button=dialog.querySelector('[data-format="xlsx"]'),status=dialog.querySelector('[role="status"]');button.disabled=true;status.textContent='Preparing Excel…';
  try{const bytes=await tableXlsx(csv,await zipEngine());if(!dialog.isConnected)return;saveDownload(name.replace(/\.csv$/i,'.xlsx'),bytes,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');close();}
  catch(e){if(dialog.isConnected){status.textContent=e.message;button.disabled=false;}}
 };
 document.body.append(dialog);dialog.showModal();
}
