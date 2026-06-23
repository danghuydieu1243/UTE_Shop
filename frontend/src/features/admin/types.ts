/** Admin feature shared types.
 *  Grows as Tasks 5–8 add real admin endpoints.
 */

export type AdminUserStatus = 'active' | 'locked' | 'pending';
export type AdminVendorStatus = 'active' | 'locked';
// Lưu ý: order status canonical (NEW|COMPLETED|CANCELLED) định nghĩa trong adminApi.ts.

export interface AdminUserRow {
  id: number;
  email: string;
  fullName: string;
  role: 'user' | 'vendor' | 'manager' | 'admin';
  status: AdminUserStatus;
  phone: string | null;
  createdAt: string;
  emailVerifiedAt: string | null;
}

export interface AdminVendorRow {
  userId: number;
  shopName: string;
  shopSlug: string | null;
  ownerName: string;
  ownerEmail: string;
  status: AdminVendorStatus;
  bookCount: number;
  createdAt: string;
}

// 'draft' = vendor chưa đăng; 'published' = công khai; 'hidden' = admin đã gỡ
export type AdminProductStatus = 'draft' | 'published' | 'hidden';

// Khớp chính xác BE AdminProductDTO (admin.schema.ts)
export interface AdminProductRow {
  id: number;
  title: string;
  slug: string | null;
  vendorShop: string;
  authorName: string | null;
  price: number;
  status: AdminProductStatus | string;
  fileFormat: string;
  createdAt: string;
}
