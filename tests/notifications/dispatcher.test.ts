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
}) {
  const logs: Array<{ event: string; payload: Record<string, unknown> }> = [];
  const dispatches = new Map<string, FakeDispatchRecord>();
  const notifications: Array<{ id: string; title: string; content: string }> = [];
  const emailCalls: Array<{ to: string; subject: string; html: string }> = [];
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
    },
    getDispatch: (key: string) => dispatches.get(key),
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
