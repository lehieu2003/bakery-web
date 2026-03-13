import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';

// GET /api/notifications - Get current user's published notifications
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '20', 10));
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      status: 'PUBLISHED',
    };

    if (unreadOnly) {
      where.reads = {
        none: { userId: user.id },
      };
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: {
          reads: {
            where: { userId: user.id },
            select: { readAt: true },
            take: 1,
          },
        },
        skip,
        take: limit,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.notification.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        notifications: notifications.map((item) => {
          const userRead = item.reads[0] || null;
          return {
            id: item.id,
            title: item.title,
            content: item.content,
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
      },
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 },
    );
  }
}
