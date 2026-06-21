import type { ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../../app/hooks';
import { clearCredentials } from '../../../shared/auth/authSlice';
import { useLogoutMutation } from '../../auth/authApi';

interface Props {
  /** Page title shown in the sticky topbar */
  title: ReactNode;
  /** Optional right-side actions for the topbar */
  actions?: ReactNode;
  children: ReactNode;
}

const navItems = [
  { href: '/vendor/dashboard', label: 'Tổng quan' },
  { href: '/vendor/books', label: 'Quản lý E-book' },
  { href: '/vendor/orders', label: 'Đơn hàng' },
  { href: '/vendor/promotions', label: 'Khuyến mãi' },
  { href: '/vendor/wallet', label: 'Ví & Doanh thu' },
  { href: '/vendor/settings', label: 'Cài đặt shop' },
] as const;

export const VendorShell = ({ title, actions, children }: Props) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [logout] = useLogoutMutation();
  const user = useAppSelector((s) => s.auth.user);
  const refreshToken = useAppSelector((s) => s.auth.refreshToken);

  const shopName = user?.shop?.shopName ?? user?.fullName ?? 'Shop của tôi';

  const handleLogout = async () => {
    try {
      if (refreshToken) await logout({ refreshToken }).unwrap();
    } catch {
      /* ignore */
    } finally {
      dispatch(clearCredentials());
      navigate('/');
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: '#F4F3F0',
        fontFamily: "'Inter', sans-serif",
        fontSize: '14px',
        color: '#16161A',
      }}
    >
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        style={{
          width: '220px',
          flexShrink: 0,
          background: '#FFFFFF',
          borderRight: '1px solid #ECEAE5',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
        }}
      >
        {/* Brand + shop info */}
        <div
          style={{
            padding: '28px 24px 20px',
            borderBottom: '1px solid #ECEAE5',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              marginBottom: '20px',
            }}
          >
            Athena · Vendor
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '2px' }}>
            {shopName}
          </div>
          <div
            style={{
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: '#B8893B',
            }}
          >
            Vendor
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 0' }}>
          {navItems.map(({ href, label }) => (
            <NavLink
              key={href}
              to={href}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 24px',
                fontSize: '13px',
                color: isActive ? '#16161A' : '#6B6B73',
                fontWeight: isActive ? 500 : 400,
                background: isActive ? '#F4F2ED' : 'transparent',
                textDecoration: 'none',
                position: 'relative',
                borderLeft: isActive ? '2px solid #16161A' : '2px solid transparent',
                transition: 'background 0.12s, color 0.12s',
              })}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #ECEAE5' }}>
          <button
            onClick={handleLogout}
            style={{
              fontSize: '12px',
              color: '#A8A8AE',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────── */}
      <main style={{ marginLeft: '220px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Topbar */}
        <div
          style={{
            background: '#FFFFFF',
            borderBottom: '1px solid #ECEAE5',
            height: '60px',
            padding: '0 32px',
            display: 'flex',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flex: 1 }}>
            {title}
          </div>
          {actions && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {actions}
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '24px 32px 60px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {children}
        </div>
      </main>
    </div>
  );
};

// Styled button helpers matching the design tokens
export const BtnPrimary = ({ children, onClick, as: Tag = 'button', to, ...rest }: {
  children: ReactNode;
  onClick?: () => void;
  as?: 'button' | typeof Link;
  to?: string;
  [k: string]: unknown;
}) => {
  const style = {
    height: '32px',
    padding: '0 14px',
    background: '#16161A',
    color: '#FBFAF8',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '.5px',
    textTransform: 'uppercase' as const,
    border: 'none',
    borderRadius: '2px',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
  };
  if (Tag === Link && to) return <Link to={to} style={style} {...(rest as object)}>{children}</Link>;
  return <button style={style} onClick={onClick} {...rest}>{children}</button>;
};

export const BtnGhost = ({ children, onClick, danger = false, style: extraStyle }: {
  children: ReactNode;
  onClick?: () => void;
  danger?: boolean;
  style?: React.CSSProperties;
}) => (
  <button
    onClick={onClick}
    style={{
      height: '28px',
      padding: '0 10px',
      background: 'none',
      color: danger ? '#B43A3A' : '#6B6B73',
      fontSize: '11px',
      fontWeight: 500,
      border: '1px solid #ECEAE5',
      borderRadius: '2px',
      cursor: 'pointer',
      ...extraStyle,
    }}
  >
    {children}
  </button>
);
