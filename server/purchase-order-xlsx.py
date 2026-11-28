"""Write a formatted workbook from the saved purchase order projection."""

from datetime import date
from decimal import Decimal
import io
import json
from math import ceil
import re
import sys

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter


GREEN = '204321'
MINT = 'EDF2E4'
STRIPE = 'F7F8F3'
INK = '203A2B'
WHITE = 'FFFFFF'
MONEY = '#,##0.00'
REFERENCE_PRICE = '#,##0.0000'
QUANTITY = '#,##0'
XML_CONTROLS = re.compile(r'[\x00-\x08\x0b\x0c\x0e-\x1f\ud800-\udfff\ufffe\uffff]')


def amount(value):
    if value is None:
        return None
    parts = Decimal(value[0]).as_tuple()
    decimal = Decimal((parts.sign, parts.digits, parts.exponent - value[1]))
    # Excel's numeric cells retain at most 15 significant digits.
    significant = ''.join(map(str, parts.digits)).rstrip('0')
    return format(decimal, 'f') if len(significant) > 15 else decimal


def saved_date(value):
    if not value:
        return None
    try:
        return date.fromisoformat(value[:10])
    except (ValueError, TypeError):
        return str(value)


def cell(ws, row, col, value, numformat=None, *, fill=None, bold=False, color=INK, size=10):
    c = ws.cell(row, col)
    if isinstance(value, str):
        c.value = XML_CONTROLS.sub('', value)
        c.data_type = 's'  # All source strings remain literal, including formula-like text.
    else:
        c.value = value
    if numformat:
        c.number_format = numformat
    if fill:
        c.fill = PatternFill('solid', fgColor=fill)
    c.font = Font(name='Calibri', size=size, color=color, bold=bold)
    c.alignment = Alignment(vertical='top', wrap_text=True)
    return c


def setup(ws, title, widths, identity):
    ws.sheet_view.showGridLines = False
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.page_setup.orientation = 'landscape'
    ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    for col, width in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(col)].width = width
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=len(widths))
    cell(ws, 1, 1, title, fill=GREEN, color=WHITE, bold=True, size=16)
    ws.row_dimensions[1].height = 28
    ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=len(widths))
    cell(ws, 2, 1, identity, fill=MINT, bold=True)
    ws.row_dimensions[2].height = 22


def table_row(ws, row, values, formats=(), *, header=False, summary=False):
    fill = GREEN if header else MINT if summary else STRIPE if row % 2 == 0 else None
    for col, value in enumerate(values, 1):
        fmt = formats[col - 1] if len(formats) >= col else None
        cell(ws, row, col, value, fmt, fill=fill, bold=header or summary, color=WHITE if header else INK)
    ws.row_dimensions[row].height = 28 if header else 20


def blocks(value, width):
    """Keep wrapped text legible without truncating long source text at Excel's cell limit."""
    chunk, used = '', 0
    for line in str(value or 'Not recorded').splitlines(keepends=True):
        for start in range(0, len(line), width * 18):
            piece = line[start:start + width * 18]
            size = max(1, ceil(len(piece) / width))
            if used + size > 18:
                yield chunk, used
                chunk, used = '', 0
            chunk += piece
            used += size
    if chunk:
        yield chunk, used


def labelled_text(ws, row, label, value, last_col, width):
    for text, used in blocks(value, width):
        cell(ws, row, 1, label, bold=True)
        ws.merge_cells(start_row=row, start_column=2, end_row=row, end_column=last_col)
        cell(ws, row, 2, text)
        ws.row_dimensions[row].height = max(20, used * 14 + 5)
        row += 1
    return row


def detail_filter(ws, header, last, ncols):
    ws.freeze_panes = f'D{header + 1}'
    ws.print_title_rows = f'{header}:{header}'
    if last > header:
        ws.auto_filter.ref = f'A{header}:{get_column_letter(ncols)}{last}'


def mark_precision_limit(ws):
    if any(isinstance(c.value, str) and c.number_format in (MONEY, REFERENCE_PRICE) for row in ws.iter_rows() for c in row):
        ws.merge_cells(start_row=3, start_column=1, end_row=3, end_column=ws.max_column)
        cell(ws, 3, 1, 'Amounts beyond Excel’s 15-digit numeric precision are shown as exact text.', fill=MINT, bold=True)
        ws.row_dimensions[3].height = 22


def commercial_sheet(ws, data, identity):
    currencies = data['currencies']
    native = data['currency']
    ncols = 5 + 2 * len(currencies)
    setup(ws, 'Purchase order', [22, 23, 25, 42, 15] + [23, 25] * len(currencies), identity)
    for row, values in enumerate([
        ['PO number', data['number'], 'Software reference', data.get('reference') or None],
        ['Document status', data['status'], 'Revision', data.get('revision')],
        ['Document date', saved_date(data.get('date')), 'Prepared / approved by', data.get('actor')],
        ['Supplier code', data.get('vendorCode'), 'Required port arrival', saved_date(data.get('arrival'))],
        ['Payable currency', native, 'Trade term', data.get('incoterm')],
    ], 4):
        table_row(ws, row, values, tuple('dd mmm yyyy' if isinstance(value, date) else None for value in values))
        ws.row_dimensions[row].height = max(20, 15 * max(ceil(len(str(value or '')) / 22) for value in values))
    row = labelled_text(ws, 9, 'Supplier', data.get('vendorName'), ncols, 95)
    row = labelled_text(ws, row, 'Payment terms', data.get('terms'), ncols, 95)
    if data.get('fx'):
        row = labelled_text(ws, row, 'PO exchange rate', data['fx'], ncols, 95)
    if data.get('mismatch'):
        row = labelled_text(ws, row, 'Value discrepancy', 'The saved PO total differs from its item values. The reference total is unavailable.', ncols, 95)
    row += 1
    labels = ['#', 'Item category', 'ERP item', 'Description', 'Quantity']
    header_formats = [QUANTITY, None, None, None, QUANTITY]
    total_values = ['PO TOTAL', None, None, None, data['quantity']]
    for currency, total in zip(currencies, data['totals']):
        role = '' if currency == native else ' reference'
        labels.extend([f'{currency}{role} unit price', f'{currency}{role} amount'])
        header_formats.extend([MONEY if currency == native else REFERENCE_PRICE, MONEY])
        total_values.extend([None, amount(total)])
    table_row(ws, row, total_values, header_formats, summary=True)
    header = row + 1
    table_row(ws, header, labels, header=True)
    for index, line in enumerate(data['lines'], 1):
        item = line.get('name') or ''
        prices = [amount(value) for currency in line['prices'] for value in currency]
        row = header + index
        table_row(ws, row, [index, line.get('category'), line.get('code'), item, line['quantity'], *prices], header_formats)
        ws.row_dimensions[row].height = min(150, max(22, 14 * sum(max(1, ceil(len(s) / 39)) for s in item.split('\n')) + 6))
    last = header + len(data['lines'])
    detail_filter(ws, header, last, ncols)
    row = labelled_text(ws, last + 2, 'Commercial remarks', data.get('remarks'), ncols, 95)
    labelled_text(ws, row, 'Document manifest', '\n'.join(data['manifest']), ncols, 95)


def technical_sheet(ws, data, identity):
    setup(ws, 'Technical specifications', [24, 23, 32, 24, 86, 53], identity)
    table_row(ws, 4, ['Item category', 'ERP item', 'Description', 'Base model', 'Technical requirements', 'Brand packaging / decal requirements'], header=True)
    row = 5
    for line in data['lines']:
        specification = list(blocks(line.get('specification'), 77))
        packaging = list(blocks(line.get('packaging'), 47))
        for index in range(max(len(specification), len(packaging))):
            spec, spec_height = specification[index] if index < len(specification) else (None, 0)
            pack, pack_height = packaging[index] if index < len(packaging) else (None, 0)
            table_row(ws, row, [line.get('category'), line.get('code'), line.get('name'), line.get('base'), spec, pack])
            ws.row_dimensions[row].height = max(26, max(spec_height, pack_height) * 14 + 6)
            row += 1
    detail_filter(ws, 4, row - 1, 6)


def allocation_sheet(ws, data, identity):
    native = data['currency']
    allocation = data['allocation']
    centres = allocation['centres']
    widths = [24, 25, 23, 23] + [20, 24] * max(1, len(centres))
    setup(ws, 'Cost centre allocations', widths, identity)
    table_row(ws, 4, ['PO quantity', data['quantity'], f'PO value ({native})', amount(allocation['total'])], (None, QUANTITY, None, MONEY), summary=True)
    table_row(ws, 5, ['Allocated quantity', allocation['allocatedQuantity'], f'Allocated value ({native})', amount(allocation['allocatedValue'])], (None, QUANTITY, None, MONEY), summary=True)
    if not centres:
        table_row(ws, 7, ['Recorded cost centre', allocation.get('legacyCentre') or 'Not recorded'])
    messages = allocation['errors'] + (['The saved PO total differs from the sum of its item values.'] if allocation['valueMismatch'] else [])
    row = labelled_text(ws, 8, 'Reconciliation', '\n'.join(messages) or 'Fully allocated. Quantity and purchase value reconcile to the PO.', len(widths), 95)
    if centres:
        table_row(ws, row + 1, ['Centre code', 'Cost centre', 'Allocated quantity', f'Allocated value ({native})'], header=True)
        for code, name, quantity, value in centres:
            row += 1
            table_row(ws, row + 1, [code, name, quantity, amount(value)], (None, None, QUANTITY, MONEY))
        row += 3
    labels = ['ERP item', 'PO quantity', f'Unit price ({native})', 'Unallocated quantity']
    formats = [None, QUANTITY, MONEY, QUANTITY]
    for code, _, _, _ in centres:
        labels.extend([f'{code} quantity', f'{code} value ({native})'])
        formats.extend([QUANTITY, MONEY])
    table_row(ws, row, labels, header=True)
    for index, line in enumerate(data['lines'], 1):
        values = [value for quantity, money in line['allocations'] for value in (quantity, amount(money))]
        table_row(ws, row + index, [line.get('code'), line['quantity'], amount(line['nativeUnit']), line['remaining'], *values], formats)
    detail_filter(ws, row, row + len(data['lines']), len(labels))


def main():
    limit = 4 * 1024 * 1024
    source = sys.stdin.buffer.read(limit + 1)
    if len(source) > limit:
        raise ValueError('Purchase order data is too large.')
    data = json.loads(source)
    workbook = Workbook()
    workbook.properties.title = 'Purchase order'
    workbook.properties.creator = 'Farming Hub'
    commercial = workbook.active
    commercial.title = 'Purchase order'
    identity = f"{data['company']} / {data['number']} / {data['status']}"
    if data.get('demo'):
        identity += ' / DEMONSTRATION ONLY'
    commercial_sheet(commercial, data, identity)
    technical_sheet(workbook.create_sheet('Technical specifications'), data, identity)
    allocation_sheet(workbook.create_sheet('Cost centre allocations'), data, identity)
    for sheet in workbook:
        mark_precision_limit(sheet)
    buffer = io.BytesIO()
    workbook.save(buffer)
    sys.stdout.buffer.write(buffer.getbuffer())


if __name__ == '__main__':
    main()
