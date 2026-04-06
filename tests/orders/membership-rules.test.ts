import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMembershipBenefitsView,
  getDiscountPercentForLevel,
  getMembershipRulesConfig,
  type MembershipRulesConfig,
} from '@/lib/membership/rules';

const config: MembershipRulesConfig = {
  pointsPerOrder: 10000,
  levels: [
    { level: 'SILVER', label: 'Silver', minPoints: 0, discountPercent: 3 },
    { level: 'GOLD', label: 'Gold', minPoints: 300, discountPercent: 7 },
    {
      level: 'PLATINUM',
      label: 'Platinum',
      minPoints: 900,
      discountPercent: 12,
    },
  ],
};

test('getDiscountPercentForLevel resolves configured level discount', () => {
  assert.equal(getDiscountPercentForLevel(config, 'GOLD'), 7);
  assert.equal(getDiscountPercentForLevel(config, 'PLATINUM'), 12);
  assert.equal(getDiscountPercentForLevel(config, 'UNKNOWN'), 0);
});

test('getDiscountPercentForLevel clamps invalid discount values', () => {
  const invalidConfig: MembershipRulesConfig = {
    pointsPerOrder: 10000,
    levels: [
      { level: 'SILVER', label: 'Silver', minPoints: 0, discountPercent: -10 },
      { level: 'GOLD', label: 'Gold', minPoints: 300, discountPercent: 250 },
      {
        level: 'PLATINUM',
        label: 'Platinum',
        minPoints: 900,
        discountPercent: 12,
      },
    ],
  };

  assert.equal(getDiscountPercentForLevel(invalidConfig, 'SILVER'), 0);
  assert.equal(getDiscountPercentForLevel(invalidConfig, 'GOLD'), 100);
});

test('getMembershipRulesConfig sanitizes invalid persisted settings values', async () => {
  const loaded = await getMembershipRulesConfig({
    findSettings: async () => [
      { key: 'membership_silver_discount', value: '-5' },
      { key: 'membership_gold_discount', value: '999' },
      { key: 'membership_platinum_min_points', value: '-100' },
      { key: 'membership_points_per_order', value: '0' },
    ],
  });

  const silver = loaded.levels.find((level) => level.level === 'SILVER');
  const gold = loaded.levels.find((level) => level.level === 'GOLD');
  const platinum = loaded.levels.find((level) => level.level === 'PLATINUM');

  assert.equal(silver?.discountPercent, 0);
  assert.equal(gold?.discountPercent, 100);
  assert.equal(platinum?.minPoints, 0);
  assert.equal(loaded.pointsPerOrder, 1);
});

test('buildMembershipBenefitsView provides eligibility explanation for next tier', () => {
  const result = buildMembershipBenefitsView({
    config,
    memberLevel: 'GOLD',
    points: 450,
  });

  assert.equal(result.currentTier.level, 'GOLD');
  assert.equal(result.nextTier?.level, 'PLATINUM');
  assert.equal(result.nextTier?.pointsNeeded, 450);
  assert.equal(result.eligibility.isHighestTier, false);
  assert.match(result.eligibility.message, /450/i);
});

test('buildMembershipBenefitsView computes next tier from current profile tier', () => {
  const result = buildMembershipBenefitsView({
    config,
    memberLevel: 'GOLD',
    points: 100,
  });

  assert.equal(result.currentTier.level, 'GOLD');
  assert.equal(result.nextTier?.level, 'PLATINUM');
  assert.equal(/unlock Gold/i.test(result.eligibility.message), false);
  assert.match(result.eligibility.message, /Platinum/i);
});

test('buildMembershipBenefitsView reports highest tier correctly', () => {
  const result = buildMembershipBenefitsView({
    config,
    memberLevel: 'PLATINUM',
    points: 1500,
  });

  assert.equal(result.currentTier.level, 'PLATINUM');
  assert.equal(result.nextTier, null);
  assert.equal(result.eligibility.isHighestTier, true);
});
