import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

// GET: List all customers
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const memberLevel = searchParams.get('level');

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      role: 'CUSTOMER',
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    if (memberLevel && memberLevel !== 'ALL') {
      where.memberLevel = memberLevel;
    }

    const [customers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          memberLevel: true,
          points: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: { orders: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Calculate total spent for each customer
    const customersWithSpent = await Promise.all(
      customers.map(async (customer) => {
        const totalSpent = await prisma.order.aggregate({
          where: {
            userId: customer.id,
            status: { not: 'CANCELLED' },
          },
          _sum: { total: true },
        });

        return {
          id: customer.id,
          email: customer.email,
          name: customer.name,
          phone: customer.phone,
          level: customer.memberLevel || 'SILVER',
          points: customer.points || 0,
          isActive: customer.isActive,
          createdAt: customer.createdAt,
          totalOrders: customer._count.orders,
          totalSpent: totalSpent._sum.total || 0,
        };
      }),
    );

    return NextResponse.json({
      success: true,
      data: customersWithSpent,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get customers error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customers' },
      { status: 500 },
    );
  }
}
