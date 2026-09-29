import test from 'node:test';
import assert from 'node:assert/strict';
import {
  handleListReviewsRequest,
  handleCreateReviewRequest,
  type ReviewsRouteDeps,
} from '@/app/api/products/[id]/reviews/route';

function createDeps(overrides: Partial<ReviewsRouteDeps> = {}): ReviewsRouteDeps {
  return {
    requireUser: async () => ({ id: 'u1' }),
    findActiveProduct: async (productId) =>
      productId === 'p1' ? { id: 'p1' } : null,
    listReviews: async () => ({
      reviews: [
        {
          id: 'r1', userId: 'u1', productId: 'p1', rating: 5,
          comment: 'Great banh mi', createdAt: new Date('2026-09-01'),
          user: { id: 'u1', name: 'Lan' },
        },
      ],
      total: 1,
    }),
    upsertReview: async (input) => ({
      id: 'r1', userId: input.userId, productId: input.productId,
      rating: input.rating, comment: input.comment,
      createdAt: new Date('2026-09-01'),
      user: { id: 'u1', name: 'Lan' },
    }),
    ...overrides,
  };
}

test('POST review requires an authenticated user', async () => {
  const result = await handleCreateReviewRequest(
    { json: async () => ({ rating: 5 }) },
    { id: 'p1' },
    createDeps({ requireUser: async () => { throw new Error('unauthorized'); } }),
  );
  assert.equal(result.status, 401);
  assert.equal(result.body.success, false);
});

test('POST review rejects rating outside 1-5', async () => {
  for (const rating of [0, 6, 2.5, 'x']) {
    const result = await handleCreateReviewRequest(
      { json: async () => ({ rating }) }, { id: 'p1' }, createDeps(),
    );
    assert.equal(result.status, 400);
  }
});

test('POST review rejects comment longer than 2000 chars', async () => {
  const result = await handleCreateReviewRequest(
    { json: async () => ({ rating: 4, comment: 'a'.repeat(2001) }) },
    { id: 'p1' }, createDeps(),
  );
  assert.equal(result.status, 400);
});

test('POST review 404s for unknown or inactive product', async () => {
  const result = await handleCreateReviewRequest(
    { json: async () => ({ rating: 4 }) }, { id: 'nope' }, createDeps(),
  );
  assert.equal(result.status, 404);
});

test('POST review upserts one review per user per product', async () => {
  let calls = 0;
  const result = await handleCreateReviewRequest(
    { json: async () => ({ rating: 4, comment: '  Yummy  ' }) },
    { id: 'p1' },
    createDeps({
      upsertReview: async (input) => {
        calls += 1;
        assert.equal(input.comment, 'Yummy'); // trimmed
        return {
          id: 'r1', userId: 'u1', productId: 'p1', rating: 4,
          comment: 'Yummy', createdAt: new Date(),
          user: { id: 'u1', name: 'Lan' },
        };
      },
    }),
  );
  assert.equal(result.status, 200);
  assert.equal(calls, 1);
  assert.equal(result.body.data.review.rating, 4);
});

test('GET reviews returns envelope with pagination and clamps limit', async () => {
  const result = await handleListReviewsRequest(
    'http://localhost/api/products/p1/reviews?page=0&limit=999',
    { id: 'p1' }, createDeps(),
  );
  assert.equal(result.status, 200);
  assert.equal(result.body.data.pagination.page, 1);
  assert.equal(result.body.data.pagination.limit, 50); // clamped
  assert.equal(result.body.data.reviews[0].user.name, 'Lan');
});
