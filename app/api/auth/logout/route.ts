import { NextRequest, NextResponse } from 'next/server';
import { deleteSession } from '@/lib/session';
import { readSessionTokenFromRequest } from '@/app/api/auth/refresh/route';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Cookie clients: deleteSession removes the server session and clears
    // the cookie. Bearer clients (mobile) have no cookie — revoke the
    // presented token server-side so logout always kills the session.
    const presented = readSessionTokenFromRequest(request);
    await deleteSession();

    if (presented?.source === 'bearer') {
      await prisma.session.deleteMany({ where: { token: presented.token } });
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Đăng xuất thành công',
      },
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Đã có lỗi xảy ra' },
      { status: 500 },
    );
  }
}
