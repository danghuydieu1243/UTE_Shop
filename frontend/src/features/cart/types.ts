/** Thông tin sách rút gọn trong giỏ hàng */
export interface CartBook {
  id: number;
  slug: string;
  title: string;
  author: string | null;
  coverImageUrl: string | null;
  price: number;
  fileFormat: 'PDF' | 'EPUB';
}

/** Một dòng item trong giỏ hàng */
export interface CartItem {
  id: number;
  book: CartBook;
  unitPrice: number;
  addedAt: string;
}

/** Toàn bộ giỏ hàng trả về từ API */
export interface Cart {
  items: CartItem[];
  subtotal: number;
  itemCount: number;
  currency: string;
}
