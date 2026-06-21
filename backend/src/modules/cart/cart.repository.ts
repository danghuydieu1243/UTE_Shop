import { Cart, CartItem, Book, Author } from '../../db/models';

// ── Kiểu DTO ─────────────────────────────────────────────────────────────────

export interface BookCardMini {
  id: number;
  slug: string | null;
  title: string;
  author: string | null;
  coverImageUrl: string | null;
  price: number;
  fileFormat: string;
}

export interface CartItemDTO {
  id: number;
  book: BookCardMini;
  unitPrice: number;
  addedAt: Date;
}

export interface CartDTO {
  items: CartItemDTO[];
  subtotal: number;
  itemCount: number;
  currency: 'VND';
}

// ── Includes dùng chung ───────────────────────────────────────────────────────

const cartItemIncludes = [
  {
    model: Book,
    as: 'book',
    attributes: ['id', 'slug', 'title', 'coverImageUrl', 'price', 'fileFormat'],
    include: [{ model: Author, as: 'author', attributes: ['id', 'name'] }],
  },
];

// ── Lazy-create cart ─────────────────────────────────────────────────────────

export async function findOrCreateCart(userId: number): Promise<Cart> {
  const [cart] = await Cart.findOrCreate({
    where: { userId },
    defaults: { userId },
  });
  return cart;
}

// ── Lấy cart kèm items ───────────────────────────────────────────────────────

export async function getCartWithItems(userId: number): Promise<CartDTO> {
  const cart = await findOrCreateCart(userId);

  const items = await CartItem.findAll({
    where: { cartId: cart.id },
    include: cartItemIncludes,
    order: [['added_at', 'ASC']],
  });

  return toCartDTO(items);
}

export function toCartDTO(items: CartItem[]): CartDTO {
  const dtoItems: CartItemDTO[] = items.map((ci) => {
    const book = (ci as any).book as any;
    const author = book?.author as any;
    return {
      id: Number(ci.id),
      book: {
        id: Number(book?.id),
        slug: book?.slug ?? null,
        title: book?.title ?? '',
        author: author?.name ?? null,
        coverImageUrl: book?.coverImageUrl ?? null,
        price: Number(book?.price ?? 0),
        fileFormat: book?.fileFormat ?? '',
      },
      unitPrice: Number(ci.unitPrice),
      addedAt: ci.addedAt,
    };
  });

  const subtotal = dtoItems.reduce((sum, i) => sum + i.unitPrice, 0);

  return {
    items: dtoItems,
    subtotal,
    itemCount: dtoItems.length,
    currency: 'VND',
  };
}

// ── Tìm item trong giỏ ───────────────────────────────────────────────────────

export async function findCartItem(cartId: number, bookId: number): Promise<CartItem | null> {
  return CartItem.findOne({ where: { cartId, bookId } });
}

// ── Thêm item ────────────────────────────────────────────────────────────────

export async function addCartItem(
  cartId: number,
  bookId: number,
  unitPrice: number,
): Promise<CartItem> {
  return CartItem.create({ cartId, bookId, unitPrice });
}

// ── Xóa item ─────────────────────────────────────────────────────────────────

export async function removeCartItem(cartId: number, bookId: number): Promise<void> {
  await CartItem.destroy({ where: { cartId, bookId } });
}

// ── Xóa tất cả items ─────────────────────────────────────────────────────────

export async function clearCartItems(cartId: number): Promise<void> {
  await CartItem.destroy({ where: { cartId } });
}

// ── Lấy items kèm book (theo cartId) ─────────────────────────────────────────

export async function getItemsByCartId(cartId: number): Promise<CartItem[]> {
  return CartItem.findAll({
    where: { cartId },
    include: cartItemIncludes,
    order: [['added_at', 'ASC']],
  });
}
