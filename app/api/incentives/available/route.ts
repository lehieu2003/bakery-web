import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type IncentiveReadModel = {
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: unknown;
  minOrder: unknown | null;
  maxDiscount: unknown | null;
  usageLimit: number | null;
  startAt: Date;
  endAt: Date;
  isActive: boolean;
};

type IncentivesAvailableRouteDeps = {
  listIncentives: () => Promise<IncentiveReadModel[]>;
  now: () => Date;
};

const defaultDeps: IncentivesAvailableRouteDeps = {
  listIncentives: async () => {
    const coupons = await prisma.coupon.findMany({
      select: {
        code: true,
        type: true,
        value: true,
        minOrder: true,
        maxDiscount: true,
        usageLimit: true,
        startAt: true,
        endAt: true,
        isActive: true,
      },
      orderBy: [{ endAt: 'asc' }, { code: 'asc' }],
    });

    return coupons.map((coupon) => ({
      ...coupon,
      type: coupon.type as 'PERCENTAGE' | 'FIXED',
    }));
  },
  now: () => new Date(),
};

function asNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (
    value &&
    typeof value === 'object' &&
    'toNumber' in value &&
    typeof (value as { toNumber?: unknown }).toNumber === 'function'
  ) {
    const parsed = (value as { toNumber: () => number }).toNumber();
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function parseSubtotal(request: NextRequest): { subtotal: number | null; error?: string } {
  const searchParams = (
    request as unknown as { nextUrl?: { searchParams?: URLSearchParams } }
  ).nextUrl?.searchParams;
  const raw = searchParams?.get?.('subtotal') ?? null;

  if (raw === null || raw.trim() === '') {
    return { subtotal: null };
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return { subtotal: null, error: 'Invalid subtotal query parameter' };
  }

  return { subtotal: parsed };
}

export async function handleGetAvailableIncentivesRequest(
  request: NextRequest,
  deps: IncentivesAvailableRouteDeps = defaultDeps,
) {
  const { subtotal, error } = parseSubtotal(request);
  if (error) {
    return {
      status: 400,
      body: {
        success: false,
        error,
      },
    };
  }

  const now = deps.now();
  const incentives = await deps.listIncentives();

  const data = incentives
    .filter((incentive) => {
      if (!incentive.isActive) return false;
      if (now < incentive.startAt || now > incentive.endAt) return false;
      if (incentive.usageLimit !== null && incentive.usageLimit <= 0) return false;

      const minOrder = asNumber(incentive.minOrder);
      if (subtotal !== null && minOrder > 0 && subtotal < minOrder) {
        return false;
      }

      return true;
    })
    .map((incentive) => ({
      code: incentive.code,
      type: incentive.type,
      value: Math.max(asNumber(incentive.value), 0),
      minOrder: (() => {
        const parsed = asNumber(incentive.minOrder);
        return parsed > 0 ? parsed : null;
      })(),
      maxDiscount: (() => {
        const parsed = asNumber(incentive.maxDiscount);
        return parsed > 0 ? parsed : null;
      })(),
      endAt: incentive.endAt.toISOString(),
    }));

  return {
    status: 200,
    body: {
      success: true,
      data: {
        incentives: data,
      },
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const result = await handleGetAvailableIncentivesRequest(request, defaultDeps);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Get available incentives error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch available incentives' },
      { status: 500 },
    );
  }
}
