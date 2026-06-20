import { Link } from 'react-router-dom';
import { LoginForm } from '../components/LoginForm';

export const LoginPage = () => (
  <div className="flex min-h-screen flex-col" style={{ backgroundColor: '#1A1A28' }}>
    {/* Topbar */}
    <header
      className="flex h-16 flex-shrink-0 items-center justify-between px-10"
      style={{ borderBottom: '1px solid rgba(255,255,255,.06)' }}
    >
      <Link
        to="/"
        className="text-[16px] font-semibold uppercase tracking-[2px] text-paper transition-opacity duration-200 hover:opacity-70"
      >
        Athena
      </Link>
      <Link
        to="/"
        className="flex items-center gap-1.5 text-[13px] tracking-[.2px] transition-colors duration-200 hover:text-paper"
        style={{ color: 'rgba(251,250,248,.5)' }}
      >
        {/* Chevron left */}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Về trang chủ
      </Link>
    </header>

    {/* Main centered content */}
    <main className="flex flex-1 items-center justify-center px-5 py-12">
      <div
        className="w-full max-w-[420px] rounded-modal bg-surface p-10"
        style={{ boxShadow: '0 8px 40px rgba(0,0,0,.28)', animation: 'cardIn 320ms cubic-bezier(.22,.61,.36,1) both' }}
      >
        {/* Brand mark */}
        <div className="mb-7 flex items-center justify-center gap-2.5">
          <div
            className="flex h-[30px] w-[30px] items-center justify-center bg-ink"
            style={{ borderRadius: '2px' }}
          >
            {/* Two-bar book icon from static */}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="2" y="2" width="4" height="10" rx="1" fill="white"/>
              <rect x="8" y="2" width="4" height="10" rx="1" fill="white" opacity=".6"/>
            </svg>
          </div>
          <span className="text-[14px] font-semibold uppercase tracking-[2.5px] text-ink">Athena</span>
        </div>

        <h2 className="mb-2 text-center text-2xl font-semibold tracking-[-0.5px] text-ink">Đăng nhập</h2>
        <p className="mb-6 text-center text-[13px] leading-[1.5] text-ink-2">
          Chào mừng trở lại! Đăng nhập để tiếp tục mua sắm.
        </p>

        <LoginForm />
      </div>
    </main>

    {/* Card entrance animation */}
    <style>{`
      @keyframes cardIn {
        from { opacity: 0; transform: translateY(12px); }
        to   { opacity: 1; transform: translateY(0); }
      }
    `}</style>
  </div>
);
