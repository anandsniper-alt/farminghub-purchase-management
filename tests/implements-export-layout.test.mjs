import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {parseTableCsv,tableXlsx} from '../web/table-download.mjs';

test('PDF and all existing Excel exports preserve report semantics and align cells',()=>{
 const r=spawnSync(process.env.FH_PYTHON||'python3',[fileURLToPath(new URL('./implements-export-layout-check.py',import.meta.url))],{encoding:'utf8',windowsHide:true});
 assert.equal(r.status,0,r.stderr||r.error?.message);assert.match(r.stdout,/verified/);
});
test('CSV parsing retains quoted commas, line breaks, leading zeros and empty cells',()=>{
 assert.deepEqual(parseTableCsv('\ufeffCode,Name,Qty\r\n00042,"Gear, 35 mm\nline ""two""",0.25\r\nIMP-2,,\r\n'),[['Code','Name','Qty'],['00042','Gear, 35 mm\nline "two"','0.25'],['IMP-2','','']]);
 assert.throws(()=>parseTableCsv('Name\n"unterminated'));
});
test('new Excel option preserves IDs and literal formula text, with numeric quantities and frozen headers',async()=>{
 const context={setTimeout,clearTimeout,setImmediate,clearImmediate,Uint8Array,ArrayBuffer,TextEncoder,TextDecoder};vm.createContext(context);vm.runInContext(readFileSync(new URL('../web/jszip.min.js',import.meta.url),'utf8'),context);
 const bytes=await tableXlsx('Item code,Component,Qty,Cost\r\n00042,"=SUM(1,2)",0.25,1000.50\r\nIMP-2,Pending,,\r\n',context.JSZip);
 const r=spawnSync(process.env.FH_PYTHON||'python3',['-c',`import sys,io
from openpyxl import load_workbook
w=load_workbook(io.BytesIO(sys.stdin.buffer.read()));s=w.active
assert s['A2'].value=='00042' and s['B2'].value=='=SUM(1,2)' and s['B2'].data_type=='s'
assert s['C2'].value==.25 and s['D2'].value==1000.5 and s['C3'].value in ('',None)
assert s.freeze_panes=='A2' and s.print_title_rows=='$1:$1' and s.auto_filter.ref=='A1:D3'
for row in s:
 for c in row:
  assert c.alignment.horizontal=='center' and c.alignment.vertical=='center'
  assert c.border.left.style=='thin' and c.border.right.style=='thin'
print('verified')`],{input:Buffer.from(bytes),windowsHide:true});
 assert.equal(r.status,0,r.stderr?.toString()||r.error?.message);assert.match(r.stdout.toString(),/verified/);
});
