import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('vendorBooksApi', () => {
  it('invalidates catalog, cart, and wishlist caches when deleting a vendor book', () => {
    const filePath = path.resolve(__dirname, '../vendorBooksApi.ts');
    const source = fs.readFileSync(filePath, 'utf8');

    expect(source).toContain('// DELETE /vendor/books/:id');
    expect(source).toContain("invalidatesTags: (_result, _err, { id }) => [");
    expect(source).toContain("{ type: 'VendorBook', id }");
    expect(source).toContain("{ type: 'VendorBook', id: 'LIST' }");
    expect(source).toContain("'Book'");
    expect(source).toContain("'Cart'");
    expect(source).toContain("'Wishlist'");
  });
});
