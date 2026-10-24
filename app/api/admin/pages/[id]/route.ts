import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/session';
import { slugify } from '@/lib/slug';
import { mapAuthErrorToStatus } from '@/lib/rbac';
import {
  buildRequestCorrelation,
  writeAdminActionAuditLog,
} from '@/lib/admin-action-audit';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Đã có lỗi xảy ra';
}

// GET /api/admin/pages/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const page = await prisma.page.findUnique({ where: { id } });

    if (!page) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy trang' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: page,
    });
  } catch (error: unknown) {
    console.error('Get page error:', error);
    const message = getErrorMessage(error);
    const status = mapAuthErrorToStatus(message);
    return NextResponse.json(
      { success: false, error: message },
      { status },
    );
  }
}

// PUT /api/admin/pages/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;

    const existing = await prisma.page.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy trang' },
        { status: 404 },
      );
    }

    if (body.isPublished !== undefined && typeof body.isPublished !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'isPublished must be a boolean' },
        { status: 400 },
      );
    }

    const nextSlug =
      typeof body.slug === 'string'
        ? slugify(body.slug || (typeof body.title === 'string' ? body.title : ''))
        : existing.slug;
    if (nextSlug && nextSlug !== existing.slug) {
      const slugExists = await prisma.page.findUnique({
        where: { slug: nextSlug },
      });
      if (slugExists) {
        return NextResponse.json(
          { success: false, error: 'Slug đã tồn tại' },
          { status: 400 },
        );
      }
    }

    const page = await prisma.page.update({
      where: { id },
      data: {
        title:
          typeof body.title === 'string' && body.title.trim()
            ? body.title
            : existing.title,
        slug: nextSlug,
        content: typeof body.content === 'string' ? body.content : existing.content,
        isPublished:
          typeof body.isPublished === 'boolean'
            ? body.isPublished
            : existing.isPublished,
      },
    });

    await writeAdminActionAuditLog({
      module: 'content',
      entity: 'page',
      entityId: id,
      mutationType: 'UPDATE',
      summary: `Cập nhật trang ${id}`,
      actorUserId: admin.id,
      actorRole: admin.role,
      correlation: buildRequestCorrelation(
        { headers: request.headers, method: request.method },
        '/api/admin/pages/[id]',
      ),
    });

    return NextResponse.json({
      success: true,
      data: page,
    });
  } catch (error: unknown) {
    console.error('Update page error:', error);
    const message = getErrorMessage(error);
    const status = mapAuthErrorToStatus(message);
    return NextResponse.json(
      { success: false, error: message },
      { status },
    );
  }
}

// DELETE /api/admin/pages/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const existing = await prisma.page.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy trang' },
        { status: 404 },
      );
    }

    await prisma.page.delete({ where: { id } });

    await writeAdminActionAuditLog({
      module: 'content',
      entity: 'page',
      entityId: id,
      mutationType: 'DELETE',
      summary: `Xóa trang ${id}`,
      actorUserId: admin.id,
      actorRole: admin.role,
      correlation: buildRequestCorrelation(
        { headers: request.headers, method: request.method },
        '/api/admin/pages/[id]',
      ),
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Page deleted successfully' },
    });
  } catch (error: unknown) {
    console.error('Delete page error:', error);
    const message = getErrorMessage(error);
    const status = mapAuthErrorToStatus(message);
    return NextResponse.json(
      { success: false, error: message },
      { status },
    );
  }
}
