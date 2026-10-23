import { NextRequest, NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { mapAuthErrorToStatus } from '@/lib/rbac';
import { requireAdmin } from '@/lib/session';
import { writeOrderAuditLogWithClient } from '@/lib/order-audit';

type Params = { params: Promise<{ id: string }> };

type AdminUser = { id: string; role: UserRole };

const MAX_NOTE_LENGTH = 500;

type RefundDeps = {
  requireAdmin: () => Promise<AdminUser>;
  /**
   * Flips the payment PAID -> REFUNDED for a cancelled order and writes the
   * audit entry, atomically. Returns false when the order is not awaiting a
   * refund (not cancelled, not paid, or already refunded).
   */
  markRefunded: (args: {
    orderId: string;
    actor: AdminUser;
    note: string | null;
  }) => Promise<boolean>;
};

const defaultDeps: RefundDeps = {
  requireAdmin,
  markRefunded: ({ orderId, actor, note }) =>
    prisma.$transaction(async (tx) => {
      // The refund itself happens on the MoMo/VNPay merchant portal; this
      // only records it. Conditional so a double click marks it once.
      const updated = await tx.payment.updateMany({
        where: { orderId, status: 'PAID', order: { status: 'CANCELLED' } },
        data: { status: 'REFUNDED' },
      });
      if (updated.count === 0) return false;
      await writeOrderAuditLogWithClient(tx, {
        orderId,
        mutationType: 'REFUND_MARKED',
        actorUserId: actor.id,
        actorRole: actor.role,
        beforeData: { paymentStatus: 'PAID' },
        afterData: { paymentStatus: 'REFUNDED' },
        metadata: { note },
      });
      return true;
    }),
};

export async function handleMarkRefundedRequest(
  request: Pick<NextRequest, 'json'>,
  params: Promise<{ id: string }>,
  deps: RefundDeps = defaultDeps,
) {
  const admin = await deps.requireAdmin();
  const { id } = await params;
  const orderId = id.trim();

  let note: string | null = null;
  try {
    const body = (await request.json()) as { note?: unknown } | null;
    if (typeof body?.note === 'string' && body.note.trim()) {
      note = body.note.trim().slice(0, MAX_NOTE_LENGTH);
    }
  } catch {
    // An empty body is fine: the note is optional.
  }

  const marked = await deps.markRefunded({ orderId, actor: admin, note });
  if (!marked) {
    return {
      status: 409,
      body: {
        success: false,
        error: 'Order is not awaiting a refund (it must be cancelled with a paid payment).',
      },
    };
  }
  return { status: 200, body: { success: true, data: { paymentStatus: 'REFUNDED' } } };
}

// POST /api/admin/orders/[id]/refund — record a refund made on the gateway portal
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const result = await handleMarkRefundedRequest(request, params);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = mapAuthErrorToStatus(message);
    if (status === 500) console.error('Mark refunded error:', error);
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Internal server error' : message },
      { status },
    );
  }
}
