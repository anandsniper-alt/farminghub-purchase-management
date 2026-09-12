import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { refreshCurrencyRates } from '../services/currencyService.js';
 
/* ============================ Category Groups ============================ */
export const listCategoryGroups = asyncHandler(async (_req, res) => {
  const groups = await prisma.categoryGroup.findMany({
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
    include: {
      categories: {
        orderBy: { name: 'asc' },
        include: { _count: { select: { vendors: true } } },
      },
      _count: { select: { categories: true } },
    },
  });
  res.json({ groups });
});
 
export const createCategoryGroup = asyncHandler(async (req, res) => {
  const group = await prisma.categoryGroup.create({ data: req.body });
  res.status(201).json({ group });
});
 
export const updateCategoryGroup = asyncHandler(async (req, res) => {
  const group = await prisma.categoryGroup.update({ where: { id: req.params.id }, data: req.body });
  res.json({ group });
});
 
export const deleteCategoryGroup = asyncHandler(async (req, res) => {
  // Product lines keep existing but become ungrouped (onDelete: SetNull)
  await prisma.categoryGroup.delete({ where: { id: req.params.id } });
  res.json({ message: 'Group deleted' });
});
 
/* ============================ Vendor Stages ============================ */
export const listStages = asyncHandler(async (_req, res) => {
  const stages = await prisma.vendorStage.findMany({
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { vendors: true } } },
  });
  res.json({ stages });
});
 
export const createStage = asyncHandler(async (req, res) => {
  const stage = await prisma.vendorStage.create({ data: req.body });
  res.status(201).json({ stage });
});
 
export const updateStage = asyncHandler(async (req, res) => {
  const stage = await prisma.vendorStage.update({ where: { id: req.params.id }, data: req.body });
  res.json({ stage });
});
 
export const deleteStage = asyncHandler(async (req, res) => {
  await prisma.vendorStage.delete({ where: { id: req.params.id } });
  res.json({ message: 'Stage deleted' });
});
 
/* ============================ Photo Types ============================ */
export const listPhotoTypes = asyncHandler(async (_req, res) => {
  const photoTypes = await prisma.photoType.findMany({
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { photos: true } } },
  });
  res.json({ photoTypes });
});
 
export const createPhotoType = asyncHandler(async (req, res) => {
  const photoType = await prisma.photoType.create({ data: req.body });
  res.status(201).json({ photoType });
});
 
export const updatePhotoType = asyncHandler(async (req, res) => {
  const photoType = await prisma.photoType.update({ where: { id: req.params.id }, data: req.body });
  res.json({ photoType });
});
 
export const deletePhotoType = asyncHandler(async (req, res) => {
  await prisma.photoType.delete({ where: { id: req.params.id } });
  res.json({ message: 'Photo type deleted' });
});
 
/* ============================ Product Lines ============================ */
export const listProductLines = asyncHandler(async (_req, res) => {
  const productLines = await prisma.productLine.findMany({
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { vendors: true } } },
  });
  res.json({ productLines });
});
 
export const createProductLine = asyncHandler(async (req, res) => {
  const productLine = await prisma.productLine.create({ data: req.body });
  res.status(201).json({ productLine });
});
 
export const updateProductLine = asyncHandler(async (req, res) => {
  const productLine = await prisma.productLine.update({ where: { id: req.params.id }, data: req.body });
  res.json({ productLine });
});
 
export const deleteProductLine = asyncHandler(async (req, res) => {
  await prisma.productLine.delete({ where: { id: req.params.id } });
  res.json({ message: 'Product line deleted' });
});
 
/* ============================ Currency Rates ============================ */
export const listCurrencyRates = asyncHandler(async (_req, res) => {
  const rates = await prisma.currencyRate.findMany({ orderBy: { code: 'asc' } });
  res.json({ rates });
});
 
/** Upsert a batch of rates (edit table in Settings). */
export const updateCurrencyRates = asyncHandler(async (req, res) => {
  const { rates } = req.body;
  const saved = await prisma.$transaction(
    rates.map((r) =>
      prisma.currencyRate.upsert({
        where: { code: r.code },
        update: { name: r.name, symbol: r.symbol || null, inrPerUnit: r.inrPerUnit },
        create: { code: r.code, name: r.name, symbol: r.symbol || null, inrPerUnit: r.inrPerUnit },
      })
    )
  );
  res.json({ rates: saved });
});
 
export const deleteCurrencyRate = asyncHandler(async (req, res) => {
  await prisma.currencyRate.delete({ where: { code: req.params.code.toUpperCase() } });
  res.json({ message: 'Currency removed' });
});
 
/** POST /api/currency-rates/refresh — fetch live rates from the internet. */
export const refreshCurrencyRatesHandler = asyncHandler(async (_req, res) => {
  try {
    const result = await refreshCurrencyRates();
    res.json({ message: `Updated ${result.updated} currencies from ${result.source}`, ...result });
  } catch (e) {
    throw ApiError.badRequest(`Could not fetch live rates: ${e.message}`);
  }
});
