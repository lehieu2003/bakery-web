import test from 'node:test';
import assert from 'node:assert/strict';
import { membershipBenefitsService } from '@/services/membership-benefits.service';
import { http } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';

test('membershipBenefitsService.getCurrent uses membership benefits endpoint', async () => {
  const originalGet = http.get;
  let capturedUrl = '';
  let capturedConfig: unknown = null;

  (http as { get: typeof http.get }).get = async (url, config) => {
    capturedUrl = url;
    capturedConfig = config;
    return {
      success: true,
      data: {
        user: { id: 'u1', memberLevel: 'GOLD', points: 450 },
        benefits: {
          tiers: [],
          currentTier: {
            level: 'GOLD',
            label: 'Gold',
            minPoints: 300,
            discountPercent: 7,
          },
          nextTier: {
            level: 'PLATINUM',
            label: 'Platinum',
            minPoints: 900,
            pointsNeeded: 450,
          },
          eligibility: {
            isHighestTier: false,
            message: '450 more points to unlock Platinum benefits.',
          },
          pointsPerOrder: 10000,
        },
      } as never,
    };
  };

  try {
    const result = await membershipBenefitsService.getCurrent();
    assert.equal(capturedUrl, ENDPOINTS.MEMBERSHIP.BENEFITS);
    assert.deepEqual(capturedConfig, {
      skipAuthRedirect: true,
      showErrorToast: false,
    });
    assert.equal(result.user.memberLevel, 'GOLD');
  } finally {
    (http as { get: typeof http.get }).get = originalGet;
  }
});
