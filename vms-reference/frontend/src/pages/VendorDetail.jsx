import { useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Pencil, Trash2, Phone, MessageCircle, Mail, Globe, MapPin,
  Building2, CalendarDays, Camera, Upload, X, Package, Factory, IdCard, Users2, Tag, Layers,
  ChevronDown, ChevronRight, Gauge, UserCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useVendor, useDeleteVendor, useUploadPhotos, useDeletePhoto,
} from '../hooks/useVendors.js';
import { usePhotoTypes, useCurrencyRates } from '../hooks/useLookups.js';
import { apiError } from '../lib/api.js';
import { expoLabel, initials, formatDate, moneyIn, convert, vendorState, vendorCity } from '../lib/format.js';
import { EVALUATION_CRITERIA, gradeFor } from '../lib/evaluation.js';
import { PageLoader } from '../components/ui/Spinner.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import Badge, { SampleBadge, StageBadge, VendorStatusBadge } from '../components/ui/Badge.jsx';
import { RatingStars, RatingWithValue } from '../components/ui/Rating.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import InteractionTimeline from '../components/InteractionTimeline.jsx';
import { useAuth } from '../context/AuthContext.jsx';
 
export default function VendorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { has } = useAuth();
  const { data: vendor, isLoading } = useVendor(id);
  const { data: rates = [] } = useCurrencyRates();
  const deleteMut = useDeleteVendor();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [samplesOpen, setSamplesOpen] = useState(false); // sample tracking collapsed by default
 
  if (isLoading) return <PageLoader />;
  if (!vendor) return <div className="py-16 text-center text-ink-500">Vendor not found.</div>;
 
  const canEdit = has('vendors', 'edit');
  const canDelete = has('vendors', 'delete');
 
  const handleDelete = async () => {
    try {
      await deleteMut.mutateAsync(id);
      toast.success('Vendor deleted');
      navigate('/vendors');
    } catch (e) {
      toast.error(apiError(e));
    }
  };
 
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link to="/vendors" className="btn-ghost btn-sm text-ink-600">
          <ArrowLeft size={16} /> All vendors
        </Link>
        {(canEdit || canDelete) && (
          <div className="flex gap-2">
            {canEdit && <Link to={`/vendors/${id}/edit`} className="btn-secondary btn-sm"><Pencil size={14} /> Edit</Link>}
            {canDelete && <button onClick={() => setConfirmOpen(true)} className="btn-danger btn-sm"><Trash2 size={14} /> Delete</button>}
          </div>
        )}
      </div>
 
      {/* Header card */}
      <div className="card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-brand-100 text-xl font-bold text-brand-700">
            {initials(vendor.companyName || vendor.name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold text-ink-900">{vendor.companyName || vendor.name}</h2>
              {vendor.stage && <StageBadge stage={vendor.stage} />}
              {vendor.status !== 'ACTIVE' && <VendorStatusBadge status={vendor.status} />}
            </div>
            <p className="mt-0.5 flex items-center gap-1.5 text-ink-600">
              <IdCard size={15} className="text-ink-400" />
              {vendor.designation ? `${vendor.designation} - ${vendor.name}` : vendor.name}
            </p>
            {vendor.productLine && (
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-500">
                <Layers size={14} className="text-ink-400" /> {vendor.productLine.name}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {vendor.categories?.map((c) => (
                <span key={c.id} className="chip bg-brand-50 text-brand-700">{c.name}</span>
              ))}
              {(!vendor.categories || vendor.categories.length === 0) && <span className="text-sm text-ink-400">No product categories</span>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {vendor.overallRating != null ? (
              <>
                <RatingWithValue value={vendor.overallRating} size={18} />
                {vendor.supplierGrade && (
                  <span className="flex items-center gap-1.5">
                    <Badge tone={gradeFor(vendor.overallRating).tone}>{vendor.supplierGrade}</Badge>
                    <span className="text-xs text-ink-500">{vendor.supplierStatus}</span>
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs text-ink-400">Not evaluated</span>
            )}
          </div>
        </div>
 
        <div className="mt-5 grid gap-3 border-t border-ink-100 pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <Contact icon={Phone} label="Phone" value={vendor.phone} href={vendor.phone ? `tel:${vendor.phone}` : null} />
          <Contact icon={MessageCircle} label="WeChat" value={vendor.wechat} />
          <Contact icon={Mail} label="Email" value={vendor.email} href={vendor.email ? `mailto:${vendor.email}` : null} />
          <Contact icon={Globe} label="Website" value={vendor.website} href={vendor.website ? withHttp(vendor.website) : null} />
        </div>
      </div>
 
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-5 lg:col-span-2">
          {/* Evaluation */}
          <EvaluationCard vendor={vendor} />
 
          {/* Interaction timeline */}
          <InteractionTimeline vendorId={id} canEdit={canEdit} />
 
          {/* Photos */}
          <PhotoSection vendor={vendor} canEdit={canEdit} onOpen={setLightbox} />
 
          {/* Sample tracking — collapsed by default */}
          <div className="card overflow-hidden">
            <button
              onClick={() => setSamplesOpen((o) => !o)}
              className="flex w-full items-center gap-2 px-5 py-4 text-left font-semibold text-ink-900 hover:bg-ink-50"
            >
              {samplesOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <Package size={16} className="text-brand-600" /> Sample tracking
              {vendor.samples?.length > 0 && <span className="chip bg-ink-100 text-ink-500">{vendor.samples.length}</span>}
            </button>
            {samplesOpen && (
              <div className="border-t border-ink-100 p-5">
                {vendor.samples?.length === 0 ? (
                  <p className="py-4 text-center text-sm text-ink-400">No samples recorded.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400">
                          <th className="py-2 pr-3 font-semibold">Component</th>
                          <th className="py-2 pr-3 font-semibold">Status</th>
                          <th className="py-2 pr-3 font-semibold">Price</th>
                          <th className="py-2 pr-3 font-semibold">Price remarks</th>
                          <th className="py-2 font-semibold">Quality remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-50">
                        {vendor.samples.map((s) => {
                          const inr = s.currency && s.currency !== 'INR' ? convert(s.price, s.currency, 'INR', rates) : null;
                          return (
                            <tr key={s.id} className="align-top">
                              <td className="py-2.5 pr-3 font-medium text-ink-800">{s.componentTag?.name || s.componentName || '—'}</td>
                              <td className="py-2.5 pr-3"><SampleBadge status={s.status} /></td>
                              <td className="py-2.5 pr-3 whitespace-nowrap text-ink-700">
                                {moneyIn(s.price, s.currency || 'INR', rates)}
                                {inr != null && <span className="block text-xs text-ink-400">≈ ₹{inr.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>}
                              </td>
                              <td className="py-2.5 pr-3 text-ink-500">{s.priceRemarks || '—'}</td>
                              <td className="py-2.5 text-ink-500">{s.qualityRemarks || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
 
          {vendor.remarks && (
            <div className="card p-5">
              <h3 className="mb-2 font-semibold text-ink-900">Remarks</h3>
              <p className="whitespace-pre-wrap text-sm text-ink-600">{vendor.remarks}</p>
            </div>
          )}
        </div>
 
        {/* Right column */}
        <div className="space-y-5">
          <div className="card p-5">
            <h3 className="mb-3 font-semibold text-ink-900">Details</h3>
            <dl className="space-y-3 text-sm">
              <Detail icon={Tag} label="Stage" value={vendor.stage?.name || '—'} />
              <Detail icon={Layers} label="Product line" value={vendor.productLine?.name || '—'} />
              <Detail icon={UserCircle2} label="Assigned to" value={vendor.assignedTo?.name || '—'} />
              <Detail icon={MapPin} label="State" value={vendorState(vendor)} />
              <Detail icon={MapPin} label="City" value={vendorCity(vendor)} />
              <Detail icon={MapPin} label="Country" value={vendor.countryRef?.name || vendor.country || '—'} />
              <Detail icon={CalendarDays} label="Source expo" value={expoLabel(vendor.expo) || '—'} />
              <Detail icon={Factory} label="Annual volume" value={vendor.annualVolume || '—'} />
              <Detail icon={CalendarDays} label="Added" value={`${formatDate(vendor.createdAt)}${vendor.createdBy ? ` · ${vendor.createdBy.name}` : ''}`} />
            </dl>
          </div>
 
          {/* Additional contacts */}
          {vendor.contacts?.length > 0 && (
            <div className="card p-5">
              <h3 className="mb-3 flex items-center gap-2 font-semibold text-ink-900">
                <Users2 size={16} className="text-brand-600" /> Contacts
              </h3>
              <div className="space-y-3">
                {vendor.contacts.map((c) => (
                  <div key={c.id} className="flex items-start gap-2.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink-100 text-[11px] font-bold text-ink-500">
                      {initials(c.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-800">{c.name}</p>
                      <p className="flex flex-wrap items-center gap-x-2 text-xs text-ink-500">
                        {c.designation && <span className="inline-flex items-center gap-1"><IdCard size={11} />{c.designation}</span>}
                        {c.phone && <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 hover:text-brand-600"><Phone size={11} />{c.phone}</a>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
 
          {vendor.categories?.length > 0 && (
            <div className="card p-5">
              <h3 className="mb-3 font-semibold text-ink-900">Maps to product lines</h3>
              <div className="flex flex-wrap gap-1.5">
                {vendor.categories.map((c) => (
                  <span key={c.id} className="chip bg-amber-50 text-amber-700">
                    {c.name}{c.group ? <span className="text-amber-400"> · {c.group.name}</span> : null}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
 
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        loading={deleteMut.isPending}
        title="Delete vendor?"
        message={`This will permanently remove ${vendor.name} and all their samples, photos & interactions. This cannot be undone.`}
        confirmLabel="Delete vendor"
      />
 
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/80 p-4" onClick={() => setLightbox(null)}>
          <button className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"><X size={22} /></button>
          <img src={lightbox} alt="" className="max-h-[90vh] max-w-full rounded-lg" />
        </div>
      )}
    </div>
  );
}
 
function PhotoSection({ vendor, canEdit, onOpen }) {
  const fileRef = useRef(null);
  const cameraRef = useRef(null);
  const uploadMut = useUploadPhotos();
  const deleteMut = useDeletePhoto();
  const { data: photoTypes = [] } = usePhotoTypes();
  const [typeId, setTypeId] = useState('');
  const [caption, setCaption] = useState('');
 
  const doUpload = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    const typeLabel = photoTypes.find((t) => t.id === typeId)?.name;
    try {
      await uploadMut.mutateAsync({ vendorId: vendor.id, files, caption: caption || undefined, typeId: typeId || undefined, typeLabel });
      toast.success(`${files.length} photo${files.length === 1 ? '' : 's'} uploaded`);
      setCaption('');
    } catch (e) {
      toast.error(apiError(e, 'Upload failed'));
    }
  };
 
  const removePhoto = async (photoId) => {
    try {
      await deleteMut.mutateAsync({ photoId, vendorId: vendor.id });
      toast.success('Photo removed');
    } catch (e) { toast.error(apiError(e)); }
  };
 
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold text-ink-900">
          <Camera size={16} className="text-brand-600" /> Photos
          <span className="text-sm font-normal text-ink-400">({vendor.photos?.length || 0})</span>
        </h3>
      </div>
 
      {canEdit && (
        <div className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-ink-100 bg-ink-50/40 p-3">
          <div className="min-w-[120px]">
            <label className="label text-xs">Type</label>
            <select value={typeId} onChange={(e) => setTypeId(e.target.value)} className="input py-1.5 text-sm">
              <option value="">— Type —</option>
              {photoTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="min-w-[160px] flex-1">
            <label className="label text-xs">Caption (optional)</label>
            <input value={caption} onChange={(e) => setCaption(e.target.value)} className="input py-1.5 text-sm" placeholder="e.g. 4-stroke engine" />
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => doUpload(e.target.files)} />
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => doUpload(e.target.files)} />
          <button type="button" onClick={() => cameraRef.current?.click()} className="btn-secondary btn-sm" disabled={uploadMut.isPending}>
            <Camera size={14} /> Capture
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className="btn-primary btn-sm" disabled={uploadMut.isPending}>
            {uploadMut.isPending ? <Spinner size={14} className="text-white" /> : <Upload size={14} />} Upload
          </button>
        </div>
      )}
 
      {vendor.photos?.length === 0 ? (
        <p className="py-4 text-center text-sm text-ink-400">No photos yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {vendor.photos.map((p) => (
            <div key={p.id} className="group relative aspect-square overflow-hidden rounded-lg border border-ink-100 bg-ink-50">
              <img src={p.url} alt={p.caption || ''} className="h-full w-full cursor-pointer object-cover transition-transform group-hover:scale-105"
                onClick={() => onOpen(p.url)} loading="lazy" />
              <span className="absolute left-1.5 top-1.5 chip bg-ink-900/60 text-white">{p.typeLabel || 'Photo'}</span>
              {p.caption && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-900/70 to-transparent p-1.5 text-[11px] text-white">{p.caption}</div>
              )}
              {canEdit && (
                <button onClick={() => removePhoto(p.id)} className="absolute right-1.5 top-1.5 rounded-full bg-ink-900/60 p-1 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100">
                  <X size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
 
function Contact({ icon: Icon, label, value, href }) {
  const inner = (
    <div className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink-100 text-ink-500"><Icon size={16} /></span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-ink-400">{label}</p>
        <p className="truncate text-sm font-medium text-ink-800">{value || '—'}</p>
      </div>
    </div>
  );
  return href && value ? <a href={href} className="hover:opacity-75">{inner}</a> : inner;
}
 
function Detail({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={15} className="mt-0.5 shrink-0 text-ink-400" />
      <div>
        <dt className="text-[11px] uppercase tracking-wide text-ink-400">{label}</dt>
        <dd className="text-ink-700">{value}</dd>
      </div>
    </div>
  );
}
 
function EvaluationCard({ vendor }) {
  const rated = EVALUATION_CRITERIA.filter((c) => vendor[c.key] != null);
  const g = vendor.overallRating != null ? gradeFor(vendor.overallRating) : null;
  return (
    <div className="card p-5">
      <h3 className="mb-3 flex items-center gap-2 font-semibold text-ink-900">
        <Gauge size={16} className="text-brand-600" /> Vendor evaluation
      </h3>
      {vendor.overallRating == null ? (
        <p className="py-4 text-center text-sm text-ink-400">
          Not evaluated yet. Edit the vendor and rate the criteria to auto-calculate the grade.
        </p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-ink-400">Overall rating</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-ink-900">{vendor.overallRating.toFixed(2)}</span>
                <span className="text-sm text-ink-400">/ 5</span>
              </div>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-ink-400">Percentage</p>
              <p className="text-2xl font-bold text-ink-900">{vendor.overallPercentage}%</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-ink-400">Grade</p>
              <div className="flex items-center gap-2">
                <Badge tone={g.tone}>{vendor.supplierGrade}</Badge>
                <span className="text-sm font-medium text-ink-700">{vendor.supplierStatus}</span>
              </div>
            </div>
          </div>
          <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {rated.map((c) => (
              <div key={c.key} className="flex items-center justify-between gap-2">
                <span className="truncate text-sm text-ink-600">{c.label} <span className="text-ink-300">{Math.round(c.weight * 100)}%</span></span>
                <RatingStars value={vendor[c.key] || 0} size={13} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
 
function withHttp(url) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}
