import { Book, Entitlement } from '../../db/models';
import { AppError } from '../../shared/errors/AppError';
import * as cartCache from '../../shared/cache/cartCache';
import * as repo from './cart.repository';
import { CartDTO } from './cart.repository';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function buildAndCacheCart(userId: number, cartId: number): Promise<CartDTO> {
  const items = await repo.getItemsByCartId(cartId);
  const dto = repo.toCartDTO(items);
  await cartCache.setCart(userId, dto);
  return dto;
}

// ── getCart ───────────────────────────────────────────────────────────────────

export async function getCart(userId: number): Promise<CartDTO> {
  // Thử đọc cache trước
  const cached = await cartCache.getCart(userId);
  if (cached) return cached as CartDTO;

  return repo.getCartWithItems(userId);
}

// ── addItem ───────────────────────────────────────────────────────────────────

export async function addItem(userId: number, bookId: number): Promise<CartDTO> {
  // Kiểm sách tồn tại
  const book = await Book.findByPk(bookId);
  if (!book) throw AppError.from('BOOK_NOT_FOUND', 'Không tìm thấy sách');

  // Kiểm sách phải published
  if (book.status !== 'published') {
    throw AppError.from('BOOK_NOT_PUBLISHED', 'Sách chưa được xuất bản');
  }

  // Kiểm đã có entitlement chưa
  const entitlement = await Entitlement.findOne({ where: { userId, bookId } });
  if (entitlement) throw AppError.from('ALREADY_OWNED', 'Bạn đã sở hữu sách này');

  // Lazy-create cart
  const cart = await repo.findOrCreateCart(userId);

  // Kiểm đã có trong giỏ chưa (idempotent)
  const existing = await repo.findCartItem(Number(cart.id), bookId);
  if (existing) {
    // Trả giỏ hiện tại, không nhân đôi
    return buildAndCacheCart(userId, Number(cart.id));
  }

  // Thêm item
  await repo.addCartItem(Number(cart.id), bookId, Number(book.price));

  // Invalidate cache, rebuild
  await cartCache.delCart(userId);
  return buildAndCacheCart(userId, Number(cart.id));
}

// ── removeItem ────────────────────────────────────────────────────────────────

export async function removeItem(userId: number, bookId: number): Promise<CartDTO> {
  const cart = await repo.findOrCreateCart(userId);
  await repo.removeCartItem(Number(cart.id), bookId);

  await cartCache.delCart(userId);
  return buildAndCacheCart(userId, Number(cart.id));
}

// ── clearCart ─────────────────────────────────────────────────────────────────

export async function clearCart(userId: number): Promise<CartDTO> {
  const cart = await repo.findOrCreateCart(userId);
  await repo.clearCartItems(Number(cart.id));

  await cartCache.delCart(userId);
  // Giỏ rỗng
  const dto: CartDTO = { items: [], subtotal: 0, itemCount: 0, currency: 'VND' };
  await cartCache.setCart(userId, dto);
  return dto;
}
