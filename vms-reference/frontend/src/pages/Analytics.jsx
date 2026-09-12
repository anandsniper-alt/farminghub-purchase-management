import { Link } from 'react-router-dom';
import { Users, Boxes, Tags, Layers, BarChart3, GitBranch } from 'lucide-react';
import { useAnalytics } from '../hooks/useInteractions.js';
import { PageLoader } from '../components/ui/Spinner.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Badge from '../components/ui/Badge.jsx';
 
function Bar({ label, count, max, to }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  const inner = (
    <div className="flex items-center gap-3">
      <span className="w-36 shrink-0 truncate text-sm text-ink-600" title={label}>{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink-100">
        <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.max(pct, count > 0 ? 6 : 0)}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right text-sm font-semibold text-ink-800">{count}</span>
    </div>
  );
  return to ? <Link to={to} className="block hover:opacity-80">{inner}</Link> : inner;
}
 
export default function Analytics() {
  const { data, isLoading } = useAnalytics();
  if (isLoading) return <PageLoader />;
  if (!data) return null;
 
  const { totals, vendorsPerGroup, ungroupedLines, vendorsPerComponent, vendorsPerStage, productLinesPerVendor } = data;
  const maxComp = Math.max(1, ...vendorsPerComponent.map((c) => c.vendorCount));
  const maxStage = Math.max(1, ...vendorsPerStage.map((s) => s.vendorCount));
 
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-ink-900">Analytics</h2>
        <p className="mt-0.5 text-sm text-ink-500">Vendors by product line & component, and product-line coverage per vendor.</p>
      </div>
 
      <div className="grid grid-cols-3 gap-4">
        <Stat icon={Users} label="Vendors" value={totals.vendors} tone="brand" />
        <Stat icon={Boxes} label="Product lines" value={totals.productLines} tone="amber" />
        <Stat icon={Tags} label="Components" value={totals.components} tone="purple" />
      </div>
 
      {/* Vendors per product line (grouped) */}
      <div className="card p-5">
        <h3 className="mb-4 flex items-center gap-2 font-semibold text-ink-900">
          <Layers size={16} className="text-brand-600" /> Vendors per product line
        </h3>
        {vendorsPerGroup.length === 0 && ungroupedLines.length === 0 ? (
          <EmptyState title="No product lines" />
        ) : (
          <div className="space-y-5">
            {vendorsPerGroup.map((g) => {
              const max = Math.max(1, ...g.lines.map((l) => l.vendorCount));
              return (
                <div key={g.groupId}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">{g.group}</p>
                  {g.lines.length === 0 ? (
                    <p className="text-sm text-ink-400">No lines.</p>
                  ) : (
                    <div className="space-y-2">
                      {g.lines.map((l) => (
                        <Bar key={l.id} label={l.name} count={l.vendorCount} max={max} to={`/vendors?categoryId=${l.id}`} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {ungroupedLines.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Ungrouped</p>
                <div className="space-y-2">
                  {ungroupedLines.map((l) => (
                    <Bar key={l.id} label={l.name} count={l.vendorCount} max={Math.max(1, ...ungroupedLines.map((x) => x.vendorCount))} to={`/vendors?categoryId=${l.id}`} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
 
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Vendors per component */}
        <div className="card p-5">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-ink-900">
            <Tags size={16} className="text-brand-600" /> Vendors per component
          </h3>
          <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
            {vendorsPerComponent.map((c) => (
              <Bar key={c.id} label={c.name} count={c.vendorCount} max={maxComp} to={`/vendors?componentId=${c.id}`} />
            ))}
          </div>
        </div>
 
        {/* Vendors per stage */}
        <div className="card p-5">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-ink-900">
            <GitBranch size={16} className="text-brand-600" /> Vendors per stage
          </h3>
          <div className="space-y-2">
            {vendorsPerStage.map((s) => (
              <div key={s.id} className="flex items-center gap-3">
                <span className="w-36 shrink-0"><Badge tone={s.color || 'gray'}>{s.name}</Badge></span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.round((s.vendorCount / maxStage) * 100)}%` }} />
                </div>
                <span className="w-8 shrink-0 text-right text-sm font-semibold text-ink-800">{s.vendorCount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
 
      {/* Product lines per vendor */}
      <div className="card p-5">
        <h3 className="mb-4 flex items-center gap-2 font-semibold text-ink-900">
          <BarChart3 size={16} className="text-brand-600" /> Product-line coverage per vendor
        </h3>
        {productLinesPerVendor.length === 0 ? (
          <EmptyState title="No vendors yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400">
                  <th className="py-2 pr-3 font-semibold">Vendor</th>
                  <th className="py-2 pr-3 font-semibold">City</th>
                  <th className="py-2 pr-3 text-center font-semibold">Lines</th>
                  <th className="py-2 pr-3 text-center font-semibold">Components</th>
                  <th className="py-2 font-semibold">Product lines</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {productLinesPerVendor.map((v) => (
                  <tr key={v.id} className="align-top">
                    <td className="py-2.5 pr-3">
                      <Link to={`/vendors/${v.id}`} className="font-medium text-ink-900 hover:text-brand-700">{v.name}</Link>
                      {v.companyName && <p className="text-xs text-ink-400">{v.companyName}</p>}
                    </td>
                    <td className="py-2.5 pr-3 text-ink-600">{v.city || '—'}</td>
                    <td className="py-2.5 pr-3 text-center font-semibold text-ink-800">{v.productLineCount}</td>
                    <td className="py-2.5 pr-3 text-center text-ink-600">{v.componentCount}</td>
                    <td className="py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {v.productLines.map((n) => <span key={n} className="chip bg-amber-50 text-amber-700">{n}</span>)}
                        {v.productLines.length === 0 && <span className="text-ink-400">—</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
 
function Stat({ icon: Icon, label, value, tone }) {
  const tones = { brand: 'bg-brand-50 text-brand-600', amber: 'bg-amber-50 text-amber-600', purple: 'bg-purple-50 text-purple-600' };
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className={`grid h-12 w-12 place-items-center rounded-xl ${tones[tone]}`}><Icon size={22} /></div>
      <div><p className="text-2xl font-bold text-ink-900">{value}</p><p className="text-sm text-ink-500">{label}</p></div>
    </div>
  );
}
