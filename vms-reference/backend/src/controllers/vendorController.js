import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { computeEvaluation, EVALUATION_KEYS } from '../services/evaluationService.js';
 
const vendorInclude = {
  expo: true,
  stage: true,
  productLine: { select: { id: true, name: true } },
  assignedTo: { select: { id: true, name: true } },
  countryRef: { select: { id: true, name: true } },
  stateRef: { select: { id: true, name: true } },
  districtRef: { select: { id: true, name: true } },
  components: { select: { id: true, name: true } },
  categories: { select: { id: true, name: true, group: { select: { id: true, name: true } } } },
  contacts: { orderBy: { order: 'asc' } },
  samples: {
    include: { componentTag: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  },
  photos: { orderBy: { createdAt: 'desc' } },
  _count: { select: { interactions: true } },
  createdBy: { select: { id: true, name: true } },
};
 
function buildContactsCreate(contacts = []) {
  return contacts
    .filter((c) => c && c.name && c.name.trim())
    .map((c, i) => ({
      name: c.name.trim(),
      phone: c.phone || null,
      designation: c.designation || null,
      isPrimary: !!c.isPrimary,
      order: c.order ?? i,
    }));
}
 
/** Resolve componentIds + componentNames into a Prisma connect/connectOrCreate set. */
function buildComponentConnect(componentIds = [], componentNames = []) {
  const connect = componentIds.map((id) => ({ id }));
  const connectOrCreate = componentNames
    .map((n) => n.trim())
    .filter(Boolean)
    .map((name) => ({ where: { name }, create: { name } }));
  return { connect, connectOrCreate };
}
 
/**
 * Resolve selected Country/State/District ids to their names so we can also keep the
 * legacy `country`/`region`/`city` text columns populated (search + old records + list view).
 * Returns only the text fields that could be resolved.
 */
async function resolveGeoText({ countryId, stateId, districtId }) {
  const [country, state, district] = await Promise.all([
    countryId ? prisma.country.findUnique({ where: { id: countryId }, select: { name: true } }) : null,
    stateId ? prisma.state.findUnique({ where: { id: stateId }, select: { name: true } }) : null,
    districtId ? prisma.district.findUnique({ where: { id: districtId }, select: { name: true } }) : null,
  ]);
  const text = {};
  if (country) text.country = country.name;
  if (state) text.region = state.name;
  if (district) text.city = district.name;
  return text;
}
 
/** Extract the 11 evaluation criterion scores from a request body (null when unset). */
function pickEvalScores(b = {}) {
  const out = {};
  for (const k of EVALUATION_KEYS) {
    const v = b[k];
    out[k] = v === undefined || v === '' || v === null ? null : Number(v);
  }
  return out;
}
 
function buildSampleCreate(samples = []) {
  return samples.map((s) => ({
    componentTagId: s.componentTagId || null,
    componentName: s.componentName || null,
    status: s.status || 'REQUESTED',
    price: s.price ?? null,
    currency: s.currency || 'USD',
    priceRemarks: s.priceRemarks || null,
    qualityRemarks: s.qualityRemarks || null,
  }));
}
 
/** GET /api/vendors — search, filter, paginate */
export const listVendors = asyncHandler(async (req, res) => {
  const {
    q, city, stateId, expoId, stageId, componentId, categoryId, groupId, productLineId, assignedToId,
    status, sampleStatus, minRating, sort, page, pageSize,
  } = req.query;
 
  const where = { AND: [] };
 
  if (q) {
    where.AND.push({
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { companyName: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { wechat: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { remarks: { contains: q, mode: 'insensitive' } },
        { components: { some: { name: { contains: q, mode: 'insensitive' } } } },
      ],
    });
  }
  if (city) where.AND.push({ city: { contains: city, mode: 'insensitive' } });
  if (stateId) where.AND.push({ stateId });
  if (expoId) where.AND.push({ expoId });
  if (stageId) where.AND.push({ stageId });
  if (componentId) where.AND.push({ components: { some: { id: componentId } } });
  if (categoryId) where.AND.push({ categories: { some: { id: categoryId } } });
  if (groupId) where.AND.push({ categories: { some: { groupId } } });
  if (productLineId) where.AND.push({ productLineId });
  if (assignedToId) where.AND.push({ assignedToId });
  if (status) where.AND.push({ status });
  if (sampleStatus) where.AND.push({ sampleStatus });
  if (minRating) where.AND.push({ overallRating: { gte: minRating } });
 
  const orderBy =
    sort === 'name' ? { name: 'asc' }
    : sort === 'rating' ? { overallRating: 'desc' }
    : sort === 'city' ? { city: 'asc' }
    : sort === 'state' ? { region: 'asc' }
    : { createdAt: 'desc' };
 
  const [total, vendors] = await Promise.all([
    prisma.vendor.count({ where }),
    prisma.vendor.findMany({
      where,
      include: vendorInclude,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
 
  res.json({
    data: vendors,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
});
 
/** GET /api/vendors/:id */
export const getVendor = asyncHandler(async (req, res) => {
  const vendor = await prisma.vendor.findUnique({
    where: { id: req.params.id },
    include: vendorInclude,
  });
  if (!vendor) throw ApiError.notFound('Vendor not found');
  res.json({ vendor });
});
 
/** POST /api/vendors */
export const createVendor = asyncHandler(async (req, res) => {
  const b = req.body;
  // When location is picked from the masters, mirror the names into the legacy text columns.
  const geoText = await resolveGeoText(b);
  // Per-criterion evaluation scores + auto-computed results.
  const evalScores = pickEvalScores(b);
  const evalResults = computeEvaluation(evalScores);
  const vendor = await prisma.vendor.create({
    data: {
      name: b.name,
      designation: b.designation || null,
      companyName: b.companyName || null,
      phone: b.phone || null,
      wechat: b.wechat || null,
      email: b.email || null,
      website: b.website || null,
      city: geoText.city ?? b.city ?? null,
      region: geoText.region ?? b.region ?? null,
      country: geoText.country ?? b.country ?? null,
      countryId: b.countryId || null,
      stateId: b.stateId || null,
      districtId: b.districtId || null,
      productLineId: b.productLineId || null,
      assignedToId: b.assignedToId || null,
      expoId: b.expoId || null,
      stageId: b.stageId || null,
      communicationRating: b.communicationRating ?? null,
      reliabilityRating: b.reliabilityRating ?? null,
      ...evalScores,
      ...evalResults,
      annualVolume: b.annualVolume || null,
      remarks: b.remarks || null,
      sampleStatus: b.sampleStatus || null,
      status: b.status || 'ACTIVE',
      createdById: req.user?.id || null,
      components: buildComponentConnect(b.componentIds, b.componentNames),
      categories: { connect: (b.categoryIds || []).map((id) => ({ id })) },
      contacts: { create: buildContactsCreate(b.contacts) },
      samples: { create: buildSampleCreate(b.samples) },
    },
    include: vendorInclude,
  });
  res.status(201).json({ vendor });
});
 
/** PUT /api/vendors/:id */
export const updateVendor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const b = req.body;
 
  const exists = await prisma.vendor.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw ApiError.notFound('Vendor not found');
 
  // Build scalar update (only defined keys)
  const data = {};
  const scalarKeys = [
    'name', 'designation', 'companyName', 'phone', 'wechat', 'email', 'website',
    'city', 'region', 'country', 'expoId', 'stageId', 'annualVolume', 'remarks',
    'countryId', 'stateId', 'districtId', 'productLineId', 'assignedToId',
    'communicationRating', 'reliabilityRating',
    'sampleStatus', 'status',
  ];
  for (const k of scalarKeys) {
    if (b[k] !== undefined) data[k] = b[k] === '' ? null : b[k];
  }
 
  // Evaluation: if any criterion is present, persist all 11 scores and recompute results.
  if (EVALUATION_KEYS.some((k) => b[k] !== undefined)) {
    const current = await prisma.vendor.findUnique({
      where: { id },
      select: Object.fromEntries(EVALUATION_KEYS.map((k) => [k, true])),
    });
    const scores = {};
    for (const k of EVALUATION_KEYS) {
      scores[k] = b[k] !== undefined ? (b[k] === '' || b[k] === null ? null : Number(b[k])) : current?.[k] ?? null;
    }
    Object.assign(data, scores, computeEvaluation(scores));
  }
 
  // When a location master is selected, mirror its name into the legacy text column.
  // Only act on truthy ids so editing an old (FK-less) vendor never wipes its saved text.
  if (b.countryId || b.stateId || b.districtId) {
    const geoText = await resolveGeoText(b);
    if (b.countryId) data.country = geoText.country ?? undefined;
    if (b.stateId) data.region = geoText.region ?? undefined;
    if (b.districtId) data.city = geoText.city ?? undefined;
  }
 
  // Relations: reset + reconnect when provided
  if (b.componentIds !== undefined || b.componentNames !== undefined) {
    data.components = { set: [], ...buildComponentConnect(b.componentIds, b.componentNames) };
  }
  if (b.categoryIds !== undefined) {
    data.categories = { set: (b.categoryIds || []).map((cid) => ({ id: cid })) };
  }
 
  // Samples & contacts: replace the whole set when provided
  const tx = [];
  if (b.samples !== undefined) {
    tx.push(prisma.sample.deleteMany({ where: { vendorId: id } }));
    data.samples = { create: buildSampleCreate(b.samples) };
  }
  if (b.contacts !== undefined) {
    tx.push(prisma.vendorContact.deleteMany({ where: { vendorId: id } }));
    data.contacts = { create: buildContactsCreate(b.contacts) };
  }
  tx.push(prisma.vendor.update({ where: { id }, data, include: vendorInclude }));
 
  const results = await prisma.$transaction(tx);
  res.json({ vendor: results[results.length - 1] });
});
 
/** DELETE /api/vendors/:id */
export const deleteVendor = asyncHandler(async (req, res) => {
  await prisma.vendor.delete({ where: { id: req.params.id } });
  res.json({ message: 'Vendor deleted' });
});
