import { Loader2 } from 'lucide-react';
import clsx from 'clsx';
 
export default function Spinner({ className, size = 20 }) {
  return <Loader2 className={clsx('animate-spin text-brand-600', className)} size={size} />;
}
 
export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-ink-500">
      <Spinner size={28} />
      <span className="text-sm">{label}</span>
    </div>
  );
}
