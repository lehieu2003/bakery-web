import test from 'node:test';
import assert from 'node:assert/strict';
import { handleGetNotificationsRequest } from '@/app/api/notifications/route';
import { handleMarkNotificationAsReadRequest } from '@/app/api/notifications/[id]/read/route';
import { handleMarkAllNotificationsAsReadRequest } from '@/app/api/notifications/read-all/route';

function makeRequest(url: string) {
  return { url } as never;
}

test('GET /api/notifications returns 401 for unauthenticated user', async () => {
  const result = await handleGetNotificationsRequest(makeRequest('http://localhost/api/notifications'), {
    getCurrentUser: async () => null,
    getNotifications: async () => ({ notifications: [], total: 0 }),
  });

  assert.equal(result.status, 401);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Unauthorized');
});

test('GET /api/notifications normalizes page/limit and maps read state', async () => {
  let capturedArgs:
    | { userId: string; unreadOnly: boolean; skip: number; take: number }
    | undefined;

  const result = await handleGetNotificationsRequest(
    makeRequest(
      'http://localhost/api/notifications?page=-1&limit=999&unreadOnly=true',
    ),
    {
      getCurrentUser: async () => ({ id: 'u1' }),
      getNotifications: async (args) => {
        capturedArgs = args;
        return {
          notifications: [
            {
              id: 'n1',
              title: 'Order Update',
              content: 'Your order is confirmed',
              imageUrl: null,
              linkUrl: '/orders',
              status: 'PUBLISHED',
              publishedAt: new Date('2026-04-09T10:00:00.000Z'),
              createdById: 'admin-1',
              createdAt: new Date('2026-04-09T10:00:00.000Z'),
              updatedAt: new Date('2026-04-09T10:00:00.000Z'),
              reads: [{ readAt: new Date('2026-04-09T11:00:00.000Z') }],
            },
            {
              id: 'n2',
              title: 'Promo',
              content: 'New campaign',
              imageUrl: null,
              linkUrl: null,
              status: 'PUBLISHED',
              publishedAt: new Date('2026-04-09T09:00:00.000Z'),
              createdById: 'admin-1',
              createdAt: new Date('2026-04-09T09:00:00.000Z'),
              updatedAt: new Date('2026-04-09T09:00:00.000Z'),
              reads: [],
            },
          ],
          total: 2,
        };
      },
    },
  );

  assert.equal(result.status, 200);
  assert.deepEqual(capturedArgs, {
    userId: 'u1',
    unreadOnly: true,
    skip: 0,
    take: 50,
  });
  assert.equal(result.body.data?.pagination.page, 1);
  assert.equal(result.body.data?.pagination.limit, 50);
  assert.equal(result.body.data?.pagination.total, 2);
  assert.equal(result.body.data?.notifications[0].isRead, true);
  assert.equal(result.body.data?.notifications[1].isRead, false);
});

test('GET /api/notifications falls back to safe defaults for invalid page/limit query values', async () => {
  let capturedArgs:
    | { userId: string; unreadOnly: boolean; skip: number; take: number }
    | undefined;

  const result = await handleGetNotificationsRequest(
    makeRequest('http://localhost/api/notifications?page=abc&limit=foo'),
    {
      getCurrentUser: async () => ({ id: 'u1' }),
      getNotifications: async (args) => {
        capturedArgs = args;
        return { notifications: [], total: 0 };
      },
    },
  );

  assert.equal(result.status, 200);
  assert.deepEqual(capturedArgs, {
    userId: 'u1',
    unreadOnly: false,
    skip: 0,
    take: 20,
  });
  assert.equal(result.body.data?.pagination.page, 1);
  assert.equal(result.body.data?.pagination.limit, 20);
});

test('POST /api/notifications/[id]/read returns 404 when notification is inaccessible', async () => {
  const result = await handleMarkNotificationAsReadRequest(
    makeRequest('http://localhost/api/notifications/n1/read'),
    Promise.resolve({ id: 'n1' }),
    {
      getCurrentUser: async () => ({ id: 'u1' }),
      findAccessibleNotification: async () => null,
      upsertReadState: async () => ({
        notificationId: 'n1',
        readAt: new Date('2026-04-09T10:00:00.000Z'),
      }),
    },
  );

  assert.equal(result.status, 404);
  assert.equal(result.body.success, false);
});

test('POST /api/notifications/[id]/read is idempotent via upsert behavior', async () => {
  let upsertCalls = 0;
  const deps = {
    getCurrentUser: async () => ({ id: 'u1' }),
    findAccessibleNotification: async () => ({ id: 'n1' }),
    upsertReadState: async () => {
      upsertCalls += 1;
      return {
        notificationId: 'n1',
        readAt: new Date('2026-04-09T10:00:00.000Z'),
      };
    },
  };

  const first = await handleMarkNotificationAsReadRequest(
    makeRequest('http://localhost/api/notifications/n1/read'),
    Promise.resolve({ id: 'n1' }),
    deps,
  );
  const second = await handleMarkNotificationAsReadRequest(
    makeRequest('http://localhost/api/notifications/n1/read'),
    Promise.resolve({ id: 'n1' }),
    deps,
  );

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(first.body.data?.notificationId, 'n1');
  assert.equal(second.body.data?.notificationId, 'n1');
  assert.equal(upsertCalls, 2);
});

test('POST /api/notifications/read-all returns 401 for unauthenticated user', async () => {
  const result = await handleMarkAllNotificationsAsReadRequest(
    makeRequest('http://localhost/api/notifications/read-all'),
    {
      getCurrentUser: async () => null,
      findUnreadNotificationIds: async () => [],
      markAllAsRead: async () => ({ count: 0 }),
    },
  );

  assert.equal(result.status, 401);
  assert.equal(result.body.success, false);
});

test('POST /api/notifications/read-all returns count=0 when nothing unread', async () => {
  const result = await handleMarkAllNotificationsAsReadRequest(
    makeRequest('http://localhost/api/notifications/read-all'),
    {
      getCurrentUser: async () => ({ id: 'u1' }),
      findUnreadNotificationIds: async () => [],
      markAllAsRead: async () => ({ count: 999 }),
    },
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.data?.count, 0);
});

test('POST /api/notifications/read-all persists all unread ids and returns written count', async () => {
  let capturedIds: string[] = [];
  let capturedUserId = '';
  const result = await handleMarkAllNotificationsAsReadRequest(
    makeRequest('http://localhost/api/notifications/read-all'),
    {
      getCurrentUser: async () => ({ id: 'u1' }),
      findUnreadNotificationIds: async () => [{ id: 'n1' }, { id: 'n2' }],
      markAllAsRead: async ({ userId, notificationIds }) => {
        capturedUserId = userId;
        capturedIds = notificationIds;
        return { count: 2 };
      },
    },
  );

  assert.equal(result.status, 200);
  assert.equal(capturedUserId, 'u1');
  assert.deepEqual(capturedIds, ['n1', 'n2']);
  assert.equal(result.body.data?.count, 2);
});
