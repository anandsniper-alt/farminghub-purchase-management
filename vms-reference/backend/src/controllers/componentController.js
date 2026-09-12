import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
 
/** GET /api/components — component/product tags with vendor counts */
export const listComponents = asyncHandler(async (_req, res) => {
  const components = await prisma.componentTag.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { vendors: true } } },
  });
  res.json({ components });
});
 
/** POST /api/components */
export const createComponent = asyncHandler(async (req, res) => {
  const component = await prisma.componentTag.create({ data: req.body });
  res.status(201).json({ component });
});
 
/** PUT /api/components/:id */
export const updateComponent = asyncHandler(async (req, res) => {
  const component = await prisma.componentTag.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json({ component });
});
 
/** DELETE /api/components/:id */
export const deleteComponent = asyncHandler(async (req, res) => {
  await prisma.componentTag.delete({ where: { id: req.params.id } });
  res.json({ message: 'Component tag deleted' });
});
