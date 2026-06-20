import { Link } from 'react-router-dom';
import { LoginForm } from '../components/LoginForm';

export const LoginPage = () => (
  <div className="min-h-screen" style={{ backgroundColor: '#1A1A28' }}>
    {/* Topbar */}
    <header className="flex h-16 items-center justify-between px-8" style={{ borderBottom: '1px solid rgba(255,255,255,.06)' }}>
      <Link to="/" className="text-sm font-semibold uppercase tracking-[2px] text-paper">
        ATHENA
      </Link>
      <Link to="/" className="text-sm" style={{ color: 'rgba(255,255,255,.5)' }}>
        ← Về trang chủ
      </Link>
    </header>

    {/* Content */}
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8">
      <div
        className="w-full max-w-[420px] rounded-modal bg-surface p-10"
        style={{ boxShadow: '0 8px 40px rgba(0,0,0,.28)' }}
      >
        {/* Brand mark */}
        <div className="mb-6 flex flex-col items-center gap-3">
          <div
            className="flex h-[30px] w-[30px] items-center justify-center rounded bg-ink"
            style={{ borderRadius: '2px' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="2" width="12" height="1.5" fill="#FBFAF8"/>
              <rect x="1" y="5.5" width="10" height="1.5" fill="#FBFAF8"/>
              <rect x="1" y="9" width="12" height="1.5" fill="#FBFAF8"/>
            </svg>
          </div>
          <span className="text-[14px] font-semibold uppercase tracking-[2.5px] text-ink">ATHENA</span>
        </div>

        <h1 className="mb-1 text-center text-2xl font-semibold text-ink">Đăng nhập</h1>
        <p className="mb-6 text-center text-[13px] text-ink-2">
          Chào mừng trở lại! Đăng nhập để tiếp tục mua sắm.
        </p>

        <LoginForm />
      </div>
    </div>
  </div>
);
