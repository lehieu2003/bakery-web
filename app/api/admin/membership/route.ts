import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

// Membership level configuration is stored in settings
const MEMBERSHIP_KEYS = {
  SILVER_MIN_POINTS: 'membership_silver_min_points',
  SILVER_DISCOUNT: 'membership_silver_discount',
  GOLD_MIN_POINTS: 'membership_gold_min_points',
  GOLD_DISCOUNT: 'membership_gold_discount',
  PLATINUM_MIN_POINTS: 'membership_platinum_min_points',
  PLATINUM_DISCOUNT: 'membership_platinum_discount',
  POINTS_PER_ORDER: 'membership_points_per_order', // Points earned per VND spent
};

const DEFAULT_CONFIG = {
  [MEMBERSHIP_KEYS.SILVER_MIN_POINTS]: '0',
  [MEMBERSHIP_KEYS.SILVER_DISCOUNT]: '3',
  [MEMBERSHIP_KEYS.GOLD_MIN_POINTS]: '300',
  [MEMBERSHIP_KEYS.GOLD_DISCOUNT]: '7',
  [MEMBERSHIP_KEYS.PLATINUM_MIN_POINTS]: '900',
  [MEMBERSHIP_KEYS.PLATINUM_DISCOUNT]: '12',
  [MEMBERSHIP_KEYS.POINTS_PER_ORDER]: '10000', // 1 point per 10,000 VND
};

// GET: Get membership configuration
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settings = await (prisma as any).setting.findMany({
      where: {
        key: { in: Object.values(MEMBERSHIP_KEYS) },
      },
    });

    const settingsMap: Record<string, string> = {};
    settings.forEach((s: { key: string; value: string }) => {
      settingsMap[s.key] = s.value;
    });

    // Apply defaults
    const config = { ...DEFAULT_CONFIG, ...settingsMap };

    // Format response
    const levels = [
      {
        level: 'SILVER',
        label: 'Silver',
        minPoints: parseInt(config[MEMBERSHIP_KEYS.SILVER_MIN_POINTS]),
        discountPercent: parseInt(config[MEMBERSHIP_KEYS.SILVER_DISCOUNT]),
      },
      {
        level: 'GOLD',
        label: 'Gold',
        minPoints: parseInt(config[MEMBERSHIP_KEYS.GOLD_MIN_POINTS]),
        discountPercent: parseInt(config[MEMBERSHIP_KEYS.GOLD_DISCOUNT]),
      },
      {
        level: 'PLATINUM',
        label: 'Platinum',
        minPoints: parseInt(config[MEMBERSHIP_KEYS.PLATINUM_MIN_POINTS]),
        discountPercent: parseInt(config[MEMBERSHIP_KEYS.PLATINUM_DISCOUNT]),
      },
    ];

    // Get member counts per level
    const [silverCount, goldCount, platinumCount] = await Promise.all([
      prisma.user.count({ where: { role: 'CUSTOMER', memberLevel: 'SILVER' } }),
      prisma.user.count({ where: { role: 'CUSTOMER', memberLevel: 'GOLD' } }),
      prisma.user.count({
        where: { role: 'CUSTOMER', memberLevel: 'PLATINUM' },
      }),
    ]);

    const memberCountMap: Record<string, number> = {
      SILVER: silverCount,
      GOLD: goldCount,
      PLATINUM: platinumCount,
    };

    const levelsWithCounts = levels.map((l) => ({
      ...l,
      memberCount: memberCountMap[l.level] || 0,
    }));

    return NextResponse.json({
      success: true,
      data: {
        levels: levelsWithCounts,
        pointsPerOrder: parseInt(config[MEMBERSHIP_KEYS.POINTS_PER_ORDER]),
      },
    });
  } catch (error) {
    console.error('Get membership config error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch membership config' },
      { status: 500 },
    );
  }
}

// PUT: Update membership configuration
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { levels, pointsPerOrder } = body;

    // Update levels
    if (Array.isArray(levels)) {
      for (const level of levels) {
        const keyPrefix = `membership_${level.level.toLowerCase()}`;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma as any).setting.upsert({
          where: { key: `${keyPrefix}_min_points` },
          update: { value: String(level.minPoints) },
          create: {
            key: `${keyPrefix}_min_points`,
            value: String(level.minPoints),
          },
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma as any).setting.upsert({
          where: { key: `${keyPrefix}_discount` },
          update: { value: String(level.discountPercent) },
          create: {
            key: `${keyPrefix}_discount`,
            value: String(level.discountPercent),
          },
        });
      }
    }

    // Update points per order
    if (pointsPerOrder !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).setting.upsert({
        where: { key: MEMBERSHIP_KEYS.POINTS_PER_ORDER },
        update: { value: String(pointsPerOrder) },
        create: {
          key: MEMBERSHIP_KEYS.POINTS_PER_ORDER,
          value: String(pointsPerOrder),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Membership configuration updated',
    });
  } catch (error) {
    console.error('Update membership config error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update membership config' },
      { status: 500 },
    );
  }
}
