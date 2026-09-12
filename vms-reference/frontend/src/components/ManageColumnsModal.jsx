import { useState } from 'react';
import { ChevronUp, ChevronDown, Snowflake, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from './ui/Modal.jsx';
import Spinner from './ui/Spinner.jsx';
import { apiError } from '../lib/api.js';
import { toSavedConfig } from '../hooks/useColumnConfig.js';
 
/**
 * Manage Columns — show/hide, reorder (move up/down), rename, width, freeze.
 * Personal layout for everyone; admins can also save the global default.
 */
export default function ManageColumnsModal({ open, onClose, columns, cfg }) {
  const [rows, setRows] = useState(() => columns.map((c) => ({ ...c })));
 
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    setRows(next);
  };
  const patch = (i, p) => setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...p } : row)));
 
  const save = async (scope) => {
    const config = toSavedConfig(rows);
    try {
      if (scope === 'global') { await cfg.saveGlobal.mutateAsync(config); toast.success('Saved as default for everyone'); }
      else { await cfg.savePersonal.mutateAsync(config); toast.success('Column layout saved'); }
      onClose();
    } catch (e) { toast.error(apiError(e, 'Could not save layout')); }
  };
 
  const doReset = async () => {
    try { await cfg.reset.mutateAsync(); toast.success('Reset to default layout'); onClose(); }
    catch (e) { toast.error(apiError(e)); }
  };
 
  const saving = cfg.savePersonal.isPending || cfg.saveGlobal.isPending || cfg.reset.isPending;
 
  return (
    <Modal open={open} onClose={onClose} title="Manage columns" size="lg"
      footer={
        <div className="flex w-full flex-wrap items-center gap-2">
          <button onClick={doReset} className="btn-ghost btn-sm text-ink-500" disabled={saving}>
            <RotateCcw size={14} /> Reset to default
          </button>
          <div className="ml-auto flex gap-2">
            <button onClick={onClose} className="btn-secondary" disabled={saving}>Cancel</button>
            {cfg.isAdmin && (
              <button onClick={() => save('global')} className="btn-secondary" disabled={saving}>
                {saving && <Spinner size={16} />} Save as default (all users)
              </button>
            )}
            <button onClick={() => save('personal')} className="btn-primary" disabled={saving}>
              {saving && <Spinner size={16} className="text-white" />} Save my layout
            </button>
          </div>
        </div>
      }>
      <p className="mb-3 text-sm text-ink-500">
        Show/hide, rename, resize, freeze and reorder columns. Your layout is personal;{' '}
        {cfg.isAdmin ? 'as an admin you can also set the default for all users.' : 'admins set the shared default.'}
      </p>
      <div className="overflow-hidden rounded-lg border border-ink-200">
        <table className="w-full text-sm">
          <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-400">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Show</th>
              <th className="px-3 py-2 text-left font-semibold">Column</th>
              <th className="px-3 py-2 text-left font-semibold">Display name</th>
              <th className="px-3 py-2 text-left font-semibold">Width</th>
              <th className="px-3 py-2 text-center font-semibold">Freeze</th>
              <th className="px-3 py-2 text-right font-semibold">Order</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {rows.map((c, i) => (
              <tr key={c.key} className="hover:bg-ink-50/50">
                <td className="px-3 py-2">
                  <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={!!c.visible}
                    onChange={(e) => patch(i, { visible: e.target.checked })} />
                </td>
                <td className="px-3 py-2 text-ink-500">{c.dynamic ? <span title="Auto-detected field">{c.key} ✦</span> : c.key}</td>
                <td className="px-3 py-2">
                  <input className="input py-1" value={c.label} onChange={(e) => patch(i, { label: e.target.value })} />
                </td>
                <td className="px-3 py-2">
                  <input type="number" min="40" max="1000" step="10" className="input w-20 py-1" value={c.width || ''}
                    onChange={(e) => patch(i, { width: e.target.value ? Number(e.target.value) : null })} />
                </td>
                <td className="px-3 py-2 text-center">
                  <button onClick={() => patch(i, { frozen: !c.frozen })}
                    className={`rounded p-1.5 ${c.frozen ? 'bg-blue-50 text-blue-600' : 'text-ink-300 hover:bg-ink-100 hover:text-ink-600'}`}
                    title={c.frozen ? 'Frozen' : 'Freeze column'}>
                    <Snowflake size={14} />
                  </button>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-0.5">
                    <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1 text-ink-400 hover:bg-ink-100 disabled:opacity-30"><ChevronUp size={15} /></button>
                    <button onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="rounded p-1 text-ink-400 hover:bg-ink-100 disabled:opacity-30"><ChevronDown size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
