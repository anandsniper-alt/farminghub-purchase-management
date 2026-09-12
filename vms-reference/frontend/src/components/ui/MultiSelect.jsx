import { useState, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import clsx from 'clsx';
 
/**
 * Generic multi-select from a fixed option list.
 * @param options {id, name}[]
 * @param value string[] selected ids
 * @param onChange (ids) => void
 */
export default function MultiSelect({ options = [], value = [], onChange, placeholder = 'Select…' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);
 
  useEffect(() => {
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);
 
  const selected = options.filter((o) => value.includes(o.id));
  const filtered = options.filter((o) => o.name.toLowerCase().includes(query.toLowerCase()));
 
  const toggle = (id) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
 
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input flex min-h-[42px] flex-wrap items-center gap-1.5 text-left"
      >
        {selected.length === 0 && <span className="text-ink-400">{placeholder}</span>}
        {selected.map((o) => (
          <span key={o.id} className="chip bg-brand-100 text-brand-700">
            {o.name}
            <X
              size={13}
              className="cursor-pointer hover:text-brand-900"
              onClick={(e) => {
                e.stopPropagation();
                toggle(o.id);
              }}
            />
          </span>
        ))}
        <ChevronsUpDown size={16} className="ml-auto shrink-0 text-ink-400" />
      </button>
 
      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-ink-200 bg-white shadow-soft">
          <div className="border-b border-ink-100 p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="input py-1.5 text-sm"
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            {filtered.length === 0 && <p className="px-3 py-2 text-sm text-ink-400">No matches</p>}
            {filtered.map((o) => {
              const isSel = value.includes(o.id);
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => toggle(o.id)}
                  className={clsx(
                    'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-ink-50',
                    isSel && 'text-brand-700'
                  )}
                >
                  {o.name}
                  {isSel && <Check size={16} className="text-brand-600" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
