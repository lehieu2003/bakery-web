import { NextRequest, NextResponse } from 'next/server';
import { NotificationStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/session';
import { mapAuthErrorToStatus } from '@/lib/rbac';
import { dispatchNotificationEvent } from '@/lib/notifications/dispatcher';

const VALID_STATUSES: NotificationStatus[] = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

function isValidStatus(value: unknown): value is NotificationStatus {
  return (
    typeof value === 'string' &&
    VALID_STATUSES.includes(value as NotificationStatus)
  );
}

function parseDateValue(value: unknown): Date | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function adminErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : 'Đã có lỗi xảy ra';
  const status = mapAuthErrorToStatus(message);

  return NextResponse.json({ success: false, error: message }, { status });
}

// GET /api/admin/notifications
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '20', 10));
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status');
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (status) {
      if (!isValidStatus(status)) {
        return NextResponse.json(
          { success: false, error: 'Invalid notification status' },
          { status: 400 },
        );
      }
      where.status = status;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: {
          _count: { select: { reads: true } },
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
        notifications: notifications.map((item) => ({
          ...item,
          readCount: item._count.reads,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Admin notifications list error:', error);
    return adminErrorResponse(error);
  }
}

// POST /api/admin/notifications
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();

    const { title, content, imageUrl, linkUrl, status, publishedAt } = body;

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: 'Title and content are required' },
        { status: 400 },
      );
    }

    if (status !== undefined && !isValidStatus(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid notification status' },
        { status: 400 },
      );
    }

    const finalStatus: NotificationStatus = status || 'DRAFT';

    const parsedPublishedAt = parseDateValue(publishedAt);
    if (
      publishedAt !== undefined &&
      publishedAt !== null &&
      parsedPublishedAt === null
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid publishedAt value' },
        { status: 400 },
      );
    }

    const notification = await prisma.notification.create({
      data: {
        title,
        content,
        imageUrl: imageUrl || null,
        linkUrl: linkUrl || null,
        status: finalStatus,
        publishedAt:
          finalStatus === 'PUBLISHED'
            ? parsedPublishedAt || new Date()
            : parsedPublishedAt,
        createdById: admin.id,
      },
      include: {
        _count: { select: { reads: true } },
      },
    });

    if (notification.status === 'PUBLISHED') {
      void dispatchNotificationEvent({
        eventType: 'CAMPAIGN_TRIGGERED',
        entityId: notification.id,
        correlationKey: `campaign:${notification.id}:publish:${notification.publishedAt?.toISOString() ?? 'none'}`,
        payload: {
          campaignTitle: notification.title,
          campaignContent: notification.content,
          linkUrl: notification.linkUrl,
          imageUrl: notification.imageUrl,
        },
      }).catch((error) => {
        console.error('Campaign notification dispatch error:', error);
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...notification,
        readCount: notification._count.reads,
      },
    });
  } catch (error) {
    console.error('Create notification error:', error);
    return adminErrorResponse(error);
  }
}
