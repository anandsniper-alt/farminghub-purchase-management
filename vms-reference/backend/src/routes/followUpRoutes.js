import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { listFollowUps, followUpSummary } from '../controllers/followUpController.js';
 
const router = Router();
router.use(authenticate);
 
router.get('/follow-ups', requirePermission('interactions', 'view'), listFollowUps);
router.get('/follow-ups/summary', requirePermission('interactions', 'view'), followUpSummary);
 
export default router;
