import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: List all categories (public endpoint - no auth required)
// Returns a flat list with children populated for root categories
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { products: true },
        },
        children: {
          where: { isActive: true },
          include: {
            _count: { select: { products: true } },
            children: {
              where: { isActive: true },
              include: {
                _count: { select: { products: true } },
              },
              orderBy: { displayOrder: 'asc' },
            },
          },
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    // Return only root categories (parentId === null) with nested children
    const tree = categories.filter((c) => c.parentId === null);

    return NextResponse.json({
      success: true,
      data: { categories: tree },
    });
  } catch (error) {
    console.error('Get public categories error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 },
    );
  }
}
