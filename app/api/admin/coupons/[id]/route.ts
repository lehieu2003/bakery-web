import { NextRequest, NextResponse } from 'next/server';
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

type CouponRow = {
  id: string;
  code: string;
  type: unknown;
  startAt: Date | string;
  endAt: Date | string;
  [key: string]: unknown;
};

type CouponByIdDeps = {
  requireAdmin: () => Promise<AdminUser>;
  findCouponById: (id: string) => Promise<CouponRow | null>;
  updateCouponById: (
    id: string,
    payload: Record<string, unknown>,
  ) => Promise<unknown>;
  countRedemptions: (id: string) => Promise<number>;
  deleteCouponById: (id: string) => Promise<void>;
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

const defaultDeps: CouponByIdDeps = {
  requireAdmin,
  findCouponById: (id) => prisma.coupon.findUnique({ where: { id } }),
  updateCouponById: (id, payload) =>
    prisma.coupon.update({ where: { id }, data: payload }),
  countRedemptions: (id) =>
    prisma.couponRedemption.count({ where: { couponId: id } }),
  deleteCouponById: async (id) => {
    await prisma.coupon.delete({ where: { id } });
  },
  writeAdminAudit: writeAdminActionAuditLog,
};

const CODE_PATTERN = /^[A-Z0-9_-]{3,40}$/;

function badRequest(error: string): HandlerResult {
  return { status: 400, body: { success: false, error } };
}

export async function handleAdminCouponPutRequest(
  request: NextRequest,
  { id }: { id: string },
  deps: CouponByIdDeps = defaultDeps,
): Promise<HandlerResult> {
  const admin = await deps.requireAdmin();

  const existing = await deps.findCouponById(id);
  if (!existing) {
    return { status: 404, body: { success: false, error: 'Coupon not found' } };
  }

  const body = (await request.json()) as Record<string, unknown>;
  const payload: Record<string, unknown> = {};

  if (body.isActive !== undefined) {
    if (typeof body.isActive !== 'boolean') {
      return badRequest('isActive must be a boolean');
    }
    payload.isActive = body.isActive;
  }

  if (body.code !== undefined) {
    const code =
      typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
    if (!CODE_PATTERN.test(code)) {
      return badRequest(
        'Code must be 3-40 characters (letters, numbers, - or _)',
      );
    }
    payload.code = code;
  }

  const resolvedType = body.type !== undefined ? body.type : existing.type;
  if (resolvedType !== 'PERCENTAGE' && resolvedType !== 'FIXED') {
    return badRequest('type must be PERCENTAGE or FIXED');
  }
  if (body.type !== undefined) {
    payload.type = body.type;
  }

  if (body.value !== undefined) {
    const value = typeof body.value === 'number' ? body.value : NaN;
    if (!Number.isFinite(value) || value <= 0) {
      return badRequest('value must be a positive number');
    }
    if (resolvedType === 'PERCENTAGE' && value > 100) {
      return badRequest('PERCENTAGE value must be at most 100');
    }
    payload.value = value;
  }

  const parseAmount = (
    input: unknown,
  ): { skip: true } | { skip: false; value: number | null } | { error: string } => {
    if (input === undefined) return { skip: true };
    if (input === null) return { skip: false, value: null };
    const num = typeof input === 'number' ? input : NaN;
    if (!Number.isFinite(num) || num < 0) {
      return { error: 'amount fields must be non-negative numbers or null' };
    }
    return { skip: false, value: num };
  };
  const minOrder = parseAmount(body.minOrder);
  if ('error' in minOrder) return badRequest(minOrder.error);
  if (!minOrder.skip) payload.minOrder = minOrder.value;
  const maxDiscount = parseAmount(body.maxDiscount);
  if ('error' in maxDiscount) return badRequest(maxDiscount.error);
  if (!maxDiscount.skip) payload.maxDiscount = maxDiscount.value;

  const parseLimit = (
    input: unknown,
  ): { skip: true } | { skip: false; value: number | null } | { error: string } => {
    if (input === undefined) return { skip: true };
    if (input === null) return { skip: false, value: null };
    const num = typeof input === 'number' ? input : NaN;
    if (!Number.isInteger(num) || num < 1) {
      return { error: 'limits must be positive integers or null' };
    }
    return { skip: false, value: num };
  };
  const usageLimit = parseLimit(body.usageLimit);
  if ('error' in usageLimit) return badRequest(usageLimit.error);
  if (!usageLimit.skip) payload.usageLimit = usageLimit.value;
  const perUserLimit = parseLimit(body.perUserLimit);
  if ('error' in perUserLimit) return badRequest(perUserLimit.error);
  if (!perUserLimit.skip) payload.perUserLimit = perUserLimit.value;

  const parseDate = (
    input: unknown,
  ): { skip: true } | { skip: false; iso: string } | { error: string } => {
    if (input === undefined) return { skip: true };
    if (typeof input !== 'string') return { error: 'dates must be ISO strings' };
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) {
      return { error: 'dates must be valid' };
    }
    return { skip: false, iso: date.toISOString() };
  };
  const startAt = parseDate(body.startAt);
  if ('error' in startAt) return badRequest(startAt.error);
  const endAt = parseDate(body.endAt);
  if ('error' in endAt) return badRequest(endAt.error);
  const resolvedStart = startAt.skip
    ? new Date(existing.startAt)
    : new Date(startAt.iso);
  const resolvedEnd = endAt.skip
    ? new Date(existing.endAt)
    : new Date(endAt.iso);
  if (resolvedEnd <= resolvedStart) {
    return badRequest('endAt must be after startAt');
  }
  if (!startAt.skip) payload.startAt = startAt.iso;
  if (!endAt.skip) payload.endAt = endAt.iso;

  let updated: unknown;
  try {
    updated = await deps.updateCouponById(id, payload);
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      return badRequest('Coupon code already exists');
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
      entityId: id,
      mutationType: 'UPDATE',
      summary: `Updated coupon ${existing.code}`,
      actorUserId: admin.id,
      actorRole: admin.role,
      correlation: buildRequestCorrelation(
        { headers, method: 'PUT' },
        '/api/admin/coupons',
      ),
    });
  }

  return { status: 200, body: { success: true, data: updated } };
}

export async function handleAdminCouponDeleteRequest(
  request: NextRequest,
  { id }: { id: string },
  deps: CouponByIdDeps = defaultDeps,
): Promise<HandlerResult> {
  const admin = await deps.requireAdmin();

  const existing = await deps.findCouponById(id);
  if (!existing) {
    return { status: 404, body: { success: false, error: 'Coupon not found' } };
  }

  const redemptions = await deps.countRedemptions(id);
  if (redemptions > 0) {
    return {
      status: 409,
      body: {
        success: false,
        error:
          'Coupon has redemptions and cannot be deleted. Deactivate it instead.',
      },
    };
  }

  await deps.deleteCouponById(id);

  const headers =
    typeof (request as unknown as { headers?: Headers }).headers?.get === 'function'
      ? (request as unknown as { headers: Headers }).headers
      : new Headers();
  if (deps.writeAdminAudit) {
    await deps.writeAdminAudit({
      module: 'marketing',
      entity: 'coupon',
      entityId: id,
      mutationType: 'DELETE',
      summary: `Deleted coupon ${existing.code}`,
      actorUserId: admin.id,
      actorRole: admin.role,
      correlation: buildRequestCorrelation(
        { headers, method: 'DELETE' },
        '/api/admin/coupons',
      ),
    });
  }

  return { status: 200, body: { success: true, data: { deleted: true } } };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const result = await handleAdminCouponPutRequest(request, { id });
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Update coupon error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message || 'Failed to update coupon' },
      { status: mapAuthErrorToStatus(message) },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const result = await handleAdminCouponDeleteRequest(request, { id });
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Delete coupon error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message || 'Failed to delete coupon' },
      { status: mapAuthErrorToStatus(message) },
    );
  }
}
