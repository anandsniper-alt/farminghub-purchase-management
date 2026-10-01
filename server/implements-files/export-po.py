"""Portable review PO workbook with quantity and fabrication schedules."""
import sys,json,io
from openpyxl import Workbook
from openpyxl.styles import Font,PatternFill,Alignment
from openpyxl.utils import get_column_letter
po=json.load(sys.stdin);wb=Workbook();ws=wb.active;ws.title='Purchase Order'
rows=[['FARMING HUB - REVIEW PURCHASE ORDER',po['id']],['Status','Approval and issuing pending'],['Date',po['date']],['Supplier',po['supplier']['name']],['Supplier address',po['supplier'].get('address','')],['Buyer',po['buyer'].get('buyer','')],['Buyer address',po['buyer'].get('address','')],['Delivery',po.get('delivery','')],['Planning month',po.get('planningMonth','')],[],['Item code','Component','MRP pcs','Buffer pcs','Extras pcs','Order pcs','Weight kg','Rate INR','Basis','Amount INR']]
for line in po['lines']:rows.append([line.get('code',''),line['name'],line['mrp'],line['buffer'],line['extras'],line['orderQty'],line.get('weight'),None if po['quantityOnly'] else line.get('rate'),line.get('rateUnit',''),None if po['quantityOnly'] else line.get('amount')])
rows += [[],['Total before GST',None if po['quantityOnly'] else po['total']],['Notes',po.get('notes','')],['Stock allocation',po.get('stockAllocation','')]]
for row in rows:ws.append(row)
for row in ws:
 for c in row:
  if isinstance(c.value,str):c.data_type='s'
  c.alignment=Alignment(vertical='top',wrap_text=True)
  if isinstance(c.value,(float,int)):c.number_format='#,##0.00'
for rownum in [1,11]:
 for c in ws[rownum]:c.fill=PatternFill('solid',fgColor='204321');c.font=Font(color='FFFFFF',bold=True)
for i,width in enumerate([26,55,14,14,14,14,16,16,14,20],1):ws.column_dimensions[get_column_letter(i)].width=width
ws.freeze_panes='C12';ws.auto_filter.ref=f'A11:J{11+len(po["lines"])}'
fab=wb.create_sheet('Fabrication');fab.append(['Subassembly','Drawing / code','Component','PPM pcs','kg per machine','Ordered pcs','Order kg'])
for line in po['lines']:
 if line.get('fabricated'):
  for child in line.get('children',[]):fab.append([line['name'],child.get('code') or child.get('drawingCode'),child['name'],child.get('ppm'),child.get('weight'),line['orderQty'],None if child.get('weight') is None else child['weight']*line['orderQty']])
for row in fab:
 for c in row:
  if isinstance(c.value,str):c.data_type='s'
for i,width in enumerate([32,24,48,16,20,18,20],1):fab.column_dimensions[get_column_letter(i)].width=width
fab.freeze_panes='D2';fab.auto_filter.ref=f'A1:G{max(1,fab.max_row)}'
out=io.BytesIO();wb.save(out);sys.stdout.buffer.write(out.getvalue())
