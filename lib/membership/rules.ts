import { prisma } from '@/lib/prisma';
import type { MemberLevel } from '@/types/api.types';

export type MembershipLevelRule = {
  level: MemberLevel;
  label: string;
  minPoints: number;
  discountPercent: number;
};

export type MembershipRulesConfig = {
  levels: MembershipLevelRule[];
  pointsPerOrder: number;
};

export const MEMBERSHIP_SETTING_KEYS = {
  SILVER_MIN_POINTS: 'membership_silver_min_points',
  SILVER_DISCOUNT: 'membership_silver_discount',
  GOLD_MIN_POINTS: 'membership_gold_min_points',
  GOLD_DISCOUNT: 'membership_gold_discount',
  PLATINUM_MIN_POINTS: 'membership_platinum_min_points',
  PLATINUM_DISCOUNT: 'membership_platinum_discount',
  POINTS_PER_ORDER: 'membership_points_per_order',
} as const;

export const DEFAULT_MEMBERSHIP_RULES: MembershipRulesConfig = {
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
  pointsPerOrder: 10000,
};

type MembershipSettingsDeps = {
  findSettings: (keys: string[]) => Promise<Array<{ key: string; value: string }>>;
};

const defaultMembershipSettingsDeps: MembershipSettingsDeps = {
  findSettings: async (keys) =>
    prisma.setting.findMany({
      where: {
        key: {
          in: keys,
        },
      },
      select: {
        key: true,
        value: true,
      },
    }),
};

function parseIntOrFallback(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampInt(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  const rounded = Math.round(value);
  if (rounded < min) return min;
  if (rounded > max) return max;
  return rounded;
}

function sanitizeMinPoints(value: number) {
  return Math.max(clampInt(value, 0, Number.MAX_SAFE_INTEGER), 0);
}

function sanitizeDiscountPercent(value: number) {
  return clampInt(value, 0, 100);
}

function sanitizePointsPerOrder(value: number) {
  return Math.max(clampInt(value, 1, Number.MAX_SAFE_INTEGER), 1);
}

function sortLevels(levels: MembershipLevelRule[]) {
  return [...levels].sort((a, b) => a.minPoints - b.minPoints);
}

function getSafeLevels(levels: MembershipLevelRule[]) {
  const source = levels.length > 0 ? levels : DEFAULT_MEMBERSHIP_RULES.levels;

  const sanitized = source.map((level) => ({
    ...level,
    minPoints: sanitizeMinPoints(level.minPoints),
    discountPercent: sanitizeDiscountPercent(level.discountPercent),
  }));

  return sortLevels(sanitized);
}

export async function getMembershipRulesConfig(
  deps: MembershipSettingsDeps = defaultMembershipSettingsDeps,
): Promise<MembershipRulesConfig> {
  const keys = Object.values(MEMBERSHIP_SETTING_KEYS);
  const rows = await deps.findSettings(keys);
  const settingsMap = Object.fromEntries(rows.map((row) => [row.key, row.value]));

  const levels = getSafeLevels([
    {
      level: 'SILVER',
      label: 'Silver',
      minPoints: parseIntOrFallback(
        settingsMap[MEMBERSHIP_SETTING_KEYS.SILVER_MIN_POINTS],
        DEFAULT_MEMBERSHIP_RULES.levels[0].minPoints,
      ),
      discountPercent: parseIntOrFallback(
        settingsMap[MEMBERSHIP_SETTING_KEYS.SILVER_DISCOUNT],
        DEFAULT_MEMBERSHIP_RULES.levels[0].discountPercent,
      ),
    },
    {
      level: 'GOLD',
      label: 'Gold',
      minPoints: parseIntOrFallback(
        settingsMap[MEMBERSHIP_SETTING_KEYS.GOLD_MIN_POINTS],
        DEFAULT_MEMBERSHIP_RULES.levels[1].minPoints,
      ),
      discountPercent: parseIntOrFallback(
        settingsMap[MEMBERSHIP_SETTING_KEYS.GOLD_DISCOUNT],
        DEFAULT_MEMBERSHIP_RULES.levels[1].discountPercent,
      ),
    },
    {
      level: 'PLATINUM',
      label: 'Platinum',
      minPoints: parseIntOrFallback(
        settingsMap[MEMBERSHIP_SETTING_KEYS.PLATINUM_MIN_POINTS],
        DEFAULT_MEMBERSHIP_RULES.levels[2].minPoints,
      ),
      discountPercent: parseIntOrFallback(
        settingsMap[MEMBERSHIP_SETTING_KEYS.PLATINUM_DISCOUNT],
        DEFAULT_MEMBERSHIP_RULES.levels[2].discountPercent,
      ),
    },
  ]);

  return {
    levels,
    pointsPerOrder: sanitizePointsPerOrder(
      parseIntOrFallback(
        settingsMap[MEMBERSHIP_SETTING_KEYS.POINTS_PER_ORDER],
        DEFAULT_MEMBERSHIP_RULES.pointsPerOrder,
      ),
    ),
  };
}

export function normalizeMembershipLevel(
  level: string | null | undefined,
): MemberLevel | null {
  if (!level) return null;
  const upper = level.toUpperCase();
  if (upper === 'SILVER' || upper === 'GOLD' || upper === 'PLATINUM') {
    return upper;
  }

  return null;
}

export function getLevelRule(
  config: MembershipRulesConfig,
  level: string | null | undefined,
): MembershipLevelRule | null {
  const normalized = normalizeMembershipLevel(level);
  if (!normalized) return null;

  return getSafeLevels(config.levels).find((item) => item.level === normalized) ?? null;
}

export function getDiscountPercentForLevel(
  config: MembershipRulesConfig,
  level: string | null | undefined,
) {
  const discountPercent = getLevelRule(config, level)?.discountPercent ?? 0;
  return sanitizeDiscountPercent(discountPercent);
}

export type MembershipBenefitsView = {
  tiers: Array<MembershipLevelRule & { isEligible: boolean }>;
  currentTier: MembershipLevelRule;
  nextTier: {
    level: MemberLevel;
    label: string;
    minPoints: number;
    pointsNeeded: number;
  } | null;
  eligibility: {
    isHighestTier: boolean;
    message: string;
  };
};

export function buildMembershipBenefitsView(args: {
  config: MembershipRulesConfig;
  memberLevel: string | null | undefined;
  points: number;
}): MembershipBenefitsView {
  const points = Number.isFinite(args.points) && args.points > 0 ? args.points : 0;
  const sortedLevels = getSafeLevels(args.config.levels);
  const safeConfig = {
    ...args.config,
    levels: sortedLevels,
  };

  const tiers = sortedLevels.map((item) => ({
    ...item,
    isEligible: points >= item.minPoints,
  }));

  const levelFromProfile = getLevelRule(safeConfig, args.memberLevel);
  const levelFromPoints = [...tiers].reverse().find((item) => item.isEligible) ?? tiers[0];

  const currentTier = levelFromProfile ?? levelFromPoints;
  const currentTierIndex = sortedLevels.findIndex(
    (item) => item.level === currentTier.level,
  );
  const nextTier =
    currentTierIndex >= 0 ? (sortedLevels[currentTierIndex + 1] ?? null) : null;

  if (!nextTier) {
    return {
      tiers,
      currentTier,
      nextTier: null,
      eligibility: {
        isHighestTier: true,
        message: 'You have reached the highest membership tier.',
      },
    };
  }

  const pointsNeeded = Math.max(nextTier.minPoints - points, 0);

  return {
    tiers,
    currentTier,
    nextTier: {
      level: nextTier.level,
      label: nextTier.label,
      minPoints: nextTier.minPoints,
      pointsNeeded,
    },
    eligibility: {
      isHighestTier: false,
      message: `${pointsNeeded} more points to unlock ${nextTier.label} benefits.`,
    },
  };
}
