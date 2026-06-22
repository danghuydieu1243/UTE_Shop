// Types cho tính năng đánh giá sách (Phase 4)

export interface ReviewDTO {
  id: number;
  rating: number;
  comment: string | null;
  userName: string;
  createdAt: string;
  vendorReply: string | null;
  vendorRepliedAt: string | null;
}

export interface GetBookReviewsParams {
  idOrSlug: string;
  page?: number;
  limit?: number;
}

export interface GetBookReviewsResult {
  reviews: ReviewDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateReviewBody {
  bookId: number;
  rating: number;
  comment?: string;
  /** Used only for RTK Query cache invalidation — NOT sent in POST body */
  idOrSlug: string | number;
}
