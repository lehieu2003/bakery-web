import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getConfirmationTitle,
  getOrderStatusPresentation,
  getPaymentStatusPresentation,
} from '@/lib/orders/presentation';

test('getOrderStatusPresentation maps known order statuses', () => {
  assert.deepEqual(getOrderStatusPresentation('PENDING'), {
    label: 'Pending',
    tone: 'warning',
  });
  assert.deepEqual(getOrderStatusPresentation('CONFIRMED'), {
    label: 'Confirmed',
    tone: 'success',
  });
  assert.deepEqual(getOrderStatusPresentation('CANCELLED'), {
    label: 'Cancelled',
    tone: 'danger',
  });
});

test('getPaymentStatusPresentation maps provider statuses and methods', () => {
  assert.deepEqual(getPaymentStatusPresentation('PAID', 'MOMO'), {
    label: 'Paid',
    tone: 'success',
  });
  assert.deepEqual(getPaymentStatusPresentation('FAILED', 'VNPAY'), {
    label: 'Payment failed',
    tone: 'danger',
  });
  assert.deepEqual(getPaymentStatusPresentation(null, 'COD'), {
    label: 'Pay on delivery',
    tone: 'neutral',
  });
});

test('unknown statuses fall back to neutral labels', () => {
  assert.deepEqual(getOrderStatusPresentation('UNKNOWN_STATUS'), {
    label: 'UNKNOWN_STATUS',
    tone: 'neutral',
  });
  assert.deepEqual(getPaymentStatusPresentation(undefined, null), {
    label: 'No payment record',
    tone: 'neutral',
  });
});

test('getConfirmationTitle respects auth and finalized payment/order signals', () => {
  assert.equal(
    getConfirmationTitle({
      isAuthenticated: false,
      orderStatusLabel: 'Confirmed',
      paymentStatusLabel: 'Paid',
    }),
    'Order Received',
  );

  assert.equal(
    getConfirmationTitle({
      isAuthenticated: true,
      orderStatusLabel: 'Confirmed',
      paymentStatusLabel: 'Payment pending',
    }),
    'Order Confirmed',
  );

  assert.equal(
    getConfirmationTitle({
      isAuthenticated: true,
      orderStatusLabel: 'Pending',
      paymentStatusLabel: 'Paid',
    }),
    'Order Confirmed',
  );

  assert.equal(
    getConfirmationTitle({
      isAuthenticated: true,
      orderStatusLabel: 'Pending',
      paymentStatusLabel: 'Payment pending',
    }),
    'Order Received',
  );
});
