"""Exercise real PDF/XLSX writers with isolated data; optionally retain visual samples."""
import io, json, sys, subprocess, base64
from pathlib import Path
from PIL import Image
from openpyxl import load_workbook
from openpyxl.cell.cell import MergedCell
from pypdf import PdfReader

root=Path(__file__).resolve().parent.parent
out=Path(sys.argv[1]) if len(sys.argv)>1 else None
if out:out.mkdir(parents=True,exist_ok=True)
picture=io.BytesIO();Image.new('RGB',(120,60),'orange').save(picture,format='PNG')
photo=base64.b64encode(picture.getvalue()).decode()
def export(script,data,name,extra=()):
    result=subprocess.run([sys.executable,str(root/'server/implements-files'/script),*extra],input=json.dumps(data).encode(),capture_output=True)
    assert result.returncode==0,result.stderr.decode()
    if out:(out/name).write_bytes(result.stdout)
    return result.stdout
def workbook(raw):
    wb=load_workbook(io.BytesIO(raw))
    for ws in wb:
        assert ws.print_options.horizontalCentered
        assert ws.page_setup.fitToWidth==1 and ws.page_setup.fitToHeight==0
        for row in ws:
            for c in row:
                if isinstance(c,MergedCell) or c.value is None:continue
                assert c.alignment.horizontal=='center' and c.alignment.vertical=='center',(ws.title,c.coordinate)
                assert c.alignment.wrap_text
                assert all(getattr(c.border,s).style=='thin' for s in ('left','right','top','bottom'))
        for im in ws._images:
            assert im.anchor._from.colOff>0 and im.anchor._from.rowOff>0
    return wb

line={'code':'IMP-28','name':'PIPE CLAMP 76MM BOTTOM S.GI','supplierPartCode':'000123','mrp':72,'buffer':8,'extras':0,'orderQty':80,'uom':'pcs','weight':None,'rate':12.5,'rateUnit':'pc','amount':1000,'imageData':photo,'transportInCost':True,'purchaseBaseRate':12,'purchaseTransportPercent':4.16666667,'purchaseTransportAmount':.5}
po={'id':'TEST-PO-0016','date':'2026-11-18','supplier':{'name':'Test supplier','address':'First address line\nSecond address line'},'buyer':{'buyer':'Farming Hub','address':'Test address'},'quantityOnly':False,'total':1000,'lines':[line],'notes':'Keep original values, quantities and source identity.','stockAllocation':'Earliest month first'}
wb=workbook(export('export-po.py',po,'po-priced.xlsx'))
ws=wb['Purchase Order'];assert ws['E11'].value==80 and ws['C11'].value=='000123'
assert ws['B13'].value==po['notes'] and ws.max_column==6
assert [c.value for c in ws[10]]==['Item code','Component','Supplier part code','Unit','Total PO quantity','Product image']
assert wb.sheetnames==['Purchase Order'] and ws.print_title_rows=='$10:$10'
pdf=PdfReader(io.BytesIO(export('files.py',po,'po-priced.pdf',['pdf'])));text='\n'.join(p.extract_text() for p in pdf.pages)
assert '1,000.00' in text and '000123' in text and 'TEST-PO-0016' in text

po['quantityOnly']=True
wb=workbook(export('export-po.py',po,'po-quantity.xlsx'));assert wb['Purchase Order']['E11'].value==80 and wb['Purchase Order'].max_column==6
text='\n'.join(p.extract_text() for p in PdfReader(io.BytesIO(export('files.py',po,'po-quantity.pdf',['pdf']))).pages)
assert '1,000.00' not in text and 'Rate INR' not in text and 'Quantity-only PO' in text

po['quantityOnly']=False
po['lines']=[{**line,'code':f'IMP-{i+1}','name':f'Component {i+1}: long product identification and supplier specification, grade and size retained','uom':'ltr' if i==0 else 'pcs','orderQty':1.25 if i==0 else 80} for i in range(35)]
po['lines'].append({**line,'name':'Fabrication subassembly','fabricated':True,'weight':25,'children':[{'code':'FP-1','name':'Combined component set','weight':2.77,'supplierPartCode':'FP01','imageData':photo},{'code':'FP-2','name':'Weight not supplied','weight':None}]})
wb=workbook(export('export-po.py',po,'po-long.xlsx'));assert wb['Purchase Order']['D11'].value=='ltr' and wb['Purchase Order']['E11'].value==1.25
assert wb['Fabrication']['E2'].value=='kg' and wb['Fabrication']['F2'].value==round(2.77*80,6) and wb['Fabrication']['F3'].value is None
pages=PdfReader(io.BytesIO(export('files.py',po,'po-long.pdf',['pdf']))).pages
assert len(pages)>2
text='\n'.join(p.extract_text() for p in pages)
for i in range(35):assert f'IMP-{i+1}' in text
assert 'Quantity unit: ltr' in text and '221.6' in text and 'Weight not supplied' in text
for p in pages:
    t=p.extract_text()
    if 'Component ' in t:assert 'Item code / component' in t
    assert 'Page ' in t

item={'code':'000123','name':'=Do not execute & <literal>','category':'Gear','type':'Purchased','unit':'pcs','models':'S1.V14, S2.V12','drawing':'','supplier':'Supplier','imageStatus':'Reference','supplierPartCodes':'0000042','image':photo}
wb=workbook(export('export-items.py',{'rows':[item,{**item,'name':'Long item description '*30,'image':''}]},'items.xlsx'))
assert wb['Item Master']['C2'].value==item['name'] and wb['Item Master']['C2'].data_type=='s'
assert wb['Item Master']['B2'].value=='000123' and len(wb['Item Master']._images)==1
assert wb['Item Master'].row_dimensions[3].height>66

report={'id':'S2.V12','series':'Leader','size':'6FT','salesConfirmed':True,'partsKnown':1000,'fabricationTotal':None,'otherKnown':25,'knownTotal':1025,'total':None,'bomAvailable':True,'pending':1,'revision':2,'rows':[{'id':'a','segment':'Gears','code':'IMP-1','name':'Gear & assembly','type':'Purchased','ppm':2,'weight':None,'rate':500,'unit':'pcs','amount':1000,'status':'Priced'},{'id':'b','segment':'Fabrication','code':'FP-1','name':'Weight pending','type':'Fabricated','ppm':None,'weight':None,'rate':125,'unit':'kg','amount':None,'status':'Weight pending'}]}
wb=workbook(export('export-costing.py',{'reports':[report]},'costs.xlsx'))
assert wb['Model costs']['H2'].value==1025 and wb['Model costs']['I2'].value is None
assert wb['Cost detail']['J2'].value==1000 and wb['Cost detail']['J3'].value is None
wb=workbook(export('export-costing.py',{'reports':[report],'selection':{'ids':['a']}},'cost-filtered.xlsx'))
assert wb['Cost detail'].max_row==2 and wb['Model costs']['H2'].value==1025
print('verified PDF pagination, literal identities, amounts, pending values, mixed units, photos, filtered scope and boxed alignment')
