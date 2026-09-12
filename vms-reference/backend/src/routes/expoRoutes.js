import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { expoSchema } from '../validators/index.js';
import {
  listExpos, getExpo, createExpo, updateExpo, deleteExpo,
} from '../controllers/expoController.js';
 
const router = Router();
router.use(authenticate);
 
router.get('/', requirePermission('expos', 'view'), listExpos);
router.get('/:id', requirePermission('expos', 'view'), getExpo);
router.post('/', requirePermission('expos', 'create'), validate(expoSchema), createExpo);
router.put('/:id', requirePermission('expos', 'edit'), validate(expoSchema.partial()), updateExpo);
router.delete('/:id', requirePermission('expos', 'delete'), deleteExpo);
 
export default router;
