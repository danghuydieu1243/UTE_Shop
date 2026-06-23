/** BankAccountFormModal — Thêm / Sửa tài khoản ngân hàng.
 *  Bám docs/UI_Design/vendor_settings/vendor_bank_form_static.html.
 *  KHÔNG dùng var(--) — chỉ hex DS.
 */
import { useState, useEffect } from 'react';
import { useCreateBankAccountMutation, useUpdateBankAccountMutation } from '../bankAccountsApi';
import type { BankAccount, CreateBankAccountInput } from '../types';

// ── Danh sách ngân hàng Việt Nam (tĩnh) ─────────────────────────────────────
export const VN_BANKS = [
  'Vietcombank',
  'Techcombank',
  'MB Bank',
  'BIDV',
  'ACB',
  'VPBank',
  'Sacombank',
  'TPBank',
] as const;

interface Props {
  /** Nếu được truyền → chế độ Sửa; nếu undefined → chế độ Thêm */
  account?: BankAccount;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BankAccountFormModal({ account, onClose, onSuccess }: Props) {
  const isEdit = account !== undefined;

  const [bankName, setBankName] = useState(account?.bankName ?? VN_BANKS[0]);
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState(account?.accountHolder ?? '');
  const [isDefault, setIsDefault] = useState(account?.isDefault ?? false);
  const [clientError, setClientError] = useState('');
  const [serverError, setServerError] = useState('');

  const [createBankAccount, { isLoading: creating }] = useCreateBankAccountMutation();
  const [updateBankAccount, { isLoading: updating }] = useUpdateBankAccountMutation();

  const submitting = creating || updating;

  // Nếu bankName từ account không nằm trong VN_BANKS thì giữ nguyên, nhưng select sẽ không hiển thị đúng;
  // fallback sang VN_BANKS[0] nếu không khớp
  useEffect(() => {
    if (account) {
      const matched = VN_BANKS.find((b) => b === account.bankName);
      setBankName(matched ?? VN_BANKS[0]);
      setAccountHolder(account.accountHolder);
      setIsDefault(account.isDefault);
    }
  }, [account]);

  function validate(): boolean {
    if (!bankName) {
      setClientError('Vui lòng chọn ngân hàng.');
      return false;
    }
    if (!isEdit) {
      // Chỉ validate accountNumber khi tạo mới; khi sửa BE không cần số TK
      if (!accountNumber || !/^\d+$/.test(accountNumber)) {
        setClientError('Số tài khoản chỉ gồm chữ số.');
        return false;
      }
    }
    if (!accountHolder.trim()) {
      setClientError('Vui lòng nhập tên chủ tài khoản.');
      return false;
    }
    setClientError('');
    return true;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setServerError('');
    try {
      if (isEdit && account) {
        await updateBankAccount({
          id: account.id,
          bankName,
          accountHolder: accountHolder.toUpperCase(),
        }).unwrap();
      } else {
        const input: CreateBankAccountInput = {
          bankName,
          accountNumber,
          accountHolder: accountHolder.toUpperCase(),
          isDefault,
        };
        await createBankAccount(input).unwrap();
      }
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message ?? 'Có lỗi xảy ra. Vui lòng thử lại.';
      setServerError(msg);
    }
  }

  // ── Styles ──────────────────────────────────────────────────────────────────
  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    zIndex: 1000,
  };

  const modalStyle: React.CSSProperties = {
    background: '#FFFFFF',
    border: '1px solid #ECEAE5',
    borderRadius: '2px',
    width: '440px',
    maxWidth: '100%',
  };

  const modalHeadStyle: React.CSSProperties = {
    padding: '20px 24px 16px',
    borderBottom: '1px solid #ECEAE5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const modalBodyStyle: React.CSSProperties = {
    padding: '20px 24px',
  };

  const modalFootStyle: React.CSSProperties = {
    padding: '14px 24px 20px',
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
    borderTop: '1px solid #ECEAE5',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.8px',
    textTransform: 'uppercase',
    color: '#A8A8AE',
    marginBottom: '6px',
    display: 'block',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: '38px',
    padding: '0 12px',
    border: '1px solid #ECEAE5',
    borderRadius: '2px',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    color: '#16161A',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const fieldStyle: React.CSSProperties = {
    marginBottom: '16px',
  };

  const errorStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#B43A3A',
    marginTop: '4px',
  };

  return (
    <div
      style={overlayStyle}
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'Sửa tài khoản ngân hàng' : 'Thêm tài khoản ngân hàng'}
    >
      <div style={modalStyle}>
        {/* Header */}
        <div style={modalHeadStyle}>
          <span style={{ fontSize: '15px', fontWeight: 600, color: '#16161A' }}>
            {isEdit ? 'Sửa tài khoản ngân hàng' : 'Thêm tài khoản ngân hàng'}
          </span>
          <button
            onClick={onClose}
            aria-label="Đóng"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '16px',
              color: '#A8A8AE',
              cursor: 'pointer',
              padding: 0,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={modalBodyStyle}>
          {/* Ngân hàng */}
          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="bank-name-select">Ngân hàng</label>
            <select
              id="bank-name-select"
              value={bankName}
              onChange={(e) => {
                setBankName(e.target.value);
                setClientError('');
              }}
              style={{ ...inputStyle, background: '#FFFFFF' }}
              aria-label="Ngân hàng"
            >
              {VN_BANKS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Số tài khoản — chỉ hiện khi tạo mới */}
          {!isEdit && (
            <div style={fieldStyle}>
              <label style={labelStyle} htmlFor="bank-account-number">Số tài khoản</label>
              <input
                id="bank-account-number"
                type="text"
                inputMode="numeric"
                pattern="\d*"
                value={accountNumber}
                onChange={(e) => {
                  setAccountNumber(e.target.value.replace(/\D/g, ''));
                  setClientError('');
                }}
                placeholder="Chỉ gồm chữ số"
                style={inputStyle}
                aria-label="Số tài khoản"
              />
            </div>
          )}

          {/* Tên chủ tài khoản */}
          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="bank-account-holder">Tên chủ tài khoản</label>
            <input
              id="bank-account-holder"
              type="text"
              value={accountHolder}
              onChange={(e) => {
                setAccountHolder(e.target.value.toUpperCase());
                setClientError('');
              }}
              placeholder="VD: NGUYEN VAN A"
              style={inputStyle}
              aria-label="Tên chủ tài khoản"
            />
            <p style={{ fontSize: '11px', color: '#A8A8AE', marginTop: '5px' }}>
              Viết IN HOA, không dấu, trùng tên đăng ký tại ngân hàng.
            </p>
          </div>

          {/* Đặt làm mặc định — chỉ hiện khi tạo mới */}
          {!isEdit && (
            <div style={{ marginBottom: 0 }}>
              <label
                style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
              >
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  aria-label="Đặt làm tài khoản nhận tiền mặc định"
                />
                <span style={{ fontSize: '13px', color: '#6B6B73' }}>
                  Đặt làm tài khoản nhận tiền mặc định
                </span>
              </label>
            </div>
          )}

          {/* Lỗi */}
          {clientError && <p style={{ ...errorStyle, marginTop: '12px' }}>{clientError}</p>}
          {serverError && (
            <p style={{ ...errorStyle, marginTop: '12px' }} role="alert">
              {serverError}
            </p>
          )}
        </div>

        {/* Footer */}
        <div style={modalFootStyle}>
          <button
            type="button"
            onClick={onClose}
            style={{
              height: '38px',
              padding: '0 16px',
              background: 'none',
              color: '#6B6B73',
              fontSize: '11px',
              fontWeight: 500,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              border: '1px solid #ECEAE5',
              borderRadius: '2px',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              height: '38px',
              padding: '0 20px',
              background: submitting ? '#A8A8AE' : '#16161A',
              color: '#FBFAF8',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              border: 'none',
              borderRadius: '2px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {submitting ? 'Đang lưu...' : 'Lưu tài khoản'}
          </button>
        </div>
      </div>
    </div>
  );
}
