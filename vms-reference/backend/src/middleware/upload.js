import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
 
const uploadRoot = path.resolve(process.cwd(), env.uploadDir);
 
// Ensure the upload directory exists
fs.mkdirSync(uploadRoot, { recursive: true });
 
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = crypto.randomBytes(8).toString('hex');
    cb(null, `vendor-${Date.now()}-${unique}${ext}`);
  },
});
 
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif'];
 
function fileFilter(_req, file, cb) {
  if (ALLOWED.includes(file.mimetype)) return cb(null, true);
  cb(ApiError.badRequest(`Unsupported file type: ${file.mimetype}`));
}
 
export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.maxUploadMb * 1024 * 1024 },
});
 
// Interaction attachments: images, audio (voice notes) and documents.
const AUDIO = ['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a', 'audio/aac'];
const DOCS = [
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv',
];
const ATTACH_ALLOWED = [...ALLOWED, ...AUDIO, ...DOCS];
 
/** Map a mimetype to our AttachmentKind enum. */
export function attachmentKind(mime = '') {
  if (ALLOWED.includes(mime)) return 'IMAGE';
  if (AUDIO.includes(mime)) return 'AUDIO';
  if (DOCS.includes(mime)) return 'DOCUMENT';
  return 'OTHER';
}
 
export const uploadAttachment = multer({
  storage,
  fileFilter: (_req, file, cb) =>
    ATTACH_ALLOWED.includes(file.mimetype)
      ? cb(null, true)
      : cb(ApiError.badRequest(`Unsupported file type: ${file.mimetype}`)),
  limits: { fileSize: Math.max(env.maxUploadMb, 25) * 1024 * 1024 }, // allow larger docs/audio
});
 
// Spreadsheet import — parsed in memory, never written to disk.
const SPREADSHEET = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/csv',
  'application/octet-stream', // some browsers send this for .xlsx
];
export const uploadSpreadsheet = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const ok = SPREADSHEET.includes(file.mimetype) || /\.(xlsx|xls|csv)$/i.test(file.originalname);
    return ok ? cb(null, true) : cb(ApiError.badRequest('Please upload an .xlsx, .xls or .csv file'));
  },
  limits: { fileSize: 15 * 1024 * 1024 },
});
 
export { uploadRoot };
