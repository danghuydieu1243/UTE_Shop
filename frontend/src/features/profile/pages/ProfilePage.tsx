import { Spinner, Alert } from '../../../shared/ui';
import { useGetMeQuery } from '../../auth/authApi';
import { ProfileEditForm } from '../components/ProfileEditForm';
import { AccountShell } from '../components/AccountShell';

export const ProfilePage = () => {
  const { data, isLoading, isError } = useGetMeQuery();

  const userData = data ? { fullName: data.fullName, email: data.email } : null;

  return (
    <AccountShell
      breadcrumbLabel="Hồ sơ cá nhân"
      activeNav="/user/profile"
      userData={userData}
    >
      {/* Content header */}
      <div className="px-7 pt-6 pb-0 border-b border-line">
        <h1 className="text-[18px] font-semibold tracking-[-0.3px] mb-5">Tài khoản của tôi</h1>
      </div>

      {/* Tab content */}
      <div className="p-7">
        {isLoading && (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        )}

        {isError && !isLoading && (
          <Alert kind="danger">Không thể tải thông tin. Vui lòng thử lại.</Alert>
        )}

        {data && !isLoading && (
          <ProfileEditForm user={data} />
        )}
      </div>
    </AccountShell>
  );
};
