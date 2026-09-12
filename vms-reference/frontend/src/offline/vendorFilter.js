// Client-side search / filter / sort for the vendor list. Used so the list works
// identically online and offline (over the cached full dataset).
 
const norm = (s) => String(s || '').toLowerCase();
 
export function filterVendors(vendors, { q, filters }) {
  let out = vendors;
  if (q) {
    const needle = norm(q);
    out = out.filter((v) =>
      [v.name, v.companyName, v.phone, v.wechat, v.city, v.region]
        .some((f) => norm(f).includes(needle)) ||
      (v.components || []).some((c) => norm(c.name).includes(needle))
    );
  }
  const f = filters || {};
  if (f.stageId) out = out.filter((v) => v.stage?.id === f.stageId);
  if (f.expoId) out = out.filter((v) => v.expo?.id === f.expoId);
  if (f.componentId) out = out.filter((v) => (v.components || []).some((c) => c.id === f.componentId));
  if (f.categoryId) out = out.filter((v) => (v.categories || []).some((c) => c.id === f.categoryId));
  if (f.groupId) out = out.filter((v) => (v.categories || []).some((c) => c.group?.id === f.groupId));
  if (f.stateId) out = out.filter((v) => v.stateId === f.stateId);
  if (f.productLineId) out = out.filter((v) => v.productLine?.id === f.productLineId);
  if (f.status) out = out.filter((v) => v.status === f.status);
  return out;
}
 
export function sortVendors(vendors, sort) {
  const arr = [...vendors];
  switch (sort) {
    case 'name': return arr.sort((a, b) => norm(a.name).localeCompare(norm(b.name)));
    case 'rating': return arr.sort((a, b) => (b.overallRating || 0) - (a.overallRating || 0));
    case 'state': return arr.sort((a, b) => norm(a.region).localeCompare(norm(b.region)));
    case 'city': return arr.sort((a, b) => norm(a.city).localeCompare(norm(b.city)));
    default: return arr.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }
}
