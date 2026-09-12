import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2, Tags, Users, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useComponents, useSaveComponent, useDeleteComponent } from '../hooks/useTaxonomies.js';
import { apiError } from '../lib/api.js';
import { PageLoader } from '../components/ui/Spinner.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Modal from '../components/ui/Modal.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import { useAuth } from '../context/AuthContext.jsx';
 
export default function Components() {
  const { has } = useAuth();
  const { data: components, isLoading } = useComponents();
  const saveMut = useSaveComponent();
  const deleteMut = useDeleteComponent();
  const [modal, setModal] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [q, setQ] = useState('');
  const canManage = has('components', 'create') || has('components', 'edit') || has('components', 'delete');
 
  if (isLoading) return <PageLoader />;
 
  const filtered = components.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));
 
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-ink-900">Component Tags</h2>
          <p className="mt-0.5 text-sm text-ink-500">Products/components suppliers are tagged with (Engine, Water Pump…).</p>
        </div>
        {canManage && (
          <button onClick={() => setModal({})} className="btn-primary"><Plus size={16} /> Add Tag</button>
        )}
      </div>
 
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tags…" className="input pl-9" />
      </div>
 
      {filtered.length === 0 ? (
        <EmptyState icon={Tags} title="No component tags" message="Add tags like Engine, Water Pump, Gearbox." />
      ) : (
        <div className="flex flex-wrap gap-2">
          {filtered.map((c) => (
            <div key={c.id} className="group flex items-center gap-2 rounded-lg border border-ink-200 bg-white py-2 pl-3 pr-2 shadow-card">
              <Tags size={15} className="text-brand-600" />
              <span className="font-medium text-ink-800">{c.name}</span>
              <span className="chip bg-ink-100 text-ink-500"><Users size={11} /> {c._count?.vendors ?? 0}</span>
              {canManage && (
                <span className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button onClick={() => setModal(c)} className="rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700"><Pencil size={13} /></button>
                  <button onClick={() => setToDelete(c)} className="rounded p-1 text-ink-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={13} /></button>
                </span>
              )}
            </div>
          ))}
        </div>
      )}
 
      {modal && (
        <ComponentModal
          component={modal.id ? modal : null}
          saving={saveMut.isPending}
          onClose={() => setModal(null)}
          onSave={async (data) => {
            try {
              await saveMut.mutateAsync(modal.id ? { id: modal.id, ...data } : data);
              toast.success(modal.id ? 'Updated' : 'Added');
              setModal(null);
            } catch (e) { toast.error(apiError(e)); }
          }}
        />
      )}
 
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          try {
            await deleteMut.mutateAsync(toDelete.id);
            toast.success('Deleted');
            setToDelete(null);
          } catch (e) { toast.error(apiError(e)); }
        }}
        loading={deleteMut.isPending}
        title="Delete component tag?"
        message={`Delete "${toDelete?.name}"? It will be removed from all vendors.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
 
function ComponentModal({ component, onClose, onSave, saving }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { name: component?.name || '' },
  });
  return (
    <Modal
      open onClose={onClose} title={component ? 'Edit tag' : 'Add component tag'} size="sm"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit(onSave)} disabled={saving}>
            {saving && <Spinner size={16} className="text-white" />} Save
          </button>
        </>
      }
    >
      <label className="label">Tag name *</label>
      <input className="input" placeholder="Engine" {...register('name', { required: 'Required' })} />
      {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
    </Modal>
  );
}
