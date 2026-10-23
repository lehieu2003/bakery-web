import test from 'node:test';
import assert from 'node:assert/strict';
import { handleMarkRefundedRequest } from '@/app/api/admin/orders/[id]/refund/route';

const admin = { id: 'admin-1', role: 'ADMIN' as const };

function request(body: unknown) {
  return {
    json: async () => {
      if (body === undefined) throw new SyntaxError('Unexpected end of JSON input');
      return body;
    },
  };
}

test('marks a cancelled, paid order refunded with the trimmed note', async () => {
  const calls: unknown[] = [];
  const result = await handleMarkRefundedRequest(
    request({ note: '  Hoàn qua cổng MoMo, mã GD 123  ' }),
    Promise.resolve({ id: ' o1 ' }),
    {
      requireAdmin: async () => admin,
      markRefunded: async (args) => { calls.push(args); return true; },
    },
  );
  assert.equal(result.status, 200);
  assert.deepEqual(calls, [
    { orderId: 'o1', actor: admin, note: 'Hoàn qua cổng MoMo, mã GD 123' },
  ]);
});

test('an empty body is fine: the note is optional', async () => {
  const calls: Array<{ note: string | null }> = [];
  const result = await handleMarkRefundedRequest(request(undefined), Promise.resolve({ id: 'o1' }), {
    requireAdmin: async () => admin,
    markRefunded: async (args) => { calls.push(args); return true; },
  });
  assert.equal(result.status, 200);
  assert.equal(calls[0].note, null);
});

test('an order not awaiting a refund is a 409', async () => {
  const result = await handleMarkRefundedRequest(request({}), Promise.resolve({ id: 'o1' }), {
    requireAdmin: async () => admin,
    markRefunded: async () => false,
  });
  assert.equal(result.status, 409);
  assert.equal(result.body.success, false);
});

test('non-admins never reach the write', async () => {
  let wrote = false;
  await assert.rejects(
    handleMarkRefundedRequest(request({}), Promise.resolve({ id: 'o1' }), {
      requireAdmin: async () => { throw new Error('Forbidden'); },
      markRefunded: async () => { wrote = true; return true; },
    }),
    /Forbidden/,
  );
  assert.equal(wrote, false);
});
