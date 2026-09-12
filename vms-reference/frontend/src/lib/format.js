export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
 
export function expoLabel(expo) {
  if (!expo) return null;
  return [expo.name, expo.edition, expo.year].filter(Boolean).join(' · ');
}
 
export function money(value, currency = 'USD') {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
 
const SYMBOLS = { INR: '₹', USD: '$', YUAN: '¥', CNY: '¥' };
 
export function currencySymbol(code, rates) {
  const r = rates?.find((x) => x.code === code);
  return r?.symbol || SYMBOLS[code] || code + ' ';
}
 
/** Format a money amount with its currency symbol. */
export function moneyIn(value, code = 'INR', rates) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  const sym = currencySymbol(code, rates);
  return `${sym}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
 
/** Convert an amount from one currency to another using INR-based rates. */
export function convert(amount, from, to, rates) {
  const n = Number(amount);
  if (Number.isNaN(n) || !rates) return null;
  const fromR = rates.find((r) => r.code === from);
  const toR = rates.find((r) => r.code === to);
  if (!fromR || !toR) return null;
  const inr = n * Number(fromR.inrPerUnit);
  return inr / Number(toR.inrPerUnit);
}
 
// Placeholder shown when a vendor has no city/state set (never defaults to a real place).
export const NO_FILL = 'No Fill';
export function cityLabel(city) {
  return city && String(city).trim() ? city : NO_FILL;
}
export function stateLabel(state) {
  return state && String(state).trim() ? state : NO_FILL;
}
/** Resolve a vendor's state/city display, preferring the FK relation then legacy text. */
export function vendorState(v) {
  return stateLabel(v?.stateRef?.name || v?.region);
}
export function vendorCity(v) {
  return cityLabel(v?.districtRef?.name || v?.city);
}
 
export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();
}
