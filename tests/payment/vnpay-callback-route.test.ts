import test from 'node:test';
import assert from 'node:assert/strict';
import { handleVNPayCallbackRequest, type VNPayCallbackDeps } from '@/app/api/payment/vnpay/callback/route';
import type { PaymentCallbackAuditPayload } from '@/lib/order-audit';
import type { VNPayVerifyResult } from '@/lib/payment/vnpay';

function createDeps() {
  const logs: Array<{ event: string; payload: Record<string, unknown> }> = [];
  const transitions: Array<{
    orderId: string;
    paymentStatus: string;
    transactionId: string | null;
  }> = [];
  const notificationEvents: Array<Record<string, unknown>> = [];
  const callbackAuditEvents: PaymentCallbackAuditPayload[] = [];

  const deps: VNPayCallbackDeps = {
    verifyCallback: (params: Record<string, unknown>): VNPayVerifyResult => ({
      isValid: true,
      orderId: String(params.vnp_TxnRef || 'order-1'),
      amount: Number(params.vnp_Amount || 20000000) / 100,
      transactionId: String(params.vnp_TransactionNo || 'vnp-tx-1'),
      responseCode: String(params.vnp_ResponseCode || '00'),
      transactionStatus: String(params.vnp_TransactionStatus || '00'),
      isSuccess: params.vnp_ResponseCode === '00',
    }),
    findPaymentByOrderId: async () => ({
      orderId: 'order-1',
      status: 'PENDING',
      transactionId: null,
      amount: 200000,
      userId: 'user-1',
      customerEmail: 'lan@example.com',
      userEmail: 'user@example.com',
      orderNumber: 'BK260405ABCD',
    }),
    applyPaymentTransition: async (args) => {
      transitions.push(args);
      return { applied: true, conflict: false };
    },
    dispatchNotificationEvent: async (event) => {
      notificationEvents.push(event);
    },
    logEvent: (event, payload) => {
      logs.push({ event, payload });
    },
    writeCallbackAuditLog: async (payload) => {
      callbackAuditEvents.push(payload);
    },
  };

  return { deps, logs, transitions, notificationEvents, callbackAuditEvents };
}

test('VNPay callback rejects empty payload', async () => {
  const { deps, callbackAuditEvents } = createDeps();
  const result = await handleVNPayCallbackRequest({}, deps);

  assert.equal(result.status, 400);
  assert.equal(result.body.RspCode, '99');
  assert.equal(callbackAuditEvents[0]?.event, 'invalid_payload');
});

test('VNPay callback returns provider-compatible invalid Checksum response', async () => {
  const { deps, callbackAuditEvents } = createDeps();
  deps.verifyCallback = () => ({
    isValid: false,
    orderId: 'order-1',
    amount: 200000,
    transactionId: null,
    responseCode: '97',
    transactionStatus: '97',
    isSuccess: false,
  });

  const result = await handleVNPayCallbackRequest(
    { vnp_TxnRef: 'order-1', vnp_SecureHash: 'invalid' },
    deps,
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.RspCode, '97');
  assert.equal(callbackAuditEvents[0]?.event, 'verification_failed');
});

test('VNPay callback returns order not found when payment is missing', async () => {
  const { deps } = createDeps();
  deps.findPaymentByOrderId = async () => null;

  const query = {
    vnp_TxnRef: 'order-1',
    vnp_Amount: '20000000',
    vnp_ResponseCode: '00',
    vnp_TransactionNo: 'vnp-tx-1',
    vnp_SecureHash: 'ok',
  };
  const result = await handleVNPayCallbackRequest(query, deps);

  assert.equal(result.status, 200);
  assert.equal(result.body.RspCode, '01');
  assert.equal(result.body.Message, 'Không tìm thấy đơn hàng');
});

test('VNPay callback applies PAID transition on success status (00)', async () => {
  const { deps, transitions, notificationEvents } = createDeps();
  const query = {
    vnp_TxnRef: 'order-1',
    vnp_Amount: '20000000',
    vnp_ResponseCode: '00',
    vnp_TransactionStatus: '00',
    vnp_TransactionNo: 'vnp-tx-1',
    vnp_SecureHash: 'ok',
  };

  const result = await handleVNPayCallbackRequest(query, deps);

  assert.equal(result.status, 200);
  assert.equal(result.body.RspCode, '00');
  assert.equal(result.body.Message, 'Confirm Success');
  assert.deepEqual(transitions[0], {
    orderId: 'order-1',
    paymentStatus: 'PAID',
    transactionId: 'vnp-tx-1',
  });
  assert.equal(notificationEvents.length, 1);
  assert.equal(notificationEvents[0].eventType, 'ORDER_STATUS_CHANGED');
  assert.equal(notificationEvents[0].entityId, 'order-1');
});

test('VNPay callback applies FAILED transition on failure status', async () => {
  const { deps, transitions } = createDeps();
  const query = {
    vnp_TxnRef: 'order-1',
    vnp_Amount: '20000000',
    vnp_ResponseCode: '24', // Customer cancelled
    vnp_TransactionStatus: '02',
    vnp_TransactionNo: 'vnp-tx-failed',
    vnp_SecureHash: 'ok',
  };

  const result = await handleVNPayCallbackRequest(query, deps);

  assert.equal(result.status, 200);
  assert.equal(result.body.RspCode, '00');
  assert.deepEqual(transitions[0], {
    orderId: 'order-1',
    paymentStatus: 'FAILED',
    transactionId: 'vnp-tx-failed',
  });
});

test('VNPay callback logs conflict and avoids mutation on conflicting duplicate', async () => {
  const { deps, logs, transitions } = createDeps();
  deps.findPaymentByOrderId = async () => ({
    orderId: 'order-1',
    status: 'PAID',
    transactionId: 'vnp-tx-1',
    amount: 200000,
    userId: 'user-1',
    customerEmail: 'lan@example.com',
    userEmail: 'user@example.com',
    orderNumber: 'BK260405ABCD',
  });

  const query = {
    vnp_TxnRef: 'order-1',
    vnp_Amount: '20000000',
    vnp_ResponseCode: '24',
    vnp_TransactionNo: 'vnp-tx-2',
    vnp_SecureHash: 'ok',
  };

  const result = await handleVNPayCallbackRequest(query, deps);

  assert.equal(result.status, 200);
  assert.equal(result.body.RspCode, '02');
  assert.equal(result.body.Message, 'Order already confirmed');
  assert.equal(transitions.length, 0);
  assert.equal(
    logs.some((entry) => entry.event === 'payment.callback.conflict'),
    true,
  );
});

test('VNPay callback treats atomic-transition miss as replay and skips notification dispatch', async () => {
  const { deps, logs, notificationEvents } = createDeps();
  deps.applyPaymentTransition = async () => ({ applied: false, conflict: false });
  const query = {
    vnp_TxnRef: 'order-1',
    vnp_Amount: '20000000',
    vnp_ResponseCode: '00',
    vnp_TransactionNo: 'vnp-tx-1',
    vnp_SecureHash: 'ok',
  };

  const result = await handleVNPayCallbackRequest(query, deps);

  assert.equal(result.status, 200);
  assert.equal(result.body.RspCode, '02');
  assert.equal(notificationEvents.length, 0);
  assert.equal(
    logs.some((entry) => entry.event === 'payment.callback.replay_ignored'),
    true,
  );
});

test('VNPay callback rejects amount mismatch before applying transition', async () => {
  const { deps, transitions, logs, callbackAuditEvents } = createDeps();
  const query = {
    vnp_TxnRef: 'order-1',
    vnp_Amount: '19900000', // 199,000 instead of 200,000
    vnp_ResponseCode: '00',
    vnp_TransactionNo: 'vnp-tx-1',
    vnp_SecureHash: 'ok',
  };

  const result = await handleVNPayCallbackRequest(query, deps);

  assert.equal(result.status, 400);
  assert.equal(result.body.RspCode, '04');
  assert.equal(result.body.Message, 'Invalid amount');
  assert.equal(transitions.length, 0);
  assert.equal(
    logs.some((entry) => entry.event === 'payment.callback.verification_failed'),
    true,
  );
  assert.equal(callbackAuditEvents.at(-1)?.reason, 'amount_mismatch');
});
