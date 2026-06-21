// Vendor feature — TypeScript interfaces
// Matches API Spec §02_Catalog_Books.md §6–11 (vendor endpoints)

export type VendorBookStatus = 'published' | 'draft' | 'hidden';

/** Row returned by GET /vendor/books list */
export interface VendorBookRow {
  id: number;
  title: string;
  author: string | null;
  coverImageUrl: string | null;
  price: number;
  status: VendorBookStatus;
  purchaseCount: number;
  updatedAt: string;
}

/** Full detail returned by GET /vendor/books/:id (for edit form) */
export interface VendorBookDetail {
  id: number;
  slug: string;
  title: string;
  description: string;
  tableOfContents: string[];
  price: number;
  originalPrice: number | null;
  categoryId: number | null;
  authorName: string | null;
  publisherName: string | null;
  publishYear: number | null;
  isbn: string | null;
  fileFormat: 'PDF' | 'EPUB' | null;
  fileSizeBytes: number | null;
  coverImageUrl: string | null;
  images: { url: string; alt: string; sortOrder: number }[];
  status: VendorBookStatus;
  purchaseCount: number;
  updatedAt: string;
  publishedAt: string | null;
}

/** Pagination shape */
export interface VendorPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Result shape returned by getVendorBooks */
export interface VendorBooksResult {
  books: VendorBookRow[];
  pagination: VendorPagination;
}

/** Query params for GET /vendor/books */
export interface VendorBooksParams {
  q?: string;
  status?: VendorBookStatus | '';
  page?: number;
  limit?: number;
}
