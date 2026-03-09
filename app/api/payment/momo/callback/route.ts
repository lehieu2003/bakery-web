/**
 * MoMo IPN (Instant Payment Notification) Callback
 * Called by MoMo server after payment completion
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMoMoCallback } from '@/lib/payment/momo';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verify signature
    if (!verifyMoMoCallback(body)) {
      console.error('MoMo callback: invalid signature');
      return NextResponse.json(
        { resultCode: 1, message: 'Invalid signature' },
        { status: 400 },
      );
    }

    const { orderId, resultCode } = body;

    // Idempotency: only update if payment is still PENDING
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.paymentStatus !== 'PENDING') {
      return NextResponse.json({ resultCode: 0, message: 'already processed' });
    }

    // resultCode 0 = success
    const paymentStatus = resultCode === 0 ? 'PAID' : 'FAILED';

    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus,
        ...(paymentStatus === 'PAID' && { status: 'CONFIRMED' }),
      },
    });

    // MoMo expects this exact response format
    return NextResponse.json({ resultCode: 0, message: 'OK' });
  } catch (error) {
    console.error('MoMo callback error:', error);
    return NextResponse.json(
      { resultCode: 1, message: 'Server error' },
      { status: 500 },
    );
  }
}
