import test from 'node:test';
import assert from 'node:assert/strict';
import { handleMoMoCallbackRequest } from '@/app/api/payment/momo/callback/route';

type PaymentSnapshot = {
  orderId: string;
  status: string;
  transactionId: string | null;
};

type TestDeps = {
  verifyCallback: (params: Record<string, string>) => boolean;
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
  const orderFinalizations: Array<{ orderId: string; orderStatus: string }> = [];

  const deps: TestDeps = {
    verifyCallback: () => true,
    findPaymentByOrderId: async () => ({
      orderId: 'order-1',
      status: 'PENDING',
      transactionId: null,
    }),
    applyPaymentTransition: async (args) => {
      transitions.push(args);
      if (args.paymentStatus === 'PAID') {
        orderFinalizations.push({ orderId: args.orderId, orderStatus: 'CONFIRMED' });
      } else if (args.paymentStatus === 'FAILED') {
        orderFinalizations.push({ orderId: args.orderId, orderStatus: 'CANCELLED' });
      }
    },
    logEvent: (event, payload) => {
      logs.push({ event, payload });
    },
  };

  return { deps, logs, transitions, orderFinalizations };
}

test('MoMo callback rejects non-object payload', async () => {
  const { deps } = createDeps();
  const result = await handleMoMoCallbackRequest('invalid' as never, deps);

  assert.equal(result.status, 400);
  assert.equal(result.body.resultCode, 1);
});

test('MoMo callback rejects invalid signature', async () => {
  const { deps, logs } = createDeps();
  deps.verifyCallback = () => false;

  const result = await handleMoMoCallbackRequest(
    { orderId: 'order-1', resultCode: 0 },
    deps,
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.message, 'Invalid signature');
  assert.equal(logs[0]?.event, 'payment.callback.verification_failed');
});

test('MoMo callback returns already processed when payment is missing', async () => {
  const { deps } = createDeps();
  deps.findPaymentByOrderId = async () => null;

  const result = await handleMoMoCallbackRequest(
    { orderId: 'order-1', resultCode: 0 },
    deps,
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.message, 'already processed');
});

test('MoMo callback applies PAID transition for successful resultCode', async () => {
  const { deps, transitions, orderFinalizations } = createDeps();

  const result = await handleMoMoCallbackRequest(
    { orderId: 'order-1', resultCode: 0, transId: 'momo-tx-1' },
    deps,
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.message, 'OK');
  assert.equal(transitions.length, 1);
  assert.deepEqual(transitions[0], {
    orderId: 'order-1',
    paymentStatus: 'PAID',
    transactionId: 'momo-tx-1',
  });
  assert.deepEqual(orderFinalizations[0], {
    orderId: 'order-1',
    orderStatus: 'CONFIRMED',
  });
});

test('MoMo callback finalizes order as CANCELLED when payment fails', async () => {
  const { deps, transitions, orderFinalizations } = createDeps();

  const result = await handleMoMoCallbackRequest(
    { orderId: 'order-1', resultCode: 1006, transId: 'momo-tx-failed' },
    deps,
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.message, 'OK');
  assert.deepEqual(transitions[0], {
    orderId: 'order-1',
    paymentStatus: 'FAILED',
    transactionId: 'momo-tx-failed',
  });
  assert.deepEqual(orderFinalizations[0], {
    orderId: 'order-1',
    orderStatus: 'CANCELLED',
  });
});

test('MoMo callback ignores replay when payment already finalized with same outcome', async () => {
  const { deps, logs, transitions } = createDeps();
  deps.findPaymentByOrderId = async () => ({
    orderId: 'order-1',
    status: 'PAID',
    transactionId: 'momo-tx-1',
  });

  const result = await handleMoMoCallbackRequest(
    { orderId: 'order-1', resultCode: 0, transId: 'momo-tx-1' },
    deps,
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.message, 'already processed');
  assert.equal(transitions.length, 0);
  assert.equal(
    logs.some((entry) => entry.event === 'payment.callback.replay_ignored'),
    true,
  );
});

test('MoMo callback logs conflict and does not mutate finalized state on conflicting duplicate', async () => {
  const { deps, logs, transitions } = createDeps();
  deps.findPaymentByOrderId = async () => ({
    orderId: 'order-1',
    status: 'PAID',
    transactionId: 'momo-tx-1',
  });

  const result = await handleMoMoCallbackRequest(
    { orderId: 'order-1', resultCode: 1006, transId: 'momo-tx-2' },
    deps,
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.message, 'already processed');
  assert.equal(transitions.length, 0);
  assert.equal(
    logs.some((entry) => entry.event === 'payment.callback.conflict'),
    true,
  );
});
