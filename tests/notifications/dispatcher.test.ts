import test from 'node:test';
import assert from 'node:assert/strict';
import { processNotificationDispatch } from '@/lib/notifications/dispatcher';

type FakeDispatchRecord = {
  correlationKey: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  attempts: number;
  channel: string | null;
  error: string | null;
  notificationId: string | null;
};

function createFakeDeps(args?: {
  replayed?: boolean;
  failEmailAttempts?: number;
  neverDeliverEmail?: boolean;
  noCreator?: boolean;
  pushEnabled?: boolean;
  pushTokens?: string[];
  pushFailureMode?: 'all-fail' | 'partial';
}) {
  const logs: Array<{ event: string; payload: Record<string, unknown> }> = [];
  const dispatches = new Map<string, FakeDispatchRecord>();
  const notifications: Array<{ id: string; title: string; content: string }> = [];
  const emailCalls: Array<{ to: string; subject: string; html: string }> = [];
  const pushCalls: Array<{ tokens: string[]; title: string; body: string }> = [];
  const deactivatedTokens: Array<{ tokens: string[]; at: Date }> = [];
  const pushLogs: Array<{
    userId: string | null;
    eventType: string;
    correlationKey: string;
    orderId: string | null;
    transactionId: string | null;
    attempt: string | null;
    providerResponseClass: string;
    retryable: boolean;
    successfulTokens: string[];
    permanentFailureTokens: string[];
    retryableFailureTokens: string[];
    errorSummary: string | null;
  }> = [];
  let notifId = 0;

  return {
    logs,
    notifications,
    emailCalls,
    deps: {
      now: () => new Date('2026-04-07T04:30:00.000Z'),
      sleep: async () => undefined,
      logEvent: (event: string, payload: Record<string, unknown>) => {
        logs.push({ event, payload });
      },
      ensureDispatchStart: async (event: {
        correlationKey: string;
        eventType: string;
      }) => {
        if (args?.replayed) return { dispatchId: null, replayed: true };
        if (dispatches.has(event.correlationKey)) {
          return { dispatchId: null, replayed: true };
        }
        dispatches.set(event.correlationKey, {
          correlationKey: event.correlationKey,
          status: 'PENDING',
          attempts: 0,
          channel: null,
          error: null,
          notificationId: null,
        });
        return { dispatchId: event.correlationKey, replayed: false };
      },
      resolveCreatorId: async () => (args?.noCreator ? null : 'admin-1'),
      createInAppNotification: async (input: {
        title: string;
        content: string;
        targetUserId: string | null;
      }) => {
        notifId += 1;
        const id = `n-${notifId}`;
        notifications.push({ id, title: input.title, content: input.content });
        return { id };
      },
      finalizeDispatch: async (
        correlationKey: string,
        payload: {
          status: 'PENDING' | 'SUCCESS' | 'FAILED';
          attemptCount: number;
          channel: string | null;
          error: string | null;
          notificationId: string | null;
        },
      ) => {
        dispatches.set(correlationKey, {
          correlationKey,
          status: payload.status,
          attempts: payload.attemptCount,
          channel: payload.channel,
          error: payload.error,
          notificationId: payload.notificationId,
        });
      },
      sendEmail: async (argsInput: {
        to: string;
        subject: string;
        html: string;
      }) => {
        emailCalls.push({
          to: argsInput.to,
          subject: argsInput.subject,
          html: argsInput.html,
        });
        if (args?.neverDeliverEmail) return false;
        const failAttempts = args?.failEmailAttempts ?? 0;
        return emailCalls.length > failAttempts;
      },
      isPushEnabled: () => args?.pushEnabled === true,
      findActiveDeviceTokens: async () => args?.pushTokens ?? [],
      sendPush: async (input: {
        tokens: string[];
        title: string;
        body: string;
      }) => {
        pushCalls.push(input);
        if (args?.pushFailureMode === 'all-fail') {
          return {
            attempted: input.tokens.length,
            successCount: 0,
            failureCount: input.tokens.length,
            successfulTokens: [],
            permanentFailureTokens: input.tokens,
            retryableFailureTokens: [],
          };
        }
        if (args?.pushFailureMode === 'partial') {
          return {
            attempted: input.tokens.length,
            successCount: 1,
            failureCount: Math.max(0, input.tokens.length - 1),
            successfulTokens: input.tokens.slice(0, 1),
            permanentFailureTokens: input.tokens.slice(1, 2),
            retryableFailureTokens: input.tokens.slice(2),
          };
        }
        return {
          attempted: input.tokens.length,
          successCount: input.tokens.length,
          failureCount: 0,
          successfulTokens: input.tokens,
          permanentFailureTokens: [],
          retryableFailureTokens: [],
        };
      },
      deactivateDeviceTokens: async (tokens: string[], at: Date) => {
        deactivatedTokens.push({ tokens, at });
      },
      createPushLogs: async (input: Parameters<NonNullable<Parameters<typeof processNotificationDispatch>[2]>['createPushLogs']>[0]) => {
        pushLogs.push({
          userId: input.userId,
          eventType: input.eventType,
          correlationKey: input.correlationKey,
          orderId: input.orderId,
          transactionId: input.transactionId,
          attempt: input.attempt,
          providerResponseClass: input.providerResponseClass,
          retryable: input.retryable,
          successfulTokens: input.successfulTokens,
          permanentFailureTokens: input.permanentFailureTokens,
          retryableFailureTokens: input.retryableFailureTokens,
          errorSummary: input.errorSummary,
        });
      },
    },
    getDispatch: (key: string) => dispatches.get(key),
    pushCalls,
    deactivatedTokens,
    pushLogs,
  };
}

test('dispatcher skips duplicate correlation key (idempotent replay)', async () => {
  const ctx = createFakeDeps({ replayed: true });

  const result = await processNotificationDispatch(
    {
      eventType: 'ORDER_STATUS_CHANGED',
      entityId: 'order-1',
      correlationKey: 'order:1:status:PENDING',
      payload: { orderStatus: 'PENDING' },
    },
    {},
    ctx.deps,
  );

  assert.equal(result.replayed, true);
  assert.equal(ctx.notifications.length, 0);
  assert.equal(
    ctx.logs.some((entry) => entry.event === 'notification.dispatch.replay_ignored'),
    true,
  );
});

test('dispatcher retries email then succeeds with fallback channels tracked', async () => {
  const ctx = createFakeDeps({ failEmailAttempts: 2 });

  const result = await processNotificationDispatch(
    {
      eventType: 'ORDER_STATUS_CHANGED',
      entityId: 'order-1',
      correlationKey: 'order:1:status:CONFIRMED',
      targetUserId: 'user-1',
      targetEmail: 'lan@example.com',
      payload: {
        orderStatus: 'CONFIRMED',
        orderNumber: 'BK260405ABCD',
      },
    },
    { maxEmailAttempts: 3, backoffMs: 0 },
    ctx.deps,
  );

  assert.equal(result.replayed, false);
  assert.equal(ctx.notifications.length, 1);
  assert.equal(ctx.emailCalls.length, 3);
  const dispatch = ctx.getDispatch('order:1:status:CONFIRMED');
  assert.equal(dispatch?.status, 'SUCCESS');
  assert.equal(dispatch?.attempts, 3);
  assert.equal(dispatch?.channel, 'IN_APP+EMAIL');
});

test('dispatcher marks failed when no channel can deliver', async () => {
  const ctx = createFakeDeps({
    noCreator: true,
    neverDeliverEmail: true,
  });

  await processNotificationDispatch(
    {
      eventType: 'ACCOUNT_VERIFIED',
      entityId: 'user-1',
      correlationKey: 'account:user-1:verified',
      targetEmail: 'u1@example.com',
      payload: { userName: 'Lan' },
    },
    { maxEmailAttempts: 2, backoffMs: 0 },
    ctx.deps,
  );

  const dispatch = ctx.getDispatch('account:user-1:verified');
  assert.equal(dispatch?.status, 'FAILED');
  assert.equal(dispatch?.attempts, 2);
  assert.equal(dispatch?.channel, null);
  assert.equal(
    ctx.logs.some((entry) => entry.event === 'notification.dispatch.failed'),
    true,
  );
});

test('dispatcher marks failed when email channel fails even if in-app succeeds', async () => {
  const ctx = createFakeDeps({ neverDeliverEmail: true });

  await processNotificationDispatch(
    {
      eventType: 'ORDER_STATUS_CHANGED',
      entityId: 'order-2',
      correlationKey: 'order:2:status:CONFIRMED',
      targetUserId: 'user-2',
      targetEmail: 'u2@example.com',
      payload: {
        orderStatus: 'CONFIRMED',
        orderNumber: 'BK260406EFGH',
      },
    },
    { maxEmailAttempts: 2, backoffMs: 0 },
    ctx.deps,
  );

  const dispatch = ctx.getDispatch('order:2:status:CONFIRMED');
  assert.equal(ctx.notifications.length, 1);
  assert.equal(dispatch?.status, 'FAILED');
  assert.equal(dispatch?.channel, 'IN_APP');
  assert.equal(dispatch?.attempts, 2);
  assert.equal(dispatch?.error?.includes('email_provider_returned_false'), true);
});

test('dispatcher sends push for transactional event to all active tokens', async () => {
  const ctx = createFakeDeps({
    pushEnabled: true,
    pushTokens: ['t1', 't2', 't3'],
  });

  await processNotificationDispatch(
    {
      eventType: 'ORDER_STATUS_CHANGED',
      entityId: 'order-push-1',
      correlationKey: 'order:push:1',
      targetUserId: 'user-1',
      payload: { orderStatus: 'CONFIRMED' },
    },
    {},
    ctx.deps,
  );

  assert.equal(ctx.pushCalls.length, 1);
  assert.deepEqual(ctx.pushCalls[0].tokens, ['t1', 't2', 't3']);
  const dispatch = ctx.getDispatch('order:push:1');
  assert.equal(dispatch?.status, 'SUCCESS');
  assert.equal(dispatch?.channel, 'IN_APP+PUSH');
});

test('dispatcher handles partial push failure and deactivates permanently invalid tokens', async () => {
  const ctx = createFakeDeps({
    pushEnabled: true,
    pushTokens: ['ok-token', 'dead-token', 'retry-token'],
    pushFailureMode: 'partial',
  });

  await processNotificationDispatch(
    {
      eventType: 'ORDER_STATUS_CHANGED',
      entityId: 'order-push-2',
      correlationKey: 'order:push:2',
      targetUserId: 'user-2',
      payload: {
        orderId: 'order-push-2',
        transactionId: 'tx-partial-1',
        attempt: '1',
        orderStatus: 'CONFIRMED',
      },
    },
    {},
    ctx.deps,
  );

  const dispatch = ctx.getDispatch('order:push:2');
  assert.equal(dispatch?.status, 'SUCCESS');
  assert.equal(ctx.deactivatedTokens.length, 1);
  assert.deepEqual(ctx.deactivatedTokens[0].tokens, ['dead-token']);
  assert.equal(ctx.pushLogs.length, 1);
  assert.equal(ctx.pushLogs[0].providerResponseClass, 'PARTIAL_FAILURE');
  assert.equal(ctx.pushLogs[0].retryable, true);
  assert.equal(ctx.pushLogs[0].eventType, 'ORDER_STATUS_CHANGED');
  assert.equal(ctx.pushLogs[0].correlationKey, 'order:push:2');
  assert.equal(ctx.pushLogs[0].orderId, 'order-push-2');
  assert.equal(ctx.pushLogs[0].transactionId, 'tx-partial-1');
  assert.equal(ctx.pushLogs[0].attempt, '1');
  assert.deepEqual(ctx.pushLogs[0].successfulTokens, ['ok-token']);
  assert.deepEqual(ctx.pushLogs[0].permanentFailureTokens, ['dead-token']);
  assert.deepEqual(ctx.pushLogs[0].retryableFailureTokens, ['retry-token']);
});

test('dispatcher marks failure when push channel fully fails for transactional event', async () => {
  const ctx = createFakeDeps({
    pushEnabled: true,
    pushTokens: ['bad-token'],
    pushFailureMode: 'all-fail',
  });

  await processNotificationDispatch(
    {
      eventType: 'ORDER_STATUS_CHANGED',
      entityId: 'order-push-3',
      correlationKey: 'order:push:3',
      targetUserId: 'user-3',
      payload: { orderStatus: 'CONFIRMED' },
    },
    {},
    ctx.deps,
  );

  const dispatch = ctx.getDispatch('order:push:3');
  assert.equal(dispatch?.status, 'FAILED');
  assert.equal(dispatch?.channel, 'IN_APP');
  assert.equal(dispatch?.error?.includes('push_delivery_failed'), true);
  assert.equal(ctx.pushLogs.length, 1);
  assert.equal(ctx.pushLogs[0].providerResponseClass, 'TOTAL_FAILURE');
  assert.equal(ctx.pushLogs[0].retryable, false);
  assert.equal(ctx.pushLogs[0].errorSummary, 'push_delivery_failed');
  const failedLog = ctx.logs.find(
    (entry) => entry.event === 'notification.dispatch.failed',
  );
  assert.equal(
    String(failedLog?.payload.error).includes('push_delivery_failed'),
    true,
  );
});

test('dispatcher marks push setup credential errors as non-retryable', async () => {
  const ctx = createFakeDeps({
    pushEnabled: true,
    pushTokens: ['token-1'],
  });
  ctx.deps.sendPush = async () => {
    throw new Error(
      'Firebase push is enabled but credentials are missing (FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY)',
    );
  };

  await processNotificationDispatch(
    {
      eventType: 'ORDER_STATUS_CHANGED',
      entityId: 'order-push-4',
      correlationKey: 'order:push:4',
      targetUserId: 'user-4',
      payload: { orderStatus: 'CONFIRMED' },
    },
    {},
    ctx.deps,
  );

  assert.equal(ctx.pushLogs.length, 1);
  assert.equal(ctx.pushLogs[0].providerResponseClass, 'TOTAL_FAILURE');
  assert.equal(ctx.pushLogs[0].retryable, false);
});

test('dispatcher logs SKIPPED push diagnostics when no active tokens exist', async () => {
  const ctx = createFakeDeps({
    pushEnabled: true,
    pushTokens: [],
  });

  await processNotificationDispatch(
    {
      eventType: 'ORDER_STATUS_CHANGED',
      entityId: 'order-push-5',
      correlationKey: 'order:push:5',
      targetUserId: 'user-5',
      payload: { orderStatus: 'CONFIRMED' },
    },
    {},
    ctx.deps,
  );

  assert.equal(ctx.pushLogs.length, 1);
  assert.equal(ctx.pushLogs[0].providerResponseClass, 'SKIPPED');
  assert.equal(ctx.pushLogs[0].retryable, false);
  assert.equal(ctx.pushLogs[0].errorSummary, null);
});

test('dispatcher reuses existing campaign notification instead of creating duplicate', async () => {
  const ctx = createFakeDeps();

  await processNotificationDispatch(
    {
      eventType: 'CAMPAIGN_TRIGGERED',
      entityId: 'notification-123',
      correlationKey: 'campaign:notification-123:publish:2026-04-07T00:00:00.000Z',
      payload: {
        campaignTitle: 'New promo',
        campaignContent: 'Save more today',
      },
    },
    {},
    ctx.deps,
  );

  const dispatch = ctx.getDispatch(
    'campaign:notification-123:publish:2026-04-07T00:00:00.000Z',
  );
  assert.equal(ctx.notifications.length, 0);
  assert.equal(dispatch?.status, 'SUCCESS');
  assert.equal(dispatch?.channel, 'IN_APP');
  assert.equal(dispatch?.notificationId, 'notification-123');
});

test('dispatcher escapes email html content and strips unsafe CTA links', async () => {
  const ctx = createFakeDeps();

  await processNotificationDispatch(
    {
      eventType: 'CAMPAIGN_TRIGGERED',
      entityId: 'notification-unsafe',
      correlationKey: 'campaign:unsafe',
      targetEmail: 'unsafe@example.com',
      payload: {
        campaignTitle: '<img src=x onerror=alert(1)>',
        campaignContent: '<script>alert(1)</script>',
        linkUrl: 'javascript:alert(1)',
      },
    },
    {},
    ctx.deps,
  );

  assert.equal(ctx.emailCalls.length, 1);
  const html = ctx.emailCalls[0].html;
  assert.equal(html.includes('<script>alert(1)</script>'), false);
  assert.equal(html.includes('<img src=x onerror=alert(1)>'), false);
  assert.equal(html.includes('javascript:alert(1)'), false);
});
