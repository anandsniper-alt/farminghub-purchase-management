// Client-side Excel + PDF export helpers.
// columns: [{ header, key, map?(row) }]; rows: array of objects.
// The heavy libraries (xlsx / jspdf) are dynamically imported so they only load on demand.
 
function toMatrix(columns, rows) {
  const header = columns.map((c) => c.header);
  const body = rows.map((r) => columns.map((c) => {
    const v = c.map ? c.map(r) : r[c.key];
    return v == null ? '' : String(v);
  }));
  return { header, body };
}
 
/** Download the rows as an .xlsx file. */
export async function exportToExcel(columns, rows, filename = 'export', sheetName = 'Sheet1') {
  const XLSX = await import('xlsx');
  const { header, body } = toMatrix(columns, rows);
  const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
  ws['!cols'] = header.map((h, i) => ({
    wch: Math.max(h.length + 2, ...body.map((r) => (r[i] ? r[i].length : 0)).concat(8)),
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
 
/**
 * Export using a configured column list (from useColumnConfig): respects visible
 * columns, their order, custom display names, and skips non-exportable columns.
 */
export async function exportColumns(columns, rows, { kind = 'excel', filename = 'export', title = '', sheetName = 'Sheet1' } = {}) {
  const cols = columns
    .filter((c) => c.visible !== false && c.exportable !== false)
    .map((c) => ({ header: c.label, map: (r) => (c.exportValue ? c.exportValue(r) : r[c.key]) }));
  if (kind === 'excel') return exportToExcel(cols, rows, filename, sheetName);
  return exportToPdf(cols, rows, filename, title);
}
 
/** Download the rows as a landscape PDF table. */
export async function exportToPdf(columns, rows, filename = 'export', title = '') {
  const [{ jsPDF }, autoTableMod] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const autoTable = autoTableMod.default;
  const { header, body } = toMatrix(columns, rows);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  if (title) {
    doc.setFontSize(14);
    doc.text(title, 40, 36);
  }
  autoTable(doc, {
    head: [header],
    body,
    startY: title ? 50 : 40,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [22, 163, 74] }, // brand green
    alternateRowStyles: { fillColor: [246, 248, 246] },
    margin: { left: 40, right: 40 },
  });
  doc.save(`${filename}.pdf`);
}
