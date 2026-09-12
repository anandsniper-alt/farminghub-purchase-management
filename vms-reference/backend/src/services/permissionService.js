import { prisma } from '../lib/prisma.js';
import {
  ROLES, DEFAULT_ROLE_PERMISSIONS, LEGACY_ROLE_FALLBACK, FULL_PERMISSIONS,
  mergePermissions, sanitizePermissions,
} from '../config/permissions.js';
 
// In-memory cache of role -> permissions (role matrix changes rarely)
let cache = null;
 
async function loadCache() {
  const rows = await prisma.rolePermission.findMany();
  const map = {};
  for (const r of rows) map[r.role] = r.permissions;
  cache = map;
  return map;
}
 
export async function refreshPermissionCache() {
  return loadCache();
}
 
/** Create RolePermission rows for the three roles from defaults if missing. */
export async function ensureRolePermissionsSeeded() {
  for (const role of ROLES) {
    await prisma.rolePermission.upsert({
      where: { role },
      update: {},
      create: { role, permissions: DEFAULT_ROLE_PERMISSIONS[role] },
    });
  }
  await loadCache();
}
 
/** Resolve a role's permission matrix (DB override, else code default, incl. legacy roles). */
export async function getRolePermissions(role) {
  if (!cache) await loadCache();
  const effRole = ROLES.includes(role) ? role : (LEGACY_ROLE_FALLBACK[role] || 'EMPLOYEE');
  return cache[effRole] || DEFAULT_ROLE_PERMISSIONS[effRole] || DEFAULT_ROLE_PERMISSIONS.EMPLOYEE;
}
 
/** Effective permissions for a user = role defaults merged with per-user overrides. */
export async function getEffectivePermissions(user) {
  if (!user) return null;
  if (user.role === 'ADMIN') return FULL_PERMISSIONS;
  const base = await getRolePermissions(user.role);
  return mergePermissions(base, user.permissions || null);
}
 
/** Boolean check used by middleware. */
export async function userCan(user, moduleKey, action) {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  const eff = await getEffectivePermissions(user);
  return !!eff?.[moduleKey]?.[action];
}
 
export { sanitizePermissions };
