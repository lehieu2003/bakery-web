import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, toApiJson } from '@/lib/api-response';
import { mapAuthErrorToStatus, requireUserFromRequest } from '@/lib/rbac';

type NotificationWithReads = {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
  linkUrl: string | null;
  status: string;
  publishedAt: Date | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  reads: Array<{ readAt: Date }>;
};

type GetNotificationsDeps = {
  getCurrentUser: (
    request: NextRequest,
  ) => Promise<{ id: string } | null>;
  getNotifications: (args: {
    userId: string;
    unreadOnly: boolean;
    skip: number;
    take: number;
  }) => Promise<{ notifications: NotificationWithReads[]; total: number }>;
};

const defaultDeps: GetNotificationsDeps = {
  getCurrentUser: requireUserFromRequest,
  getNotifications: async ({ userId, unreadOnly, skip, take }) => {
    const where: Record<string, unknown> = {
      status: 'PUBLISHED',
      OR: [
        { audience: 'GLOBAL' },
        { audience: 'USER', targetUserId: userId },
      ],
    };

    if (unreadOnly) {
      where.reads = {
        none: { userId },
      };
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: {
          reads: {
            where: { userId },
            select: { readAt: true },
            take: 1,
          },
        },
        skip,
        take,
        orderBy: [
          { publishedAt: 'desc' },
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
      }),
      prisma.notification.count({ where }),
    ]);

    return { notifications, total };
  },
};

export async function handleGetNotificationsRequest(
  request: NextRequest,
  deps: GetNotificationsDeps = defaultDeps,
) {
  try {
    const user = await deps.getCurrentUser(request);
    if (!user) {
      return {
        status: 401,
        body: apiError('Unauthorized'),
      };
    }

    const { searchParams } = new URL(request.url);
    const rawPage = Number.parseInt(searchParams.get('page') || '1', 10);
    const rawLimit = Number.parseInt(searchParams.get('limit') || '20', 10);
    const page = Number.isFinite(rawPage) ? Math.max(1, rawPage) : 1;
    const limit = Number.isFinite(rawLimit)
      ? Math.min(50, Math.max(1, rawLimit))
      : 20;
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const skip = (page - 1) * limit;

    const { notifications, total } = await deps.getNotifications({
      userId: user.id,
      unreadOnly,
      skip,
      take: limit,
    });

    return {
      status: 200,
      body: {
        ...apiSuccess({
          notifications: notifications.map((item) => {
            const userRead = item.reads[0] || null;
            return {
              id: item.id,
              title: item.title,
              content: item.content,
              imageUrl: item.imageUrl,
              linkUrl: item.linkUrl,
              status: item.status,
              publishedAt: item.publishedAt,
              createdById: item.createdById,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
              isRead: !!userRead,
              readAt: userRead?.readAt || null,
            };
          }),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        }),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch notifications';
    const status = mapAuthErrorToStatus(message);
    if (status !== 500) {
      return {
        status,
        body: apiError(message),
      };
    }
    throw error;
  }
}

// GET /api/notifications - Get current user's published notifications
export async function GET(request: NextRequest) {
  try {
    const result = await handleGetNotificationsRequest(request, defaultDeps);
    return toApiJson(result.body, result.status);
  } catch (error) {
    console.error('Get notifications error:', error);
    return toApiJson(apiError('Failed to fetch notifications'), 500);
  }
}
