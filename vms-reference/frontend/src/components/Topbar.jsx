import { useState, useRef, useEffect } from 'react';
import { Menu, LogOut, ChevronDown, KeyRound, Wifi, WifiOff, RefreshCw, CloudUpload, Download, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { initials } from '../lib/format.js';
import { useSyncState } from '../hooks/useSyncState.js';
import { syncOutbox } from '../offline/sync.js';
import ChangePasswordModal from './ChangePasswordModal.jsx';
 
function SyncIndicator() {
  const { online, pending, syncing, lastSyncAt, lastResult } = useSyncState();
  // Briefly surface a "Synced" / "Sync failed" chip right after a sync run.
  const [flash, setFlash] = useState(null);
  useEffect(() => {
    if (!lastSyncAt || !lastResult) return;
    if (lastResult.synced > 0 || lastResult.failed > 0) {
      setFlash(lastResult.failed > 0 ? 'failed' : 'done');
      const t = setTimeout(() => setFlash(null), 4000);
      return () => clearTimeout(t);
    }
  }, [lastSyncAt, lastResult]);
 
  if (!online) {
    return (
      <Link to="/pending" className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700" title="Offline — changes are saved on device">
        <WifiOff size={15} /> Offline{pending > 0 ? ` · ${pending}` : ''}
      </Link>
    );
  }
  if (syncing) {
    return (
      <span className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700" title="Syncing">
        <RefreshCw size={15} className="animate-spin" /> Syncing…
      </span>
    );
  }
  if (pending > 0) {
    return (
      <Link to="/pending" onClick={() => syncOutbox()} className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700" title="Pending sync">
        {flash === 'failed' ? <AlertTriangle size={15} /> : <CloudUpload size={15} />}
        {flash === 'failed' ? `Sync failed · ${pending}` : `${pending} to sync`}
      </Link>
    );
  }
  if (flash === 'done') {
    return (
      <span className="flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700" title="Sync completed">
        <CheckCircle2 size={15} /> Synced
      </span>
    );
  }
  return (
    <span className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand-600 sm:flex" title="Online">
      <Wifi size={15} /> Online
    </span>
  );
}
 
const ROLE_LABEL = { ADMIN: 'Admin', MANAGER: 'Manager', EMPLOYEE: 'Employee', PURCHASE: 'Purchase', VIEWER: 'Viewer' };
 
export default function Topbar({ onMenu, title }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const ref = useRef(null);
 
  useEffect(() => {
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setMenuOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);
 
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-ink-200 bg-white/80 px-4 backdrop-blur sm:px-6">
      <button onClick={onMenu} className="rounded-lg p-2 text-ink-600 hover:bg-ink-100 lg:hidden">
        <Menu size={20} />
      </button>
      <h1 className="text-lg font-semibold text-ink-900">{title}</h1>
 
      <div className="ml-auto"><SyncIndicator /></div>
 
      <div className="relative" ref={ref}>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center gap-2 rounded-lg py-1.5 pl-1.5 pr-2 hover:bg-ink-100"
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
            {initials(user?.name)}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-medium leading-tight text-ink-800">{user?.name}</span>
            <span className="block text-[11px] leading-tight text-ink-400">{ROLE_LABEL[user?.role]}</span>
          </span>
          <ChevronDown size={16} className="text-ink-400" />
        </button>
 
        {menuOpen && (
          <div className="absolute right-0 mt-2 w-52 rounded-lg border border-ink-200 bg-white py-1 shadow-soft">
            <div className="border-b border-ink-100 px-4 py-2">
              <p className="truncate text-sm font-medium text-ink-800">{user?.email}</p>
            </div>
            <Link
              to="/get-app"
              onClick={() => setMenuOpen(false)}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-brand-700 hover:bg-brand-50"
            >
              <Download size={15} /> Get the app
            </Link>
            <button
              onClick={() => { setPwOpen(true); setMenuOpen(false); }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-ink-700 hover:bg-ink-50"
            >
              <KeyRound size={15} /> Change password
            </button>
            <button
              onClick={logout}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut size={15} /> Sign out
            </button>
          </div>
        )}
      </div>
 
      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </header>
  );
}
