import assert from 'node:assert/strict';
import test from 'node:test';

import { handleAdminBlogPostsPostRequest } from '@/app/api/admin/blog/posts/route';
import { handleAdminBlogPostPutRequest } from '@/app/api/admin/blog/posts/[id]/route';
import { handleAdminBlogPostStatusPatchRequest } from '@/app/api/admin/blog/posts/[id]/status/route';
import { handleAdminBlogCategoriesPostRequest } from '@/app/api/admin/blog/categories/route';
import { handleAdminBlogCategoryPutRequest } from '@/app/api/admin/blog/categories/[id]/route';
import { handleAdminBlogTagsPostRequest } from '@/app/api/admin/blog/tags/route';

function makeRequest(body: unknown) {
  return {
    json: async () => body,
  } as never;
}

test('admin blog post create rejects invalid status', async () => {
  const result = await handleAdminBlogPostsPostRequest(
    makeRequest({
      title: 'Cake Story',
      content: 'Content',
      status: 'INVALID',
    }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      listPosts: async () => [],
      countPosts: async () => 0,
      findPostBySlug: async () => null,
      findCategoryById: async () => null,
      findTagsByIds: async () => [],
      createPost: async () => ({ tags: [] }),
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Trạng thái bài viết không hợp lệ');
});

test('admin blog post create rejects unknown tag ids', async () => {
  const result = await handleAdminBlogPostsPostRequest(
    makeRequest({
      title: 'Cake Story',
      content: 'Content',
      tagIds: ['tag-1', 'tag-2'],
    }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      listPosts: async () => [],
      countPosts: async () => 0,
      findPostBySlug: async () => null,
      findCategoryById: async () => null,
      findTagsByIds: async () => [{ id: 'tag-1' }],
      createPost: async () => ({ tags: [] }),
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Có thẻ bài viết không tồn tại');
});

test('admin blog post create de-duplicates tag ids', async () => {
  let capturedTagIds: string[] = [];

  const result = await handleAdminBlogPostsPostRequest(
    makeRequest({
      title: 'Cake Story',
      content: 'Content',
      tagIds: ['tag-1', 'tag-1', 'tag-2'],
    }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      listPosts: async () => [],
      countPosts: async () => 0,
      findPostBySlug: async () => null,
      findCategoryById: async () => null,
      findTagsByIds: async () => [{ id: 'tag-1' }, { id: 'tag-2' }],
      createPost: async ({ payload }) => {
        capturedTagIds = payload.tagIds;
        return { id: 'post-1', tags: [] };
      },
    },
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.deepEqual(capturedTagIds, ['tag-1', 'tag-2']);
});

test('admin blog post update rejects non-array tagIds', async () => {
  const result = await handleAdminBlogPostPutRequest(
    makeRequest({ tagIds: 'tag-1' }),
    Promise.resolve({ id: 'post-1' }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findPostById: async () => ({
        id: 'post-1',
        title: 'Cake Story',
        slug: 'cake-story',
        excerpt: null,
        content: 'Content',
        coverUrl: null,
        categoryId: null,
        status: 'DRAFT',
        publishedAt: null,
        metaTitle: null,
        metaDescription: null,
      }),
      findPostDetailById: async () => null,
      findPostBySlug: async () => null,
      findCategoryById: async () => null,
      findTagsByIds: async () => [],
      updatePostWithTagsById: async () => ({ id: 'post-1', tags: [] }),
      deletePostById: async () => undefined,
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'tagIds must be an array of strings');
});

test('admin blog post update preserves historical publishedAt on non-status edits', async () => {
  let capturedPayload: Record<string, unknown> | null = null;

  const result = await handleAdminBlogPostPutRequest(
    makeRequest({ title: 'Updated title' }),
    Promise.resolve({ id: 'post-1' }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findPostById: async () => ({
        id: 'post-1',
        title: 'Cake Story',
        slug: 'cake-story',
        excerpt: null,
        content: 'Content',
        coverUrl: null,
        categoryId: null,
        status: 'ARCHIVED',
        publishedAt: new Date('2026-04-01T00:00:00.000Z'),
        metaTitle: null,
        metaDescription: null,
      }),
      findPostDetailById: async () => null,
      findPostBySlug: async () => null,
      findCategoryById: async () => null,
      findTagsByIds: async () => [],
      updatePostWithTagsById: async ({ payload }) => {
        capturedPayload = payload as Record<string, unknown>;
        return { id: 'post-1', tags: [] };
      },
      deletePostById: async () => undefined,
    },
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.ok(capturedPayload);
  assert.equal(Object.hasOwn(capturedPayload as object, 'publishedAt'), false);
});

test('admin blog post status rejects invalid status', async () => {
  const result = await handleAdminBlogPostStatusPatchRequest(
    makeRequest({ status: 'INVALID' }),
    Promise.resolve({ id: 'post-1' }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findPostById: async () => ({ id: 'post-1', publishedAt: null }),
      updatePostStatusById: async () => ({ id: 'post-1', tags: [] }),
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Trạng thái không hợp lệ');
});

test('admin blog category create rejects non-numeric displayOrder', async () => {
  const result = await handleAdminBlogCategoriesPostRequest(
    makeRequest({
      name: 'Tips',
      displayOrder: '1',
    }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      listCategories: async () => [],
      findCategoryBySlug: async () => null,
      createCategory: async () => ({}),
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Thứ tự hiển thị phải là số nguyên không âm');
});

test('admin blog category update rejects non-boolean isActive', async () => {
  const result = await handleAdminBlogCategoryPutRequest(
    makeRequest({ isActive: 'true' }),
    Promise.resolve({ id: 'cat-1' }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      findCategoryById: async () => ({ id: 'cat-1', name: 'Tips' }),
      findCategoryDetailById: async () => null,
      findCategoryBySlugExcludingId: async () => null,
      updateCategoryById: async () => ({}),
      countPostsByCategoryId: async () => 0,
      deleteCategoryById: async () => undefined,
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'isActive must be a boolean');
});

test('admin blog tags create requires name', async () => {
  const result = await handleAdminBlogTagsPostRequest(
    makeRequest({
      name: '   ',
    }),
    {
      requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' }),
      listTags: async () => [],
      findTagBySlug: async () => null,
      createTag: async () => ({}),
    },
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'name is required');
});
