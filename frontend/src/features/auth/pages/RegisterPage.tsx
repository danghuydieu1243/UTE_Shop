import { Link } from 'react-router-dom';
import { RegisterForm } from '../components/RegisterForm';

export const RegisterPage = () => (
  <div className="flex min-h-screen flex-col" style={{ backgroundColor: '#1A1A28' }}>
    {/* Topbar — identical structure to LoginPage */}
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
        className="w-full max-w-[420px] rounded-modal bg-surface p-10"
        style={{ boxShadow: '0 8px 40px rgba(0,0,0,.28)', animation: 'cardIn 320ms cubic-bezier(.22,.61,.36,1) both' }}
      >
        {/* Brand mark — two-bar book icon from static, same as Login */}
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div
            className="flex h-[30px] w-[30px] items-center justify-center bg-ink"
            style={{ borderRadius: '2px' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="2" y="2" width="4" height="10" rx="1" fill="white"/>
              <rect x="8" y="2" width="4" height="10" rx="1" fill="white" opacity=".6"/>
            </svg>
          </div>
          <span className="text-[14px] font-semibold uppercase tracking-[2.5px] text-ink">Athena</span>
        </div>

        <RegisterForm />
      </div>
    </main>

    {/* Keyframe animations — shared with card entrance and error */}
    <style>{`
      @keyframes cardIn {
        from { opacity: 0; transform: translateY(12px); }
        to   { opacity: 1; transform: translateY(0); }
      }
    `}</style>
  </div>
);
