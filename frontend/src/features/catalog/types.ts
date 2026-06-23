// Catalog feature — shared TypeScript interfaces
// Matches API Spec §02_Catalog_Books.md DTOs (camelCase, money=number VND)

export interface BookCard {
  id: number;
  slug: string;
  title: string;
  author: string | null;
  authorSlug: string | null;
  coverImageUrl: string | null;
  price: number;
  originalPrice: number | null;
  discountPercent: number | null;
  fileFormat: 'PDF' | 'EPUB';
  fileSizeBytes: number;
  ratingAvg: number;
  ratingCount: number;
  purchaseCount: number;
  tag: string | null;
}

export interface AuthorRef {
  id: number;
  name: string;
  slug: string;
}

export interface PublisherRef {
  id: number;
  name: string;
}

export interface CategoryRef {
  id: number;
  name: string;
  slug: string;
}

export interface BookImage {
  url: string;
  alt: string;
  sortOrder: number;
}

export interface VendorRef {
  shopName: string;
  shopSlug: string;
}

export interface BookDetail {
  id: number;
  slug: string;
  title: string;
  author: AuthorRef | null;
  publisher: PublisherRef | null;
  category: CategoryRef | null;
  description: string;
  tableOfContents: string[];
  price: number;
  originalPrice: number | null;
  discountPercent: number | null;
  publishYear: number | null;
  isbn: string | null;
  fileFormat: 'PDF' | 'EPUB';
  fileSizeBytes: number;
  coverImageUrl: string | null;
  images: BookImage[];
  ratingAvg: number;
  ratingCount: number;
  purchaseCount: number;
  publishedAt: string;
  vendor: VendorRef | null;
  relatedByAuthor: BookCard[];
  relatedByCategory: BookCard[];
}

export interface Category {
  id: number;
  slug: string;
  name: string;
  parentId: number | null;
  sortOrder: number;
  bookCount: number;
}

export interface HomeCategory {
  id: number;
  slug: string;
  name: string;
  bookCount: number;
}

export interface HomeData {
  newReleases: BookCard[];
  bestsellers: BookCard[];
  featured: BookCard[];
  categories: HomeCategory[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface FilterAuthor {
  slug: string;
  name: string;
  count: number;
}

export interface FilterPublisher {
  slug: string;
  name: string;
  count: number;
}

export interface FilterFormat {
  value: 'PDF' | 'EPUB';
  count: number;
}

export interface FilterOptions {
  authors: FilterAuthor[];
  publishers: FilterPublisher[];
  priceRange: { min: number; max: number };
  formats: FilterFormat[];
}

export type SortOption = 'relevant' | 'newest' | 'bestselling' | 'price_asc' | 'price_desc';

export interface CatalogBooksParams {
  q?: string;
  category?: string | string[];
  format?: ('PDF' | 'EPUB') | ('PDF' | 'EPUB')[];
  priceMin?: number;
  priceMax?: number;
  rating?: number;
  author?: string | string[];
  publisher?: string | string[];
  sort?: SortOption;
  page?: number;
  limit?: number;
}
