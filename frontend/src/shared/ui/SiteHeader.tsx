import { useRef, useEffect, useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';

/**
 * SiteHeader — sticky navbar matching home_static.html + home_preview.html.
 * Backdrop-blur on scroll (preview effect). Shows auth area based on Redux auth state.
 */
export const SiteHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAppSelector((s) => s.auth.user);
  const [scrolled, setScrolled] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

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

            {/* Cart */}
            <button
              type="button"
              className="text-[13px] tracking-[0.2px] text-ink-2 transition-colors duration-[250ms] hover:text-ink"
              aria-label="Giỏ hàng"
            >
              Giỏ hàng <span className="font-medium text-ink">(0)</span>
            </button>

            <span className="h-5 w-px bg-line" aria-hidden="true" />

            {user ? (
              /* Logged-in state */
              <div className="flex items-center gap-3">
                {user.role === 'vendor' && (
                  <Link
                    to="/vendor/books"
                    className="text-[13px] text-ink-2 transition-colors duration-[250ms] hover:text-ink"
                  >
                    Quản lý sách
                  </Link>
                )}
                <Link
                  to="/user/profile"
                  className="text-[13px] font-medium text-ink transition-colors duration-[250ms] hover:opacity-80"
                >
                  {user.fullName}
                </Link>
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
