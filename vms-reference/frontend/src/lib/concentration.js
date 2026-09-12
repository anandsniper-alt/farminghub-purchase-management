// ---------------------------------------------------------------------------
// Sourcing concentration by PRODUCT CATEGORY (Product Lines), computed entirely
// on the client from the categories master + the vendors dataset. No backend,
// API, schema or vendor-record changes — pure read-side analytics.
// ---------------------------------------------------------------------------
 
const RISK_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
export const RISK_META = {
  CRITICAL: { label: 'Critical Risk', tone: 'bg-red-100 text-red-700 ring-1 ring-red-200', bar: 'bg-red-500' },
  HIGH: { label: 'High Risk', tone: 'bg-orange-100 text-orange-700', bar: 'bg-orange-500' },
  MEDIUM: { label: 'Medium Risk', tone: 'bg-amber-100 text-amber-700', bar: 'bg-amber-500' },
  LOW: { label: 'Low Risk', tone: 'bg-brand-100 text-brand-700', bar: 'bg-brand-500' },
};
 
/** Category risk from how many vendors (and how many active) supply it. */
function riskLevel(total, active) {
  if (total === 0) return 'CRITICAL'; // no supplier — sourcing gap
  if (active === 0) return 'CRITICAL'; // tagged but none active
  if (total === 1) return 'CRITICAL'; // single source
  if (total === 2) return 'HIGH';
  if (total === 3) return 'MEDIUM';
  return 'LOW';
}
 
const isPreferred = (v) => v.supplierGrade === 'A+';
const isApproved = (v) => v.supplierGrade === 'A' || v.supplierGrade === 'B';
const isHighRiskVendor = (v) => v.supplierGrade === 'C' || v.supplierGrade === 'D';
const isActive = (v) => (v.status || 'ACTIVE') === 'ACTIVE';
 
/**
 * @param categories master list [{ id, name, isActive, group }]
 * @param vendors    [{ id, name, companyName, city, status, supplierGrade, categories:[{id,name}] }]
 * @returns { rows, summary }
 */
export function computeCategoryConcentration(categories = [], vendors = []) {
  // Seed buckets from the master (so zero-vendor categories surface as gaps),
  // then fold in any category found only on vendors.
  const buckets = new Map();
  const seed = (c) => {
    if (!buckets.has(c.id)) buckets.set(c.id, { id: c.id, name: c.name, group: c.group?.name || c.group || null, vendors: [] });
    return buckets.get(c.id);
  };
  categories.filter((c) => c.isActive !== false).forEach(seed);
  for (const v of vendors) {
    for (const c of v.categories || []) {
      if (!buckets.has(c.id) && !categories.some((m) => m.id === c.id)) seed(c); // vendor-only category
      buckets.get(c.id)?.vendors.push(v);
    }
  }
 
  const rows = [...buckets.values()].map((b) => {
    const total = b.vendors.length;
    const active = b.vendors.filter(isActive).length;
    const level = riskLevel(total, active);
    return {
      id: b.id,
      name: b.name,
      group: b.group,
      totalVendors: total,
      activeVendors: active,
      approvedVendors: b.vendors.filter(isApproved).length,
      preferredVendors: b.vendors.filter(isPreferred).length,
      highRiskVendors: b.vendors.filter(isHighRiskVendor).length,
      concentrationPct: total > 0 ? Math.round(100 / total) : 100, // max single-supplier share (proxy)
      dependencyScore: Math.round(100 / Math.max(1, active)), // dependency on ACTIVE suppliers
      riskLevel: level,
      suppliers: b.vendors.map((v) => ({ id: v.id, name: v.name, companyName: v.companyName, city: v.city, status: v.status, supplierGrade: v.supplierGrade })),
    };
  });
 
  rows.sort((a, b) => (RISK_ORDER[a.riskLevel] - RISK_ORDER[b.riskLevel]) || a.name.localeCompare(b.name));
 
  const summary = {
    categoriesTracked: rows.length,
    critical: rows.filter((r) => r.riskLevel === 'CRITICAL').length,
    high: rows.filter((r) => r.riskLevel === 'HIGH').length,
    medium: rows.filter((r) => r.riskLevel === 'MEDIUM').length,
    healthy: rows.filter((r) => r.riskLevel === 'LOW').length,
    singleSource: rows.filter((r) => r.totalVendors === 1).length,
    gaps: rows.filter((r) => r.totalVendors === 0).length,
  };
  return { rows, summary };
}
 
export { RISK_ORDER };
