import { Router } from 'express';
import authRoutes from './authRoutes.js';
import vendorRoutes from './vendorRoutes.js';
import expoRoutes from './expoRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import componentRoutes from './componentRoutes.js';
import photoRoutes from './photoRoutes.js';
import reportRoutes from './reportRoutes.js';
import lookupRoutes from './lookupRoutes.js';
import geoRoutes from './geoRoutes.js';
import interactionRoutes from './interactionRoutes.js';
import followUpRoutes from './followUpRoutes.js';
import columnRoutes from './columnRoutes.js';
import importRoutes from './importRoutes.js';
import userRoutes from './userRoutes.js';
import roleRoutes from './roleRoutes.js';
 
const router = Router();
 
router.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
 
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/', importRoutes); // /vendors/import + /vendors/import/template (before /vendors)
router.use('/vendors', vendorRoutes);
router.use('/expos', expoRoutes);
router.use('/categories', categoryRoutes);
router.use('/components', componentRoutes);
router.use('/reports', reportRoutes);
router.use('/', lookupRoutes); // /category-groups, /stages, /photo-types, /product-lines, /currency-rates
router.use('/', geoRoutes); // /countries, /states, /districts, /geo/tree, /geo/import
router.use('/', followUpRoutes); // /follow-ups, /follow-ups/summary
router.use('/', columnRoutes); // /column-configs/:listKey
router.use('/', photoRoutes); // /vendors/:id/photos and /photos/:photoId
router.use('/', interactionRoutes); // /vendors/:id/interactions and /interactions/:id
 
export default router;
