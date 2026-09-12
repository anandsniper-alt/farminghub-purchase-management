import { z } from 'zod';
 
// ---- helpers ----
const optionalString = z.string().trim().max(4000).optional().or(z.literal('').transform(() => undefined));
const rating = z.coerce.number().int().min(1).max(5).optional();
// Evaluation criterion: 1-5, but tolerates '' / null (treated as "not rated").
const evalRating = z.preprocess(
  (v) => (v === '' || v === null ? undefined : v),
  z.coerce.number().int().min(1).max(5).optional()
);
const cuid = z.string().min(1);
 
export const SampleStatusEnum = z.enum(['NONE', 'REQUESTED', 'RECEIVED', 'APPROVED', 'REJECTED']);
export const VendorStatusEnum = z.enum(['ACTIVE', 'ARCHIVED', 'BLACKLISTED']);
export const RoleEnum = z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE']);
 
// ---- RBAC ----
const actionPerms = z
  .object({
    view: z.boolean().optional(),
    create: z.boolean().optional(),
    edit: z.boolean().optional(),
    delete: z.boolean().optional(),
  })
  .partial();
const permissionsObject = z.record(z.string(), actionPerms);
 
export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6).max(128),
  role: RoleEnum.default('EMPLOYEE'),
});
 
export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  role: RoleEnum.optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).max(128).optional().or(z.literal('').transform(() => undefined)),
});
 
export const userPermissionsSchema = z.object({
  permissions: permissionsObject.nullable(),
});
 
export const roleMatrixSchema = z.object({
  permissions: permissionsObject,
});
 
export const copyRoleSchema = z.object({
  from: RoleEnum,
  to: RoleEnum,
});
 
export const setAllRoleSchema = z.object({
  role: RoleEnum,
  value: z.boolean(),
});
 
export const passwordResetRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  newPassword: z.string().min(6).max(128),
  note: z.string().trim().max(300).optional(),
});
export const InteractionTypeEnum = z.enum(['NOTE', 'CALL', 'MEETING', 'VISIT', 'ONLINE', 'VOICE', 'DOCUMENT']);
 
// ---------------------------------------------------------------- Auth
export const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
  role: RoleEnum.optional(),
});
 
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});
 
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});
 
// ---------------------------------------------------------------- Nested: sample
const sampleSchema = z.object({
  id: z.string().optional(),
  componentTagId: cuid.optional().nullable(),
  componentName: optionalString,
  status: SampleStatusEnum.default('REQUESTED'),
  price: z.coerce.number().nonnegative().optional().nullable(),
  currency: z.string().trim().max(8).optional(), // currency code (INR/USD/YUAN)
  priceRemarks: optionalString,
  qualityRemarks: optionalString,
});
 
// ---------------------------------------------------------------- Nested: contact
const contactSchema = z.object({
  name: z.string().trim().min(1).max(160),
  phone: optionalString,
  designation: optionalString,
  isPrimary: z.boolean().optional(),
  order: z.coerce.number().int().optional(),
});
 
// ---------------------------------------------------------------- Vendor
export const vendorBaseSchema = z.object({
  name: z.string().trim().min(1, 'Contact name is required').max(160),
  designation: optionalString,
  companyName: optionalString,
  phone: optionalString,
  wechat: optionalString,
  email: z.string().trim().toLowerCase().email().optional().or(z.literal('').transform(() => undefined)),
  website: optionalString,
 
  city: optionalString,
  region: optionalString,
  country: optionalString,
 
  // Structured location masters (cascading)
  countryId: cuid.optional().nullable(),
  stateId: cuid.optional().nullable(),
  districtId: cuid.optional().nullable(),
 
  // Product-line classification master
  productLineId: cuid.optional().nullable(),
 
  expoId: cuid.optional().nullable(),
  stageId: cuid.optional().nullable(),
 
  communicationRating: rating,
  reliabilityRating: rating,
 
  // Weighted evaluation criteria (each 1-5; overall is auto-computed server-side)
  evalProductQuality: evalRating,
  evalQualityControl: evalRating,
  evalReliability: evalRating,
  evalFinancialStrength: evalRating,
  evalProductionVolume: evalRating,
  evalCredibility: evalRating,
  evalPricingSupport: evalRating,
  evalCommunication: evalRating,
  evalWillingness: evalRating,
  evalCreditSupport: evalRating,
  evalMarketExposure: evalRating,
 
  assignedToId: cuid.optional().nullable(),
 
  annualVolume: optionalString,
  remarks: optionalString,
  sampleStatus: SampleStatusEnum.optional().nullable(),
  status: VendorStatusEnum.optional(),
 
  componentIds: z.array(cuid).optional().default([]),
  componentNames: z.array(z.string().trim().min(1)).optional().default([]),
  categoryIds: z.array(cuid).optional().default([]),
 
  contacts: z.array(contactSchema).optional().default([]),
  samples: z.array(sampleSchema).optional().default([]),
});
 
export const createVendorSchema = vendorBaseSchema;
export const updateVendorSchema = vendorBaseSchema.partial();
 
export const vendorQuerySchema = z.object({
  q: z.string().trim().optional(),
  city: z.string().trim().optional(),
  stateId: z.string().trim().optional(),
  expoId: z.string().trim().optional(),
  stageId: z.string().trim().optional(),
  componentId: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  groupId: z.string().trim().optional(),
  productLineId: z.string().trim().optional(),
  assignedToId: z.string().trim().optional(),
  status: VendorStatusEnum.optional(),
  sampleStatus: SampleStatusEnum.optional(),
  minRating: z.coerce.number().int().min(1).max(5).optional(),
  sort: z.enum(['recent', 'name', 'rating', 'city', 'state']).default('recent'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(2000).default(20),
});
 
// ---------------------------------------------------------------- Expo
export const expoSchema = z.object({
  name: z.string().trim().min(1).max(160),
  edition: optionalString,
  year: z.coerce.number().int().min(1900).max(2100).optional().nullable(),
  city: optionalString,
  country: optionalString,
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  notes: optionalString,
});
 
// ---------------------------------------------------------------- Category group + category
export const categoryGroupSchema = z.object({
  name: z.string().trim().min(1).max(120),
  order: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
});
 
export const categorySchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: optionalString,
  groupId: cuid.optional().nullable(),
  isActive: z.boolean().optional(),
});
 
// ---------------------------------------------------------------- Component tag
export const componentSchema = z.object({
  name: z.string().trim().min(1).max(120),
});
 
// ---------------------------------------------------------------- Vendor stage (editable list)
export const vendorStageSchema = z.object({
  name: z.string().trim().min(1).max(80),
  order: z.coerce.number().int().optional(),
  color: z.enum(['gray', 'green', 'blue', 'amber', 'red', 'purple']).optional(),
  countsInSourcing: z.boolean().optional(),
  isActive: z.boolean().optional(),
});
 
// ---------------------------------------------------------------- Product line (editable list)
export const productLineSchema = z.object({
  name: z.string().trim().min(1).max(80),
  order: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
});
 
// ---------------------------------------------------------------- Location masters
export const countrySchema = z.object({
  name: z.string().trim().min(1).max(120),
  code: optionalString,
  order: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
});
export const stateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  countryId: cuid,
  order: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
});
export const districtSchema = z.object({
  name: z.string().trim().min(1).max(120),
  stateId: cuid,
  order: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
});
 
// ---------------------------------------------------------------- Photo type (editable list)
export const photoTypeSchema = z.object({
  name: z.string().trim().min(1).max(80),
  order: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
});
 
// ---------------------------------------------------------------- Currency rate
export const currencyRateSchema = z.object({
  code: z.string().trim().min(1).max(8).toUpperCase(),
  name: z.string().trim().min(1).max(60),
  symbol: optionalString,
  inrPerUnit: z.coerce.number().positive(),
});
export const currencyRatesUpdateSchema = z.object({
  rates: z.array(currencyRateSchema).min(1),
});
 
// ---------------------------------------------------------------- Column preferences
export const columnConfigSchema = z.object({
  config: z
    .array(
      z.object({
        key: z.string().trim().min(1).max(80),
        label: z.string().trim().max(120).optional(),
        visible: z.boolean().optional(),
        width: z.coerce.number().int().min(40).max(1000).optional().nullable(),
        frozen: z.boolean().optional(),
      })
    )
    .max(100),
});
 
// ---------------------------------------------------------------- Photo upload meta
export const photoMetaSchema = z.object({
  caption: optionalString,
  typeId: cuid.optional().nullable(),
  typeLabel: optionalString,
});
 
// ---------------------------------------------------------------- Interaction
export const interactionSchema = z.object({
  type: InteractionTypeEnum.default('NOTE'),
  title: optionalString,
  notes: optionalString,
  occurredAt: z.coerce.date().optional(),
  nextFollowUpAt: z.coerce.date({ required_error: 'Next follow-up date is required' }),
});
 
/** Update an interaction's follow-up state (complete / reschedule). */
export const interactionUpdateSchema = z
  .object({
    nextFollowUpAt: z.coerce.date().optional(),
    followUpCompleted: z.boolean().optional(),
  })
  .refine((d) => d.nextFollowUpAt !== undefined || d.followUpCompleted !== undefined, {
    message: 'Nothing to update',
  });
