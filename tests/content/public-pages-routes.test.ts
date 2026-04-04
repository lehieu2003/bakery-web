import test from 'node:test';
import assert from 'node:assert/strict';
import {
  handleGetPublicPagesRequest,
} from '@/app/api/public/pages/route';
import {
  handleGetPublicPageBySlugRequest,
} from '@/app/api/public/pages/[slug]/route';

test('public pages list route returns success envelope and data', async () => {
  const result = await handleGetPublicPagesRequest({
    findPublishedPages: async () => [
      {
        id: 'pg-1',
        title: 'Privacy Policy',
        slug: 'privacy-policy',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      },
    ],
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data.length, 1);
  assert.equal(result.body.data[0].slug, 'privacy-policy');
});

test('public page detail route rejects empty slug', async () => {
  const result = await handleGetPublicPageBySlugRequest('   ', {
    findPublishedPageBySlug: async () => null,
  });

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
});

test('public page detail route returns 404 when page is not found', async () => {
  const result = await handleGetPublicPageBySlugRequest('missing-page', {
    findPublishedPageBySlug: async () => null,
  });

  assert.equal(result.status, 404);
  assert.equal(result.body.success, false);
});

test('public page detail route returns published page data', async () => {
  const page = {
    id: 'pg-2',
    title: 'Terms of Use',
    slug: 'terms-of-use',
    content: '<p>Terms content</p>',
    isPublished: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-03T00:00:00.000Z'),
  };

  const result = await handleGetPublicPageBySlugRequest('terms-of-use', {
    findPublishedPageBySlug: async () => page,
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data.id, 'pg-2');
  assert.equal(result.body.data.slug, 'terms-of-use');
});
