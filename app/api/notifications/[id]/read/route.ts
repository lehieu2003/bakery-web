import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserFromRequest } from '@/lib/session';

// POST /api/notifications/[id]/read - Mark notification as read for current user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const { id } = await params;

    const notification = await prisma.notification.findFirst({
      where: {
        id,
        status: 'PUBLISHED',
        OR: [
          { audience: 'GLOBAL' },
          { audience: 'USER', targetUserId: user.id },
        ],
      },
      select: { id: true },
    });

    if (!notification) {
      return NextResponse.json(
        { success: false, error: 'Notification not found' },
        { status: 404 },
      );
    }

    const read = await prisma.notificationRead.upsert({
      where: {
        notificationId_userId: {
          notificationId: id,
          userId: user.id,
        },
      },
      create: {
        notificationId: id,
        userId: user.id,
      },
      update: {},
    });

    return NextResponse.json({
      success: true,
      data: {
        notificationId: read.notificationId,
        readAt: read.readAt,
      },
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark notification as read' },
      { status: 500 },
    );
  }
}
