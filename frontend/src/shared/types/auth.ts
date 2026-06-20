export type Role = 'user' | 'vendor' | 'manager' | 'admin';

export interface User {
  id: number;
  email: string;
  role: Role;
  fullName: string;
  status: string;
  phone?: string | null;
  shop?: { shopName: string; shopSlug: string };
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}
