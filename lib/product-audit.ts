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

function isMissingAuditTableError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2021'
  );
}

export async function writeProductAuditLog(payload: ProductAuditPayload) {
  try {
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
  } catch (error: unknown) {
    if (!isMissingAuditTableError(error)) throw error;
    console.warn('ProductAuditLog table is missing; skip writing audit log.');
  }
}

type ProductAuditWriter = Pick<Prisma.TransactionClient, 'productAuditLog'>;

export async function writeProductAuditLogWithClient(
  client: ProductAuditWriter,
  payload: ProductAuditPayload,
) {
  try {
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
  } catch (error: unknown) {
    if (!isMissingAuditTableError(error)) throw error;
    console.warn('ProductAuditLog table is missing; skip writing audit log.');
  }
}
