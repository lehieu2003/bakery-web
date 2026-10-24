import { NextRequest, NextResponse } from 'next/server';
import type { MemberLevel, Prisma, UserRole } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { mapAuthErrorToStatus } from '@/lib/rbac';
import { requireAdmin } from '@/lib/session';
const MEMBER_LEVELS: MemberLevel[] = ['SILVER', 'GOLD', 'PLATINUM'];

type Params = { params: Promise<{ id: string }> };

type AdminUser = {
  id: string;
  role: UserRole;
};

type CustomerDetailRow = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  memberLevel: MemberLevel;
  points: number;
  isActive: boolean;
  createdAt: Date;
  orders: Array<{
    id: string;
    orderNumber: string;
    total: Prisma.Decimal;
    status: string;
    paymentMethod: string | null;
    createdAt: Date;
    payment: {
      id: string;
      provider: string;
      transactionId: string | null;
      amount: Prisma.Decimal;
      status: string;
      createdAt: Date;
    } | null;
  }>;
  notificationReads: Array<{
    notificationId: string;
    readAt: Date;
    notification: {
      id: string;
      title: string;
      status: string;
      audience: string;
      publishedAt: Date | null;
      createdAt: Date;
    };
  }>;
};

type CustomerPatchPayload = Partial<{
  name: string | null;
  phone: string | null;
  memberLevel: MemberLevel;
  points: number;
  isActive: boolean;
}>;

type CustomerByIdDeps = {
  requireAdmin: () => Promise<AdminUser>;
  findCustomerById: (id: string) => Promise<CustomerDetailRow | null>;
  countTotalOrders: (id: string) => Promise<number>;
  sumTotalSpent: (id: string) => Promise<number>;
  countUnreadPublishedNotifications: (id: string) => Promise<number>;
  updateCustomer: (id: string, payload: CustomerPatchPayload) => Promise<CustomerDetailRow>;
};

type HandlerResult = {
  status: number;
  body: {
    success: boolean;
    data?: unknown;
    error?: string;
  };
};

const customerDetailSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  memberLevel: true,
  points: true,
  isActive: true,
  createdAt: true,
  orders: {
    take: 10,
    orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }],
    select: {
      id: true,
      orderNumber: true,
      total: true,
      status: true,
      paymentMethod: true,
      createdAt: true,
      payment: {
        select: {
          id: true,
          provider: true,
          transactionId: true,
          amount: true,
          status: true,
          createdAt: true,
        },
      },
    },
  },
  notificationReads: {
    take: 10,
    orderBy: [{ readAt: 'desc' as const }, { notificationId: 'desc' as const }],
    select: {
      notificationId: true,
      readAt: true,
      notification: {
        select: {
          id: true,
          title: true,
          status: true,
          audience: true,
          publishedAt: true,
          createdAt: true,
        },
      },
    },
  },
} satisfies Prisma.UserSelect;

const defaultDeps: CustomerByIdDeps = {
  requireAdmin,
  findCustomerById: (id) =>
    prisma.user.findFirst({
      where: { id, role: 'CUSTOMER' },
      select: customerDetailSelect,
    }) as Promise<CustomerDetailRow | null>,
  countTotalOrders: (id) =>
    prisma.order.count({
      where: { userId: id },
    }),
  sumTotalSpent: async (id) => {
    const row = await prisma.order.aggregate({
      where: {
        userId: id,
        status: { not: 'CANCELLED' },
      },
      _sum: { total: true },
    });
    return Number(row._sum.total ?? 0);
  },
  countUnreadPublishedNotifications: (id) =>
    prisma.notification.count({
      where: {
        status: 'PUBLISHED',
        OR: [
          { audience: 'GLOBAL' },
          { audience: 'USER', targetUserId: id },
        ],
        reads: {
          none: { userId: id },
        },
      },
    }),
  updateCustomer: (id, payload) =>
    prisma.user.update({
      where: { id },
      data: payload,
      select: customerDetailSelect,
    }) as Promise<CustomerDetailRow>,
};


function toCustomerDetail(
  row: CustomerDetailRow,
  totalOrders: number,
  totalSpent: number,
  unreadPublishedNotifications: number,
) {
  const recentOrders = row.orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    total: Number(order.total),
    status: order.status,
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt,
    payment: order.payment
      ? {
          id: order.payment.id,
          provider: order.payment.provider,
          transactionId: order.payment.transactionId,
          amount: Number(order.payment.amount),
          status: order.payment.status,
          createdAt: order.payment.createdAt,
        }
      : null,
  }));

  const recentPayments = recentOrders
    .filter((order) => order.payment)
    .map((order) => ({
      paymentId: order.payment!.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      provider: order.payment!.provider,
      transactionId: order.payment!.transactionId,
      amount: order.payment!.amount,
      status: order.payment!.status,
      createdAt: order.payment!.createdAt,
    }));

  const recentNotifications = row.notificationReads.map((entry) => ({
    notificationId: entry.notification.id,
    title: entry.notification.title,
    status: entry.notification.status,
    audience: entry.notification.audience,
    publishedAt: entry.notification.publishedAt,
    createdAt: entry.notification.createdAt,
    readAt: entry.readAt,
  }));

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    memberLevel: row.memberLevel,
    level: row.memberLevel,
    points: row.points,
    isActive: row.isActive,
    createdAt: row.createdAt,
    totalOrders,
    totalSpent,
    recentOrders,
    recentPayments,
    recentNotifications,
    notificationSummary: {
      totalRead: row.notificationReads.length,
      unreadPublished: unreadPublishedNotifications,
    },
  };
}

type OptionalStringParseResult =
  | { kind: 'skipped' }
  | { kind: 'value'; value: string | null }
  | { kind: 'error'; error: string };

function normalizeOptionalString(raw: unknown, fieldName: string) {
  if (raw === undefined) return { kind: 'skipped' } satisfies OptionalStringParseResult;
  if (raw === null || raw === '') {
    return { kind: 'value', value: null } satisfies OptionalStringParseResult;
  }
  if (typeof raw !== 'string') {
    return {
      kind: 'error',
      error: `${fieldName} must be a string`,
    } satisfies OptionalStringParseResult;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      kind: 'error',
      error: `${fieldName} must be a non-empty string`,
    } satisfies OptionalStringParseResult;
  }
  return {
    kind: 'value',
    value: trimmed,
  } satisfies OptionalStringParseResult;
}

function parseCustomerPatchPayload(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { error: 'Dữ liệu không hợp lệ' } as const;
  }

  const body = raw as Record<string, unknown>;
  const allowedKeys = new Set([
    'name',
    'phone',
    'memberLevel',
    'points',
    'isActive',
  ]);
  const hasUnknownKey = Object.keys(body).some((key) => !allowedKeys.has(key));
  if (hasUnknownKey) {
    return { error: 'Trường dữ liệu không hợp lệ' } as const;
  }

  const payload: CustomerPatchPayload = {};

  const name = normalizeOptionalString(body.name, 'name');
  if (name.kind === 'error') return { error: name.error } as const;
  if (name.kind === 'value') payload.name = name.value;

  const phone = normalizeOptionalString(body.phone, 'phone');
  if (phone.kind === 'error') return { error: phone.error } as const;
  if (phone.kind === 'value') payload.phone = phone.value;

  if (body.memberLevel !== undefined) {
    if (typeof body.memberLevel !== 'string' || !MEMBER_LEVELS.includes(body.memberLevel as MemberLevel)) {
      return { error: 'Hạng thành viên không hợp lệ' } as const;
    }
    payload.memberLevel = body.memberLevel as MemberLevel;
  }

  if (body.points !== undefined) {
    if (!Number.isInteger(body.points) || (body.points as number) < 0) {
      return { error: 'points must be a non-negative integer' } as const;
    }
    payload.points = body.points as number;
  }

  if (body.isActive !== undefined) {
    if (typeof body.isActive !== 'boolean') {
      return { error: 'isActive must be a boolean' } as const;
    }
    payload.isActive = body.isActive;
  }

  return { payload } as const;
}

function hasPatchChanges(payload: CustomerPatchPayload) {
  return (
    payload.name !== undefined ||
    payload.phone !== undefined ||
    payload.memberLevel !== undefined ||
    payload.points !== undefined ||
    payload.isActive !== undefined
  );
}

export async function handleAdminCustomerGetByIdRequest(
  params: Promise<{ id: string }>,
  deps: CustomerByIdDeps = defaultDeps,
): Promise<HandlerResult> {
  await deps.requireAdmin();
  const { id } = await params;

  const row = await deps.findCustomerById(id);
  if (!row) {
    return { status: 404, body: { success: false, error: 'Không tìm thấy khách hàng' } };
  }

  const [totalOrders, totalSpent, unreadPublishedNotifications] = await Promise.all([
    deps.countTotalOrders(id),
    deps.sumTotalSpent(id),
    deps.countUnreadPublishedNotifications(id),
  ]);

  const customer = toCustomerDetail(
    row,
    totalOrders,
    totalSpent,
    unreadPublishedNotifications,
  );

  return {
    status: 200,
    body: {
      success: true,
      data: customer,
    },
  };
}

export async function handleAdminCustomerPatchRequest(
  request: Pick<NextRequest, 'json'>,
  params: Promise<{ id: string }>,
  deps: CustomerByIdDeps = defaultDeps,
): Promise<HandlerResult> {
  await deps.requireAdmin();
  const { id } = await params;

  const existing = await deps.findCustomerById(id);
  if (!existing) {
    return { status: 404, body: { success: false, error: 'Không tìm thấy khách hàng' } };
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return { status: 400, body: { success: false, error: 'Dữ liệu JSON không hợp lệ' } };
  }

  const parsed = parseCustomerPatchPayload(rawBody);
  if ('error' in parsed) {
    return { status: 400, body: { success: false, error: parsed.error } };
  }

  if (!hasPatchChanges(parsed.payload)) {
    return {
      status: 200,
      body: {
        success: true,
        data: {
          id: existing.id,
          email: existing.email,
          name: existing.name,
          phone: existing.phone,
          memberLevel: existing.memberLevel,
          level: existing.memberLevel,
          points: existing.points,
          isActive: existing.isActive,
        },
      },
    };
  }

  const updated = await deps.updateCustomer(id, parsed.payload);

  return {
    status: 200,
    body: {
      success: true,
      data: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        phone: updated.phone,
        memberLevel: updated.memberLevel,
        level: updated.memberLevel,
        points: updated.points,
        isActive: updated.isActive,
      },
    },
  };
}

// GET /api/admin/customers/[id]
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const result = await handleAdminCustomerGetByIdRequest(params);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: unknown) {
    console.error('Get customer error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = mapAuthErrorToStatus(message);
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Internal server error' : message },
      { status },
    );
  }
}

// PATCH /api/admin/customers/[id]
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const result = await handleAdminCustomerPatchRequest(request, params);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: unknown) {
    console.error('Update customer error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = mapAuthErrorToStatus(message);
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Internal server error' : message },
      { status },
    );
  }
}


