import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  CloudUpload, RefreshCw, Trash2, WifiOff, CheckCircle2, AlertTriangle, Clock, ImageIcon, Plus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getOutbox, removeOutbox } from '../offline/db.js';
import { syncOutbox } from '../offline/sync.js';
import { useSyncState } from '../hooks/useSyncState.js';
import Spinner from '../components/ui/Spinner.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
 
function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(ts).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
 
export default function PendingSync() {
  const { online, pending, syncing } = useSyncState();
  const [items, setItems] = useState(null);
  const [toDelete, setToDelete] = useState(null);
 
  const load = useCallback(async () => setItems(await getOutbox()), []);
  useEffect(() => { load(); }, [load, pending, syncing]);
 
  const syncNow = async () => {
    if (!online) return toast.error('Still offline — connect to the internet to sync');
    const { synced, failed } = await syncOutbox();
    if (synced) toast.success(`Synced ${synced} vendor${synced === 1 ? '' : 's'}`);
    if (failed && !synced) toast.error(`${failed} could not sync yet`);
    load();
  };
 
  if (items === null) return <div className="py-16 text-center"><Spinner size={26} /></div>;
 
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-ink-900">Pending sync</h2>
          <p className="mt-0.5 text-sm text-ink-500">
            Vendors captured on this device, waiting to reach the server.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`chip ${online ? 'bg-brand-100 text-brand-700' : 'bg-amber-100 text-amber-700'}`}>
            {online ? 'Online' : <><WifiOff size={12} /> Offline</>}
          </span>
          <button onClick={syncNow} className="btn-primary btn-sm" disabled={!online || syncing || items.length === 0}>
            {syncing ? <RefreshCw size={14} className="animate-spin" /> : <CloudUpload size={14} />} Sync now
          </button>
        </div>
      </div>
 
      {items.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="All caught up"
          message="Nothing waiting to sync. New vendors you add offline will appear here until they reach the server."
          action={<Link to="/vendors/new" className="btn-primary btn-sm"><Plus size={14} /> Add Vendor</Link>}
        />
      ) : (
        <div className="card divide-y divide-ink-100">
          {items.map((it) => {
            const p = it.preview || {};
            const isError = it.status === 'error';
            return (
              <div key={it.id} className="flex items-start gap-3 p-4">
                <div className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                  it.status === 'syncing' ? 'bg-blue-50 text-blue-600' : isError ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                }`}>
                  {it.status === 'syncing' ? <RefreshCw size={16} className="animate-spin" /> : isError ? <AlertTriangle size={16} /> : <Clock size={16} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink-900">{p.name || '(unnamed vendor)'}</p>
                  <p className="truncate text-sm text-ink-500">
                    {[p.companyName, p.city].filter(Boolean).join(' · ') || '—'}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-400">
                    <span>captured {timeAgo(it.createdAt)}</span>
                    {p.photoCount > 0 && <span className="flex items-center gap-1"><ImageIcon size={12} /> {p.photoCount} photo{p.photoCount === 1 ? '' : 's'}</span>}
                    {p.components?.length > 0 && <span>{p.components.slice(0, 3).join(', ')}</span>}
                  </div>
                  {isError && (
                    <p className="mt-1.5 text-xs text-red-600">
                      {it.serverRejected ? 'Server rejected: ' : 'Will retry: '}{it.error}
                    </p>
                  )}
                </div>
                <button onClick={() => setToDelete(it)} className="rounded-lg p-1.5 text-ink-300 hover:bg-red-50 hover:text-red-600" title="Discard">
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}
 
      {!online && items.length > 0 && (
        <p className="flex items-center justify-center gap-2 text-sm text-ink-400">
          <WifiOff size={14} /> These will sync automatically when you reconnect.
        </p>
      )}
 
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={async () => { await removeOutbox(toDelete.id); toast.success('Discarded'); setToDelete(null); load(); }}
        title="Discard this capture?"
        message={`"${toDelete?.preview?.name || 'This vendor'}" will be permanently removed from the device and never synced.`}
        confirmLabel="Discard"
      />
    </div>
  );
}
