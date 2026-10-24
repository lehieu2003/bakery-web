import { NextRequest, NextResponse } from 'next/server';
import type { OrderStatus, UserRole } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { mapAuthErrorToStatus } from '@/lib/rbac';
import { requireAdmin } from '@/lib/session';
type Params = { params: Promise<{ id: string }> };

type AdminUser = {
  id: string;
  role: UserRole;
};

type InvestigationOrder = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
  payment: {
    provider: string;
    status: string;
    transactionId: string | null;
    amount: number;
    createdAt: Date;
  } | null;
};

type InvestigationAuditRow = {
  id: string;
  mutationType: string;
  actorUserId: string | null;
  actorRole: UserRole | null;
  metadata: unknown;
  createdAt: Date;
  actor: {
    id: string;
    name: string | null;
    role: UserRole;
  } | null;
};

type InvestigationDeps = {
  requireAdmin: () => Promise<AdminUser>;
  findOrderById: (id: string) => Promise<InvestigationOrder | null>;
  findOrderAuditLogs: (orderId: string) => Promise<InvestigationAuditRow[]>;
};

type HandlerResult = {
  status: number;
  body: {
    success: boolean;
    data?: unknown;
    error?: string;
  };
};

const defaultDeps: InvestigationDeps = {
  requireAdmin,
  findOrderById: (id: string) =>
    prisma.order
      .findFirst({
        where: {
          OR: [{ id: id.trim() }, { orderNumber: id.trim() }],
        },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          customerName: true,
          customerPhone: true,
          customerEmail: true,
          createdAt: true,
          updatedAt: true,
          payment: {
            select: {
              provider: true,
              status: true,
              transactionId: true,
              amount: true,
              createdAt: true,
            },
          },
        },
      })
      .then((order) =>
        order
          ? {
              ...order,
              payment: order.payment
                ? {
                    provider: order.payment.provider,
                    status: order.payment.status,
                    transactionId: order.payment.transactionId,
                    amount: Number(order.payment.amount),
                    createdAt: order.payment.createdAt,
                  }
                : null,
            }
          : null,
      ),
  findOrderAuditLogs: (orderId: string) =>
    prisma.orderAuditLog.findMany({
      where: { orderId },
      include: {
        actor: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
    }),
};


function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asNullableString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null;
}

function toCallbackEvent(log: InvestigationAuditRow) {
  if (log.mutationType !== 'PAYMENT_CALLBACK') return null;
  const metadata = asRecord(log.metadata);
  if (!metadata || metadata.source !== 'payment_callback') return null;

  const event = asNullableString(metadata.event);
  const provider = asNullableString(metadata.provider);
  if (!event || !provider) return null;

  return {
    id: log.id,
    provider,
    event,
    incomingStatus: asNullableString(metadata.incomingStatus),
    existingStatus: asNullableString(metadata.existingStatus),
    transactionId: asNullableString(metadata.transactionId),
    existingTransactionId: asNullableString(metadata.existingTransactionId),
    incomingTransactionId: asNullableString(metadata.incomingTransactionId),
    outcome: asNullableString(metadata.outcome),
    reason: asNullableString(metadata.reason),
    createdAt: log.createdAt.toISOString(),
  };
}

function toReconciliationAttempt(
  callbackEvent: ReturnType<typeof toCallbackEvent>,
) {
  if (!callbackEvent) return null;
  if (!['processed', 'replay_ignored', 'conflict'].includes(callbackEvent.event)) {
    return null;
  }

  const outcome =
    callbackEvent.event === 'conflict'
      ? 'CONFLICT'
      : callbackEvent.event === 'replay_ignored'
        ? 'REPLAY_IGNORED'
        : callbackEvent.outcome === 'state_updated'
          ? 'STATE_UPDATED'
          : callbackEvent.outcome === 'missing_payment'
            ? 'MISSING_PAYMENT'
            : 'PROCESSED';

  return {
    callbackEventId: callbackEvent.id,
    provider: callbackEvent.provider,
    outcome,
    incomingStatus: callbackEvent.incomingStatus,
    createdAt: callbackEvent.createdAt,
  };
}

export async function handleAdminOrderInvestigationGetRequest(
  params: Promise<{ id: string }>,
  deps: InvestigationDeps = defaultDeps,
): Promise<HandlerResult> {
  try {
    await deps.requireAdmin();
    const { id } = await params;
    const normalizedId = id.trim();
    if (!normalizedId) {
      return { status: 400, body: { success: false, error: 'Mã đơn hàng không hợp lệ' } };
    }

    const order = await deps.findOrderById(normalizedId);
    if (!order) {
      return { status: 404, body: { success: false, error: 'Không tìm thấy đơn hàng' } };
    }

    const auditLogs = await deps.findOrderAuditLogs(order.id);
    const callbackTimeline = auditLogs
      .map(toCallbackEvent)
      .filter((event): event is NonNullable<typeof event> => !!event);
    const reconciliationAttempts = callbackTimeline
      .map(toReconciliationAttempt)
      .filter((attempt): attempt is NonNullable<typeof attempt> => !!attempt);

    return {
      status: 200,
      body: {
        success: true,
        data: {
          order: {
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            customerEmail: order.customerEmail,
            createdAt: order.createdAt.toISOString(),
            updatedAt: order.updatedAt.toISOString(),
          },
          payment: order.payment
            ? {
                provider: order.payment.provider,
                status: order.payment.status,
                transactionId: order.payment.transactionId,
                amount: order.payment.amount,
                createdAt: order.payment.createdAt.toISOString(),
              }
            : null,
          callbackTimeline,
          reconciliationAttempts,
          auditTrail: auditLogs.map((log) => ({
            id: log.id,
            mutationType: log.mutationType,
            actorUserId: log.actorUserId,
            actorRole: log.actorRole,
            actor: log.actor
              ? { id: log.actor.id, name: log.actor.name, role: log.actor.role }
              : null,
            metadata: log.metadata,
            createdAt: log.createdAt.toISOString(),
          })),
        },
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = mapAuthErrorToStatus(message);
    return {
      status,
      body: {
        success: false,
        error: status === 500 ? 'Internal server error' : message,
      },
    };
  }
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const result = await handleAdminOrderInvestigationGetRequest(params);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: unknown) {
    console.error('Admin order investigation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = mapAuthErrorToStatus(message);
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Internal server error' : message },
      { status },
    );
  }
}


