import { useMemo, useState, Fragment } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert, ShieldCheck, ShieldX, Layers, ChevronDown, Info, Search,
  FileSpreadsheet, FileText, BarChart3,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCategoryConcentration } from '../hooks/useReports.js';
import { useCategories } from '../hooks/useTaxonomies.js';
import { RISK_META } from '../lib/concentration.js';
import { exportToExcel, exportToPdf } from '../lib/export.js';
import { apiError } from '../lib/api.js';
import { PageLoader } from '../components/ui/Spinner.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import MultiSelect from '../components/ui/MultiSelect.jsx';
 
const RISK_LEVELS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
 
function RiskPill({ level }) {
  const m = RISK_META[level];
  return <span className={`chip ${m.tone}`}>{m.label}</span>;
}
 
function SummaryCard({ icon: Icon, tone, label, value }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600',
    red: 'bg-red-50 text-red-600',
    orange: 'bg-orange-50 text-orange-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <div className="card flex items-center gap-3 p-4">
      <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tones[tone]}`}><Icon size={20} /></div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-ink-900">{value}</p>
        <p className="text-xs text-ink-500">{label}</p>
      </div>
    </div>
  );
}
 
/** Simple horizontal bar (no chart lib). */
function Bar({ label, value, max, tone = 'bg-brand-500', suffix }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-40 shrink-0 truncate text-sm text-ink-600" title={label}>{label}</span>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-ink-100">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(pct, value > 0 ? 4 : 0)}%` }} />
      </div>
      <span className="w-10 shrink-0 text-right text-sm font-medium text-ink-700">{value}{suffix || ''}</span>
    </div>
  );
}
 
const EXPORT_COLUMNS = [
  { header: 'Product Category', key: 'name' },
  { header: 'Product Line', map: (r) => r.group || '' },
  { header: 'Total Vendors', key: 'totalVendors' },
  { header: 'Active Vendors', key: 'activeVendors' },
  { header: 'Approved Vendors', key: 'approvedVendors' },
  { header: 'Preferred Vendors', key: 'preferredVendors' },
  { header: 'High Risk Vendors', key: 'highRiskVendors' },
  { header: 'Concentration %', map: (r) => `${r.concentrationPct}%` },
  { header: 'Dependency Score', key: 'dependencyScore' },
  { header: 'Risk Level', map: (r) => RISK_META[r.riskLevel].label },
];
 
export default function Concentration() {
  const { data, isLoading } = useCategoryConcentration();
  const { data: categories = [] } = useCategories();
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState('');
  const [catIds, setCatIds] = useState([]);
  const [risk, setRisk] = useState('');
 
  const rows = data?.rows || [];
  const summary = data?.summary || {};
 
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) =>
      (!q || r.name.toLowerCase().includes(q) || (r.group || '').toLowerCase().includes(q)) &&
      (catIds.length === 0 || catIds.includes(r.id)) &&
      (!risk || r.riskLevel === risk)
    );
  }, [rows, search, catIds, risk]);
 
  const topByVendors = useMemo(() => [...rows].sort((a, b) => b.totalVendors - a.totalVendors).slice(0, 8), [rows]);
  const maxVendors = topByVendors[0]?.totalVendors || 1;
  const riskCounts = { CRITICAL: summary.critical, HIGH: summary.high, MEDIUM: summary.medium, LOW: summary.healthy };
  const maxRisk = Math.max(1, ...Object.values(riskCounts).map((n) => n || 0));
 
  const doExport = async (kind) => {
    if (filtered.length === 0) return toast.error('Nothing to export');
    const stamp = new Date().toISOString().slice(0, 10);
    try {
      if (kind === 'excel') await exportToExcel(EXPORT_COLUMNS, filtered, `product-category-risk-${stamp}`, 'Category Risk');
      else await exportToPdf(EXPORT_COLUMNS, filtered, `product-category-risk-${stamp}`, 'Product Category Risk Report');
    } catch (e) { toast.error(apiError(e, 'Export failed')); }
  };
 
  if (isLoading) return <PageLoader />;
 
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-ink-900">Sourcing Risk — Product Category Concentration</h2>
          <p className="mt-0.5 max-w-2xl text-sm text-ink-500">
            Sourcing risk is measured per <b>Product Category (Product Line)</b>. Keep at least two active
            suppliers per category; a single supplier is a <b>Critical</b> dependency.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button onClick={() => doExport('excel')} className="btn-secondary btn-sm"><FileSpreadsheet size={15} /> Excel</button>
          <button onClick={() => doExport('pdf')} className="btn-secondary btn-sm"><FileText size={15} /> PDF</button>
        </div>
      </div>
 
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard icon={Layers} tone="brand" label="Product categories" value={summary.categoriesTracked || 0} />
        <SummaryCard icon={ShieldX} tone="red" label="Critical (single / no source)" value={summary.critical || 0} />
        <SummaryCard icon={ShieldAlert} tone="orange" label="High risk" value={summary.high || 0} />
        <SummaryCard icon={ShieldCheck} tone="amber" label="Healthy (4+ vendors)" value={summary.healthy || 0} />
      </div>
 
      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink-800">
            <BarChart3 size={16} className="text-brand-600" /> Vendor distribution by Product Category
          </h3>
          <div className="space-y-2.5">
            {topByVendors.length === 0 ? <p className="text-sm text-ink-400">No data yet.</p>
              : topByVendors.map((r) => <Bar key={r.id} label={r.name} value={r.totalVendors} max={maxVendors} tone={RISK_META[r.riskLevel].bar} />)}
          </div>
        </div>
        <div className="card p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink-800">
            <ShieldAlert size={16} className="text-brand-600" /> Product Category risk analysis
          </h3>
          <div className="space-y-2.5">
            {RISK_LEVELS.map((lvl) => (
              <Bar key={lvl} label={RISK_META[lvl].label} value={riskCounts[lvl] || 0} max={maxRisk} tone={RISK_META[lvl].bar} suffix=" cats" />
            ))}
          </div>
        </div>
      </div>
 
      <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
        <Info size={16} className="mt-0.5 shrink-0" />
        <p>
          Risk by number of suppliers per category:
          <span className="font-medium"> 1 = Critical</span>,
          <span className="font-medium"> 2 = High</span>,
          <span className="font-medium"> 3 = Medium</span>,
          <span className="font-medium"> 4+ = Low</span>. A category with no active supplier is Critical.
          Manage categories in <Link to="/categories" className="font-medium underline">Product Lines</Link>.
        </p>
      </div>
 
      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product category…" className="input pl-9" />
        </div>
        <div className="sm:w-72">
          <MultiSelect options={categories} value={catIds} onChange={setCatIds} placeholder="Filter by product category…" />
        </div>
        <select value={risk} onChange={(e) => setRisk(e.target.value)} className="input sm:w-44">
          <option value="">All risk levels</option>
          {RISK_LEVELS.map((l) => <option key={l} value={l}>{RISK_META[l].label}</option>)}
        </select>
      </div>
 
      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No product categories match" message="Adjust the filters, or tag vendors with product categories to build the report." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="sticky top-0 z-10 bg-ink-50/95 text-xs font-semibold uppercase tracking-wide text-ink-500 backdrop-blur">
                <tr className="border-b border-ink-100">
                  <th className="px-4 py-2.5 text-left">Product Category</th>
                  <th className="px-3 py-2.5 text-center">Total</th>
                  <th className="px-3 py-2.5 text-center">Active</th>
                  <th className="px-3 py-2.5 text-center">Approved</th>
                  <th className="px-3 py-2.5 text-center">Preferred</th>
                  <th className="px-3 py-2.5 text-center">High Risk</th>
                  <th className="px-3 py-2.5 text-center">Conc. %</th>
                  <th className="px-3 py-2.5 text-center">Dependency</th>
                  <th className="px-3 py-2.5 text-right">Risk Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {filtered.map((r) => (
                  <Fragment key={r.id}>
                    <tr onClick={() => setExpanded(expanded === r.id ? null : r.id)} className="cursor-pointer hover:bg-ink-50/60">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2 font-medium text-ink-900">
                          <ChevronDown size={15} className={`text-ink-400 transition-transform ${expanded === r.id ? 'rotate-180' : ''}`} />
                          <span className="truncate">{r.name}</span>
                        </div>
                        {r.group && <p className="pl-7 text-xs text-ink-400">{r.group}</p>}
                      </td>
                      <td className="px-3 py-2.5 text-center font-semibold text-ink-900">{r.totalVendors}</td>
                      <td className="px-3 py-2.5 text-center text-ink-600">{r.activeVendors}</td>
                      <td className="px-3 py-2.5 text-center text-ink-600">{r.approvedVendors}</td>
                      <td className="px-3 py-2.5 text-center text-brand-700">{r.preferredVendors}</td>
                      <td className="px-3 py-2.5 text-center text-red-600">{r.highRiskVendors}</td>
                      <td className="px-3 py-2.5 text-center text-ink-600">{r.concentrationPct}%</td>
                      <td className="px-3 py-2.5 text-center text-ink-600">{r.dependencyScore}</td>
                      <td className="px-3 py-2.5 text-right"><RiskPill level={r.riskLevel} /></td>
                    </tr>
                    {expanded === r.id && (
                      <tr className="bg-ink-50/40">
                        <td colSpan={9} className="px-4 py-3">
                          {r.suppliers.length === 0 ? (
                            <p className="text-sm text-amber-700">⚠ No vendor supplies this category — sourcing gap. Add a supplier.</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {r.suppliers.map((s) => (
                                <Link key={s.id} to={`/vendors/${s.id}`} className="flex items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-sm hover:border-brand-300">
                                  <span className="font-medium text-ink-800">{s.companyName || s.name}</span>
                                  {s.supplierGrade && <span className="chip bg-ink-100 text-ink-500">{s.supplierGrade}</span>}
                                  {s.city && <span className="text-ink-400">· {s.city}</span>}
                                  {s.status && s.status !== 'ACTIVE' && <span className="chip bg-ink-100 text-ink-400">{s.status.toLowerCase()}</span>}
                                </Link>
                              ))}
                            </div>
                          )}
                          {r.riskLevel !== 'LOW' && r.totalVendors > 0 && (
                            <p className="mt-2 text-xs text-amber-700">
                              ⚠ {r.riskLevel === 'CRITICAL' ? 'Single/critical dependency' : `${RISK_META[r.riskLevel].label}`} — add more active suppliers to reduce concentration.
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
