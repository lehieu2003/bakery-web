import test from 'node:test';
import assert from 'node:assert/strict';
import { handleMoMoCallbackRequest } from '@/app/api/payment/momo/callback/route';
import type { PaymentCallbackAuditPayload } from '@/lib/order-audit';

type PaymentSnapshot = {
  orderId: string;
  status: string;
  transactionId: string | null;
  amount: number;
  userId: string | null;
  customerEmail: string | null;
  userEmail: string | null;
  orderNumber: string | null;
};

type TestDeps = {
  verifyCallback: (params: Record<string, string>) => boolean;
  findPaymentByOrderId: (orderId: string) => Promise<PaymentSnapshot | null>;
  applyPaymentTransition: (args: {
    orderId: string;
    paymentStatus: string;
    transactionId: string | null;
  }) => Promise<{ applied: boolean; conflict: boolean }>;
  dispatchNotificationEvent?: (event: {
    eventType: 'ORDER_STATUS_CHANGED';
    entityId: string;
    correlationKey: string;
    targetUserId?: string | null;
    targetEmail?: string | null;
    payload?: Record<string, unknown>;
  }) => Promise<unknown>;
  logEvent: (event: string, payload: Record<string, unknown>) => void;
  writeCallbackAuditLog?: (payload: PaymentCallbackAuditPayload) => Promise<void>;
};

function createDeps() {
  const logs: Array<{ event: string; payload: Record<string, unknown> }> = [];
  const transitions: Array<{
    orderId: string;
    paymentStatus: string;
    transactionId: string | null;
  }> = [];
  const orderFinalizations: Array<{ orderId: string; orderStatus: string }> = [];
  const notificationEvents: Array<Record<string, unknown>> = [];
  const callbackAuditEvents: PaymentCallbackAuditPayload[] = [];

  const deps: TestDeps = {
    verifyCallback: () => true,
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
      if (args.paymentStatus === 'PAID') {
        orderFinalizations.push({ orderId: args.orderId, orderStatus: 'CONFIRMED' });
      } else if (args.paymentStatus === 'FAILED') {
        orderFinalizations.push({ orderId: args.orderId, orderStatus: 'CANCELLED' });
      }
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

  return {
    deps,
    logs,
    transitions,
    orderFinalizations,
    notificationEvents,
    callbackAuditEvents,
  };
}

test('MoMo callback rejects non-object payload', async () => {
  const { deps } = createDeps();
  const result = await handleMoMoCallbackRequest('invalid' as never, deps);

  assert.equal(result.status, 400);
  assert.equal(result.body.resultCode, 1);
});

test('MoMo callback rejects invalid signature', async () => {
  const { deps, logs, callbackAuditEvents } = createDeps();
  deps.verifyCallback = () => false;

  const result = await handleMoMoCallbackRequest(
    { orderId: 'order-1', resultCode: 0, amount: 200000 },
    deps,
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.message, 'Invalid signature');
  assert.equal(logs[0]?.event, 'payment.callback.verification_failed');
  assert.equal(callbackAuditEvents[0]?.event, 'verification_failed');
});

test('MoMo callback writes invalid_payload audit for malformed callback payload', async () => {
  const { deps, callbackAuditEvents } = createDeps();
  const result = await handleMoMoCallbackRequest({ orderId: 'order-1' }, deps);

  assert.equal(result.status, 400);
  assert.equal(result.body.message, 'Invalid payload');
  assert.equal(callbackAuditEvents[0]?.event, 'invalid_payload');
});

test('MoMo callback returns already processed when payment is missing', async () => {
  const { deps } = createDeps();
  deps.findPaymentByOrderId = async () => null;

  const result = await handleMoMoCallbackRequest(
    { orderId: 'order-1', resultCode: 0, amount: 200000 },
    deps,
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.message, 'already processed');
});

test('MoMo callback applies PAID transition for successful resultCode', async () => {
  const { deps, transitions, orderFinalizations, notificationEvents } =
    createDeps();

  const result = await handleMoMoCallbackRequest(
    { orderId: 'order-1', resultCode: 0, amount: 200000, transId: 'momo-tx-1' },
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
  assert.equal(notificationEvents.length, 1);
  assert.equal(notificationEvents[0].eventType, 'ORDER_STATUS_CHANGED');
  assert.equal(notificationEvents[0].entityId, 'order-1');
  assert.equal(
    notificationEvents[0].correlationKey,
    'order:order-1:status:CONFIRMED:momo-tx-1',
  );
  assert.equal(
    (notificationEvents[0].payload as Record<string, unknown>).provider,
    'MOMO',
  );
  assert.equal(
    typeof (notificationEvents[0].payload as Record<string, unknown>).occurredAt,
    'string',
  );
  assert.equal(
    (notificationEvents[0].payload as Record<string, unknown>).linkUrl,
    'http://localhost:3000/orders',
  );
});

test('MoMo callback finalizes order as CANCELLED when payment fails', async () => {
  const { deps, transitions, orderFinalizations } = createDeps();

  const result = await handleMoMoCallbackRequest(
    {
      orderId: 'order-1',
      resultCode: 1006,
      amount: 200000,
      transId: 'momo-tx-failed',
    },
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
    amount: 200000,
    userId: 'user-1',
    customerEmail: 'lan@example.com',
    userEmail: 'user@example.com',
    orderNumber: 'BK260405ABCD',
  });

  const result = await handleMoMoCallbackRequest(
    { orderId: 'order-1', resultCode: 0, amount: 200000, transId: 'momo-tx-1' },
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
    amount: 200000,
    userId: 'user-1',
    customerEmail: 'lan@example.com',
    userEmail: 'user@example.com',
    orderNumber: 'BK260405ABCD',
  });

  const result = await handleMoMoCallbackRequest(
    { orderId: 'order-1', resultCode: 1006, amount: 200000, transId: 'momo-tx-2' },
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

test('MoMo callback treats atomic-transition miss as replay and skips notification dispatch', async () => {
  const { deps, logs, notificationEvents } = createDeps();
  deps.applyPaymentTransition = async () => ({ applied: false, conflict: false });

  const result = await handleMoMoCallbackRequest(
    { orderId: 'order-1', resultCode: 0, amount: 200000, transId: 'momo-tx-1' },
    deps,
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.message, 'already processed');
  assert.equal(notificationEvents.length, 0);
  assert.equal(
    logs.some((entry) => entry.event === 'payment.callback.replay_ignored'),
    true,
  );
});

test('MoMo callback rejects amount mismatch before applying transition', async () => {
  const { deps, transitions, logs, callbackAuditEvents } = createDeps();

  const result = await handleMoMoCallbackRequest(
    { orderId: 'order-1', resultCode: 0, amount: 199000, transId: 'momo-tx-1' },
    deps,
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.message, 'Invalid amount');
  assert.equal(transitions.length, 0);
  assert.equal(logs[0]?.event, 'payment.callback.received');
  assert.equal(
    logs.some((entry) => entry.event === 'payment.callback.verification_failed'),
    true,
  );
  assert.equal(callbackAuditEvents.at(-1)?.reason, 'amount_mismatch');
});
