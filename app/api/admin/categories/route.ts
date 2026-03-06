import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { prisma } from '@/lib/prisma';

// GET /api/admin/categories (PUBLIC - no auth required)
export async function GET() {
  try {
    // Public endpoint - no auth required for viewing categories
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: { categories },
    });
  } catch (error) {
    console.error('Admin categories error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const status =
      errorMessage === 'Unauthorized'
        ? 401
        : errorMessage === 'Forbidden: Admin access required'
          ? 403
          : 500;
    return NextResponse.json(
      { success: false, error: errorMessage || 'Đã có lỗi xảy ra' },
      { status },
    );
  }
}

// POST /api/admin/categories
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();

    const { name, slug, description, imageUrl, displayOrder, isActive } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bắt buộc' },
        { status: 400 },
      );
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description,
        imageUrl,
        displayOrder: displayOrder || 0,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json({
      success: true,
      data: { category },
    });
  } catch (error) {
    console.error('Admin create category error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const status =
      errorMessage === 'Unauthorized'
        ? 401
        : errorMessage === 'Forbidden: Admin access required'
          ? 403
          : 500;
    return NextResponse.json(
      { success: false, error: errorMessage || 'Đã có lỗi xảy ra' },
      { status },
    );
  }
}
