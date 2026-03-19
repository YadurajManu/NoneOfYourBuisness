import { memoryStorage, type Options } from 'multer';
import { extname } from 'path';

const DEFAULT_MAX_AVATAR_MB = 5;

function parseAvatarMaxBytes() {
  const raw = process.env.USER_AVATAR_MAX_MB;
  const parsed = Number(raw || DEFAULT_MAX_AVATAR_MB);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_MAX_AVATAR_MB * 1024 * 1024;
  }

  return Math.floor(parsed * 1024 * 1024);
}

export const USER_AVATAR_MAX_BYTES = parseAvatarMaxBytes();

const ALLOWED_AVATAR_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const ALLOWED_AVATAR_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.heic',
  '.heif',
]);

export function isAllowedAvatar(file: Express.Multer.File) {
  const mime = String(file.mimetype || '').toLowerCase();
  const extension = extname(String(file.originalname || '')).toLowerCase();

  if (mime && ALLOWED_AVATAR_MIME_TYPES.has(mime)) {
    return true;
  }

  if (extension && ALLOWED_AVATAR_EXTENSIONS.has(extension)) {
    return true;
  }

  return false;
}

export const USER_AVATAR_UPLOAD_INTERCEPTOR_OPTIONS: Options = {
  storage: memoryStorage(),
  limits: { fileSize: USER_AVATAR_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (isAllowedAvatar(file)) {
      cb(null, true);
      return;
    }
    cb(null, false);
  },
};
