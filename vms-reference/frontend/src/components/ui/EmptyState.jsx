import { Inbox } from 'lucide-react';
 
export default function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', message, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-ink-200 bg-white/50 py-16 text-center">
      <div className="rounded-full bg-brand-50 p-4 text-brand-600">
        <Icon size={28} />
      </div>
      <div>
        <h3 className="font-semibold text-ink-800">{title}</h3>
        {message && <p className="mt-1 max-w-sm text-sm text-ink-500">{message}</p>}
      </div>
      {action}
    </div>
  );
}
