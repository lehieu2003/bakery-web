import assert from 'node:assert/strict';
import test from 'node:test';

import { prisma } from '@/lib/prisma';
import {
  writeOrderAuditLog,
  writeOrderAuditLogWithClient,
} from '@/lib/order-audit';

test('writeOrderAuditLog does not swallow foreign-key integrity errors', async () => {
  const originalCreate = prisma.orderAuditLog.create;
  const fkError = Object.assign(new Error('Foreign key constraint failed'), {
    code: 'P2003',
  });

  prisma.orderAuditLog.create = ((async () => {
    throw fkError;
  }) as unknown) as typeof prisma.orderAuditLog.create;

  try {
    await assert.rejects(
      () =>
        writeOrderAuditLog({
          orderId: 'missing-order',
          mutationType: 'STATUS_UPDATE',
          actorUserId: 'admin-1',
          actorRole: 'ADMIN',
          metadata: { transition: 'PENDING->CONFIRMED' },
        }),
      (error: unknown) => (error as { code?: string }).code === 'P2003',
    );
  } finally {
    prisma.orderAuditLog.create = originalCreate;
  }
});

test('writeOrderAuditLogWithClient does not swallow foreign-key integrity errors', async () => {
  const fkError = Object.assign(new Error('Foreign key constraint failed'), {
    code: 'P2003',
  });
  const tx = ({
    orderAuditLog: {
      create: async () => {
        throw fkError;
      },
    },
  } as unknown) as Parameters<typeof writeOrderAuditLogWithClient>[0];

  await assert.rejects(
    () =>
      writeOrderAuditLogWithClient(tx, {
        orderId: 'missing-order',
        mutationType: 'STATUS_UPDATE',
        actorUserId: 'admin-1',
        actorRole: 'ADMIN',
        metadata: { transition: 'PENDING->CONFIRMED' },
      }),
    (error: unknown) => (error as { code?: string }).code === 'P2003',
  );
});
