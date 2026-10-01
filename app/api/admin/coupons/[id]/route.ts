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

type CouponByIdDeps = {
  requireAdmin: () => Promise<AdminUser>;
  findCouponById: (id: string) => Promise<{ id: string; code: string } | null>;
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
  findCouponById: (id) =>
    prisma.coupon.findUnique({ where: { id }, select: { id: true, code: true } }),
  updateCouponById: (id, payload) =>
    prisma.coupon.update({ where: { id }, data: payload }),
  countRedemptions: (id) =>
    prisma.couponRedemption.count({ where: { couponId: id } }),
  deleteCouponById: async (id) => {
    await prisma.coupon.delete({ where: { id } });
  },
  writeAdminAudit: writeAdminActionAuditLog,
};

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
      return {
        status: 400,
        body: { success: false, error: 'isActive must be a boolean' },
      };
    }
    payload.isActive = body.isActive;
  }

  if (body.usageLimit !== undefined) {
    if (body.usageLimit === null) {
      payload.usageLimit = null;
    } else if (
      typeof body.usageLimit !== 'number' ||
      !Number.isInteger(body.usageLimit) ||
      body.usageLimit < 1
    ) {
      return {
        status: 400,
        body: { success: false, error: 'usageLimit must be a positive integer or null' },
      };
    } else {
      payload.usageLimit = body.usageLimit;
    }
  }

  const updated = await deps.updateCouponById(id, payload);

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
