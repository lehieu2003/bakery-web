import assert from 'node:assert/strict';
import test from 'node:test';

import { handleAdminOrderInvestigationGetRequest } from '@/app/api/admin/orders/[id]/investigation/route';

const baseDeps = {
  requireAdmin: async () => ({ id: 'admin-1', role: 'ADMIN' as const }),
  findOrderById: async () => ({
    id: 'order-1',
    orderNumber: 'BK0001',
    status: 'PENDING' as const,
    customerName: 'Lan',
    customerPhone: '0900000000',
    customerEmail: 'lan@example.com',
    createdAt: new Date('2026-04-17T08:00:00.000Z'),
    updatedAt: new Date('2026-04-17T08:05:00.000Z'),
    payment: {
      provider: 'MOMO',
      status: 'PENDING',
      transactionId: null,
      amount: 120000,
      createdAt: new Date('2026-04-17T08:00:10.000Z'),
    },
  }),
  findOrderAuditLogs: async () => [
    {
      id: 'audit-3',
      mutationType: 'PAYMENT_CALLBACK',
      actorUserId: null,
      actorRole: null,
      metadata: {
        source: 'payment_callback',
        provider: 'MOMO',
        event: 'processed',
        incomingStatus: 'PAID',
        existingStatus: null,
        transactionId: 'tx-1',
        existingTransactionId: null,
        incomingTransactionId: null,
        outcome: 'state_updated',
        reason: null,
      },
      createdAt: new Date('2026-04-17T08:10:00.000Z'),
      actor: null,
    },
    {
      id: 'audit-2',
      mutationType: 'PAYMENT_CALLBACK',
      actorUserId: null,
      actorRole: null,
      metadata: {
        source: 'payment_callback',
        provider: 'MOMO',
        event: 'received',
        incomingStatus: 'PAID',
        existingStatus: null,
        transactionId: 'tx-1',
        existingTransactionId: null,
        incomingTransactionId: null,
        outcome: null,
        reason: null,
      },
      createdAt: new Date('2026-04-17T08:09:50.000Z'),
      actor: null,
    },
    {
      id: 'audit-1',
      mutationType: 'STATUS_UPDATE',
      actorUserId: 'admin-1',
      actorRole: 'ADMIN' as const,
      metadata: { transition: 'PENDING->CONFIRMED' },
      createdAt: new Date('2026-04-17T08:11:00.000Z'),
      actor: { id: 'admin-1', name: 'Admin', role: 'ADMIN' as const },
    },
  ],
};

test('admin order investigation GET enforces 401 for unauthenticated access', async () => {
  const result = await handleAdminOrderInvestigationGetRequest(
    Promise.resolve({ id: 'order-1' }),
    {
      ...baseDeps,
      requireAdmin: async () => {
        throw new Error('Unauthorized');
      },
    },
  );

  assert.equal(result.status, 401);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Unauthorized');
});

test('admin order investigation GET enforces 403 for non-admin access', async () => {
  const result = await handleAdminOrderInvestigationGetRequest(
    Promise.resolve({ id: 'order-1' }),
    {
      ...baseDeps,
      requireAdmin: async () => {
        throw new Error('Forbidden: Admin access required');
      },
    },
  );

  assert.equal(result.status, 403);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Forbidden: Admin access required');
});

test('admin order investigation GET returns 404 when order does not exist', async () => {
  const result = await handleAdminOrderInvestigationGetRequest(
    Promise.resolve({ id: 'missing-order' }),
    {
      ...baseDeps,
      findOrderById: async () => null,
    },
  );

  assert.equal(result.status, 404);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Order not found');
});

test('admin order investigation GET returns 400 for malformed order id', async () => {
  const result = await handleAdminOrderInvestigationGetRequest(
    Promise.resolve({ id: '   ' }),
    baseDeps,
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.error, 'Invalid order id');
});

test('admin order investigation GET returns callback timeline, reconciliation attempts, and audit trail', async () => {
  const result = await handleAdminOrderInvestigationGetRequest(
    Promise.resolve({ id: 'order-1' }),
    baseDeps,
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);

  const data = result.body.data as {
    order: { status: string };
    payment: { status: string } | null;
    callbackTimeline: Array<{ event: string; provider: string }>;
    reconciliationAttempts: Array<{ outcome: string }>;
    auditTrail: Array<{ mutationType: string }>;
  };

  assert.equal(data.order.status, 'PENDING');
  assert.equal(data.payment?.status, 'PENDING');
  assert.equal(data.callbackTimeline.length, 2);
  assert.equal(data.callbackTimeline[0]?.event, 'processed');
  assert.equal(data.callbackTimeline[0]?.provider, 'MOMO');
  assert.equal(data.reconciliationAttempts.length, 1);
  assert.equal(data.reconciliationAttempts[0]?.outcome, 'STATE_UPDATED');
  assert.equal(data.auditTrail.length, 3);
});
