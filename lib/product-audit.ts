import { Prisma } from '@prisma/client';
import type { UserRole } from '@prisma/client';

import { prisma } from '@/lib/prisma';

type ProductAuditPayload = {
  productId: string;
  mutationType: 'CREATE' | 'UPDATE' | 'DELETE';
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

export async function writeProductAuditLog(payload: ProductAuditPayload) {
  await prisma.productAuditLog.create({
    data: {
      productId: payload.productId,
      productRefId: payload.productId,
      mutationType: payload.mutationType,
      actorUserId: payload.actorUserId ?? null,
      actorRole: payload.actorRole ?? null,
      beforeData: toNullableJsonInput(payload.beforeData),
      afterData: toNullableJsonInput(payload.afterData),
      metadata: toNullableJsonInput(payload.metadata),
    },
  });
}

type ProductAuditWriter = Pick<Prisma.TransactionClient, 'productAuditLog'>;

export async function writeProductAuditLogWithClient(
  client: ProductAuditWriter,
  payload: ProductAuditPayload,
) {
  await client.productAuditLog.create({
    data: {
      productId: payload.productId,
      productRefId: payload.productId,
      mutationType: payload.mutationType,
      actorUserId: payload.actorUserId ?? null,
      actorRole: payload.actorRole ?? null,
      beforeData: toNullableJsonInput(payload.beforeData),
      afterData: toNullableJsonInput(payload.afterData),
      metadata: toNullableJsonInput(payload.metadata),
    },
  });
}
