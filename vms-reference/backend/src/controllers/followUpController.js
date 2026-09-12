import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
 
// ---------------------------------------------------------------------------
// Vendor follow-up dashboard
// Each vendor's "current follow-up" = the most recent interaction that carries
// a nextFollowUpAt. Status is derived (Today / Upcoming / Overdue / Completed).
// ---------------------------------------------------------------------------
 
function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
 
/** Derive status + days-remaining for a follow-up. */
function deriveStatus(nextFollowUpAt, completed) {
  if (completed) return { status: 'Completed', daysRemaining: null };
  if (!nextFollowUpAt) return { status: 'Upcoming', daysRemaining: null };
  const now = startOfToday();
  const due = new Date(nextFollowUpAt);
  due.setHours(0, 0, 0, 0);
  const days = Math.round((due - now) / (1000 * 60 * 60 * 24));
  if (days < 0) return { status: 'Overdue', daysRemaining: days };
  if (days === 0) return { status: 'Today', daysRemaining: 0 };
  return { status: 'Upcoming', daysRemaining: days };
}
 
/**
 * GET /api/follow-ups
 * Query: status (Today|Upcoming|Overdue|Completed), assignedToId, city, productLineId,
 *        from, to (date range on nextFollowUpAt), q
 */
export const listFollowUps = asyncHandler(async (req, res) => {
  const { status, assignedToId, city, productLineId, from, to, q } = req.query;
 
  // Pull vendors that have at least one interaction with a follow-up date, plus their
  // latest such interaction. We fetch candidate vendors then reduce in JS (dataset is small).
  const vendorWhere = { AND: [{ interactions: { some: { nextFollowUpAt: { not: null } } } }] };
  if (assignedToId) vendorWhere.AND.push({ assignedToId });
  if (productLineId) vendorWhere.AND.push({ productLineId });
  if (city) vendorWhere.AND.push({ city: { contains: city, mode: 'insensitive' } });
  if (q) {
    vendorWhere.AND.push({
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { companyName: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
      ],
    });
  }
 
  const vendors = await prisma.vendor.findMany({
    where: vendorWhere,
    select: {
      id: true, name: true, designation: true, companyName: true, city: true, region: true,
      stateRef: { select: { name: true } },
      productLine: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
      interactions: {
        where: { nextFollowUpAt: { not: null } },
        orderBy: { occurredAt: 'desc' },
        take: 1,
        select: {
          id: true, occurredAt: true, nextFollowUpAt: true,
          followUpCompleted: true, title: true, type: true,
        },
      },
    },
  });
 
  let rows = vendors
    .filter((v) => v.interactions.length > 0)
    .map((v) => {
      const it = v.interactions[0];
      const { status: st, daysRemaining } = deriveStatus(it.nextFollowUpAt, it.followUpCompleted);
      return {
        vendorId: v.id,
        interactionId: it.id,
        companyName: v.companyName || v.name,
        contactPerson: v.name,
        designation: v.designation,
        city: v.city,
        state: v.stateRef?.name || v.region || null,
        productLine: v.productLine,
        assignedTo: v.assignedTo,
        lastInteractionAt: it.occurredAt,
        nextFollowUpAt: it.nextFollowUpAt,
        followUpCompleted: it.followUpCompleted,
        daysRemaining,
        status: st,
      };
    });
 
  if (status) rows = rows.filter((r) => r.status === status);
  if (from) rows = rows.filter((r) => new Date(r.nextFollowUpAt) >= new Date(from));
  if (to) rows = rows.filter((r) => new Date(r.nextFollowUpAt) <= new Date(to));
 
  // Overdue first, then Today, Upcoming, Completed; each by soonest date.
  const order = { Overdue: 0, Today: 1, Upcoming: 2, Completed: 3 };
  rows.sort((a, b) => (order[a.status] - order[b.status]) || (new Date(a.nextFollowUpAt) - new Date(b.nextFollowUpAt)));
 
  const counts = { Today: 0, Upcoming: 0, Overdue: 0, Completed: 0 };
  for (const r of rows) counts[r.status] = (counts[r.status] || 0) + 1;
 
  res.json({ followUps: rows, counts, total: rows.length });
});
 
/** GET /api/follow-ups/summary — counts only (for the sidebar badge / dashboard cards). */
export const followUpSummary = asyncHandler(async (_req, res) => {
  const withFollowUp = await prisma.vendor.findMany({
    where: { interactions: { some: { nextFollowUpAt: { not: null } } } },
    select: {
      interactions: {
        where: { nextFollowUpAt: { not: null } },
        orderBy: { occurredAt: 'desc' },
        take: 1,
        select: { nextFollowUpAt: true, followUpCompleted: true },
      },
    },
  });
  const counts = { Today: 0, Upcoming: 0, Overdue: 0, Completed: 0 };
  for (const v of withFollowUp) {
    const it = v.interactions[0];
    if (!it) continue;
    const { status } = deriveStatus(it.nextFollowUpAt, it.followUpCompleted);
    counts[status] = (counts[status] || 0) + 1;
  }
  res.json({ counts, pending: counts.Overdue + counts.Today + counts.Upcoming });
});
