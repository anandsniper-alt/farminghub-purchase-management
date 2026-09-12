import { ApiError } from '../utils/ApiError.js';
import { verifyToken } from '../utils/token.js';
import { prisma } from '../lib/prisma.js';
import { userCan } from '../services/permissionService.js';
 
/** Require a valid JWT. Attaches req.user (incl. permission overrides). */
export async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw ApiError.unauthorized('Authentication token missing');
 
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      throw ApiError.unauthorized('Invalid or expired token');
    }
 
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { id: true, name: true, email: true, role: true, isActive: true, permissions: true },
    });
    if (!user || !user.isActive) throw ApiError.unauthorized('User no longer active');
 
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
 
/** Restrict a route to specific roles. Use after authenticate. */
export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (req.user.role === 'ADMIN') return next();
    if (roles.length && !roles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission for this action'));
    }
    next();
  };
}
 
/** Require a module/action permission (role default + per-user override). */
export function requirePermission(moduleKey, action) {
  return async (req, _res, next) => {
    try {
      if (!req.user) return next(ApiError.unauthorized());
      const ok = await userCan(req.user, moduleKey, action);
      if (!ok) return next(ApiError.forbidden(`You cannot ${action} ${moduleKey}`));
      next();
    } catch (err) {
      next(err);
    }
  };
}
