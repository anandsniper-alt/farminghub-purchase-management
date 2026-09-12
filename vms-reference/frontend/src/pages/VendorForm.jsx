import { useEffect, useState, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Trash2, Save, UserPlus, Camera, Upload, X, WifiOff, ChevronDown, ChevronRight, Gauge } from 'lucide-react';
import toast from 'react-hot-toast';
import { useVendor, useCreateVendor, useUpdateVendor, useUploadPhotos } from '../hooks/useVendors.js';
import { useExpos, useComponents, useCategories } from '../hooks/useTaxonomies.js';
import { useStages, useProductLines, useAssignableUsers } from '../hooks/useLookups.js';
import { useCountries, useStates, useDistricts } from '../hooks/useGeo.js';
import { apiError } from '../lib/api.js';
import { expoLabel } from '../lib/format.js';
import { EVALUATION_CRITERIA, EVALUATION_KEYS, computeEvaluation } from '../lib/evaluation.js';
import { PageLoader } from '../components/ui/Spinner.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import Badge from '../components/ui/Badge.jsx';
import TagPicker from '../components/ui/TagPicker.jsx';
import MultiSelect from '../components/ui/MultiSelect.jsx';
import { RatingInput } from '../components/ui/Rating.jsx';
import { useSyncState } from '../hooks/useSyncState.js';
import { enqueueVendor, enqueueVendorEdit } from '../offline/db.js';
import { notifyQueued } from '../offline/sync.js';
 
const emptyEval = () => Object.fromEntries(EVALUATION_KEYS.map((k) => [k, 0]));
 
const schema = z.object({
  name: z.string().min(1, 'Contact name is required'),
  designation: z.string().optional(),
  companyName: z.string().optional(),
  phone: z.string().optional(),
  wechat: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  website: z.string().optional(),
  productLineId: z.string().optional(),
  countryId: z.string().optional(),
  stateId: z.string().optional(),
  districtId: z.string().optional(),
  assignedToId: z.string().optional(),
  expoId: z.string().optional(),
  stageId: z.string().optional(),
  annualVolume: z.string().optional(),
  status: z.string().optional(),
  remarks: z.string().optional(),
  contacts: z.array(
    z.object({
      name: z.string().optional(),
      phone: z.string().optional(),
      designation: z.string().optional(),
    })
  ),
});
 
const Section = ({ title, description, children }) => (
  <div className="card p-5">
    <div className="mb-4">
      <h3 className="font-semibold text-ink-900">{title}</h3>
      {description && <p className="text-sm text-ink-500">{description}</p>}
    </div>
    {children}
  </div>
);
 
const Field = ({ label, error, children, className = '' }) => (
  <div className={className}>
    <label className="label">{label}</label>
    {children}
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);
 
export default function VendorForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
 
  const { data: vendor, isLoading: loadingVendor } = useVendor(id);
  const { data: expos = [] } = useExpos();
  const { data: components = [] } = useComponents();
  const { data: categories = [] } = useCategories();
  const { data: stages = [] } = useStages();
  const { data: productLines = [] } = useProductLines();
  const { data: countries = [] } = useCountries();
  const { data: assignableUsers = [] } = useAssignableUsers();
 
  const createMut = useCreateVendor();
  const updateMut = useUpdateVendor();
  const uploadMut = useUploadPhotos();
  const { online } = useSyncState();
 
  const [tags, setTags] = useState({ ids: [], names: [] });
  const [categoryIds, setCategoryIds] = useState([]);
  const [evalScores, setEvalScores] = useState(emptyEval());
  const [tagsOpen, setTagsOpen] = useState(false); // component tags collapsed by default
  const [photos, setPhotos] = useState([]); // { file, url, caption } — captured in-form (works offline)
  const fileRef = useRef(null);
  const cameraRef = useRef(null);
 
  const {
    register, handleSubmit, control, reset, watch, setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '', productLineId: '', countryId: '', stateId: '', districtId: '', assignedToId: '',
      status: 'ACTIVE', contacts: [],
    },
  });
 
  const contactsArr = useFieldArray({ control, name: 'contacts' });
  const evalResult = computeEvaluation(evalScores);
 
  // Cascading location: state list depends on country, district list on state.
  const countryId = watch('countryId');
  const stateId = watch('stateId');
  const { data: states = [] } = useStates(countryId);
  const { data: districts = [] } = useDistricts(stateId);
  // Capture register handlers so we can clear child selects when a parent changes.
  const countryReg = register('countryId');
  const stateReg = register('stateId');
 
  useEffect(() => {
    if (!vendor) return;
    reset({
      name: vendor.name || '',
      designation: vendor.designation || '',
      companyName: vendor.companyName || '',
      phone: vendor.phone || '',
      wechat: vendor.wechat || '',
      email: vendor.email || '',
      website: vendor.website || '',
      productLineId: vendor.productLineId || '',
      countryId: vendor.countryId || '',
      stateId: vendor.stateId || '',
      districtId: vendor.districtId || '',
      assignedToId: vendor.assignedToId || '',
      expoId: vendor.expoId || '',
      stageId: vendor.stageId || '',
      annualVolume: vendor.annualVolume || '',
      status: vendor.status || 'ACTIVE',
      remarks: vendor.remarks || '',
      contacts: (vendor.contacts || []).map((c) => ({
        name: c.name || '', phone: c.phone || '', designation: c.designation || '',
      })),
    });
    setTags({ ids: vendor.components?.map((c) => c.id) || [], names: [] });
    setCategoryIds(vendor.categories?.map((c) => c.id) || []);
    setEvalScores(Object.fromEntries(EVALUATION_KEYS.map((k) => [k, vendor[k] || 0])));
  }, [vendor, reset]);
 
  const onSubmit = async (form) => {
    const payload = {
      ...form,
      email: form.email || undefined,
      expoId: form.expoId || null,
      stageId: form.stageId || null,
      productLineId: form.productLineId || null,
      countryId: form.countryId || null,
      stateId: form.stateId || null,
      districtId: form.districtId || null,
      assignedToId: form.assignedToId || null,
      // Evaluation criteria (0 = not rated → null); overall/grade computed server-side
      ...Object.fromEntries(EVALUATION_KEYS.map((k) => [k, evalScores[k] ? evalScores[k] : null])),
      componentIds: tags.ids,
      componentNames: tags.names,
      categoryIds,
      contacts: (form.contacts || [])
        .filter((c) => c.name && c.name.trim())
        .map((c, i) => ({ name: c.name.trim(), phone: c.phone || undefined, designation: c.designation || undefined, order: i })),
    };
 
    // ----- EDIT -----
    if (isEdit) {
      const queueEdit = async () => {
        await enqueueVendorEdit(id, payload, { name: payload.name, companyName: payload.companyName });
        await notifyQueued();
        toast.success('Saved offline — changes will sync when you\'re back online', { icon: '📥' });
        navigate(`/vendors/${id}`);
      };
      if (!navigator.onLine) return queueEdit();
      try {
        await updateMut.mutateAsync({ id, ...payload });
        toast.success('Vendor updated');
        navigate(`/vendors/${id}`);
      } catch (e) {
        if (!e?.response) return queueEdit(); // network dropped mid-request
        toast.error(apiError(e, 'Could not save vendor'));
      }
      return;
    }
 
    // ----- CREATE -----
    const districtName = districts.find((d) => d.id === payload.districtId)?.name;
    const preview = {
      name: payload.name,
      companyName: payload.companyName,
      city: districtName,
      components: [...(tags.names || []), ...components.filter((c) => tags.ids.includes(c.id)).map((c) => c.name)],
      photoCount: photos.length,
    };
 
    const queueOffline = async () => {
      const photoRecords = photos.map((p) => ({
        blob: p.file, name: p.file.name, type: p.file.type, typeLabel: 'Product', caption: p.caption || undefined,
      }));
      await enqueueVendor(payload, photoRecords, preview);
      await notifyQueued();
      toast.success('Saved offline — will sync when you\'re back online', { icon: '📥' });
      navigate('/pending');
    };
 
    // Offline → queue immediately
    if (!navigator.onLine) return queueOffline();
 
    // Online → create, then upload photos
    try {
      const created = await createMut.mutateAsync(payload);
      if (photos.length) {
        try {
          await uploadMut.mutateAsync({ vendorId: created.id, files: photos.map((p) => p.file), typeLabel: 'Product' });
        } catch {
          toast('Vendor saved; some photos will need re-uploading', { icon: '⚠️' });
        }
      }
      toast.success('Vendor added');
      navigate(`/vendors/${created.id}`);
    } catch (e) {
      // Network failure mid-request → fall back to offline queue
      if (!e?.response) return queueOffline();
      toast.error(apiError(e, 'Could not save vendor'));
    }
  };
 
  const addPhotos = (list) => {
    const files = Array.from(list || []);
    setPhotos((prev) => [...prev, ...files.map((file) => ({ file, url: URL.createObjectURL(file), caption: '' }))]);
  };
  const removePhoto = (i) => setPhotos((prev) => prev.filter((_, idx) => idx !== i));
 
  if (isEdit && loadingVendor) return <PageLoader />;
  const saving = createMut.isPending || updateMut.isPending;
 
  return (
    <form onSubmit={handleSubmit(onSubmit)} autoComplete="off" className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <Link to={isEdit ? `/vendors/${id}` : '/vendors'} className="btn-ghost btn-sm text-ink-600">
          <ArrowLeft size={16} /> Back
        </Link>
        <div className="flex gap-2">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <Spinner size={16} className="text-white" /> : <Save size={16} />}
            {isEdit ? 'Save changes' : 'Create vendor'}
          </button>
        </div>
      </div>
 
      <h2 className="text-xl font-bold text-ink-900">{isEdit ? 'Edit vendor' : 'New vendor'}</h2>
 
      {!online && !isEdit && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <WifiOff size={16} className="shrink-0" />
          You're offline. This vendor (and photos) will be saved on your device and synced automatically when you reconnect.
        </div>
      )}
 
      {/* Primary contact */}
      <Section title="Vendor & primary contact" description="Main contact person and company.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Product Line">
            <select className="input" {...register('productLineId')}>
              <option value="">— Select —</option>
              {productLines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Contact name *" error={errors.name?.message}>
            <input className="input" placeholder="e.g. Mr. Li Wei" {...register('name')} />
          </Field>
          <Field label="Designation" error={errors.designation?.message}>
            <input className="input" placeholder="e.g. MD, Sales Director" {...register('designation')} />
          </Field>
          <Field label="Company name" error={errors.companyName?.message}>
            <input className="input" placeholder="e.g. Taizhou Green Agro Co." {...register('companyName')} />
          </Field>
          <Field label="Phone" error={errors.phone?.message}>
            <input className="input" placeholder="+86 …" {...register('phone')} />
          </Field>
          <Field label="WeChat ID" error={errors.wechat?.message}>
            <input className="input" placeholder="wechat_id" {...register('wechat')} />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <input className="input" placeholder="sales@example.com" {...register('email')} />
          </Field>
          <Field label="Website" error={errors.website?.message}>
            <input className="input" placeholder="example.com" {...register('website')} />
          </Field>
        </div>
      </Section>
 
      {/* Additional contacts */}
      <Section title="Additional contacts" description="Other people at this supplier (name, number, designation).">
        <div className="space-y-3">
          {contactsArr.fields.length === 0 && (
            <div className="rounded-lg border border-dashed border-ink-200 py-5 text-center text-sm text-ink-400">
              No additional contacts.
            </div>
          )}
          {contactsArr.fields.map((field, idx) => (
            <div key={field.id} className="grid gap-3 rounded-lg border border-ink-200 bg-ink-50/40 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <div>
                <label className="label text-xs">Contact name</label>
                <input className="input" placeholder="e.g. BBB" {...register(`contacts.${idx}.name`)} />
              </div>
              <div>
                <label className="label text-xs">Contact no.</label>
                <input className="input" placeholder="+86 …" {...register(`contacts.${idx}.phone`)} />
              </div>
              <div>
                <label className="label text-xs">Designation</label>
                <input className="input" placeholder="e.g. Managing Partner" {...register(`contacts.${idx}.designation`)} />
              </div>
              <div className="flex items-end">
                <button type="button" onClick={() => contactsArr.remove(idx)} className="btn-ghost btn-sm text-red-500">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => contactsArr.append({ name: '', phone: '', designation: '' })}
          className="btn-secondary btn-sm mt-3"
        >
          <UserPlus size={14} /> Add contact
        </button>
      </Section>
 
      {/* Location, source & stage */}
      <Section title="Location, source & stage">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Country">
            <select
              className="input"
              autoComplete="off"
              {...countryReg}
              onChange={(e) => { countryReg.onChange(e); setValue('stateId', ''); setValue('districtId', ''); }}
            >
              <option value="">— Select —</option>
              {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="State">
            <select
              className="input"
              autoComplete="off"
              disabled={!countryId}
              {...stateReg}
              onChange={(e) => { stateReg.onChange(e); setValue('districtId', ''); }}
            >
              <option value="">{countryId ? '— Select —' : 'Select a country first'}</option>
              {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="City / District">
            {/* autoComplete off so the browser can't silently pick a saved home city */}
            <select className="input" autoComplete="off" disabled={!stateId} {...register('districtId')}>
              <option value="">{stateId ? '— No Fill —' : 'Select a state first'}</option>
              {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Expo / Fair">
            <select className="input" {...register('expoId')}>
              <option value="">— None —</option>
              {expos.map((e) => <option key={e.id} value={e.id}>{expoLabel(e)}</option>)}
            </select>
          </Field>
          <Field label="Stage">
            <select className="input" {...register('stageId')}>
              <option value="">— Not set —</option>
              {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Assigned to">
            <select className="input" {...register('assignedToId')}>
              <option value="">— Unassigned —</option>
              {assignableUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </Field>
        </div>
        <p className="mt-2 text-xs text-ink-400">
          Manage stages, product lines & locations in <Link to="/settings" className="text-brand-600 hover:underline">Settings</Link> and{' '}
          <Link to="/expos" className="text-brand-600 hover:underline">Expos</Link>.
        </p>
      </Section>
 
      {/* Tags */}
      <Section title="Product lines & components" description="What this supplier can provide.">
        <Field label="Product categories this supplier serves">
          <MultiSelect options={categories} value={categoryIds} onChange={setCategoryIds}
            placeholder="Select product categories…" />
        </Field>
 
        {/* Component tags — collapsed by default */}
        <div className="mt-4 rounded-lg border border-ink-200">
          <button
            type="button"
            onClick={() => setTagsOpen((o) => !o)}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-ink-700 hover:bg-ink-50"
          >
            {tagsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            Component Tags
            {tags.ids.length > 0 && <span className="chip bg-brand-50 text-brand-700">{tags.ids.length}</span>}
            <span className="ml-auto text-xs font-normal text-ink-400">optional</span>
          </button>
          {tagsOpen && (
            <div className="border-t border-ink-100 p-3">
              <TagPicker options={components} valueIds={tags.ids} valueNames={tags.names} onChange={setTags} />
            </div>
          )}
        </div>
      </Section>
 
      {/* Evaluation */}
      <Section title="Vendor evaluation" description="Rate each criterion 1–5. The overall rating, grade and status are calculated automatically.">
        <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
          <div className="space-y-2">
            {EVALUATION_CRITERIA.map((c) => (
              <div key={c.key} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink-100 bg-ink-50/40 px-3 py-2">
                <div className="min-w-0">
                  <span className="text-sm font-medium text-ink-800">{c.label}</span>
                  <span className="ml-2 text-xs text-ink-400">{Math.round(c.weight * 100)}%</span>
                </div>
                <RatingInput size={18} value={evalScores[c.key] || 0} onChange={(v) => setEvalScores((s) => ({ ...s, [c.key]: v }))} />
              </div>
            ))}
          </div>
 
          {/* Live result card */}
          <div className="h-fit rounded-xl border border-ink-200 bg-white p-4 lg:sticky lg:top-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink-700">
              <Gauge size={16} className="text-brand-600" /> Auto evaluation
            </div>
            {evalResult.overallRating == null ? (
              <p className="mt-3 text-sm text-ink-400">Rate at least one criterion to see the score.</p>
            ) : (
              <div className="mt-3 space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-ink-900">{evalResult.overallRating.toFixed(2)}</span>
                  <span className="text-sm text-ink-400">/ 5</span>
                </div>
                <div className="text-sm text-ink-600">{evalResult.overallPercentage}%</div>
                <div className="flex items-center gap-2">
                  <Badge tone={evalResult.tone}>{evalResult.grade}</Badge>
                  <span className="text-sm font-medium text-ink-700">{evalResult.status}</span>
                </div>
                <p className="pt-1 text-xs text-ink-400">{evalResult.ratedCount}/{EVALUATION_CRITERIA.length} criteria rated{evalResult.ratedCount < EVALUATION_CRITERIA.length ? ' (weighted over rated only)' : ''}.</p>
              </div>
            )}
          </div>
        </div>
 
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Annual production volume">
            <input className="input" placeholder="e.g. 80,000 units/yr or USD 3M" {...register('annualVolume')} />
          </Field>
          <Field label="Record status">
            <select className="input" {...register('status')}>
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
              <option value="BLACKLISTED">Blacklisted</option>
            </select>
          </Field>
        </div>
      </Section>
 
      {/* Photos — capturable offline */}
      <Section title="Photos" description="Booth / product / business-card photos. Captured on-device — works offline.">
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addPhotos(e.target.files); e.target.value = ''; }} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { addPhotos(e.target.files); e.target.value = ''; }} />
        <div className="flex gap-2">
          <button type="button" onClick={() => cameraRef.current?.click()} className="btn-secondary btn-sm"><Camera size={14} /> Capture</button>
          <button type="button" onClick={() => fileRef.current?.click()} className="btn-secondary btn-sm"><Upload size={14} /> Add photos</button>
        </div>
        {photos.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {photos.map((p, i) => (
              <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-ink-100 bg-ink-50">
                <img src={p.url} alt="" className="h-full w-full object-cover" />
                <button type="button" onClick={() => removePhoto(i)} className="absolute right-1.5 top-1.5 rounded-full bg-ink-900/60 p-1 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100">
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>
 
      {/* Remarks */}
      <Section title="General remarks">
        <textarea rows={4} className="input" placeholder="Any other notes about this supplier…" {...register('remarks')} />
      </Section>
 
      <div className="flex justify-end gap-2 pb-8">
        <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? <Spinner size={16} className="text-white" /> : <Save size={16} />}
          {isEdit ? 'Save changes' : 'Create vendor'}
        </button>
      </div>
    </form>
  );
}
