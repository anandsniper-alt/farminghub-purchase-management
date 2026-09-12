import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import { uploadRoot, attachmentKind } from '../middleware/upload.js';
 
const include = {
  attachments: { orderBy: { createdAt: 'asc' } },
  createdBy: { select: { id: true, name: true } },
};
 
/** GET /api/vendors/:id/interactions — timeline, newest first */
export const listInteractions = asyncHandler(async (req, res) => {
  const interactions = await prisma.interaction.findMany({
    where: { vendorId: req.params.id },
    include,
    orderBy: { occurredAt: 'desc' },
  });
  res.json({ interactions });
});
 
/**
 * POST /api/vendors/:id/interactions
 * multipart/form-data: type, title, notes, occurredAt, files[] (field "files")
 */
export const createInteraction = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const vendor = await prisma.vendor.findUnique({ where: { id }, select: { id: true } });
  if (!vendor) {
    (req.files || []).forEach((f) => fs.promises.unlink(f.path).catch(() => {}));
    throw ApiError.notFound('Vendor not found');
  }
 
  const { type, title, notes, occurredAt, nextFollowUpAt } = req.body;
  if (!notes && (!req.files || req.files.length === 0)) {
    throw ApiError.badRequest('Add notes or at least one attachment');
  }
  if (!nextFollowUpAt) {
    throw ApiError.badRequest('Next follow-up date is required');
  }
 
  const interaction = await prisma.interaction.create({
    data: {
      vendorId: id,
      type: type || 'NOTE',
      title: title || null,
      notes: notes || null,
      occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
      nextFollowUpAt: new Date(nextFollowUpAt),
      createdById: req.user?.id || null,
      attachments: {
        create: (req.files || []).map((f) => ({
          filename: f.filename,
          url: `${env.uploadUrlPath}/${f.filename}`,
          kind: attachmentKind(f.mimetype),
          mimeType: f.mimetype,
          sizeBytes: f.size,
        })),
      },
    },
    include,
  });
 
  res.status(201).json({ interaction });
});
 
/**
 * PATCH /api/interactions/:interactionId — update follow-up state.
 * Body: { nextFollowUpAt?, followUpCompleted? }  (reschedule / complete).
 */
export const updateInteraction = asyncHandler(async (req, res) => {
  const { interactionId } = req.params;
  const exists = await prisma.interaction.findUnique({ where: { id: interactionId }, select: { id: true } });
  if (!exists) throw ApiError.notFound('Interaction not found');
 
  const data = {};
  if (req.body.nextFollowUpAt !== undefined) data.nextFollowUpAt = new Date(req.body.nextFollowUpAt);
  if (req.body.followUpCompleted !== undefined) {
    data.followUpCompleted = req.body.followUpCompleted;
    data.followUpCompletedAt = req.body.followUpCompleted ? new Date() : null;
  }
 
  const interaction = await prisma.interaction.update({ where: { id: interactionId }, data, include });
  res.json({ interaction });
});
 
/** DELETE /api/interactions/:interactionId */
export const deleteInteraction = asyncHandler(async (req, res) => {
  const { interactionId } = req.params;
  const interaction = await prisma.interaction.findUnique({
    where: { id: interactionId },
    include: { attachments: true },
  });
  if (!interaction) throw ApiError.notFound('Interaction not found');
 
  await prisma.interaction.delete({ where: { id: interactionId } });
 
  // best-effort file cleanup
  for (const a of interaction.attachments) {
    fs.promises.unlink(path.join(uploadRoot, a.filename)).catch(() => {});
  }
  res.json({ message: 'Interaction deleted' });
});
