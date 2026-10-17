import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {EventEmitter} from 'node:events';
import {arrivalCostExportReport,arrivalCostExportFilename,buildArrivalCostXlsx} from '../server/arrival-cost-export.mjs';
import {arrivalCostCalculation,ARRIVAL_COST_FIELDS} from '../shared/arrival-costing.mjs';
import {makeServer} from '../server/index.mjs';
import {createArrivalCostingUI} from '../web/arrival-costing.mjs';
const actor={id:'manager',role:'MANAGER',scopes:['LAE_IMPORT'],active:true};
function fixture(){
 const c={id:'cost',shipmentId:'ship',invoiceNumber:'00042',roReference:'00012',boeNumber:'00099',boeDate:'2026-10-14',status:'FINAL',currency:'RMB',currencyPerUsd:7000000,fxDate:'2026-10-13',fxSource:'Supplier agreement',allocationNote:'Allocated once by invoice value.',remarks:'',finalizedAt:'2026-10-14T10:30:00Z',finalizedBy:'Manager',gstMinor:12345,boeTotals:{bcd:500,sws:100,gst:15000},costs:Object.fromEntries(ARRIVAL_COST_FIELDS.map(([k])=>[k,0])),lines:[{code:'A',name:'First item',quantity:2,unitPriceMinor:10001},{code:'B',name:'Second item',quantity:3,unitPriceMinor:10000}]};
 c.costs.supplierPayment=100001;c.costs.bcd=500;c.costs.sws=100;c.calculation=arrivalCostCalculation(c);
 return {vendors:[{id:'supplier',name:'Example Supplier'}],orders:[{id:'order',scope:'LAE_IMPORT',number:'PO-1',vendorId:'supplier',shipments:[{id:'ship',number:'SHP-1'}],arrivalCostings:[c]}]};
}
const reportFor=state=>arrivalCostExportReport(state,actor,'order','cost');
function inspect(bytes,mode){
 const result=spawnSync(process.env.FH_PYTHON||'python3',[fileURLToPath(new URL('./arrival-cost-export-check.py',import.meta.url)),mode],{input:bytes,windowsHide:true,encoding:'utf8'});
 assert.equal(result.status,0,result.stderr||result.error?.message);assert.match(result.stdout,/verified/);
}
test('exports a detached saved snapshot and safe filename without changing source',()=>{
 const state=fixture(),before=structuredClone(state),report=reportFor(state);
 assert.equal(report.total,1006.01);assert.equal(report.currencyPerUsd,7);assert.equal(report.ro,'00012');
 assert.deepEqual(state,before);report.lines[0].quantity=900;assert.deepEqual(state,before);
 const filename=arrivalCostExportFilename({...report,invoice:'../\r\n"bad/INV'});assert.ok(!/[\r\n"/\\]/.test(filename));assert.ok(filename.endsWith('.xlsx'));
});
test('requires active, permitted order scope and an existing costing',()=>{
 const state=fixture();for(const user of [null,{...actor,active:false},{...actor,scopes:['LAE_DOMESTIC']},{...actor,role:'PLAN_OPERATOR'}])assert.throws(()=>arrivalCostExportReport(state,user,'order','cost'));
 assert.throws(()=>arrivalCostExportReport(state,actor,'missing','cost'));assert.throws(()=>arrivalCostExportReport(state,actor,'order','missing'));
 state.orders[0].scope='LAE_DOMESTIC';assert.throws(()=>arrivalCostExportReport(state,{...actor,role:'ADMIN'},'order','cost'));
});
test('XLSX preserves numeric precision, non-USD fields, totals and leading-zero references',async()=>inspect(await buildArrivalCostXlsx(reportFor(fixture())),'final'));
test('provisional blank expense remains pending while confirmed zero stays numeric',async()=>{
 const state=fixture(),c=state.orders[0].arrivalCostings[0];c.status='PROVISIONAL';c.costs.insurance=null;c.gstMinor=null;c.finalizedAt='';c.finalizedBy='';c.calculation=arrivalCostCalculation(c);
 inspect(await buildArrivalCostXlsx(reportFor(state)),'pending');
});
test('supplier, references and descriptions cannot become executable spreadsheet formulas',async()=>{
 const state=fixture(),c=state.orders[0].arrivalCostings[0];state.vendors[0].name='=1+1';c.invoiceNumber='@SUM(A1:A2)';c.roReference='+0012';c.calculation.lines[0].name='=HYPERLINK("https://invalid.example")';
 inspect(await buildArrivalCostXlsx(reportFor(state)),'literal');
});
test('all 500 item rows export with expanded totals and filter range',async()=>{
 const report=reportFor(fixture());report.lines=Array.from({length:500},(_,i)=>({...report.lines[0],code:'SKU-'+i}));
 inspect(await buildArrivalCostXlsx(report),'large');
});
async function request(server,url,token='ok'){
 return new Promise(resolve=>{const req={url,method:'GET',headers:{host:'localhost',cookie:token?'fh_session='+token:''},socket:{remoteAddress:'127.0.0.1'}},res=new EventEmitter();
 res.headers={};res.setHeader=(k,v)=>res.headers[k.toLowerCase()]=v;res.writeHead=(s,h)=>{res.statusCode=s;for(const [k,v]of Object.entries(h))res.setHeader(k,v);};res.end=b=>{res.emit('finish');resolve({status:res.statusCode,headers:res.headers,body:Buffer.from(b||'')});};server.emit('request',req,res);});
}
test('authenticated export route returns XLSX, denies unauthenticated and cross-scope requests',async()=>{
 const state=fixture(),before=structuredClone(state),store={read:()=>state,session:token=>token==='ok'?{user:actor}:token==='wrong'?{user:{...actor,scopes:[]}}:null};
 const server=makeServer(store,{log:()=>{}}),url='/api/arrival-costings/export.xlsx?orderId=order&costingId=cost';
 assert.equal((await request(server,url,'')).status,401);assert.equal((await request(server,url,'wrong')).status,403);
 const result=await request(server,url);assert.equal(result.status,200);assert.equal(result.body.subarray(0,2).toString(),'PK');assert.match(result.headers['content-disposition'],/\.xlsx/);assert.equal(result.headers['cache-control'],'private, no-store');assert.deepEqual(state,before);
});
test('unrelated UI actions fall through; failed exports restore buttons and can be retried',async(t)=>{
 const state=fixture(),button={disabled:false,isConnected:true},context={state,sandbox:false};
 t.mock.method(globalThis,'fetch',async()=>({ok:false,json:async()=>({error:'Please sign in'})}));
 const original=globalThis.document;globalThis.document={querySelectorAll:()=>[button]};t.after(()=>{globalThis.document=original;});
 const ui=createArrivalCostingUI({context:()=>context});
 assert.equal(await ui.action('unrelated',{}),false);
 for(let i=0;i<2;i++){await assert.rejects(()=>ui.action('arrival-cost-export',{id:'order',costing:'cost'}),/Please sign in/);assert.equal(button.disabled,false);}
 context.sandbox=true;await assert.rejects(()=>ui.action('arrival-cost-export',{id:'order',costing:'cost'}),/Sign in/);
});
