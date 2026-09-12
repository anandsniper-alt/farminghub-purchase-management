import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import {
  MODULES, ACTIONS, ROLES, sanitizePermissions,
} from '../config/permissions.js';
import { getRolePermissions, refreshPermissionCache } from '../services/permissionService.js';
 
/** GET /api/roles — modules/actions meta + each role's matrix */
export const getRoleMatrix = asyncHandler(async (_req, res) => {
  const matrix = {};
  for (const role of ROLES) matrix[role] = await getRolePermissions(role);
  res.json({ modules: MODULES, actions: ACTIONS, roles: ROLES, matrix });
});
 
async function saveRole(role, permissions) {
  const clean = sanitizePermissions(permissions);
  await prisma.rolePermission.upsert({
    where: { role },
    update: { permissions: clean },
    create: { role, permissions: clean },
  });
  await refreshPermissionCache();
  return clean;
}
 
/** PUT /api/roles/:role — replace a role's matrix */
export const updateRole = asyncHandler(async (req, res) => {
  const role = req.params.role.toUpperCase();
  if (!ROLES.includes(role)) throw ApiError.badRequest('Unknown role');
  if (role === 'ADMIN') throw ApiError.badRequest('ADMIN always has full access and cannot be limited');
  const clean = await saveRole(role, req.body.permissions);
  res.json({ role, permissions: clean });
});
 
/** POST /api/roles/:role/set-all — set every module/action to a value */
export const setAllForRole = asyncHandler(async (req, res) => {
  const role = req.params.role.toUpperCase();
  if (!ROLES.includes(role)) throw ApiError.badRequest('Unknown role');
  if (role === 'ADMIN') throw ApiError.badRequest('ADMIN always has full access');
  const value = !!req.body.value;
  const perms = {};
  for (const m of MODULES) {
    perms[m.key] = {};
    for (const a of ACTIONS) perms[m.key][a] = value;
  }
  const clean = await saveRole(role, perms);
  res.json({ role, permissions: clean });
});
 
/** POST /api/roles/copy — copy one role's matrix onto another */
export const copyRole = asyncHandler(async (req, res) => {
  const { from, to } = req.body;
  if (to === 'ADMIN') throw ApiError.badRequest('ADMIN cannot be overwritten');
  if (from === to) throw ApiError.badRequest('Pick two different roles');
  const source = await getRolePermissions(from);
  const clean = await saveRole(to, source);
  res.json({ role: to, permissions: clean });
});
