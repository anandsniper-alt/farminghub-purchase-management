import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  categoryGroupSchema, vendorStageSchema, photoTypeSchema, currencyRatesUpdateSchema, productLineSchema,
} from '../validators/index.js';
import {
  listCategoryGroups, createCategoryGroup, updateCategoryGroup, deleteCategoryGroup,
  listStages, createStage, updateStage, deleteStage,
  listPhotoTypes, createPhotoType, updatePhotoType, deletePhotoType,
  listProductLines, createProductLine, updateProductLine, deleteProductLine,
  listCurrencyRates, updateCurrencyRates, deleteCurrencyRate, refreshCurrencyRatesHandler,
} from '../controllers/lookupController.js';
 
const router = Router();
router.use(authenticate);
 
// NOTE: GET (read) of reference lists stays open to any authenticated user —
// the vendor form / filters need them. Only writes are permission-gated.
 
// Category groups (part of Product Lines)
router.get('/category-groups', listCategoryGroups);
router.post('/category-groups', requirePermission('products', 'create'), validate(categoryGroupSchema), createCategoryGroup);
router.put('/category-groups/:id', requirePermission('products', 'edit'), validate(categoryGroupSchema.partial()), updateCategoryGroup);
router.delete('/category-groups/:id', requirePermission('products', 'delete'), deleteCategoryGroup);
 
// Vendor stages
router.get('/stages', listStages);
router.post('/stages', requirePermission('settings', 'create'), validate(vendorStageSchema), createStage);
router.put('/stages/:id', requirePermission('settings', 'edit'), validate(vendorStageSchema.partial()), updateStage);
router.delete('/stages/:id', requirePermission('settings', 'delete'), deleteStage);
 
// Photo types
router.get('/photo-types', listPhotoTypes);
router.post('/photo-types', requirePermission('settings', 'create'), validate(photoTypeSchema), createPhotoType);
router.put('/photo-types/:id', requirePermission('settings', 'edit'), validate(photoTypeSchema.partial()), updatePhotoType);
router.delete('/photo-types/:id', requirePermission('settings', 'delete'), deletePhotoType);
 
// Product lines (vendor classification)
router.get('/product-lines', listProductLines);
router.post('/product-lines', requirePermission('settings', 'create'), validate(productLineSchema), createProductLine);
router.put('/product-lines/:id', requirePermission('settings', 'edit'), validate(productLineSchema.partial()), updateProductLine);
router.delete('/product-lines/:id', requirePermission('settings', 'delete'), deleteProductLine);
 
// Currency rates
router.get('/currency-rates', listCurrencyRates);
router.post('/currency-rates/refresh', requirePermission('settings', 'edit'), refreshCurrencyRatesHandler);
router.put('/currency-rates', requirePermission('settings', 'edit'), validate(currencyRatesUpdateSchema), updateCurrencyRates);
router.delete('/currency-rates/:code', requirePermission('settings', 'delete'), deleteCurrencyRate);
 
export default router;
