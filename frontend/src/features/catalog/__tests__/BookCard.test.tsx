import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BookCard } from '../../../shared/ui/BookCard';
import type { BookCard as BookCardDTO } from '../types';

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

const renderCard = (props?: Partial<BookCardDTO>, rank?: number) =>
  render(
    <MemoryRouter>
      <BookCard book={{ ...baseBook, ...props }} rank={rank} />
    </MemoryRouter>,
  );

describe('BookCard', () => {
  it('renders title', () => {
    renderCard();
    expect(screen.getAllByText('Đắc Nhân Tâm').length).toBeGreaterThan(0);
  });

  it('renders author', () => {
    renderCard();
    expect(screen.getAllByText('Dale Carnegie').length).toBeGreaterThan(0);
  });

  it('renders price formatted as VND', () => {
    renderCard();
    expect(screen.getByText('89.000đ')).toBeInTheDocument();
  });

  it('renders original price when hasDiscount', () => {
    renderCard();
    expect(screen.getByText('120.000đ')).toBeInTheDocument();
  });

  it('renders discount badge when originalPrice > price', () => {
    renderCard();
    expect(screen.getByText('-26%')).toBeInTheDocument();
  });

  it('does NOT render discount badge when originalPrice is null', () => {
    renderCard({ originalPrice: null, discountPercent: null });
    expect(screen.queryByText(/-\d+%/)).not.toBeInTheDocument();
  });

  it('links to /books/:slug', () => {
    renderCard();
    const link = screen.getByRole('link', { name: /Đắc Nhân Tâm/i });
    expect(link).toHaveAttribute('href', '/books/dac-nhan-tam');
  });

  it('renders rating count', () => {
    renderCard();
    expect(screen.getByText(/1\.248/)).toBeInTheDocument();
  });

  it('renders file format and size', () => {
    renderCard();
    expect(screen.getByText(/PDF · \d+(\.\d+)? MB/)).toBeInTheDocument();
  });

  it('renders tag badge when tag is set', () => {
    renderCard();
    expect(screen.getByText('Mới')).toBeInTheDocument();
  });

  it('does NOT render rank badge when rank is undefined', () => {
    renderCard();
    // rank badge contains "No." — not present if rank not passed
    expect(screen.queryByText(/^No\./)).not.toBeInTheDocument();
  });

  it('renders rank badge when rank is provided', () => {
    renderCard({}, 3);
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
