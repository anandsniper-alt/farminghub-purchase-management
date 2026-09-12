import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { dashboard, concentration, analytics } from '../controllers/reportController.js';
 
const router = Router();
router.use(authenticate);
 
router.get('/dashboard', requirePermission('reports', 'view'), dashboard);
router.get('/concentration', requirePermission('reports', 'view'), concentration);
router.get('/analytics', requirePermission('reports', 'view'), analytics);
 
export default router;
