import test from 'node:test';
import assert from 'node:assert/strict';
import { incentiveDiscoveryService } from '@/services/incentive-discovery.service';
import { http } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';

test('incentiveDiscoveryService.getAvailable uses incentives endpoint with subtotal param', async () => {
  const originalGet = http.get;
  let capturedUrl = '';
  let capturedConfig: unknown = null;

  (http as { get: typeof http.get }).get = async (url, config) => {
    capturedUrl = url;
    capturedConfig = config;
    return {
      success: true,
      data: {
        incentives: [
          {
            code: 'WELCOME10',
            type: 'PERCENTAGE',
            value: 10,
            minOrder: 200000,
            maxDiscount: null,
            endAt: '2026-12-31T23:59:59.000Z',
          },
        ],
      } as never,
    };
  };

  try {
    const result = await incentiveDiscoveryService.getAvailable({ subtotal: 200000 });
    assert.equal(capturedUrl, ENDPOINTS.INCENTIVES.AVAILABLE);
    assert.deepEqual(capturedConfig, {
      params: {
        subtotal: 200000,
        cart: undefined,
        productIds: undefined,
      },
      skipAuthRedirect: true,
      showErrorToast: false,
    });
    assert.equal(result.length, 1);
    assert.equal(result[0].code, 'WELCOME10');
  } finally {
    (http as { get: typeof http.get }).get = originalGet;
  }
});

test('incentiveDiscoveryService.getAvailable includes cart query when provided', async () => {
  const originalGet = http.get;
  let capturedConfig: unknown = null;

  (http as { get: typeof http.get }).get = async (_url, config) => {
    capturedConfig = config;
    return {
      success: true,
      data: { incentives: [] } as never,
    };
  };

  try {
    await incentiveDiscoveryService.getAvailable({
      subtotal: 250000,
      cart: [
        { productId: 'p2', quantity: 1 },
        { productId: 'p1', quantity: 2 },
      ],
    });
    assert.deepEqual(capturedConfig, {
      params: {
        subtotal: 250000,
        cart: 'p1:2,p2:1',
        productIds: undefined,
      },
      skipAuthRedirect: true,
      showErrorToast: false,
    });
  } finally {
    (http as { get: typeof http.get }).get = originalGet;
  }
});

