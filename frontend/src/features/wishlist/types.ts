// Types cho màn Wishlist (Screen 16)

/** DTO sách nhúng trong mỗi item wishlist */
export interface WishlistBook {
  id: number;
  slug: string;
  title: string;
  coverImageUrl: string | null;
  price: number;
  ratingAvg: number;
}

/** DTO item wishlist — backend trả dạng nested */
export interface WishlistItem {
  wishlistId: number;
  addedAt: string; // ISO date string
  book: WishlistBook;
}

/** Kết quả getWishlist (sau transformResponse) */
export interface WishlistResult {
  items: WishlistItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** Body POST /me/wishlist */
export interface AddToWishlistBody {
  bookId: number;
}
