import dotenv from 'dotenv';
 
dotenv.config();
 
function required(name, fallback) {
  const val = process.env[name] ?? fallback;
  if (val === undefined || val === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return val;
}
 
export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: (process.env.NODE_ENV || 'development') === 'production',
  port: parseInt(process.env.PORT || '8000', 10),
 
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
 
  databaseUrl: required('DATABASE_URL'),
 
  jwtSecret: required('JWT_SECRET', 'dev-insecure-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
 
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  uploadUrlPath: process.env.UPLOAD_URL_PATH || '/uploads',
  maxUploadMb: parseInt(process.env.MAX_UPLOAD_MB || '8', 10),
 
  seedAdmin: {
    name: process.env.SEED_ADMIN_NAME || 'Administrator',
    email: process.env.SEED_ADMIN_EMAIL || 'admin@farminghub.in',
    password: process.env.SEED_ADMIN_PASSWORD || 'REPLACE_BEFORE_USE',
  },
};
