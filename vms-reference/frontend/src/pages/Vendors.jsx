import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Plus, SlidersHorizontal, X, Users, Upload, FileSpreadsheet, FileText, Columns3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useVendors } from '../hooks/useVendors.js';
import { useExpos, useComponents, useCategories } from '../hooks/useTaxonomies.js';
import { useStages, useProductLines } from '../hooks/useLookups.js';
import { useAllStates } from '../hooks/useGeo.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { useColumnConfig } from '../hooks/useColumnConfig.js';
import { apiError } from '../lib/api.js';
import { exportColumns } from '../lib/export.js';
import { getOutbox } from '../offline/db.js';
import { filterVendors, sortVendors } from '../offline/vendorFilter.js';
import { useSyncState } from '../hooks/useSyncState.js';
import { PageLoader } from '../components/ui/Spinner.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import DataGrid from '../components/DataGrid.jsx';
import ManageColumnsModal from '../components/ManageColumnsModal.jsx';
import { expoLabel } from '../lib/format.js';
import { useAuth } from '../context/AuthContext.jsx';
 
export default function Vendors() {
  const navigate = useNavigate();
  const { has } = useAuth();
  const canCreate = has('vendors', 'create');
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const q = useDebounce(search, 350);
  const [showFilters, setShowFilters] = useState(
    !!(searchParams.get('categoryId') || searchParams.get('componentId') || searchParams.get('stageId'))
  );
  const [filters, setFilters] = useState({
    expoId: '', stageId: searchParams.get('stageId') || '',
    componentId: searchParams.get('componentId') || '', categoryId: searchParams.get('categoryId') || '',
    stateId: '', productLineId: '', status: '', sort: 'recent',
  });
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
 
  const { data: expos = [] } = useExpos();
  const { data: components = [] } = useComponents();
  const { data: categories = [] } = useCategories();
  const { data: stages = [] } = useStages();
  const { data: productLines = [] } = useProductLines();
  const { data: allStates = [] } = useAllStates();
 
  const { online } = useSyncState();
  // Fetch the full set once; search/filter/sort/paginate happen client-side so the
  // list works identically online and offline (over the cached dataset).
  const { data, isLoading, isFetching } = useVendors({ page: 1, pageSize: 1000 });
 
  // Pending offline creates (shown at the top until they sync).
  const [pendingCreates, setPendingCreates] = useState([]);
  useEffect(() => {
    getOutbox().then((items) => setPendingCreates(items.filter((i) => i.kind === 'vendor')));
  }, [isFetching, online]);
 
  const { allRows, vendors, pagination } = useMemo(() => {
    const base = data?.data || [];
    const previews = pendingCreates.map((it) => ({
      id: it.id,
      _pending: true,
      name: it.preview?.name || it.payload?.name || 'New vendor',
      companyName: it.preview?.companyName || it.payload?.companyName || null,
      city: it.payload?.city || null,
      region: it.payload?.region || null,
      categories: [], components: [], stage: null, overallRating: null,
    }));
    const merged = [...previews, ...base];
    const sorted = sortVendors(filterVendors(merged, { q, filters }), filters.sort);
    const pageSize = 20;
    const total = sorted.length;
    return {
      allRows: sorted,
      vendors: sorted.slice((page - 1) * pageSize, page * pageSize),
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    };
  }, [data, pendingCreates, q, filters, page]);
 
  // Configurable columns (personal / global layouts, dynamic fields).
  const cfg = useColumnConfig('vendors', (data?.data || [])[0]);
 
  const activeFilterCount = Object.entries(filters).filter(
    ([k, v]) => v && k !== 'sort'
  ).length;
 
  const setFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };
  const clearFilters = () => {
    setFilters({ expoId: '', stageId: '', componentId: '', categoryId: '', stateId: '', productLineId: '', status: '', sort: 'recent' });
    setSearch('');
    setPage(1);
  };
 
  // Export the full filtered set using the current column layout (visible cols, order, labels).
  const doExport = async (kind) => {
    const rows = allRows.filter((r) => !r._pending);
    if (rows.length === 0) { toast.error('No vendors to export'); return; }
    setExporting(true);
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      await exportColumns(cfg.visibleColumns, rows, { kind, filename: `vendors-${stamp}`, title: 'Vendors', sheetName: 'Vendors' });
      toast.success(`Exported ${rows.length} vendors`);
    } catch (e) {
      toast.error(apiError(e, 'Export failed'));
    } finally {
      setExporting(false);
    }
  };
 
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-ink-900">Vendors</h2>
          <p className="mt-0.5 text-sm text-ink-500">
            {pagination ? `${pagination.total} supplier contacts` : 'Supplier contacts'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setManageOpen(true)} className="btn-secondary btn-sm" title="Manage columns">
            <Columns3 size={15} /> Columns
          </button>
          <button onClick={() => doExport('excel')} disabled={exporting} className="btn-secondary btn-sm" title="Export to Excel">
            <FileSpreadsheet size={15} /> Excel
          </button>
          <button onClick={() => doExport('pdf')} disabled={exporting} className="btn-secondary btn-sm" title="Export to PDF">
            <FileText size={15} /> PDF
          </button>
          {canCreate && (
            <>
              <Link to="/vendors/import" className="btn-secondary">
                <Upload size={16} /> Import
              </Link>
              <Link to="/vendors/new" className="btn-primary">
                <Plus size={16} /> Add Vendor
              </Link>
            </>
          )}
        </div>
      </div>
 
      {/* Search + filter toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name, company, phone, WeChat, city, component…"
            className="input pl-9"
          />
        </div>
        <select
          value={filters.sort}
          onChange={(e) => setFilter('sort', e.target.value)}
          className="input w-auto"
        >
          <option value="recent">Newest</option>
          <option value="name">Name A–Z</option>
          <option value="rating">Top rated</option>
          <option value="state">State</option>
          <option value="city">City</option>
        </select>
        <button
          onClick={() => setShowFilters((s) => !s)}
          className="btn-secondary relative"
        >
          <SlidersHorizontal size={16} /> Filters
          {activeFilterCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>
 
      {/* Filter panel */}
      {showFilters && (
        <div className="card grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <FilterSelect label="Stage" value={filters.stageId} onChange={(v) => setFilter('stageId', v)}
            options={stages.map((s) => ({ value: s.id, label: s.name }))} />
          <FilterSelect label="State" value={filters.stateId} onChange={(v) => setFilter('stateId', v)}
            options={allStates.map((s) => ({ value: s.id, label: s.name }))} />
          <FilterSelect label="Expo / Fair" value={filters.expoId} onChange={(v) => setFilter('expoId', v)}
            options={expos.map((e) => ({ value: e.id, label: expoLabel(e) }))} />
          <FilterSelect label="Component" value={filters.componentId} onChange={(v) => setFilter('componentId', v)}
            options={components.map((c) => ({ value: c.id, label: c.name }))} />
          <FilterSelect label="Product Lines" value={filters.productLineId || ''} onChange={(v) => setFilter('productLineId', v)}
            options={productLines.map((p) => ({ value: p.id, label: p.name }))} />
          <FilterSelect label="Product Category" value={filters.categoryId} onChange={(v) => setFilter('categoryId', v)}
            options={categories.map((c) => ({ value: c.id, label: c.name }))} />
          <div className="flex items-end sm:col-span-2 lg:col-span-4">
            {(activeFilterCount > 0 || search) && (
              <button onClick={clearFilters} className="btn-ghost btn-sm text-ink-500">
                <X size={14} /> Clear all filters
              </button>
            )}
          </div>
        </div>
      )}
 
      {/* Results */}
      {isLoading ? (
        <PageLoader />
      ) : vendors.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No vendors found"
          message={q || activeFilterCount ? 'Try adjusting your search or filters.' : 'Add your first supplier to get started.'}
          action={<Link to="/vendors/new" className="btn-primary btn-sm"><Plus size={14} /> Add Vendor</Link>}
        />
      ) : (
        <div className={`card overflow-hidden ${isFetching ? 'opacity-70' : ''}`}>
          <DataGrid
            columns={cfg.visibleColumns}
            rows={vendors}
            sort={filters.sort}
            onSort={(k) => setFilter('sort', k)}
            onRowClick={(v) => navigate(v._pending ? '/pending' : `/vendors/${v.id}`)}
          />
          <div className="border-t border-ink-100 px-2">
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              pageSize={pagination.pageSize}
              onPage={setPage}
            />
          </div>
        </div>
      )}
 
      {manageOpen && <ManageColumnsModal open onClose={() => setManageOpen(false)} columns={cfg.columns} cfg={cfg} />}
    </div>
  );
}
 
function FilterSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="label">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input">
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
