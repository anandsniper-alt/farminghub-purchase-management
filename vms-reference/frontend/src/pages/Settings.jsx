import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import {
  GitBranch, Image, Coins, Plus, Pencil, Trash2, Save, Users, RefreshCw, Zap,
  Layers, MapPin, ChevronRight, ChevronDown, Upload, Download,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useStages, useSaveStage, useDeleteStage,
  usePhotoTypes, useSavePhotoType, useDeletePhotoType,
  useProductLines, useSaveProductLine, useDeleteProductLine,
  useCurrencyRates, useSaveCurrencyRates, useRefreshCurrencyRates,
} from '../hooks/useLookups.js';
import {
  useGeoTree, useSaveGeo, useDeleteGeo,
  useGeoImportPreview, useGeoImportCommit, downloadGeoTemplate,
} from '../hooks/useGeo.js';
import { apiError } from '../lib/api.js';
import { PageLoader } from '../components/ui/Spinner.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import Modal from '../components/ui/Modal.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import Badge from '../components/ui/Badge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
 
const TABS = [
  { key: 'stages', label: 'Vendor Stages', icon: GitBranch },
  { key: 'productLines', label: 'Product Lines', icon: Layers },
  { key: 'locations', label: 'Locations', icon: MapPin },
  { key: 'photoTypes', label: 'Photo Types', icon: Image },
  { key: 'currencies', label: 'Currencies', icon: Coins },
];
 
export default function Settings() {
  const { has } = useAuth();
  const [tab, setTab] = useState('stages');
  const canManage = has('settings', 'create') || has('settings', 'edit') || has('settings', 'delete');
 
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-ink-900">Settings</h2>
        <p className="mt-0.5 text-sm text-ink-500">Manage the editable lists used across the app.</p>
      </div>
 
      <div className="flex gap-1 border-b border-ink-200">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-500 hover:text-ink-800'
            }`}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>
 
      {tab === 'stages' && <StagesTab canManage={canManage} />}
      {tab === 'productLines' && <ProductLinesTab canManage={canManage} />}
      {tab === 'locations' && <LocationsTab canManage={canManage} />}
      {tab === 'photoTypes' && <PhotoTypesTab canManage={canManage} />}
      {tab === 'currencies' && <CurrenciesTab canManage={canManage} />}
    </div>
  );
}
 
/* ------------------------------- Stages ------------------------------- */
const COLORS = ['gray', 'green', 'blue', 'amber', 'red', 'purple'];
 
function StagesTab({ canManage }) {
  const { data: stages, isLoading } = useStages();
  const saveMut = useSaveStage();
  const delMut = useDeleteStage();
  const [modal, setModal] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  if (isLoading) return <PageLoader />;
 
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-ink-500">Pipeline stages for vendors. Stages not counted in sourcing are excluded from concentration.</p>
        {canManage && <button onClick={() => setModal({})} className="btn-primary btn-sm"><Plus size={14} /> Add Stage</button>}
      </div>
      <div className="divide-y divide-ink-100">
        {stages.map((s) => (
          <div key={s.id} className="group flex items-center gap-3 py-2.5">
            <Badge tone={s.color || 'gray'}>{s.name}</Badge>
            {!s.countsInSourcing && <span className="text-xs text-ink-400">excluded from sourcing</span>}
            <span className="ml-auto chip bg-ink-100 text-ink-500"><Users size={11} /> {s._count?.vendors ?? 0}</span>
            {canManage && (
              <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button onClick={() => setModal(s)} className="rounded p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"><Pencil size={14} /></button>
                <button onClick={() => setToDelete(s)} className="rounded p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
              </div>
            )}
          </div>
        ))}
      </div>
 
      {modal && (
        <StageModal stage={modal.id ? modal : null} saving={saveMut.isPending} onClose={() => setModal(null)}
          onSave={async (data) => { try { await saveMut.mutateAsync(modal.id ? { id: modal.id, ...data } : data); toast.success('Saved'); setModal(null); } catch (e) { toast.error(apiError(e)); } }} />
      )}
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)}
        onConfirm={async () => { try { await delMut.mutateAsync(toDelete.id); toast.success('Deleted'); setToDelete(null); } catch (e) { toast.error(apiError(e)); } }}
        loading={delMut.isPending} title="Delete stage?" message={`Delete "${toDelete?.name}"? Vendors on this stage become unstaged.`} confirmLabel="Delete" />
    </div>
  );
}
 
function StageModal({ stage, onClose, onSave, saving }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      name: stage?.name || '', color: stage?.color || 'gray',
      order: stage?.order ?? 0, countsInSourcing: stage?.countsInSourcing ?? true,
    },
  });
  const color = watch('color');
  return (
    <Modal open onClose={onClose} title={stage ? 'Edit stage' : 'Add stage'} size="sm"
      footer={<>
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={handleSubmit(onSave)} disabled={saving}>{saving && <Spinner size={16} className="text-white" />} Save</button>
      </>}>
      <div className="space-y-4">
        <div>
          <label className="label">Name *</label>
          <input className="input" placeholder="e.g. Approved Vendor" {...register('name', { required: 'Required' })} />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <label className="label">Colour</label>
          <div className="flex items-center gap-3">
            <select className="input" {...register('color')}>
              {COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <Badge tone={color}>Preview</Badge>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <label className="label mb-0">Counts in sourcing</label>
            <p className="text-xs text-ink-400">Off for Blacklisted / Inactive.</p>
          </div>
          <input type="checkbox" className="h-5 w-5 accent-brand-600" {...register('countsInSourcing')} />
        </div>
        <div>
          <label className="label">Display order</label>
          <input type="number" className="input" {...register('order')} />
        </div>
      </div>
    </Modal>
  );
}
 
/* ----------------------------- Photo types ----------------------------- */
function PhotoTypesTab({ canManage }) {
  const { data: types, isLoading } = usePhotoTypes();
  const saveMut = useSavePhotoType();
  const delMut = useDeletePhotoType();
  const [modal, setModal] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  if (isLoading) return <PageLoader />;
 
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-ink-500">Options for the photo "Type" dropdown (Product, Booth, Online…).</p>
        {canManage && <button onClick={() => setModal({})} className="btn-primary btn-sm"><Plus size={14} /> Add Type</button>}
      </div>
      <div className="flex flex-wrap gap-2">
        {types.map((t) => (
          <div key={t.id} className="group flex items-center gap-2 rounded-lg border border-ink-200 bg-white py-2 pl-3 pr-2 shadow-card">
            <Image size={14} className="text-brand-600" />
            <span className="font-medium text-ink-800">{t.name}</span>
            <span className="chip bg-ink-100 text-ink-500">{t._count?.photos ?? 0}</span>
            {canManage && (
              <span className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <button onClick={() => setModal(t)} className="rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700"><Pencil size={13} /></button>
                <button onClick={() => setToDelete(t)} className="rounded p-1 text-ink-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={13} /></button>
              </span>
            )}
          </div>
        ))}
      </div>
 
      {modal && (
        <SimpleNameModal title={modal.id ? 'Edit photo type' : 'Add photo type'} defaultName={modal.name} saving={saveMut.isPending}
          onClose={() => setModal(null)}
          onSave={async (name) => { try { await saveMut.mutateAsync(modal.id ? { id: modal.id, name } : { name }); toast.success('Saved'); setModal(null); } catch (e) { toast.error(apiError(e)); } }} />
      )}
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)}
        onConfirm={async () => { try { await delMut.mutateAsync(toDelete.id); toast.success('Deleted'); setToDelete(null); } catch (e) { toast.error(apiError(e)); } }}
        loading={delMut.isPending} title="Delete photo type?" message={`Delete "${toDelete?.name}"?`} confirmLabel="Delete" />
    </div>
  );
}
 
/* ----------------------------- Currencies ----------------------------- */
function fmtWhen(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
 
function CurrenciesTab({ canManage }) {
  const { data: serverRates, isLoading } = useCurrencyRates();
  const saveMut = useSaveCurrencyRates();
  const refreshMut = useRefreshCurrencyRates();
  const [rows, setRows] = useState([]);
 
  useEffect(() => {
    if (serverRates) setRows(serverRates.map((r) => ({ ...r, inrPerUnit: String(r.inrPerUnit) })));
  }, [serverRates]);
 
  if (isLoading) return <PageLoader />;
 
  const lastUpdated = serverRates?.reduce((max, r) => (r.updatedAt && r.updatedAt > max ? r.updatedAt : max), '');
 
  const refreshNow = async () => {
    try {
      const r = await refreshMut.mutateAsync();
      toast.success(r.message || 'Rates updated from the internet');
    } catch (e) { toast.error(apiError(e)); }
  };
 
  const update = (i, key, val) => setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [key]: val } : row)));
  const addRow = () => setRows((r) => [...r, { code: '', name: '', symbol: '', inrPerUnit: '1' }]);
  const removeRow = (i) => setRows((r) => r.filter((_, idx) => idx !== i));
 
  const save = async () => {
    const payload = rows
      .filter((r) => r.code && r.name && r.inrPerUnit)
      .map((r) => ({ code: r.code.toUpperCase(), name: r.name, symbol: r.symbol || undefined, inrPerUnit: Number(r.inrPerUnit) }));
    if (payload.length === 0) return toast.error('Add at least one currency');
    try {
      await saveMut.mutateAsync(payload);
      toast.success('Rates saved');
    } catch (e) { toast.error(apiError(e)); }
  };
 
  return (
    <div className="card p-5">
      {/* Auto-update banner */}
      <div className="mb-4 flex flex-col gap-3 rounded-lg border border-brand-100 bg-brand-50/60 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <Zap size={16} className="mt-0.5 shrink-0 text-brand-600" />
          <div className="text-sm">
            <p className="font-medium text-ink-800">Live rates — auto-updated daily from the internet.</p>
            <p className="text-ink-500">Last updated: {fmtWhen(lastUpdated)}. You can refresh now, or override a value manually below.</p>
          </div>
        </div>
        {canManage && (
          <button onClick={refreshNow} className="btn-primary btn-sm shrink-0" disabled={refreshMut.isPending}>
            {refreshMut.isPending ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />} Update now
          </button>
        )}
      </div>
 
      <div className="mb-4 flex items-center justify-between">
        <p className="max-w-xl text-sm text-ink-500">
          Value of <b>1 unit</b> of each currency in <b>INR</b>. Sample prices convert using these.
        </p>
        {canManage && <button onClick={addRow} className="btn-secondary btn-sm"><Plus size={14} /> Add currency</button>}
      </div>
 
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400">
              <th className="py-2 pr-3 font-semibold">Code</th>
              <th className="py-2 pr-3 font-semibold">Name</th>
              <th className="py-2 pr-3 font-semibold">Symbol</th>
              <th className="py-2 pr-3 font-semibold">1 unit = ? INR</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-ink-50">
                <td className="py-2 pr-3"><input className="input w-20 uppercase" disabled={!canManage} value={r.code} onChange={(e) => update(i, 'code', e.target.value)} placeholder="USD" /></td>
                <td className="py-2 pr-3"><input className="input" disabled={!canManage} value={r.name} onChange={(e) => update(i, 'name', e.target.value)} placeholder="US Dollar" /></td>
                <td className="py-2 pr-3"><input className="input w-16" disabled={!canManage} value={r.symbol || ''} onChange={(e) => update(i, 'symbol', e.target.value)} placeholder="$" /></td>
                <td className="py-2 pr-3"><input type="number" step="0.0001" className="input w-32" disabled={!canManage} value={r.inrPerUnit} onChange={(e) => update(i, 'inrPerUnit', e.target.value)} /></td>
                <td className="py-2">{canManage && r.code !== 'INR' && <button onClick={() => removeRow(i)} className="text-ink-300 hover:text-red-600"><Trash2 size={14} /></button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
 
      {canManage && (
        <div className="mt-4 flex justify-end">
          <button onClick={save} className="btn-primary" disabled={saveMut.isPending}>
            {saveMut.isPending ? <Spinner size={16} className="text-white" /> : <Save size={16} />} Save rates
          </button>
        </div>
      )}
    </div>
  );
}
 
/* ----------------------------- Product lines ----------------------------- */
function ProductLinesTab({ canManage }) {
  const { data: lines, isLoading } = useProductLines();
  const saveMut = useSaveProductLine();
  const delMut = useDeleteProductLine();
  const [modal, setModal] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  if (isLoading) return <PageLoader />;
 
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-ink-500">Vendor classification shown at the top of the vendor form (UTILITY, LAE, IMPLEMENTS…).</p>
        {canManage && <button onClick={() => setModal({})} className="btn-primary btn-sm"><Plus size={14} /> Add Product Line</button>}
      </div>
      <div className="flex flex-wrap gap-2">
        {lines.map((t) => (
          <div key={t.id} className="group flex items-center gap-2 rounded-lg border border-ink-200 bg-white py-2 pl-3 pr-2 shadow-card">
            <Layers size={14} className="text-brand-600" />
            <span className="font-medium text-ink-800">{t.name}</span>
            <span className="chip bg-ink-100 text-ink-500">{t._count?.vendors ?? 0}</span>
            {canManage && (
              <span className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <button onClick={() => setModal(t)} className="rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700"><Pencil size={13} /></button>
                <button onClick={() => setToDelete(t)} className="rounded p-1 text-ink-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={13} /></button>
              </span>
            )}
          </div>
        ))}
        {lines.length === 0 && <p className="text-sm text-ink-400">No product lines yet.</p>}
      </div>
 
      {modal && (
        <SimpleNameModal title={modal.id ? 'Edit product line' : 'Add product line'} defaultName={modal.name} saving={saveMut.isPending}
          placeholder="e.g. UTILITY" onClose={() => setModal(null)}
          onSave={async (name) => { try { await saveMut.mutateAsync(modal.id ? { id: modal.id, name } : { name }); toast.success('Saved'); setModal(null); } catch (e) { toast.error(apiError(e)); } }} />
      )}
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)}
        onConfirm={async () => { try { await delMut.mutateAsync(toDelete.id); toast.success('Deleted'); setToDelete(null); } catch (e) { toast.error(apiError(e)); } }}
        loading={delMut.isPending} title="Delete product line?" message={`Delete "${toDelete?.name}"? Vendors on this line become unclassified.`} confirmLabel="Delete" />
    </div>
  );
}
 
/* ----------------------------- Locations (Country → State → District) ----------------------------- */
function LocationsTab({ canManage }) {
  const { data: countries, isLoading } = useGeoTree();
  const saveCountry = useSaveGeo('countries');
  const saveState = useSaveGeo('states');
  const saveDistrict = useSaveGeo('districts');
  const delCountry = useDeleteGeo('countries');
  const delState = useDeleteGeo('states');
  const delDistrict = useDeleteGeo('districts');
 
  const [expanded, setExpanded] = useState({}); // id -> bool
  const [modal, setModal] = useState(null); // { level, id?, name?, parentId? }
  const [toDelete, setToDelete] = useState(null); // { level, id, name }
  const [bulkOpen, setBulkOpen] = useState(false);
 
  if (isLoading) return <PageLoader />;
 
  const toggle = (id) => setExpanded((e) => ({ ...e, [id]: !e[id] }));
 
  const mutFor = (level) => (level === 'countries' ? saveCountry : level === 'states' ? saveState : saveDistrict);
  const delFor = (level) => (level === 'countries' ? delCountry : level === 'states' ? delState : delDistrict);
 
  const onSaveModal = async (name) => {
    const m = modal;
    const mut = mutFor(m.level);
    const payload = m.id ? { id: m.id, name } : { name, ...(m.level === 'states' ? { countryId: m.parentId } : m.level === 'districts' ? { stateId: m.parentId } : {}) };
    try { await mut.mutateAsync(payload); toast.success('Saved'); setModal(null); } catch (e) { toast.error(apiError(e)); }
  };
 
  const savingModal = saveCountry.isPending || saveState.isPending || saveDistrict.isPending;
  const deletingRow = delCountry.isPending || delState.isPending || delDistrict.isPending;
 
  const LABEL = { countries: 'country', states: 'state', districts: 'district' };
 
  return (
    <div className="card p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm text-ink-500">
          Master mapping for the cascading <b>Country → State → District</b> dropdowns on the vendor form.
          Add entries below or import many at once with Bulk Upload.
        </p>
        {canManage && (
          <div className="flex shrink-0 flex-wrap gap-2">
            <button onClick={() => downloadGeoTemplate().catch((e) => toast.error(apiError(e)))} className="btn-ghost btn-sm text-ink-600"><Download size={14} /> Template</button>
            <button onClick={() => setBulkOpen(true)} className="btn-secondary btn-sm"><Upload size={14} /> Bulk upload</button>
            <button onClick={() => setModal({ level: 'countries' })} className="btn-primary btn-sm"><Plus size={14} /> Add country</button>
          </div>
        )}
      </div>
 
      <div className="divide-y divide-ink-100">
        {countries.map((c) => (
          <div key={c.id} className="py-1.5">
            {/* Country row */}
            <div className="group flex items-center gap-2">
              <button onClick={() => toggle(c.id)} className="rounded p-0.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700">
                {expanded[c.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              <MapPin size={14} className="text-brand-600" />
              <span className="font-semibold text-ink-800">{c.name}</span>
              <span className="chip bg-ink-100 text-ink-500">{c.states.length} states</span>
              {canManage && (
                <span className="ml-auto flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button onClick={() => setModal({ level: 'states', parentId: c.id })} className="chip bg-brand-50 text-brand-700 hover:bg-brand-100"><Plus size={11} /> State</button>
                  <button onClick={() => setModal({ level: 'countries', id: c.id, name: c.name })} className="rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700"><Pencil size={13} /></button>
                  <button onClick={() => setToDelete({ level: 'countries', id: c.id, name: c.name })} className="rounded p-1 text-ink-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={13} /></button>
                </span>
              )}
            </div>
 
            {/* States */}
            {expanded[c.id] && (
              <div className="ml-7 mt-1 space-y-1 border-l border-ink-100 pl-3">
                {c.states.length === 0 && <p className="py-1 text-xs text-ink-400">No states yet. Add one or use Bulk upload.</p>}
                {c.states.map((s) => (
                  <div key={s.id}>
                    <div className="group flex items-center gap-2">
                      <button onClick={() => toggle(s.id)} className="rounded p-0.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700">
                        {expanded[s.id] ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                      </button>
                      <span className="font-medium text-ink-700">{s.name}</span>
                      <span className="chip bg-ink-100 text-ink-500">{s.districts.length}</span>
                      {canManage && (
                        <span className="ml-auto flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button onClick={() => setModal({ level: 'districts', parentId: s.id })} className="chip bg-brand-50 text-brand-700 hover:bg-brand-100"><Plus size={11} /> District</button>
                          <button onClick={() => setModal({ level: 'states', id: s.id, name: s.name })} className="rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700"><Pencil size={12} /></button>
                          <button onClick={() => setToDelete({ level: 'states', id: s.id, name: s.name })} className="rounded p-1 text-ink-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={12} /></button>
                        </span>
                      )}
                    </div>
                    {/* Districts */}
                    {expanded[s.id] && (
                      <div className="ml-6 mt-1 flex flex-wrap gap-1.5 border-l border-ink-100 pl-3">
                        {s.districts.length === 0 && <p className="py-1 text-xs text-ink-400">No districts yet.</p>}
                        {s.districts.map((d) => (
                          <div key={d.id} className="group flex items-center gap-1 rounded-md border border-ink-200 bg-white py-1 pl-2 pr-1 text-sm">
                            <span className="text-ink-700">{d.name}</span>
                            {canManage && (
                              <span className="flex opacity-0 transition-opacity group-hover:opacity-100">
                                <button onClick={() => setModal({ level: 'districts', id: d.id, name: d.name })} className="rounded p-0.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"><Pencil size={11} /></button>
                                <button onClick={() => setToDelete({ level: 'districts', id: d.id, name: d.name })} className="rounded p-0.5 text-ink-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={11} /></button>
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {countries.length === 0 && <p className="py-2 text-sm text-ink-400">No countries yet.</p>}
      </div>
 
      {modal && (
        <SimpleNameModal
          title={`${modal.id ? 'Edit' : 'Add'} ${LABEL[modal.level]}`}
          defaultName={modal.name} saving={savingModal}
          placeholder={modal.level === 'countries' ? 'e.g. India' : modal.level === 'states' ? 'e.g. Karnataka' : 'e.g. Bengaluru Urban'}
          onClose={() => setModal(null)} onSave={onSaveModal} />
      )}
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)}
        onConfirm={async () => { try { await delFor(toDelete.level).mutateAsync(toDelete.id); toast.success('Deleted'); setToDelete(null); } catch (e) { toast.error(apiError(e)); } }}
        loading={deletingRow} title={`Delete ${toDelete ? LABEL[toDelete.level] : ''}?`}
        message={`Delete "${toDelete?.name}"?${toDelete?.level !== 'districts' ? ' Everything nested under it is removed too.' : ''} Vendors keep their saved text location.`}
        confirmLabel="Delete" />
 
      {bulkOpen && <GeoBulkUploadModal onClose={() => setBulkOpen(false)} />}
    </div>
  );
}
 
function GeoBulkUploadModal({ onClose }) {
  const previewMut = useGeoImportPreview();
  const commitMut = useGeoImportCommit();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const inputRef = useRef(null);
 
  const pick = async (f) => {
    setFile(f); setPreview(null);
    if (!f) return;
    try { setPreview(await previewMut.mutateAsync(f)); } catch (e) { toast.error(apiError(e)); }
  };
 
  const commit = async () => {
    try {
      const r = await commitMut.mutateAsync(file);
      const s = r.summary;
      toast.success(`Added ${s.newCountries} countries, ${s.newStates} states, ${s.newDistricts} districts`);
      onClose();
    } catch (e) { toast.error(apiError(e)); }
  };
 
  const s = preview?.summary;
 
  return (
    <Modal open onClose={onClose} title="Bulk upload locations" size="md"
      footer={<>
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={commit} disabled={!file || commitMut.isPending || previewMut.isPending}>
          {commitMut.isPending && <Spinner size={16} className="text-white" />} Import
        </button>
      </>}>
      <div className="space-y-4">
        <p className="text-sm text-ink-500">
          Upload an <b>.xlsx/.csv</b> with <b>Country, State, District</b> columns. Existing entries are skipped; only new ones are added.
          Need the format? Use the <b>Template</b> button on the Locations page.
        </p>
        <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
        <button onClick={() => inputRef.current?.click()} className="btn-secondary btn-sm"><Upload size={14} /> {file ? 'Choose a different file' : 'Choose file'}</button>
        {file && <p className="text-sm text-ink-600">Selected: <b>{file.name}</b></p>}
 
        {previewMut.isPending && <div className="flex items-center gap-2 text-sm text-ink-500"><Spinner size={16} /> Analyzing…</div>}
 
        {s && (
          <div className="rounded-lg border border-ink-200 bg-ink-50/50 p-3 text-sm">
            <p className="font-medium text-ink-800">{s.totalRows} rows read — will add:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="chip bg-brand-50 text-brand-700">{s.newCountries} countries</span>
              <span className="chip bg-brand-50 text-brand-700">{s.newStates} states</span>
              <span className="chip bg-brand-50 text-brand-700">{s.newDistricts} districts</span>
              {s.failed > 0 && <span className="chip bg-red-50 text-red-600">{s.failed} rows with issues</span>}
            </div>
            {s.ignoredColumns?.length > 0 && (
              <p className="mt-2 text-xs text-ink-400">Ignored columns: {s.ignoredColumns.join(', ')}</p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
 
function SimpleNameModal({ title, defaultName, onClose, onSave, saving, placeholder }) {
  const [name, setName] = useState(defaultName || '');
  return (
    <Modal open onClose={onClose} title={title} size="sm"
      footer={<>
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={() => name.trim() && onSave(name.trim())} disabled={saving}>{saving && <Spinner size={16} className="text-white" />} Save</button>
      </>}>
      <label className="label">Name *</label>
      <input autoFocus className="input" value={name} onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) onSave(name.trim()); }}
        placeholder={placeholder || 'e.g. Online'} />
    </Modal>
  );
}
