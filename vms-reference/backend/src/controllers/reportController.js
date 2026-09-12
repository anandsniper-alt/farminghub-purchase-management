import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
 
/** GET /api/reports/dashboard — headline stats for the dashboard */
export const dashboard = asyncHandler(async (_req, res) => {
  const [
    totalVendors,
    totalExpos,
    totalComponents,
    totalCategories,
    ratingAgg,
    bySampleStatus,
    byStatus,
    topCities,
    byExpo,
    recentVendors,
  ] = await Promise.all([
    prisma.vendor.count(),
    prisma.expo.count(),
    prisma.componentTag.count(),
    prisma.productCategory.count(),
    prisma.vendor.aggregate({ _avg: { overallRating: true } }),
    prisma.vendor.groupBy({ by: ['sampleStatus'], _count: { _all: true } }),
    prisma.vendor.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.vendor.groupBy({
      by: ['city'],
      _count: { _all: true },
      where: { city: { not: null } },
      orderBy: { _count: { city: 'desc' } },
      take: 8,
    }),
    prisma.vendor.groupBy({
      by: ['expoId'],
      _count: { _all: true },
      where: { expoId: { not: null } },
    }),
    prisma.vendor.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: {
        expo: { select: { name: true, edition: true, year: true } },
        components: { select: { id: true, name: true } },
      },
    }),
  ]);
 
  // Resolve expo names for byExpo
  const expoIds = byExpo.map((e) => e.expoId).filter(Boolean);
  const expos = expoIds.length
    ? await prisma.expo.findMany({
        where: { id: { in: expoIds } },
        select: { id: true, name: true, edition: true, year: true },
      })
    : [];
  const expoMap = Object.fromEntries(expos.map((e) => [e.id, e]));
 
  res.json({
    totals: {
      vendors: totalVendors,
      expos: totalExpos,
      components: totalComponents,
      categories: totalCategories,
      avgOverallRating: ratingAgg._avg.overallRating
        ? Number(ratingAgg._avg.overallRating.toFixed(2))
        : null,
    },
    bySampleStatus: bySampleStatus.map((r) => ({
      status: r.sampleStatus || 'NONE',
      count: r._count._all,
    })),
    byStatus: byStatus.map((r) => ({ status: r.status, count: r._count._all })),
    topCities: topCities.map((r) => ({ city: r.city, count: r._count._all })),
    byExpo: byExpo
      .map((r) => ({
        expo: expoMap[r.expoId]
          ? [expoMap[r.expoId].name, expoMap[r.expoId].edition, expoMap[r.expoId].year]
              .filter(Boolean)
              .join(' · ')
          : 'Unknown',
        count: r._count._all,
      }))
      .sort((a, b) => b.count - a.count),
    recentVendors,
  });
});
 
/**
 * GET /api/reports/concentration
 * Sourcing-concentration rule: no single supplier should account for more than
 * 80% of a component. We approximate max share by supplier count (evenly split):
 *   1 supplier  -> 100% (single-source, HIGH risk, breaks rule)
 *   2 suppliers -> 50%  (MEDIUM — meets rule but thin)
 *   >=3         -> LOW  (healthy alternate coverage)
 */
export const concentration = asyncHandler(async (_req, res) => {
  const components = await prisma.componentTag.findMany({
    orderBy: { name: 'asc' },
    include: {
      vendors: {
        // Count only suppliers whose stage counts in sourcing (or have no stage)
        where: { OR: [{ stageId: null }, { stage: { countsInSourcing: true } }] },
        select: { id: true, name: true, companyName: true, city: true, overallRating: true },
      },
    },
  });
 
  const report = components.map((c) => {
    const supplierCount = c.vendors.length;
    const evenSharePct = supplierCount > 0 ? Math.round(100 / supplierCount) : 100;
    const meetsRule = supplierCount >= 2; // at least one alternate => no forced 100%
    const riskLevel =
      supplierCount <= 1 ? 'HIGH' : supplierCount === 2 ? 'MEDIUM' : 'LOW';
 
    return {
      componentId: c.id,
      component: c.name,
      supplierCount,
      alternateCount: Math.max(0, supplierCount - 1),
      evenSharePct, // implied max share if sourcing were evenly split
      meetsRule, // relative to the 80% single-supplier ceiling
      riskLevel,
      suppliers: c.vendors,
    };
  });
 
  const summary = {
    componentsTracked: report.length,
    singleSource: report.filter((r) => r.riskLevel === 'HIGH').length,
    thinCoverage: report.filter((r) => r.riskLevel === 'MEDIUM').length,
    healthy: report.filter((r) => r.riskLevel === 'LOW').length,
  };
 
  res.json({ summary, report });
});
 
/**
 * GET /api/reports/analytics
 * Cross-tabs: vendors per product line (grouped), vendors per component,
 * product lines per vendor, and vendors per stage.
 */
export const analytics = asyncHandler(async (_req, res) => {
  const [groups, components, stages, vendors] = await Promise.all([
    prisma.categoryGroup.findMany({
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      include: {
        categories: {
          orderBy: { name: 'asc' },
          include: { _count: { select: { vendors: true } } },
        },
      },
    }),
    prisma.componentTag.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { vendors: true } } },
    }),
    prisma.vendorStage.findMany({
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { vendors: true } } },
    }),
    prisma.vendor.findMany({
      select: {
        id: true,
        name: true,
        companyName: true,
        city: true,
        categories: { select: { id: true, name: true } },
        components: { select: { id: true } },
      },
      orderBy: { name: 'asc' },
    }),
  ]);
 
  // Ungrouped product lines
  const ungrouped = await prisma.productCategory.findMany({
    where: { groupId: null },
    orderBy: { name: 'asc' },
    include: { _count: { select: { vendors: true } } },
  });
 
  const vendorsPerGroup = groups.map((g) => {
    // distinct vendors across all lines in this group
    return {
      groupId: g.id,
      group: g.name,
      lines: g.categories.map((c) => ({ id: c.id, name: c.name, vendorCount: c._count.vendors })),
      lineCount: g.categories.length,
    };
  });
 
  const productLinesPerVendor = vendors
    .map((v) => ({
      id: v.id,
      name: v.name,
      companyName: v.companyName,
      city: v.city,
      productLineCount: v.categories.length,
      componentCount: v.components.length,
      productLines: v.categories.map((c) => c.name),
    }))
    .sort((a, b) => b.productLineCount - a.productLineCount);
 
  res.json({
    totals: {
      vendors: vendors.length,
      productLines: groups.reduce((n, g) => n + g.categories.length, 0) + ungrouped.length,
      components: components.length,
    },
    vendorsPerGroup,
    ungroupedLines: ungrouped.map((c) => ({ id: c.id, name: c.name, vendorCount: c._count.vendors })),
    vendorsPerComponent: components
      .map((c) => ({ id: c.id, name: c.name, vendorCount: c._count.vendors }))
      .sort((a, b) => b.vendorCount - a.vendorCount),
    vendorsPerStage: stages.map((s) => ({ id: s.id, name: s.name, color: s.color, vendorCount: s._count.vendors })),
    productLinesPerVendor,
  });
});
