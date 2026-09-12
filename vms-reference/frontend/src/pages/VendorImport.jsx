import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle,
  X, Sparkles, ArrowRight, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useImportPreview, useImportCommit, downloadTemplate } from '../hooks/useImport.js';
import { apiError } from '../lib/api.js';
import Spinner from '../components/ui/Spinner.jsx';
 
const COLUMNS = [
  ['Vendor Name', 'required — contact / supplier name'],
  ['Designation', 'e.g. MD, Sales Director'],
  ['Company', 'company / firm name'],
  ['Phone', 'phone / WhatsApp'],
  ['WeChat', 'WeChat ID'],
  ['Email', ''],
  ['City', 'e.g. Taizhou'],
  ['Region', 'province / area / district'],
  ['Country', 'defaults to China'],
  ['Stage', 'matches your stage names (e.g. Approved Vendor)'],
  ['Expo / Expo Edition / Expo Year', 'source fair; created if new'],
  ['Components', 'comma-separated tags — created if new'],
  ['Product Lines', 'comma-separated — created if new'],
  ['Communication / Reliability / Overall Rating', '1–5 (or "2 - MODERATE")'],
  ['Annual Volume', 'free text'],
  ['Sample Status', 'Requested / Received / Approved / Rejected'],
  ['Remarks', 'free text'],
];
 
export default function VendorImport() {
  const navigate = useNavigate();
  const previewMut = useImportPreview();
  const commitMut = useImportCommit();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const inputRef = useRef(null);
 
  const pickFile = async (f) => {
    if (!f) return;
    if (!/\.(xlsx|xls|csv)$/i.test(f.name)) {
      toast.error('Please choose an .xlsx, .xls or .csv file');
      return;
    }
    setFile(f);
    setResult(null);
    setPreview(null);
    try {
      const data = await previewMut.mutateAsync(f);
      setPreview(data);
    } catch (e) {
      toast.error(apiError(e, 'Could not read the file'));
      setFile(null);
    }
  };
 
  const runImport = async () => {
    try {
      const data = await commitMut.mutateAsync(file);
      setResult(data);
      toast.success(`Imported ${data.summary.created} vendor${data.summary.created === 1 ? '' : 's'}`);
    } catch (e) {
      toast.error(apiError(e, 'Import failed'));
    }
  };
 
  const reset = () => { setFile(null); setPreview(null); setResult(null); };
 
  const doDownload = async () => {
    setDownloading(true);
    try { await downloadTemplate(); }
    catch (e) { toast.error(apiError(e, 'Download failed')); }
    finally { setDownloading(false); }
  };
 
  const s = preview?.summary;
 
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <Link to="/vendors" className="btn-ghost btn-sm text-ink-600"><ArrowLeft size={16} /> Vendors</Link>
        <button onClick={doDownload} className="btn-secondary btn-sm" disabled={downloading}>
          {downloading ? <Spinner size={14} /> : <Download size={14} />} Download template
        </button>
      </div>
 
      <div>
        <h2 className="text-xl font-bold text-ink-900">Bulk import vendors</h2>
        <p className="mt-0.5 text-sm text-ink-500">
          Upload an Excel/CSV sheet of suppliers. Download the template for the exact columns, or use your own —
          common headers like <em>Supplier, Main category, City, Area</em> are recognised automatically.
        </p>
      </div>
 
      {/* Result screen */}
      {result ? (
        <div className="card p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-600"><CheckCircle2 size={24} /></div>
            <div>
              <h3 className="text-lg font-semibold text-ink-900">Import complete</h3>
              <p className="text-sm text-ink-500">
                {result.summary.created} created · {result.summary.failed} failed
              </p>
            </div>
          </div>
 
          {result.failed?.length > 0 && (
            <div className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-red-700"><AlertTriangle size={15} /> {result.failed.length} row(s) failed</p>
              <ul className="space-y-1 text-sm text-red-600">
                {result.failed.map((f, i) => <li key={i}>Row {f.row} — {f.name || '(no name)'}: {f.error}</li>)}
              </ul>
            </div>
          )}
 
          <div className="mt-5 flex gap-2">
            <button onClick={() => navigate('/vendors')} className="btn-primary">View vendors <ArrowRight size={16} /></button>
            <button onClick={reset} className="btn-secondary"><RefreshCw size={15} /> Import another</button>
          </div>
        </div>
      ) : (
        <>
          {/* Dropzone */}
          {!file && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files?.[0]); }}
              onClick={() => inputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-16 text-center transition-colors ${
                dragOver ? 'border-brand-500 bg-brand-50' : 'border-ink-300 bg-white hover:border-brand-400 hover:bg-ink-50/50'
              }`}
            >
              <div className="grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-600"><UploadCloud size={28} /></div>
              <div>
                <p className="font-semibold text-ink-800">Drop your Excel file here, or click to browse</p>
                <p className="mt-1 text-sm text-ink-500">.xlsx, .xls or .csv · up to 2000 rows</p>
              </div>
              <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => pickFile(e.target.files?.[0])} />
            </div>
          )}
 
          {/* Selected file + loading */}
          {file && (
            <div className="card flex items-center gap-3 p-4">
              <FileSpreadsheet size={22} className="text-brand-600" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink-800">{file.name}</p>
                <p className="text-xs text-ink-500">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
              {previewMut.isPending && <Spinner size={18} />}
              <button onClick={reset} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100"><X size={18} /></button>
            </div>
          )}
 
          {/* Preview */}
          {preview && s && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Rows found" value={s.totalRows} tone="ink" />
                <Stat label="Ready to import" value={s.valid} tone="green" />
                <Stat label="With issues" value={s.invalid} tone={s.invalid ? 'red' : 'ink'} />
                <Stat label="New tags/lines" value={s.newComponents.length + s.newCategories.length} tone="amber" />
              </div>
 
              {(s.newCategories.length > 0 || s.newComponents.length > 0 || s.ignoredColumns.length > 0) && (
                <div className="card space-y-2 p-4 text-sm">
                  {s.newCategories.length > 0 && (
                    <p className="flex flex-wrap items-center gap-1.5 text-ink-600">
                      <Sparkles size={14} className="text-amber-500" /> New product lines will be created:
                      {s.newCategories.map((c) => <span key={c} className="chip bg-amber-50 text-amber-700">{c}</span>)}
                    </p>
                  )}
                  {s.newComponents.length > 0 && (
                    <p className="flex flex-wrap items-center gap-1.5 text-ink-600">
                      <Sparkles size={14} className="text-brand-500" /> New component tags will be created:
                      {s.newComponents.map((c) => <span key={c} className="chip bg-brand-50 text-brand-700">{c}</span>)}
                    </p>
                  )}
                  {s.ignoredColumns.length > 0 && (
                    <p className="text-xs text-ink-400">Ignored columns: {s.ignoredColumns.join(', ')}</p>
                  )}
                </div>
              )}
 
              <div className="card overflow-hidden">
                <div className="border-b border-ink-100 px-4 py-2.5 text-sm font-medium text-ink-700">
                  Preview {preview.rows.length < s.totalRows ? `(first ${preview.rows.length} of ${s.totalRows})` : ''}
                </div>
                <div className="max-h-96 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-ink-50/90 backdrop-blur">
                      <tr className="text-left text-xs uppercase tracking-wide text-ink-500">
                        <th className="px-4 py-2 font-semibold">#</th>
                        <th className="px-2 py-2 font-semibold">Vendor</th>
                        <th className="px-2 py-2 font-semibold">City</th>
                        <th className="px-2 py-2 font-semibold">Stage</th>
                        <th className="px-2 py-2 font-semibold">Lines / components</th>
                        <th className="px-4 py-2 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-50">
                      {preview.rows.map((r) => (
                        <tr key={r.row} className={r.valid ? '' : 'bg-red-50/50'}>
                          <td className="px-4 py-2 text-ink-400">{r.row}</td>
                          <td className="px-2 py-2 font-medium text-ink-800">{r.name || <span className="text-red-500">(missing)</span>}<div className="text-xs text-ink-400">{r.companyName}</div></td>
                          <td className="px-2 py-2 text-ink-600">{r.city || '—'}</td>
                          <td className="px-2 py-2 text-ink-600">{r.stage || '—'}</td>
                          <td className="px-2 py-2">
                            <div className="flex flex-wrap gap-1">
                              {r.categories?.map((c) => <span key={c} className="chip bg-amber-50 text-amber-700">{c}</span>)}
                              {r.components?.map((c) => <span key={c} className="chip bg-brand-50 text-brand-700">{c}</span>)}
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            {r.valid
                              ? <span className="inline-flex items-center gap-1 text-brand-600"><CheckCircle2 size={14} /> OK</span>
                              : <span className="text-xs text-red-600" title={r.issues.join('; ')}>{r.issues.join('; ')}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
 
              <div className="flex items-center justify-between">
                <p className="text-sm text-ink-500">{s.valid} vendor{s.valid === 1 ? '' : 's'} will be imported.</p>
                <div className="flex gap-2">
                  <button onClick={reset} className="btn-secondary">Choose another file</button>
                  <button onClick={runImport} className="btn-primary" disabled={commitMut.isPending || s.valid === 0}>
                    {commitMut.isPending ? <Spinner size={16} className="text-white" /> : <UploadCloud size={16} />}
                    Import {s.valid} vendor{s.valid === 1 ? '' : 's'}
                  </button>
                </div>
              </div>
            </>
          )}
 
          {/* Column reference */}
          <div className="card p-5">
            <h3 className="mb-3 text-sm font-semibold text-ink-800">Recognised columns</h3>
            <div className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
              {COLUMNS.map(([c, hint]) => (
                <div key={c} className="flex gap-2">
                  <span className="font-medium text-ink-700">{c}</span>
                  {hint && <span className="text-ink-400">— {hint}</span>}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
 
function Stat({ label, value, tone }) {
  const tones = { ink: 'text-ink-900', green: 'text-brand-600', red: 'text-red-600', amber: 'text-amber-600' };
  return (
    <div className="card p-4">
      <p className={`text-2xl font-bold ${tones[tone]}`}>{value}</p>
      <p className="text-xs text-ink-500">{label}</p>
    </div>
  );
}
