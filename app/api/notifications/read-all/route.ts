import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapAuthErrorToStatus, requireUserFromRequest } from '@/lib/rbac';

type MarkAllNotificationsReadDeps = {
  getCurrentUser: (
    request: NextRequest,
  ) => Promise<{ id: string } | null>;
  findUnreadNotificationIds: (args: {
    userId: string;
  }) => Promise<Array<{ id: string }>>;
  markAllAsRead: (args: {
    userId: string;
    notificationIds: string[];
  }) => Promise<{ count: number }>;
};

const defaultDeps: MarkAllNotificationsReadDeps = {
  getCurrentUser: requireUserFromRequest,
  findUnreadNotificationIds: ({ userId }) =>
    prisma.notification.findMany({
      where: {
        status: 'PUBLISHED',
        OR: [
          { audience: 'GLOBAL' },
          { audience: 'USER', targetUserId: userId },
        ],
        reads: {
          none: { userId },
        },
      },
      select: { id: true },
    }),
  markAllAsRead: ({ userId, notificationIds }) =>
    prisma.notificationRead.createMany({
      data: notificationIds.map((id) => ({
        notificationId: id,
        userId,
      })),
      skipDuplicates: true,
    }),
};

export async function handleMarkAllNotificationsAsReadRequest(
  request: NextRequest,
  deps: MarkAllNotificationsReadDeps = defaultDeps,
) {
  try {
    const user = await deps.getCurrentUser(request);
    if (!user) {
      return {
        status: 401,
        body: { success: false, error: 'Unauthorized' },
      };
    }

    const unreadNotifications = await deps.findUnreadNotificationIds({
      userId: user.id,
    });

    if (unreadNotifications.length === 0) {
      return {
        status: 200,
        body: {
          success: true,
          data: { count: 0 },
        },
      };
    }

    const result = await deps.markAllAsRead({
      userId: user.id,
      notificationIds: unreadNotifications.map((item) => item.id),
    });

    return {
      status: 200,
      body: {
        success: true,
        data: { count: result.count },
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to mark notifications as read';
    const status = mapAuthErrorToStatus(message);
    if (status !== 500) {
      return {
        status,
        body: { success: false, error: message },
      };
    }
    throw error;
  }
}

// POST /api/notifications/read-all - Mark all published notifications as read
export async function POST(request: NextRequest) {
  try {
    const result = await handleMarkAllNotificationsAsReadRequest(
      request,
      defaultDeps,
    );
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark notifications as read' },
      { status: 500 },
    );
  }
}
