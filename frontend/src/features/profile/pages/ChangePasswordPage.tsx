import { Link } from 'react-router-dom';
import { ChangePasswordForm } from '../components/ChangePasswordForm';

export const ChangePasswordPage = () => (
  <div className="min-h-screen bg-canvas">
    {/* Top navigation */}
    <header
      className="flex h-16 items-center justify-between px-8 bg-surface"
      style={{ borderBottom: '1px solid var(--color-line, #E8E6E1)' }}
    >
      <Link to="/" className="text-sm font-semibold uppercase tracking-[2px] text-ink">
        ATHENA
      </Link>
      <Link to="/user/profile" className="text-sm text-ink-2 hover:text-ink">
        ← Quay lại hồ sơ
      </Link>
    </header>

    {/* Content */}
    <div className="mx-auto max-w-[480px] px-4 py-10">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-[13px] text-ink-2">
        <Link to="/" className="hover:text-ink hover:underline">
          Trang chủ
        </Link>
        <span>/</span>
        <Link to="/user/profile" className="hover:text-ink hover:underline">
          Hồ sơ
        </Link>
        <span>/</span>
        <span className="text-ink">Đổi mật khẩu</span>
      </nav>

      <h1 className="mb-6 text-2xl font-semibold text-ink">Đổi mật khẩu</h1>

      <div
        className="rounded-modal bg-surface p-8"
        style={{ boxShadow: '0 2px 16px rgba(0,0,0,.06)' }}
      >
        <p className="mb-6 text-[13px] text-ink-2">
          Để bảo mật tài khoản, vui lòng không chia sẻ mật khẩu với người khác.
        </p>

        <ChangePasswordForm />
      </div>
    </div>
  </div>
);
