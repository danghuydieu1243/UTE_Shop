// Reproduce: toast thông báo khi thêm/bỏ yêu thích trên BookCard (Home)
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BookCard } from '../../../shared/ui/BookCard';
import type { BookCard as BookCardDTO } from '../../catalog/types';
import type { User } from '../../../shared/types/auth';

vi.mock('../wishlistApi', () => ({
  useGetWishlistQuery: vi.fn(() => ({ data: undefined, isLoading: false })),
  useAddToWishlistMutation: vi.fn(),
  useRemoveFromWishlistMutation: vi.fn(),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => vi.fn() };
});

let mockUser: User | null = null;
vi.mock('../../../app/hooks', () => ({
  useAppSelector: vi.fn((selector: (s: { auth: { user: User | null } }) => unknown) =>
    selector({ auth: { user: mockUser } }),
  ),
  useAppDispatch: vi.fn(() => vi.fn()),
}));

import { useAddToWishlistMutation, useRemoveFromWishlistMutation } from '../wishlistApi';

const mockAdd = useAddToWishlistMutation as ReturnType<typeof vi.fn>;
const mockRemove = useRemoveFromWishlistMutation as ReturnType<typeof vi.fn>;

const book: BookCardDTO = {
  id: 1, slug: 'dac-nhan-tam', title: 'Đắc Nhân Tâm', author: 'Dale Carnegie',
  authorSlug: 'dale-carnegie', coverImageUrl: null, price: 89000, originalPrice: null,
  discountPercent: null, fileFormat: 'PDF', fileSizeBytes: 13002342, ratingAvg: 4.8,
  ratingCount: 1248, purchaseCount: 2341, tag: null,
};

const userRole: User = { id: 1, email: 'u@test.com', fullName: 'User', role: 'user', status: 'active' };

describe('BookCard wishlist toast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = userRole;
    mockAdd.mockReturnValue([vi.fn(() => ({ unwrap: () => Promise.resolve({}) })), { isLoading: false }]);
    mockRemove.mockReturnValue([vi.fn(() => ({ unwrap: () => Promise.resolve(undefined) })), { isLoading: false }]);
  });

  it('hiển thị toast khi thêm vào yêu thích', async () => {
    render(<MemoryRouter><BookCard book={book} isWishlisted={false} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /yêu thích/i }));
    await waitFor(() =>
      expect(screen.getByText('Đã thêm vào danh sách yêu thích')).toBeInTheDocument(),
    );
  });

  it('hiển thị toast khi bỏ yêu thích', async () => {
    render(<MemoryRouter><BookCard book={book} isWishlisted={true} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /bỏ yêu thích/i }));
    await waitFor(() =>
      expect(screen.getByText('Đã bỏ khỏi danh sách yêu thích')).toBeInTheDocument(),
    );
  });
});
