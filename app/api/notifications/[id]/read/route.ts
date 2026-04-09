import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserFromRequest } from '@/lib/session';

type MarkNotificationReadDeps = {
  getCurrentUser: (
    request: NextRequest,
  ) => Promise<{ id: string } | null>;
  findAccessibleNotification: (args: {
    id: string;
    userId: string;
  }) => Promise<{ id: string } | null>;
  upsertReadState: (args: {
    notificationId: string;
    userId: string;
  }) => Promise<{ notificationId: string; readAt: Date }>;
};

const defaultDeps: MarkNotificationReadDeps = {
  getCurrentUser: getCurrentUserFromRequest,
  findAccessibleNotification: ({ id, userId }) =>
    prisma.notification.findFirst({
      where: {
        id,
        status: 'PUBLISHED',
        OR: [
          { audience: 'GLOBAL' },
          { audience: 'USER', targetUserId: userId },
        ],
      },
      select: { id: true },
    }),
  upsertReadState: ({ notificationId, userId }) =>
    prisma.notificationRead.upsert({
      where: {
        notificationId_userId: {
          notificationId,
          userId,
        },
      },
      create: {
        notificationId,
        userId,
      },
      update: {},
    }),
};

export async function handleMarkNotificationAsReadRequest(
  request: NextRequest,
  params: Promise<{ id: string }>,
  deps: MarkNotificationReadDeps = defaultDeps,
) {
  const user = await deps.getCurrentUser(request);
  if (!user) {
    return {
      status: 401,
      body: { success: false, error: 'Unauthorized' },
    };
  }

  const { id } = await params;

  const notification = await deps.findAccessibleNotification({
    id,
    userId: user.id,
  });

  if (!notification) {
    return {
      status: 404,
      body: { success: false, error: 'Notification not found' },
    };
  }

  const read = await deps.upsertReadState({
    notificationId: id,
    userId: user.id,
  });

  return {
    status: 200,
    body: {
      success: true,
      data: {
        notificationId: read.notificationId,
        readAt: read.readAt,
      },
    },
  };
}

// POST /api/notifications/[id]/read - Mark notification as read for current user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const result = await handleMarkNotificationAsReadRequest(
      request,
      params,
      defaultDeps,
    );
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark notification as read' },
      { status: 500 },
    );
  }
}
