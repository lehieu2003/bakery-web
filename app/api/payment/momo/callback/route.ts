/**
 * MoMo IPN (Instant Payment Notification) Callback
 * Called by MoMo server after payment completion
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMoMoCallback } from '@/lib/payment/momo';
import { applyCouponLifecycleForOrderStatus } from '@/lib/incentives/redemption-lifecycle';

type PaymentSnapshot = {
  orderId: string;
  status: string;
  transactionId: string | null;
};

type MomoCallbackDeps = {
  verifyCallback: (params: Record<string, string>) => boolean;
  findPaymentByOrderId: (orderId: string) => Promise<PaymentSnapshot | null>;
  applyPaymentTransition: (args: {
    orderId: string;
    paymentStatus: string;
    transactionId: string | null;
  }) => Promise<void>;
  logEvent: (event: string, payload: Record<string, unknown>) => void;
};

const defaultDeps: MomoCallbackDeps = {
  verifyCallback: verifyMoMoCallback,
  findPaymentByOrderId: async (orderId) =>
    prisma.payment.findUnique({
      where: { orderId },
      select: { orderId: true, status: true, transactionId: true },
    }),
  applyPaymentTransition: async ({ orderId, paymentStatus, transactionId }) => {
    const nextOrderStatus =
      paymentStatus === 'PAID'
        ? 'CONFIRMED'
        : paymentStatus === 'FAILED'
          ? 'CANCELLED'
          : null;

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { orderId },
        data: {
          status: paymentStatus,
          transactionId: transactionId ?? undefined,
        },
      });

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
    });
  },
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

  const payment = await deps.findPaymentByOrderId(orderId);
  if (!payment) {
    deps.logEvent('payment.callback.processed', {
      orderId,
      outcome: 'missing_payment',
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

    return {
      status: 200,
      body: { resultCode: 0, message: 'already processed' },
    };
  }

  await deps.applyPaymentTransition({
    orderId,
    paymentStatus: incomingStatus,
    transactionId,
  });

  deps.logEvent('payment.callback.processed', {
    orderId,
    outcome: 'state_updated',
    paymentStatus: incomingStatus,
    transactionId,
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
