import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
 
/** GET /api/categories */
export const listCategories = asyncHandler(async (_req, res) => {
  const categories = await prisma.productCategory.findMany({
    orderBy: { name: 'asc' },
    include: {
      group: { select: { id: true, name: true } },
      _count: { select: { vendors: true } },
    },
  });
  res.json({ categories });
});
 
/** POST /api/categories */
export const createCategory = asyncHandler(async (req, res) => {
  const category = await prisma.productCategory.create({ data: req.body });
  res.status(201).json({ category });
});
 
/** PUT /api/categories/:id */
export const updateCategory = asyncHandler(async (req, res) => {
  const category = await prisma.productCategory.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json({ category });
});
 
/** DELETE /api/categories/:id */
export const deleteCategory = asyncHandler(async (req, res) => {
  await prisma.productCategory.delete({ where: { id: req.params.id } });
  res.json({ message: 'Category deleted' });
});
