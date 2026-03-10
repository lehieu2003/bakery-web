import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/session';

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
  } catch (error: any) {
    console.error('Admin pages error:', error);
    const status =
      error.message === 'Unauthorized'
        ? 401
        : error.message === 'Forbidden: Admin access required'
          ? 403
          : 500;
    return NextResponse.json(
      { success: false, error: error.message || 'Đã có lỗi xảy ra' },
      { status },
    );
  }
}

// POST /api/admin/pages - Create page
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { title, slug, content, isPublished } = body;

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
  } catch (error: any) {
    console.error('Create page error:', error);
    const status =
      error.message === 'Unauthorized'
        ? 401
        : error.message === 'Forbidden: Admin access required'
          ? 403
          : 500;
    return NextResponse.json(
      { success: false, error: error.message || 'Đã có lỗi xảy ra' },
      { status },
    );
  }
}
