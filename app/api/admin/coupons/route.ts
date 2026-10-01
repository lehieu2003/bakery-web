import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import type { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { mapAuthErrorToStatus } from '@/lib/rbac';
import { requireAdmin } from '@/lib/session';
import {
  buildRequestCorrelation,
  writeAdminActionAuditLog,
} from '@/lib/admin-action-audit';

type AdminUser = {
  id: string;
  role: UserRole;
};

type CouponCreatePayload = {
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  minOrder: number | null;
  maxDiscount: number | null;
  startAt: string;
  endAt: string;
  usageLimit: number | null;
  perUserLimit: number | null;
  isActive: boolean;
};

type CouponsRouteDeps = {
  requireAdmin: () => Promise<AdminUser>;
  findCoupons: () => Promise<unknown[]>;
  createCoupon: (
    payload: CouponCreatePayload,
  ) => Promise<Record<string, unknown>>;
  writeAdminAudit?: (payload: {
    module: string;
    entity: string;
    entityId: string;
    mutationType: string;
    summary: string;
    actorUserId?: string | null;
    actorRole?: UserRole | null;
    correlation: {
      requestId: string;
      route: string;
      httpMethod: string;
      orderId?: string | null;
      paymentId?: string | null;
      transactionId?: string | null;
      attempt?: number | null;
    };
  }) => Promise<void>;
};

type HandlerResult = {
  status: number;
  body: {
    success: boolean;
    data?: unknown;
    error?: string;
  };
};

const defaultDeps: CouponsRouteDeps = {
  requireAdmin,
  findCoupons: () =>
    prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { redemptions: true } } },
    }),
  createCoupon: (payload: CouponCreatePayload) =>
    prisma.coupon.create({
      data: {
        code: payload.code,
        type: payload.type,
        value: new Prisma.Decimal(payload.value),
        minOrder:
          payload.minOrder === null ? null : new Prisma.Decimal(payload.minOrder),
        maxDiscount:
          payload.maxDiscount === null
            ? null
            : new Prisma.Decimal(payload.maxDiscount),
        usageLimit: payload.usageLimit,
        perUserLimit: payload.perUserLimit,
        sourceType: 'PUBLIC',
        startAt: new Date(payload.startAt),
        endAt: new Date(payload.endAt),
        isActive: payload.isActive,
      },
      include: { _count: { select: { redemptions: true } } },
    }) as unknown as Promise<Record<string, unknown>>,
  writeAdminAudit: writeAdminActionAuditLog,
};

function parseCouponPayload(raw: unknown): { error: string } | { payload: CouponCreatePayload } {
  if (!raw || typeof raw !== 'object') {
    return { error: 'Invalid payload' };
  }

  const body = raw as Record<string, unknown>;

  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
  if (!/^[A-Z0-9_-]{3,40}$/.test(code)) {
    return { error: 'Code must be 3-40 characters (letters, numbers, - or _)' };
  }

  const type = body.type;
  if (type !== 'PERCENTAGE' && type !== 'FIXED') {
    return { error: 'type must be PERCENTAGE or FIXED' };
  }

  const value = typeof body.value === 'number' ? body.value : NaN;
  if (!Number.isFinite(value) || value <= 0) {
    return { error: 'value must be a positive number' };
  }
  if (type === 'PERCENTAGE' && value > 100) {
    return { error: 'PERCENTAGE value must be at most 100' };
  }

  const parseDate = (input: unknown): string | null => {
    if (typeof input !== 'string') return null;
    const date = new Date(input);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  };

  const startAt = parseDate(body.startAt);
  const endAt = parseDate(body.endAt);
  if (!startAt || !endAt) {
    return { error: 'startAt and endAt must be valid dates' };
  }
  if (new Date(endAt) <= new Date(startAt)) {
    return { error: 'endAt must be after startAt' };
  }

  const parseOptionalAmount = (input: unknown): number | null | { error: string } => {
    if (input === undefined || input === null) return null;
    const num = typeof input === 'number' ? input : NaN;
    if (!Number.isFinite(num) || num < 0) {
      return { error: 'amount fields must be non-negative numbers or null' };
    }
    return num;
  };

  const minOrder = parseOptionalAmount(body.minOrder);
  if (minOrder !== null && typeof minOrder === 'object') return minOrder;
  const maxDiscount = parseOptionalAmount(body.maxDiscount);
  if (maxDiscount !== null && typeof maxDiscount === 'object') return maxDiscount;

  const parseOptionalLimit = (input: unknown): number | null | { error: string } => {
    if (input === undefined || input === null) return null;
    const num = typeof input === 'number' ? input : NaN;
    if (!Number.isInteger(num) || num < 1) {
      return { error: 'limits must be positive integers or null' };
    }
    return num;
  };

  const usageLimit = parseOptionalLimit(body.usageLimit);
  if (usageLimit !== null && typeof usageLimit === 'object') return usageLimit;
  const perUserLimit = parseOptionalLimit(body.perUserLimit);
  if (perUserLimit !== null && typeof perUserLimit === 'object') return perUserLimit;

  return {
    payload: {
      code,
      type,
      value,
      minOrder,
      maxDiscount,
      startAt,
      endAt,
      usageLimit,
      perUserLimit,
      isActive: typeof body.isActive === 'boolean' ? body.isActive : true,
    },
  };
}

export async function handleAdminCouponsGetRequest(
  request: NextRequest,
  deps: CouponsRouteDeps = defaultDeps,
): Promise<HandlerResult> {
  await deps.requireAdmin();

  const coupons = await deps.findCoupons();

  return {
    status: 200,
    body: { success: true, data: { coupons } },
  };
}

export async function handleAdminCouponsPostRequest(
  request: NextRequest,
  deps: CouponsRouteDeps = defaultDeps,
): Promise<HandlerResult> {
  const admin = await deps.requireAdmin();

  const parsed = parseCouponPayload(await request.json());
  if ('error' in parsed) {
    return { status: 400, body: { success: false, error: parsed.error } };
  }

  let coupon: Record<string, unknown>;
  try {
    coupon = await deps.createCoupon(parsed.payload);
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      return {
        status: 400,
        body: { success: false, error: 'Coupon code already exists' },
      };
    }
    throw error;
  }

  const headers =
    typeof (request as unknown as { headers?: Headers }).headers?.get === 'function'
      ? (request as unknown as { headers: Headers }).headers
      : new Headers();
  if (deps.writeAdminAudit) {
    await deps.writeAdminAudit({
      module: 'marketing',
      entity: 'coupon',
      entityId:
        typeof coupon.id === 'string' ? coupon.id : 'unknown',
      mutationType: 'CREATE',
      summary: `Created coupon ${parsed.payload.code}`,
      actorUserId: admin.id,
      actorRole: admin.role,
      correlation: buildRequestCorrelation({ headers, method: 'POST' }, '/api/admin/coupons'),
    });
  }

  return {
    status: 200,
    body: { success: true, data: coupon },
  };
}

export async function GET(request: NextRequest) {
  try {
    const result = await handleAdminCouponsGetRequest(request);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Get coupons error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message || 'Failed to fetch coupons' },
      { status: mapAuthErrorToStatus(message) },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await handleAdminCouponsPostRequest(request);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Create coupon error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message || 'Failed to create coupon' },
      { status: mapAuthErrorToStatus(message) },
    );
  }
}
