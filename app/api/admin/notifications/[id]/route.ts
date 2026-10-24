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

// GET /api/admin/notifications/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const notification = await prisma.notification.findUnique({
      where: { id },
      include: {
        _count: { select: { reads: true } },
      },
    });

    if (!notification) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy thông báo' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...notification,
        readCount: notification._count.reads,
      },
    });
  } catch (error) {
    console.error('Get notification error:', error);
    return adminErrorResponse(error);
  }
}

// PUT /api/admin/notifications/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.notification.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy thông báo' },
        { status: 404 },
      );
    }

    if (body.status !== undefined && !isValidStatus(body.status)) {
      return NextResponse.json(
        { success: false, error: 'Trạng thái thông báo không hợp lệ' },
        { status: 400 },
      );
    }

    const nextStatus: NotificationStatus =
      body.status !== undefined ? body.status : existing.status;

    let resolvedPublishedAt: Date | null | undefined = undefined;

    if (body.publishedAt !== undefined) {
      const parsedPublishedAt = parseDateValue(body.publishedAt);
      if (body.publishedAt !== null && parsedPublishedAt === null) {
        return NextResponse.json(
          { success: false, error: 'Ngày xuất bản không hợp lệ' },
          { status: 400 },
        );
      }
      resolvedPublishedAt = parsedPublishedAt;
    }

    if (nextStatus === 'PUBLISHED') {
      if (resolvedPublishedAt === undefined || resolvedPublishedAt === null) {
        resolvedPublishedAt = existing.publishedAt || new Date();
      }
    }

    const notification = await prisma.notification.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.content !== undefined && { content: body.content }),
        ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl || null }),
        ...(body.linkUrl !== undefined && { linkUrl: body.linkUrl || null }),
        ...(body.status !== undefined && { status: nextStatus }),
        ...(resolvedPublishedAt !== undefined && {
          publishedAt: resolvedPublishedAt,
        }),
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
    console.error('Update notification error:', error);
    return adminErrorResponse(error);
  }
}

// DELETE /api/admin/notifications/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const existing = await prisma.notification.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy thông báo' },
        { status: 404 },
      );
    }

    await prisma.notification.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      data: { message: 'Notification deleted successfully' },
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    return adminErrorResponse(error);
  }
}
