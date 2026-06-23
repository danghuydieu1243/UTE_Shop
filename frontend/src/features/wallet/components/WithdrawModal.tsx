/** WithdrawModal — Rút tiền từ ví vendor.
 *  Props: availableBalance (số tiền hiện có), onClose, onSuccess.
 *  Quy tắc: KHÔNG dùng var(--) trong TSX. Chỉ hex DS.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGetBankAccountsQuery } from '../bankAccountsApi';
import { useCreateWithdrawalMutation } from '../walletApi';
import { formatVND } from '../../../shared/format';

interface Props {
  availableBalance: number;
  onClose: () => void;
  onSuccess?: () => void;
}

const MIN_AMOUNT = 100_000;

export function WithdrawModal({ availableBalance, onClose, onSuccess }: Props) {
  const { data: accounts = [], isLoading: loadingAccounts } = useGetBankAccountsQuery();
  const [createWithdrawal, { isLoading: submitting }] = useCreateWithdrawalMutation();

  const defaultAccount = accounts.find((a) => a.isDefault) ?? accounts[0] ?? null;
  const [amount, setAmount] = useState('');
  const [selectedId, setSelectedId] = useState<number | ''>(defaultAccount?.id ?? '');
  const [clientError, setClientError] = useState('');
  const [serverError, setServerError] = useState('');

  // Sync default once accounts load
  const effectiveSelectedId =
    selectedId !== ''
      ? selectedId
      : defaultAccount?.id ?? '';

  function setShortcut(fraction: number) {
    const val = Math.floor(availableBalance * fraction);
    setAmount(String(val));
    setClientError('');
    setServerError('');
  }

  function validate(): boolean {
    const num = Number(amount);
    if (!amount || isNaN(num) || num <= 0) {
      setClientError('Vui lòng nhập số tiền hợp lệ.');
      return false;
    }
    if (num < MIN_AMOUNT) {
      setClientError(`Số tiền tối thiểu là ${formatVND(MIN_AMOUNT)}.`);
      return false;
    }
    if (num > availableBalance) {
      setClientError(`Số tiền vượt quá số dư khả dụng (${formatVND(availableBalance)}).`);
      return false;
    }
    if (!effectiveSelectedId) {
      setClientError('Vui lòng chọn tài khoản ngân hàng.');
      return false;
    }
    setClientError('');
    return true;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setServerError('');
    try {
      await createWithdrawal({
        amount: Number(amount),
        bankAccountId: effectiveSelectedId as number,
      }).unwrap();
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message ?? 'Có lỗi xảy ra. Vui lòng thử lại.';
      setServerError(msg);
    }
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(22,22,26,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  };

  const panelStyle: React.CSSProperties = {
    background: '#FFFFFF',
    width: '440px',
    maxWidth: 'calc(100vw - 32px)',
    borderRadius: '4px',
    padding: '32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.8px',
    textTransform: 'uppercase',
    color: '#6B6B73',
    marginBottom: '6px',
    display: 'block',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: '40px',
    border: '1px solid #ECEAE5',
    borderRadius: '2px',
    padding: '0 12px',
    fontSize: '15px',
    color: '#16161A',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const selectStyle: React.CSSProperties = {
    width: '100%',
    height: '40px',
    border: '1px solid #ECEAE5',
    borderRadius: '2px',
    padding: '0 12px',
    fontSize: '13px',
    color: '#16161A',
    outline: 'none',
    background: '#FFFFFF',
    boxSizing: 'border-box',
  };

  const errorStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#B43A3A',
    marginTop: '4px',
  };

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-label="Rút tiền">
      <div style={panelStyle}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '16px', fontWeight: 600, color: '#16161A' }}>Rút tiền</span>
          <button
            onClick={onClose}
            aria-label="Đóng"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '18px',
              color: '#6B6B73',
              lineHeight: 1,
              padding: '4px',
            }}
          >
            ×
          </button>
        </div>

        {/* Available balance info */}
        <div
          style={{
            background: '#F4F2ED',
            borderRadius: '2px',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '12px', color: '#6B6B73' }}>Số dư khả dụng</span>
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#16161A' }}>
            {formatVND(availableBalance)}
          </span>
        </div>

        {/* Amount input */}
        <div>
          <label style={labelStyle} htmlFor="withdraw-amount">
            Số tiền rút
          </label>
          <input
            id="withdraw-amount"
            type="number"
            min={MIN_AMOUNT}
            max={availableBalance}
            step={1000}
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setClientError('');
              setServerError('');
            }}
            placeholder={`Tối thiểu ${formatVND(MIN_AMOUNT)}`}
            style={inputStyle}
            aria-label="Số tiền rút"
          />
          {/* Shortcuts */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={() => setShortcut(0.5)}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.5px',
                background: 'none',
                border: '1px solid #ECEAE5',
                borderRadius: '2px',
                padding: '4px 10px',
                cursor: 'pointer',
                color: '#6B6B73',
              }}
            >
              50%
            </button>
            <button
              type="button"
              onClick={() => setShortcut(1)}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.5px',
                background: 'none',
                border: '1px solid #ECEAE5',
                borderRadius: '2px',
                padding: '4px 10px',
                cursor: 'pointer',
                color: '#6B6B73',
              }}
            >
              Tối đa
            </button>
          </div>
          {clientError && <p style={errorStyle}>{clientError}</p>}
        </div>

        {/* Bank account select */}
        <div>
          <label style={labelStyle} htmlFor="withdraw-bank">
            Tài khoản nhận tiền
          </label>
          {loadingAccounts ? (
            <p style={{ fontSize: '13px', color: '#6B6B73' }}>Đang tải...</p>
          ) : accounts.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#6B6B73' }}>
              Bạn chưa có tài khoản ngân hàng.{' '}
              <Link
                to="/vendor/settings"
                style={{ color: '#16161A', textDecoration: 'underline' }}
                onClick={onClose}
              >
                Thêm ngay
              </Link>
            </p>
          ) : (
            <select
              id="withdraw-bank"
              value={effectiveSelectedId}
              onChange={(e) => {
                setSelectedId(Number(e.target.value));
                setClientError('');
              }}
              style={selectStyle}
              aria-label="Tài khoản ngân hàng"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.bankName} — {acc.accountNumberMasked} ({acc.accountHolder})
                  {acc.isDefault ? ' ★' : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Server error */}
        {serverError && (
          <p style={{ ...errorStyle, marginTop: 0 }} role="alert">
            {serverError}
          </p>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              height: '36px',
              padding: '0 16px',
              background: 'none',
              border: '1px solid #ECEAE5',
              borderRadius: '2px',
              fontSize: '12px',
              color: '#6B6B73',
              cursor: 'pointer',
            }}
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || accounts.length === 0}
            style={{
              height: '36px',
              padding: '0 20px',
              background: submitting || accounts.length === 0 ? '#AAAAAE' : '#16161A',
              color: '#FBFAF8',
              border: 'none',
              borderRadius: '2px',
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.5px',
              cursor: submitting || accounts.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Đang xử lý...' : 'Xác nhận rút'}
          </button>
        </div>
      </div>
    </div>
  );
}
