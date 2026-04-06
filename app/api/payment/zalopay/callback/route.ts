/**
 * ZaloPay Callback
 * Called by ZaloPay server after payment completion
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyZaloPayCallback } from '@/lib/payment/zalopay';
import { applyCouponLifecycleForOrderStatus } from '@/lib/incentives/redemption-lifecycle';

type PaymentSnapshot = {
  orderId: string;
  status: string;
  transactionId: string | null;
};

type ZaloCallbackDeps = {
  verifyCallback: (dataStr: string, mac: string) => boolean;
  findPaymentByOrderId: (orderId: string) => Promise<PaymentSnapshot | null>;
  applyPaymentTransition: (args: {
    orderId: string;
    paymentStatus: string;
    transactionId: string | null;
  }) => Promise<void>;
  logEvent: (event: string, payload: Record<string, unknown>) => void;
};

const defaultDeps: ZaloCallbackDeps = {
  verifyCallback: verifyZaloPayCallback,
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
        provider: 'ZALOPAY',
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
    return {
      status: 400,
      body: { return_code: 0, return_message: 'invalid payload' },
    };
  }

  if (!safeVerifyZaloSignature(deps.verifyCallback, dataStr, mac)) {
    deps.logEvent('payment.callback.verification_failed', {
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

  const payment = await deps.findPaymentByOrderId(orderId);
  if (!payment) {
    deps.logEvent('payment.callback.processed', {
      orderId,
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

    return {
      status: 200,
      body: { return_code: 1, return_message: 'already processed' },
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
