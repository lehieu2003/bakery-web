import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/slug';

// GET /api/admin/blog/categories
export async function GET() {
  try {
    await requireAdmin();

    const categories = await prisma.blogCategory.findMany({
      include: { _count: { select: { posts: true } } },
      orderBy: { displayOrder: 'asc' },
    });

    return NextResponse.json({ success: true, data: { categories } });
  } catch (error) {
    console.error('Admin blog categories list error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    const status =
      msg === 'Unauthorized' ? 401 : msg.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}

// POST /api/admin/blog/categories
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { name, description, imageUrl, displayOrder, isActive } = body;
    const slug = slugify(body.slug || name || '');

    if (!name || !slug) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bắt buộc (name, slug)' },
        { status: 400 },
      );
    }

    const existing = await prisma.blogCategory.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Slug đã tồn tại' },
        { status: 400 },
      );
    }

    const category = await prisma.blogCategory.create({
      data: {
        name,
        slug,
        description: description || null,
        imageUrl: imageUrl || null,
        displayOrder: displayOrder || 0,
        isActive: isActive !== undefined ? isActive : true,
      },
      include: { _count: { select: { posts: true } } },
    });

    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    console.error('Admin create blog category error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
