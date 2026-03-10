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
        memberLevel: true,
        points: true,
        createdAt: true,
      },
    });

    // Create session
    const session = await createSession(user.id);

    // Send welcome email
    try {
      await emailService.sendWelcome(normalizedEmail, name || 'Khách hàng');
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      // Don't fail the registration if email fails
    }

    // Set session cookie (for server-side validation)
    const response = NextResponse.json({
      success: true,
      data: {
        message: 'Đăng ký thành công',
        token: session.token, // Access token for frontend
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          memberLevel: user.memberLevel,
          points: user.points,
        },
      },
    });

    response.cookies.set('bakery_session', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: session.expiresAt,
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
