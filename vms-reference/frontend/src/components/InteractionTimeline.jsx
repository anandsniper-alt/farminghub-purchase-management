import { useState, useRef, useEffect } from 'react';
import {
  MessageSquare, Phone, Users, MapPin, Globe, Mic, FileText, Paperclip,
  Trash2, Play, Square, Send, X, Download, Plus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useInteractions, useCreateInteraction, useDeleteInteraction,
} from '../hooks/useInteractions.js';
import { apiError } from '../lib/api.js';
import { enqueueInteraction } from '../offline/db.js';
import { notifyQueued } from '../offline/sync.js';
import Spinner from './ui/Spinner.jsx';
import ConfirmDialog from './ui/ConfirmDialog.jsx';
 
const TYPES = [
  { value: 'NOTE', label: 'Note', icon: MessageSquare, tone: 'text-ink-500 bg-ink-100' },
  { value: 'CALL', label: 'Call', icon: Phone, tone: 'text-blue-600 bg-blue-50' },
  { value: 'MEETING', label: 'Meeting', icon: Users, tone: 'text-purple-600 bg-purple-50' },
  { value: 'VISIT', label: 'Visit', icon: MapPin, tone: 'text-brand-600 bg-brand-50' },
  { value: 'ONLINE', label: 'Online', icon: Globe, tone: 'text-cyan-600 bg-cyan-50' },
  { value: 'VOICE', label: 'Voice note', icon: Mic, tone: 'text-amber-600 bg-amber-50' },
  { value: 'DOCUMENT', label: 'Document', icon: FileText, tone: 'text-red-600 bg-red-50' },
];
const typeMeta = (t) => TYPES.find((x) => x.value === t) || TYPES[0];
 
function nowLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}
 
/** Default next follow-up = 7 days out (yyyy-mm-dd for a date input). */
function defaultFollowUp() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}
 
function fmtDate(v) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
 
const FU_TONE = { Overdue: 'text-red-600 bg-red-50', Today: 'text-amber-600 bg-amber-50', Upcoming: 'text-brand-600 bg-brand-50', Completed: 'text-ink-500 bg-ink-100' };
function followUpStatus(nextAt, completed) {
  if (completed) return 'Completed';
  if (!nextAt) return 'Upcoming';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(nextAt); due.setHours(0, 0, 0, 0);
  const days = Math.round((due - today) / 86400000);
  if (days < 0) return 'Overdue';
  if (days === 0) return 'Today';
  return 'Upcoming';
}
 
function fmtDateTime(v) {
  const d = new Date(v);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
 
function fmtSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
 
export default function InteractionTimeline({ vendorId, canEdit }) {
  const { data: interactions = [], isLoading } = useInteractions(vendorId);
  const createMut = useCreateInteraction();
  const deleteMut = useDeleteInteraction();
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
 
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold text-ink-900">
          <MessageSquare size={16} className="text-brand-600" /> Interaction log
          <span className="text-sm font-normal text-ink-400">({interactions.length})</span>
        </h3>
        {canEdit && !open && (
          <button onClick={() => setOpen(true)} className="btn-primary btn-sm">
            <Plus size={14} /> Log interaction
          </button>
        )}
      </div>
 
      {open && (
        <Composer
          onCancel={() => setOpen(false)}
          saving={createMut.isPending}
          onSubmit={async (payload) => {
            const queueOffline = async () => {
              const files = (payload.files || []).map((f) => ({ blob: f, name: f.name, type: f.type }));
              const { files: _f, ...fields } = payload;
              await enqueueInteraction(vendorId, fields, files);
              await notifyQueued();
              toast.success('Saved offline — will sync when you\'re back online', { icon: '📥' });
              setOpen(false);
            };
            if (!navigator.onLine) return queueOffline();
            try {
              await createMut.mutateAsync({ vendorId, ...payload });
              toast.success('Interaction logged');
              setOpen(false);
            } catch (e) {
              if (!e?.response) return queueOffline(); // network dropped mid-request
              toast.error(apiError(e, 'Could not save'));
            }
          }}
        />
      )}
 
      {isLoading ? (
        <div className="py-6 text-center"><Spinner /></div>
      ) : interactions.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-400">
          No interactions yet. Log every call, meeting or voice note to keep the conversation history.
        </p>
      ) : (
        <ol className="relative space-y-4 border-l border-ink-200 pl-5">
          {interactions.map((it) => {
            const meta = typeMeta(it.type);
            const Icon = meta.icon;
            return (
              <li key={it.id} className="relative">
                <span className={`absolute -left-[30px] grid h-6 w-6 place-items-center rounded-full ring-4 ring-white ${meta.tone}`}>
                  <Icon size={13} />
                </span>
                <div className="rounded-lg border border-ink-100 bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">{meta.label}</span>
                      {it.title && <p className="font-medium text-ink-900">{it.title}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <time className="whitespace-nowrap text-xs text-ink-400">{fmtDateTime(it.occurredAt)}</time>
                      {canEdit && (
                        <button onClick={() => setToDelete(it)} className="text-ink-300 hover:text-red-600">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  {it.notes && <p className="mt-1 whitespace-pre-wrap text-sm text-ink-600">{it.notes}</p>}
                  {it.nextFollowUpAt && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-ink-400">Next follow-up: <span className="font-medium text-ink-600">{fmtDate(it.nextFollowUpAt)}</span></span>
                      <span className={`chip ${FU_TONE[followUpStatus(it.nextFollowUpAt, it.followUpCompleted)]}`}>
                        {followUpStatus(it.nextFollowUpAt, it.followUpCompleted)}
                      </span>
                    </div>
                  )}
                  {it.attachments?.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {it.attachments.map((a) => (
                        <Attachment key={a.id} a={a} />
                      ))}
                    </div>
                  )}
                  {it.createdBy && <p className="mt-1.5 text-[11px] text-ink-400">by {it.createdBy.name}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}
 
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          try {
            await deleteMut.mutateAsync({ interactionId: toDelete.id, vendorId });
            toast.success('Deleted');
            setToDelete(null);
          } catch (e) { toast.error(apiError(e)); }
        }}
        loading={deleteMut.isPending}
        title="Delete interaction?"
        message="This removes the log entry and its attachments."
        confirmLabel="Delete"
      />
    </div>
  );
}
 
function Attachment({ a }) {
  if (a.kind === 'AUDIO') {
    return <audio controls src={a.url} className="h-9 w-full max-w-sm" />;
  }
  if (a.kind === 'IMAGE') {
    return (
      <a href={a.url} target="_blank" rel="noreferrer" className="inline-block">
        <img src={a.url} alt="" className="h-24 rounded-lg border border-ink-100 object-cover" />
      </a>
    );
  }
  return (
    <a href={a.url} target="_blank" rel="noreferrer" download
      className="flex w-full max-w-sm items-center gap-2 rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 text-sm text-ink-700 hover:bg-ink-100">
      <FileText size={15} className="text-red-500" />
      <span className="flex-1 truncate">{a.filename.replace(/^vendor-\d+-\w+/, 'attachment')}</span>
      <span className="text-xs text-ink-400">{fmtSize(a.sizeBytes)}</span>
      <Download size={14} className="text-ink-400" />
    </a>
  );
}
 
function Composer({ onSubmit, onCancel, saving }) {
  const [type, setType] = useState('NOTE');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [occurredAt, setOccurredAt] = useState(nowLocal());
  const [nextFollowUpAt, setNextFollowUpAt] = useState(defaultFollowUp());
  const [files, setFiles] = useState([]); // File[]
  const fileRef = useRef(null);
 
  // voice recording
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
 
  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
  }, []);
 
  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
        setFiles((f) => [...f, file]);
        stream.getTracks().forEach((t) => t.stop());
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
      if (type === 'NOTE') setType('VOICE');
    } catch {
      toast.error('Microphone access denied or unavailable');
    }
  };
  const stopRec = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
    clearInterval(timerRef.current);
    setRecording(false);
  };
 
  const addFiles = (list) => setFiles((f) => [...f, ...Array.from(list || [])]);
  const removeFile = (i) => setFiles((f) => f.filter((_, idx) => idx !== i));
 
  const submit = () => {
    if (!notes.trim() && files.length === 0) {
      toast.error('Add notes or an attachment');
      return;
    }
    if (!nextFollowUpAt) {
      toast.error('Please set the next follow-up date');
      return;
    }
    onSubmit({
      type, title: title || undefined, notes: notes || undefined,
      occurredAt: new Date(occurredAt).toISOString(),
      nextFollowUpAt: new Date(nextFollowUpAt).toISOString(),
      files,
    });
  };
 
  return (
    <div className="mb-5 rounded-xl border border-ink-200 bg-ink-50/50 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label text-xs">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="input">
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label text-xs">When</label>
          <input type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label text-xs">Next follow-up <span className="text-red-500">*</span></label>
          <input type="date" value={nextFollowUpAt} onChange={(e) => setNextFollowUpAt(e.target.value)} className="input" required />
        </div>
      </div>
      <div className="mt-3">
        <label className="label text-xs">Title (optional)</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="e.g. Price negotiation call" />
      </div>
      <div className="mt-3">
        <label className="label text-xs">Discussion points</label>
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="input"
          placeholder="What did you and the vendor discuss?" />
      </div>
 
      {/* Attachments */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input ref={fileRef} type="file" multiple hidden
          accept="image/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
          onChange={(e) => addFiles(e.target.files)} />
        <button type="button" onClick={() => fileRef.current?.click()} className="btn-secondary btn-sm">
          <Paperclip size={14} /> Attach file
        </button>
        {!recording ? (
          <button type="button" onClick={startRec} className="btn-secondary btn-sm">
            <Mic size={14} /> Record voice
          </button>
        ) : (
          <button type="button" onClick={stopRec} className="btn-danger btn-sm">
            <Square size={13} /> Stop · {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
          </button>
        )}
        {recording && <span className="flex items-center gap-1 text-xs text-red-600"><span className="h-2 w-2 animate-pulse rounded-full bg-red-600" /> recording…</span>}
      </div>
 
      {files.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-sm">
              {f.type.startsWith('audio') ? <Mic size={14} className="text-amber-500" /> : f.type.startsWith('image') ? <Play size={14} className="text-brand-500" /> : <FileText size={14} className="text-red-500" />}
              <span className="flex-1 truncate">{f.name}</span>
              <span className="text-xs text-ink-400">{fmtSize(f.size)}</span>
              <button onClick={() => removeFile(i)} className="text-ink-300 hover:text-red-600"><X size={14} /></button>
            </div>
          ))}
        </div>
      )}
 
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-secondary btn-sm">Cancel</button>
        <button type="button" onClick={submit} className="btn-primary btn-sm" disabled={saving}>
          {saving ? <Spinner size={14} className="text-white" /> : <Send size={14} />} Save
        </button>
      </div>
    </div>
  );
}
