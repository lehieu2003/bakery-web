/**
 * MoMo IPN (Instant Payment Notification) Callback
 * Called by MoMo server after payment completion
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMoMoCallback } from '@/lib/payment/momo';
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

type MomoCallbackDeps = {
  verifyCallback: (params: Record<string, string>) => boolean;
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

const defaultDeps: MomoCallbackDeps = {
  verifyCallback: verifyMoMoCallback,
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
        provider: 'MOMO',
        ...payload,
      }),
    );
  },
};

async function safeWriteCallbackAudit(
  deps: MomoCallbackDeps,
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

function normalizeNullableText(value: unknown): string | null {
  const text = normalizeText(value);
  return text ? text : null;
}

function normalizeNumericCode(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function safeVerifyMomoSignature(
  verify: MomoCallbackDeps['verifyCallback'],
  payload: Record<string, unknown>,
) {
  try {
    const normalized = Object.fromEntries(
      Object.entries(payload).map(([key, value]) => [key, String(value ?? '')]),
    );
    return verify(normalized);
  } catch {
    return false;
  }
}

export async function handleMoMoCallbackRequest(
  body: unknown,
  deps: MomoCallbackDeps = defaultDeps,
) {
  const payload = normalizeAsRecord(body);
  if (!payload) {
    return {
      status: 400,
      body: { resultCode: 1, message: 'Invalid payload' },
    };
  }

  if (!safeVerifyMomoSignature(deps.verifyCallback, payload)) {
    deps.logEvent('payment.callback.verification_failed', {
      reason: 'invalid_signature',
    });
    await safeWriteCallbackAudit(deps, {
      orderId: normalizeText(payload.orderId),
      provider: 'MOMO',
      event: 'verification_failed',
      reason: 'invalid_signature',
    });
    return {
      status: 400,
      body: { resultCode: 1, message: 'Invalid signature' },
    };
  }

  const orderId = normalizeText(payload.orderId);
  const resultCode = normalizeNumericCode(payload.resultCode);
  const transactionId = normalizeNullableText(payload.transId);

  if (!orderId || resultCode === null) {
    deps.logEvent('payment.callback.invalid_payload', {
      orderId,
      resultCode,
    });
    await safeWriteCallbackAudit(deps, {
      orderId,
      provider: 'MOMO',
      event: 'invalid_payload',
      reason: 'missing_orderId_or_resultCode',
      rawResultCode: resultCode,
    });
    return {
      status: 400,
      body: { resultCode: 1, message: 'Invalid payload' },
    };
  }

  const incomingStatus = resultCode === 0 ? 'PAID' : 'FAILED';
  deps.logEvent('payment.callback.received', {
    orderId,
    transactionId,
    incomingStatus,
    rawResultCode: resultCode,
  });
  await safeWriteCallbackAudit(deps, {
    orderId,
    provider: 'MOMO',
    event: 'received',
    incomingStatus,
    transactionId,
    rawResultCode: resultCode,
  });

  const payment = await deps.findPaymentByOrderId(orderId);
  if (!payment) {
    deps.logEvent('payment.callback.processed', {
      orderId,
      outcome: 'missing_payment',
    });
    await safeWriteCallbackAudit(deps, {
      orderId,
      provider: 'MOMO',
      event: 'processed',
      incomingStatus,
      transactionId,
      outcome: 'missing_payment',
      rawResultCode: resultCode,
    });
    return {
      status: 200,
      body: { resultCode: 0, message: 'already processed' },
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
      provider: 'MOMO',
      event: conflict ? 'conflict' : 'replay_ignored',
      incomingStatus,
      existingStatus: payment.status,
      transactionId,
      existingTransactionId: payment.transactionId,
      incomingTransactionId: transactionId,
      rawResultCode: resultCode,
    });

    return {
      status: 200,
      body: { resultCode: 0, message: 'already processed' },
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
      provider: 'MOMO',
      event: transitionResult.conflict ? 'conflict' : 'replay_ignored',
      incomingStatus,
      existingStatus: payment.status,
      transactionId,
      existingTransactionId: payment.transactionId,
      incomingTransactionId: transactionId,
      rawResultCode: resultCode,
    });

    return {
      status: 200,
      body: { resultCode: 0, message: 'already processed' },
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
          provider: 'MOMO',
          transactionId,
          occurredAt: new Date().toISOString(),
          linkUrl: `${appUrl}/orders`,
        },
      })
      .catch((error) => {
        deps.logEvent('notification.dispatch.failed', {
          orderId,
          provider: 'MOMO',
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
    provider: 'MOMO',
    event: 'processed',
    incomingStatus,
    transactionId,
    outcome: 'state_updated',
    rawResultCode: resultCode,
  });

  // MoMo expects this exact response format
  return { status: 200, body: { resultCode: 0, message: 'OK' } };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await handleMoMoCallbackRequest(body, defaultDeps);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('MoMo callback error:', error);
    return NextResponse.json(
      { resultCode: 1, message: 'Server error' },
      { status: 500 },
    );
  }
}
