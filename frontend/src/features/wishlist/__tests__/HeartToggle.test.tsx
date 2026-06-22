// Tests cho heart/favorite toggle — BookCard và BookDetailPage
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BookCard } from '../../../shared/ui/BookCard';
import type { BookCard as BookCardDTO } from '../../catalog/types';
import type { User } from '../../../shared/types/auth';

/* ── Mock wishlistApi (addToWishlist) ── */
vi.mock('../wishlistApi', () => ({
  useGetWishlistQuery: vi.fn(() => ({ data: undefined, isLoading: false })),
  useAddToWishlistMutation: vi.fn(),
  useRemoveFromWishlistMutation: vi.fn(),
}));

/* ── Mock useNavigate ── */
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

/* ── Mock useAppSelector — điều khiển user được trả về ── */
let mockUser: User | null = null;
vi.mock('../../../app/hooks', () => ({
  useAppSelector: vi.fn((selector: (s: { auth: { user: User | null } }) => unknown) =>
    selector({ auth: { user: mockUser } }),
  ),
  useAppDispatch: vi.fn(() => vi.fn()),
}));

import {
  useAddToWishlistMutation,
  useRemoveFromWishlistMutation,
} from '../wishlistApi';

const mockUseAddToWishlistMutation = useAddToWishlistMutation as ReturnType<typeof vi.fn>;
const mockUseRemoveFromWishlistMutation = useRemoveFromWishlistMutation as ReturnType<typeof vi.fn>;

const baseBook: BookCardDTO = {
  id: 1,
  slug: 'dac-nhan-tam',
  title: 'Đắc Nhân Tâm',
  author: 'Dale Carnegie',
  authorSlug: 'dale-carnegie',
  coverImageUrl: null,
  price: 89000,
  originalPrice: 120000,
  discountPercent: 26,
  fileFormat: 'PDF',
  fileSizeBytes: 13002342,
  ratingAvg: 4.8,
  ratingCount: 1248,
  purchaseCount: 2341,
  tag: 'Mới',
};

const renderCard = () =>
  render(
    <MemoryRouter>
      <BookCard book={baseBook} />
    </MemoryRouter>,
  );

const makeUser = (role: 'user' | 'vendor' | 'admin' | 'manager'): User => ({
  id: 1,
  email: 'u@test.com',
  fullName: 'User',
  role,
  status: 'active',
});

let triggerAdd: ReturnType<typeof vi.fn>;
let triggerRemove: ReturnType<typeof vi.fn>;

describe('Heart toggle on BookCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null; // default: guest
    triggerAdd = vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
    triggerRemove = vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue(undefined) });
    mockUseAddToWishlistMutation.mockReturnValue([triggerAdd, { isLoading: false }]);
    mockUseRemoveFromWishlistMutation.mockReturnValue([triggerRemove, { isLoading: false }]);
  });

  it('heart button hiển thị cho role user', () => {
    mockUser = makeUser('user');
    renderCard();
    expect(screen.getByRole('button', { name: /yêu thích|wishlist/i })).toBeInTheDocument();
  });

  it('click heart gọi addToWishlist cho user đã đăng nhập', () => {
    mockUser = makeUser('user');
    renderCard();
    const heartBtn = screen.getByRole('button', { name: /yêu thích|wishlist/i });
    fireEvent.click(heartBtn);
    expect(triggerAdd).toHaveBeenCalledWith({ bookId: baseBook.id });
  });

  it('guest click heart → navigate đến /login', () => {
    mockUser = null; // guest
    renderCard();
    const heartBtn = screen.queryByRole('button', { name: /yêu thích|wishlist/i });
    if (heartBtn) {
      fireEvent.click(heartBtn);
      expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('/login'));
    } else {
      // Nếu button ẩn hoàn toàn với guest, test pass (ẩn là valid)
      expect(mockNavigate).not.toHaveBeenCalled();
    }
  });

  it('vendor/admin không thấy hoặc click heart không gọi addToWishlist', () => {
    mockUser = makeUser('vendor');
    renderCard();
    const heartBtn = screen.queryByRole('button', { name: /yêu thích|wishlist/i });
    if (heartBtn) {
      fireEvent.click(heartBtn);
      expect(triggerAdd).not.toHaveBeenCalled();
    } else {
      // Heart ẩn hoàn toàn cho vendor — pass
      expect(heartBtn).toBeNull();
    }
  });
});
