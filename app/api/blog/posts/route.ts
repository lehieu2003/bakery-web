import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/blog/posts - Public published posts with pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const categorySlug = searchParams.get('categorySlug') || '';
    const tagSlug = searchParams.get('tagSlug') || '';

    const where: Record<string, unknown> = {
      status: 'PUBLISHED',
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categorySlug) {
      where.category = { slug: categorySlug };
    }

    if (tagSlug) {
      where.tags = {
        some: { tag: { slug: tagSlug } },
      };
    }

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          tags: { include: { tag: true } },
          author: { select: { id: true, name: true } },
        },
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.blogPost.count({ where }),
    ]);

    const flatPosts = posts.map((post) => ({
      ...post,
      tags: post.tags.map((pt) => pt.tag),
    }));

    return NextResponse.json({
      success: true,
      data: {
        posts: flatPosts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Public blog posts error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi tải bài viết' },
      { status: 500 },
    );
  }
}
