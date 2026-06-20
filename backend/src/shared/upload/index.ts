import path from 'path';
import fs from 'fs';
import multer, { FileFilterCallback } from 'multer';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { env } from '../../config/env';
import { AppError } from '../errors/AppError';

// ── Ensure directories exist ─────────────────────────────────────────────────
function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ── Storage engines ──────────────────────────────────────────────────────────
function makeStorage(subdir: string) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dest = path.resolve(env.UPLOAD_DIR, subdir);
      ensureDir(dest);
      cb(null, dest);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      const base = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
      cb(null, base);
    },
  });
}

// ── MIME validators ──────────────────────────────────────────────────────────
const COVER_MIMES = ['image/png', 'image/jpeg'];
const EBOOK_MIMES = ['application/pdf', 'application/epub+zip'];

const COVER_SIZE_LIMIT = 5 * 1024 * 1024;   // 5MB
const EBOOK_SIZE_LIMIT = 100 * 1024 * 1024; // 100MB

function coverFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback) {
  if (COVER_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('FILE_TYPE_INVALID', 400, 'Ảnh bìa phải là PNG hoặc JPEG'));
  }
}

function ebookFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback) {
  if (EBOOK_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('FILE_TYPE_INVALID', 400, 'File E-book phải là PDF hoặc EPUB'));
  }
}

// ── Combined upload instance (covers + ebookFile) ────────────────────────────
// We use a single multer instance that handles both fields.
// We set the larger limit globally and validate individual limits in fileFilter.
const upload = multer({
  limits: { fileSize: EBOOK_SIZE_LIMIT },
  fileFilter(_req, file, cb) {
    if (file.fieldname === 'covers') {
      return coverFilter(_req, file, cb);
    }
    if (file.fieldname === 'ebookFile') {
      return ebookFilter(_req, file, cb);
    }
    cb(null, false); // ignore unknown fields
  },
  storage: multer.diskStorage({
    destination: (_req, file, cb) => {
      const subdir = file.fieldname === 'ebookFile' ? 'private' : 'covers';
      const dest = path.resolve(env.UPLOAD_DIR, subdir);
      ensureDir(dest);
      cb(null, dest);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      const base = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
      cb(null, base);
    },
  }),
});

// ── Book upload middleware: fields covers(≤5) + ebookFile(1) ─────────────────
const rawUpload = upload.fields([
  { name: 'covers', maxCount: 5 },
  { name: 'ebookFile', maxCount: 1 },
]);

// Wrap to catch multer errors and convert to AppError
export const bookUpload: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  rawUpload(req, res, (err) => {
    if (!err) return next();

    // Multer limit error
    if ((err as any).code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('FILE_TOO_LARGE', 400, 'File vượt quá kích thước cho phép'));
    }
    // AppError thrown inside fileFilter (FILE_TYPE_INVALID)
    if (err instanceof AppError) return next(err);
    // Unknown multer / express errors
    return next(err);
  });
};

// ── Cover size guard (applied after multer, checks per-file limit of 5MB) ────
// multer's global limit is 100MB; we need to enforce 5MB for covers separately.
export const enforceCoverSize: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
  const files = (req.files as Record<string, Express.Multer.File[]> | undefined) ?? {};
  const covers = files['covers'] ?? [];
  for (const f of covers) {
    if (f.size > COVER_SIZE_LIMIT) {
      // Remove already-saved files
      for (const c of covers) {
        try { fs.unlinkSync(c.path); } catch { /* ignore */ }
      }
      const ebookFiles = files['ebookFile'] ?? [];
      for (const e of ebookFiles) {
        try { fs.unlinkSync(e.path); } catch { /* ignore */ }
      }
      return next(new AppError('FILE_TOO_LARGE', 400, 'Ảnh bìa không được vượt quá 5MB'));
    }
  }
  next();
};

// ── MIME → format helper ─────────────────────────────────────────────────────
export function mimeToFormat(mime: string): string {
  if (mime === 'application/pdf') return 'PDF';
  if (mime === 'application/epub+zip') return 'EPUB';
  return mime.split('/').pop()?.toUpperCase() ?? 'UNKNOWN';
}
