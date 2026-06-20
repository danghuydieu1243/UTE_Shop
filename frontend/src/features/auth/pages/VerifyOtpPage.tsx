import { Link, useSearchParams } from 'react-router-dom';
import { OtpForm } from '../components/OtpForm';

export const VerifyOtpPage = () => {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const purposeParam = searchParams.get('purpose');
  const purpose: 'register' | 'reset_password' =
    purposeParam === 'reset_password' ? 'reset_password' : 'register';

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: '#1A1A28' }}>
      {/* Topbar — identical structure to LoginPage / RegisterPage */}
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
          {/* Chevron left — exact SVG from static */}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Về trang chủ
        </Link>
      </header>

      {/* Main centered content */}
      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <div
          className="w-full max-w-[400px] bg-surface text-center"
          style={{
            borderRadius: '4px',
            boxShadow: '0 8px 40px rgba(0,0,0,.28)',
            padding: '40px',
            animation: 'cardIn 320ms cubic-bezier(.22,.61,.36,1) both',
          }}
        >
          {/* Email icon — 56×56px circle, bg paper, border line */}
          <div
            className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-line bg-paper"
            style={{ width: '56px', height: '56px' }}
          >
            {/* Envelope SVG — exact from static (26×26) */}
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <rect x="3" y="6" width="20" height="14" rx="2" stroke="#16161A" strokeWidth="1.5"/>
              <path d="M3 8l10 7 10-7" stroke="#16161A" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </div>

          {/* Title */}
          <h2
            className="mb-3 font-semibold text-ink"
            style={{ fontSize: '24px', letterSpacing: '-.5px' }}
          >
            Xác thực email
          </h2>

          {/* Description */}
          <p className="mb-1 text-[13px] leading-[1.6] text-ink-2">
            Chúng tôi đã gửi mã 6 chữ số đến
          </p>
          <p className="mb-1 break-all text-[13px] font-semibold text-ink">{email}</p>
          <p className="mb-7 text-[12px] text-ink-3">
            Kiểm tra hộp thư spam nếu không thấy email
          </p>

          <OtpForm email={email} purpose={purpose} />

          <p className="mt-4 text-[13px] text-ink-2">
            Sai email?{' '}
            <Link to="/register" className="font-medium text-ink hover:underline">
              Quay lại đăng ký
            </Link>
          </p>
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
};
