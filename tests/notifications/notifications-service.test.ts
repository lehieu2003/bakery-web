import test from 'node:test';
import assert from 'node:assert/strict';
import { notificationsService } from '@/services/notifications.service';
import { http } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';

test('notificationsService.getMyNotifications builds query params correctly', async () => {
  const originalGet = http.get;
  let capturedUrl = '';

  (http as { get: typeof http.get }).get = async (url) => {
    capturedUrl = url;
    return {
      success: true,
      data: {
        notifications: [],
        pagination: { page: 2, limit: 15, total: 0, totalPages: 0 },
      } as never,
    };
  };

  try {
    const data = await notificationsService.getMyNotifications({
      page: 2,
      limit: 15,
      unreadOnly: true,
    });
    assert.equal(
      capturedUrl,
      `${ENDPOINTS.NOTIFICATIONS.LIST}?page=2&limit=15&unreadOnly=true`,
    );
    assert.equal(data.pagination.page, 2);
    assert.equal(data.pagination.limit, 15);
  } finally {
    (http as { get: typeof http.get }).get = originalGet;
  }
});

test('notificationsService.markAsRead posts to read endpoint', async () => {
  const originalPost = http.post;
  let capturedUrl = '';
  let capturedPayload: unknown = undefined;

  (http as { post: typeof http.post }).post = async (url, payload) => {
    capturedUrl = url;
    capturedPayload = payload;
    return {
      success: true,
      data: {
        notificationId: 'n1',
        readAt: '2026-04-09T12:00:00.000Z',
      } as never,
    };
  };

  try {
    const result = await notificationsService.markAsRead('n1');
    assert.equal(capturedUrl, ENDPOINTS.NOTIFICATIONS.MARK_READ('n1'));
    assert.equal(capturedPayload, undefined);
    assert.equal(result.notificationId, 'n1');
  } finally {
    (http as { post: typeof http.post }).post = originalPost;
  }
});

test('notificationsService.markAllAsRead posts to mark-all endpoint', async () => {
  const originalPost = http.post;
  let capturedUrl = '';

  (http as { post: typeof http.post }).post = async (url) => {
    capturedUrl = url;
    return {
      success: true,
      data: {
        count: 4,
      } as never,
    };
  };

  try {
    const result = await notificationsService.markAllAsRead();
    assert.equal(capturedUrl, ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ);
    assert.equal(result.count, 4);
  } finally {
    (http as { post: typeof http.post }).post = originalPost;
  }
});
