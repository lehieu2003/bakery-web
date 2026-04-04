import test from 'node:test';
import assert from 'node:assert/strict';
import { handleGetPublicBlogPostBySlugRequest } from '@/app/api/blog/posts/[slug]/route';

test('public blog detail route rejects empty slug', async () => {
  const result = await handleGetPublicBlogPostBySlugRequest('   ', {
    findPublishedPostIdBySlug: async () => null,
    incrementAndFindPublishedPostById: async () => null,
  });

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
});

test('public blog detail route returns 404 when published post is not found', async () => {
  const result = await handleGetPublicBlogPostBySlugRequest('missing-post', {
    findPublishedPostIdBySlug: async () => null,
    incrementAndFindPublishedPostById: async () => null,
  });

  assert.equal(result.status, 404);
  assert.equal(result.body.success, false);
});

test('public blog detail route increments view count and flattens tags', async () => {
  let capturedId = '';

  const result = await handleGetPublicBlogPostBySlugRequest('cake-story', {
    findPublishedPostIdBySlug: async () => ({ id: 'post-1' }),
    incrementAndFindPublishedPostById: async (id) => {
      capturedId = id;
      return {
        id,
        title: 'Cake Story',
        tags: [{ tag: { id: 'tag-1', name: 'Tips', slug: 'tips' } }],
      };
    },
  });

  assert.equal(capturedId, 'post-1');
  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.deepEqual(result.body.data.tags, [
    { id: 'tag-1', name: 'Tips', slug: 'tips' },
  ]);
});
