import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { columnConfigSchema } from '../validators/index.js';
import {
  getColumnConfig, savePersonalColumnConfig, saveGlobalColumnConfig, resetPersonalColumnConfig,
} from '../controllers/columnController.js';
 
const router = Router();
router.use(authenticate);
 
router.get('/column-configs/:listKey', getColumnConfig);
router.put('/column-configs/:listKey', validate(columnConfigSchema), savePersonalColumnConfig);
router.delete('/column-configs/:listKey', resetPersonalColumnConfig);
// Global default is admin-only (settings edit).
router.put('/column-configs/:listKey/global', requirePermission('settings', 'edit'), validate(columnConfigSchema), saveGlobalColumnConfig);
 
export default router;
