import { Prisma } from '@prisma/client';
import type { UserRole } from '@prisma/client';

import { prisma } from '@/lib/prisma';

type SettingAuditPayload = {
  settingKey: string;
  mutationType: 'UPSERT';
  actorUserId?: string | null;
  actorRole?: UserRole | null;
  beforeValue?: string | null;
  afterValue?: string | null;
  metadata?: unknown;
};

function toNullableJsonInput(
  value: unknown,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

type SettingAuditWriter = Pick<Prisma.TransactionClient, 'settingAuditLog'>;

export async function writeSettingAuditLogWithClient(
  client: SettingAuditWriter,
  payload: SettingAuditPayload,
) {
  await client.settingAuditLog.create({
    data: {
      settingKey: payload.settingKey,
      mutationType: payload.mutationType,
      actorUserId: payload.actorUserId ?? null,
      actorRole: payload.actorRole ?? null,
      beforeValue: payload.beforeValue ?? null,
      afterValue: payload.afterValue ?? null,
      metadata: toNullableJsonInput(payload.metadata),
    },
  });
}

export async function writeSettingAuditLog(payload: SettingAuditPayload) {
  await prisma.settingAuditLog.create({
    data: {
      settingKey: payload.settingKey,
      mutationType: payload.mutationType,
      actorUserId: payload.actorUserId ?? null,
      actorRole: payload.actorRole ?? null,
      beforeValue: payload.beforeValue ?? null,
      afterValue: payload.afterValue ?? null,
      metadata: toNullableJsonInput(payload.metadata),
    },
  });
}
