import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampCartQuantityWithDelta,
  buildCartItemIdentityKey,
  mergeCartItems,
  normalizeCartItem,
  readPersistedCartState,
  writePersistedCartState,
  normalizeCheckoutInfo,
  getUserCartStorageKey,
  GUEST_CART_STORAGE_KEY,
} from '@/lib/cart-utils';

class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }
}

test('buildCartItemIdentityKey is deterministic for same product/variant/options', () => {
  const keyA = buildCartItemIdentityKey({
    productId: 'p1',
    variantId: 'v1',
    size: '6 inch',
    flavor: 'Chocolate',
    message: 'Happy Birthday',
    pickupDate: '2026-04-10',
  });
  const keyB = buildCartItemIdentityKey({
    productId: 'p1',
    variantId: 'v1',
    size: '6 inch',
    flavor: 'chocolate',
    message: 'Happy Birthday',
    pickupDate: '2026-04-10',
  });

  assert.equal(keyA, keyB);
});

test('mergeCartItems aggregates same deterministic identity and preserves distinct lines', () => {
  const merged = mergeCartItems(
    [
      {
        id: '',
        productId: 'p1',
        name: 'Cake',
        price: 100000,
        image: '/cake.jpg',
        type: 'cake',
        variantId: 'v1',
        quantity: 2,
      },
    ],
    [
      {
        id: '',
        productId: 'p1',
        name: 'Cake',
        price: 100000,
        image: '/cake.jpg',
        type: 'cake',
        variantId: 'v1',
        quantity: 3,
      },
      {
        id: '',
        productId: 'p1',
        name: 'Cake',
        price: 100000,
        image: '/cake.jpg',
        type: 'cake',
        variantId: 'v2',
        quantity: 1,
      },
    ],
  );

  assert.equal(merged.length, 2);
  const v1 = merged.find((item) => item.variantId === 'v1');
  const v2 = merged.find((item) => item.variantId === 'v2');
  assert.equal(v1?.quantity, 5);
  assert.equal(v2?.quantity, 1);
});

test('clampCartQuantityWithDelta enforces min 1 and max 100 boundaries', () => {
  assert.equal(clampCartQuantityWithDelta(1, -1), 1);
  assert.equal(clampCartQuantityWithDelta(99, 10), 100);
  assert.equal(clampCartQuantityWithDelta(10, 5), 15);
});

test('readPersistedCartState falls back safely on malformed payload', () => {
  const storage = new MemoryStorage();
  storage.setItem(GUEST_CART_STORAGE_KEY, '{not-json');

  const state = readPersistedCartState(storage, GUEST_CART_STORAGE_KEY);
  assert.deepEqual(state.cart, []);
  assert.equal(state.checkoutInfo, null);
});

test('writePersistedCartState and readPersistedCartState round-trip checkout + cart', () => {
  const storage = new MemoryStorage();
  const userStorageKey = getUserCartStorageKey('user-1');

  writePersistedCartState(storage, userStorageKey, {
    cart: [
      {
        id: '',
        productId: 'p2',
        name: 'Tart',
        price: 50000,
        image: '/tart.jpg',
        type: 'cake',
        quantity: 2,
      },
    ],
    checkoutInfo: normalizeCheckoutInfo({
      customerName: 'Hieu',
      customerPhone: '0909000111',
      customerEmail: 'hieu@example.com',
    }),
  });

  const state = readPersistedCartState(storage, userStorageKey);
  assert.equal(state.cart.length, 1);
  assert.equal(state.cart[0].id, buildCartItemIdentityKey({ productId: 'p2' }));
  assert.equal(state.cart[0].quantity, 2);
  assert.equal(state.checkoutInfo?.customerName, 'Hieu');
});

test('guest cart merge precedence keeps guest/session item quantities additive', () => {
  const userCart = [
    {
      id: '',
      productId: 'p3',
      name: 'Bread',
      price: 30000,
      image: '/bread.jpg',
      type: 'ingredient' as const,
      quantity: 1,
    },
  ];
  const guestCart = [
    {
      id: '',
      productId: 'p3',
      name: 'Bread',
      price: 30000,
      image: '/bread.jpg',
      type: 'ingredient' as const,
      quantity: 2,
    },
  ];

  const merged = mergeCartItems(userCart, guestCart);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].quantity, 3);
});

test('normalizeCartItem accepts missing image with placeholder fallback', () => {
  const item = normalizeCartItem({
    id: 'x',
    productId: 'p4',
    name: 'Cookie',
    price: 10000,
    type: 'ingredient',
    quantity: 1,
  });

  assert.ok(item);
  assert.equal(item?.image, '/images/placeholder.jpg');
});

test('normalizeCartItem accepts numeric/string-like source fields', () => {
  const item = normalizeCartItem({
    id: 'x',
    productId: 12345,
    name: 'Brownie',
    price: '25000',
    type: 'cake',
    quantity: 1,
    variantId: 99,
  });

  assert.ok(item);
  assert.equal(item?.productId, '12345');
  assert.equal(item?.price, 25000);
  assert.equal(item?.variantId, '99');
});
