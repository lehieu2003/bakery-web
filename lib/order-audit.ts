import { Prisma } from '@prisma/client';
import type { UserRole } from '@prisma/client';

import { prisma } from '@/lib/prisma';

type OrderAuditPayload = {
  orderId: string;
  mutationType: 'STATUS_UPDATE' | 'PAYMENT_CALLBACK' | 'REFUND_MARKED';
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

function isSkippableAuditWriteError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2021'
  );
}

function sanitizeCallbackMetadata(metadata: Record<string, unknown>) {
  const safeMetadata = { ...metadata };
  for (const blockedKey of [
    'mac',
    'signature',
    'secret',
    'rawPayload',
    'payload',
  ]) {
    delete safeMetadata[blockedKey];
  }

  return safeMetadata;
}

export type PaymentCallbackAuditPayload = {
  orderId: string;
  provider: 'MOMO' | 'VNPAY';
  event:
    | 'received'
    | 'processed'
    | 'replay_ignored'
    | 'conflict'
    | 'verification_failed'
    | 'invalid_payload';
  incomingStatus?: string | null;
  existingStatus?: string | null;
  transactionId?: string | null;
  existingTransactionId?: string | null;
  incomingTransactionId?: string | null;
  outcome?: string | null;
  reason?: string | null;
  rawResultCode?: number | null;
};

export async function writeOrderAuditLog(payload: OrderAuditPayload) {
  try {
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
  } catch (error: unknown) {
    if (!isSkippableAuditWriteError(error)) throw error;
    console.warn(
      'OrderAuditLog write skipped due to missing table or relation.',
    );
  }
}

type OrderAuditWriter = Pick<Prisma.TransactionClient, 'orderAuditLog'>;

export async function writeOrderAuditLogWithClient(
  client: OrderAuditWriter,
  payload: OrderAuditPayload,
) {
  try {
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
  } catch (error: unknown) {
    if (!isSkippableAuditWriteError(error)) throw error;
    console.warn(
      'OrderAuditLog write skipped due to missing table or relation.',
    );
  }
}

export async function writePaymentCallbackAuditLog(
  payload: PaymentCallbackAuditPayload,
) {
  const metadata = sanitizeCallbackMetadata({
    source: 'payment_callback',
    provider: payload.provider,
    event: payload.event,
    incomingStatus: payload.incomingStatus ?? null,
    existingStatus: payload.existingStatus ?? null,
    transactionId: payload.transactionId ?? null,
    existingTransactionId: payload.existingTransactionId ?? null,
    incomingTransactionId: payload.incomingTransactionId ?? null,
    outcome: payload.outcome ?? null,
    reason: payload.reason ?? null,
    rawResultCode: payload.rawResultCode ?? null,
  });

  await writeOrderAuditLog({
    orderId: payload.orderId,
    mutationType: 'PAYMENT_CALLBACK',
    actorUserId: null,
    actorRole: null,
    metadata,
  });
}
