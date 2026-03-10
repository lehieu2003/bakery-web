import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/blog/categories - Public active categories
export async function GET() {
  try {
    const categories = await prisma.blogCategory.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { posts: { where: { status: 'PUBLISHED' } } } },
      },
      orderBy: { displayOrder: 'asc' },
    });

    return NextResponse.json({ success: true, data: { categories } });
  } catch (error) {
    console.error('Public blog categories error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi tải danh mục blog' },
      { status: 500 },
    );
  }
}
