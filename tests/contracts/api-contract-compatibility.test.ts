import test from 'node:test';
import assert from 'node:assert/strict';

import { handleAdminAuditListGetRequest } from '@/app/api/admin/audit/route';
import { handleGetNotificationsRequest } from '@/app/api/notifications/route';
import { handleGetPublicProductsRequest } from '@/app/api/public/products/route';
import { handleMoMoCallbackRequest } from '@/app/api/payment/momo/callback/route';
import { handleZaloPayCallbackRequest } from '@/app/api/payment/zalopay/callback/route';

test('admin audit route returns success/data envelope for success responses', async () => {
  const result = await handleAdminAuditListGetRequest(
    { url: 'http://localhost/api/admin/audit?page=1&limit=10' },
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findAdminActionLogs: async () => [],
    },
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  if (!result.body.success) {
    assert.fail('expected success response');
  }
  assert.ok(result.body.data);
  const data = result.body.data as {
    logs: unknown[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
  assert.ok(Array.isArray(data.logs));
  assert.equal(typeof data.pagination.page, 'number');
});

test('notifications route returns success/error envelope for auth failures', async () => {
  const result = await handleGetNotificationsRequest(
    { url: 'http://localhost/api/notifications' } as never,
    {
      getCurrentUser: async () => null,
      getNotifications: async () => ({ notifications: [], total: 0 }),
    },
  );

  assert.equal(result.status, 401);
  assert.equal(result.body.success, false);
  if (result.body.success) {
    assert.fail('expected error response');
  }
  assert.equal(typeof result.body.error, 'string');
});

test('public products route returns success/data envelope for list responses', async () => {
  const result = await handleGetPublicProductsRequest(
    'http://localhost/api/public/products?page=1&limit=5',
    {
      parseAttributeFilters: () => [],
      buildProductAttributeWhere: () => [],
      findChildCategories: async () => [],
      findProducts: async () => [{ id: 'p1', name: 'Bread' }],
      countProducts: async () => 1,
    },
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  if (!result.body.success) {
    assert.fail('expected success response');
  }
  assert.ok(result.body.data);
  const data = result.body.data as {
    products: unknown[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
  assert.ok(Array.isArray(data.products));
  assert.equal(data.pagination.total, 1);
});

test('momo callback contract remains provider-compatible (compatibility guard)', async () => {
  const result = await handleMoMoCallbackRequest(
    { orderId: 'order-1', resultCode: 0 },
    {
      verifyCallback: () => false,
      findPaymentByOrderId: async () => null,
      applyPaymentTransition: async () => ({ applied: false, conflict: false }),
      logEvent: () => undefined,
      writeCallbackAuditLog: async () => undefined,
    },
  );

  assert.equal(result.status, 400);
  assert.equal(typeof (result.body as { resultCode: unknown }).resultCode, 'number');
  assert.equal(typeof (result.body as { message: unknown }).message, 'string');
});

test('zalopay callback contract remains provider-compatible (compatibility guard)', async () => {
  const result = await handleZaloPayCallbackRequest(
    { data: '{}', mac: 'invalid' },
    {
      verifyCallback: () => false,
      findPaymentByOrderId: async () => null,
      applyPaymentTransition: async () => ({ applied: false, conflict: false }),
      logEvent: () => undefined,
      writeCallbackAuditLog: async () => undefined,
    },
  );

  assert.equal(result.status, 200);
  assert.equal(typeof (result.body as { return_code: unknown }).return_code, 'number');
  assert.equal(
    typeof (result.body as { return_message: unknown }).return_message,
    'string',
  );
});
