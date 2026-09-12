import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
 
const TITLES = [
  [/^\/$/, 'Dashboard'],
  [/^\/vendors\/import/, 'Import Vendors'],
  [/^\/vendors\/new/, 'Add Vendor'],
  [/^\/vendors\/[^/]+\/edit/, 'Edit Vendor'],
  [/^\/vendors\/[^/]+/, 'Vendor Details'],
  [/^\/vendors/, 'Vendors'],
  [/^\/expos/, 'Expos & Fairs'],
  [/^\/categories/, 'Product Lines'],
  [/^\/components/, 'Component Tags'],
  [/^\/concentration/, 'Sourcing Concentration'],
  [/^\/analytics/, 'Analytics'],
  [/^\/pending/, 'Pending Sync'],
  [/^\/get-app/, 'Get the App'],
  [/^\/users/, 'Users & Roles'],
  [/^\/settings/, 'Settings'],
];
 
function titleFor(pathname) {
  for (const [re, title] of TITLES) if (re.test(pathname)) return title;
  return 'Farming Hub';
}
 
export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
 
  return (
    <div className="flex min-h-screen bg-ink-50">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setMobileOpen(true)} title={titleFor(pathname)} />
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
