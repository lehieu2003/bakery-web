import test from 'node:test';
import assert from 'node:assert/strict';
import { handleZaloPayCallbackRequest } from '@/app/api/payment/zalopay/callback/route';

type PaymentSnapshot = {
  orderId: string;
  status: string;
  transactionId: string | null;
};

type TestDeps = {
  verifyCallback: (dataStr: string, mac: string) => boolean;
  findPaymentByOrderId: (orderId: string) => Promise<PaymentSnapshot | null>;
  applyPaymentTransition: (args: {
    orderId: string;
    paymentStatus: string;
    transactionId: string | null;
  }) => Promise<void>;
  logEvent: (event: string, payload: Record<string, unknown>) => void;
};

function createDeps() {
  const logs: Array<{ event: string; payload: Record<string, unknown> }> = [];
  const transitions: Array<{
    orderId: string;
    paymentStatus: string;
    transactionId: string | null;
  }> = [];

  const deps: TestDeps = {
    verifyCallback: () => true,
    findPaymentByOrderId: async () => ({
      orderId: 'order-1',
      status: 'PENDING',
      transactionId: null,
    }),
    applyPaymentTransition: async (args) => {
      transitions.push(args);
    },
    logEvent: (event, payload) => {
      logs.push({ event, payload });
    },
  };

  return { deps, logs, transitions };
}

test('ZaloPay callback rejects missing data/mac payload', async () => {
  const { deps } = createDeps();
  const result = await handleZaloPayCallbackRequest({}, deps);

  assert.equal(result.status, 400);
  assert.equal(result.body.return_code, 0);
});

test('ZaloPay callback returns provider-compatible invalid MAC response', async () => {
  const { deps } = createDeps();
  deps.verifyCallback = () => false;

  const result = await handleZaloPayCallbackRequest(
    { data: '{}', mac: 'invalid' },
    deps,
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.return_code, -1);
});

test('ZaloPay callback rejects malformed data json', async () => {
  const { deps } = createDeps();

  const result = await handleZaloPayCallbackRequest(
    { data: '{', mac: 'ok' },
    deps,
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.return_code, 0);
});

test('ZaloPay callback returns already processed when payment is missing', async () => {
  const { deps } = createDeps();
  deps.findPaymentByOrderId = async () => null;

  const data = JSON.stringify({ app_trans_id: '260405_order-1', status: 1 });
  const result = await handleZaloPayCallbackRequest({ data, mac: 'ok' }, deps);

  assert.equal(result.status, 200);
  assert.equal(result.body.return_message, 'already processed');
});

test('ZaloPay callback applies PAID transition on success status', async () => {
  const { deps, transitions } = createDeps();
  const data = JSON.stringify({
    app_trans_id: '260405_order-1',
    status: 1,
    zp_trans_id: 'zp-tx-1',
  });

  const result = await handleZaloPayCallbackRequest({ data, mac: 'ok' }, deps);

  assert.equal(result.status, 200);
  assert.equal(result.body.return_message, 'success');
  assert.deepEqual(transitions[0], {
    orderId: 'order-1',
    paymentStatus: 'PAID',
    transactionId: 'zp-tx-1',
  });
});

test('ZaloPay callback applies FAILED transition on explicit failed status', async () => {
  const { deps, transitions } = createDeps();
  const data = JSON.stringify({
    app_trans_id: '260405_order-1',
    status: -1,
    zp_trans_id: 'zp-tx-failed',
  });

  const result = await handleZaloPayCallbackRequest({ data, mac: 'ok' }, deps);

  assert.equal(result.status, 200);
  assert.equal(result.body.return_message, 'success');
  assert.deepEqual(transitions[0], {
    orderId: 'order-1',
    paymentStatus: 'FAILED',
    transactionId: 'zp-tx-failed',
  });
});

test('ZaloPay callback rejects payload when status cannot be resolved', async () => {
  const { deps, transitions, logs } = createDeps();
  const data = JSON.stringify({
    app_trans_id: '260405_order-1',
    status: 'abc',
  });

  const result = await handleZaloPayCallbackRequest({ data, mac: 'ok' }, deps);

  assert.equal(result.status, 400);
  assert.equal(result.body.return_code, 0);
  assert.equal(transitions.length, 0);
  assert.equal(
    logs.some((entry) => entry.event === 'payment.callback.invalid_payload'),
    true,
  );
});
test('ZaloPay callback logs conflict and avoids mutation on conflicting duplicate', async () => {
  const { deps, logs, transitions } = createDeps();
  deps.findPaymentByOrderId = async () => ({
    orderId: 'order-1',
    status: 'PAID',
    transactionId: 'zp-tx-1',
  });

  const data = JSON.stringify({
    app_trans_id: '260405_order-1',
    status: -1,
    zp_trans_id: 'zp-tx-2',
  });

  const result = await handleZaloPayCallbackRequest({ data, mac: 'ok' }, deps);

  assert.equal(result.status, 200);
  assert.equal(result.body.return_message, 'already processed');
  assert.equal(transitions.length, 0);
  assert.equal(
    logs.some((entry) => entry.event === 'payment.callback.conflict'),
    true,
  );
});

