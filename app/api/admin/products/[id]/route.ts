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
        categories: { include: { category: true } },
        images: { orderBy: { displayOrder: 'asc' } },
        variants: true,
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

    const {
      images,
      variants,
      categories,
      categoryIds,
      category,
      ...updateData
    } = body as Record<string, any>;

    // Handle category connections if categoryIds provided
    if (Array.isArray(categoryIds)) {
      await prisma.productCategory.deleteMany({ where: { productId: id } });
      if (categoryIds.length > 0) {
        await prisma.productCategory.createMany({
          data: categoryIds.map((cid: string) => ({
            productId: id,
            categoryId: cid,
          })),
        });
      }
    }

    // Handle variant CRUD if variants array is provided
    if (Array.isArray(variants)) {
      const incoming = variants as {
        id?: string;
        name: string;
        sku?: string;
        price: number;
        stock?: number;
      }[];
      const incomingIds = incoming.filter((v) => v.id).map((v) => v.id!);

      // Delete variants that are no longer in the list
      await prisma.productVariant.deleteMany({
        where: { productId: id, id: { notIn: incomingIds } },
      });

      // Upsert each variant
      for (const v of incoming) {
        if (v.id) {
          await prisma.productVariant.update({
            where: { id: v.id },
            data: {
              name: v.name,
              sku: v.sku || null,
              price: v.price,
              stock: typeof v.stock === 'number' ? v.stock : 0,
            },
          });
        } else {
          await prisma.productVariant.create({
            data: {
              productId: id,
              name: v.name,
              sku: v.sku || null,
              price: v.price,
              stock: typeof v.stock === 'number' ? v.stock : 0,
            },
          });
        }
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        categories: { include: { category: true } },
        images: { orderBy: { displayOrder: 'asc' } },
        variants: true,
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
