import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';

// POST /api/notifications/read-all - Mark all published notifications as read
export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const unreadNotifications = await prisma.notification.findMany({
      where: {
        status: 'PUBLISHED',
        reads: {
          none: { userId: user.id },
        },
      },
      select: { id: true },
    });

    if (unreadNotifications.length === 0) {
      return NextResponse.json({
        success: true,
        data: { count: 0 },
      });
    }

    const result = await prisma.notificationRead.createMany({
      data: unreadNotifications.map((item) => ({
        notificationId: item.id,
        userId: user.id,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({
      success: true,
      data: { count: result.count },
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark notifications as read' },
      { status: 500 },
    );
  }
}
