import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { prisma } from '@/lib/prisma';

// GET /api/admin/blog/posts
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const categoryId = searchParams.get('categoryId');
    const tagId = searchParams.get('tagId');

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;
    if (tagId) where.tags = { some: { tagId } };

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        include: {
          author: { select: { id: true, name: true } },
          category: true,
          tags: { include: { tag: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.blogPost.count({ where }),
    ]);

    // Flatten tags for response
    const formatted = posts.map((p) => ({
      ...p,
      tags: p.tags.map((t) => t.tag),
    }));

    return NextResponse.json({
      success: true,
      data: {
        posts: formatted,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Admin blog posts list error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    const status =
      msg === 'Unauthorized' ? 401 : msg.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}

// POST /api/admin/blog/posts
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();

    const {
      title,
      slug,
      excerpt,
      content,
      coverUrl,
      categoryId,
      tagIds,
      status,
      publishedAt,
      metaTitle,
      metaDescription,
    } = body;

    if (!title || !slug || !content) {
      return NextResponse.json(
        {
          success: false,
          error: 'Thiếu thông tin bắt buộc (title, slug, content)',
        },
        { status: 400 },
      );
    }

    const existing = await prisma.blogPost.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Slug đã tồn tại' },
        { status: 400 },
      );
    }

    const post = await prisma.blogPost.create({
      data: {
        title,
        slug,
        excerpt: excerpt || null,
        content,
        coverUrl: coverUrl || null,
        authorId: admin.id,
        categoryId: categoryId || null,
        status: status || 'DRAFT',
        publishedAt:
          status === 'PUBLISHED'
            ? publishedAt || new Date().toISOString()
            : null,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        tags: tagIds?.length
          ? { create: tagIds.map((tagId: string) => ({ tagId })) }
          : undefined,
      },
      include: {
        author: { select: { id: true, name: true } },
        category: true,
        tags: { include: { tag: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: { ...post, tags: post.tags.map((t) => t.tag) },
    });
  } catch (error) {
    console.error('Admin create blog post error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    const status =
      msg === 'Unauthorized' ? 401 : msg.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
