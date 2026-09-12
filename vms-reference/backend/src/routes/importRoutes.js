import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { uploadSpreadsheet } from '../middleware/upload.js';
import { downloadTemplate, importVendors } from '../controllers/importController.js';
 
const router = Router();
 
router.get('/vendors/import/template', authenticate, requirePermission('vendors', 'view'), downloadTemplate);
 
router.post(
  '/vendors/import',
  authenticate,
  requirePermission('vendors', 'create'),
  uploadSpreadsheet.single('file'),
  importVendors
);
 
export default router;
