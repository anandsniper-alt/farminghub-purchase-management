import { Link } from 'react-router-dom';
import { ExternalLink, MessageSquarePlus, CalendarPlus, CheckCircle2 } from 'lucide-react';
import Badge, { StageBadge } from '../components/ui/Badge.jsx';
import { RatingWithValue } from '../components/ui/Rating.jsx';
import { initials, formatDate, vendorState, vendorCity, stateLabel, cityLabel } from './format.js';
import { gradeFor } from './evaluation.js';
 
// ---------------------------------------------------------------------------
// Column registry — the single place that knows how to label / render / export
// each field. New fields are added here once and become available to configure
// on the relevant list without touching the list pages. Scalar fields returned
// by the API that aren't listed here are auto-added generically (see useColumnConfig).
// Each column: { label, sortKey|false, width, defaultVisible, defaultOrder, render(row,ctx), exportValue(row) }
// ---------------------------------------------------------------------------
 
const dash = <span className="text-ink-400">—</span>;
const text = (v) => (v == null || v === '' ? dash : v);
 
function fmtDate(v) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function daysLabel(d) {
  if (d == null) return '—';
  if (d < 0) return `${Math.abs(d)}d overdue`;
  if (d === 0) return 'Today';
  return `${d}d`;
}
const FU_STATUS_TONE = {
  Overdue: 'bg-red-100 text-red-700',
  Today: 'bg-amber-100 text-amber-700',
  Upcoming: 'bg-brand-100 text-brand-700',
  Completed: 'bg-ink-100 text-ink-500',
};
 
export const REGISTRY = {
  vendors: {
    vendor: {
      label: 'Vendor', sortKey: 'name', width: 240, defaultVisible: true, defaultOrder: 1,
      render: (v) => (
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
            {initials(v.companyName || v.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-900">
              {v.companyName || v.name}
              {v._pending && <span className="ml-1.5 chip bg-amber-100 text-amber-700">Pending</span>}
            </p>
            <p className="truncate text-xs text-ink-500">{v.designation ? `${v.designation} · ` : ''}{v.name}</p>
          </div>
        </div>
      ),
      exportValue: (v) => v.companyName || v.name || '',
    },
    productLine: {
      label: 'Product Lines', sortKey: false, width: 130, defaultVisible: true, defaultOrder: 2,
      render: (v) => (v.productLine ? <span className="chip bg-brand-50 text-brand-700">{v.productLine.name}</span> : dash),
      exportValue: (v) => v.productLine?.name || '',
    },
    categories: {
      label: 'Product Categories', sortKey: false, width: 200, defaultVisible: false, defaultOrder: 3,
      render: (v) => (v.categories?.length
        ? <div className="flex flex-wrap gap-1">
            {v.categories.slice(0, 2).map((c) => <span key={c.id} className="chip bg-ink-100 text-ink-600">{c.name}</span>)}
            {v.categories.length > 2 && <span className="chip bg-ink-100 text-ink-500">+{v.categories.length - 2}</span>}
          </div>
        : dash),
      exportValue: (v) => (v.categories || []).map((c) => c.name).join(', '),
    },
    state: {
      label: 'State', sortKey: 'state', width: 130, defaultVisible: true, defaultOrder: 4,
      render: (v) => <span className="text-sm text-ink-600">{vendorState(v)}</span>,
      exportValue: (v) => vendorState(v),
    },
    city: {
      label: 'City', sortKey: 'city', width: 130, defaultVisible: true, defaultOrder: 5,
      render: (v) => <span className="text-sm text-ink-600">{vendorCity(v)}</span>,
      exportValue: (v) => vendorCity(v),
    },
    stage: {
      label: 'Stage', sortKey: false, width: 130, defaultVisible: true, defaultOrder: 6,
      render: (v) => (v.stage ? <StageBadge stage={v.stage} /> : dash),
      exportValue: (v) => v.stage?.name || '',
    },
    overallRating: {
      label: 'Overall Rating', sortKey: 'rating', width: 150, defaultVisible: true, defaultOrder: 7,
      render: (v) => <RatingWithValue value={v.overallRating} size={14} />,
      exportValue: (v) => (v.overallRating != null ? v.overallRating.toFixed(2) : ''),
    },
    supplierGrade: {
      label: 'Grade', sortKey: false, width: 100, defaultVisible: false, defaultOrder: 8,
      render: (v) => (v.supplierGrade ? <Badge tone={gradeFor(v.overallRating).tone}>{v.supplierGrade}</Badge> : dash),
      exportValue: (v) => v.supplierGrade || '',
    },
    supplierStatus: {
      label: 'Supplier Status', sortKey: false, width: 170, defaultVisible: false, defaultOrder: 9,
      render: (v) => <span className="text-sm text-ink-600">{text(v.supplierStatus)}</span>,
      exportValue: (v) => v.supplierStatus || '',
    },
    assignedTo: {
      label: 'Assigned To', sortKey: false, width: 140, defaultVisible: false, defaultOrder: 10,
      render: (v) => <span className="text-sm text-ink-600">{text(v.assignedTo?.name)}</span>,
      exportValue: (v) => v.assignedTo?.name || '',
    },
    phone: {
      label: 'Phone', sortKey: false, width: 140, defaultVisible: false, defaultOrder: 11,
      render: (v) => <span className="text-sm text-ink-600">{text(v.phone)}</span>,
      exportValue: (v) => v.phone || '',
    },
    email: {
      label: 'Email', sortKey: false, width: 180, defaultVisible: false, defaultOrder: 12,
      render: (v) => <span className="text-sm text-ink-600">{text(v.email)}</span>,
      exportValue: (v) => v.email || '',
    },
    annualVolume: {
      label: 'Annual Volume', sortKey: false, width: 150, defaultVisible: false, defaultOrder: 13,
      render: (v) => <span className="text-sm text-ink-600">{text(v.annualVolume)}</span>,
      exportValue: (v) => v.annualVolume || '',
    },
    createdAt: {
      label: 'Added On', sortKey: 'recent', width: 130, defaultVisible: false, defaultOrder: 14,
      render: (v) => <span className="text-sm text-ink-600">{formatDate(v.createdAt)}</span>,
      exportValue: (v) => formatDate(v.createdAt),
    },
  },
 
  'follow-ups': {
    companyName: {
      label: 'Company Name', sortKey: false, width: 200, defaultVisible: true, defaultOrder: 1,
      render: (r) => (
        <Link to={`/vendors/${r.vendorId}`} className="font-medium text-ink-900 hover:text-brand-700">{r.companyName}</Link>
      ),
      exportValue: (r) => r.companyName || '',
    },
    contact: {
      label: 'Contact Person', sortKey: false, width: 160, defaultVisible: true, defaultOrder: 2,
      render: (r) => <span className="text-ink-700">{text(r.contactPerson)}</span>,
      exportValue: (r) => r.contactPerson || '',
    },
    designation: {
      label: 'Designation', sortKey: false, width: 140, defaultVisible: true, defaultOrder: 3,
      render: (r) => <span className="text-sm text-ink-600">{text(r.designation)}</span>,
      exportValue: (r) => r.designation || '',
    },
    state: {
      label: 'State', sortKey: false, width: 120, defaultVisible: true, defaultOrder: 4,
      render: (r) => <span className="text-ink-600">{stateLabel(r.state)}</span>,
      exportValue: (r) => stateLabel(r.state),
    },
    city: {
      label: 'City', sortKey: false, width: 120, defaultVisible: true, defaultOrder: 5,
      render: (r) => <span className="text-ink-600">{cityLabel(r.city)}</span>,
      exportValue: (r) => cityLabel(r.city),
    },
    productLine: {
      label: 'Product Lines', sortKey: false, width: 130, defaultVisible: false, defaultOrder: 6,
      render: (r) => (r.productLine ? <span className="chip bg-brand-50 text-brand-700">{r.productLine.name}</span> : dash),
      exportValue: (r) => r.productLine?.name || '',
    },
    lastInteractionAt: {
      label: 'Last Interaction', sortKey: false, width: 140, defaultVisible: true, defaultOrder: 7,
      render: (r) => <span className="whitespace-nowrap text-ink-600">{fmtDate(r.lastInteractionAt)}</span>,
      exportValue: (r) => fmtDate(r.lastInteractionAt),
    },
    nextFollowUpAt: {
      label: 'Next Follow-up', sortKey: false, width: 140, defaultVisible: true, defaultOrder: 8,
      render: (r) => <span className="whitespace-nowrap font-medium text-ink-800">{fmtDate(r.nextFollowUpAt)}</span>,
      exportValue: (r) => fmtDate(r.nextFollowUpAt),
    },
    daysRemaining: {
      label: 'Days Remaining', sortKey: false, width: 120, defaultVisible: true, defaultOrder: 9,
      render: (r) => <span className="whitespace-nowrap text-ink-600">{daysLabel(r.daysRemaining)}</span>,
      exportValue: (r) => daysLabel(r.daysRemaining),
    },
    status: {
      label: 'Follow-up Status', sortKey: false, width: 130, defaultVisible: true, defaultOrder: 10,
      render: (r) => <span className={`chip ${FU_STATUS_TONE[r.status] || ''}`}>{r.status}</span>,
      exportValue: (r) => r.status || '',
    },
    assignedTo: {
      label: 'Assigned To', sortKey: false, width: 140, defaultVisible: true, defaultOrder: 11,
      render: (r) => <span className="text-ink-600">{text(r.assignedTo?.name)}</span>,
      exportValue: (r) => r.assignedTo?.name || '',
    },
    actions: {
      label: 'Actions', sortKey: false, width: 130, defaultVisible: true, defaultOrder: 12, exportable: false,
      render: (r, ctx) => (
        <div className="flex items-center justify-end gap-1">
          <Link to={`/vendors/${r.vendorId}`} title="Open vendor" className="rounded p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"><ExternalLink size={15} /></Link>
          <Link to={`/vendors/${r.vendorId}`} title="Add interaction" className="rounded p-1.5 text-ink-400 hover:bg-ink-100 hover:text-brand-700"><MessageSquarePlus size={15} /></Link>
          {ctx?.canEdit && r.status !== 'Completed' && (
            <>
              <button onClick={() => ctx.onReschedule?.(r)} title="Reschedule" className="rounded p-1.5 text-ink-400 hover:bg-ink-100 hover:text-blue-600"><CalendarPlus size={15} /></button>
              <button onClick={() => ctx.onComplete?.(r)} title="Complete follow-up" className="rounded p-1.5 text-ink-400 hover:bg-brand-50 hover:text-brand-700"><CheckCircle2 size={15} /></button>
            </>
          )}
        </div>
      ),
      exportValue: () => '',
    },
  },
};
 
/** Humanise an unknown scalar key into a label (for auto-added dynamic fields). */
export function humanizeKey(key) {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
 
/** Generic column meta for a scalar API field not in the registry (dynamic fields). */
export function genericMeta(key, order) {
  return {
    label: humanizeKey(key),
    sortKey: false,
    width: 150,
    defaultVisible: false,
    defaultOrder: 900 + order,
    render: (row) => (row[key] == null || row[key] === '' ? dash : String(row[key])),
    exportValue: (row) => (row[key] == null ? '' : String(row[key])),
    dynamic: true,
  };
}
