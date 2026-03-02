import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

// GET: Get order details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            memberLevel: true,
          },
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Get order error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch order' },
      { status: 500 },
    );
  }
}

// PATCH: Update order (status, notes, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 },
      );
    }

    const validStatuses = [
      'PENDING',
      'CONFIRMED',
      'PROCESSING',
      'READY',
      'COMPLETED',
      'CANCELLED',
    ];

    const updateData: Record<string, unknown> = {};

    if (body.status !== undefined) {
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { success: false, error: 'Invalid status' },
          { status: 400 },
        );
      }
      updateData.status = body.status;
    }

    if (body.note !== undefined) updateData.note = body.note;
    if (body.customerName !== undefined)
      updateData.customerName = body.customerName;
    if (body.customerPhone !== undefined)
      updateData.customerPhone = body.customerPhone;
    if (body.shippingAddress !== undefined)
      updateData.shippingAddress = body.shippingAddress;

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { name: true, email: true },
        },
        items: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Update order error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update order' },
      { status: 500 },
    );
  }
}
