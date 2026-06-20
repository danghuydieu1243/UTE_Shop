import { useGetMeQuery } from '../../auth/authApi';
import { ChangePasswordForm } from '../components/ChangePasswordForm';
import { AccountShell } from '../components/AccountShell';

export const ChangePasswordPage = () => {
  const { data } = useGetMeQuery();

  const userData = data ? { fullName: data.fullName, email: data.email } : null;

  return (
    <AccountShell
      breadcrumbLabel="Đổi mật khẩu"
      activeNav="/user/change-password"
      userData={userData}
    >
      {/* Content header */}
      <div className="px-7 pt-6 pb-0 border-b border-line">
        <h1 className="text-[18px] font-semibold tracking-[-0.3px] mb-5">Đổi mật khẩu</h1>
      </div>

      {/* Content body */}
      <div className="p-7">
        <div className="max-w-[480px]">
          <ChangePasswordForm />
        </div>
      </div>
    </AccountShell>
  );
};
