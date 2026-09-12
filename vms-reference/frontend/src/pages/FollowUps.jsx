import { useState } from 'react';
import { CalendarClock, Search, SlidersHorizontal, X, FileSpreadsheet, FileText, Columns3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useFollowUps, useUpdateFollowUp } from '../hooks/useFollowUps.js';
import { useAssignableUsers, useProductLines } from '../hooks/useLookups.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { useColumnConfig } from '../hooks/useColumnConfig.js';
import { apiError } from '../lib/api.js';
import { exportColumns } from '../lib/export.js';
import { PageLoader } from '../components/ui/Spinner.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Modal from '../components/ui/Modal.jsx';
import DataGrid from '../components/DataGrid.jsx';
import ManageColumnsModal from '../components/ManageColumnsModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
 
const STATUSES = ['Overdue', 'Today', 'Upcoming', 'Completed'];
 
export default function FollowUps() {
  const { has } = useAuth();
  const canEdit = has('interactions', 'edit');
  const [search, setSearch] = useState('');
  const q = useDebounce(search, 350);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ status: '', assignedToId: '', city: '', productLineId: '', from: '', to: '' });
  const [reschedule, setReschedule] = useState(null); // row being rescheduled
  const [manageOpen, setManageOpen] = useState(false);
 
  const { data, isLoading, isFetching } = useFollowUps({ ...filters, q: q || undefined });
  const { data: users = [] } = useAssignableUsers();
  const { data: productLines = [] } = useProductLines();
  const updateMut = useUpdateFollowUp();
 
  const rows = data?.followUps || [];
  const counts = data?.counts || {};
  const activeFilterCount = Object.entries(filters).filter(([, v]) => v).length;
 
  const cfg = useColumnConfig('follow-ups', rows[0]);
 
  const setFilter = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  const clearFilters = () => { setFilters({ status: '', assignedToId: '', city: '', productLineId: '', from: '', to: '' }); setSearch(''); };
 
  const complete = async (row) => {
    try {
      await updateMut.mutateAsync({ interactionId: row.interactionId, vendorId: row.vendorId, followUpCompleted: true });
      toast.success('Follow-up completed');
    } catch (e) { toast.error(apiError(e)); }
  };
 
  const doReschedule = async (dateStr) => {
    try {
      await updateMut.mutateAsync({
        interactionId: reschedule.interactionId, vendorId: reschedule.vendorId,
        nextFollowUpAt: new Date(dateStr).toISOString(), followUpCompleted: false,
      });
      toast.success('Follow-up rescheduled');
      setReschedule(null);
    } catch (e) { toast.error(apiError(e)); }
  };
 
  const doExport = async (kind) => {
    if (rows.length === 0) return toast.error('Nothing to export');
    const stamp = new Date().toISOString().slice(0, 10);
    try {
      await exportColumns(cfg.visibleColumns, rows, { kind, filename: `follow-ups-${stamp}`, title: 'Vendor Follow-ups', sheetName: 'Follow-ups' });
    } catch (e) { toast.error(apiError(e, 'Export failed')); }
  };
 
  // ctx wires the Actions column's quick-action buttons to the page handlers.
  const gridCtx = { canEdit, onComplete: complete, onReschedule: (r) => setReschedule(r) };
 
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-ink-900">Vendor Follow-up</h2>
          <p className="mt-0.5 text-sm text-ink-500">{data ? `${data.total} follow-ups` : 'Pending vendor follow-ups'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setManageOpen(true)} className="btn-secondary btn-sm"><Columns3 size={15} /> Columns</button>
          <button onClick={() => doExport('excel')} className="btn-secondary btn-sm"><FileSpreadsheet size={15} /> Excel</button>
          <button onClick={() => doExport('pdf')} className="btn-secondary btn-sm"><FileText size={15} /> PDF</button>
        </div>
      </div>
 
      {/* Status summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter('status', filters.status === s ? '' : s)}
            className={`card p-4 text-left transition-shadow hover:shadow-card ${filters.status === s ? 'ring-2 ring-brand-500' : ''}`}
          >
            <p className="text-xs uppercase tracking-wide text-ink-400">{s}</p>
            <p className="mt-1 text-2xl font-bold text-ink-900">{counts[s] || 0}</p>
          </button>
        ))}
      </div>
 
      {/* Search + filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company, contact, city…" className="input pl-9" />
        </div>
        <button onClick={() => setShowFilters((s) => !s)} className="btn-secondary relative">
          <SlidersHorizontal size={16} /> Filters
          {activeFilterCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-brand-600 text-[10px] font-bold text-white">{activeFilterCount}</span>
          )}
        </button>
      </div>
 
      {showFilters && (
        <div className="card grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label">Status</label>
            <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className="input">
              <option value="">All</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Assigned user</label>
            <select value={filters.assignedToId} onChange={(e) => setFilter('assignedToId', e.target.value)} className="input">
              <option value="">All</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Product Lines</label>
            <select value={filters.productLineId} onChange={(e) => setFilter('productLineId', e.target.value)} className="input">
              <option value="">All</option>
              {productLines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">City</label>
            <input value={filters.city} onChange={(e) => setFilter('city', e.target.value)} className="input" placeholder="City" />
          </div>
          <div>
            <label className="label">From</label>
            <input type="date" value={filters.from} onChange={(e) => setFilter('from', e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" value={filters.to} onChange={(e) => setFilter('to', e.target.value)} className="input" />
          </div>
          <div className="flex items-end sm:col-span-2 lg:col-span-4">
            {(activeFilterCount > 0 || search) && (
              <button onClick={clearFilters} className="btn-ghost btn-sm text-ink-500"><X size={14} /> Clear all filters</button>
            )}
          </div>
        </div>
      )}
 
      {isLoading ? (
        <PageLoader />
      ) : rows.length === 0 ? (
        <EmptyState icon={CalendarClock} title="No follow-ups" message="Log an interaction with a next follow-up date to see it here." />
      ) : (
        <div className={`card overflow-hidden ${isFetching ? 'opacity-70' : ''}`}>
          <DataGrid columns={cfg.visibleColumns} rows={rows} ctx={gridCtx} rowKey={(r) => r.interactionId} />
        </div>
      )}
 
      {reschedule && (
        <RescheduleModal row={reschedule} saving={updateMut.isPending} onClose={() => setReschedule(null)} onSave={doReschedule} />
      )}
      {manageOpen && <ManageColumnsModal open onClose={() => setManageOpen(false)} columns={cfg.columns} cfg={cfg} />}
    </div>
  );
}
 
function RescheduleModal({ row, onClose, onSave, saving }) {
  const [date, setDate] = useState(row.nextFollowUpAt ? new Date(row.nextFollowUpAt).toISOString().slice(0, 10) : '');
  return (
    <Modal open onClose={onClose} title={`Reschedule — ${row.companyName}`} size="sm"
      footer={<>
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={() => date && onSave(date)} disabled={!date || saving}>
          {saving && <Spinner size={16} className="text-white" />} Save
        </button>
      </>}>
      <label className="label">New next follow-up date</label>
      <input type="date" autoFocus value={date} onChange={(e) => setDate(e.target.value)} className="input" />
    </Modal>
  );
}
