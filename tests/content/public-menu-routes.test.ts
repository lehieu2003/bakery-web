import assert from 'node:assert/strict';
import test from 'node:test';

import { handleGetPublicMenuRequest } from '@/app/api/public/menu/route';

test('public menu excludes PAGE items whose target page is unpublished', async () => {
  const result = await handleGetPublicMenuRequest({
    findActiveMenuItems: async () => [
      {
        id: 'm-page-draft',
        title: 'Draft Page',
        url: null,
        parentId: null,
        categoryId: null,
        pageId: 'pg-1',
        type: 'PAGE',
        displayOrder: 0,
        isActive: true,
        category: null,
        page: { id: 'pg-1', title: 'Draft', slug: 'draft', isPublished: false },
      },
      {
        id: 'm-link',
        title: 'Shop',
        url: '/shop',
        parentId: null,
        categoryId: null,
        pageId: null,
        type: 'LINK',
        displayOrder: 1,
        isActive: true,
        category: null,
        page: null,
      },
    ],
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  const items = result.body.data;
  assert.equal(items.length, 1);
  assert.equal(items[0]?.id, 'm-link');
});

test('public menu drops item when parent reference is missing', async () => {
  const result = await handleGetPublicMenuRequest({
    findActiveMenuItems: async () => [
      {
        id: 'm-orphan',
        title: 'Orphan',
        url: '/orphan',
        parentId: 'missing-parent',
        categoryId: null,
        pageId: null,
        type: 'LINK',
        displayOrder: 0,
        isActive: true,
        category: null,
        page: null,
      },
    ],
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data.length, 0);
});

test('public menu drops descendants when parent is filtered out', async () => {
  const result = await handleGetPublicMenuRequest({
    findActiveMenuItems: async () => [
      {
        id: 'parent-draft-page',
        title: 'Draft Parent',
        url: null,
        parentId: null,
        categoryId: null,
        pageId: 'pg-1',
        type: 'PAGE',
        displayOrder: 0,
        isActive: true,
        category: null,
        page: { id: 'pg-1', title: 'Draft', slug: 'draft', isPublished: false },
      },
      {
        id: 'child-link',
        title: 'Child',
        url: '/child',
        parentId: 'parent-draft-page',
        categoryId: null,
        pageId: null,
        type: 'LINK',
        displayOrder: 1,
        isActive: true,
        category: null,
        page: null,
      },
    ],
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data.length, 0);
});
