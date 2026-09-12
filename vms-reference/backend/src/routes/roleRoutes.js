import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { roleMatrixSchema, copyRoleSchema } from '../validators/index.js';
import {
  getRoleMatrix, updateRole, setAllForRole, copyRole,
} from '../controllers/roleController.js';
 
const router = Router();
router.use(authenticate);
 
router.get('/', requirePermission('users', 'view'), getRoleMatrix);
router.post('/copy', requirePermission('users', 'edit'), validate(copyRoleSchema), copyRole);
router.put('/:role', requirePermission('users', 'edit'), validate(roleMatrixSchema), updateRole);
router.post('/:role/set-all', requirePermission('users', 'edit'), setAllForRole);
 
export default router;
