import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/blog/tags - Public tags
export async function GET() {
  try {
    const tags = await prisma.blogTag.findMany({
      include: {
        _count: {
          select: { posts: { where: { post: { status: 'PUBLISHED' } } } },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, data: { tags } });
  } catch (error) {
    console.error('Public blog tags error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi tải tags blog' },
      { status: 500 },
    );
  }
}
