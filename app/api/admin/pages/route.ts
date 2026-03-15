import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/session';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Đã có lỗi xảy ra';
}

function getErrorStatus(message: string) {
  if (message === 'Unauthorized') return 401;
  if (message === 'Forbidden: Admin access required') return 403;
  return 500;
}

// GET /api/admin/pages - List all pages
export async function GET() {
  try {
    await requireAdmin();

    const pages = await prisma.page.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: pages,
    });
  } catch (error: unknown) {
    console.error('Admin pages error:', error);
    const message = getErrorMessage(error);
    const status = getErrorStatus(message);
    return NextResponse.json(
      { success: false, error: message },
      { status },
    );
  }
}

// POST /api/admin/pages - Create page
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = (await request.json()) as Record<string, unknown>;
    const title = typeof body.title === 'string' ? body.title : '';
    const slug = typeof body.slug === 'string' ? body.slug : '';
    const content = typeof body.content === 'string' ? body.content : '';
    const isPublished =
      typeof body.isPublished === 'boolean' ? body.isPublished : false;

    if (!title || !slug || !content) {
      return NextResponse.json(
        { success: false, error: 'Title, slug, and content are required' },
        { status: 400 },
      );
    }

    const existing = await prisma.page.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Slug already exists' },
        { status: 400 },
      );
    }

    const page = await prisma.page.create({
      data: {
        title,
        slug,
        content,
        isPublished: isPublished ?? false,
      },
    });

    return NextResponse.json({
      success: true,
      data: page,
    });
  } catch (error: unknown) {
    console.error('Create page error:', error);
    const message = getErrorMessage(error);
    const status = getErrorStatus(message);
    return NextResponse.json(
      { success: false, error: message },
      { status },
    );
  }
}
