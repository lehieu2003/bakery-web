import assert from 'node:assert/strict';
import test from 'node:test';

import {
  handleAdminOrdersGetRequest,
} from '@/app/api/admin/orders/route';
import {
  handleAdminOrderGetByIdRequest,
  handleAdminOrderPatchRequest,
} from '@/app/api/admin/orders/[id]/route';
import {
  handleAdminOrderStatusPatchRequest,
} from '@/app/api/admin/orders/[id]/status/route';
import {
  handleAdminOrderAuditGetRequest,
} from '@/app/api/admin/orders/[id]/audit/route';

function makePatchRequest(body: unknown) {
  return {
    json: async () => body,
  } as never;
}

test('admin orders list rejects invalid status filter', async () => {
  const result = await handleAdminOrdersGetRequest(
    'http://localhost/api/admin/orders?status=INVALID',
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findOrders: async () => [],
      countOrders: async () => 0,
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Bộ lọc trạng thái không hợp lệ');
});

test('admin order patch blocks invalid status transition', async () => {
  const result = await handleAdminOrderPatchRequest(
    makePatchRequest({ status: 'COMPLETED' }),
    Promise.resolve({ id: 'order-1' }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findOrderById: async () => ({
        id: 'order-1',
        status: 'CONFIRMED',
        customerName: 'Alice',
        customerPhone: '0900000001',
        customerEmail: 'alice@example.com',
        customerAddress: '1 Main St',
      }),
      updateOrderWithLifecycleAndAudit: async () => {
        throw new Error('should not be called');
      },
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.match(String(result.body.error), /Invalid status transition/);
});

test('admin order get-by-id returns order detail when found', async () => {
  const result = await handleAdminOrderGetByIdRequest(
    Promise.resolve({ id: 'BK260409VOB8' }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findOrderById: async (id) => ({
        id: id === 'BK260409VOB8' ? 'order-1' : 'unknown',
        status: 'CONFIRMED',
        customerName: 'Alice',
        customerPhone: '0900000001',
        customerEmail: 'alice@example.com',
        customerAddress: '1 Main St',
      }),
      updateOrderWithLifecycleAndAudit: async () => {
        throw new Error('should not be called');
      },
    },
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal((result.body.data as { id: string }).id, 'order-1');
});

test('admin order patch allows valid transition and writes update path', async () => {
  let updateCalled = false;

  const result = await handleAdminOrderPatchRequest(
    makePatchRequest({ status: 'PROCESSING', notes: 'start now' }),
    Promise.resolve({ id: 'order-1' }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findOrderById: async () => ({
        id: 'order-1',
        status: 'CONFIRMED',
        customerName: 'Alice',
        customerPhone: '0900000001',
        customerEmail: 'alice@example.com',
        customerAddress: '1 Main St',
      }),
      updateOrderWithLifecycleAndAudit: async ({ payload, metadata }) => {
        updateCalled = true;
        assert.equal(payload.status, 'PROCESSING');
        assert.equal(metadata.note, 'start now');
        return {
          id: 'order-1',
          status: 'PROCESSING',
          customerName: 'Alice',
          customerPhone: '0900000001',
          customerEmail: 'alice@example.com',
          customerAddress: '1 Main St',
        };
      },
    },
  );

  assert.equal(updateCalled, true);
  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal((result.body.data as { order: { status: string } }).order.status, 'PROCESSING');
});

test('admin order patch no-op status returns existing order without write', async () => {
  let updateCalled = false;

  const result = await handleAdminOrderPatchRequest(
    makePatchRequest({ status: 'CONFIRMED' }),
    Promise.resolve({ id: 'order-1' }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findOrderById: async () => ({
        id: 'order-1',
        status: 'CONFIRMED',
        customerName: 'Alice',
        customerPhone: '0900000001',
        customerEmail: 'alice@example.com',
        customerAddress: '1 Main St',
      }),
      updateOrderWithLifecycleAndAudit: async () => {
        updateCalled = true;
        throw new Error('should not be called');
      },
    },
  );

  assert.equal(updateCalled, false);
  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal((result.body.data as { order: { status: string } }).order.status, 'CONFIRMED');
});

test('admin order patch returns 400 on invalid JSON payload', async () => {
  const result = await handleAdminOrderPatchRequest(
    {
      json: async () => {
        throw new SyntaxError('Unexpected end of JSON input');
      },
    },
    Promise.resolve({ id: 'order-1' }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findOrderById: async () => ({
        id: 'order-1',
        status: 'CONFIRMED',
        customerName: 'Alice',
        customerPhone: '0900000001',
        customerEmail: 'alice@example.com',
        customerAddress: '1 Main St',
      }),
      updateOrderWithLifecycleAndAudit: async () => {
        throw new Error('should not be called');
      },
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Dữ liệu JSON không hợp lệ');
});

test('admin order status endpoint delegates to shared patch handler', async () => {
  let delegated = false;

  const result = await handleAdminOrderStatusPatchRequest(
    makePatchRequest({ status: 'PROCESSING' }),
    Promise.resolve({ id: 'order-1' }),
    {
      patchOrder: async () => {
        delegated = true;
        return {
          status: 200,
          body: {
            success: true,
            data: {
              order: {
                id: 'order-1',
                status: 'PROCESSING',
              },
            },
          },
        };
      },
    },
  );

  assert.equal(delegated, true);
  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal((result.body.data as { order: { status: string } }).order.status, 'PROCESSING');
});

test('admin order status endpoint rejects non-status fields', async () => {
  let delegated = false;

  const result = await handleAdminOrderStatusPatchRequest(
    makePatchRequest({ status: 'PROCESSING', customerName: 'Bob' }),
    Promise.resolve({ id: 'order-1' }),
    {
      patchOrder: async () => {
        delegated = true;
        return {
          status: 200,
          body: { success: true },
        };
      },
    },
  );

  assert.equal(delegated, false);
  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Endpoint này chỉ cho phép cập nhật trạng thái');
});

test('admin order audit handler enforces auth and normalizes pagination', async () => {
  let capturedOrderId = '';
  let capturedSkip = -1;
  let capturedTake = -1;

  const result = await handleAdminOrderAuditGetRequest(
    { url: 'http://localhost/api/admin/orders/order-1/audit?page=-9&limit=999' },
    Promise.resolve({ id: 'order-1' }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findLogs: async ({ orderId, skip, take }) => {
        capturedOrderId = orderId;
        capturedSkip = skip;
        capturedTake = take;
        return [];
      },
      countLogs: async () => 0,
    },
  );

  assert.equal(capturedOrderId, 'order-1');
  assert.equal(capturedSkip, 0);
  assert.equal(capturedTake, 50);
  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
});

function patchDeps(notified: Array<{ id: string; status: string }>) {
  const existing = {
    id: 'order-1',
    orderNumber: 'BK1',
    userId: 'user-1',
    status: 'CONFIRMED' as const,
    customerName: 'Alice',
    customerPhone: '0900000001',
    customerEmail: 'alice@example.com',
    customerAddress: '1 Main St',
  };
  return {
    requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' as const }),
    findOrderById: async () => existing,
    updateOrderWithLifecycleAndAudit: async ({
      payload,
    }: {
      payload: { status?: string; customerName?: string };
    }) => ({ ...existing, ...payload }) as never,
    notifyStatusChange: (order: { id: string; status: unknown }) => {
      notified.push({ id: order.id, status: String(order.status) });
    },
  };
}

test('admin order status change notifies the customer with the new status', async () => {
  const notified: Array<{ id: string; status: string }> = [];

  const result = await handleAdminOrderPatchRequest(
    makePatchRequest({ status: 'PROCESSING' }),
    Promise.resolve({ id: 'order-1' }),
    patchDeps(notified),
  );

  assert.equal(result.status, 200);
  assert.deepEqual(notified, [{ id: 'order-1', status: 'PROCESSING' }]);
});

test('admin order edits without a status change do not notify', async () => {
  const notified: Array<{ id: string; status: string }> = [];

  await handleAdminOrderPatchRequest(
    makePatchRequest({ customerName: 'Alice Nguyen' }),
    Promise.resolve({ id: 'order-1' }),
    patchDeps(notified),
  );
  await handleAdminOrderPatchRequest(
    makePatchRequest({ status: 'CONFIRMED' }),
    Promise.resolve({ id: 'order-1' }),
    patchDeps(notified),
  );

  assert.deepEqual(notified, []);
});
