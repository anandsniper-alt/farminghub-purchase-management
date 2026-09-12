import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { photoMetaSchema } from '../validators/index.js';
import { upload } from '../middleware/upload.js';
import { uploadVendorPhotos, deletePhoto } from '../controllers/photoController.js';
 
const router = Router();
 
// Photos are part of editing a vendor
router.post(
  '/vendors/:id/photos',
  authenticate,
  requirePermission('vendors', 'edit'),
  upload.array('photos', 10),
  validate(photoMetaSchema),
  uploadVendorPhotos
);
 
router.delete('/photos/:photoId', authenticate, requirePermission('vendors', 'edit'), deletePhoto);
 
export default router;
