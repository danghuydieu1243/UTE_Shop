/** AdminSettingsPage — /admin/settings (admin-only)
 *  Cấu hình tỉ lệ phí sàn (commission). Đọc/ghi qua BE `/admin/settings/commission`.
 *  Áp dụng cho đơn thanh toán từ sau khi lưu; đơn cũ không đổi.
 */
import { useEffect, useState } from 'react';
import { useGetCommissionQuery, useUpdateCommissionMutation } from '../adminApi';
import { Button, Input, Alert, Spinner } from '../../../shared/ui';
import type { ApiError } from '../../../shared/types/auth';

export function AdminSettingsPage() {
  const { data, isLoading } = useGetCommissionQuery();
  const [updateCommission, { isLoading: saving, isSuccess, error }] = useUpdateCommissionMutation();
  const [percent, setPercent] = useState('');

  useEffect(() => {
    if (data) setPercent(String(data.ratePercent));
  }, [data]);

  if (isLoading) {
    return (
      <div>
        <Spinner />
      </div>
    );
  }

  const onSave = () => {
    const n = Number(percent);
    if (Number.isFinite(n) && n >= 0 && n <= 100) {
      updateCommission({ ratePercent: n });
    }
  };

  return (
    <div className="max-w-md">
      <h1 className="mb-4 text-xl uppercase tracking-wide text-ink">Cấu hình phí sàn</h1>

      <Input
        label="Tỉ lệ phí sàn (%)"
        type="number"
        min={0}
        max={100}
        step={0.01}
        value={percent}
        onChange={(e) => setPercent(e.target.value)}
      />

      <p className="mt-2 text-xs text-ink-2">
        Áp dụng cho các đơn thanh toán từ sau khi lưu; đơn cũ không đổi.
      </p>

      {isSuccess && (
        <div className="mt-3">
          <Alert kind="success">Đã lưu tỉ lệ phí sàn.</Alert>
        </div>
      )}
      {error && (
        <div className="mt-3">
          <Alert kind="danger">{(error as ApiError)?.message ?? 'Lưu thất bại. Vui lòng thử lại.'}</Alert>
        </div>
      )}

      <Button className="mt-4" onClick={onSave} loading={saving}>
        Lưu
      </Button>
    </div>
  );
}
