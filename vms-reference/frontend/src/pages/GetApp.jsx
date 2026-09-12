import { useEffect, useState } from 'react';
import { Smartphone, Download, Share, PlusSquare, Apple, MonitorSmartphone, ShieldCheck, Clock } from 'lucide-react';
 
const APK_URL = '/downloads/fh-vendors.apk';
 
export default function GetApp() {
  const [apk, setApk] = useState('checking'); // 'checking' | 'ready' | 'missing'
  useEffect(() => {
    fetch(APK_URL, { method: 'HEAD' })
      .then((r) => setApk(r.ok ? 'ready' : 'missing'))
      .catch(() => setApk('missing'));
  }, []);
 
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-brand-600 text-white shadow-soft">
          <Smartphone size={30} />
        </div>
        <h2 className="text-2xl font-bold text-ink-900">Get the Farming Hub app</h2>
        <p className="mx-auto mt-1 max-w-lg text-sm text-ink-500">
          Install it on your phone to capture vendors at expos — even with no internet.
          Everything syncs automatically when you're back online.
        </p>
      </div>
 
      {/* Android APK */}
      <div className="card p-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
            <MonitorSmartphone size={24} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-ink-900">Android — download the app (APK)</h3>
            <p className="text-sm text-ink-500">Direct install. Tap the file after it downloads and allow "Install unknown apps" if asked.</p>
          </div>
          {apk === 'ready' ? (
            <a href={APK_URL} download className="btn-primary shrink-0">
              <Download size={16} /> Download APK
            </a>
          ) : (
            <span className="btn-secondary shrink-0 cursor-default opacity-70">
              <Clock size={16} /> {apk === 'checking' ? 'Checking…' : 'Preparing…'}
            </span>
          )}
        </div>
        <ol className="mt-4 space-y-1.5 border-t border-ink-100 pt-4 text-sm text-ink-600">
          <li><b>1.</b> Tap <b>Download APK</b> above.</li>
          <li><b>2.</b> Open the downloaded <code className="rounded bg-ink-100 px-1">fh-vendors.apk</code> file.</li>
          <li><b>3.</b> If prompted, allow installs from your browser / files app, then tap <b>Install</b>.</li>
          <li><b>4.</b> Open <b>FH Vendors</b> from your home screen and sign in.</li>
        </ol>
      </div>
 
      {/* Install as PWA (no download) */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-2 flex items-center gap-2 font-semibold text-ink-900">
            <PlusSquare size={17} className="text-brand-600" /> Android — install from browser
          </h3>
          <p className="text-sm text-ink-600">
            In Chrome, open the menu (⋮) → <b>Add to Home screen</b> / <b>Install app</b>. Same app, no APK needed.
          </p>
        </div>
        <div className="card p-5">
          <h3 className="mb-2 flex items-center gap-2 font-semibold text-ink-900">
            <Apple size={17} className="text-ink-700" /> iPhone / iPad
          </h3>
          <p className="text-sm text-ink-600">
            In Safari, tap <Share size={13} className="inline" /> <b>Share</b> → <b>Add to Home Screen</b>.
            (iOS doesn't support APKs — this installs the same app.)
          </p>
        </div>
      </div>
 
      <div className="flex items-center justify-center gap-2 text-xs text-ink-400">
        <ShieldCheck size={14} /> Updates install automatically — you never need to uninstall and reinstall.
      </div>
    </div>
  );
}
