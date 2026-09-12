import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, CalendarDays, Boxes, Tags, ShieldAlert, BarChart3, Settings, CloudUpload, Smartphone, ShieldCheck, X, CalendarClock,
} from 'lucide-react';
import clsx from 'clsx';
import { useSyncState } from '../hooks/useSyncState.js';
import { useAuth } from '../context/AuthContext.jsx';
 
// perm: [module, action] — item hidden if the user lacks it
const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true, perm: ['reports', 'view'] },
  { to: '/follow-ups', label: 'Vendor Follow-up', icon: CalendarClock, perm: ['interactions', 'view'] },
  { to: '/vendors', label: 'Vendors', icon: Users, perm: ['vendors', 'view'] },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, perm: ['reports', 'view'] },
  { to: '/expos', label: 'Expos & Fairs', icon: CalendarDays, perm: ['expos', 'view'] },
  { to: '/categories', label: 'Product Lines', icon: Boxes, perm: ['products', 'view'] },
  { to: '/components', label: 'Component Tags', icon: Tags, perm: ['components', 'view'] },
  { to: '/concentration', label: 'Sourcing Risk', icon: ShieldAlert, perm: ['reports', 'view'] },
  { to: '/pending', label: 'Pending Sync', icon: CloudUpload, badge: true },
  { to: '/get-app', label: 'Get the App', icon: Smartphone },
  { to: '/users', label: 'Users & Roles', icon: ShieldCheck, perm: ['users', 'view'] },
  { to: '/settings', label: 'Settings', icon: Settings, perm: ['settings', 'view'] },
];
 
function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-5 py-5">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-white shadow-sm">
        <span className="text-lg font-extrabold">FH</span>
      </div>
      <div className="leading-tight">
        <p className="text-sm font-bold text-ink-900">Farming Hub</p>
        <p className="text-[11px] font-medium text-ink-400">Vendor Management</p>
      </div>
    </div>
  );
}
 
export default function Sidebar({ mobileOpen, onClose }) {
  const { pending } = useSyncState();
  const { has } = useAuth();
  const visible = NAV.filter((n) => !n.perm || has(n.perm[0], n.perm[1]));
  const links = (
    <nav className="flex-1 space-y-1 px-3 py-2">
      {visible.map(({ to, label, icon: Icon, end, badge }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onClose}
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-brand-50 text-brand-700'
                : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
            )
          }
        >
          <Icon size={18} />
          <span className="flex-1">{label}</span>
          {badge && pending > 0 && (
            <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-white">
              {pending}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
 
  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-ink-200 bg-white lg:flex">
        <Brand />
        {links}
        <div className="px-5 py-4 text-[11px] text-ink-400">v1.0 · Purchase CRM</div>
      </aside>
 
      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink-900/50" onClick={onClose} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-white shadow-soft">
            <div className="flex items-center justify-between">
              <Brand />
              <button onClick={onClose} className="mr-3 rounded-lg p-1.5 text-ink-500 hover:bg-ink-100">
                <X size={20} />
              </button>
            </div>
            {links}
          </aside>
        </div>
      )}
    </>
  );
}
