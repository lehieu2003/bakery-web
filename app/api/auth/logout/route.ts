import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/session';

export async function POST() {
  try {
    await deleteSession();

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
