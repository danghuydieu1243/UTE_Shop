/** Admin feature shared types.
 *  Grows as Tasks 5–8 add real admin endpoints.
 */

export type AdminUserStatus = 'active' | 'locked' | 'pending';
export type AdminVendorStatus = 'active' | 'locked';
export type AdminOrderStatus = 'NEW' | 'PENDING_PAYMENT' | 'COMPLETED' | 'CANCELLED';

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
  id: number;
  email: string;
  fullName: string;
  status: AdminVendorStatus;
  shopName: string;
  createdAt: string;
}

export interface AdminOrderRow {
  code: string;
  status: AdminOrderStatus;
  total: number;
  createdAt: string;
  buyerEmail: string;
}

export interface AdminProductRow {
  id: number;
  title: string;
  vendorEmail: string;
  status: string;
  price: number;
  createdAt: string;
}
