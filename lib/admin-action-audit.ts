import { Prisma } from '@prisma/client';
import type { UserRole } from '@prisma/client';

import { prisma } from '@/lib/prisma';

type AdminActionCorrelation = {
  requestId: string;
  route: string;
  httpMethod: string;
  orderId?: string | null;
  paymentId?: string | null;
  transactionId?: string | null;
  attempt?: number | null;
};

export type AdminActionAuditPayload = {
  module: string;
  entity: string;
  entityId: string;
  mutationType: string;
  summary: string;
  actorUserId?: string | null;
  actorRole?: UserRole | null;
  correlation: AdminActionCorrelation;
};

export type AdminActionAuditMetadata = {
  source: 'admin_action';
  module: string;
  entity: string;
  entityId: string;
  summary: string;
  correlation: AdminActionCorrelation;
};

type AdminAuditWriter = Pick<Prisma.TransactionClient, 'settingAuditLog'>;

function isMissingAuditTableError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2021'
  );
}

function toJsonInput(
  value: unknown,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  if (value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

function normalizeNullableString(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeNullableNumber(value: unknown) {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return value;
}

export function buildRequestCorrelation(
  request: Pick<Request, 'headers' | 'method'>,
  route: string,
  extra?: Partial<{
    orderId: string | null;
    paymentId: string | null;
    transactionId: string | null;
    attempt: number | null;
  }>,
): AdminActionCorrelation {
  const headerRequestId =
    normalizeNullableString(request.headers.get('x-request-id')) ??
    normalizeNullableString(request.headers.get('x-correlation-id'));

  return {
    requestId: headerRequestId ?? crypto.randomUUID(),
    route,
    httpMethod: request.method.toUpperCase(),
    orderId: normalizeNullableString(extra?.orderId),
    paymentId: normalizeNullableString(extra?.paymentId),
    transactionId: normalizeNullableString(extra?.transactionId),
    attempt: normalizeNullableNumber(extra?.attempt),
  };
}

function buildMetadata(payload: AdminActionAuditPayload): AdminActionAuditMetadata {
  return {
    source: 'admin_action',
    module: payload.module,
    entity: payload.entity,
    entityId: payload.entityId,
    summary: payload.summary,
    correlation: payload.correlation,
  };
}

export async function writeAdminActionAuditLog(payload: AdminActionAuditPayload) {
  const metadata = buildMetadata(payload);
  try {
    await prisma.settingAuditLog.create({
      data: {
        settingKey: `admin_action:${payload.entity}:${payload.entityId}`,
        mutationType: payload.mutationType,
        actorUserId: payload.actorUserId ?? null,
        actorRole: payload.actorRole ?? null,
        beforeValue: null,
        afterValue: null,
        metadata: toJsonInput(metadata),
      },
    });
  } catch (error: unknown) {
    if (isMissingAuditTableError(error)) {
      console.warn('SettingAuditLog table is missing; skip admin action audit log.');
      return;
    }
    console.error('Failed to persist admin action audit log.', error);
  }
}

export async function writeAdminActionAuditLogWithClient(
  client: AdminAuditWriter,
  payload: AdminActionAuditPayload,
) {
  const metadata = buildMetadata(payload);
  try {
    await client.settingAuditLog.create({
      data: {
        settingKey: `admin_action:${payload.entity}:${payload.entityId}`,
        mutationType: payload.mutationType,
        actorUserId: payload.actorUserId ?? null,
        actorRole: payload.actorRole ?? null,
        beforeValue: null,
        afterValue: null,
        metadata: toJsonInput(metadata),
      },
    });
  } catch (error: unknown) {
    if (isMissingAuditTableError(error)) {
      console.warn('SettingAuditLog table is missing; skip admin action audit log.');
      return;
    }
    console.error('Failed to persist admin action audit log (transaction client).', error);
  }
}
