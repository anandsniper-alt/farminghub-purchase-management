import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { componentSchema } from '../validators/index.js';
import {
  listComponents, createComponent, updateComponent, deleteComponent,
} from '../controllers/componentController.js';
 
const router = Router();
router.use(authenticate);
 
router.get('/', requirePermission('components', 'view'), listComponents);
router.post('/', requirePermission('components', 'create'), validate(componentSchema), createComponent);
router.put('/:id', requirePermission('components', 'edit'), validate(componentSchema.partial()), updateComponent);
router.delete('/:id', requirePermission('components', 'delete'), deleteComponent);
 
export default router;
