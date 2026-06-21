/**
 * Entitlements controller — HTTP handlers cho e-book list, download link, và stream file.
 */

import fs from 'fs';
import { Request, Response } from 'express';
import { ok } from '../../shared/http/response';
import { listEbooks, issueDownloadLink, resolveDownloadFile } from './entitlements.service';

// ── GET /me/ebooks ────────────────────────────────────────────────────────────

export async function getMyEbooks(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, parseInt((req.query.page as string) ?? '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) ?? '10', 10) || 10));
  const q = (req.query.q as string | undefined)?.trim() || undefined;

  const result = await listEbooks(req.user!.id, { q, page, limit });
  ok(res, result.data, result.meta);
}

// ── POST /me/ebooks/:bookId/download ─────────────────────────────────────────

export async function requestDownload(req: Request, res: Response): Promise<void> {
  const bookId = parseInt(req.params.bookId, 10);
  const ip = req.ip;
  const dto = await issueDownloadLink(req.user!.id, bookId, ip);
  ok(res, dto);
}

// ── GET /download?token=... ───────────────────────────────────────────────────

export async function serveFile(req: Request, res: Response): Promise<void> {
  const token = req.query.token as string | undefined;
  if (!token) {
    // Không có token → trả lỗi thủ công (route này không qua auth middleware)
    res.status(401).json({
      success: false,
      error: { code: 'DOWNLOAD_TOKEN_INVALID', message: 'Token không được cung cấp' },
    });
    return;
  }

  const { filePath, filename } = await resolveDownloadFile(token);

  // Stream file về client — KHÔNG trả storageKey
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/octet-stream');
  fs.createReadStream(filePath).pipe(res);
}
