import type { Prisma } from '@prisma/client';

type TxClient = Prisma.TransactionClient;

export const OUT_OF_STOCK = 'OUT_OF_STOCK';

/** One stock movement per product or variant, quantities already summed. */
export type StockDecrement = {
  kind: 'product' | 'variant';
  id: string;
  quantity: number;
  /**
   * Tracked stock must cover the quantity. Untracked stock still counts down
   * so a later cancellation can add back exactly what was taken.
   */
  enforce: boolean;
};

/** Sums quantities per key, skipping items without one. */
export function sumQuantitiesBy<T extends { quantity: number }>(
  items: T[],
  keyOf: (item: T) => string | null | undefined,
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const item of items) {
    const key = keyOf(item);
    if (!key) continue;
    totals.set(key, (totals.get(key) ?? 0) + item.quantity);
  }
  return totals;
}

/**
 * Takes stock inside the order transaction. An enforced decrement only
 * applies while enough stock is left, so concurrent orders cannot drive
 * tracked stock below zero; it throws [OUT_OF_STOCK] otherwise.
 */
export async function decrementStock(
  tx: TxClient,
  decrements: StockDecrement[],
): Promise<void> {
  for (const { kind, id, quantity, enforce } of decrements) {
    const args = {
      where: enforce ? { id, stock: { gte: quantity } } : { id },
      data: { stock: { decrement: quantity } },
    };
    const result =
      kind === 'product'
        ? await tx.product.updateMany(args)
        : await tx.productVariant.updateMany(args);
    if (result.count === 0) {
      throw new Error(OUT_OF_STOCK);
    }
  }
}

/**
 * Cancels the order and gives its stock back, exactly once: the status flip
 * is conditional, so a concurrent or repeated cancel restores nothing.
 * Returns false when the order was already cancelled.
 */
export async function cancelOrderAndRestoreStock(
  tx: TxClient,
  orderId: string,
): Promise<boolean> {
  const cancelled = await tx.order.updateMany({
    where: { id: orderId, status: { not: 'CANCELLED' } },
    data: { status: 'CANCELLED' },
  });
  if (cancelled.count === 0) return false;

  const items = await tx.orderItem.findMany({
    where: { orderId },
    select: { productId: true, variantId: true, quantity: true },
  });
  // updateMany: a product or variant deleted since the order is skipped.
  for (const [id, quantity] of sumQuantitiesBy(items, (i) => i.productId)) {
    await tx.product.updateMany({
      where: { id },
      data: { stock: { increment: quantity } },
    });
  }
  for (const [id, quantity] of sumQuantitiesBy(items, (i) => i.variantId)) {
    await tx.productVariant.updateMany({
      where: { id },
      data: { stock: { increment: quantity } },
    });
  }
  return true;
}

/**
 * Confirms a paid order unless it was cancelled meanwhile (e.g. by an admin
 * before the gateway called back) — its stock is already restored, so it
 * must not come back to life. Returns false in that case.
 */
export async function confirmOrderUnlessCancelled(
  tx: TxClient,
  orderId: string,
): Promise<boolean> {
  const confirmed = await tx.order.updateMany({
    where: { id: orderId, status: { not: 'CANCELLED' } },
    data: { status: 'CONFIRMED' },
  });
  return confirmed.count > 0;
}
