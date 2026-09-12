import { Link } from 'react-router-dom';
import {
  Users, CalendarDays, Tags, Boxes, Star, ArrowRight, MapPin, ShieldAlert, Plus,
} from 'lucide-react';
import { useDashboard, useCategoryConcentration } from '../hooks/useReports.js';
import { PageLoader } from '../components/ui/Spinner.jsx';
import { SampleBadge } from '../components/ui/Badge.jsx';
import { RatingStars } from '../components/ui/Rating.jsx';
import { expoLabel } from '../lib/format.js';
import EmptyState from '../components/ui/EmptyState.jsx';
 
function StatCard({ icon: Icon, label, value, to, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  const body = (
    <div className="card flex items-center gap-4 p-5 transition-shadow hover:shadow-soft">
      <div className={`grid h-12 w-12 place-items-center rounded-xl ${tones[tone]}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-2xl font-bold text-ink-900">{value}</p>
        <p className="text-sm text-ink-500">{label}</p>
      </div>
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}
 
function BarRow({ label, count, max }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 truncate text-sm text-ink-600" title={label}>{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
        <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right text-sm font-medium text-ink-700">{count}</span>
    </div>
  );
}
 
export default function Dashboard() {
  const { data, isLoading } = useDashboard();
  const { data: conc } = useCategoryConcentration();
 
  if (isLoading) return <PageLoader />;
  if (!data) return null;
 
  const { totals, topCities, byExpo, recentVendors } = data;
  const maxCity = Math.max(1, ...topCities.map((c) => c.count));
  const maxExpo = Math.max(1, ...byExpo.map((e) => e.count));
  // Product categories with only one / no active supplier (critical sourcing risk).
  const singleSource = conc?.summary?.critical ?? 0;
 
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-ink-900">Sourcing overview</h2>
          <p className="mt-0.5 text-sm text-ink-500">Your supplier network at a glance.</p>
        </div>
        <Link to="/vendors/new" className="btn-primary">
          <Plus size={16} /> Add Vendor
        </Link>
      </div>
 
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Users} label="Vendors" value={totals.vendors} to="/vendors" tone="brand" />
        <StatCard icon={CalendarDays} label="Expos & Fairs" value={totals.expos} to="/expos" tone="blue" />
        <StatCard icon={Tags} label="Component Tags" value={totals.components} to="/components" tone="purple" />
        <StatCard icon={Boxes} label="Product Lines" value={totals.categories} to="/categories" tone="amber" />
      </div>
 
      {/* Alerts + rating */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link to="/concentration" className="card flex items-center gap-4 p-5 hover:shadow-soft md:col-span-2">
          <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${singleSource > 0 ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-600'}`}>
            <ShieldAlert size={22} />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-ink-900">
              {singleSource > 0
                ? `${singleSource} product categor${singleSource === 1 ? 'y is' : 'ies are'} at critical sourcing risk`
                : 'No critical sourcing risks 🎉'}
            </p>
            <p className="text-sm text-ink-500">
              Sourcing-concentration rule: keep at least 2 active suppliers per product category (single supplier = critical).
            </p>
          </div>
          <ArrowRight size={18} className="text-ink-400" />
        </Link>
 
        <div className="card flex items-center gap-4 p-5">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-amber-50 text-amber-500">
            <Star size={22} />
          </div>
          <div>
            <p className="text-2xl font-bold text-ink-900">{totals.avgOverallRating ?? '—'}</p>
            <p className="text-sm text-ink-500">Avg. overall rating</p>
          </div>
        </div>
      </div>
 
      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-ink-900">
            <MapPin size={16} className="text-brand-600" /> Supplier density by city
          </h3>
          {topCities.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-400">No city data yet.</p>
          ) : (
            <div className="space-y-3">
              {topCities.map((c) => (
                <BarRow key={c.city} label={c.city} count={c.count} max={maxCity} />
              ))}
            </div>
          )}
        </div>
 
        <div className="card p-5">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-ink-900">
            <CalendarDays size={16} className="text-brand-600" /> Contacts by expo
          </h3>
          {byExpo.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-400">No expo data yet.</p>
          ) : (
            <div className="space-y-3">
              {byExpo.slice(0, 8).map((e) => (
                <BarRow key={e.expo} label={e.expo} count={e.count} max={maxExpo} />
              ))}
            </div>
          )}
        </div>
      </div>
 
      {/* Recent vendors */}
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-ink-900">Recently added vendors</h3>
          <Link to="/vendors" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            View all →
          </Link>
        </div>
        {recentVendors.length === 0 ? (
          <EmptyState
            title="No vendors yet"
            message="Start building your supplier database by adding your first vendor."
            action={<Link to="/vendors/new" className="btn-primary btn-sm"><Plus size={14} /> Add Vendor</Link>}
          />
        ) : (
          <div className="divide-y divide-ink-100">
            {recentVendors.map((v) => (
              <Link key={v.id} to={`/vendors/${v.id}`} className="flex items-center gap-4 py-3 hover:bg-ink-50/60">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink-900">{v.name}</p>
                  <p className="truncate text-sm text-ink-500">
                    {v.companyName || '—'} {v.city ? `· ${v.city}` : ''}
                  </p>
                </div>
                <div className="hidden flex-wrap gap-1 sm:flex">
                  {v.components?.slice(0, 3).map((c) => (
                    <span key={c.id} className="chip bg-brand-50 text-brand-700">{c.name}</span>
                  ))}
                </div>
                <div className="hidden w-32 text-sm text-ink-500 md:block">{expoLabel(v.expo) || '—'}</div>
                <SampleBadge status={v.sampleStatus} />
                <RatingStars value={v.overallRating || 0} showEmpty={false} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
