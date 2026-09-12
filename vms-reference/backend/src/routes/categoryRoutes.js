import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { categorySchema } from '../validators/index.js';
import {
  listCategories, createCategory, updateCategory, deleteCategory,
} from '../controllers/categoryController.js';
 
const router = Router();
router.use(authenticate);
 
router.get('/', requirePermission('products', 'view'), listCategories);
router.post('/', requirePermission('products', 'create'), validate(categorySchema), createCategory);
router.put('/:id', requirePermission('products', 'edit'), validate(categorySchema.partial()), updateCategory);
router.delete('/:id', requirePermission('products', 'delete'), deleteCategory);
 
export default router;
