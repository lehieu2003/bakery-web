import test from 'node:test';
import assert from 'node:assert/strict';
import { handleGetMembershipBenefitsRequest } from '@/app/api/membership/benefits/route';

const CONFIG = {
  pointsPerOrder: 10000,
  levels: [
    {
      level: 'SILVER' as const,
      label: 'Silver',
      minPoints: 0,
      discountPercent: 3,
    },
    {
      level: 'GOLD' as const,
      label: 'Gold',
      minPoints: 300,
      discountPercent: 7,
    },
    {
      level: 'PLATINUM' as const,
      label: 'Platinum',
      minPoints: 900,
      discountPercent: 12,
    },
  ],
};

test('GET /api/membership/benefits returns tier catalogue for guests (no user slice)', async () => {
  const result = await handleGetMembershipBenefitsRequest({} as never, {
    getCurrentUser: async () => null,
    getMembershipConfig: async () => CONFIG,
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  const data = result.body.data;
  if (!data || data.user !== null) {
    assert.fail('guest response must carry user: null');
  }
  const tiers = 'tiers' in data.benefits ? data.benefits.tiers : [];
  assert.equal(tiers.length, 3);
  assert.equal(tiers[1]?.level, 'GOLD');
  assert.equal(tiers[1]?.minPoints, 300);
  assert.equal(tiers[1]?.discountPercent, 7);
  assert.equal(
    'pointsPerOrder' in data.benefits ? data.benefits.pointsPerOrder : 0,
    10000,
  );
});

test('GET /api/membership/benefits returns tier context and eligibility explanation for authenticated user', async () => {
  const result = await handleGetMembershipBenefitsRequest({} as never, {
    getCurrentUser: async () => ({
      id: 'u1',
      memberLevel: 'GOLD',
      points: 450,
    }),
    getMembershipConfig: async () => CONFIG,
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  const data = result.body.data;
  if (!data || !data.user) {
    assert.fail('authenticated response must carry a user');
  }
  const benefits = data.benefits as {
    tiers: unknown[];
    currentTier: { level: string; discountPercent: number };
    nextTier: { level: string; pointsNeeded: number } | null;
    eligibility: { isHighestTier: boolean; message: string };
    pointsPerOrder: number;
  };
  assert.equal(data.user.memberLevel, 'GOLD');
  assert.equal(data.user.points, 450);
  assert.equal(benefits.currentTier.level, 'GOLD');
  assert.equal(benefits.currentTier.discountPercent, 7);
  assert.equal(benefits.nextTier?.level, 'PLATINUM');
  assert.equal(benefits.nextTier?.pointsNeeded, 450);
  assert.equal(benefits.eligibility.isHighestTier, false);
  assert.match(benefits.eligibility.message, /450/i);
});
