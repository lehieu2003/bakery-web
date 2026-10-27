import { Prisma, type OrderStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const INCENTIVE_USAGE_LIMIT_REACHED = 'INCENTIVE_USAGE_LIMIT_REACHED';
export const INCENTIVE_PER_USER_LIMIT_REACHED =
  'INCENTIVE_PER_USER_LIMIT_REACHED';

type TxClient = Prisma.TransactionClient;

type ReserveCouponArgs = {
  tx: TxClient;
  couponId: string;
  couponCode: string;
  usageLimit: number | null;
  perUserLimit: number | null;
  orderId: string;
  userId: string | null;
  /** Normalized phone of the order; identifies a guest for perUserLimit. */
  customerPhone?: string | null;
  reservedDiscount: number;
};

export async function reserveCouponRedemption(args: ReserveCouponArgs) {
  const {
    tx,
    couponId,
    couponCode,
    usageLimit,
    perUserLimit,
    orderId,
    userId,
    customerPhone,
    reservedDiscount,
  } = args;

  // Signed-in customers are counted by account; guests by the phone on
  // their orders, or a guest could reuse a once-per-customer code forever.
  const customerScope = userId
    ? { userId }
    : customerPhone
      ? { order: { customerPhone } }
      : null;

  if (customerScope && perUserLimit !== null && perUserLimit > 0) {
    const customerUsageCount = await tx.couponRedemption.count({
      where: {
        couponId,
        ...customerScope,
        state: { in: ['RESERVED', 'COMMITTED'] },
      },
    });

    if (customerUsageCount >= perUserLimit) {
      throw new Error(INCENTIVE_PER_USER_LIMIT_REACHED);
    }
  }

  if (usageLimit !== null) {
    const reserveResult = await tx.coupon.updateMany({
      where: {
        id: couponId,
        code: couponCode,
        isActive: true,
        usageLimit: { gt: 0 },
      },
      data: {
        usageLimit: { decrement: 1 },
      },
    });

    if (reserveResult.count === 0) {
      throw new Error(INCENTIVE_USAGE_LIMIT_REACHED);
    }
  }

  await tx.couponRedemption.create({
    data: {
      couponId,
      orderId,
      userId,
      state: 'RESERVED',
      reservedDiscount,
    },
  });
}

export async function commitCouponRedemptionByOrderId(
  orderId: string,
  tx?: TxClient,
) {
  const executor = async (client: TxClient) => {
    const redemptions = await client.couponRedemption.findMany({
      where: { orderId },
      select: { id: true, state: true },
    });

    if (redemptions.length === 0) return 'MISSING' as const;

    const reservableIds = redemptions
      .filter((redemption) => redemption.state === 'RESERVED')
      .map((redemption) => redemption.id);

    if (reservableIds.length === 0) {
      if (redemptions.every((redemption) => redemption.state === 'COMMITTED')) {
        return 'NOOP_COMMITTED' as const;
      }
      if (redemptions.every((redemption) => redemption.state === 'RELEASED')) {
        return 'NOOP_RELEASED' as const;
      }
      return 'NOOP_COMMITTED' as const;
    }

    await client.couponRedemption.updateMany({
      where: { id: { in: reservableIds } },
      data: {
        state: 'COMMITTED',
        committedAt: new Date(),
        releaseReason: null,
      },
    });
    return 'COMMITTED' as const;
  };

  if (tx) return executor(tx);
  return prisma.$transaction(executor);
}

/**
 * Reservations that are safe to give back after a timeout: online payments
 * the customer never completed, and orders already cancelled. COD and bank
 * transfer orders legitimately stay PENDING until an admin confirms them —
 * releasing theirs would let the later commit find nothing to count.
 */
export function staleCouponReservationsQuery(threshold: Date, batchSize: number) {
  return {
    where: {
      state: 'RESERVED' as const,
      reservedAt: { lt: threshold },
      OR: [
        {
          order: {
            status: 'PENDING' as const,
            paymentMethod: { in: ['MOMO' as const, 'VNPAY' as const] },
          },
        },
        { order: { status: 'CANCELLED' as const } },
      ],
    },
    select: { orderId: true },
    orderBy: { reservedAt: 'asc' as const },
    take: batchSize,
  };
}

export async function releaseStaleCouponReservations(args?: {
  olderThanMinutes: number;
  now?: Date;
  reason?: string;
  batchSize?: number;
}) {
  const now = args?.now ?? new Date();
  const olderThanMinutes = Math.max(args?.olderThanMinutes ?? 30, 1);
  const reason = args?.reason ?? 'STALE_TIMEOUT';
  const batchSize = Math.max(args?.batchSize ?? 100, 1);

  const threshold = new Date(now.getTime() - olderThanMinutes * 60_000);
  const staleReservations = await prisma.couponRedemption.findMany(
    staleCouponReservationsQuery(threshold, batchSize),
  );

  const uniqueOrderIds = Array.from(
    new Set(staleReservations.map((reservation) => reservation.orderId)),
  );

  let released = 0;
  for (const orderId of uniqueOrderIds) {
    const result = await releaseCouponRedemptionByOrderId(orderId, reason);
    if (result === 'RELEASED') {
      released += 1;
    }
  }

  return {
    scanned: staleReservations.length,
    released,
    threshold,
  };
}

export async function releaseCouponRedemptionByOrderId(
  orderId: string,
  reason: string,
  tx?: TxClient,
) {
  const executor = async (client: TxClient) => {
    const redemptions = await client.couponRedemption.findMany({
      where: { orderId },
      select: {
        id: true,
        state: true,
        coupon: {
          select: {
            id: true,
            usageLimit: true,
          },
        },
      },
    });

    if (redemptions.length === 0) return 'MISSING' as const;

    const releasable = redemptions.filter(
      (redemption) => redemption.state === 'RESERVED',
    );

    if (releasable.length === 0) {
      if (redemptions.every((redemption) => redemption.state === 'RELEASED')) {
        return 'NOOP_RELEASED' as const;
      }
      if (redemptions.some((redemption) => redemption.state === 'COMMITTED')) {
        return 'NOOP_COMMITTED' as const;
      }
      return 'NOOP_RELEASED' as const;
    }

    let releasedAny = false;
    for (const redemption of releasable) {
      // Conditional per row: a concurrent releaser that read the same
      // RESERVED snapshot flips nothing here and must not give the usage
      // slot back a second time.
      const released = await client.couponRedemption.updateMany({
        where: { id: redemption.id, state: 'RESERVED' },
        data: {
          state: 'RELEASED',
          releasedAt: new Date(),
          releaseReason: reason,
        },
      });
      if (released.count === 0) continue;
      releasedAny = true;
      if (redemption.coupon.usageLimit === null) continue;
      await client.coupon.update({
        where: { id: redemption.coupon.id },
        data: {
          usageLimit: { increment: 1 },
        },
      });
    }

    return releasedAny ? ('RELEASED' as const) : ('NOOP_RELEASED' as const);
  };

  if (tx) return executor(tx);
  return prisma.$transaction(executor);
}

export async function applyCouponLifecycleForOrderStatus(args: {
  orderId: string;
  status: OrderStatus | string;
  reason?: string;
  tx?: TxClient;
}) {
  const { orderId, status, reason, tx } = args;
  if (status === 'CANCELLED') {
    return releaseCouponRedemptionByOrderId(orderId, reason ?? 'ORDER_CANCELLED', tx);
  }
  if (status === 'CONFIRMED' || status === 'COMPLETED') {
    return commitCouponRedemptionByOrderId(orderId, tx);
  }
  return 'NOOP_STATUS' as const;
}
