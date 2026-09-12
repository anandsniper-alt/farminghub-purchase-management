import { Star } from 'lucide-react';
import clsx from 'clsx';
 
/** Read-only star display. value 1..5 */
export function RatingStars({ value = 0, size = 15, showEmpty = true }) {
  if (!value && !showEmpty) return <span className="text-ink-400">—</span>;
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={clsx(n <= value ? 'fill-amber-400 text-amber-400' : 'fill-ink-100 text-ink-200')}
        />
      ))}
    </span>
  );
}
 
/** Stars + numeric value, e.g. ★★★★☆ (4.32). */
export function RatingWithValue({ value, size = 15, className = '' }) {
  if (value == null || value === 0) return <span className="text-ink-400">—</span>;
  return (
    <span className={clsx('inline-flex items-center gap-1.5', className)}>
      <RatingStars value={value} size={size} />
      <span className="text-sm font-medium text-ink-700">({Number(value).toFixed(2)})</span>
    </span>
  );
}
 
/** Interactive rating input for forms. */
export function RatingInput({ value = 0, onChange, size = 22 }) {
  return (
    <div className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n === value ? 0 : n)}
          className="rounded p-0.5 transition-transform hover:scale-110 focus:outline-none"
          aria-label={`${n} star`}
        >
          <Star
            size={size}
            className={clsx(n <= value ? 'fill-amber-400 text-amber-400' : 'fill-ink-100 text-ink-300')}
          />
        </button>
      ))}
      {value > 0 && (
        <button type="button" onClick={() => onChange(0)} className="ml-1 text-xs text-ink-400 hover:text-ink-600">
          clear
        </button>
      )}
    </div>
  );
}
