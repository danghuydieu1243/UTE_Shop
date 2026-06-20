import { Link, useSearchParams } from 'react-router-dom';
import { OtpForm } from '../components/OtpForm';

export const VerifyOtpPage = () => {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const purposeParam = searchParams.get('purpose');
  const purpose: 'register' | 'reset_password' =
    purposeParam === 'reset_password' ? 'reset_password' : 'register';

  return (
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
          className="w-full max-w-[400px] rounded-modal bg-surface p-10 text-center"
          style={{ boxShadow: '0 8px 40px rgba(0,0,0,.28)' }}
        >
          {/* Icon */}
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-line bg-paper">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16161A" strokeWidth="1.6">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>

          <h1 className="mb-2 text-2xl font-semibold text-ink">Xác thực email</h1>
          <p className="mb-1 text-[13px] text-ink-2">
            Chúng tôi đã gửi mã 6 chữ số đến
          </p>
          <p className="mb-1 break-all text-[13px] font-semibold text-ink">{email}</p>
          <p className="mb-6 text-[13px] text-ink-3">
            Kiểm tra hộp thư spam nếu không thấy email
          </p>

          <OtpForm email={email} purpose={purpose} />

          <p className="mt-5 text-sm text-ink-2">
            Sai email?{' '}
            <Link to="/register" className="font-medium text-ink hover:underline">
              Quay lại đăng ký
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
