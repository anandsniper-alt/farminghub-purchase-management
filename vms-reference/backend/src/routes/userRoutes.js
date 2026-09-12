import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createUserSchema, updateUserSchema, userPermissionsSchema } from '../validators/index.js';
import {
  listUsers, listAssignableUsers, createUser, updateUser, deleteUser, getUserPermissions, setUserPermissions,
} from '../controllers/userController.js';
 
const router = Router();
router.use(authenticate);
 
// Minimal user list for assignment dropdowns — any authenticated user (no 'users' perm needed).
router.get('/assignable', listAssignableUsers);
 
router.get('/', requirePermission('users', 'view'), listUsers);
router.post('/', requirePermission('users', 'create'), validate(createUserSchema), createUser);
router.put('/:id', requirePermission('users', 'edit'), validate(updateUserSchema), updateUser);
router.delete('/:id', requirePermission('users', 'delete'), deleteUser);
 
router.get('/:id/permissions', requirePermission('users', 'view'), getUserPermissions);
router.put('/:id/permissions', requirePermission('users', 'edit'), validate(userPermissionsSchema), setUserPermissions);
 
export default router;
