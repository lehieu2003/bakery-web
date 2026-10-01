import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapAuthErrorToStatus, requireUserFromRequest } from '@/lib/rbac';
import { serializeOrder, type OrderReadModel } from '../route';

type GetOrderRouteDeps = {
  getCurrentUser: (request: NextRequest) => Promise<{ id: string } | null>;
  findOrderForUser: (
    orderNumber: string,
    userId: string,
  ) => Promise<OrderReadModel | null>;
};

const getOrderDeps: GetOrderRouteDeps = {
  getCurrentUser: requireUserFromRequest,
  findOrderForUser: async (orderNumber, userId) =>
    prisma.order.findFirst({
      where: { orderNumber, userId },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                images: {
                  select: { url: true, isPrimary: true },
                  where: { isPrimary: true },
                  take: 1,
                },
              },
            },
          },
        },
        payment: true,
      },
    }) as Promise<OrderReadModel | null>,
};

export async function handleGetOrderRequest(
  request: NextRequest,
  { orderNumber }: { orderNumber: string },
  deps: GetOrderRouteDeps = getOrderDeps,
) {
  try {
    const user = await deps.getCurrentUser(request);

    if (!user) {
      return {
        status: 401,
        body: { success: false, error: 'Unauthorized' },
      };
    }

    const order = await deps.findOrderForUser(orderNumber, user.id);

    if (!order) {
      return {
        status: 404,
        body: { success: false, error: 'Order not found' },
      };
    }

    return {
      status: 200,
      body: { success: true, data: { order: serializeOrder(order) } },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch order';
    const status = mapAuthErrorToStatus(message);
    if (status !== 500) {
      return {
        status,
        body: { success: false, error: message },
      };
    }
    console.error('Get order error:', error);
    return {
      status: 500,
      body: { success: false, error: 'Failed to fetch order' },
    };
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> },
) {
  const { orderNumber } = await params;
  const result = await handleGetOrderRequest(request, { orderNumber }, getOrderDeps);
  return NextResponse.json(result.body, { status: result.status });
}
