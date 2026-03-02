import { NextResponse } from 'next/server';
import { verifyOtp } from '@/lib/otp';
import { validateEmail } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, otp, newPassword } = body;

    // Validate required fields
    if (!email || !otp || !newPassword) {
      return NextResponse.json(
        { error: 'Email, OTP và mật khẩu mới là bắt buộc' },
        { status: 400 },
      );
    }

    // Validate email
    const validation = validateEmail(email);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.message }, { status: 400 });
    }

    const normalizedEmail = validation.normalized!;

    // Validate password
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Mật khẩu phải có ít nhất 6 ký tự' },
        { status: 400 },
      );
    }

    // Verify OTP
    const otpResult = await verifyOtp(normalizedEmail, 'RESET_PASSWORD', otp);
    if (!otpResult.success) {
      return NextResponse.json({ error: otpResult.message }, { status: 400 });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Người dùng không tồn tại' },
        { status: 404 },
      );
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: passwordHash,
      },
    });

    // Invalidate all existing sessions for security
    await prisma.session.deleteMany({
      where: { userId: user.id },
    });

    return NextResponse.json({
      message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại',
    });
  } catch (error) {
    console.error('Reset password verify error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi. Vui lòng thử lại sau' },
      { status: 500 },
    );
  }
}
