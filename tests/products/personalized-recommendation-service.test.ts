import test from 'node:test';
import assert from 'node:assert/strict';
import { personalizedRecommendationService } from '@/services/personalized-recommendation.service';
import { http } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';

test('personalizedRecommendationService.getPersonalized uses personalized endpoint with limit param', async () => {
  const originalGet = http.get;
  let capturedUrl = '';
  let capturedConfig: unknown = null;

  (http as { get: typeof http.get }).get = async (url, config) => {
    capturedUrl = url;
    capturedConfig = config;

    return {
      success: true,
      data: {
        products: [{ id: 'p-1', name: 'Chocolate Cake' }],
        source: 'fallback',
        reason: 'no-user',
      } as never,
    };
  };

  try {
    const result = await personalizedRecommendationService.getPersonalized({
      limit: 8,
    });

    assert.equal(capturedUrl, ENDPOINTS.PUBLIC.PERSONALIZED_PRODUCTS);
    assert.deepEqual(capturedConfig, {
      params: {
        limit: 8,
      },
      skipAuthRedirect: true,
      showErrorToast: false,
    });

    assert.equal(result.products.length, 1);
    assert.equal(result.source, 'fallback');
    assert.equal(result.reason, 'no-user');
  } finally {
    (http as { get: typeof http.get }).get = originalGet;
  }
});

test('personalizedRecommendationService.getPersonalized falls back to safe empty payload', async () => {
  const originalGet = http.get;

  (http as { get: typeof http.get }).get = async () => ({
    success: true,
    data: undefined,
  });

  try {
    const result = await personalizedRecommendationService.getPersonalized();

    assert.deepEqual(result, {
      products: [],
      source: 'fallback',
      reason: 'no-signal',
    });
  } finally {
    (http as { get: typeof http.get }).get = originalGet;
  }
});
