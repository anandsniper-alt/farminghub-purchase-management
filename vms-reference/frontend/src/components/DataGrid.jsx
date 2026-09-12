import { ChevronDown } from 'lucide-react';
 
/**
 * Config-driven table. Columns come from useColumnConfig (visible, ordered).
 * Supports sticky header, per-column width, frozen (sticky-left) columns,
 * sortable headers and row click.
 */
export default function DataGrid({ columns, rows, ctx = {}, sort, onSort, onRowClick, rowKey = (r) => r.id, empty }) {
  // Cumulative left offset for frozen columns.
  let frozenLeft = 0;
  const frozenOffsets = columns.map((c) => {
    if (c.frozen) { const l = frozenLeft; frozenLeft += c.width || 150; return l; }
    return null;
  });
 
  const headerCell = (c, i) => {
    const sortable = !!c.sortKey && !!onSort;
    const active = sort && c.sortKey === sort;
    const frozen = frozenOffsets[i] != null;
    return (
      <th
        key={c.key}
        onClick={sortable ? () => onSort(c.sortKey) : undefined}
        style={{ width: c.width, minWidth: c.width, ...(frozen ? { position: 'sticky', left: frozenOffsets[i], zIndex: 3 } : {}) }}
        className={`px-3 py-2.5 text-left align-middle ${sortable ? 'cursor-pointer select-none hover:text-ink-800' : ''} ${frozen ? 'bg-ink-50' : ''}`}
      >
        <span className="inline-flex items-center gap-1">
          {c.label}
          {active && <ChevronDown size={13} className="text-brand-600" />}
        </span>
      </th>
    );
  };
 
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max text-sm">
        <thead className="sticky top-0 z-10 bg-ink-50/95 text-xs font-semibold uppercase tracking-wide text-ink-500 backdrop-blur">
          <tr className="border-b border-ink-100">{columns.map(headerCell)}</tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-ink-400">{empty || 'No records.'}</td></tr>
          ) : rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`${onRowClick ? 'cursor-pointer' : ''} hover:bg-ink-50/60`}
            >
              {columns.map((c, i) => {
                const frozen = frozenOffsets[i] != null;
                return (
                  <td
                    key={c.key}
                    style={{ width: c.width, minWidth: c.width, ...(frozen ? { position: 'sticky', left: frozenOffsets[i], zIndex: 1 } : {}) }}
                    className={`px-3 py-2.5 align-middle ${frozen ? 'bg-white' : ''}`}
                  >
                    {c.render ? c.render(row, ctx) : (row[c.key] ?? '—')}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
