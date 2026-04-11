import assert from 'node:assert/strict';
import test from 'node:test';

import { handleAdminCustomersGetRequest } from '@/app/api/admin/customers/route';
import {
  handleAdminCustomerGetByIdRequest,
  handleAdminCustomerPatchRequest,
} from '@/app/api/admin/customers/[id]/route';

function makePatchRequest(body: unknown) {
  return {
    json: async () => body,
  } as never;
}

test('admin customers list rejects invalid member level filter', async () => {
  const result = await handleAdminCustomersGetRequest(
    'http://localhost/api/admin/customers?level=DIAMOND',
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findCustomers: async () => [],
      countCustomers: async () => 0,
      sumTotalSpentByUserIds: async () => ({}),
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Invalid member level filter');
});

test('admin customers list normalizes pagination and includes compatibility level alias', async () => {
  let capturedSkip = -1;
  let capturedTake = -1;

  const result = await handleAdminCustomersGetRequest(
    'http://localhost/api/admin/customers?page=0&limit=999&level=SILVER',
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findCustomers: async ({ skip, take }) => {
        capturedSkip = skip;
        capturedTake = take;
        return [
          {
            id: 'u-1',
            email: 'a@example.com',
            name: 'Alice',
            phone: '0900',
            memberLevel: 'SILVER',
            points: 10,
            isActive: true,
            createdAt: new Date('2026-01-01T00:00:00Z'),
            _count: { orders: 2 },
          },
        ];
      },
      countCustomers: async () => 1,
      sumTotalSpentByUserIds: async () => ({ 'u-1': 120000 }),
    },
  );

  assert.equal(capturedSkip, 0);
  assert.equal(capturedTake, 50);
  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  const data = result.body.data as {
    pagination: { page: number; limit: number };
    customers: Array<{ memberLevel: string; level: string }>;
  };
  assert.equal(data.pagination.page, 1);
  assert.equal(data.pagination.limit, 50);
  assert.equal(data.customers[0].memberLevel, 'SILVER');
  assert.equal(data.customers[0].level, 'SILVER');
});

test('admin customer detail includes operational context and excludes sensitive fields', async () => {
  const result = await handleAdminCustomerGetByIdRequest(
    Promise.resolve({ id: 'u-1' }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findCustomerById: async () => ({
        id: 'u-1',
        email: 'a@example.com',
        name: 'Alice',
        phone: '0900',
        memberLevel: 'GOLD',
        points: 200,
        isActive: true,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        orders: [
          {
            id: 'o-1',
            orderNumber: 'ORD-1',
            total: 120000 as never,
            status: 'CONFIRMED',
            paymentMethod: 'MOMO',
            createdAt: new Date('2026-01-02T00:00:00Z'),
            payment: {
              id: 'p-1',
              provider: 'MOMO',
              transactionId: 'tx-1',
              amount: 120000 as never,
              status: 'PAID',
              createdAt: new Date('2026-01-02T00:01:00Z'),
            },
          },
        ],
        notificationReads: [
          {
            notificationId: 'n-1',
            readAt: new Date('2026-01-03T00:00:00Z'),
            notification: {
              id: 'n-1',
              title: 'Order update',
              status: 'PUBLISHED',
              audience: 'USER',
              publishedAt: new Date('2026-01-02T00:00:00Z'),
              createdAt: new Date('2026-01-02T00:00:00Z'),
            },
          },
        ],
      }),
      countTotalOrders: async () => 8,
      sumTotalSpent: async () => 990000,
      countUnreadPublishedNotifications: async () => 2,
      updateCustomer: async () => {
        throw new Error('should not be called');
      },
    },
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  const data = result.body.data as {
    recentOrders: unknown[];
    recentPayments: unknown[];
    recentNotifications: unknown[];
    notificationSummary: { unreadPublished: number };
  };
  assert.equal(data.recentOrders.length, 1);
  assert.equal(data.recentPayments.length, 1);
  assert.equal(data.recentNotifications.length, 1);
  assert.equal(data.notificationSummary.unreadPublished, 2);
  assert.equal('password' in data, false);
  assert.equal('sessions' in data, false);
});

test('admin customer patch rejects invalid member level', async () => {
  const result = await handleAdminCustomerPatchRequest(
    makePatchRequest({ memberLevel: 'DIAMOND' }),
    Promise.resolve({ id: 'u-1' }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findCustomerById: async () => ({
        id: 'u-1',
        email: 'a@example.com',
        name: 'Alice',
        phone: '0900',
        memberLevel: 'SILVER',
        points: 10,
        isActive: true,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        orders: [],
        notificationReads: [],
      }),
      countTotalOrders: async () => 0,
      sumTotalSpent: async () => 0,
      countUnreadPublishedNotifications: async () => 0,
      updateCustomer: async () => {
        throw new Error('should not be called');
      },
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Invalid memberLevel');
});

test('admin customer patch rejects unknown payload fields', async () => {
  const result = await handleAdminCustomerPatchRequest(
    makePatchRequest({ foo: 'bar' }),
    Promise.resolve({ id: 'u-1' }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findCustomerById: async () => ({
        id: 'u-1',
        email: 'a@example.com',
        name: 'Alice',
        phone: '0900',
        memberLevel: 'SILVER',
        points: 10,
        isActive: true,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        orders: [],
        notificationReads: [],
      }),
      countTotalOrders: async () => 0,
      sumTotalSpent: async () => 0,
      countUnreadPublishedNotifications: async () => 0,
      updateCustomer: async () => {
        throw new Error('should not be called');
      },
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Invalid payload fields');
});

test('admin customer patch rejects malformed json payload', async () => {
  const result = await handleAdminCustomerPatchRequest(
    {
      json: async () => {
        throw new SyntaxError('Unexpected end of JSON input');
      },
    },
    Promise.resolve({ id: 'u-1' }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findCustomerById: async () => ({
        id: 'u-1',
        email: 'a@example.com',
        name: 'Alice',
        phone: '0900',
        memberLevel: 'SILVER',
        points: 10,
        isActive: true,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        orders: [],
        notificationReads: [],
      }),
      countTotalOrders: async () => 0,
      sumTotalSpent: async () => 0,
      countUnreadPublishedNotifications: async () => 0,
      updateCustomer: async () => {
        throw new Error('should not be called');
      },
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Invalid JSON payload');
});

test('admin customer patch no-op returns existing customer summary', async () => {
  let updateCalled = false;

  const result = await handleAdminCustomerPatchRequest(
    makePatchRequest({}),
    Promise.resolve({ id: 'u-1' }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findCustomerById: async () => ({
        id: 'u-1',
        email: 'a@example.com',
        name: 'Alice',
        phone: '0900',
        memberLevel: 'SILVER',
        points: 10,
        isActive: true,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        orders: [],
        notificationReads: [],
      }),
      countTotalOrders: async () => 0,
      sumTotalSpent: async () => 0,
      countUnreadPublishedNotifications: async () => 0,
      updateCustomer: async () => {
        updateCalled = true;
        throw new Error('should not be called');
      },
    },
  );

  assert.equal(updateCalled, false);
  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal((result.body.data as { level: string }).level, 'SILVER');
});
