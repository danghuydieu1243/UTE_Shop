/** AdminPermissionsPage — /admin/permissions (admin-only)
 *  Static read-only RBAC matrix matching docs/dev/RBAC_MATRIX.md
 *  Ref UI spec: docs/UI_Design/28_Admin_Permissions.md
 */

type Cell = '✓' | '—';

interface PermRow {
  group: string;
  guest: Cell;
  user: Cell;
  vendor: Cell;
  manager: Cell;
  admin: Cell;
}

const MATRIX: PermRow[] = [
  {
    group: 'Xem catalog / tìm kiếm',
    guest: '✓', user: '✓', vendor: '✓', manager: '✓', admin: '✓',
  },
  {
    group: 'Mua hàng / thanh toán / đơn của tôi',
    guest: '—', user: '✓', vendor: '—', manager: '—', admin: '—',
  },
  {
    group: 'Quản lý sách & đơn của shop',
    guest: '—', user: '—', vendor: '✓', manager: '—', admin: '—',
  },
  {
    group: 'Ví & rút tiền (Vendor)',
    guest: '—', user: '—', vendor: '✓', manager: '—', admin: '—',
  },
  {
    group: 'Khóa/mở khóa Vendor',
    guest: '—', user: '—', vendor: '—', manager: '✓', admin: '✓',
  },
  {
    group: 'Gỡ/khôi phục sản phẩm toàn sàn',
    guest: '—', user: '—', vendor: '—', manager: '✓', admin: '✓',
  },
  {
    group: 'Quản lý đơn hàng toàn sàn',
    guest: '—', user: '—', vendor: '—', manager: '✓', admin: '✓',
  },
  {
    group: 'Quản lý người dùng',
    guest: '—', user: '—', vendor: '—', manager: '—', admin: '✓',
  },
  {
    group: 'Xem doanh thu tổng toàn sàn',
    guest: '—', user: '—', vendor: '—', manager: '—', admin: '✓',
  },
  {
    group: 'Cấu hình phân quyền hệ thống',
    guest: '—', user: '—', vendor: '—', manager: '—', admin: '✓',
  },
];

const ROLE_HEADERS: { key: keyof Omit<PermRow, 'group'>; label: string; color: string }[] = [
  { key: 'guest',   label: 'Guest',   color: '#6B6B73' },
  { key: 'user',    label: 'User',    color: '#2D6BE4' },
  { key: 'vendor',  label: 'Vendor',  color: '#B8893B' },
  { key: 'manager', label: 'Manager', color: '#5C7A3E' },
  { key: 'admin',   label: 'Admin',   color: '#16161A' },
];

export const AdminPermissionsPage = () => (
  <div>
    {/* Page heading */}
    <div style={{ marginBottom: '24px' }}>
      <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#16161A', margin: 0 }}>
        Phân quyền hệ thống
      </h1>
    </div>

    {/* Card */}
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #ECEAE5',
        borderRadius: '4px',
        overflow: 'hidden',
      }}
    >
      {/* Card header */}
      <div
        style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid #ECEAE5',
        }}
      >
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#16161A', marginBottom: '4px' }}>
          Ma trận quyền
        </div>
        <div style={{ fontSize: '12px', color: '#6B6B73' }}>
          Cố định theo thiết kế hệ thống — RBAC kiểm tra ở backend.
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '13px',
          }}
        >
          <thead>
            <tr style={{ background: '#FAFAF8' }}>
              <th
                style={{
                  textAlign: 'left',
                  padding: '12px 24px',
                  fontWeight: 500,
                  color: '#6B6B73',
                  borderBottom: '1px solid #ECEAE5',
                  minWidth: '220px',
                }}
              >
                Nhóm quyền
              </th>
              {ROLE_HEADERS.map(({ key, label, color }) => (
                <th
                  key={key}
                  style={{
                    textAlign: 'center',
                    padding: '12px 20px',
                    fontWeight: 600,
                    color,
                    borderBottom: '1px solid #ECEAE5',
                    minWidth: '80px',
                  }}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MATRIX.map((row, idx) => (
              <tr
                key={row.group}
                style={{
                  background: idx % 2 === 0 ? '#FFFFFF' : '#FAFAF8',
                  borderBottom: '1px solid #ECEAE5',
                }}
              >
                <td
                  style={{
                    padding: '11px 24px',
                    color: '#16161A',
                    fontWeight: 400,
                  }}
                >
                  {row.group}
                </td>
                {ROLE_HEADERS.map(({ key }) => (
                  <td
                    key={key}
                    style={{
                      textAlign: 'center',
                      padding: '11px 20px',
                      color: row[key] === '✓' ? '#5C7A3E' : '#B8B8BE',
                      fontWeight: row[key] === '✓' ? 600 : 400,
                    }}
                  >
                    {row[key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);
