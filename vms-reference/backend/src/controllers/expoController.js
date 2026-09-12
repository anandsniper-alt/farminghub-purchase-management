import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
 
/** GET /api/expos */
export const listExpos = asyncHandler(async (_req, res) => {
  const expos = await prisma.expo.findMany({
    orderBy: [{ year: 'desc' }, { name: 'asc' }],
    include: { _count: { select: { vendors: true } } },
  });
  res.json({ expos });
});
 
/** GET /api/expos/:id */
export const getExpo = asyncHandler(async (req, res) => {
  const expo = await prisma.expo.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { vendors: true } } },
  });
  if (!expo) throw ApiError.notFound('Expo not found');
  res.json({ expo });
});
 
/** POST /api/expos */
export const createExpo = asyncHandler(async (req, res) => {
  const expo = await prisma.expo.create({ data: req.body });
  res.status(201).json({ expo });
});
 
/** PUT /api/expos/:id */
export const updateExpo = asyncHandler(async (req, res) => {
  const expo = await prisma.expo.update({ where: { id: req.params.id }, data: req.body });
  res.json({ expo });
});
 
/** DELETE /api/expos/:id */
export const deleteExpo = asyncHandler(async (req, res) => {
  await prisma.expo.delete({ where: { id: req.params.id } });
  res.json({ message: 'Expo deleted' });
});
