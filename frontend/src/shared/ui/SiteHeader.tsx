import { useRef, useEffect, useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { clearCredentials } from '../auth/authSlice';
import { useGetCartQuery } from '../../features/cart/cartApi';

/**
 * SiteHeader — sticky navbar matching home_static.html + home_preview.html.
 * Backdrop-blur on scroll (preview effect). Shows auth area based on Redux auth state.
 */
export const SiteHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const [scrolled, setScrolled] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const handleLogout = () => {
    dispatch(clearCredentials());
    navigate('/login');
  };
  const initials = (user?.fullName ?? user?.email ?? '?').trim().charAt(0).toUpperCase();

  // Chỉ gọi cart API khi đã đăng nhập với role 'user'
  const { data: cartData } = useGetCartQuery(undefined, {
    skip: !user || user.role !== 'user',
  });
  const cartCount = cartData?.itemCount ?? 0;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = searchRef.current?.value.trim();
      if (val) navigate(`/books?q=${encodeURIComponent(val)}`);
    }
  };

  return (
    <nav
      className={`sticky top-0 z-[200] border-b border-line bg-paper/86 backdrop-blur-[14px] transition-shadow duration-[350ms] ${
        scrolled ? 'shadow-[0_1px_20px_rgba(0,0,0,0.04)]' : ''
      }`}
      aria-label="Site navigation"
    >
      <div className="mx-auto max-w-container px-10">
        <div className="flex h-[72px] items-center gap-10">
          {/* Logo */}
          <Link
            to="/"
            className="flex-shrink-0 text-[18px] font-semibold uppercase tracking-[1px] text-ink"
          >
            Athena
          </Link>

          {/* Nav links */}
          <ul className="flex flex-1 gap-[30px]">
            <li>
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `relative pb-1 text-[13px] tracking-[0.2px] transition-colors duration-[250ms] after:absolute after:bottom-[-2px] after:left-0 after:h-px after:bg-ink after:transition-[width] after:duration-[300ms] hover:text-ink ${
                    isActive
                      ? 'text-ink after:w-full'
                      : 'text-ink-2 after:w-0 hover:after:w-full'
                  }`
                }
              >
                Trang chủ
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/books"
                className={({ isActive }) =>
                  `relative pb-1 text-[13px] tracking-[0.2px] transition-colors duration-[250ms] after:absolute after:bottom-[-2px] after:left-0 after:h-px after:bg-ink after:transition-[width] after:duration-[300ms] hover:text-ink ${
                    isActive
                      ? 'text-ink after:w-full'
                      : 'text-ink-2 after:w-0 hover:after:w-full'
                  }`
                }
              >
                Sách
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/books/categories"
                className={({ isActive }) =>
                  `relative pb-1 text-[13px] tracking-[0.2px] transition-colors duration-[250ms] after:absolute after:bottom-[-2px] after:left-0 after:h-px after:bg-ink after:transition-[width] after:duration-[300ms] hover:text-ink ${
                    isActive
                      ? 'text-ink after:w-full'
                      : 'text-ink-2 after:w-0 hover:after:w-full'
                  }`
                }
              >
                Danh mục
              </NavLink>
            </li>
          </ul>

          {/* Right section */}
          <div className="flex items-center gap-[18px]">
            {/* Search field */}
            <div className="flex h-9 w-[200px] items-center gap-2 rounded border border-line bg-surface px-3.5 transition-[border-color,width] duration-[300ms] focus-within:w-[230px] focus-within:border-ink">
              <svg
                width="14"
                height="14"
                stroke="currentColor"
                strokeWidth="1.6"
                viewBox="0 0 24 24"
                fill="none"
                className="text-ink-3"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                placeholder="Tìm sách, tác giả..."
                className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-3"
                onKeyDown={handleSearch}
                aria-label="Tìm kiếm sách"
              />
            </div>

            {/* Wishlist */}
            <button
              type="button"
              className="text-[13px] tracking-[0.2px] text-ink-2 transition-colors duration-[250ms] hover:text-ink"
              aria-label="Yêu thích"
            >
              Yêu thích
            </button>

            {/* Cart — Link đến /cart, hiển thị số sản phẩm thực từ API */}
            <Link
              to="/cart"
              className="text-[13px] tracking-[0.2px] text-ink-2 transition-colors duration-[250ms] hover:text-ink"
              aria-label="Giỏ hàng"
            >
              Giỏ hàng <span className="font-medium text-ink">({cartCount})</span>
            </Link>

            <span className="h-5 w-px bg-line" aria-hidden="true" />

            {user ? (
              /* Logged-in: avatar + dropdown (hover) */
              <div className="group relative">
                <button
                  type="button"
                  className="flex items-center gap-2 text-[13px] text-ink"
                  aria-label="Tài khoản"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-[13px] font-semibold text-paper">
                    {initials}
                  </span>
                  <span className="max-w-[120px] truncate font-medium">{user.fullName}</span>
                </button>

                {/* Dropdown — hiện khi hover (có cầu nối pt-2 để không mất hover) */}
                <div className="invisible absolute right-0 top-full z-[210] pt-2 opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100">
                  <div className="w-[200px] rounded border border-line bg-paper py-1.5 shadow-[0_8px_28px_rgba(0,0,0,0.10)]">
                    <div className="border-b border-line px-4 py-2">
                      <div className="truncate text-[13px] font-medium text-ink">{user.fullName}</div>
                      <div className="truncate text-[11px] text-ink-3">{user.email}</div>
                    </div>
                    <Link
                      to="/user/profile"
                      className="block px-4 py-2 text-[13px] text-ink-2 transition-colors hover:bg-surface hover:text-ink"
                    >
                      Hồ sơ của tôi
                    </Link>
                    {user.role === 'vendor' && (
                      <Link
                        to="/vendor/books"
                        className="block px-4 py-2 text-[13px] text-ink-2 transition-colors hover:bg-surface hover:text-ink"
                      >
                        Quản lý E-book
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="block w-full px-4 py-2 text-left text-[13px] text-danger-fg transition-colors hover:bg-surface"
                    >
                      Đăng xuất
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Guest state */
              <>
                <Link
                  to="/register"
                  className={`text-[13px] text-ink-2 transition-colors duration-[250ms] hover:text-ink ${
                    location.pathname === '/register' ? 'border-b border-ink text-ink' : ''
                  }`}
                >
                  Đăng ký
                </Link>
                <Link
                  to="/login"
                  className="inline-flex h-9 items-center rounded bg-ink px-[18px] text-[13px] font-medium uppercase tracking-[0.8px] text-paper transition-opacity duration-[200ms] hover:opacity-[0.82]"
                >
                  Đăng nhập
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
