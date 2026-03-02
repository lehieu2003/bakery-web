import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get last week's date range
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    // Execute queries in parallel
    const [
      todayOrdersCount,
      todayRevenue,
      pendingOrdersCount,
      totalCustomers,
      totalProducts,
      weeklyOrders,
      topProducts,
      recentOrders,
    ] = await Promise.all([
      // Today's orders count
      prisma.order.count({
        where: {
          createdAt: { gte: today, lt: tomorrow },
        },
      }),

      // Today's revenue
      prisma.order.aggregate({
        where: {
          createdAt: { gte: today, lt: tomorrow },
          status: { not: 'CANCELLED' },
        },
        _sum: { total: true },
      }),

      // Pending orders count
      prisma.order.count({
        where: { status: 'PENDING' },
      }),

      // Total customers
      prisma.user.count({
        where: { role: 'CUSTOMER' },
      }),

      // Total active products
      prisma.product.count({
        where: { isActive: true },
      }),

      // Weekly orders (last 7 days)
      prisma.order.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: { gte: lastWeek },
        },
        _count: true,
        _sum: { total: true },
      }),

      // Top 5 products by order count
      prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),

      // Recent 5 orders
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
          orderItems: { take: 3 },
        },
      }),
    ]);

    // Get product names for top products
    const topProductIds = topProducts.map((p) => p.productId);
    const topProductDetails = await prisma.product.findMany({
      where: { id: { in: topProductIds } },
      select: { id: true, name: true },
    });

    const topProductsWithNames = topProducts.map((p) => ({
      ...p,
      product: topProductDetails.find((d) => d.id === p.productId),
    }));

    // Process weekly data for chart
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const chartData = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(lastWeek);
      date.setDate(date.getDate() + i);
      const dayOrders = weeklyOrders.filter((o) => {
        const orderDate = new Date(o.createdAt);
        return orderDate.toDateString() === date.toDateString();
      });
      return {
        day: weekDays[date.getDay()],
        orders: dayOrders.reduce((sum, o) => sum + o._count, 0),
        revenue: dayOrders.reduce(
          (sum, o) => sum + Number(o._sum.total || 0),
          0,
        ),
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        kpi: {
          todayOrders: todayOrdersCount,
          todayRevenue: Number(todayRevenue._sum.total || 0),
          pendingOrders: pendingOrdersCount,
          totalCustomers,
          totalProducts,
        },
        chartData,
        topProducts: topProductsWithNames,
        recentOrders: recentOrders.map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName || order.user?.name || 'Guest',
          total: Number(order.total),
          status: order.status,
          createdAt: order.createdAt,
          itemsCount: order.orderItems.length,
        })),
      },
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 },
    );
  }
}
