import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createVendorSchema, updateVendorSchema, vendorQuerySchema } from '../validators/index.js';
import {
  listVendors, getVendor, createVendor, updateVendor, deleteVendor,
} from '../controllers/vendorController.js';
 
const router = Router();
 
router.use(authenticate);
 
router.get('/', requirePermission('vendors', 'view'), validate(vendorQuerySchema, 'query'), listVendors);
router.get('/:id', requirePermission('vendors', 'view'), getVendor);
router.post('/', requirePermission('vendors', 'create'), validate(createVendorSchema), createVendor);
router.put('/:id', requirePermission('vendors', 'edit'), validate(updateVendorSchema), updateVendor);
router.delete('/:id', requirePermission('vendors', 'delete'), deleteVendor);
 
export default router;
