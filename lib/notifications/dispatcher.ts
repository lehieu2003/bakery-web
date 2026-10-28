import { Prisma, type NotificationDispatchStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { emailService } from '@/lib/email';
import {
  ANNOUNCEMENTS_TOPIC,
  sendTopicPushNotification,
  sendTransactionalPushNotification,
} from '@/lib/notifications/firebase';

export type NotificationEventType =
  | 'ORDER_STATUS_CHANGED'
  | 'ACCOUNT_VERIFIED'
  | 'CAMPAIGN_TRIGGERED';

export type NotificationDispatchEvent = {
  eventType: NotificationEventType;
  entityId: string;
  correlationKey: string;
  occurredAt?: Date;
  targetUserId?: string | null;
  targetEmail?: string | null;
  payload?: Record<string, unknown>;
};

type DispatchLifecyclePayload = {
  status: NotificationDispatchStatus;
  attemptCount: number;
  channel: string | null;
  error: string | null;
  notificationId: string | null;
  processedAt: Date;
};

type NotificationDispatchDeps = {
  now: () => Date;
  sleep: (ms: number) => Promise<void>;
  logEvent: (event: string, payload: Record<string, unknown>) => void;
  ensureDispatchStart: (event: NotificationDispatchEvent) => Promise<{
    dispatchId: string | null;
    replayed: boolean;
  }>;
  resolveCreatorId: (
    event: NotificationDispatchEvent,
  ) => Promise<string | null>;
  createInAppNotification: (args: {
    creatorId: string;
    title: string;
    content: string;
    targetUserId: string | null;
    linkUrl?: string | null;
    imageUrl?: string | null;
    publishedAt: Date;
  }) => Promise<{ id: string }>;
  finalizeDispatch: (
    correlationKey: string,
    payload: DispatchLifecyclePayload,
  ) => Promise<void>;
  sendEmail: (args: {
    to: string;
    subject: string;
    html: string;
  }) => Promise<boolean>;
  isPushEnabled: () => boolean;
  findActiveDeviceTokens: (userId: string) => Promise<string[]>;
  sendTopicPush: (args: {
    topic: string;
    title: string;
    body: string;
    data?: Record<string, string>;
    imageUrl?: string | null;
  }) => Promise<unknown>;
  sendPush: (args: {
    tokens: string[];
    title: string;
    body: string;
    data?: Record<string, string>;
    linkUrl?: string | null;
  }) => Promise<{
    attempted: number;
    successCount: number;
    failureCount: number;
    successfulTokens: string[];
    permanentFailureTokens: string[];
    retryableFailureTokens: string[];
  }>;
  deactivateDeviceTokens: (tokens: string[], now: Date) => Promise<void>;
  createPushLogs: (args: {
    userId: string | null;
    eventType: string;
    correlationKey: string;
    orderId: string | null;
    transactionId: string | null;
    attempt: string | null;
    providerResponseClass: 'SUCCESS' | 'PARTIAL_FAILURE' | 'TOTAL_FAILURE' | 'SKIPPED';
    retryable: boolean;
    successfulTokens: string[];
    permanentFailureTokens: string[];
    retryableFailureTokens: string[];
    attemptedAt: Date;
    errorSummary: string | null;
  }) => Promise<void>;
};

type DispatchOptions = {
  maxEmailAttempts?: number;
  backoffMs?: number;
};

const DEFAULT_MAX_EMAIL_ATTEMPTS = 3;
const DEFAULT_BACKOFF_MS = 250;

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeSafeHttpUrl(value?: string | null): string | null {
  if (!value || !value.trim()) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function buildNotificationMessage(event: NotificationDispatchEvent): {
  title: string;
  content: string;
  subject: string;
  linkUrl?: string | null;
  imageUrl?: string | null;
} {
  const payload = event.payload ?? {};

  if (event.eventType === 'ORDER_STATUS_CHANGED') {
    const orderNumber =
      typeof payload.orderNumber === 'string' ? payload.orderNumber : null;
    const orderStatus =
      typeof payload.orderStatus === 'string' ? payload.orderStatus : 'UPDATED';
    const { title, content } = orderStatusMessage(
      orderStatus.toUpperCase(),
      orderNumber ? `#${orderNumber}` : 'của bạn',
    );

    return {
      title,
      content,
      subject: title,
      linkUrl: typeof payload.linkUrl === 'string' ? payload.linkUrl : null,
      imageUrl: typeof payload.imageUrl === 'string' ? payload.imageUrl : null,
    };
  }

  if (event.eventType === 'ACCOUNT_VERIFIED') {
    const displayName =
      typeof payload.userName === 'string' && payload.userName.trim()
        ? payload.userName.trim()
        : 'bạn';

    return {
      title: 'Tài khoản đã được xác minh',
      content: `Chào ${displayName}, tài khoản của bạn đã được xác minh thành công.`,
      subject: 'Xác minh tài khoản thành công',
      linkUrl: typeof payload.linkUrl === 'string' ? payload.linkUrl : null,
      imageUrl: typeof payload.imageUrl === 'string' ? payload.imageUrl : null,
    };
  }

  const campaignTitle =
    typeof payload.campaignTitle === 'string' && payload.campaignTitle.trim()
      ? payload.campaignTitle.trim()
      : 'Thông báo từ tiệm';
  const campaignContent =
    typeof payload.campaignContent === 'string' && payload.campaignContent.trim()
      ? payload.campaignContent.trim()
      : 'Tiệm có thông báo mới dành cho bạn.';

  return {
    title: campaignTitle,
    content: campaignContent,
    subject: campaignTitle,
    linkUrl: typeof payload.linkUrl === 'string' ? payload.linkUrl : null,
    imageUrl: typeof payload.imageUrl === 'string' ? payload.imageUrl : null,
  };
}

/**
 * What the customer reads (push, in-app, email subject) when their order
 * moves to [status]. [orderLabel] is `#BK…` or a generic fallback.
 */
export function orderStatusMessage(
  status: string,
  orderLabel: string,
): { title: string; content: string } {
  switch (status) {
    case 'PENDING':
      return {
        title: 'Đã nhận đơn hàng',
        content: `Đơn ${orderLabel} đã được ghi nhận, tiệm sẽ xác nhận sớm.`,
      };
    case 'CONFIRMED':
      return {
        title: 'Đơn hàng đã được xác nhận',
        content: `Đơn ${orderLabel} đã được xác nhận và sắp được chuẩn bị.`,
      };
    case 'PROCESSING':
      return {
        title: 'Đang chuẩn bị đơn hàng',
        content: `Tiệm đang chuẩn bị đơn ${orderLabel}.`,
      };
    case 'READY':
      return {
        title: 'Đơn hàng đã sẵn sàng',
        content: `Đơn ${orderLabel} đã sẵn sàng để nhận hoặc giao.`,
      };
    case 'COMPLETED':
      return {
        title: 'Đơn hàng đã hoàn tất',
        content: `Cảm ơn bạn! Đơn ${orderLabel} đã hoàn tất.`,
      };
    case 'CANCELLED':
      return {
        title: 'Đơn hàng đã bị huỷ',
        content: `Đơn ${orderLabel} đã bị huỷ. Liên hệ tiệm nếu bạn cần hỗ trợ.`,
      };
    default:
      return {
        title: 'Cập nhật đơn hàng',
        content: `Đơn ${orderLabel} vừa được cập nhật.`,
      };
  }
}

function buildEmailHtml(args: {
  title: string;
  content: string;
  linkUrl?: string | null;
}): string {
  const safeTitle = escapeHtml(args.title);
  const safeContent = escapeHtml(args.content);
  const safeLinkUrl = normalizeSafeHttpUrl(args.linkUrl);
  const cta = safeLinkUrl
    ? `<p><a href="${escapeHtml(safeLinkUrl)}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:6px;">View details</a></p>`
    : '';

  return `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;">
      <h2 style="margin:0 0 12px;">${safeTitle}</h2>
      <p style="margin:0 0 16px;">${safeContent}</p>
      ${cta}
    </div>
  `;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function isRetryablePushError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  if (
    message.includes('credentials are missing') ||
    message.includes('invalid-registration-token') ||
    message.includes('registration-token-not-registered')
  ) {
    return false;
  }
  return true;
}

function classifyPushProviderResponse(args: {
  attempted: number;
  successCount: number;
  failureCount: number;
}): 'SUCCESS' | 'PARTIAL_FAILURE' | 'TOTAL_FAILURE' | 'SKIPPED' {
  if (args.attempted === 0) return 'SKIPPED';
  if (args.failureCount === 0) return 'SUCCESS';
  if (args.successCount > 0) return 'PARTIAL_FAILURE';
  return 'TOTAL_FAILURE';
}

const defaultDeps: NotificationDispatchDeps = {
  now: () => new Date(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  logEvent: (event, payload) => {
    console.info(
      JSON.stringify({
        event,
        scope: 'notification.dispatch',
        ...payload,
      }),
    );
  },
  ensureDispatchStart: async (event) => {
    try {
      const created = await prisma.notificationDispatch.create({
        data: {
          correlationKey: event.correlationKey,
          eventType: event.eventType,
          entityId: event.entityId,
          targetUserId: event.targetUserId ?? null,
          targetEmail: event.targetEmail ?? null,
          status: 'PENDING',
        },
        select: { id: true },
      });
      return { dispatchId: created.id, replayed: false };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return { dispatchId: null, replayed: true };
      }
      throw error;
    }
  },
  resolveCreatorId: async (event) => {
    if (event.targetUserId) return event.targetUserId;

    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN', isActive: true },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    return admin?.id ?? null;
  },
  createInAppNotification: async (args) =>
    prisma.notification.create({
      data: {
        title: args.title,
        content: args.content,
        audience: args.targetUserId ? 'USER' : 'GLOBAL',
        targetUserId: args.targetUserId,
        linkUrl: args.linkUrl ?? null,
        imageUrl: args.imageUrl ?? null,
        status: 'PUBLISHED',
        publishedAt: args.publishedAt,
        createdById: args.creatorId,
      },
      select: { id: true },
    }),
  finalizeDispatch: async (correlationKey, payload) => {
    await prisma.notificationDispatch.update({
      where: { correlationKey },
      data: {
        status: payload.status,
        attemptCount: payload.attemptCount,
        channel: payload.channel,
        error: payload.error,
        notificationId: payload.notificationId,
        processedAt: payload.processedAt,
      },
    });
  },
  sendEmail: (args) => emailService.send(args.to, args.subject, args.html),
  isPushEnabled: () => process.env.PUSH_TX_ENABLED === 'true',
  findActiveDeviceTokens: async (userId) => {
    const records = await prisma.deviceToken.findMany({
      where: { userId, isActive: true },
      select: { token: true },
      orderBy: { updatedAt: 'desc' },
    });
    return records.map((record) => record.token);
  },
  sendPush: sendTransactionalPushNotification,
  sendTopicPush: sendTopicPushNotification,
  deactivateDeviceTokens: async (tokens, now) => {
    if (tokens.length === 0) return;
    await prisma.deviceToken.updateMany({
      where: { token: { in: tokens }, isActive: true },
      data: {
        isActive: false,
        deactivatedAt: now,
      },
    });
  },
  createPushLogs: async ({
    userId,
    eventType,
    correlationKey,
    orderId,
    transactionId,
    attempt,
    providerResponseClass,
    retryable,
    successfulTokens,
    permanentFailureTokens,
    retryableFailureTokens,
    attemptedAt,
    errorSummary,
  }) => {
    const rows: Array<{
      userId: string | null;
      token: string | null;
      eventType: string;
      correlationKey: string;
      status: string;
      error: string | null;
      metadata: Record<string, string | null>;
    }> = [
      ...successfulTokens.map((token) => ({
        userId,
        token,
        eventType,
        correlationKey,
        status: 'SUCCESS',
        error: null,
        metadata: {
          failureType: null,
          providerResponseClass,
          retryable: String(retryable),
          orderId,
          transactionId,
          attempt,
          loggedAt: attemptedAt.toISOString(),
        },
      })),
      ...permanentFailureTokens.map((token) => ({
        userId,
        token,
        eventType,
        correlationKey,
        status: 'FAILED',
        error: 'permanent_token_error',
        metadata: {
          failureType: 'permanent',
          providerResponseClass,
          retryable: 'false',
          orderId,
          transactionId,
          attempt,
          loggedAt: attemptedAt.toISOString(),
        },
      })),
      ...retryableFailureTokens.map((token) => ({
        userId,
        token,
        eventType,
        correlationKey,
        status: 'FAILED',
        error: 'retryable_provider_error',
        metadata: {
          failureType: 'retryable',
          providerResponseClass,
          retryable: 'true',
          orderId,
          transactionId,
          attempt,
          loggedAt: attemptedAt.toISOString(),
        },
      })),
    ];

    if (rows.length === 0 && errorSummary) {
      rows.push({
        userId,
        token: null,
        eventType,
        correlationKey,
        status: 'FAILED',
        error: errorSummary,
        metadata: {
          failureType: 'dispatch_setup',
          providerResponseClass,
          retryable: String(retryable),
          orderId,
          transactionId,
          attempt,
          loggedAt: attemptedAt.toISOString(),
        },
      });
    }

    if (rows.length > 0) {
      await prisma.pushNotificationLog.createMany({ data: rows });
    }
  },
};

/**
 * Data sent with a push, read by the app to open the right screen on tap:
 * the order for ORDER_STATUS_CHANGED, the notifications list otherwise.
 */
function pushData(event: NotificationDispatchEvent): Record<string, string> {
  const data: Record<string, string> = {
    eventType: event.eventType,
    entityId: event.entityId,
    correlationKey: event.correlationKey,
  };
  const orderNumber = event.payload?.orderNumber;
  if (typeof orderNumber === 'string' && orderNumber) {
    data.orderNumber = orderNumber;
  }
  return data;
}

export async function processNotificationDispatch(
  event: NotificationDispatchEvent,
  options: DispatchOptions = {},
  deps: NotificationDispatchDeps = defaultDeps,
) {
  const now = deps.now();
  const maxAttempts = Math.max(1, options.maxEmailAttempts ?? DEFAULT_MAX_EMAIL_ATTEMPTS);
  const backoffMs = Math.max(0, options.backoffMs ?? DEFAULT_BACKOFF_MS);

  const start = await deps.ensureDispatchStart(event);
  if (start.replayed) {
    deps.logEvent('notification.dispatch.replay_ignored', {
      correlationKey: event.correlationKey,
      eventType: event.eventType,
      entityId: event.entityId,
    });
    return { replayed: true };
  }

  const message = buildNotificationMessage(event);
  const shouldUseExistingCampaignNotification =
    event.eventType === 'CAMPAIGN_TRIGGERED';
  const shouldCreateTargetedInAppNotification =
    !shouldUseExistingCampaignNotification && !!event.targetUserId;
  const inAppRequested =
    shouldUseExistingCampaignNotification || shouldCreateTargetedInAppNotification;
  const emailRequested = !!event.targetEmail;
  let createdNotificationId: string | null = null;
  let emailAttempts = 0;
  let emailDelivered = false;
  let emailError: string | null = null;
  let inAppDelivered = false;
  let pushDelivered = false;
  let pushError: string | null = null;
  let pushAttemptedTokens: string[] = [];
  let pushSuccessfulTokens: string[] = [];
  let pushPermanentFailureTokens: string[] = [];
  let pushRetryableFailureTokens: string[] = [];
  let pushRequested = false;
  let pushProviderResponseClass: 'SUCCESS' | 'PARTIAL_FAILURE' | 'TOTAL_FAILURE' | 'SKIPPED' =
    'SKIPPED';
  let pushRetryable = false;

  try {
    if (shouldUseExistingCampaignNotification) {
      createdNotificationId = event.entityId;
      inAppDelivered = true;
    } else if (shouldCreateTargetedInAppNotification) {
      const creatorId = await deps.resolveCreatorId(event);
      if (creatorId) {
        const notification = await deps.createInAppNotification({
          creatorId,
          title: message.title,
          content: message.content,
          targetUserId: event.targetUserId ?? null,
          linkUrl: message.linkUrl,
          imageUrl: message.imageUrl,
          publishedAt: now,
        });
        createdNotificationId = notification.id;
        inAppDelivered = true;
      }
    }

    if (event.targetEmail) {
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        emailAttempts = attempt;
        try {
          const sent = await deps.sendEmail({
            to: event.targetEmail,
            subject: message.subject,
            html: buildEmailHtml({
              title: message.title,
              content: message.content,
              linkUrl: message.linkUrl,
            }),
          });

          if (sent) {
            emailDelivered = true;
            emailError = null;
            break;
          }

          emailError = 'email_provider_returned_false';
          deps.logEvent('notification.dispatch.retry', {
            correlationKey: event.correlationKey,
            attempt,
            reason: emailError,
          });
        } catch (error) {
          emailError = getErrorMessage(error);
          deps.logEvent('notification.dispatch.retry', {
            correlationKey: event.correlationKey,
            attempt,
            reason: emailError,
          });
        }

        if (attempt < maxAttempts) {
          await deps.sleep(backoffMs * attempt);
        }
      }
    }

    pushRequested =
      deps.isPushEnabled() &&
      event.eventType === 'ORDER_STATUS_CHANGED' &&
      !!event.targetUserId;
    if (pushRequested && event.targetUserId) {
      try {
        const tokens = await deps.findActiveDeviceTokens(event.targetUserId);
        pushAttemptedTokens = tokens;
        if (tokens.length > 0) {
          const result = await deps.sendPush({
            tokens,
            title: message.title,
            body: message.content,
            linkUrl: message.linkUrl,
            data: pushData(event),
          });
          pushSuccessfulTokens = result.successfulTokens;
          pushPermanentFailureTokens = result.permanentFailureTokens;
          pushRetryableFailureTokens = result.retryableFailureTokens;
          pushProviderResponseClass = classifyPushProviderResponse({
            attempted: result.attempted,
            successCount: result.successCount,
            failureCount: result.failureCount,
          });
          pushRetryable =
            result.retryableFailureTokens.length > 0;

          if (pushPermanentFailureTokens.length > 0) {
            await deps.deactivateDeviceTokens(pushPermanentFailureTokens, deps.now());
          }
          pushDelivered = result.failureCount === 0 || result.successCount > 0;
          if (!pushDelivered) {
            pushError = 'push_delivery_failed';
          }
        } else {
          pushDelivered = true;
          pushProviderResponseClass = 'SKIPPED';
        }
      } catch (error) {
        pushError = getErrorMessage(error);
        pushProviderResponseClass = 'TOTAL_FAILURE';
        pushRetryable = isRetryablePushError(error);
      }
    } else {
      pushDelivered = true;
    }

    // Shop-wide announcements go to every install through one topic message,
    // not a fan-out over every user's tokens.
    let topicPushSent = false;
    if (deps.isPushEnabled() && event.eventType === 'CAMPAIGN_TRIGGERED') {
      try {
        await deps.sendTopicPush({
          topic: ANNOUNCEMENTS_TOPIC,
          title: message.title,
          body: message.content,
          imageUrl: message.imageUrl,
          data: pushData(event),
        });
        topicPushSent = true;
      } catch (error) {
        pushDelivered = false;
        pushError = getErrorMessage(error);
      }
    }

    const deliveredInApp = inAppRequested ? inAppDelivered : true;
    const deliveredEmail = emailRequested ? emailDelivered : true;
    const delivered = deliveredInApp && deliveredEmail && pushDelivered;
    const channel =
      [
        createdNotificationId || inAppDelivered ? 'IN_APP' : null,
        emailDelivered ? 'EMAIL' : null,
        (pushAttemptedTokens.length > 0 && pushDelivered) || topicPushSent
          ? 'PUSH'
          : null,
      ]
        .filter(Boolean)
        .join('+') || null;
    const failureReasons: string[] = [];
    if (!deliveredInApp) {
      failureReasons.push('in_app_delivery_failed');
    }
    if (!deliveredEmail) {
      failureReasons.push(emailError ?? 'email_delivery_failed');
    }
    if (!pushDelivered) {
      failureReasons.push(pushError ?? 'push_delivery_failed');
    }
    const errorValue =
      failureReasons.length > 0 ? failureReasons.join(';') : null;

    if (pushRequested && (pushAttemptedTokens.length > 0 || pushError || pushProviderResponseClass === 'SKIPPED')) {
      await deps.createPushLogs({
        userId: event.targetUserId ?? null,
        eventType: event.eventType,
        correlationKey: event.correlationKey,
        orderId:
          typeof event.payload?.orderId === 'string' ? event.payload.orderId : null,
        transactionId:
          typeof event.payload?.transactionId === 'string'
            ? event.payload.transactionId
            : null,
        attempt:
          typeof event.payload?.attempt === 'string' ? event.payload.attempt : null,
        providerResponseClass: pushProviderResponseClass,
        retryable: pushRetryable,
        successfulTokens: pushSuccessfulTokens,
        permanentFailureTokens: pushPermanentFailureTokens,
        retryableFailureTokens: pushRetryableFailureTokens,
        attemptedAt: deps.now(),
        errorSummary: pushError,
      });
    }

    await deps.finalizeDispatch(event.correlationKey, {
      status: delivered ? 'SUCCESS' : 'FAILED',
      attemptCount: emailAttempts,
      channel,
      error: errorValue,
      notificationId: createdNotificationId,
      processedAt: deps.now(),
    });

    if (!delivered) {
      deps.logEvent('notification.dispatch.failed', {
        correlationKey: event.correlationKey,
        eventType: event.eventType,
        entityId: event.entityId,
        error: emailError ?? pushError ?? 'no_delivery_channel_succeeded',
      });
    } else {
      deps.logEvent('notification.dispatch.processed', {
        correlationKey: event.correlationKey,
        eventType: event.eventType,
        entityId: event.entityId,
        channel,
        attemptCount: emailAttempts,
      });
    }
  } catch (error) {
    const message = getErrorMessage(error);
    await deps.finalizeDispatch(event.correlationKey, {
      status: 'FAILED',
      attemptCount: emailAttempts,
      channel: null,
      error: message,
      notificationId: createdNotificationId,
      processedAt: deps.now(),
    });
    deps.logEvent('notification.dispatch.failed', {
      correlationKey: event.correlationKey,
      eventType: event.eventType,
      entityId: event.entityId,
      error: message,
    });
  }

  return { replayed: false };
}

export async function dispatchNotificationEvent(
  event: NotificationDispatchEvent,
  options: DispatchOptions = {},
) {
  return processNotificationDispatch(event, options, defaultDeps);
}
