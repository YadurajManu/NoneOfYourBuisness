import { memoryStorage, type Options } from 'multer';
import { extname } from 'path';

const DEFAULT_MAX_UPLOAD_MB = 20;

function parseMaxUploadBytes() {
  const raw = process.env.DOCUMENT_UPLOAD_MAX_MB;
  const parsed = Number(raw || DEFAULT_MAX_UPLOAD_MB);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_MAX_UPLOAD_MB * 1024 * 1024;
  }

  return Math.floor(parsed * 1024 * 1024);
}

export const DOCUMENT_UPLOAD_MAX_BYTES = parseMaxUploadBytes();

export const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'text/plain',
  'text/csv',
  'application/json',
  'application/xml',
  'text/xml',
  'text/markdown',
]);

export const ALLOWED_DOCUMENT_EXTENSIONS = new Set([
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.heic',
  '.heif',
  '.txt',
  '.csv',
  '.json',
  '.xml',
  '.md',
]);

export function isAllowedDocumentUpload(file: Express.Multer.File) {
  const mime = String(file.mimetype || '').toLowerCase();
  const extension = extname(String(file.originalname || '')).toLowerCase();

  if (mime && ALLOWED_DOCUMENT_MIME_TYPES.has(mime)) {
    return true;
  }

  if (extension && ALLOWED_DOCUMENT_EXTENSIONS.has(extension)) {
    return true;
  }

  return false;
}

export const DOCUMENT_UPLOAD_INTERCEPTOR_OPTIONS: Options = {
  storage: memoryStorage(),
  limits: {
    fileSize: DOCUMENT_UPLOAD_MAX_BYTES,
  },
  fileFilter: (_req, file, cb) => {
    if (isAllowedDocumentUpload(file)) {
      cb(null, true);
      return;
    }

    cb(null, false);
  },
};
