/**
 * ZaloPay Callback
 * Called by ZaloPay server after payment completion
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyZaloPayCallback } from '@/lib/payment/zalopay';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data: dataStr, mac } = body;

    // Verify signature using key2
    if (!verifyZaloPayCallback(dataStr, mac)) {
      console.error('ZaloPay callback: invalid MAC');
      return NextResponse.json({
        return_code: -1,
        return_message: 'mac not equal',
      });
    }

    const data = JSON.parse(dataStr);
    // app_trans_id format: "YYMMDD_orderId"
    const appTransId: string = data.app_trans_id;
    const orderId = appTransId.split('_').slice(1).join('_');

    // Idempotency: only update if payment is still PENDING
    const payment = await prisma.payment.findUnique({
      where: { orderId },
    });
    if (!payment || payment.status !== 'PENDING') {
      return NextResponse.json({
        return_code: 1,
        return_message: 'already processed',
      });
    }

    await prisma.$transaction([
      prisma.payment.update({
        where: { orderId },
        data: { status: 'PAID' },
      }),
      prisma.order.update({
        where: { id: orderId },
        data: { status: 'CONFIRMED' },
      }),
    ]);

    // ZaloPay expects return_code: 1 for success
    return NextResponse.json({ return_code: 1, return_message: 'success' });
  } catch (error) {
    console.error('ZaloPay callback error:', error);
    return NextResponse.json({
      return_code: 0,
      return_message: 'server error',
    });
  }
}
