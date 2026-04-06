import test from 'node:test';
import assert from 'node:assert/strict';
import { handleGetMembershipBenefitsRequest } from '@/app/api/membership/benefits/route';

test('GET /api/membership/benefits returns 401 for unauthenticated user', async () => {
  const result = await handleGetMembershipBenefitsRequest({} as never, {
    getCurrentUser: async () => null,
    getMembershipConfig: async () => ({
      levels: [],
      pointsPerOrder: 10000,
    }),
  });

  assert.equal(result.status, 401);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Unauthorized');
});

test('GET /api/membership/benefits returns tier context and eligibility explanation for authenticated user', async () => {
  const result = await handleGetMembershipBenefitsRequest({} as never, {
    getCurrentUser: async () => ({
      id: 'u1',
      memberLevel: 'GOLD',
      points: 450,
    }),
    getMembershipConfig: async () => ({
      pointsPerOrder: 10000,
      levels: [
        {
          level: 'SILVER',
          label: 'Silver',
          minPoints: 0,
          discountPercent: 3,
        },
        {
          level: 'GOLD',
          label: 'Gold',
          minPoints: 300,
          discountPercent: 7,
        },
        {
          level: 'PLATINUM',
          label: 'Platinum',
          minPoints: 900,
          discountPercent: 12,
        },
      ],
    }),
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data?.user.memberLevel, 'GOLD');
  assert.equal(result.body.data?.user.points, 450);
  assert.equal(result.body.data?.benefits.currentTier.level, 'GOLD');
  assert.equal(result.body.data?.benefits.currentTier.discountPercent, 7);
  assert.equal(result.body.data?.benefits.nextTier?.level, 'PLATINUM');
  assert.equal(result.body.data?.benefits.nextTier?.pointsNeeded, 450);
  assert.equal(result.body.data?.benefits.eligibility.isHighestTier, false);
  assert.match(result.body.data?.benefits.eligibility.message ?? '', /450/i);
});
