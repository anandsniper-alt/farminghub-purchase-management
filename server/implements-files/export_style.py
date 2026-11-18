"""Shared presentation for Implements downloads; values and formulas stay unchanged."""
from math import ceil
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.cell.cell import MergedCell
from openpyxl.utils import get_column_letter, coordinate_to_tuple
from openpyxl.drawing.spreadsheet_drawing import AnchorMarker, OneCellAnchor
from openpyxl.drawing.xdr import XDRPositiveSize2D
from openpyxl.utils.units import pixels_to_EMU
from openpyxl.worksheet.page import PageMargins

GREEN = '204321'
LINE = 'A8BAA4'

def format_sheet(ws, headers=(1,)):
    """Box every populated row, centre cells, and allow wrapped content to grow."""
    side = Side(style='thin', color=LINE)
    border = Border(left=side, right=side, top=side, bottom=side)
    merged = {(r.min_row, r.min_col): r for r in ws.merged_cells.ranges}
    for row in ws:
        if not any(c.value is not None for c in row):
            continue
        height = max(ws.row_dimensions[row[0].row].height or 0, 26)
        for cell in row:
            cell.border = border
            if isinstance(cell, MergedCell):
                continue
            cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
            is_header = cell.row in headers
            cell.font = Font(name='Calibri', size=11, bold=is_header,
                             color='FFFFFF' if is_header else GREEN)
            if is_header:
                cell.fill = PatternFill('solid', fgColor=GREEN)
            span = merged.get((cell.row, cell.column))
            cols = range(cell.column, span.max_col + 1) if span else [cell.column]
            width = sum(ws.column_dimensions[get_column_letter(c)].width or 13 for c in cols)
            text = '' if cell.value is None else str(cell.value)
            lines = sum(max(1, ceil(len(line) / max(1, width - 3))) for line in text.split('\n'))
            height = max(height, lines * (15 if is_header else 14) + 12)
        ws.row_dimensions[row[0].row].height = min(409, height)
    # Centre existing embedded photos within their final cell, preserving aspect ratio.
    for image in ws._images:
        if not isinstance(image.anchor, str):
            continue
        row, col = coordinate_to_tuple(image.anchor)
        width = (ws.column_dimensions[get_column_letter(col)].width or 13) * 7 + 5
        height = (ws.row_dimensions[row].height or 26) * 4 / 3
        scale = min((width - 12) / image.width, (height - 12) / image.height, 1)
        image.width *= scale
        image.height *= scale
        marker = AnchorMarker(col=col - 1, row=row - 1,
                              colOff=pixels_to_EMU(max(0, (width - image.width) / 2)),
                              rowOff=pixels_to_EMU(max(0, (height - image.height) / 2)))
        image.anchor = OneCellAnchor(_from=marker, ext=XDRPositiveSize2D(
            pixels_to_EMU(image.width), pixels_to_EMU(image.height)))
    ws.sheet_view.showGridLines = False
    ws.print_options.horizontalCentered = True
    ws.print_area = ws.dimensions
    ws.page_margins = PageMargins(left=.3, right=.3, top=.45, bottom=.45, header=.2, footer=.2)
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.page_setup.orientation = 'landscape'
    ws.page_setup.paperSize = ws.PAPERSIZE_A3 if ws.max_column > 8 else ws.PAPERSIZE_A4
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.oddFooter.center.text = 'Page &P of &N'
    ws.oddFooter.center.size = 9
    ws.oddFooter.center.color = '52664F'

def format_workbook(wb, headers=None):
    for ws in wb:
        format_sheet(ws, (headers or {}).get(ws.title, (1,)))
