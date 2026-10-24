/**
 * VNPay Callback / IPN Route
 * Called by VNPay server or redirected from customer after payment completion
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyVNPayCallback, type VNPayVerifyResult } from '@/lib/payment/vnpay';
import { applyCouponLifecycleForOrderStatus } from '@/lib/incentives/redemption-lifecycle';
import {
  cancelOrderAndRestoreStock,
  confirmOrderUnlessCancelled,
} from '@/lib/orders/stock';
import { dispatchNotificationEvent } from '@/lib/notifications/dispatcher';
import {
  writePaymentCallbackAuditLog,
  type PaymentCallbackAuditPayload,
} from '@/lib/order-audit';

type PaymentSnapshot = {
  orderId: string;
  status: string;
  transactionId: string | null;
  amount: number;
  userId: string | null;
  customerEmail: string | null;
  userEmail: string | null;
  orderNumber: string | null;
};

export type VNPayCallbackDeps = {
  verifyCallback: (params: Record<string, unknown>) => VNPayVerifyResult;
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

const defaultDeps: VNPayCallbackDeps = {
  verifyCallback: verifyVNPayCallback,
  findPaymentByOrderId: async (orderId) =>
    prisma.payment.findUnique({
      where: { orderId },
      select: {
        orderId: true,
        status: true,
        transactionId: true,
        amount: true,
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
        amount: Number(payment.amount),
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

      if (nextOrderStatus === 'CANCELLED') {
        await cancelOrderAndRestoreStock(tx, orderId);
      } else if (nextOrderStatus === 'CONFIRMED') {
        // Paid after the order was cancelled: keep it cancelled (its stock
        // is already back) and the coupon released. The PAID payment row
        // still commits — it is what a refund follows up on — and the
        // conflict is logged instead of notifying a confirmation.
        if (!(await confirmOrderUnlessCancelled(tx, orderId))) {
          return { applied: false, conflict: true };
        }
      }
      if (nextOrderStatus) {
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
        provider: 'VNPAY',
        ...payload,
      }),
    );
  },
};

async function safeWriteCallbackAudit(
  deps: VNPayCallbackDeps,
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

export async function handleVNPayCallbackRequest(
  queryParams: Record<string, unknown>,
  deps: VNPayCallbackDeps = defaultDeps,
) {
  if (!queryParams || typeof queryParams !== 'object' || Object.keys(queryParams).length === 0) {
    deps.logEvent('payment.callback.invalid_payload', {
      reason: 'empty_query_parameters',
    });
    await safeWriteCallbackAudit(deps, {
      orderId: 'unknown',
      provider: 'VNPAY',
      event: 'invalid_payload',
      reason: 'empty_query_parameters',
    });
    return {
      status: 400,
      body: { RspCode: '99', Message: 'Dữ liệu không hợp lệ' },
    };
  }

  const verifyResult = deps.verifyCallback(queryParams);

  if (!verifyResult.isValid) {
    deps.logEvent('payment.callback.verification_failed', {
      reason: 'invalid_checksum',
    });
    await safeWriteCallbackAudit(deps, {
      orderId: verifyResult.orderId || 'unknown',
      provider: 'VNPAY',
      event: 'verification_failed',
      reason: 'invalid_checksum',
    });
    return {
      status: 200,
      body: { RspCode: '97', Message: 'Invalid Checksum' },
    };
  }

  const { orderId, amount, transactionId, isSuccess } = verifyResult;
  const incomingStatus = isSuccess ? 'PAID' : 'FAILED';

  if (!orderId) {
    deps.logEvent('payment.callback.invalid_payload', {
      reason: 'missing_txn_ref',
    });
    await safeWriteCallbackAudit(deps, {
      orderId: 'unknown',
      provider: 'VNPAY',
      event: 'invalid_payload',
      reason: 'missing_txn_ref',
    });
    return {
      status: 400,
      body: { RspCode: '01', Message: 'Không tìm thấy đơn hàng' },
    };
  }

  deps.logEvent('payment.callback.received', {
    orderId,
    incomingStatus,
    transactionId,
    amount,
  });
  await safeWriteCallbackAudit(deps, {
    orderId,
    provider: 'VNPAY',
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
      provider: 'VNPAY',
      event: 'processed',
      incomingStatus,
      transactionId,
      outcome: 'missing_payment',
    });
    return {
      status: 200,
      body: { RspCode: '01', Message: 'Không tìm thấy đơn hàng' },
    };
  }

  if (Math.round(payment.amount) !== Math.round(amount)) {
    deps.logEvent('payment.callback.verification_failed', {
      orderId,
      reason: 'amount_mismatch',
      expectedAmount: payment.amount,
      incomingAmount: amount,
    });
    await safeWriteCallbackAudit(deps, {
      orderId,
      provider: 'VNPAY',
      event: 'verification_failed',
      reason: 'amount_mismatch',
      incomingStatus,
      transactionId,
    });
    return {
      status: 400,
      body: { RspCode: '04', Message: 'Invalid amount' },
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
      provider: 'VNPAY',
      event: conflict ? 'conflict' : 'replay_ignored',
      incomingStatus,
      existingStatus: payment.status,
      transactionId,
      existingTransactionId: payment.transactionId,
      incomingTransactionId: transactionId,
    });

    return {
      status: 200,
      body: { RspCode: '02', Message: 'Order already confirmed' },
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
      provider: 'VNPAY',
      event: transitionResult.conflict ? 'conflict' : 'replay_ignored',
      incomingStatus,
      existingStatus: payment.status,
      transactionId,
      existingTransactionId: payment.transactionId,
      incomingTransactionId: transactionId,
    });

    return {
      status: 200,
      body: { RspCode: '02', Message: 'Order already confirmed' },
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
          provider: 'VNPAY',
          transactionId,
          occurredAt: new Date().toISOString(),
          linkUrl: `${appUrl}/orders/${payment.orderNumber}`,
        },
      })
      .catch((error) => {
        deps.logEvent('notification.dispatch.failed', {
          orderId,
          provider: 'VNPAY',
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
    provider: 'VNPAY',
    event: 'processed',
    incomingStatus,
    transactionId,
    outcome: 'state_updated',
  });

  return { status: 200, body: { RspCode: '00', Message: 'Confirm Success' } };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const queryParams: Record<string, string> = {};
    searchParams.forEach((val, key) => {
      queryParams[key] = val;
    });

    const result = await handleVNPayCallbackRequest(queryParams, defaultDeps);

    // If redirected user from browser, redirect them to checkout success/failure page
    const acceptHeader = request.headers.get('accept') || '';
    if (acceptHeader.includes('text/html')) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const orderId = queryParams.vnp_TxnRef;
      const isSuccess = queryParams.vnp_ResponseCode === '00';
      return NextResponse.redirect(
        `${appUrl}/checkout/success?orderId=${orderId}&paymentStatus=${isSuccess ? 'PAID' : 'FAILED'}`,
      );
    }

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('VNPay callback GET error:', error);
    return NextResponse.json(
      { RspCode: '99', Message: 'Server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await handleVNPayCallbackRequest(body, defaultDeps);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('VNPay callback POST error:', error);
    return NextResponse.json(
      { RspCode: '99', Message: 'Server error' },
      { status: 500 },
    );
  }
}
