import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { interactionSchema, interactionUpdateSchema } from '../validators/index.js';
import { uploadAttachment } from '../middleware/upload.js';
import {
  listInteractions, createInteraction, updateInteraction, deleteInteraction,
} from '../controllers/interactionController.js';
 
const router = Router();
 
router.get('/vendors/:id/interactions', authenticate, requirePermission('interactions', 'view'), listInteractions);
 
router.post(
  '/vendors/:id/interactions',
  authenticate,
  requirePermission('interactions', 'create'),
  uploadAttachment.array('files', 10),
  validate(interactionSchema),
  createInteraction
);
 
router.patch(
  '/interactions/:interactionId',
  authenticate,
  requirePermission('interactions', 'edit'),
  validate(interactionUpdateSchema),
  updateInteraction
);
 
router.delete('/interactions/:interactionId', authenticate, requirePermission('interactions', 'delete'), deleteInteraction);
 
export default router;
