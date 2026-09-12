import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Users as UsersIcon, ShieldCheck, KeyRound, Plus, Save, Trash2, Ban, CheckCircle2,
  UserPlus, SlidersHorizontal, Copy, X, Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useUsers, useCreateUser, useUpdateUser, useDeleteUser,
  useUserPermissions, useSetUserPermissions,
  useRoleMatrix, useUpdateRole, useSetAllRole, useCopyRole,
  useResetRequests, useResolveReset,
} from '../hooks/useAdmin.js';
import { apiError } from '../lib/api.js';
import { PageLoader } from '../components/ui/Spinner.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import Badge from '../components/ui/Badge.jsx';
import Modal from '../components/ui/Modal.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { useAuth } from '../context/AuthContext.jsx';
 
const ROLES = ['ADMIN', 'MANAGER', 'EMPLOYEE'];
const ROLE_TONE = { ADMIN: 'purple', MANAGER: 'blue', EMPLOYEE: 'gray' };
 
const TABS = [
  { key: 'users', label: 'Users', icon: UsersIcon },
  { key: 'roles', label: 'Role Access', icon: ShieldCheck },
  { key: 'resets', label: 'Reset Requests', icon: KeyRound },
];
 
export default function Users() {
  const { has } = useAuth();
  const [tab, setTab] = useState('users');
  const canEdit = has('users', 'edit');
 
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-ink-900">Users &amp; Roles</h2>
        <p className="mt-0.5 text-sm text-ink-500">Create logins, set role/per-user access, and approve password resets.</p>
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
 
      {tab === 'users' && <UsersTab canEdit={canEdit} canCreate={has('users', 'create')} canDelete={has('users', 'delete')} />}
      {tab === 'roles' && <RolesTab canEdit={canEdit} />}
      {tab === 'resets' && <ResetsTab canEdit={canEdit} />}
    </div>
  );
}
 
/* ============================= Users tab ============================= */
const createSchema = z.object({
  name: z.string().min(2, 'Name required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Min 6 characters'),
  role: z.enum(ROLES),
});
 
function UsersTab({ canEdit, canCreate, canDelete }) {
  const { data: users, isLoading } = useUsers();
  const createMut = useCreateUser();
  const [accessUser, setAccessUser] = useState(null);
 
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(createSchema),
    defaultValues: { role: 'EMPLOYEE' },
  });
 
  const onCreate = async (data) => {
    try {
      await createMut.mutateAsync(data);
      toast.success('Login created');
      reset({ name: '', email: '', password: '', role: 'EMPLOYEE' });
    } catch (e) { toast.error(apiError(e)); }
  };
 
  if (isLoading) return <PageLoader />;
 
  return (
    <div className="space-y-5">
      {/* Add login */}
      {canCreate && (
        <div className="card p-5">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-ink-900"><UserPlus size={16} className="text-brand-600" /> Add login</h3>
          <form onSubmit={handleSubmit(onCreate)} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-1">
              <label className="label text-xs">User Name</label>
              <input className="input" placeholder="Full name" {...register('name')} />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
            </div>
            <div className="lg:col-span-1">
              <label className="label text-xs">Email</label>
              <input className="input" placeholder="user@farminghub.in" {...register('email')} />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>
            <div className="lg:col-span-1">
              <label className="label text-xs">Password</label>
              <input className="input" placeholder="Set a password" {...register('password')} />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>
            <div className="lg:col-span-1">
              <label className="label text-xs">Role</label>
              <select className="input" {...register('role')}>
                {ROLES.map((r) => <option key={r} value={r}>{r[0] + r.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button type="submit" className="btn-primary w-full" disabled={createMut.isPending}>
                {createMut.isPending ? <Spinner size={16} className="text-white" /> : <Plus size={16} />} Add
              </button>
            </div>
          </form>
        </div>
      )}
 
      {/* User list */}
      <div className="card overflow-hidden">
        <div className="hidden grid-cols-12 gap-3 border-b border-ink-100 bg-ink-50/60 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-500 md:grid">
          <div className="col-span-3">User</div>
          <div className="col-span-2">Role</div>
          <div className="col-span-3">Password</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-3 text-right">Actions</div>
        </div>
        <div className="divide-y divide-ink-100">
          {users.map((u) => (
            <UserRow key={u.id} user={u} canEdit={canEdit} canDelete={canDelete} onAccess={() => setAccessUser(u)} />
          ))}
        </div>
      </div>
 
      {accessUser && <UserAccessModal user={accessUser} onClose={() => setAccessUser(null)} />}
    </div>
  );
}
 
function UserRow({ user, canEdit, canDelete, onAccess }) {
  const { user: me } = useAuth();
  const updateMut = useUpdateUser();
  const deleteMut = useDeleteUser();
  const [role, setRole] = useState(user.role);
  const [password, setPassword] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);
  const isSelf = me?.id === user.id;
  const displayRole = ROLES.includes(user.role) ? user.role : user.role; // legacy shown as-is
  const dirty = role !== user.role || password.length > 0;
 
  const save = async () => {
    try {
      await updateMut.mutateAsync({ id: user.id, role, ...(password ? { password } : {}) });
      toast.success('Saved');
      setPassword('');
    } catch (e) { toast.error(apiError(e)); }
  };
  const toggleStatus = async () => {
    try {
      await updateMut.mutateAsync({ id: user.id, isActive: !user.isActive });
      toast.success(user.isActive ? 'Disabled' : 'Enabled');
    } catch (e) { toast.error(apiError(e)); }
  };
 
  return (
    <div className="grid grid-cols-1 gap-2 px-4 py-3 md:grid-cols-12 md:items-center md:gap-3">
      <div className="col-span-3 min-w-0">
        <p className="truncate font-medium text-ink-900">{user.name}{isSelf && <span className="ml-1 text-xs text-ink-400">(you)</span>}</p>
        <p className="truncate text-xs text-ink-500">{user.email}</p>
      </div>
      <div className="col-span-2">
        {canEdit && !isSelf ? (
          <select value={role} onChange={(e) => setRole(e.target.value)} className="input py-1.5 text-sm">
            {ROLES.map((r) => <option key={r} value={r}>{r[0] + r.slice(1).toLowerCase()}</option>)}
            {!ROLES.includes(user.role) && <option value={user.role}>{user.role}</option>}
          </select>
        ) : (
          <Badge tone={ROLE_TONE[displayRole] || 'gray'}>{displayRole[0] + displayRole.slice(1).toLowerCase()}</Badge>
        )}
      </div>
      <div className="col-span-3">
        {canEdit ? (
          <input value={password} onChange={(e) => setPassword(e.target.value)} className="input py-1.5 text-sm"
            placeholder="•••••• (unchanged)" />
        ) : <span className="text-ink-400">••••••</span>}
      </div>
      <div className="col-span-1">
        {user.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="red">Disabled</Badge>}
      </div>
      <div className="col-span-3 flex flex-wrap items-center justify-end gap-1.5">
        {canEdit && (
          <button onClick={onAccess} className="btn-ghost btn-sm text-ink-600" title="Set exact per-module access">
            <SlidersHorizontal size={13} /> Access
          </button>
        )}
        {canEdit && !isSelf && (
          <button onClick={toggleStatus} className="btn-secondary btn-sm" disabled={updateMut.isPending}>
            {user.isActive ? <><Ban size={13} /> Disable</> : <><CheckCircle2 size={13} /> Enable</>}
          </button>
        )}
        {canEdit && (
          <button onClick={save} className="btn-primary btn-sm" disabled={!dirty || updateMut.isPending}>
            <Save size={13} /> Save
          </button>
        )}
        {canDelete && !isSelf && (
          <button onClick={() => setConfirmDel(true)} className="btn-danger btn-sm"><Trash2 size={13} /></button>
        )}
      </div>
 
      <ConfirmDialog
        open={confirmDel}
        onClose={() => setConfirmDel(false)}
        onConfirm={async () => { try { await deleteMut.mutateAsync(user.id); toast.success('User deleted'); setConfirmDel(false); } catch (e) { toast.error(apiError(e)); } }}
        loading={deleteMut.isPending}
        title="Delete user?"
        message={`Delete ${user.name} (${user.email})? This cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
 
/* ====================== Per-user access modal ====================== */
function UserAccessModal({ user, onClose }) {
  const { data, isLoading } = useUserPermissions(user.id);
  const { data: matrix } = useRoleMatrix();
  const setMut = useSetUserPermissions();
  const [perms, setPerms] = useState(null);
  const [override, setOverride] = useState(false);
 
  useEffect(() => {
    if (data) {
      setPerms(structuredClone(data.effective));
      setOverride(!!data.overrides);
    }
  }, [data]);
 
  const modules = matrix?.modules || [];
  const actions = matrix?.actions || ['view', 'create', 'edit', 'delete'];
 
  const toggle = (m, a) => {
    setOverride(true);
    setPerms((p) => ({ ...p, [m]: { ...p[m], [a]: !p[m][a] } }));
  };
 
  const save = async () => {
    try {
      await setMut.mutateAsync({ id: user.id, permissions: override ? perms : null });
      toast.success('Access updated');
      onClose();
    } catch (e) { toast.error(apiError(e)); }
  };
  const resetToRole = async () => {
    try {
      await setMut.mutateAsync({ id: user.id, permissions: null });
      toast.success('Reset to role default');
      onClose();
    } catch (e) { toast.error(apiError(e)); }
  };
 
  const isAdmin = user.role === 'ADMIN';
 
  return (
    <Modal open onClose={onClose} size="lg" title={`Access · ${user.name}`}
      footer={
        <>
          <button className="btn-ghost text-ink-500" onClick={resetToRole} disabled={setMut.isPending || isAdmin}>Reset to role default</button>
          <div className="flex-1" />
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={setMut.isPending || isAdmin}>
            {setMut.isPending && <Spinner size={16} className="text-white" />} Save access
          </button>
        </>
      }>
      {isLoading || !perms ? <div className="py-8 text-center"><Spinner /></div> : (
        <div className="space-y-3">
          <p className="text-sm text-ink-500">
            {isAdmin
              ? 'Admins always have full access — nothing to override.'
              : <>Tick exactly what <b>{user.name}</b> can do per module. This <b>overrides</b> their {user.role.toLowerCase()} role default.
                 {override ? <span className="ml-1 text-amber-600">(custom override active)</span> : <span className="ml-1 text-ink-400">(currently using role default)</span>}</>}
          </p>
          <PermGrid modules={modules} actions={actions} perms={perms} onToggle={toggle} disabled={isAdmin} />
        </div>
      )}
    </Modal>
  );
}
 
/* ============================= Roles tab ============================= */
function RolesTab({ canEdit }) {
  const { data, isLoading } = useRoleMatrix();
  const updateMut = useUpdateRole();
  const setAllMut = useSetAllRole();
  const copyMut = useCopyRole();
  const [draft, setDraft] = useState(null);
  const [copy, setCopy] = useState({ from: 'MANAGER', to: 'EMPLOYEE' });
 
  useEffect(() => { if (data) setDraft(structuredClone(data.matrix)); }, [data]);
 
  if (isLoading || !draft) return <PageLoader />;
  const { modules, actions } = data;
 
  const toggle = (role, m, a) => setDraft((d) => ({ ...d, [role]: { ...d[role], [m]: { ...d[role][m], [a]: !d[role][m][a] } } }));
  const dirty = (role) => JSON.stringify(draft[role]) !== JSON.stringify(data.matrix[role]);
 
  const saveRole = async (role) => {
    try { await updateMut.mutateAsync({ role, permissions: draft[role] }); toast.success(`${role} access saved`); }
    catch (e) { toast.error(apiError(e)); }
  };
  const setAll = async (role, value) => {
    try { await setAllMut.mutateAsync({ role, value }); toast.success(`${role} — all ${value ? 'granted' : 'revoked'}`); }
    catch (e) { toast.error(apiError(e)); }
  };
  const doCopy = async () => {
    try { await copyMut.mutateAsync(copy); toast.success(`Copied ${copy.from} → ${copy.to}`); }
    catch (e) { toast.error(apiError(e)); }
  };
 
  return (
    <div className="space-y-5">
      {/* Copy role */}
      {canEdit && (
        <div className="card flex flex-wrap items-end gap-3 p-4">
          <div>
            <label className="label text-xs">Copy access from</label>
            <select className="input" value={copy.from} onChange={(e) => setCopy((c) => ({ ...c, from: e.target.value }))}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">onto</label>
            <select className="input" value={copy.to} onChange={(e) => setCopy((c) => ({ ...c, to: e.target.value }))}>
              {ROLES.filter((r) => r !== 'ADMIN').map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <button className="btn-secondary" onClick={doCopy} disabled={copyMut.isPending}><Copy size={15} /> Copy</button>
        </div>
      )}
 
      {/* One editable card per role */}
      {ROLES.map((role) => {
        const isAdmin = role === 'ADMIN';
        return (
          <div key={role} className="card p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-semibold text-ink-900">
                <Badge tone={ROLE_TONE[role]}>{role}</Badge>
                {isAdmin && <span className="text-xs text-ink-400">full access (locked)</span>}
              </h3>
              {canEdit && !isAdmin && (
                <div className="flex items-center gap-2">
                  <button className="btn-ghost btn-sm text-ink-500" onClick={() => setAll(role, true)}>Set all ✓</button>
                  <button className="btn-ghost btn-sm text-ink-500" onClick={() => setAll(role, false)}>Set all ✗</button>
                  <button className="btn-primary btn-sm" onClick={() => saveRole(role)} disabled={!dirty(role) || updateMut.isPending}>
                    <Save size={13} /> Save
                  </button>
                </div>
              )}
            </div>
            <PermGrid modules={modules} actions={actions} perms={draft[role]}
              onToggle={(m, a) => toggle(role, m, a)} disabled={isAdmin || !canEdit} />
          </div>
        );
      })}
    </div>
  );
}
 
/* ====================== Reusable permission grid ====================== */
function PermGrid({ modules, actions, perms, onToggle, disabled }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400">
            <th className="py-2 pr-3 font-semibold">Module</th>
            {actions.map((a) => <th key={a} className="px-2 py-2 text-center font-semibold">{a}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-50">
          {modules.map((m) => (
            <tr key={m.key}>
              <td className="py-2 pr-3 font-medium text-ink-800">{m.label}</td>
              {actions.map((a) => (
                <td key={a} className="px-2 py-2 text-center">
                  <button type="button" disabled={disabled} onClick={() => onToggle(m.key, a)}
                    className={`grid h-6 w-6 place-items-center rounded border transition-colors ${
                      perms?.[m.key]?.[a]
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : 'border-ink-300 bg-white text-transparent hover:border-brand-400'
                    } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}>
                    <Check size={14} />
                  </button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
 
/* ========================= Reset requests tab ========================= */
function ResetsTab({ canEdit }) {
  const { data: requests, isLoading } = useResetRequests('PENDING');
  const resolveMut = useResolveReset();
 
  if (isLoading) return <PageLoader />;
 
  const resolve = async (id, action) => {
    try { await resolveMut.mutateAsync({ id, action }); toast.success(action === 'approve' ? 'Approved & applied' : 'Rejected'); }
    catch (e) { toast.error(apiError(e)); }
  };
 
  if (!requests.length) {
    return <EmptyState icon={KeyRound} title="No pending requests" message="Password-reset requests from users will appear here for your approval." />;
  }
 
  return (
    <div className="card divide-y divide-ink-100">
      {requests.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center gap-3 p-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-50 text-amber-600"><KeyRound size={18} /></div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-ink-900">{r.user.name} <span className="text-sm font-normal text-ink-400">· {r.user.email}</span></p>
            <p className="text-xs text-ink-500">
              Requested {new Date(r.requestedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              {r.note ? ` · "${r.note}"` : ''}
            </p>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <button className="btn-secondary btn-sm" onClick={() => resolve(r.id, 'reject')} disabled={resolveMut.isPending}><X size={14} /> Reject</button>
              <button className="btn-primary btn-sm" onClick={() => resolve(r.id, 'approve')} disabled={resolveMut.isPending}><Check size={14} /> Approve</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
