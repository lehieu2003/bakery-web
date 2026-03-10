import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { prisma } from '@/lib/prisma';

// GET /api/admin/orders - List all orders
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: {
            select: { id: true, phone: true, name: true },
          },
          payment: true,
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  images: {
                    select: { url: true, isPrimary: true },
                    where: { isPrimary: true },
                    take: 1,
                  },
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        orders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    console.error('Admin orders error:', error);
    const status =
      error.message === 'Unauthorized'
        ? 401
        : error.message === 'Forbidden: Admin access required'
          ? 403
          : 500;
    return NextResponse.json(
      { success: false, error: error.message || 'Đã có lỗi xảy ra' },
      { status },
    );
  }
}
