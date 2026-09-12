import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { sanitizePermissions } from '../config/permissions.js';
import { getEffectivePermissions } from '../services/permissionService.js';
 
const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  isActive: u.isActive,
  permissions: u.permissions || null,
  createdAt: u.createdAt,
});
 
async function activeAdminCount(excludeId) {
  return prisma.user.count({
    where: { role: 'ADMIN', isActive: true, ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
}
 
/** GET /api/users */
export const listUsers = asyncHandler(async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, email: true, role: true, isActive: true, permissions: true, createdAt: true },
  });
  res.json({ users: users.map(publicUser) });
});
 
/** GET /api/users/assignable — minimal active-user list for assignment dropdowns (any authed user). */
export const listAssignableUsers = asyncHandler(async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, role: true },
  });
  res.json({ users });
});
 
/** POST /api/users */
export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw ApiError.conflict('Email already registered');
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { name, email, passwordHash, role } });
  res.status(201).json({ user: publicUser(user) });
});
 
/** PUT /api/users/:id */
export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw ApiError.notFound('User not found');
 
  const { name, email, role, isActive, password } = req.body;
 
  // Guard: never leave the system without an active admin
  const losingAdmin =
    target.role === 'ADMIN' &&
    ((role && role !== 'ADMIN') || isActive === false);
  if (losingAdmin && (await activeAdminCount(id)) === 0) {
    throw ApiError.badRequest('At least one active admin must remain');
  }
  // Guard: don't let a user disable themselves
  if (req.user.id === id && isActive === false) {
    throw ApiError.badRequest('You cannot disable your own account');
  }
 
  const data = {};
  if (name !== undefined) data.name = name;
  if (email !== undefined) data.email = email;
  if (role !== undefined) data.role = role;
  if (isActive !== undefined) data.isActive = isActive;
  if (password) data.passwordHash = await bcrypt.hash(password, 10);
 
  try {
    const user = await prisma.user.update({ where: { id }, data });
    res.json({ user: publicUser(user) });
  } catch (e) {
    if (e.code === 'P2002') throw ApiError.conflict('Email already in use');
    throw e;
  }
});
 
/** DELETE /api/users/:id */
export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (req.user.id === id) throw ApiError.badRequest('You cannot delete your own account');
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw ApiError.notFound('User not found');
  if (target.role === 'ADMIN' && (await activeAdminCount(id)) === 0) {
    throw ApiError.badRequest('At least one active admin must remain');
  }
  await prisma.user.delete({ where: { id } });
  res.json({ message: 'User deleted' });
});
 
/** GET /api/users/:id/permissions — role defaults + overrides + effective */
export const getUserPermissions = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { id: true, name: true, role: true, permissions: true, isActive: true, email: true },
  });
  if (!user) throw ApiError.notFound('User not found');
  const effective = await getEffectivePermissions(user);
  res.json({ user: publicUser(user), overrides: user.permissions || null, effective });
});
 
/** PUT /api/users/:id/permissions — set/clear per-user override */
export const setUserPermissions = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { permissions } = req.body;
  const clean = permissions ? sanitizePermissions(permissions) : null;
  const user = await prisma.user.update({ where: { id }, data: { permissions: clean } });
  const effective = await getEffectivePermissions(user);
  res.json({ user: publicUser(user), overrides: clean, effective });
});
