import test from 'node:test';
import assert from 'node:assert/strict';
import { hasOrderSummary } from '@/lib/order-summary';

test('the header cart opens the order summary on storefront pages', () => {
  for (const path of ['/', '/products/tra-dao-cam-sa', '/store', '/profile']) {
    assert.equal(hasOrderSummary(path), true, path);
  }
});

test('the header cart links to /cart where the drawer is not mounted', () => {
  for (const path of ['/cart', '/checkout/info', '/checkout/payment', '/admin/products']) {
    assert.equal(hasOrderSummary(path), false, path);
  }
});
