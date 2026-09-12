import { ChevronLeft, ChevronRight } from 'lucide-react';
 
export default function Pagination({ page, totalPages, total, pageSize, onPage }) {
  if (!totalPages || totalPages <= 1) {
    return (
      <div className="px-1 py-2 text-xs text-ink-400">
        {total || 0} record{total === 1 ? '' : 's'}
      </div>
    );
  }
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex items-center justify-between px-1 py-2">
      <span className="text-xs text-ink-500">
        Showing <b>{from}</b>–<b>{to}</b> of <b>{total}</b>
      </span>
      <div className="flex items-center gap-1">
        <button
          className="btn-secondary btn-sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft size={14} /> Prev
        </button>
        <span className="px-2 text-sm text-ink-600">
          {page} / {totalPages}
        </span>
        <button
          className="btn-secondary btn-sm"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
