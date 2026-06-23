/**
 * AdminOrdersPage tests
 *
 * Coverage:
 *  1. Page renders order table from mocked getAdminOrders (code + status + paymentStatus + buyer).
 *  2. transformResponse reads the ARRAY + meta shape correctly (contract lock — khớp BE DTO).
 *  3. Status tab change updates query arg.
 *  4. Date-range filter updates query args.
 *  5. Clicking an order code opens the detail modal (getAdminOrderDetail).
 *  6. Detail modal shows items + payment status; NO provider_txn_id; NO cancel/edit button.
 *  7. Search updates query arg.
 *
 * Mock data shapes MUST mirror BE AdminOrderSummaryDTO / AdminOrderDetailDTO exactly
 * (vendorShops: string[]; detail.payment; items không có qty) — bài học broad-review P4.
 */

import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { baseApi } from '../../../shared/api/baseApi';
import authReducer from '../../../shared/auth/authSlice';
import type { EnvelopeMeta } from '../../../shared/api/baseApi';

// ── Mock RTK Query hooks ──────────────────────────────────────────────────────
const mockGetAdminOrders = vi.fn();
const mockGetAdminOrderDetail = vi.fn();

vi.mock('../adminApi', async () => {
  const actual = await vi.importActual<typeof import('../adminApi')>('../adminApi');
  return {
    ...actual,
    useGetAdminOrdersQuery: (...args: unknown[]) => mockGetAdminOrders(...args),
    useGetAdminOrderDetailQuery: (...args: unknown[]) => mockGetAdminOrderDetail(...args),
  };
});

// ── Sample data — khớp BE AdminOrderSummaryDTO (vendorShops là MẢNG) ────────────
const MOCK_ORDERS = [
  {
    code: 'ORD-001',
    status: 'NEW',
    buyerName: 'Nguyễn Văn An',
    buyerEmail: 'an@example.com',
    vendorShops: ['Bookstore Alpha'],
    itemsBrief: 'Clean Code',
    total: 89000,
    currency: 'VND',
    paymentStatus: 'PENDING',
    createdAt: '2024-06-01T08:00:00.000Z',
  },
  {
    code: 'ORD-002',
    status: 'COMPLETED',
    buyerName: 'Trần Thị Bình',
    buyerEmail: 'binh@example.com',
    vendorShops: ['Reading Corner', 'Novel Haven'],
    itemsBrief: 'The Pragmatic Programmer +1 more',
    total: 120000,
    currency: 'VND',
    paymentStatus: 'PAID',
    createdAt: '2024-06-02T10:00:00.000Z',
  },
  {
    code: 'ORD-003',
    status: 'CANCELLED',
    buyerName: 'Lê Minh Cường',
    buyerEmail: 'cuong@example.com',
    vendorShops: [],
    itemsBrief: 'Design Patterns',
    total: 75000,
    currency: 'VND',
    paymentStatus: null,
    createdAt: '2024-06-03T12:00:00.000Z',
  },
];

// ── Detail — khớp BE AdminOrderDetailDTO (payment, không có qty/buyer) ───────────
const MOCK_ORDER_DETAIL = {
  code: 'ORD-001',
  status: 'NEW',
  subtotal: 89000,
  total: 89000,
  currency: 'VND',
  items: [
    {
      bookId: 10,
      titleSnapshot: 'Clean Code',
      unitPrice: 89000,
    },
  ],
  payment: {
    status: 'PENDING',
    amount: 89000,
    expiresAt: '2024-06-01T09:00:00.000Z',
  },
  createdAt: '2024-06-01T08:00:00.000Z',
  completedAt: null,
  cancelledAt: null,
};

const MOCK_PAGINATION = { page: 1, limit: 20, total: 3, totalPages: 1 };

// ── Store factory ─────────────────────────────────────────────────────────────
const makeStore = () =>
  configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer, auth: authReducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });

// ── Render helper ─────────────────────────────────────────────────────────────
const renderPage = async () => {
  const { AdminOrdersPage } = await import('../pages/AdminOrdersPage');
  return render(
    <Provider store={makeStore()}>
      <MemoryRouter>
        <AdminOrdersPage />
      </MemoryRouter>
    </Provider>,
  );
};

// ── Default mock setup ────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockGetAdminOrders.mockReturnValue({
    data: { orders: MOCK_ORDERS, pagination: MOCK_PAGINATION },
    isFetching: false,
    isLoading: false,
  });
  mockGetAdminOrderDetail.mockReturnValue({
    data: MOCK_ORDER_DETAIL,
    isFetching: false,
    isLoading: false,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Renders table with order rows
// ─────────────────────────────────────────────────────────────────────────────
describe('AdminOrdersPage — render', () => {
  it('renders page heading "Quản lý Đơn hàng"', async () => {
    await renderPage();
    expect(screen.getByText('Quản lý Đơn hàng')).toBeInTheDocument();
  });

  it('renders order code for each order', async () => {
    await renderPage();
    expect(screen.getByText('ORD-001')).toBeInTheDocument();
    expect(screen.getByText('ORD-002')).toBeInTheDocument();
    expect(screen.getByText('ORD-003')).toBeInTheDocument();
  });

  it('renders status badge for each order', async () => {
    await renderPage();
    // Nhãn tab trùng nhãn badge → scope vào bảng để chỉ lấy badge trong hàng
    const table = screen.getByRole('table');
    expect(within(table).getByText('Mới')).toBeInTheDocument();
    expect(within(table).getByText('Hoàn thành')).toBeInTheDocument();
    expect(within(table).getByText('Đã hủy')).toBeInTheDocument();
  });

  it('renders paymentStatus badge (null hiển thị —)', async () => {
    await renderPage();
    // PENDING → "Chờ TT", PAID → "Đã TT"; ORD-003 paymentStatus=null → không có badge "Hết hạn"
    expect(screen.getByText('Chờ TT')).toBeInTheDocument();
    expect(screen.getByText('Đã TT')).toBeInTheDocument();
    expect(screen.queryByText('Hết hạn')).not.toBeInTheDocument();
  });

  it('renders vendorShops as joined string (mảng → "a, b")', async () => {
    await renderPage();
    // ORD-002 có 2 shop → join bằng ", "
    expect(screen.getByText('Reading Corner, Novel Haven')).toBeInTheDocument();
  });

  it('renders buyerEmail for each order', async () => {
    await renderPage();
    expect(screen.getByText('an@example.com')).toBeInTheDocument();
    expect(screen.getByText('binh@example.com')).toBeInTheDocument();
    expect(screen.getByText('cuong@example.com')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. transformResponse contract lock — reads ARRAY + meta shape (khớp BE DTO)
// ─────────────────────────────────────────────────────────────────────────────
describe('adminApi.getAdminOrders transformResponse — contract lock', () => {
  it('reads the array from envelope data and meta.pagination correctly', async () => {
    const { transformAdminOrdersResponse } = await import('../adminApi');

    const envelopeData = MOCK_ORDERS;
    const envelopeMeta: EnvelopeMeta = { pagination: MOCK_PAGINATION };

    const result = transformAdminOrdersResponse(envelopeData as never, envelopeMeta);

    expect(Array.isArray(result.orders)).toBe(true);
    expect(result.orders).toHaveLength(3);
    expect(result.orders[0].code).toBe('ORD-001');
    expect(result.orders[0].status).toBe('NEW');
    // Contract lock: vendorShops PHẢI là mảng (BE DTO) — nếu BE đổi thành string sẽ vỡ ở đây
    expect(Array.isArray(result.orders[0].vendorShops)).toBe(true);
    expect(result.pagination.total).toBe(3);
    expect(result.pagination.totalPages).toBe(1);
  });

  it('handles non-array data gracefully (returns empty orders)', async () => {
    const { transformAdminOrdersResponse } = await import('../adminApi');
    const result = transformAdminOrdersResponse(null as never, undefined);
    expect(result.orders).toEqual([]);
    expect(result.pagination.total).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Status tab switching updates query arg
// ─────────────────────────────────────────────────────────────────────────────
describe('AdminOrdersPage — status tabs', () => {
  it('clicking "Mới" tab calls getAdminOrders with status=NEW', async () => {
    await renderPage();
    const newTab = screen.getByRole('button', { name: /^Mới/i });
    fireEvent.click(newTab);
    await waitFor(() => {
      expect(mockGetAdminOrders).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'NEW' }),
      );
    });
  });

  it('clicking "Hoàn thành" tab calls getAdminOrders with status=COMPLETED', async () => {
    await renderPage();
    const completedTab = screen.getByRole('button', { name: /^Hoàn thành/i });
    fireEvent.click(completedTab);
    await waitFor(() => {
      expect(mockGetAdminOrders).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'COMPLETED' }),
      );
    });
  });

  it('clicking "Đã hủy" tab calls getAdminOrders with status=CANCELLED', async () => {
    await renderPage();
    const cancelledTab = screen.getByRole('button', { name: /^Đã hủy/i });
    fireEvent.click(cancelledTab);
    await waitFor(() => {
      expect(mockGetAdminOrders).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'CANCELLED' }),
      );
    });
  });

  it('clicking "Tất cả" tab calls getAdminOrders without status param', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^Mới/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Tất cả/i }));
    await waitFor(() => {
      const lastCall = mockGetAdminOrders.mock.calls[mockGetAdminOrders.mock.calls.length - 1][0];
      expect(lastCall.status).toBeUndefined();
    });
  });

  it('does NOT send a paymentStatus param (BE không hỗ trợ filter này)', async () => {
    await renderPage();
    const lastCall = mockGetAdminOrders.mock.calls[mockGetAdminOrders.mock.calls.length - 1][0];
    expect(lastCall).not.toHaveProperty('paymentStatus');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Date-range filter updates query args
// ─────────────────────────────────────────────────────────────────────────────
describe('AdminOrdersPage — date filter', () => {
  it('setting "Từ ngày" calls getAdminOrders with from param', async () => {
    await renderPage();
    const fromInput = screen.getByLabelText('Từ ngày');
    fireEvent.change(fromInput, { target: { value: '2024-06-01' } });
    await waitFor(() => {
      expect(mockGetAdminOrders).toHaveBeenCalledWith(
        expect.objectContaining({ from: '2024-06-01' }),
      );
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5 & 6. Clicking order code opens detail modal; modal shows items + payment
//        NO provider_txn_id; NO cancel/edit button
// ─────────────────────────────────────────────────────────────────────────────
describe('AdminOrdersPage — detail modal', () => {
  it('clicking an order code opens the detail modal', async () => {
    const user = userEvent.setup();
    await renderPage();

    const codeLink = screen.getByRole('button', { name: 'ORD-001' });
    await user.click(codeLink);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('detail modal shows order items (titleSnapshot)', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByRole('button', { name: 'ORD-001' }));

    // 'Clean Code' cũng là itemsBrief ở list → scope vào dialog (hàng item trong modal)
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => {
      expect(within(dialog).getByText('Clean Code')).toBeInTheDocument();
    });
  });

  it('detail modal shows payment status', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByRole('button', { name: 'ORD-001' }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    expect(screen.getByTestId('payment-intent-status')).toBeInTheDocument();
  });

  it('detail modal does NOT render provider_txn_id text', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByRole('button', { name: 'ORD-001' }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    expect(screen.queryByText(/provider_txn_id/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/provider.*txn/i)).not.toBeInTheDocument();
  });

  it('detail modal does NOT have a cancel or edit button', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByRole('button', { name: 'ORD-001' }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const dialog = screen.getByRole('dialog');
    const buttons = dialog.querySelectorAll('button');
    const buttonTexts = Array.from(buttons).map((b) => b.textContent ?? '');
    expect(buttonTexts.some((t) => /hủy đơn/i.test(t))).toBe(false);
    expect(buttonTexts.some((t) => /chỉnh sửa/i.test(t))).toBe(false);
  });

  it('modal can be closed', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByRole('button', { name: 'ORD-001' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /đóng|close|×/i });
    await user.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Search updates query arg
// ─────────────────────────────────────────────────────────────────────────────
describe('AdminOrdersPage — search', () => {
  it('search input updates query with search param', async () => {
    const user = userEvent.setup({ delay: null });
    await renderPage();
    const searchInput = screen.getByLabelText('Tìm kiếm đơn hàng');
    await user.type(searchInput, 'ORD-001');
    await waitFor(() => {
      expect(mockGetAdminOrders).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'ORD-001' }),
      );
    });
  });
});
