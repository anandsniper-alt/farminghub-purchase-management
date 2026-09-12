import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, changePasswordSchema, passwordResetRequestSchema } from '../validators/index.js';
import {
  login, me, changePassword,
  requestPasswordReset, listResetRequests, approveReset, rejectReset,
} from '../controllers/authController.js';
 
const router = Router();
 
// Public
router.post('/login', validate(loginSchema), login);
router.post('/password-reset/request', validate(passwordResetRequestSchema), requestPasswordReset);
 
// Authenticated
router.get('/me', authenticate, me);
router.post('/change-password', authenticate, validate(changePasswordSchema), changePassword);
 
// Admin — password reset approvals (Users module)
router.get('/password-reset/requests', authenticate, requirePermission('users', 'view'), listResetRequests);
router.post('/password-reset/:id/approve', authenticate, requirePermission('users', 'edit'), approveReset);
router.post('/password-reset/:id/reject', authenticate, requirePermission('users', 'edit'), rejectReset);
 
export default router;
