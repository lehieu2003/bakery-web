import type { UserRole } from '@prisma/client';

import { prisma } from '@/lib/prisma';

type ProductAuditPayload = {
  productId: string;
  mutationType: 'CREATE' | 'UPDATE' | 'DELETE';
  actorUserId?: string | null;
  actorRole?: UserRole | null;
  beforeData?: unknown;
  afterData?: unknown;
  metadata?: Record<string, unknown>;
};

export async function writeProductAuditLog(payload: ProductAuditPayload) {
  await prisma.productAuditLog.create({
    data: {
      productId: payload.productId,
      productRefId: payload.productId,
      mutationType: payload.mutationType,
      actorUserId: payload.actorUserId ?? null,
      actorRole: payload.actorRole ?? null,
      beforeData: payload.beforeData as object | undefined,
      afterData: payload.afterData as object | undefined,
      metadata: payload.metadata,
    },
  });
}

type ProductAuditWriter = {
  productAuditLog: {
    create: (args: {
      data: {
        productId: string | null;
        productRefId: string;
        mutationType: string;
        actorUserId: string | null;
        actorRole: UserRole | null;
        beforeData?: object;
        afterData?: object;
        metadata?: Record<string, unknown>;
      };
    }) => Promise<unknown>;
  };
};

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
      beforeData: payload.beforeData as object | undefined,
      afterData: payload.afterData as object | undefined,
      metadata: payload.metadata,
    },
  });
}
