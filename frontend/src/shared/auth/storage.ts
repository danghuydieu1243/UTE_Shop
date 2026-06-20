import type { User } from '../types/auth';

const ACCESS = 'athena_access';
const REFRESH = 'athena_refresh';
const USER = 'athena_user';

export const storage = {
  getAccess: (): string | null => localStorage.getItem(ACCESS),
  getRefresh: (): string | null => localStorage.getItem(REFRESH),
  getUser: (): User | null => {
    const raw = localStorage.getItem(USER);
    return raw ? (JSON.parse(raw) as User) : null;
  },
  set: (access: string, refresh: string, user: User): void => {
    localStorage.setItem(ACCESS, access);
    localStorage.setItem(REFRESH, refresh);
    localStorage.setItem(USER, JSON.stringify(user));
  },
  setTokens: (access: string, refresh: string): void => {
    localStorage.setItem(ACCESS, access);
    localStorage.setItem(REFRESH, refresh);
  },
  clear: (): void => {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
    localStorage.removeItem(USER);
  },
};
