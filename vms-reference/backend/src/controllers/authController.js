import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { signToken } from '../utils/token.js';
import { getEffectivePermissions } from '../services/permissionService.js';
 
const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  isActive: u.isActive,
});
 
/** POST /api/auth/login */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) throw ApiError.unauthorized('Invalid credentials or inactive account');
 
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw ApiError.unauthorized('Invalid credentials');
 
  const token = signToken({ sub: user.id, role: user.role });
  const permissions = await getEffectivePermissions(user);
  res.json({ token, user: publicUser(user), permissions });
});
 
/** GET /api/auth/me */
export const me = asyncHandler(async (req, res) => {
  const permissions = await getEffectivePermissions(req.user);
  res.json({ user: publicUser(req.user), permissions });
});
 
/** POST /api/auth/change-password */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) throw ApiError.badRequest('Current password is incorrect');
 
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  res.json({ message: 'Password updated' });
});
 
/* ------------------- Password reset (admin approval) ------------------- */
 
/** POST /api/auth/password-reset/request  (public) */
export const requestPasswordReset = asyncHandler(async (req, res) => {
  const { email, newPassword, note } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  // Always respond the same way (don't reveal whether the email exists)
  if (user) {
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    // Replace any existing pending request for this user
    await prisma.passwordResetRequest.deleteMany({ where: { userId: user.id, status: 'PENDING' } });
    await prisma.passwordResetRequest.create({
      data: { userId: user.id, newPasswordHash, note: note || null },
    });
  }
  res.json({ message: 'Your reset request has been submitted for admin approval.' });
});
 
/** GET /api/auth/password-reset/requests  (admin) */
export const listResetRequests = asyncHandler(async (req, res) => {
  const status = (req.query.status || 'PENDING').toUpperCase();
  const requests = await prisma.passwordResetRequest.findMany({
    where: status === 'ALL' ? {} : { status },
    orderBy: { requestedAt: 'desc' },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      resolvedBy: { select: { id: true, name: true } },
    },
  });
  res.json({ requests });
});
 
/** POST /api/auth/password-reset/:id/approve */
export const approveReset = asyncHandler(async (req, res) => {
  const reqId = req.params.id;
  const request = await prisma.passwordResetRequest.findUnique({ where: { id: reqId } });
  if (!request) throw ApiError.notFound('Request not found');
  if (request.status !== 'PENDING') throw ApiError.badRequest('Request already resolved');
 
  await prisma.$transaction([
    prisma.user.update({ where: { id: request.userId }, data: { passwordHash: request.newPasswordHash } }),
    prisma.passwordResetRequest.update({
      where: { id: reqId },
      data: { status: 'APPROVED', resolvedAt: new Date(), resolvedById: req.user.id },
    }),
  ]);
  res.json({ message: 'Password reset approved and applied' });
});
 
/** POST /api/auth/password-reset/:id/reject */
export const rejectReset = asyncHandler(async (req, res) => {
  const reqId = req.params.id;
  const request = await prisma.passwordResetRequest.findUnique({ where: { id: reqId } });
  if (!request) throw ApiError.notFound('Request not found');
  if (request.status !== 'PENDING') throw ApiError.badRequest('Request already resolved');
  await prisma.passwordResetRequest.update({
    where: { id: reqId },
    data: { status: 'REJECTED', resolvedAt: new Date(), resolvedById: req.user.id },
  });
  res.json({ message: 'Request rejected' });
});
