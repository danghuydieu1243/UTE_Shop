import { User } from '../../db/models/User';

export interface PublicUser {
  id: number;
  email: string;
  role: string;
  fullName: string;
  status: string;
  phone: string | null;
}

export const toPublicUser = (u: User): PublicUser => ({
  id: u.id,
  email: u.email,
  role: u.role,
  fullName: u.fullName,
  status: u.status,
  phone: u.phone ?? null,
});
