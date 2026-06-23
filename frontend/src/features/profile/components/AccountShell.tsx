import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../../app/hooks';
import { clearCredentials } from '../../../shared/auth/authSlice';
import { useLogoutMutation } from '../../auth/authApi';
import { useGetUnreadCountQuery } from '../../notifications/notificationsApi';

interface Props {
  breadcrumbLabel: string;
  activeNav: string;
  children: ReactNode;
  userData?: { fullName: string; email: string } | null;
}

function getInitials(fullName: string, maxLen = 2): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, maxLen).toUpperCase();
  return parts
    .slice(0, maxLen)
    .map((p) => p.charAt(0))
    .join('')
    .toUpperCase();
}

const NavIcon = ({ d, extra }: { d: string; extra?: ReactNode }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
    <path d={d} />
    {extra}
  </svg>
);

const sidebarNavItems = [
  {
    href: '/user/profile',
    label: 'Hồ sơ cá nhân',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    href: '/user/orders',
    label: 'Đơn hàng của tôi',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>
    ),
  },
  {
    href: '/user/ebooks',
    label: 'E-book của tôi',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      </svg>
    ),
  },
  {
    href: '/user/wishlist',
    label: 'Danh sách yêu thích',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
    ),
  },
  {
    href: '/user/notifications',
    label: 'Thông báo',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
    ),
  },
  {
    href: '/user/change-password',
    label: 'Đổi mật khẩu',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
    ),
  },
];

export const AccountShell = ({ breadcrumbLabel, activeNav, children, userData }: Props) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [logout] = useLogoutMutation();
  const authUser = useAppSelector((s) => s.auth.user);
  const refreshToken = useAppSelector((s) => s.auth.refreshToken);
  const { data: unreadCount = 0 } = useGetUnreadCountQuery();

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await logout({ refreshToken }).unwrap();
      }
    } catch {
      /* ignore */
    } finally {
      dispatch(clearCredentials());
      navigate('/');
    }
  };

  const navInitial = authUser?.fullName ? authUser.fullName.charAt(0).toUpperCase() : '?';
  const sidebarInitials = userData?.fullName ? getInitials(userData.fullName) : '?';

  return (
    <div className="min-h-screen bg-paper">
      {/* Navbar */}
      <header className="sticky top-0 z-[200] bg-paper border-b border-line">
        <div className="max-w-[1180px] mx-auto px-[40px] flex items-center h-[72px] gap-[40px]">
          <Link to="/" className="text-[18px] font-semibold uppercase tracking-[1px] text-ink flex-shrink-0">
            ATHENA
          </Link>
          <nav className="flex gap-[30px] flex-1">
            <Link to="/" className="text-[13px] text-ink-2 tracking-[0.2px] py-1 no-underline hover:text-ink">
              Trang chủ
            </Link>
            <Link to="/books" className="text-[13px] text-ink-2 tracking-[0.2px] py-1 no-underline hover:text-ink">
              Sách
            </Link>
            <Link to="/categories" className="text-[13px] text-ink-2 tracking-[0.2px] py-1 no-underline hover:text-ink">
              Danh mục
            </Link>
          </nav>
          <div className="flex items-center gap-[18px]">
            {/* Search box */}
            <div className="flex items-center gap-2 h-[36px] px-[14px] border border-line rounded bg-surface w-[200px]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-ink-3 flex-shrink-0">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                placeholder="Tìm kiếm..."
                className="flex-1 bg-transparent border-none outline-none text-[13px] text-ink placeholder-ink-3"
              />
            </div>
            {/* Heart icon */}
            <button className="text-ink-2 hover:text-ink border-none bg-transparent p-1 cursor-pointer" aria-label="Yêu thích">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
            {/* Cart icon */}
            <button className="relative text-ink-2 hover:text-ink border-none bg-transparent p-1 cursor-pointer" aria-label="Giỏ hàng">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
              <span className="absolute -top-1 -right-1 w-[16px] h-[16px] rounded-full bg-ink text-paper text-[10px] font-semibold flex items-center justify-center leading-none">
                0
              </span>
            </button>
            {/* Separator */}
            <span className="w-px h-[20px] bg-line flex-shrink-0" />
            {/* Avatar */}
            <button
              className="w-[34px] h-[34px] rounded-full bg-ink text-paper text-[12px] font-semibold tracking-[0.5px] border-none flex items-center justify-center cursor-pointer"
              aria-label="Tài khoản"
            >
              {navInitial}
            </button>
          </div>
        </div>
      </header>

      {/* Breadcrumb bar */}
      <div className="border-b border-line py-[14px]">
        <div className="max-w-[1180px] mx-auto px-[40px]">
          <nav className="flex items-center gap-2 text-[12px] text-ink-2">
            <Link to="/" className="hover:text-ink no-underline">Trang chủ</Link>
            <span className="text-ink-3">/</span>
            <span className="text-ink font-medium">{breadcrumbLabel}</span>
          </nav>
        </div>
      </div>

      {/* Page body */}
      <div className="py-[40px] pb-[80px]">
        <div className="max-w-[1180px] mx-auto px-[40px]">
          <div className="grid gap-[32px]" style={{ gridTemplateColumns: '240px 1fr' }}>
            {/* Sidebar */}
            <aside className="sticky top-[88px] border border-line rounded bg-surface overflow-hidden self-start">
              {/* User block */}
              <div className="px-5 pt-6 pb-5 border-b border-line flex flex-col items-center gap-[10px] text-center">
                <div className="w-[72px] h-[72px] rounded-full bg-ink text-paper text-[22px] font-semibold tracking-[-0.5px] flex items-center justify-center flex-shrink-0">
                  {sidebarInitials}
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-ink leading-[1.3]">
                    {userData?.fullName ?? '...'}
                  </p>
                  <p className="text-[12px] text-ink-3 -mt-1 mt-1">
                    {userData?.email ?? ''}
                  </p>
                </div>
              </div>
              {/* Nav items */}
              <nav className="py-2">
                {sidebarNavItems.map((item) => {
                  const isActive = activeNav === item.href;
                  const isNotifications = item.href === '/user/notifications';
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={`flex items-center gap-3 px-5 py-[11px] text-[13px] no-underline w-full border-l-[3px] transition-colors ${
                        isActive
                          ? 'bg-cover-bg text-ink font-medium border-l-ink'
                          : 'text-ink-2 bg-transparent border-l-transparent hover:bg-cover-bg hover:text-ink'
                      }`}
                    >
                      <span className="text-current flex-shrink-0">{item.icon}</span>
                      {item.label}
                      {isNotifications && unreadCount > 0 && (
                        <span
                          className="ml-auto min-w-[18px] h-[18px] px-[5px] rounded-full text-[10px] font-semibold inline-flex items-center justify-center leading-none"
                          style={{
                            backgroundColor: isActive ? '#B8893B' : '#16161A',
                            color: '#FBFAF8',
                          }}
                        >
                          {unreadCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-5 py-[11px] text-[13px] text-danger-fg bg-transparent border-none border-l-[3px] border-l-transparent w-full text-left cursor-pointer hover:bg-cover-bg"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Đăng xuất
                </button>
              </nav>
            </aside>

            {/* Main content */}
            <main className="border border-line rounded bg-surface min-w-0">
              {children}
            </main>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-paper border-t border-line py-[64px] pb-[36px]">
        <div className="max-w-[1180px] mx-auto px-[40px]">
          <div className="grid gap-[48px] pb-[56px]" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr' }}>
            <div>
              <p className="text-[18px] font-semibold uppercase tracking-[1px] mb-[18px]">ATHENA</p>
              <p className="text-[13px] leading-[1.8] text-ink-2 max-w-[320px]">
                Nền tảng mua sắm sách hàng đầu Việt Nam. Chúng tôi mang đến trải nghiệm đọc sách tuyệt vời với hàng ngàn đầu sách đa dạng.
              </p>
            </div>
            <div>
              <h4 className="text-[11px] font-medium uppercase tracking-[1.5px] text-ink-3 mb-5">Hỗ trợ</h4>
              <div className="flex flex-col gap-3 text-[13px] text-ink-2">
                <Link to="/faq" className="no-underline hover:text-ink">Câu hỏi thường gặp</Link>
                <Link to="/shipping" className="no-underline hover:text-ink">Chính sách vận chuyển</Link>
                <Link to="/returns" className="no-underline hover:text-ink">Chính sách đổi trả</Link>
                <Link to="/contact" className="no-underline hover:text-ink">Liên hệ</Link>
              </div>
            </div>
            <div>
              <h4 className="text-[11px] font-medium uppercase tracking-[1.5px] text-ink-3 mb-5">Khám phá</h4>
              <div className="flex flex-col gap-3 text-[13px] text-ink-2">
                <Link to="/books" className="no-underline hover:text-ink">Tất cả sách</Link>
                <Link to="/categories" className="no-underline hover:text-ink">Danh mục</Link>
                <Link to="/bestsellers" className="no-underline hover:text-ink">Bán chạy nhất</Link>
                <Link to="/new-arrivals" className="no-underline hover:text-ink">Mới nhất</Link>
              </div>
            </div>
            <div>
              <h4 className="text-[11px] font-medium uppercase tracking-[1.5px] text-ink-3 mb-5">Về chúng tôi</h4>
              <div className="flex flex-col gap-3 text-[13px] text-ink-2">
                <Link to="/about" className="no-underline hover:text-ink">Giới thiệu</Link>
                <Link to="/careers" className="no-underline hover:text-ink">Tuyển dụng</Link>
                <Link to="/press" className="no-underline hover:text-ink">Truyền thông</Link>
                <Link to="/privacy" className="no-underline hover:text-ink">Chính sách bảo mật</Link>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between pt-7 border-t border-line text-[12px] text-ink-3">
            <span>© 2024 ATHENA. Tất cả quyền được bảo lưu.</span>
            <span>Được xây dựng với ❤️ tại Việt Nam</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Re-export NavIcon to avoid unused warning
export { NavIcon };
