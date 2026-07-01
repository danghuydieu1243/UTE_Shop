// Types cho màn E-book của tôi (Screen 15)

export interface Ebook {
  bookId: number;
  slug: string;
  title: string;
  author: string | null;
  coverImageUrl: string | null;
  fileFormat: string | null; // null khi sách chưa có BookFile (vd sách seeder mẫu)
  fileSizeBytes: number | null;
  grantedAt: string; // ISO date string
  orderCode: string;
}

export interface GetEbooksParams {
  q?: string;
  page?: number;
  limit?: number;
}

export interface EbooksResult {
  ebooks: Ebook[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DownloadLink {
  url: string;
  expiresAt: string;
  fileFormat: string;
  fileSizeBytes: number;
}
