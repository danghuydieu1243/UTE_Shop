/** VendorSettingsPage (31) — Cài đặt shop.
 *  Phạm vi hiện tại: chỉ card "Tài khoản ngân hàng nhận tiền".
 *  Thông tin cửa hàng — bản sau.
 *  Bám docs/UI_Design/vendor_settings/vendor_settings_static.html.
 *  KHÔNG dùng var(--) — chỉ hex DS.
 */
import { useState } from 'react';
import { VendorShell } from '../../vendor/components/VendorShell';
import {
  useGetBankAccountsQuery,
  useSetDefaultBankAccountMutation,
  useDeleteBankAccountMutation,
} from '../bankAccountsApi';
import { BankAccountFormModal } from '../components/BankAccountFormModal';
import type { BankAccount } from '../types';

/** Rút 2 ký tự đầu của tên ngân hàng để hiển thị trong ô logo mini. */
function bankInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return name.slice(0, 3).toUpperCase();
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export function VendorSettingsPage() {
  const { data: accounts = [], isLoading, isError } = useGetBankAccountsQuery();
  const [setDefault] = useSetDefaultBankAccountMutation();
  const [deleteBankAccount] = useDeleteBankAccountMutation();

  const [modalOpen, setModalOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<BankAccount | undefined>(undefined);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  function openAdd() {
    setEditAccount(undefined);
    setModalOpen(true);
  }

  function openEdit(acc: BankAccount) {
    setEditAccount(acc);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditAccount(undefined);
  }

  async function handleSetDefault(id: number) {
    try {
      await setDefault(id).unwrap();
    } catch {
      /* ignore — cache invalidation sẽ không xảy ra nhưng không crash UI */
    }
  }

  async function handleDelete(acc: BankAccount) {
    setDeleteError(null);
    setDeletingId(acc.id);
    try {
      await deleteBankAccount(acc.id).unwrap();
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message ?? 'Không thể xóa tài khoản. Vui lòng thử lại.';
      setDeleteError(msg);
    } finally {
      setDeletingId(null);
    }
  }

  // ── Styles ──────────────────────────────────────────────────────────────────
  const cardStyle: React.CSSProperties = {
    background: '#FFFFFF',
    border: '1px solid #ECEAE5',
    borderRadius: '2px',
  };

  const cardHeadStyle: React.CSSProperties = {
    padding: '16px 20px 14px',
    borderBottom: '1px solid #ECEAE5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const cardTitleStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    color: '#6B6B73',
  };

  const cardBodyStyle: React.CSSProperties = {
    padding: '20px',
  };

  const bankItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '14px 16px',
    border: '1px solid #ECEAE5',
    borderRadius: '2px',
  };

  const bankLogoStyle: React.CSSProperties = {
    width: '40px',
    height: '40px',
    borderRadius: '2px',
    background: '#F4F2ED',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    fontWeight: 700,
    color: '#6B6B73',
    flexShrink: 0,
  };

  const btnXsStyle: React.CSSProperties = {
    height: '28px',
    padding: '0 10px',
    background: 'none',
    border: '1px solid #ECEAE5',
    borderRadius: '2px',
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    color: '#6B6B73',
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
  };

  const btnXsDangerStyle: React.CSSProperties = {
    ...btnXsStyle,
    color: '#B43A3A',
  };

  const btnAddStyle: React.CSSProperties = {
    marginTop: '12px',
    height: '34px',
    padding: '0 14px',
    background: 'none',
    border: '1px dashed #ECEAE5',
    borderRadius: '2px',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    color: '#6B6B73',
    width: '100%',
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
  };

  return (
    <VendorShell title="Cài đặt shop">
      {/* ── Thông tin cửa hàng — bản sau ─────────────────────────────────── */}
      <div style={cardStyle}>
        <div style={cardHeadStyle}>
          <span style={cardTitleStyle}>Thông tin cửa hàng</span>
        </div>
        <div style={{ ...cardBodyStyle, color: '#A8A8AE', fontSize: '13px' }}>
          Thông tin cửa hàng — bản sau
        </div>
      </div>

      {/* ── Tài khoản ngân hàng nhận tiền ─────────────────────────────────── */}
      <div style={cardStyle}>
        <div style={cardHeadStyle}>
          <span style={cardTitleStyle}>Tài khoản ngân hàng nhận tiền</span>
        </div>
        <div style={cardBodyStyle}>
          {/* Loading */}
          {isLoading && (
            <p style={{ fontSize: '13px', color: '#A8A8AE' }}>Đang tải...</p>
          )}

          {/* Error */}
          {isError && !isLoading && (
            <p style={{ fontSize: '13px', color: '#B43A3A' }}>
              Không thể tải tài khoản. Vui lòng thử lại.
            </p>
          )}

          {/* Delete error */}
          {deleteError && (
            <p
              role="alert"
              style={{
                fontSize: '12px',
                color: '#B43A3A',
                background: '#FBECEC',
                border: '1px solid #F5C0C0',
                borderRadius: '2px',
                padding: '8px 12px',
                marginBottom: '12px',
              }}
            >
              {deleteError}
            </p>
          )}

          {/* Empty state */}
          {!isLoading && !isError && accounts.length === 0 && (
            <div
              style={{
                padding: '32px 0',
                textAlign: 'center',
                color: '#A8A8AE',
                fontSize: '13px',
              }}
            >
              <p style={{ marginBottom: '12px' }}>Chưa có tài khoản ngân hàng nào.</p>
              <button
                onClick={openAdd}
                style={{
                  height: '34px',
                  padding: '0 16px',
                  background: '#16161A',
                  color: '#FBFAF8',
                  border: 'none',
                  borderRadius: '2px',
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                + Thêm tài khoản ngân hàng
              </button>
            </div>
          )}

          {/* Bank list */}
          {!isLoading && !isError && accounts.length > 0 && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {accounts.map((acc) => (
                  <div key={acc.id} style={bankItemStyle} data-testid={`bank-item-${acc.id}`}>
                    {/* Logo initials */}
                    <div style={bankLogoStyle}>{bankInitials(acc.bankName)}</div>

                    {/* Info */}
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        {acc.bankName}
                        {acc.isDefault && (
                          <span
                            style={{
                              fontSize: '9px',
                              fontWeight: 600,
                              letterSpacing: '0.5px',
                              textTransform: 'uppercase',
                              color: '#2E7D4F',
                              background: '#ECF6EE',
                              padding: '2px 7px',
                              borderRadius: '2px',
                            }}
                          >
                            Mặc định
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#A8A8AE',
                          fontVariantNumeric: 'tabular-nums',
                          marginTop: '2px',
                        }}
                      >
                        {acc.accountNumberMasked} — {acc.accountHolder}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {!acc.isDefault && (
                        <button
                          style={btnXsStyle}
                          onClick={() => handleSetDefault(acc.id)}
                          aria-label={`Đặt mặc định ${acc.bankName}`}
                        >
                          Đặt mặc định
                        </button>
                      )}
                      <button
                        style={btnXsStyle}
                        onClick={() => openEdit(acc)}
                        aria-label={`Sửa ${acc.bankName}`}
                      >
                        Sửa
                      </button>
                      <button
                        style={btnXsDangerStyle}
                        onClick={() => handleDelete(acc)}
                        disabled={deletingId === acc.id}
                        aria-label={`Xóa ${acc.bankName}`}
                      >
                        {deletingId === acc.id ? '...' : 'Xóa'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add button */}
              <button style={btnAddStyle} onClick={openAdd}>
                + Thêm tài khoản ngân hàng
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Modal ─────────────────────────────────────────────────────────── */}
      {modalOpen && (
        <BankAccountFormModal
          account={editAccount}
          onClose={closeModal}
          onSuccess={closeModal}
        />
      )}
    </VendorShell>
  );
}
