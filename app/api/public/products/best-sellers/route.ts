import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/public/products/best-sellers
// Returns top-selling products ranked by total quantity sold from completed orders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

    // Aggregate total quantity sold per product from delivered/completed orders
    const topSold = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      where: {
        order: {
          status: { in: ['COMPLETED', 'READY', 'CONFIRMED', 'PROCESSING'] },
        },
      },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    if (topSold.length === 0) {
      // Fallback: return newest active products when no sales data exists yet
      const products = await prisma.product.findMany({
        where: { isActive: true },
        include: {
          categories: {
            include: {
              category: { select: { id: true, name: true, slug: true } },
            },
          },
          images: { orderBy: { displayOrder: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return NextResponse.json({
        success: true,
        data: { products: products.map((p) => ({ ...p, totalSold: 0 })) },
      });
    }

    const productIds = topSold.map((item) => item.productId);
    const soldMap = new Map(
      topSold.map((item) => [item.productId, item._sum.quantity ?? 0]),
    );

    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      include: {
        categories: {
          include: {
            category: { select: { id: true, name: true, slug: true } },
          },
        },
        images: { orderBy: { displayOrder: 'asc' } },
      },
    });

    // Sort by sold quantity descending (preserve ranking)
    const sorted = products
      .map((p) => ({ ...p, totalSold: soldMap.get(p.id) ?? 0 }))
      .sort((a, b) => b.totalSold - a.totalSold);

    return NextResponse.json({ success: true, data: { products: sorted } });
  } catch (error) {
    console.error('Get best-sellers error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch best sellers' },
      { status: 500 },
    );
  }
}
