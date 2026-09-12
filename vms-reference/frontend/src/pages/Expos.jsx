import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, CalendarDays, MapPin, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useExpos, useSaveExpo, useDeleteExpo } from '../hooks/useTaxonomies.js';
import { apiError } from '../lib/api.js';
import { PageLoader } from '../components/ui/Spinner.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Modal from '../components/ui/Modal.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import { useAuth } from '../context/AuthContext.jsx';
 
const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  edition: z.string().optional(),
  year: z.union([z.string(), z.number()]).optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional(),
});
 
export default function Expos() {
  const { has } = useAuth();
  const { data: expos, isLoading } = useExpos();
  const saveMut = useSaveExpo();
  const deleteMut = useDeleteExpo();
  const [modal, setModal] = useState(null); // null | {} | expo
  const [toDelete, setToDelete] = useState(null);
  const canManage = has('expos', 'create') || has('expos', 'edit') || has('expos', 'delete');
 
  if (isLoading) return <PageLoader />;
 
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-ink-900">Expos & Fairs</h2>
          <p className="mt-0.5 text-sm text-ink-500">Sourcing trips your contacts came from.</p>
        </div>
        {canManage && (
          <button onClick={() => setModal({})} className="btn-primary">
            <Plus size={16} /> Add Expo
          </button>
        )}
      </div>
 
      {expos.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No expos yet"
          message="Add Canton Fair, Intex or any fair you sourced from."
          action={canManage && <button onClick={() => setModal({})} className="btn-primary btn-sm"><Plus size={14} /> Add Expo</button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {expos.map((e) => (
            <div key={e.id} className="card group p-5">
              <div className="flex items-start justify-between">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-600">
                  <CalendarDays size={20} />
                </div>
                {canManage && (
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button onClick={() => setModal(e)} className="rounded p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"><Pencil size={15} /></button>
                    <button onClick={() => setToDelete(e)} className="rounded p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
                  </div>
                )}
              </div>
              <h3 className="mt-3 font-semibold text-ink-900">{e.name}</h3>
              <p className="text-sm text-ink-500">
                {[e.edition, e.year].filter(Boolean).join(' · ') || 'No edition/year'}
              </p>
              <div className="mt-3 flex items-center gap-3 text-xs text-ink-500">
                {(e.city || e.country) && (
                  <span className="flex items-center gap-1"><MapPin size={12} /> {[e.city, e.country].filter(Boolean).join(', ')}</span>
                )}
                <span className="flex items-center gap-1"><Users size={12} /> {e._count?.vendors ?? 0} vendors</span>
              </div>
            </div>
          ))}
        </div>
      )}
 
      {modal && (
        <ExpoModal
          expo={modal.id ? modal : null}
          onClose={() => setModal(null)}
          onSave={async (data) => {
            try {
              await saveMut.mutateAsync(modal.id ? { id: modal.id, ...data } : data);
              toast.success(modal.id ? 'Expo updated' : 'Expo added');
              setModal(null);
            } catch (e) {
              toast.error(apiError(e));
            }
          }}
          saving={saveMut.isPending}
        />
      )}
 
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          try {
            await deleteMut.mutateAsync(toDelete.id);
            toast.success('Expo deleted');
            setToDelete(null);
          } catch (e) {
            toast.error(apiError(e));
          }
        }}
        loading={deleteMut.isPending}
        title="Delete expo?"
        message={`Delete "${toDelete?.name}"? Vendors will keep their records but lose this source link.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
 
function ExpoModal({ expo, onClose, onSave, saving }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: expo?.name || '', edition: expo?.edition || '', year: expo?.year || '',
      city: expo?.city || '', country: expo?.country || '', notes: expo?.notes || '',
    },
  });
 
  const submit = (d) =>
    onSave({ ...d, year: d.year ? Number(d.year) : null, edition: d.edition || null });
 
  return (
    <Modal
      open
      onClose={onClose}
      title={expo ? 'Edit expo' : 'Add expo'}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit(submit)} disabled={saving}>
            {saving && <Spinner size={16} className="text-white" />} Save
          </button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Expo name *</label>
          <input className="input" placeholder="Canton Fair" {...register('name')} />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <label className="label">Edition</label>
          <input className="input" placeholder="137th" {...register('edition')} />
        </div>
        <div>
          <label className="label">Year</label>
          <input type="number" className="input" placeholder="2025" {...register('year')} />
        </div>
        <div>
          <label className="label">City</label>
          <input className="input" placeholder="Guangzhou" {...register('city')} />
        </div>
        <div>
          <label className="label">Country</label>
          <input className="input" placeholder="China" {...register('country')} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Notes</label>
          <textarea rows={2} className="input" {...register('notes')} />
        </div>
      </div>
    </Modal>
  );
}
