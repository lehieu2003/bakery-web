import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapAuthErrorToStatus, requireUserFromRequest } from '@/lib/rbac';

function getProductIdFromBody(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const value = (body as { productId?: unknown }).productId;
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// GET /api/wishlist - Get current user's favorite products
export async function GET(request: NextRequest) {
  try {
    const user = await requireUserFromRequest(request);

    const wishlist = await prisma.wishlist.findMany({
      where: { userId: user.id },
      include: {
        product: {
          include: {
            images: {
              orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
            },
            categories: {
              include: {
                category: true,
              },
            },
            variants: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: { wishlist },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không tải được danh sách yêu thích';
    const status = mapAuthErrorToStatus(message);
    if (status !== 500) {
      return NextResponse.json({ success: false, error: message }, { status });
    }
    console.error('Get wishlist error:', error);
    return NextResponse.json(
      { success: false, error: 'Không tải được danh sách yêu thích' },
      { status: 500 },
    );
  }
}

// POST /api/wishlist - Add product to favorite list
export async function POST(request: NextRequest) {
  try {
    const user = await requireUserFromRequest(request);

    const body = await request.json();
    const productId = getProductIdFromBody(body);

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Thiếu trường bắt buộc: productId' },
        { status: 400 },
      );
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, isActive: true },
      select: { id: true },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy sản phẩm' },
        { status: 404 },
      );
    }

    const item = await prisma.wishlist.upsert({
      where: {
        userId_productId: {
          userId: user.id,
          productId,
        },
      },
      update: {},
      create: {
        userId: user.id,
        productId,
      },
      include: {
        product: {
          include: {
            images: {
              orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
            },
            categories: {
              include: {
                category: true,
              },
            },
            variants: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: { item, isFavorite: true },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không thêm được sản phẩm vào yêu thích';
    const status = mapAuthErrorToStatus(message);
    if (status !== 500) {
      return NextResponse.json({ success: false, error: message }, { status });
    }
    console.error('Add wishlist error:', error);
    return NextResponse.json(
      { success: false, error: 'Không thêm được sản phẩm vào yêu thích' },
      { status: 500 },
    );
  }
}

// DELETE /api/wishlist - Remove product from favorite list
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUserFromRequest(request);

    const body = await request.json();
    const productId = getProductIdFromBody(body);

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Thiếu trường bắt buộc: productId' },
        { status: 400 },
      );
    }

    await prisma.wishlist.deleteMany({
      where: {
        userId: user.id,
        productId,
      },
    });

    return NextResponse.json({
      success: true,
      data: { productId, removed: true, isFavorite: false },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không xóa được sản phẩm khỏi yêu thích';
    const status = mapAuthErrorToStatus(message);
    if (status !== 500) {
      return NextResponse.json({ success: false, error: message }, { status });
    }
    console.error('Remove wishlist error:', error);
    return NextResponse.json(
      { success: false, error: 'Không xóa được sản phẩm khỏi yêu thích' },
      { status: 500 },
    );
  }
}
