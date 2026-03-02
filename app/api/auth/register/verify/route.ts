import { NextResponse } from 'next/server';
import { verifyOtp } from '@/lib/otp';
import { validateEmail } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { createSession } from '@/lib/session';
import { emailService } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, otp, password, name } = body;

    // Validate required fields
    if (!email || !otp || !password) {
      return NextResponse.json(
        { error: 'Email, OTP và mật khẩu là bắt buộc' },
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
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Mật khẩu phải có ít nhất 6 ký tự' },
        { status: 400 },
      );
    }

    // Verify OTP
    const otpResult = await verifyOtp(normalizedEmail, 'REGISTER', otp);
    if (!otpResult.success) {
      return NextResponse.json({ error: otpResult.message }, { status: 400 });
    }

    // Check if user already exists (double check)
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email đã được đăng ký' },
        { status: 400 },
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: passwordHash,
        name: name || null,
        emailVerifiedAt: new Date(),
        role: 'CUSTOMER',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    // Create session
    const { sessionToken, expiresAt } = await createSession(user.id);

    // Send welcome email
    try {
      await emailService.sendWelcome(normalizedEmail, name || 'Khách hàng');
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      // Don't fail the registration if email fails
    }

    // Set session cookie
    const response = NextResponse.json({
      message: 'Đăng ký thành công',
      user,
    });

    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Register verify error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi. Vui lòng thử lại sau' },
      { status: 500 },
    );
  }
}
