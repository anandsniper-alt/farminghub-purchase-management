import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../server/store.mjs';
import {makeServer} from '../server/index.mjs';
import {createCleanSeed} from '../shared/clean-seed.mjs';
import {RuleError} from '../shared/domain.mjs';

const day='2026-11-28';
const password='Local-po-download-test-042';
const sampleOutput=process.env.FH_PO_PDF_QA_OUTPUT;
const rendererBytes=Buffer.from('%PDF-1.4\n% Test renderer result\n%%EOF\n');

function seedOrders(){
 const state=createCleanSeed(day);
 const scope='LAE_IMPORT';
 const vendor={id:'test-vendor',name:'Live master supplier',code:'QA-LIVE',scopes:[scope]};
 const draftVendor={...vendor,id:'test-draft-vendor',name:'Sample Supplier & Engineering',code:'QA-DRAFT'};
 const specification={id:'test-spec',status:'APPROVED',description:'Selected draft specifications \nImpeller clearance 0.5 mm'};
 const line={id:'test-line',code:'QA-PUMP-01',name:'Draft cast-iron transfer pump',category:'WATER PUMP',
  baseId:'test-base',specId:specification.id,quantity:2,unitPriceMinor:4567,
  costCenterAllocations:[{costCenterId:'TN',quantity:2}],artworkNotes:'Use carton label sample'};
 const draft={id:'po-demo-draft',number:'QA-PO-8101',serialNumber:1,scope,status:'DRAFT',createdAt:day,
  requestedPortDate:'2027-01-15',vendorId:draftVendor.id,currency:'USD',incoterm:'FOB',
  costCenterIds:['TN'],lines:[line],revisions:[],paymentTerms:{name:'Draft commercial terms'},
  notes:'Synthetic draft notes <img src="https://example.test/untrusted.png">',shipments:[],tasks:[]};
 const historicSnapshot={...draft,id:undefined,number:'QA-PO-8102',
  vendor:{name:'Historic frozen supplier',code:'QA-OLD'},
  lines:[{...line,code:'QA-PUMP-OLD',name:'Historic cast-iron transfer pump',quantity:4,unitPriceMinor:25000,
   costCenterAllocations:[{costCenterId:'TN',quantity:4}],specification:{description:'Historic frozen specification'}}],
  notes:'Historic frozen commercial remarks',paymentTerms:{name:'Historic frozen payment terms'},
  attachments:[{name:'Historic artwork.pdf',fileId:'qa-file-r0'}],totalMinor:100000};
 const latestSnapshot={...historicSnapshot,vendor:{name:'Sample Machinery Trading Co.',code:'QA-LATEST'},
  lines:Array.from({length:32},(_,i)=>({...line,id:'test-line-'+i,code:'QA-LINE-'+String(i+1).padStart(2,'0'),
   name:'Heavy-duty transfer pump with corrosion-resistant fittings',quantity:3,unitPriceMinor:12345+i,
   costCenterAllocations:[{costCenterId:'TN',quantity:1},{costCenterId:'AP',quantity:2}],
   specification:{description:'Confirm 7 HP engine and threaded fuel tank cover.\nPack with reinforced cardboard and seal the accessory pouch.'}})),
  costCenterIds:['TN','AP'],priceConversion:{from:'CNY',to:'USD',rate:7120000,date:'2026-11-27',quote:'USD_CNY'},
  totalMinor:1186608,notes:'Sample order confirmed by the supplier. Ship with approved cartons.',
  paymentTerms:{name:'Latest frozen payment terms'},attachments:[{name:'Sample specification.pdf',fileId:'qa-file-r1'}]};
 const issued={...draft,id:'po-demo-issued',number:latestSnapshot.number,serialNumber:2,scope,status:'ISSUED',
  vendorId:vendor.id,notes:'Mutable order notes must stay out of issued PDFs',paymentTerms:{name:'Mutable payment terms'},
  lines:[{...line,name:'Mutable pending line revision',unitPriceMinor:1}],confirmation:{revision:1},revision:1,
  revisions:[{revision:0,at:'2026-10-13',actor:'QA Approver One',snapshot:historicSnapshot},
   {revision:1,at:'2026-11-27',actor:'QA Approver Two',snapshot:latestSnapshot}]};
 state.demo=true;
 state.vendors=[vendor,draftVendor];
 state.bases=[{id:'test-base',scope,code:'QA-BASE',specifications:[specification]}];
 state.items=[];
 state.orders=[draft,issued,{...issued,id:'po-legacy-missing-snapshot',number:'QA-PO-LEGACY',serialNumber:3,
  revisions:[{revision:0,actor:'Former approver',at:'2026-09-15'}]},
  {...issued,id:'po-deleted',number:'QA-PO-DELETED',serialNumber:4,deletedAt:day}];
 state.users.push({id:'u-utility',name:'Utility test viewer',role:'VIEWER',scopes:['UTILITY_DOMESTIC'],active:true});
 return state;
}

async function startServer(t,renderPurchaseOrderPdf){
 const folder=mkdtempSync(join(tmpdir(),'fh-po-download-'));
 const store=new Store(join(folder,'test.sqlite'),seedOrders());
 const server=makeServer(store,{applicationMode:'purchase',renderPurchaseOrderPdf,log:()=>{}});
 t.after(async()=>{
  await new Promise(resolve=>server.close(resolve));
  store.close();
  rmSync(folder,{recursive:true,force:true});
 });
 await new Promise((resolve,reject)=>server.once('error',reject).listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 async function signIn(id){
  const email=id+'@example.test';
  store.addAccount(id,email,password);
  const result=await fetch(origin+'/api/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},
   body:JSON.stringify({email,password})});
  assert.equal(result.status,200);
  await result.arrayBuffer();
  return result.headers.get('set-cookie').split(';')[0];
 }
 const download=(id,cookie,query='',format='pdf')=>fetch(origin+'/api/orders/'+id+'/'+format+query,{headers:cookie?{Cookie:cookie}:{}});
 return {store,signIn,download};
}

async function downloadBytes(response,filename){
 if(response.status!==200)assert.fail(`PDF request returned ${response.status}: ${await response.text()}`);
 assert.equal(response.headers.get('content-type'),'application/pdf');
 assert.equal(response.headers.get('content-disposition'),`attachment; filename="${filename}"`);
 assert.equal(response.headers.get('cache-control'),'private, no-store');
 assert.equal(response.headers.get('cross-origin-resource-policy'),'same-origin');
 const bytes=Buffer.from(await response.arrayBuffer());
 assert.equal(Number(response.headers.get('content-length')),bytes.length);
 assert.equal(bytes.subarray(0,5).toString(),'%PDF-');
 return bytes;
}

test('PO PDF download uses the saved draft, the latest confirmed snapshot, and a selected historical snapshot',async t=>{
 const rendered=[];
 const {store,signIn,download}=await startServer(t,async html=>{rendered.push(html);return rendererBytes;});
 const before=store.read();
 const viewer=await signIn('u-viewer');
 assert.deepEqual(await downloadBytes(await download('po-demo-draft',viewer),'QA-PO-8101-draft.pdf'),rendererBytes);
 assert.deepEqual(await downloadBytes(await download('po-demo-issued',viewer),'QA-PO-8102-rev-1.pdf'),rendererBytes);
 assert.deepEqual(await downloadBytes(await download('po-demo-issued',viewer,'?revision=0'),'QA-PO-8102-rev-0.pdf'),rendererBytes);
 assert.deepEqual(store.read(),before);

 const [draft,latest,old]=rendered;
 assert.match(draft,/DRAFT \/ NOT ISSUED/);
 assert.match(draft,/Sample Supplier &amp; Engineering/);
 assert.match(draft,/Impeller clearance 0\.5 mm/);
 assert.match(draft,/USD 91\.34/);
 assert.match(draft,/&lt;img src=&quot;https:\/\/example\.test\/untrusted\.png&quot;&gt;/);
 assert.doesNotMatch(draft,/<img src="https:\/\/example\.test/);
 assert.match(latest,/PO revision 1 \/ 27 Nov 2026/);
 assert.match(latest,/Sample Machinery Trading Co\./);
 assert.match(latest,/QA-LINE-32/);
 assert.match(latest,/Latest frozen payment terms/);
 assert.match(latest,/Sample specification\.pdf/);
 assert.match(latest,/USD 11,866\.08/);
 assert.match(latest,/1 USD = 7\.12 CNY \(RMB\)/);
 assert.match(latest,/96 of 96 units allocated/);
 assert.match(old,/PO revision 0 \/ 13 Oct 2026/);
 assert.match(old,/Historic frozen supplier/);
 assert.match(old,/Historic frozen specification/);
 assert.match(old,/Historic frozen payment terms/);
 assert.match(old,/Historic artwork\.pdf/);
 assert.match(old,/USD 1,000\.00/);
 assert.doesNotMatch(latest,/DRAFT \/ NOT ISSUED|Historic frozen|Mutable|Live master supplier/);
 assert.doesNotMatch(old,/DRAFT \/ NOT ISSUED|Latest frozen|QA-LINE-32|Mutable|Live master supplier|Impeller clearance/);
});

test('PO PDF download checks session scope and revision availability before invoking the renderer',async t=>{
 let renders=0;
 const {signIn,download}=await startServer(t,async()=>{renders++;return rendererBytes;});
 const viewer=await signIn('u-viewer');
 const otherScope=await signIn('u-utility');
 const expectError=async(response,status)=>{
  assert.equal(response.status,status);
  assert.equal(response.headers.get('content-disposition'),null);
  assert.equal(typeof (await response.json()).error,'string');
 };

 await expectError(await download('po-demo-issued'),401);
 await expectError(await download('po-demo-issued',otherScope),404);
 await expectError(await download('missing-po',viewer),404);
 for(const query of ['?revision=','?revision=-1','?revision=1.0','?revision=1x','?revision=0&revision=1','?revision=9999999999999999']){
  await expectError(await download('po-demo-issued',viewer,query),400);
 }
 await expectError(await download('po-demo-issued',viewer,'?revision=3'),404);
 await expectError(await download('po-demo-draft',viewer,'?revision=0'),404);
 await expectError(await download('po-legacy-missing-snapshot',viewer,'?revision=0'),404);
 await expectError(await download('po-legacy-missing-snapshot',viewer),404);
 assert.equal(renders,0);

 // Archived financial links retain normal scoped read access.
 await expectError(await download('po-deleted',otherScope),404);
 const archived=await download('po-deleted',viewer);
 assert.equal(archived.status,200);
 assert.equal(archived.headers.get('content-type'),'application/pdf');
 assert.deepEqual(Buffer.from(await archived.arrayBuffer()),rendererBytes);
 assert.equal(renders,1);
});

test('failed preparation responds with a retry or Print PO message and no download',async t=>{
 let renders=0;
 const {store,signIn,download}=await startServer(t,async()=>{
  if(++renders===1)throw new RuleError('Retry the purchase order PDF or use Print PO.','PDF_UNAVAILABLE');
  return Buffer.from('A renderer error must not be served as a PDF.');
 });
 const viewer=await signIn('u-viewer');
 const before=store.read();
 for(let i=0;i<2;i++){
  const response=await download('po-demo-draft',viewer);
  assert.equal(response.status,503);
  assert.equal(response.headers.get('content-disposition'),null);
  assert.match((await response.json()).error,/Print PO/);
 }
 assert.deepEqual(store.read(),before);
});

test('PO PDF renderer smoke test saves draft, confirmed, and historical sample downloads',{
 skip:!sampleOutput&&'Set FH_PO_PDF_QA_OUTPUT to inspect real renderer output.',timeout:120000
},async t=>{
 const {store,signIn,download}=await startServer(t);
 const viewer=await signIn('u-viewer');
 const before=store.read();
 mkdirSync(sampleOutput,{recursive:true});
 for(const [id,query,filename] of [
  ['po-demo-draft','','QA-PO-8101-draft.pdf'],
  ['po-demo-issued','','QA-PO-8102-rev-1.pdf'],
  ['po-demo-issued','?revision=0','QA-PO-8102-rev-0.pdf']
 ]){
  const bytes=await downloadBytes(await download(id,viewer,query),filename);
  assert.match(bytes.subarray(-64).toString('ascii'),/%%EOF\s*$/);
  assert.ok(bytes.length>1024);
  writeFileSync(join(sampleOutput,filename),bytes);
 }
 assert.deepEqual(store.read(),before);
});

test('Excel exports numeric prices and quantities from the selected saved PO and requires the correct scope',async t=>{
 const {store,signIn,download}=await startServer(t);
 const viewer=await signIn('u-viewer');
 const other=await signIn('u-utility');
 const before=store.read();
 for(const [cookie,query,status] of [[undefined,'',401],[other,'',404],[viewer,'?revision=9',404],[viewer,'?revision=-1',400]]){
  const denied=await download('po-demo-issued',cookie,query,'xlsx');
  assert.equal(denied.status,status);
  assert.equal(denied.headers.get('content-disposition'),null);
  await denied.arrayBuffer();
 }
 const inspect=`
import io, json, sys
from openpyxl import load_workbook
book = load_workbook(io.BytesIO(sys.stdin.buffer.read()), data_only=False)
s = book['Purchase order']
rows = list(s.values)
header = next(i for i,r in enumerate(rows) if r[0] == '#')
labels = rows[header]
start = header + 1
total = rows[header - 1]
amount = labels.index('USD amount')
report = {'sheets':book.sheetnames,'qty':total[4],'total':total[amount],
          'code':rows[start][2],'unit':rows[start][amount-1],
          'firstAmount':rows[start][amount], 'sum':round(sum(r[amount] for r in rows[start:] if isinstance(r[0],int)),2),
          'reference':total[labels.index('CNY reference amount')] if 'CNY reference amount' in labels else None}
print(json.dumps(report))
`;
 for(const [id,query,file,qty,total,code,unit,firstAmount,reference] of [
  ['po-demo-draft','','QA-PO-8101-draft.xlsx',2,91.34,'QA-PUMP-01',45.67,91.34,null],
  ['po-demo-issued','','QA-PO-8102-rev-1.xlsx',96,11866.08,'QA-LINE-01',123.45,370.35,84486.49],
  ['po-demo-issued','?revision=0','QA-PO-8102-rev-0.xlsx',4,1000,'QA-PUMP-OLD',250,1000,null]
 ]){
  const response=await download(id,viewer,query,'xlsx');
  if(response.status!==200)assert.fail(await response.text());
  assert.equal(response.headers.get('content-type'),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  assert.equal(response.headers.get('content-disposition'),`attachment; filename="${file}"`);
  assert.equal(response.headers.get('cache-control'),'private, no-store');
  const bytes=Buffer.from(await response.arrayBuffer());
  const result=spawnSync(process.env.FH_PYTHON||'python3',['-c',inspect],{input:bytes,encoding:'utf8',windowsHide:true});
  assert.equal(result.status,0,result.stderr||String(result.error));
  assert.deepEqual(JSON.parse(result.stdout),{
   sheets:['Purchase order','Technical specifications','Cost centre allocations'],qty,total,code,unit,firstAmount,sum:total,reference
  });
  if(sampleOutput){mkdirSync(sampleOutput,{recursive:true});writeFileSync(join(sampleOutput,file),bytes);}
 }
 assert.deepEqual(store.read(),before);
});
