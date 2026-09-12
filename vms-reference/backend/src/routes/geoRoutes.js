import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { uploadSpreadsheet } from '../middleware/upload.js';
import { countrySchema, stateSchema, districtSchema } from '../validators/index.js';
import {
  listCountries, createCountry, updateCountry, deleteCountry,
  listStates, createState, updateState, deleteState,
  listDistricts, createDistrict, updateDistrict, deleteDistrict,
  geoTree, geoImport, geoImportTemplate,
} from '../controllers/geoController.js';
 
const router = Router();
router.use(authenticate);
 
// Reads open to any authenticated user (the vendor form + filters need them);
// writes gated by settings permissions, matching the other lookup masters.
 
// Countries
router.get('/countries', listCountries);
router.post('/countries', requirePermission('settings', 'create'), validate(countrySchema), createCountry);
router.put('/countries/:id', requirePermission('settings', 'edit'), validate(countrySchema.partial()), updateCountry);
router.delete('/countries/:id', requirePermission('settings', 'delete'), deleteCountry);
 
// States
router.get('/states', listStates);
router.post('/states', requirePermission('settings', 'create'), validate(stateSchema), createState);
router.put('/states/:id', requirePermission('settings', 'edit'), validate(stateSchema.partial()), updateState);
router.delete('/states/:id', requirePermission('settings', 'delete'), deleteState);
 
// Districts
router.get('/districts', listDistricts);
router.post('/districts', requirePermission('settings', 'create'), validate(districtSchema), createDistrict);
router.put('/districts/:id', requirePermission('settings', 'edit'), validate(districtSchema.partial()), updateDistrict);
router.delete('/districts/:id', requirePermission('settings', 'delete'), deleteDistrict);
 
// Master mapping tree + bulk upload
router.get('/geo/tree', geoTree);
router.get('/geo/import/template', geoImportTemplate);
router.post('/geo/import', requirePermission('settings', 'create'), uploadSpreadsheet.single('file'), geoImport);
 
export default router;
