import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { createMoMoPayment } from '@/lib/payment/momo';
import { createZaloPayPayment } from '@/lib/payment/zalopay';

const DISCOUNT_RATE: Record<string, number> = {
  SILVER: 0.05,
  GOLD: 0.1,
  PLATINUM: 0.15,
};

const VALID_PAYMENT_METHODS = ['cash', 'card', 'momo', 'zalopay'] as const;
type PaymentMethod = (typeof VALID_PAYMENT_METHODS)[number];

function generateOrderNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BK${dateStr}${rand}`;
}

// GET: Get user's orders
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const orders = await prisma.order.findMany({
      where: {
        userId: user.id,
      },
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
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: { orders },
    });
  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' },
      { status: 500 },
    );
  }
}

// POST: Create a new order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerName,
      customerPhone,
      customerEmail,
      customerNote,
      paymentMethod,
      items,
    } = body;

    // Validate required fields
    if (!customerName || !customerPhone || !paymentMethod || !items?.length) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 },
      );
    }

    // Validate Vietnamese phone number
    const cleanPhone = customerPhone.replace(/[\s.-]/g, '');
    const vnPhoneRegex = /^(0|\+84)(3|5|7|8|9)\d{8}$/;
    if (!vnPhoneRegex.test(cleanPhone)) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number' },
        { status: 400 },
      );
    }

    if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment method' },
        { status: 400 },
      );
    }

    // Validate items structure
    for (const item of items) {
      if (!item.productId || !item.name || !item.price || !item.quantity) {
        return NextResponse.json(
          { success: false, error: 'Invalid item data' },
          { status: 400 },
        );
      }
      if (item.quantity < 1 || item.quantity > 100) {
        return NextResponse.json(
          { success: false, error: 'Invalid item quantity' },
          { status: 400 },
        );
      }
    }

    // Verify products exist and are active, get server-side prices
    const productIds = items.map((i: { productId: string }) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      select: { id: true, name: true, price: true, stock: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        return NextResponse.json(
          {
            success: false,
            error: `Product "${item.name}" is not available`,
          },
          { status: 400 },
        );
      }
      if (product.stock < item.quantity) {
        return NextResponse.json(
          {
            success: false,
            error: `"${product.name}" is out of stock (available: ${product.stock})`,
          },
          { status: 400 },
        );
      }
    }

    // Get authenticated user (optional - guest checkout allowed)
    const user = await getCurrentUser();

    // Calculate totals using server-side prices
    const orderItems = items.map(
      (item: { productId: string; name: string; quantity: number }) => {
        const product = productMap.get(item.productId)!;
        const price = Number(product.price);
        return {
          productId: item.productId,
          name: product.name,
          price,
          quantity: item.quantity,
          subtotal: price * item.quantity,
        };
      },
    );

    const subtotal = orderItems.reduce(
      (sum: number, i: { subtotal: number }) => sum + i.subtotal,
      0,
    );
    const discountRate = user ? DISCOUNT_RATE[user.memberLevel] || 0 : 0;
    const discount = Math.round(subtotal * discountRate);
    const total = subtotal - discount;

    if (total <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid order total' },
        { status: 400 },
      );
    }

    // MoMo/ZaloPay require integer amounts (VND has no decimals)
    const totalInt = Math.round(total);

    const orderNumber = generateOrderNumber();

    // Create order in database
    const order = await prisma.$transaction(async (tx) => {
      // Decrease stock
      for (const item of orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      return tx.order.create({
        data: {
          orderNumber,
          userId: user?.id || null,
          customerName,
          customerPhone,
          customerEmail: customerEmail || user?.email || null,
          customerNote: customerNote || null,
          subtotal,
          discount,
          total,
          paymentMethod: paymentMethod as PaymentMethod,
          paymentStatus:
            paymentMethod === 'cash' || paymentMethod === 'card'
              ? 'UNPAID'
              : 'PENDING',
          status: 'PENDING',
          orderItems: {
            create: orderItems,
          },
        },
        include: {
          orderItems: true,
        },
      });
    });

    // Handle payment gateway for e-wallet methods
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const successUrl = `${appUrl}/checkout/success?order=${orderNumber}`;

    if (paymentMethod === 'momo') {
      const result = await createMoMoPayment({
        orderId: order.id,
        orderNumber,
        amount: totalInt,
        orderInfo: `Thanh toán đơn hàng #${orderNumber}`,
        redirectUrl: successUrl,
        ipnUrl: `${appUrl}/api/payment/momo/callback`,
      });

      if ('error' in result) {
        // Payment creation failed — order is still created with PENDING payment
        return NextResponse.json({
          success: true,
          data: {
            order: { ...order, orderNumber },
            paymentUrl: null,
            paymentError: result.error,
          },
        });
      }

      return NextResponse.json({
        success: true,
        data: { order: { ...order, orderNumber }, paymentUrl: result.payUrl },
      });
    }

    if (paymentMethod === 'zalopay') {
      const result = await createZaloPayPayment({
        orderId: order.id,
        orderNumber,
        amount: totalInt,
        description: `Thanh toán đơn hàng #${orderNumber}`,
        redirectUrl: successUrl,
        callbackUrl: `${appUrl}/api/payment/zalopay/callback`,
        items: orderItems.map(
          (i: { name: string; quantity: number; price: number }) => ({
            name: i.name,
            quantity: i.quantity,
            price: i.price,
          }),
        ),
      });

      if ('error' in result) {
        return NextResponse.json({
          success: true,
          data: {
            order: { ...order, orderNumber },
            paymentUrl: null,
            paymentError: result.error,
          },
        });
      }

      return NextResponse.json({
        success: true,
        data: { order: { ...order, orderNumber }, paymentUrl: result.payUrl },
      });
    }

    // Cash or card — no payment URL needed
    return NextResponse.json({
      success: true,
      data: { order: { ...order, orderNumber }, paymentUrl: null },
    });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create order' },
      { status: 500 },
    );
  }
}
