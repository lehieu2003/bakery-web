import test from 'node:test';
import assert from 'node:assert/strict';
import { handleGetPublicBlogPostsRequest } from '@/app/api/blog/posts/route';

test('public blog posts route normalizes invalid page/limit values', async () => {
  let capturedPage = -1;
  let capturedLimit = -1;

  const result = await handleGetPublicBlogPostsRequest(
    'http://localhost/api/blog/posts?page=invalid&limit=0',
    {
      findPosts: async ({ page, limit }) => {
        capturedPage = page;
        capturedLimit = limit;
        return [];
      },
      countPosts: async () => 0,
    },
  );

  assert.equal(capturedPage, 1);
  assert.equal(capturedLimit, 10);
  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
});

test('public blog posts route clamps limit to max 50', async () => {
  let capturedLimit = -1;

  const result = await handleGetPublicBlogPostsRequest(
    'http://localhost/api/blog/posts?page=1&limit=999',
    {
      findPosts: async ({ limit }) => {
        capturedLimit = limit;
        return [];
      },
      countPosts: async () => 0,
    },
  );

  assert.equal(capturedLimit, 50);
  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
});

test('public blog posts route composes trimmed filters and flattens tag relation', async () => {
  let capturedWhere: Record<string, unknown> | null = null;

  const result = await handleGetPublicBlogPostsRequest(
    'http://localhost/api/blog/posts?search=%20cake%20&categorySlug=%20tips%20&tagSlug=%20new%20&page=2&limit=5',
    {
      findPosts: async ({ where, page, limit }) => {
        capturedWhere = where;
        assert.equal(page, 2);
        assert.equal(limit, 5);

        return [
          {
            id: 'bp-1',
            title: 'Cake Tips',
            tags: [{ tag: { id: 't1', name: 'New', slug: 'new' } }],
          },
        ];
      },
      countPosts: async () => 11,
    },
  );

  assert.deepEqual(capturedWhere, {
    status: 'PUBLISHED',
    OR: [
      { title: { contains: 'cake', mode: 'insensitive' } },
      { excerpt: { contains: 'cake', mode: 'insensitive' } },
    ],
    category: { slug: 'tips' },
    tags: { some: { tag: { slug: 'new' } } },
  });
  assert.equal(result.body.success, true);
  assert.equal(result.body.data.posts.length, 1);
  assert.deepEqual(result.body.data.posts[0].tags, [
    { id: 't1', name: 'New', slug: 'new' },
  ]);
  assert.equal(result.body.data.pagination.page, 2);
  assert.equal(result.body.data.pagination.limit, 5);
  assert.equal(result.body.data.pagination.totalPages, 3);
});
