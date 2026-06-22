import { Spinner, Alert } from '../../../shared/ui';
import { useGetMeQuery } from '../../auth/authApi';
import { useGetLoyaltyQuery } from '../../loyalty/loyaltyApi';
import { ProfileEditForm } from '../components/ProfileEditForm';
import { AccountShell } from '../components/AccountShell';

export const ProfilePage = () => {
  const { data, isLoading, isError } = useGetMeQuery();
  const { data: loyaltyData, isLoading: loyaltyLoading } = useGetLoyaltyQuery();

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
          <>
            {/* Loyalty balance widget */}
            {!loyaltyLoading && loyaltyData !== undefined && (
              <div className="mb-6 flex items-center gap-3 rounded-[2px] border border-line bg-surface px-5 py-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[1px] text-ink-3">
                    Điểm thưởng
                  </div>
                  <div className="mt-1 text-[22px] font-semibold tabular-nums text-ink">
                    {loyaltyData.balance.toLocaleString('vi-VN')}
                    <span className="ml-2 text-[13px] font-normal text-ink-2">điểm</span>
                  </div>
                </div>
              </div>
            )}

            <ProfileEditForm user={data} />
          </>
        )}
      </div>
    </AccountShell>
  );
};
