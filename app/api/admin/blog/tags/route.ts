import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { prisma } from '@/lib/prisma';

// GET /api/admin/blog/tags
export async function GET() {
  try {
    await requireAdmin();

    const tags = await prisma.blogTag.findMany({
      include: { _count: { select: { posts: true } } },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, data: { tags } });
  } catch (error) {
    console.error('Admin blog tags list error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    const status =
      msg === 'Unauthorized' ? 401 : msg.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}

// POST /api/admin/blog/tags
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { name, slug } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bắt buộc (name, slug)' },
        { status: 400 },
      );
    }

    const existing = await prisma.blogTag.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Slug đã tồn tại' },
        { status: 400 },
      );
    }

    const tag = await prisma.blogTag.create({
      data: { name, slug },
      include: { _count: { select: { posts: true } } },
    });

    return NextResponse.json({ success: true, data: tag });
  } catch (error) {
    console.error('Admin create blog tag error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
