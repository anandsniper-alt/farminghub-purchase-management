import { Prisma } from '@prisma/client';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
 
export function notFoundHandler(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}
 
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;
 
  // Prisma known errors -> friendly messages
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      statusCode = 409;
      const target = err.meta?.target;
      message = `A record with this ${Array.isArray(target) ? target.join(', ') : 'value'} already exists`;
    } else if (err.code === 'P2025') {
      statusCode = 404;
      message = 'Record not found';
    } else {
      statusCode = 400;
      message = 'Database request error';
    }
  }
 
  if (statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error('[error]', err);
  }
 
  const payload = { error: message };
  if (details) payload.details = details;
  if (!env.isProd && statusCode >= 500) payload.stack = err.stack;
 
  res.status(statusCode).json(payload);
}
