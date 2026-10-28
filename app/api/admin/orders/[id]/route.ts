import { NextRequest, NextResponse, after } from 'next/server';
import type { OrderStatus, UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { mapAuthErrorToStatus } from '@/lib/rbac';
import { requireAdmin } from '@/lib/session';
import { applyCouponLifecycleForOrderStatus } from '@/lib/incentives/redemption-lifecycle';
import { writeOrderAuditLogWithClient } from '@/lib/order-audit';
import { cancelOrderAndRestoreStock } from '@/lib/orders/stock';
import { dispatchNotificationEvent } from '@/lib/notifications/dispatcher';

type Params = { params: Promise<{ id: string }> };

type AdminUser = {
  id: string;
  role: UserRole;
};

type OrderDetailRow = {
  id: string;
  status: OrderStatus;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  customerAddress: string | null;
  [key: string]: unknown;
};

type OrderPatchPayload = Partial<{
  status: OrderStatus;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  customerAddress: string | null;
  note: string | null;
  notes: string | null;
}>;

type OrderPatchMetadata = {
  note: string | null;
};

type HandlerResult = {
  status: number;
  body: {
    success: boolean;
    data?: unknown;
    error?: string;
  };
};

type OrderByIdDeps = {
  requireAdmin: () => Promise<AdminUser>;
  findOrderById: (id: string) => Promise<OrderDetailRow | null>;
  updateOrderWithLifecycleAndAudit: (args: {
    orderId: string;
    actor: AdminUser;
    before: OrderDetailRow;
    payload: OrderPatchPayload;
    metadata: OrderPatchMetadata;
  }) => Promise<OrderDetailRow>;
  /** Tells the customer (in-app + push) their order moved to a new status. */
  notifyStatusChange?: (order: OrderDetailRow) => void;
};

const ORDER_STATUS_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['READY'],
  READY: ['COMPLETED'],
};

const ORDER_STATUSES: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'READY',
  'COMPLETED',
  'CANCELLED',
];

const includeFields = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      memberLevel: true,
    },
  },
  orderItems: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          images: {
            select: { url: true, isPrimary: true },
            where: { isPrimary: true },
            take: 1,
          },
        },
      },
    },
  },
  payment: true,
};

const defaultDeps: OrderByIdDeps = {
  requireAdmin,
  findOrderById: (id) =>
    prisma.order.findFirst({
      where: {
        OR: [{ id: id.trim() }, { orderNumber: id.trim() }],
      },
      include: includeFields,
    }),
  updateOrderWithLifecycleAndAudit: async ({
    orderId,
    actor,
    before,
    payload,
    metadata,
  }) =>
    prisma.$transaction(async (tx) => {
      // Cancelling gives the stock back, once, before the general update
      // rewrites the (already CANCELLED) status.
      if (payload.status === 'CANCELLED' && before.status !== 'CANCELLED') {
        await cancelOrderAndRestoreStock(tx, orderId);
      }
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: payload.status,
          customerName: payload.customerName,
          customerPhone: payload.customerPhone,
          customerEmail: payload.customerEmail,
          customerAddress: payload.customerAddress,
        },
        include: includeFields,
      });

      if (payload.status && payload.status !== before.status) {
        await applyCouponLifecycleForOrderStatus({
          orderId,
          status: payload.status,
          reason:
            payload.status === 'CANCELLED'
              ? 'ADMIN_CANCELLED'
              : 'ADMIN_STATUS_UPDATE',
          tx,
        });

        await writeOrderAuditLogWithClient(tx, {
          orderId,
          mutationType: 'STATUS_UPDATE',
          actorUserId: actor.id,
          actorRole: actor.role,
          beforeData: {
            status: before.status,
            customerName: before.customerName,
            customerPhone: before.customerPhone,
            customerEmail: before.customerEmail,
            customerAddress: before.customerAddress,
          },
          afterData: {
            status: updatedOrder.status,
            customerName: updatedOrder.customerName,
            customerPhone: updatedOrder.customerPhone,
            customerEmail: updatedOrder.customerEmail,
            customerAddress: updatedOrder.customerAddress,
          },
          metadata: {
            note: metadata.note,
            transition: `${before.status}->${updatedOrder.status}`,
          },
        });
      }

      return updatedOrder as OrderDetailRow;
    }),
  notifyStatusChange: (order) => {
    const userId = typeof order.userId === 'string' ? order.userId : null;
    const orderNumber =
      typeof order.orderNumber === 'string' ? order.orderNumber : null;
    // Guest orders have no account to notify in-app or by push.
    if (!userId) return;
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    // after(): send once the admin has their response, without the
    // serverless function being frozen mid-send.
    after(() =>
      dispatchNotificationEvent({
        eventType: 'ORDER_STATUS_CHANGED',
        entityId: order.id,
        correlationKey: `order:${order.id}:status:${order.status}`,
        targetUserId: userId,
        payload: {
          orderId: order.id,
          orderNumber,
          orderStatus: order.status,
          linkUrl: orderNumber ? `${appUrl}/orders/${orderNumber}` : null,
        },
      }).catch((error) => {
        console.error('Order status notification dispatch error:', error);
      }),
    );
  },
};


type OptionalStringParseResult =
  | { kind: 'skipped' }
  | { kind: 'value'; value: string | null }
  | { kind: 'error'; error: string };

function normalizeOptionalString(raw: unknown, fieldName: string) {
  if (raw === undefined) return { kind: 'skipped' } satisfies OptionalStringParseResult;
  if (raw === null || raw === '')
    return { kind: 'value', value: null } satisfies OptionalStringParseResult;
  if (typeof raw !== 'string') {
    return {
      kind: 'error',
      error: `${fieldName} must be a string`,
    } satisfies OptionalStringParseResult;
  }
  return {
    kind: 'value',
    value: raw.trim() || null,
  } satisfies OptionalStringParseResult;
}

function parseOrderPatchPayload(raw: unknown, existing: OrderDetailRow) {
  if (!raw || typeof raw !== 'object') {
    return { error: 'Dữ liệu không hợp lệ' } as const;
  }
  const body = raw as Record<string, unknown>;
  const payload: OrderPatchPayload = {};
  const metadata: OrderPatchMetadata = { note: null };

  if (body.status !== undefined) {
    if (typeof body.status !== 'string' || !ORDER_STATUSES.includes(body.status as OrderStatus)) {
      return { error: 'Trạng thái không hợp lệ' } as const;
    }
    const nextStatus = body.status as OrderStatus;
    if (nextStatus !== existing.status) {
      const allowed = ORDER_STATUS_TRANSITIONS[existing.status] ?? [];
      if (!allowed.includes(nextStatus)) {
        return {
          error: `Invalid status transition from ${existing.status} to ${nextStatus}`,
        } as const;
      }
    }
    if (nextStatus !== existing.status) {
      payload.status = nextStatus;
    }
  }

  if (body.customerName !== undefined) {
    if (typeof body.customerName !== 'string' || !body.customerName.trim()) {
      return { error: 'customerName must be a non-empty string' } as const;
    }
    payload.customerName = body.customerName.trim();
  }

  if (body.customerPhone !== undefined) {
    if (typeof body.customerPhone !== 'string' || !body.customerPhone.trim()) {
      return { error: 'customerPhone must be a non-empty string' } as const;
    }
    payload.customerPhone = body.customerPhone.trim();
  }

  const customerEmail = normalizeOptionalString(body.customerEmail, 'customerEmail');
  if (customerEmail.kind === 'error') return { error: customerEmail.error } as const;
  if (customerEmail.kind === 'value') payload.customerEmail = customerEmail.value;

  const customerAddress = normalizeOptionalString(body.customerAddress, 'customerAddress');
  if (customerAddress.kind === 'error') return { error: customerAddress.error } as const;
  if (customerAddress.kind === 'value') payload.customerAddress = customerAddress.value;

  const noteInput = body.notes ?? body.note;
  if (noteInput !== undefined) {
    const note = normalizeOptionalString(noteInput, 'notes');
    if (note.kind === 'error') return { error: note.error } as const;
    if (note.kind === 'value') metadata.note = note.value;
  }

  return { payload, metadata } as const;
}

function hasPatchChanges(payload: OrderPatchPayload) {
  return (
    payload.status !== undefined ||
    payload.customerName !== undefined ||
    payload.customerPhone !== undefined ||
    payload.customerEmail !== undefined ||
    payload.customerAddress !== undefined
  );
}

export async function handleAdminOrderGetByIdRequest(
  params: Promise<{ id: string }>,
  deps: OrderByIdDeps = defaultDeps,
): Promise<HandlerResult> {
  await deps.requireAdmin();
  const { id } = await params;
  const order = await deps.findOrderById(id);

  if (!order) {
    return { status: 404, body: { success: false, error: 'Không tìm thấy đơn hàng' } };
  }

  return { status: 200, body: { success: true, data: order } };
}

export async function handleAdminOrderPatchRequest(
  request: Pick<NextRequest, 'json'>,
  params: Promise<{ id: string }>,
  deps: OrderByIdDeps = defaultDeps,
): Promise<HandlerResult> {
  const admin = await deps.requireAdmin();
  const { id } = await params;
  const existing = await deps.findOrderById(id);

  if (!existing) {
    return { status: 404, body: { success: false, error: 'Không tìm thấy đơn hàng' } };
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return { status: 400, body: { success: false, error: 'Dữ liệu JSON không hợp lệ' } };
  }

  const parsed = parseOrderPatchPayload(rawBody, existing);
  if ('error' in parsed) {
    return { status: 400, body: { success: false, error: parsed.error } };
  }

  if (!hasPatchChanges(parsed.payload)) {
    return { status: 200, body: { success: true, data: { order: existing } } };
  }

  const order = await deps.updateOrderWithLifecycleAndAudit({
    orderId: existing.id,
    actor: admin,
    before: existing,
    payload: parsed.payload,
    metadata: parsed.metadata,
  });

  if (parsed.payload.status !== undefined) {
    deps.notifyStatusChange?.(order);
  }

  return { status: 200, body: { success: true, data: { order } } };
}

// GET /api/admin/orders/[id]
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const result = await handleAdminOrderGetByIdRequest(params);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: unknown) {
    console.error('Get order error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = mapAuthErrorToStatus(message);
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Internal server error' : message },
      { status },
    );
  }
}

// PATCH /api/admin/orders/[id]
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const result = await handleAdminOrderPatchRequest(request, params);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: unknown) {
    console.error('Update order error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = mapAuthErrorToStatus(message);
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Internal server error' : message },
      { status },
    );
  }
}


