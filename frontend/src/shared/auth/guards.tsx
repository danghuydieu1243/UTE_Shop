import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';
import type { Role } from '../types/auth';

export const RequireAuth = () => {
  const user = useAppSelector((s) => s.auth.user);
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
};

export const RequireRole = ({ roles }: { roles: Role[] }) => {
  const user = useAppSelector((s) => s.auth.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/403" replace />;
  return <Outlet />;
};

export const redirectForRole = (role: Role): string => {
  if (role === 'vendor') return '/vendor/dashboard';
  if (role === 'admin' || role === 'manager') return '/admin/dashboard';
  return '/';
};
