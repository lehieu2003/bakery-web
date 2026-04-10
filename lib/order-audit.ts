import { Prisma } from '@prisma/client';
import type { UserRole } from '@prisma/client';

import { prisma } from '@/lib/prisma';

type OrderAuditPayload = {
  orderId: string;
  mutationType: 'STATUS_UPDATE';
  actorUserId?: string | null;
  actorRole?: UserRole | null;
  beforeData?: unknown;
  afterData?: unknown;
  metadata?: unknown;
};

function toNullableJsonInput(
  value: unknown,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

export async function writeOrderAuditLog(payload: OrderAuditPayload) {
  await prisma.orderAuditLog.create({
    data: {
      orderId: payload.orderId,
      mutationType: payload.mutationType,
      actorUserId: payload.actorUserId ?? null,
      actorRole: payload.actorRole ?? null,
      beforeData: toNullableJsonInput(payload.beforeData),
      afterData: toNullableJsonInput(payload.afterData),
      metadata: toNullableJsonInput(payload.metadata),
    },
  });
}

type OrderAuditWriter = Pick<Prisma.TransactionClient, 'orderAuditLog'>;

export async function writeOrderAuditLogWithClient(
  client: OrderAuditWriter,
  payload: OrderAuditPayload,
) {
  await client.orderAuditLog.create({
    data: {
      orderId: payload.orderId,
      mutationType: payload.mutationType,
      actorUserId: payload.actorUserId ?? null,
      actorRole: payload.actorRole ?? null,
      beforeData: toNullableJsonInput(payload.beforeData),
      afterData: toNullableJsonInput(payload.afterData),
      metadata: toNullableJsonInput(payload.metadata),
    },
  });
}
