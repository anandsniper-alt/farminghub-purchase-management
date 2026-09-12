import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2, Boxes, Users, Layers, FolderPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCategories, useSaveCategory, useDeleteCategory } from '../hooks/useTaxonomies.js';
import { useCategoryGroups, useSaveCategoryGroup, useDeleteCategoryGroup } from '../hooks/useLookups.js';
import { apiError } from '../lib/api.js';
import { PageLoader } from '../components/ui/Spinner.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Modal from '../components/ui/Modal.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import { useAuth } from '../context/AuthContext.jsx';
 
export default function Categories() {
  const { has } = useAuth();
  const { data: groups, isLoading: lg } = useCategoryGroups();
  const { data: categories, isLoading: lc } = useCategories();
  const saveCat = useSaveCategory();
  const delCat = useDeleteCategory();
  const saveGroup = useSaveCategoryGroup();
  const delGroup = useDeleteCategoryGroup();
 
  const [catModal, setCatModal] = useState(null); // {groupId?} | category
  const [groupModal, setGroupModal] = useState(null);
  const [delCatTarget, setDelCatTarget] = useState(null);
  const [delGroupTarget, setDelGroupTarget] = useState(null);
  const canManage = has('products', 'create') || has('products', 'edit') || has('products', 'delete');
  const canDelete = has('products', 'delete');
 
  if (lg || lc) return <PageLoader />;
 
  const ungrouped = (categories || []).filter((c) => !c.groupId);
 
  const saveCategory = async (data) => {
    try {
      await saveCat.mutateAsync(catModal.id ? { id: catModal.id, ...data } : data);
      toast.success(catModal.id ? 'Updated' : 'Product line added');
      setCatModal(null);
    } catch (e) { toast.error(apiError(e)); }
  };
  const saveGroupFn = async (data) => {
    try {
      await saveGroup.mutateAsync(groupModal.id ? { id: groupModal.id, ...data } : data);
      toast.success(groupModal.id ? 'Group updated' : 'Group added');
      setGroupModal(null);
    } catch (e) { toast.error(apiError(e)); }
  };
 
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-ink-900">Product Lines</h2>
          <p className="mt-0.5 text-sm text-ink-500">What Farming Hub manufactures, organised into groups (Utilities, LAE, Implements…).</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <button onClick={() => setGroupModal({})} className="btn-secondary"><FolderPlus size={16} /> Add Group</button>
            <button onClick={() => setCatModal({})} className="btn-primary"><Plus size={16} /> Add Product Line</button>
          </div>
        )}
      </div>
 
      {(!groups || groups.length === 0) && ungrouped.length === 0 ? (
        <EmptyState icon={Boxes} title="No product lines" message="Create a group, then add product lines under it." />
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.id} className="card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-semibold text-ink-900">
                  <Layers size={16} className="text-brand-600" /> {g.name}
                  <span className="chip bg-ink-100 text-ink-500">{g.categories.length}</span>
                </h3>
                {canManage && (
                  <div className="flex gap-1">
                    <button onClick={() => setCatModal({ groupId: g.id })} className="btn-ghost btn-sm text-brand-600"><Plus size={14} /> Line</button>
                    <button onClick={() => setGroupModal(g)} className="rounded p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"><Pencil size={14} /></button>
                    {canDelete && <button onClick={() => setDelGroupTarget(g)} className="rounded p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>}
                  </div>
                )}
              </div>
              {g.categories.length === 0 ? (
                <p className="py-3 text-center text-sm text-ink-400">No product lines in this group yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {g.categories.map((c) => (
                    <LineChip key={c.id} c={c} canManage={canManage} canDelete={canDelete}
                      onEdit={() => setCatModal(c)} onDelete={() => setDelCatTarget(c)} />
                  ))}
                </div>
              )}
            </div>
          ))}
 
          {ungrouped.length > 0 && (
            <div className="card p-5">
              <h3 className="mb-3 flex items-center gap-2 font-semibold text-ink-500">
                <Layers size={16} /> Ungrouped
                <span className="chip bg-ink-100 text-ink-500">{ungrouped.length}</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {ungrouped.map((c) => (
                  <LineChip key={c.id} c={c} canManage={canManage} canDelete={canDelete}
                    onEdit={() => setCatModal(c)} onDelete={() => setDelCatTarget(c)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
 
      {catModal && (
        <CategoryModal
          category={catModal.id ? catModal : null}
          defaultGroupId={catModal.groupId || ''}
          groups={groups || []}
          saving={saveCat.isPending}
          onClose={() => setCatModal(null)}
          onSave={saveCategory}
        />
      )}
      {groupModal && (
        <GroupModal group={groupModal.id ? groupModal : null} saving={saveGroup.isPending}
          onClose={() => setGroupModal(null)} onSave={saveGroupFn} />
      )}
 
      <ConfirmDialog open={!!delCatTarget} onClose={() => setDelCatTarget(null)}
        onConfirm={async () => { try { await delCat.mutateAsync(delCatTarget.id); toast.success('Deleted'); setDelCatTarget(null); } catch (e) { toast.error(apiError(e)); } }}
        loading={delCat.isPending} title="Delete product line?" message={`Delete "${delCatTarget?.name}"?`} confirmLabel="Delete" />
 
      <ConfirmDialog open={!!delGroupTarget} onClose={() => setDelGroupTarget(null)}
        onConfirm={async () => { try { await delGroup.mutateAsync(delGroupTarget.id); toast.success('Group deleted'); setDelGroupTarget(null); } catch (e) { toast.error(apiError(e)); } }}
        loading={delGroup.isPending} title="Delete group?" message={`Delete group "${delGroupTarget?.name}"? Its product lines become ungrouped.`} confirmLabel="Delete" />
    </div>
  );
}
 
function LineChip({ c, canManage, canDelete, onEdit, onDelete }) {
  return (
    <div className="group flex items-center gap-2 rounded-lg border border-ink-200 bg-white py-2 pl-3 pr-2 shadow-card">
      <Boxes size={15} className="text-amber-500" />
      <span className="font-medium text-ink-800">{c.name}</span>
      <span className="chip bg-ink-100 text-ink-500"><Users size={11} /> {c._count?.vendors ?? 0}</span>
      {canManage && (
        <span className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button onClick={onEdit} className="rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700"><Pencil size={13} /></button>
          {canDelete && <button onClick={onDelete} className="rounded p-1 text-ink-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={13} /></button>}
        </span>
      )}
    </div>
  );
}
 
function CategoryModal({ category, defaultGroupId, groups, onClose, onSave, saving }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name: category?.name || '',
      description: category?.description || '',
      groupId: category?.groupId || defaultGroupId || '',
    },
  });
  const submit = (d) => onSave({ ...d, groupId: d.groupId || null });
  return (
    <Modal open onClose={onClose} title={category ? 'Edit product line' : 'Add product line'} size="sm"
      footer={<>
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={handleSubmit(submit)} disabled={saving}>{saving && <Spinner size={16} className="text-white" />} Save</button>
      </>}>
      <div className="space-y-4">
        <div>
          <label className="label">Name *</label>
          <input className="input" placeholder="Tarpaulin, Shadenet…" {...register('name', { required: 'Required' })} />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <label className="label">Group</label>
          <select className="input" {...register('groupId')}>
            <option value="">— Ungrouped —</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea rows={2} className="input" {...register('description')} />
        </div>
      </div>
    </Modal>
  );
}
 
function GroupModal({ group, onClose, onSave, saving }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { name: group?.name || '', order: group?.order ?? 0 },
  });
  return (
    <Modal open onClose={onClose} title={group ? 'Edit group' : 'Add group'} size="sm"
      footer={<>
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={handleSubmit(onSave)} disabled={saving}>{saving && <Spinner size={16} className="text-white" />} Save</button>
      </>}>
      <div className="space-y-4">
        <div>
          <label className="label">Group name *</label>
          <input className="input" placeholder="Utilities, LAE, Implements…" {...register('name', { required: 'Required' })} />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <label className="label">Display order</label>
          <input type="number" className="input" {...register('order')} />
        </div>
      </div>
    </Modal>
  );
}
