/**
 * ZaloPay Callback
 * Called by ZaloPay server after payment completion
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyZaloPayCallback } from '@/lib/payment/zalopay';
import { applyCouponLifecycleForOrderStatus } from '@/lib/incentives/redemption-lifecycle';
import { dispatchNotificationEvent } from '@/lib/notifications/dispatcher';
import {
  writePaymentCallbackAuditLog,
  type PaymentCallbackAuditPayload,
} from '@/lib/order-audit';

type PaymentSnapshot = {
  orderId: string;
  status: string;
  transactionId: string | null;
  userId: string | null;
  customerEmail: string | null;
  userEmail: string | null;
  orderNumber: string | null;
};

type ZaloCallbackDeps = {
  verifyCallback: (dataStr: string, mac: string) => boolean;
  findPaymentByOrderId: (orderId: string) => Promise<PaymentSnapshot | null>;
  applyPaymentTransition: (args: {
    orderId: string;
    paymentStatus: string;
    transactionId: string | null;
  }) => Promise<{ applied: boolean; conflict: boolean }>;
  dispatchNotificationEvent?: (event: {
    eventType: 'ORDER_STATUS_CHANGED';
    entityId: string;
    correlationKey: string;
    targetUserId?: string | null;
    targetEmail?: string | null;
    payload?: Record<string, unknown>;
  }) => Promise<unknown>;
  logEvent: (event: string, payload: Record<string, unknown>) => void;
  writeCallbackAuditLog?: (
    payload: PaymentCallbackAuditPayload,
  ) => Promise<void>;
};

const defaultDeps: ZaloCallbackDeps = {
  verifyCallback: verifyZaloPayCallback,
  findPaymentByOrderId: async (orderId) =>
    prisma.payment.findUnique({
      where: { orderId },
      select: {
        orderId: true,
        status: true,
        transactionId: true,
        order: {
          select: {
            userId: true,
            customerEmail: true,
            orderNumber: true,
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    }).then((payment) => {
      if (!payment) return null;
      return {
        orderId: payment.orderId,
        status: payment.status,
        transactionId: payment.transactionId,
        userId: payment.order.userId,
        customerEmail: payment.order.customerEmail,
        userEmail: payment.order.user?.email ?? null,
        orderNumber: payment.order.orderNumber ?? null,
      };
    }),
  applyPaymentTransition: async ({ orderId, paymentStatus, transactionId }) => {
    const nextOrderStatus =
      paymentStatus === 'PAID'
        ? 'CONFIRMED'
        : paymentStatus === 'FAILED'
          ? 'CANCELLED'
          : null;

    return prisma.$transaction(async (tx) => {
      const paymentUpdate = await tx.payment.updateMany({
        where: { orderId, status: 'PENDING' },
        data: {
          status: paymentStatus,
          transactionId: transactionId ?? undefined,
        },
      });

      if (paymentUpdate.count === 0) {
        const existing = await tx.payment.findUnique({
          where: { orderId },
          select: { status: true, transactionId: true },
        });

        const conflict =
          !!existing &&
          (existing.status !== paymentStatus ||
            (existing.transactionId !== null &&
              transactionId !== null &&
              existing.transactionId !== transactionId));

        return { applied: false, conflict };
      }

      if (nextOrderStatus) {
        await tx.order.update({
          where: { id: orderId },
          data: { status: nextOrderStatus },
        });
        await applyCouponLifecycleForOrderStatus({
          orderId,
          status: nextOrderStatus,
          reason:
            nextOrderStatus === 'CANCELLED'
              ? 'PAYMENT_FAILED'
              : 'PAYMENT_CONFIRMED',
          tx,
        });
      }

      return { applied: true, conflict: false };
    });
  },
  dispatchNotificationEvent,
  writeCallbackAuditLog: writePaymentCallbackAuditLog,
  logEvent: (event, payload) => {
    console.info(
      JSON.stringify({
        event,
        provider: 'ZALOPAY',
        ...payload,
      }),
    );
  },
};

async function safeWriteCallbackAudit(
  deps: ZaloCallbackDeps,
  payload: PaymentCallbackAuditPayload,
) {
  if (!deps.writeCallbackAuditLog) return;
  try {
    await deps.writeCallbackAuditLog(payload);
  } catch (error) {
    deps.logEvent('payment.callback.audit_write_failed', {
      orderId: payload.orderId,
      provider: payload.provider,
      event: payload.event,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function normalizeAsRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function parseOrderIdFromAppTransId(appTransId: string): string {
  return appTransId.split('_').slice(1).join('_').trim();
}

function safeVerifyZaloSignature(
  verify: ZaloCallbackDeps['verifyCallback'],
  dataStr: string,
  mac: string,
) {
  try {
    return verify(dataStr, mac);
  } catch {
    return false;
  }
}

function resolveIncomingStatus(payload: Record<string, unknown>): string {
  const candidates = [
    payload.status,
    payload.return_code,
    payload.sub_return_code,
  ];

  for (const value of candidates) {
    const normalized = typeof value === 'string' ? Number(value) : value;
    if (normalized === 1) return 'PAID';
    if (normalized === -1 || normalized === 0) return 'FAILED';
  }

  return 'UNKNOWN';
}

function resolveTransactionId(payload: Record<string, unknown>): string | null {
  const transactionId = normalizeText(payload.zp_trans_id ?? payload.trans_id);
  return transactionId || null;
}

export async function handleZaloPayCallbackRequest(
  body: unknown,
  deps: ZaloCallbackDeps = defaultDeps,
) {
  const payload = normalizeAsRecord(body);
  if (!payload) {
    return {
      status: 400,
      body: { return_code: 0, return_message: 'invalid payload' },
    };
  }

  const dataStr = normalizeText(payload.data);
  const mac = normalizeText(payload.mac);

  if (!dataStr || !mac) {
    deps.logEvent('payment.callback.invalid_payload', {
      reason: 'missing_data_or_mac',
    });
    await safeWriteCallbackAudit(deps, {
      orderId: 'unknown',
      provider: 'ZALOPAY',
      event: 'invalid_payload',
      reason: 'missing_data_or_mac',
    });
    return {
      status: 400,
      body: { return_code: 0, return_message: 'invalid payload' },
    };
  }

  if (!safeVerifyZaloSignature(deps.verifyCallback, dataStr, mac)) {
    deps.logEvent('payment.callback.verification_failed', {
      reason: 'invalid_mac',
    });
    await safeWriteCallbackAudit(deps, {
      orderId: 'unknown',
      provider: 'ZALOPAY',
      event: 'verification_failed',
      reason: 'invalid_mac',
    });
    return {
      status: 200,
      body: { return_code: -1, return_message: 'mac not equal' },
    };
  }

  let parsedData: Record<string, unknown>;
  try {
    parsedData = JSON.parse(dataStr) as Record<string, unknown>;
  } catch {
    deps.logEvent('payment.callback.invalid_payload', {
      reason: 'data_json_parse_failed',
    });
    await safeWriteCallbackAudit(deps, {
      orderId: 'unknown',
      provider: 'ZALOPAY',
      event: 'invalid_payload',
      reason: 'data_json_parse_failed',
    });
    return {
      status: 400,
      body: { return_code: 0, return_message: 'invalid payload' },
    };
  }

  const appTransId = normalizeText(parsedData.app_trans_id);
  const orderId = parseOrderIdFromAppTransId(appTransId);
  const incomingStatus = resolveIncomingStatus(parsedData);
  const transactionId = resolveTransactionId(parsedData);

  if (!appTransId || !orderId || incomingStatus === 'UNKNOWN') {
    deps.logEvent('payment.callback.invalid_payload', {
      reason: 'missing_app_trans_id',
      appTransId,
      incomingStatus,
    });
    await safeWriteCallbackAudit(deps, {
      orderId: orderId || 'unknown',
      provider: 'ZALOPAY',
      event: 'invalid_payload',
      reason: !appTransId
        ? 'missing_app_trans_id'
        : incomingStatus === 'UNKNOWN'
          ? 'unknown_status'
          : 'invalid_payload',
      incomingStatus,
    });
    return {
      status: 400,
      body: { return_code: 0, return_message: 'invalid payload' },
    };
  }

  deps.logEvent('payment.callback.received', {
    orderId,
    appTransId,
    incomingStatus,
    transactionId,
  });
  await safeWriteCallbackAudit(deps, {
    orderId,
    provider: 'ZALOPAY',
    event: 'received',
    incomingStatus,
    transactionId,
  });

  const payment = await deps.findPaymentByOrderId(orderId);
  if (!payment) {
    deps.logEvent('payment.callback.processed', {
      orderId,
      outcome: 'missing_payment',
    });
    await safeWriteCallbackAudit(deps, {
      orderId,
      provider: 'ZALOPAY',
      event: 'processed',
      incomingStatus,
      transactionId,
      outcome: 'missing_payment',
    });
    return {
      status: 200,
      body: { return_code: 1, return_message: 'already processed' },
    };
  }

  if (payment.status !== 'PENDING') {
    const conflict =
      payment.status !== incomingStatus ||
      (payment.transactionId !== null &&
        transactionId !== null &&
        payment.transactionId !== transactionId);

    deps.logEvent(
      conflict ? 'payment.callback.conflict' : 'payment.callback.replay_ignored',
      {
        orderId,
        existingStatus: payment.status,
        incomingStatus,
        existingTransactionId: payment.transactionId,
        incomingTransactionId: transactionId,
      },
    );
    await safeWriteCallbackAudit(deps, {
      orderId,
      provider: 'ZALOPAY',
      event: conflict ? 'conflict' : 'replay_ignored',
      incomingStatus,
      existingStatus: payment.status,
      transactionId,
      existingTransactionId: payment.transactionId,
      incomingTransactionId: transactionId,
    });

    return {
      status: 200,
      body: { return_code: 1, return_message: 'already processed' },
    };
  }

  const transitionResult = await deps.applyPaymentTransition({
    orderId,
    paymentStatus: incomingStatus,
    transactionId,
  });
  if (!transitionResult.applied) {
    deps.logEvent(
      transitionResult.conflict
        ? 'payment.callback.conflict'
        : 'payment.callback.replay_ignored',
      {
        orderId,
        existingStatus: payment.status,
        incomingStatus,
        existingTransactionId: payment.transactionId,
        incomingTransactionId: transactionId,
      },
    );
    await safeWriteCallbackAudit(deps, {
      orderId,
      provider: 'ZALOPAY',
      event: transitionResult.conflict ? 'conflict' : 'replay_ignored',
      incomingStatus,
      existingStatus: payment.status,
      transactionId,
      existingTransactionId: payment.transactionId,
      incomingTransactionId: transactionId,
    });

    return {
      status: 200,
      body: { return_code: 1, return_message: 'already processed' },
    };
  }

  if (deps.dispatchNotificationEvent) {
    const orderStatus = incomingStatus === 'PAID' ? 'CONFIRMED' : 'CANCELLED';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    void deps
      .dispatchNotificationEvent({
        eventType: 'ORDER_STATUS_CHANGED',
        entityId: orderId,
        correlationKey: `order:${orderId}:status:${orderStatus}:${transactionId ?? 'none'}`,
        targetUserId: payment.userId ?? null,
        targetEmail: payment.customerEmail || payment.userEmail || null,
        payload: {
          orderId,
          orderNumber: payment.orderNumber,
          orderStatus,
          provider: 'ZALOPAY',
          transactionId,
          occurredAt: new Date().toISOString(),
          linkUrl: `${appUrl}/orders`,
        },
      })
      .catch((error) => {
        deps.logEvent('notification.dispatch.failed', {
          orderId,
          provider: 'ZALOPAY',
          error: error instanceof Error ? error.message : String(error),
        });
      });
  }

  deps.logEvent('payment.callback.processed', {
    orderId,
    outcome: 'state_updated',
    paymentStatus: incomingStatus,
    transactionId,
  });
  await safeWriteCallbackAudit(deps, {
    orderId,
    provider: 'ZALOPAY',
    event: 'processed',
    incomingStatus,
    transactionId,
    outcome: 'state_updated',
  });

  return { status: 200, body: { return_code: 1, return_message: 'success' } };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await handleZaloPayCallbackRequest(body, defaultDeps);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('ZaloPay callback error:', error);
    return NextResponse.json(
      {
        return_code: 0,
        return_message: 'server error',
      },
      { status: 500 },
    );
  }
}
