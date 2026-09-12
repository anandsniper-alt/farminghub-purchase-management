import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
 
import { env } from './config/env.js';
import routes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { uploadRoot } from './middleware/upload.js';
 
const app = express();
 
app.set('trust proxy', 1);
 
// Security headers (allow cross-origin loading of uploaded images)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
 
// CORS
app.use(
  cors({
    origin(origin, cb) {
      // allow same-origin / server-to-server (no origin) and whitelisted origins
      if (!origin || env.corsOrigins.includes(origin) || env.corsOrigins.includes('*')) {
        return cb(null, true);
      }
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);
 
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
 
if (!env.isProd) app.use(morgan('dev'));
 
// Rate limit the API (generous — internal tool)
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
  })
);
 
// Serve uploaded photos statically
app.use(env.uploadUrlPath, express.static(uploadRoot, { maxAge: '7d' }));
 
// API
app.use('/api', routes);
 
// Root
app.get('/', (_req, res) =>
  res.json({ name: 'FH Vendor Management API', version: '1.0.0', docs: '/api/health' })
);
 
app.use(notFoundHandler);
app.use(errorHandler);
 
export default app;
