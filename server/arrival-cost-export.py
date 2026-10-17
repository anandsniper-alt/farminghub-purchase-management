"""Fill the Artifact Tool-authored XLSX template without extra runtime dependencies.

The workbook is a saved costing snapshot. Only detail totals use formulas; cached
values are supplied for viewers that do not recalculate Excel formulas.
"""
import copy
import io
import json
import math
from pathlib import Path
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from decimal import Decimal

NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
ET.register_namespace('', NS)
ET.register_namespace('r', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships')
def tag(name):
    return '{' + NS + '}' + name

def clean(value):
    # XML 1.0 controls cannot occur in cell text. Values remain literal, never formulas.
    return re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\ufffe\uffff]', '', str(value))

def row(sheet, number):
    data = sheet.find(tag('sheetData'))
    for r in data:
        if int(r.get('r')) == number:
            return r
    r = ET.Element(tag('row'), {'r': str(number)})
    index = next((i for i, old in enumerate(data) if int(old.get('r')) > number), len(data))
    data.insert(index, r)
    return r

def cell(sheet, address):
    r = row(sheet, int(re.search(r'\d+', address).group()))
    for c in r:
        if c.get('r') == address:
            return c
    c = ET.Element(tag('c'), {'r': address})
    r.append(c)
    # All template columns are single letters. Keep cells ordered for Excel.
    r[:] = sorted(r, key=lambda el: el.get('r').rstrip('0123456789'))
    return c

def put(sheet, address, value, formula=None):
    c = cell(sheet, address)
    for child in list(c):
        c.remove(child)
    c.attrib.pop('t', None)
    if formula is not None:
        ET.SubElement(c, tag('f')).text = formula
    if value is None:
        if formula:
            c.set('t', 'str')
            ET.SubElement(c, tag('v'))
    elif isinstance(value, (int, float)) and not isinstance(value, bool):
        if not math.isfinite(value):
            raise ValueError('Non-finite amount')
        ET.SubElement(c, tag('v')).text = str(value)
    else:
        c.set('t', 'inlineStr')
        text = ET.SubElement(ET.SubElement(c, tag('is')), tag('t'))
        text.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
        text.text = clean(value)

def excel_date(value):
    if not value:
        return None
    parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if parsed.tzinfo:
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
    return (parsed - datetime(1899, 12, 30)).total_seconds() / 86400

def sum_saved(values):
    if any(v is None for v in values):
        return None
    return float(sum((Decimal(str(v)) for v in values), Decimal(0)))

def height(sheet, number, text, width, minimum=24):
    lines = sum(max(1, math.ceil(len(part) / width)) for part in str(text).split('\n'))
    r = row(sheet, number)
    r.set('ht', str(min(409, max(minimum, lines * 15 + 10))))
    r.set('customHeight', '1')

def write_workbook(report):
    with zipfile.ZipFile(Path(__file__).with_name('arrival-cost-template.xlsx')) as source:
        parts = {n: source.read(n) for n in source.namelist()}
    sheets = [ET.fromstring(parts[f'xl/worksheets/sheet{i}.xml']) for i in range(1, 4)]
    summary, expenses, items = sheets
    # Reference and status fields are intentionally literal strings, including =,+,-,@.
    refs = [report['supplier'], report['po'], report['shipment'], report['ro'], report['invoice'], report['boe'],
            excel_date(report['boeDate']), report['status'], report['finalizedBy'], excel_date(report['finalizedAt'])]
    for number, value in enumerate(refs, 5):
        put(summary, f'C{number}', value)
        if isinstance(value, str):
            height(summary, number, value, 50, 46 if number == 5 else 24)
    totals = [report['total'], report['invoiceTotal'], report['usdTotal'], report['costPerUsd'], report['gst'], sum_saved([l['quantity'] for l in report['lines']])]
    for number, value in enumerate(totals, 5):
        put(summary, f'F{number}', value)
    put(summary, 'E6', f"Invoice total ({report['currency']})")
    details = [report['allocation'], report['remarks'], report['currencyPerUsd'], excel_date(report['fxDate']), report['fxSource'], excel_date(report['exportedAt'])]
    for address, value in zip(['C18', 'C19', 'F18', 'F19', 'F20', 'F21'], details):
        put(summary, address, value)
    for number, key, width in [(18, 'allocation', 50), (19, 'remarks', 50), (20, 'fxSource', 24)]:
        height(summary, number, report[key], width)
    context = f"Invoice currency: {report['currency']}"
    for sheet in (expenses, items):
        put(sheet, 'B3', context)
    for number, expense in enumerate(report['expenses'], 6):
        put(expenses, f'C{number}', expense['amount'])
        put(expenses, f'D{number}', 'Pending' if expense['amount'] is None else 'Recorded')
    cost_sum = sum_saved([e['amount'] for e in report['expenses']])
    put(expenses, 'C16', cost_sum, 'IF(COUNT(C6:C14)=9,SUM(C6:C14),"")')
    put(expenses, 'D16', 'Pending' if cost_sum is None else '')
    put(expenses, 'C18', report['gst'])
    by_key = {e['key']: e['amount'] for e in report['expenses']}
    for number, key in enumerate(['bcd', 'sws', 'gst'], 24):
        put(expenses, f'C{number}', report['boeTotals'][key])
        put(expenses, f'D{number}', report['gst'] if key == 'gst' else by_key[key])
    put(items, 'E5', f"Invoice unit price ({report['currency']})")
    put(items, 'F5', f"Invoice line amount ({report['currency']})")
    data = items.find(tag('sheetData'))
    prototype = copy.deepcopy(row(items, 6))
    total_row = copy.deepcopy(row(items, 7))
    for old in list(data):
        if int(old.get('r')) >= 6:
            data.remove(old)
    for number, line in enumerate(report['lines'], 6):
        r = copy.deepcopy(prototype)
        r.set('r', str(number))
        for c in r:
            c.set('r', re.sub(r'\d+', str(number), c.get('r')))
        data.append(r)
        values = [line[k] for k in ['code', 'name', 'quantity', 'unitPrice', 'invoice', 'usd', 'unitCost', 'landed']]
        for col, value in zip('BCDEFGHI', values):
            put(items, f'{col}{number}', value)
        height(items, number, line['name'] or '', 52, 48)
    last = 5 + len(report['lines'])
    number = last + 1
    total_row.set('r', str(number))
    for c in total_row:
        c.set('r', re.sub(r'\d+', str(number), c.get('r')))
    data.append(total_row)
    for col, key in [('D', 'quantity'), ('F', 'invoice'), ('G', 'usd'), ('I', 'landed')]:
        formula = f'IF(COUNT({col}6:{col}{last})={len(report["lines"])},SUM({col}6:{col}{last}),"")'
        put(items, f'{col}{number}', sum_saved([l[key] for l in report['lines']]), formula)
    dimension = items.find(tag('dimension'))
    if dimension is None:
        dimension = ET.Element(tag('dimension'))
        items.insert(1 if items.find(tag('sheetPr')) is not None else 0, dimension)
    dimension.set('ref', f'A1:I{number}')
    autofilter = ET.Element(tag('autoFilter'), {'ref': f'B5:I{last}'})
    data_index = list(items).index(data)
    items.insert(data_index + 1, autofilter)
    for index, sheet in enumerate(sheets, 1):
        parts[f'xl/worksheets/sheet{index}.xml'] = ET.tostring(sheet, encoding='utf-8', xml_declaration=True)
    output = io.BytesIO()
    with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as target:
        for name, content in parts.items():
            target.writestr(name, content)
    return output.getvalue()

if __name__ == '__main__':
    sys.stdout.buffer.write(write_workbook(json.load(sys.stdin)))
