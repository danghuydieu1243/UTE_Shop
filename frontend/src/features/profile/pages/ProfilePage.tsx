import { Link } from 'react-router-dom';
import { Spinner, Alert } from '../../../shared/ui';
import { useGetMeQuery } from '../../auth/authApi';
import { ProfileEditForm } from '../components/ProfileEditForm';

export const ProfilePage = () => {
  const { data, isLoading, isError } = useGetMeQuery();

  return (
    <div className="min-h-screen bg-canvas">
      {/* Top navigation */}
      <header
        className="flex h-16 items-center justify-between px-8 bg-surface"
        style={{ borderBottom: '1px solid var(--color-line, #E8E6E1)' }}
      >
        <Link to="/" className="text-sm font-semibold uppercase tracking-[2px] text-ink">
          ATHENA
        </Link>
        {data && (
          <span className="text-sm text-ink-2">
            {data.fullName}
          </span>
        )}
      </header>

      {/* Content */}
      <div className="mx-auto max-w-[560px] px-4 py-10">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-[13px] text-ink-2">
          <Link to="/" className="hover:text-ink hover:underline">
            Trang chủ
          </Link>
          <span>/</span>
          <span className="text-ink">Hồ sơ của tôi</span>
        </nav>

        <h1 className="mb-6 text-2xl font-semibold text-ink">Hồ sơ của tôi</h1>

        {isLoading && (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        )}

        {isError && !isLoading && (
          <Alert kind="danger">Không thể tải thông tin. Vui lòng thử lại.</Alert>
        )}

        {data && !isLoading && (
          <div
            className="rounded-modal bg-surface p-8"
            style={{ boxShadow: '0 2px 16px rgba(0,0,0,.06)' }}
          >
            {/* User info summary */}
            <div className="mb-6 flex items-center gap-4">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full bg-ink text-xl font-semibold text-paper"
              >
                {data.fullName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-ink">{data.fullName}</p>
                <p className="text-[13px] text-ink-2">{data.email}</p>
              </div>
            </div>

            <div
              className="mb-6"
              style={{ borderBottom: '1px solid var(--color-line, #E8E6E1)' }}
            />

            <ProfileEditForm user={data} />
          </div>
        )}
      </div>
    </div>
  );
};
