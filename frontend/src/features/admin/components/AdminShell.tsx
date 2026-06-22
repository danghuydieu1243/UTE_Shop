import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../../app/hooks';
import { clearCredentials } from '../../../shared/auth/authSlice';
import { useLogoutMutation } from '../../auth/authApi';

const ALL_NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Tổng quan', adminOnly: false },
  { href: '/admin/users',     label: 'Người dùng', adminOnly: true },
  { href: '/admin/vendors',   label: 'Vendor', adminOnly: false },
  { href: '/admin/products',  label: 'Sản phẩm', adminOnly: false },
  { href: '/admin/orders',    label: 'Đơn hàng', adminOnly: false },
  { href: '/admin/permissions', label: 'Cài đặt hệ thống', adminOnly: true },
] as const;

export const AdminShell = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [logout] = useLogoutMutation();
  const user = useAppSelector((s) => s.auth.user);
  const refreshToken = useAppSelector((s) => s.auth.refreshToken);

  const isAdmin = user?.role === 'admin';
  const navItems = ALL_NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

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
        {/* Brand */}
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
            Athena · Admin Panel
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '2px' }}>
            {user?.fullName ?? 'Admin'}
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
            {user?.role === 'admin' ? 'Admin' : 'Manager'}
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
            <span style={{ fontSize: '13px', fontWeight: 500 }}>Admin Panel</span>
          </div>
          <div style={{ fontSize: '12px', color: '#6B6B73' }}>
            {user?.email}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '24px 32px 60px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};
