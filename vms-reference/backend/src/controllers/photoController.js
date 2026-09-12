import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import { uploadRoot } from '../middleware/upload.js';
 
/** POST /api/vendors/:id/photos  (multipart: files[], caption, type) */
export const uploadVendorPhotos = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const vendor = await prisma.vendor.findUnique({ where: { id }, select: { id: true } });
  if (!vendor) {
    // remove any uploaded files if vendor missing
    (req.files || []).forEach((f) => fs.promises.unlink(f.path).catch(() => {}));
    throw ApiError.notFound('Vendor not found');
  }
  if (!req.files || req.files.length === 0) throw ApiError.badRequest('No files uploaded');
 
  const { caption, typeId } = req.body;
  let { typeLabel } = req.body;
 
  // Resolve label from the selected type if not supplied
  if (typeId && !typeLabel) {
    const pt = await prisma.photoType.findUnique({ where: { id: typeId }, select: { name: true } });
    typeLabel = pt?.name;
  }
 
  const created = await prisma.$transaction(
    req.files.map((f) =>
      prisma.photo.create({
        data: {
          vendorId: id,
          filename: f.filename,
          url: `${env.uploadUrlPath}/${f.filename}`,
          caption: caption || null,
          typeId: typeId || null,
          typeLabel: typeLabel || 'Product',
          sizeBytes: f.size,
          mimeType: f.mimetype,
        },
      })
    )
  );
 
  res.status(201).json({ photos: created });
});
 
/** DELETE /api/photos/:photoId */
export const deletePhoto = asyncHandler(async (req, res) => {
  const { photoId } = req.params;
  const photo = await prisma.photo.findUnique({ where: { id: photoId } });
  if (!photo) throw ApiError.notFound('Photo not found');
 
  await prisma.photo.delete({ where: { id: photoId } });
 
  // Best-effort file removal
  const filePath = path.join(uploadRoot, photo.filename);
  fs.promises.unlink(filePath).catch(() => {});
 
  res.json({ message: 'Photo deleted' });
});
