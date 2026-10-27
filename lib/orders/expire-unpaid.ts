import { prisma } from '@/lib/prisma';
import { applyCouponLifecycleForOrderStatus } from '@/lib/incentives/redemption-lifecycle';
import { cancelOrderAndRestoreStock } from '@/lib/orders/stock';

/**
 * Bank transfer orders take stock at checkout and stay PENDING until an
 * admin confirms the money arrived. One never paid for would hold that
 * stock forever, so after a TTL it is cancelled and its stock and coupon
 * reservation are given back. COD orders are left alone: a valid one can
 * wait until delivery.
 */

export function expiredBankTransferOrdersQuery(threshold: Date, batchSize: number) {
  return {
    where: {
      status: 'PENDING' as const,
      paymentMethod: 'BANK_TRANSFER' as const,
      createdAt: { lt: threshold },
    },
    select: { id: true },
    orderBy: { createdAt: 'asc' as const },
    take: batchSize,
  };
}

export type ExpireUnpaidDeps = {
  findExpiredOrderIds: (threshold: Date, batchSize: number) => Promise<string[]>;
  /** Returns false when the order is no longer PENDING (confirmed or cancelled meanwhile). */
  cancelExpiredOrder: (orderId: string) => Promise<boolean>;
};

const defaultDeps: ExpireUnpaidDeps = {
  findExpiredOrderIds: async (threshold, batchSize) => {
    const rows = await prisma.order.findMany(
      expiredBankTransferOrdersQuery(threshold, batchSize),
    );
    return rows.map((row) => row.id);
  },
  cancelExpiredOrder: (orderId) =>
    prisma.$transaction(async (tx) => {
      const cancelled = await cancelOrderAndRestoreStock(tx, orderId, {
        onlyIfStatus: 'PENDING',
      });
      if (!cancelled) return false;
      await applyCouponLifecycleForOrderStatus({
        orderId,
        status: 'CANCELLED',
        reason: 'BANK_TRANSFER_EXPIRED',
        tx,
      });
      return true;
    }),
};

export async function expireUnpaidBankTransferOrders(
  args: { olderThanHours: number; batchSize: number; now?: () => Date },
  deps: ExpireUnpaidDeps = defaultDeps,
): Promise<{ scanned: number; cancelled: number; threshold: Date }> {
  const now = args.now ?? (() => new Date());
  const threshold = new Date(now().getTime() - args.olderThanHours * 60 * 60 * 1000);

  const orderIds = await deps.findExpiredOrderIds(threshold, args.batchSize);

  let cancelled = 0;
  for (const orderId of orderIds) {
    try {
      if (await deps.cancelExpiredOrder(orderId)) cancelled += 1;
    } catch (error) {
      // Leave this order for the next run; the rest of the batch still goes.
      console.error(`Expire unpaid order ${orderId} failed:`, error);
    }
  }

  return { scanned: orderIds.length, cancelled, threshold };
}
