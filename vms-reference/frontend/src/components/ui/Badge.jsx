import clsx from 'clsx';
 
const TONES = {
  gray: 'bg-ink-100 text-ink-600',
  green: 'bg-brand-100 text-brand-700',
  blue: 'bg-blue-100 text-blue-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  purple: 'bg-purple-100 text-purple-700',
};
 
export default function Badge({ tone = 'gray', children, className }) {
  return <span className={clsx('chip', TONES[tone] || TONES.gray, className)}>{children}</span>;
}
 
const SAMPLE_TONE = {
  NONE: 'gray',
  REQUESTED: 'blue',
  RECEIVED: 'amber',
  APPROVED: 'green',
  REJECTED: 'red',
};
export function SampleBadge({ status }) {
  if (!status) return <span className="text-ink-400">—</span>;
  return <Badge tone={SAMPLE_TONE[status] || 'gray'}>{status[0] + status.slice(1).toLowerCase()}</Badge>;
}
 
const VENDOR_TONE = { ACTIVE: 'green', ARCHIVED: 'gray', BLACKLISTED: 'red' };
export function VendorStatusBadge({ status }) {
  return <Badge tone={VENDOR_TONE[status] || 'gray'}>{status[0] + status.slice(1).toLowerCase()}</Badge>;
}
 
const RISK_TONE = { HIGH: 'red', MEDIUM: 'amber', LOW: 'green' };
export function RiskBadge({ level }) {
  return <Badge tone={RISK_TONE[level] || 'gray'}>{level} risk</Badge>;
}
 
export function StageBadge({ stage }) {
  if (!stage) return <span className="text-ink-400">—</span>;
  return <Badge tone={stage.color || 'gray'}>{stage.name}</Badge>;
}
