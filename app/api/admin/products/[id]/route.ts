import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { prisma } from '@/lib/prisma';

// GET /api/admin/products/[id] - Get single product (PUBLIC - no auth required)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Public endpoint - no auth required for viewing product details
    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy sản phẩm' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { product },
    });
  } catch (error) {
    console.error('Admin get product error:', error);
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

// PUT /api/admin/products/[id] - Update product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const product = await prisma.product.update({
      where: { id },
      data: body,
      include: {
        category: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: { product },
    });
  } catch (error) {
    console.error('Admin update product error:', error);
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

// DELETE /api/admin/products/[id] - Delete product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    await prisma.product.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      data: { message: 'Xóa sản phẩm thành công' },
    });
  } catch (error) {
    console.error('Admin delete product error:', error);
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
