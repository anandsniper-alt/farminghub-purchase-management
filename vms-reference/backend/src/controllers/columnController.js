import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
 
// ---------------------------------------------------------------------------
// Configurable list columns (Vendors + Vendor Follow-up).
// Available fields are enumerated here; the frontend knows how to render each key
// and auto-adds any brand-new scalar fields it finds in the data.
// ---------------------------------------------------------------------------
 
const AVAILABLE = {
  vendors: [
    { key: 'vendor', label: 'Vendor', sortable: 'name' },
    { key: 'productLine', label: 'Product Lines', sortable: false },
    { key: 'categories', label: 'Product Categories', sortable: false },
    { key: 'state', label: 'State', sortable: 'state' },
    { key: 'city', label: 'City', sortable: 'city' },
    { key: 'stage', label: 'Stage', sortable: false },
    { key: 'overallRating', label: 'Overall Rating', sortable: 'rating' },
    { key: 'supplierGrade', label: 'Grade', sortable: false },
    { key: 'supplierStatus', label: 'Supplier Status', sortable: false },
    { key: 'assignedTo', label: 'Assigned To', sortable: false },
    { key: 'phone', label: 'Phone', sortable: false },
    { key: 'email', label: 'Email', sortable: false },
    { key: 'annualVolume', label: 'Annual Volume', sortable: false },
    { key: 'createdAt', label: 'Added On', sortable: 'recent' },
  ],
  'follow-ups': [
    { key: 'companyName', label: 'Company Name', sortable: false },
    { key: 'contact', label: 'Contact Person', sortable: false },
    { key: 'designation', label: 'Designation', sortable: false },
    { key: 'state', label: 'State', sortable: false },
    { key: 'city', label: 'City', sortable: false },
    { key: 'productLine', label: 'Product Lines', sortable: false },
    { key: 'lastInteractionAt', label: 'Last Interaction', sortable: false },
    { key: 'nextFollowUpAt', label: 'Next Follow-up', sortable: false },
    { key: 'daysRemaining', label: 'Days Remaining', sortable: false },
    { key: 'status', label: 'Follow-up Status', sortable: false },
    { key: 'assignedTo', label: 'Assigned To', sortable: false },
    { key: 'actions', label: 'Actions', sortable: false },
  ],
};
 
function assertList(listKey) {
  if (!AVAILABLE[listKey]) throw ApiError.badRequest(`Unknown list "${listKey}"`);
}
 
/** GET /api/column-configs/:listKey → { available, global, personal } */
export const getColumnConfig = asyncHandler(async (req, res) => {
  const { listKey } = req.params;
  assertList(listKey);
  const [global, personal] = await Promise.all([
    prisma.columnPreference.findFirst({ where: { listKey, scope: 'GLOBAL', userId: null } }),
    req.user?.id
      ? prisma.columnPreference.findFirst({ where: { listKey, scope: 'USER', userId: req.user.id } })
      : null,
  ]);
  res.json({
    available: AVAILABLE[listKey],
    global: global?.config || null,
    personal: personal?.config || null,
  });
});
 
/** Find-then-update/create (null-safe for the GLOBAL row where userId is NULL). */
async function saveConfig({ listKey, scope, userId, config }) {
  const existing = await prisma.columnPreference.findFirst({ where: { listKey, scope, userId: userId ?? null } });
  if (existing) {
    return prisma.columnPreference.update({ where: { id: existing.id }, data: { config } });
  }
  return prisma.columnPreference.create({ data: { listKey, scope, userId: userId ?? null, config } });
}
 
/** PUT /api/column-configs/:listKey → save the current user's personal layout */
export const savePersonalColumnConfig = asyncHandler(async (req, res) => {
  const { listKey } = req.params;
  assertList(listKey);
  if (!req.user?.id) throw ApiError.unauthorized('Login required');
  const saved = await saveConfig({ listKey, scope: 'USER', userId: req.user.id, config: req.body.config });
  res.json({ config: saved.config });
});
 
/** PUT /api/column-configs/:listKey/global → admin default for everyone */
export const saveGlobalColumnConfig = asyncHandler(async (req, res) => {
  const { listKey } = req.params;
  assertList(listKey);
  const saved = await saveConfig({ listKey, scope: 'GLOBAL', userId: null, config: req.body.config });
  res.json({ config: saved.config });
});
 
/** DELETE /api/column-configs/:listKey → reset personal layout to the default */
export const resetPersonalColumnConfig = asyncHandler(async (req, res) => {
  const { listKey } = req.params;
  assertList(listKey);
  if (!req.user?.id) throw ApiError.unauthorized('Login required');
  await prisma.columnPreference.deleteMany({ where: { listKey, scope: 'USER', userId: req.user.id } });
  res.json({ message: 'Personal layout reset' });
});
