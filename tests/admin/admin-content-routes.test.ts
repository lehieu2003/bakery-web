import assert from 'node:assert/strict';
import test from 'node:test';

import { handleAdminBannersPostRequest } from '@/app/api/admin/banners/route';
import { handleAdminBannerReorderRequest } from '@/app/api/admin/banners/reorder/route';
import { handleAdminMenuPostRequest } from '@/app/api/admin/menu/route';
import { handleAdminMenuUpdateRequest } from '@/app/api/admin/menu/[id]/route';

function makeRequest(body: unknown) {
  return {
    json: async () => body,
  } as never;
}

test('admin banners create rejects non-boolean isActive', async () => {
  const result = await handleAdminBannersPostRequest(
    makeRequest({
      title: 'Spring Promo',
      isActive: 'true',
    }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findBanners: async () => [],
      createBanner: async () => ({}),
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'isActive must be a boolean');
});

test('admin banners create rejects non-numeric displayOrder', async () => {
  const result = await handleAdminBannersPostRequest(
    makeRequest({
      title: 'Spring Promo',
      displayOrder: '1',
    }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findBanners: async () => [],
      createBanner: async () => ({}),
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'displayOrder must be a non-negative integer');
});

test('admin banners reorder rejects duplicate IDs', async () => {
  const result = await handleAdminBannerReorderRequest(
    makeRequest({
      items: [
        { id: 'bn-1', displayOrder: 0 },
        { id: 'bn-1', displayOrder: 1 },
      ],
    }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findBannersByIds: async () => [{ id: 'bn-1' }],
      updateDisplayOrders: async () => undefined,
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.match(String(result.body.error), /duplicate banner IDs/);
});

test('admin banners reorder rejects non-numeric displayOrder entries', async () => {
  const result = await handleAdminBannerReorderRequest(
    makeRequest({
      items: [{ id: 'bn-1', displayOrder: '1' }],
    }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findBannersByIds: async () => [{ id: 'bn-1' }],
      updateDisplayOrders: async () => undefined,
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.match(String(result.body.error), /displayOrder/);
});

test('admin menu create validates PAGE target requirements', async () => {
  const result = await handleAdminMenuPostRequest(
    makeRequest({
      title: 'Privacy',
      type: 'PAGE',
    }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findMenuItems: async () => [],
      findMenuItemById: async () => null,
      findCategoryById: async () => null,
      findPageById: async () => null,
      createMenuItem: async () => ({}),
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'pageId is required for PAGE menu type');
});

test('admin menu create rejects non-numeric displayOrder', async () => {
  const result = await handleAdminMenuPostRequest(
    makeRequest({
      title: 'Shop',
      type: 'LINK',
      url: '/shop',
      displayOrder: '1',
    }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findMenuItems: async () => [],
      findMenuItemById: async () => null,
      findCategoryById: async () => null,
      findPageById: async () => null,
      createMenuItem: async () => ({}),
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'displayOrder must be a non-negative integer');
});

test('admin menu update preserves existing link URL on partial mutation', async () => {
  let persistedPayload: Record<string, unknown> | null = null;
  const result = await handleAdminMenuUpdateRequest(
    makeRequest({
      isActive: false,
    }),
    Promise.resolve({ id: 'menu-link-1' }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findMenuItemById: async () => ({
        id: 'menu-link-1',
        title: 'Shop',
        url: '/shop',
        parentId: null,
        categoryId: null,
        pageId: null,
        type: 'LINK',
        displayOrder: 0,
        isActive: true,
      }),
      findMenuParentById: async () => null,
      findCategoryById: async () => null,
      findPageById: async () => null,
      updateMenuItemById: async (_id, payload) => {
        persistedPayload = payload as Record<string, unknown>;
        return { id: 'menu-link-1' };
      },
      deleteMenuItemById: async () => undefined,
    },
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.ok(persistedPayload);
  const payload = persistedPayload as Record<string, unknown>;
  assert.equal(payload.url, '/shop');
  assert.equal(payload.isActive, false);
});

test('admin menu update rejects non-numeric displayOrder', async () => {
  const result = await handleAdminMenuUpdateRequest(
    makeRequest({
      displayOrder: '1',
    }),
    Promise.resolve({ id: 'menu-link-1' }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findMenuItemById: async () => ({
        id: 'menu-link-1',
        title: 'Shop',
        url: '/shop',
        parentId: null,
        categoryId: null,
        pageId: null,
        type: 'LINK',
        displayOrder: 0,
        isActive: true,
      }),
      findMenuParentById: async () => null,
      findCategoryById: async () => null,
      findPageById: async () => null,
      updateMenuItemById: async () => ({ id: 'menu-link-1' }),
      deleteMenuItemById: async () => undefined,
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'displayOrder must be a non-negative integer');
});

test('admin menu update fails closed on pre-existing cyclic parent graph', async () => {
  const result = await handleAdminMenuUpdateRequest(
    makeRequest({
      parentId: 'node-a',
    }),
    Promise.resolve({ id: 'menu-link-1' }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findMenuItemById: async () => ({
        id: 'menu-link-1',
        title: 'Shop',
        url: '/shop',
        parentId: null,
        categoryId: null,
        pageId: null,
        type: 'LINK',
        displayOrder: 0,
        isActive: true,
      }),
      findMenuParentById: async (id) => {
        if (id === 'node-a') return { id: 'node-a', parentId: 'node-b' };
        if (id === 'node-b') return { id: 'node-b', parentId: 'node-a' };
        return null;
      },
      findCategoryById: async () => null,
      findPageById: async () => null,
      updateMenuItemById: async () => ({ id: 'menu-link-1' }),
      deleteMenuItemById: async () => undefined,
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Parent relationship creates a cycle');
});
