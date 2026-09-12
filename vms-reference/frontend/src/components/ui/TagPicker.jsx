import { useState, useRef, useEffect } from 'react';
import { Check, Plus, X, Tag } from 'lucide-react';
import clsx from 'clsx';
 
/**
 * Component/product tag picker — select existing tags OR create new ones on the fly
 * (WeChat-style supplier tagging).
 * @param options {id,name}[] existing component tags
 * @param valueIds string[]   selected existing ids
 * @param valueNames string[] new tag names to be created
 * @param onChange ({ ids, names }) => void
 */
export default function TagPicker({ options = [], valueIds = [], valueNames = [], onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);
 
  useEffect(() => {
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);
 
  const selectedExisting = options.filter((o) => valueIds.includes(o.id));
  const q = query.trim();
  const filtered = options.filter((o) => o.name.toLowerCase().includes(q.toLowerCase()));
 
  const existingNames = new Set(options.map((o) => o.name.toLowerCase()));
  const alreadyChosen =
    valueNames.some((n) => n.toLowerCase() === q.toLowerCase()) ||
    selectedExisting.some((o) => o.name.toLowerCase() === q.toLowerCase());
  const canCreate = q.length > 0 && !existingNames.has(q.toLowerCase()) && !alreadyChosen;
 
  const toggleId = (id) =>
    onChange({
      ids: valueIds.includes(id) ? valueIds.filter((v) => v !== id) : [...valueIds, id],
      names: valueNames,
    });
 
  const addName = (name) => {
    onChange({ ids: valueIds, names: [...valueNames, name] });
    setQuery('');
  };
  const removeName = (name) =>
    onChange({ ids: valueIds, names: valueNames.filter((n) => n !== name) });
 
  return (
    <div className="relative" ref={ref}>
      <div
        onClick={() => setOpen(true)}
        className="input flex min-h-[42px] cursor-text flex-wrap items-center gap-1.5"
      >
        {selectedExisting.length === 0 && valueNames.length === 0 && (
          <span className="text-ink-400">Tag components (Engine, Water Pump…)</span>
        )}
        {selectedExisting.map((o) => (
          <span key={o.id} className="chip bg-brand-100 text-brand-700">
            <Tag size={11} /> {o.name}
            <X size={13} className="cursor-pointer hover:text-brand-900" onClick={(e) => { e.stopPropagation(); toggleId(o.id); }} />
          </span>
        ))}
        {valueNames.map((n) => (
          <span key={n} className="chip bg-amber-100 text-amber-700">
            <Plus size={11} /> {n}
            <X size={13} className="cursor-pointer hover:text-amber-900" onClick={(e) => { e.stopPropagation(); removeName(n); }} />
          </span>
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canCreate) {
              e.preventDefault();
              addName(q);
            }
          }}
          placeholder=""
          className="min-w-[80px] flex-1 border-0 bg-transparent p-0 text-sm focus:outline-none focus:ring-0"
        />
      </div>
 
      {open && (
        <div className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-ink-200 bg-white p-1 shadow-soft">
          {canCreate && (
            <button
              type="button"
              onClick={() => addName(q)}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-amber-700 hover:bg-amber-50"
            >
              <Plus size={15} /> Create tag “{q}”
            </button>
          )}
          {filtered.map((o) => {
            const isSel = valueIds.includes(o.id);
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => toggleId(o.id)}
                className={clsx(
                  'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-ink-50',
                  isSel && 'text-brand-700'
                )}
              >
                <span className="flex items-center gap-2"><Tag size={13} className="text-ink-400" /> {o.name}</span>
                {isSel && <Check size={16} className="text-brand-600" />}
              </button>
            );
          })}
          {filtered.length === 0 && !canCreate && (
            <p className="px-3 py-2 text-sm text-ink-400">Type to create a new tag…</p>
          )}
        </div>
      )}
    </div>
  );
}
