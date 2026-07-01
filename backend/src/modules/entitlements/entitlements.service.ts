/**
 * Entitlements service — danh sách e-book sở hữu + cấp URL tải xuống.
 */

import path from 'path';
import fs from 'fs';
import { Op } from 'sequelize';
import {
  Entitlement, Book, BookFile, Order, DownloadLog, Author,
} from '../../db/models';
import { AppError } from '../../shared/errors/AppError';
import { signDownloadToken, verifyDownloadToken } from '../../shared/download-url';
import { env } from '../../config/env';
import { logger } from '../../shared/logger';

// ── DTO Types ─────────────────────────────────────────────────────────────────

export interface EbookDTO {
  bookId: number;
  slug: string | null;
  title: string;
  author: string | null; // tên tác giả từ JOIN Author
  coverImageUrl: string | null;
  fileFormat: string | null;
  fileSizeBytes: number | null;
  grantedAt: Date;
  orderCode: string | null;
}

export interface EbookListResult {
  data: EbookDTO[];
  meta: {
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface DownloadLinkDTO {
  url: string;
  expiresAt: Date;
  fileFormat: string | null;
  fileSizeBytes: number | null;
}

// ── listEbooks ────────────────────────────────────────────────────────────────

/**
 * Trả danh sách e-book mà userId đã sở hữu.
 * Hỗ trợ filter q (tìm theo title) và pagination.
 */
export async function listEbooks(
  userId: number,
  opts: { q?: string; page: number; limit: number },
): Promise<EbookListResult> {
  const { q, page, limit } = opts;

  // Build điều kiện tìm kiếm theo title nếu có q
  const bookWhere: Record<string, unknown> = {};
  if (q) {
    bookWhere.title = { [Op.like]: `%${q}%` };
  }

  const { rows, count } = await Entitlement.findAndCountAll({
    where: { userId },
    include: [
      {
        model: Book,
        as: 'book',
        attributes: ['id', 'slug', 'title', 'coverImageUrl'],
        where: Object.keys(bookWhere).length ? bookWhere : undefined,
        include: [
          {
            model: BookFile,
            as: 'file',
            attributes: ['fileFormat', 'fileSizeBytes'],
            required: false,
          },
          {
            model: Author,
            as: 'author',
            attributes: ['name'],
            required: false,
          },
        ],
      },
      {
        model: Order,
        as: 'order',
        attributes: ['code'],
      },
    ],
    order: [['granted_at', 'DESC']],
    limit,
    offset: (page - 1) * limit,
    distinct: true,
  });

  const data: EbookDTO[] = rows.map((e) => {
    const book = (e as any).book as Book | null;
    const bookFile = book ? ((book as any).file as BookFile | null) : null;
    const bookAuthor = book ? ((book as any).author as Author | null) : null;
    const order = (e as any).order as Order | null;

    return {
      bookId: Number(e.bookId),
      slug: book?.slug ?? null,
      title: book?.title ?? '',
      author: bookAuthor?.name ?? null,
      coverImageUrl: book?.coverImageUrl ?? null,
      fileFormat: bookFile?.fileFormat ?? null,
      fileSizeBytes: bookFile?.fileSizeBytes != null ? Number(bookFile.fileSizeBytes) : null,
      grantedAt: e.grantedAt,
      orderCode: order?.code ?? null,
    };
  });

  return {
    data,
    meta: {
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    },
  };
}

// ── listEbookIds ──────────────────────────────────────────────────────────────

/**
 * Trả về mảng bookId mà userId đã sở hữu (dùng cho FE đánh dấu "đã mua").
 * Nhẹ — chỉ query cột bookId, không join Book.
 */
export async function listEbookIds(userId: number): Promise<number[]> {
  const rows = await Entitlement.findAll({
    where: { userId },
    attributes: ['bookId'],
  });
  return rows.map((e) => Number(e.bookId));
}

// ── issueDownloadLink ─────────────────────────────────────────────────────────

/**
 * Kiểm tra quyền sở hữu, ghi log, và trả signed URL tải xuống.
 */
export async function issueDownloadLink(
  userId: number,
  bookId: number,
  ip: string | undefined,
): Promise<DownloadLinkDTO> {
  // 1. Kiểm entitlement
  const entitlement = await Entitlement.findOne({ where: { userId, bookId } });
  if (!entitlement) {
    throw AppError.from('ENTITLEMENT_MISSING', 'Bạn chưa sở hữu sách này');
  }

  // 2. Load BookFile để lấy metadata
  const bookFile = await BookFile.findOne({ where: { bookId } });

  // 3. Ký download token
  const token = signDownloadToken({ userId, bookId });

  // 4. Ghi download log (best-effort — không block nếu lỗi)
  try {
    await DownloadLog.create({
      userId,
      bookId,
      entitlementId: Number(entitlement.id),
      ip: ip ?? null,
      issuedAt: new Date(),
    });
  } catch (err) {
    logger.warn({ err }, 'Ghi download_logs thất bại (best-effort)');
  }

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 phút

  return {
    url: `/api/v1/download?token=${token}`,
    expiresAt,
    fileFormat: bookFile?.fileFormat ?? null,
    fileSizeBytes: bookFile?.fileSizeBytes != null ? Number(bookFile.fileSizeBytes) : null,
  };
}

// ── serveDownload ─────────────────────────────────────────────────────────────

/**
 * Xác thực token + kiểm entitlement + stream file về client.
 * Ném AppError nếu có vấn đề; caller (controller) pipe response.
 */
// FIX 5: loại bỏ tham số thừa clientUserId không dùng
// FIX 6: dùng static import verifyDownloadToken (không có circular dependency)
export async function resolveDownloadFile(
  token: string,
): Promise<{ filePath: string; filename: string; bookFile: BookFile }> {
  const { userId, bookId } = verifyDownloadToken(token);

  // Bảo vệ kép: kiểm lại entitlement
  const entitlement = await Entitlement.findOne({ where: { userId, bookId } });
  if (!entitlement) {
    throw AppError.from('ENTITLEMENT_MISSING', 'Quyền truy cập không hợp lệ');
  }

  // Load BookFile
  const bookFile = await BookFile.findOne({ where: { bookId } });
  if (!bookFile) {
    throw AppError.from('FILE_NOT_FOUND', 'File sách không tìm thấy');
  }

  // Resolve đường dẫn vật lý; storageKey dạng 'private/<filename>'
  const filePath = path.resolve(env.UPLOAD_DIR, bookFile.storageKey);

  // Kiểm file tồn tại
  if (!fs.existsSync(filePath)) {
    throw AppError.from('FILE_NOT_FOUND', 'File sách không tìm thấy trên hệ thống');
  }

  // Lấy tên file từ storageKey (phần sau dấu /)
  const filename = path.basename(bookFile.storageKey);

  return { filePath, filename, bookFile };
}
