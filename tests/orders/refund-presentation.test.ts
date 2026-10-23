import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getPaymentStatusPresentation,
  isAwaitingRefund,
} from '@/lib/orders/presentation';

test('only a cancelled order with a paid payment awaits a refund', () => {
  assert.equal(isAwaitingRefund('CANCELLED', 'PAID'), true);
  assert.equal(isAwaitingRefund('CANCELLED', 'REFUNDED'), false);
  assert.equal(isAwaitingRefund('CONFIRMED', 'PAID'), false);
  assert.equal(isAwaitingRefund('CANCELLED', 'FAILED'), false);
});

test('customers see refund pending, then refunded', () => {
  assert.equal(getPaymentStatusPresentation('PAID', 'MOMO', 'CANCELLED').label, 'Refund pending');
  assert.equal(getPaymentStatusPresentation('REFUNDED', 'MOMO', 'CANCELLED').label, 'Refunded');
  assert.equal(getPaymentStatusPresentation('PAID', 'MOMO', 'CONFIRMED').label, 'Paid');
});
