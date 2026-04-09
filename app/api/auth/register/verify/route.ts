import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { verifyOtp } from '@/lib/otp';
import { validateEmail } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { createSession } from '@/lib/session';
import { emailService } from '@/lib/email';
import { dispatchNotificationEvent } from '@/lib/notifications/dispatcher';

export async function POST(request: Request) {
  const requestId = randomUUID();

  try {
    const body = await request.json();
    const { email, otp, password, name } = body;

    // Validate required fields
    if (!email || !otp || !password) {
      return NextResponse.json(
        { success: false, error: 'Email, OTP và mật khẩu là bắt buộc' },
        { status: 400 },
      );
    }

    // Validate email
    const validation = validateEmail(email);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.message },
        { status: 400 },
      );
    }

    const normalizedEmail = validation.normalized!;

    // Validate password
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Mật khẩu phải có ít nhất 8 ký tự' },
        { status: 400 },
      );
    }

    // Pending account must exist from register step.
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'OTP không hợp lệ hoặc đã hết hạn' },
        { status: 400 },
      );
    }

    if (existingUser.emailVerifiedAt) {
      return NextResponse.json(
        { success: false, error: 'Email đã được xác thực trước đó' },
        { status: 400 },
      );
    }

    // Verify OTP after we know this is a pending account to avoid consuming OTP for non-existing users.
    const otpResult = await verifyOtp(normalizedEmail, 'REGISTER', otp);
    if (!otpResult.success) {
      return NextResponse.json(
        { success: false, error: otpResult.message },
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        password: passwordHash,
        name: name || null,
        emailVerifiedAt: new Date(),
        isActive: true,
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
      console.error('[auth.verify-email] failed to send welcome email', {
        requestId,
        email: normalizedEmail,
        error,
      });
    }

    void dispatchNotificationEvent({
      eventType: 'ACCOUNT_VERIFIED',
      entityId: user.id,
      correlationKey: `account:${user.id}:verified`,
      targetUserId: user.id,
      targetEmail: normalizedEmail,
      payload: {
        userId: user.id,
        userName: user.name || 'Khách hàng',
        linkUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/profile`,
      },
    }).catch((error) => {
      console.error('[auth.verify-email] account notification dispatch failed', {
        requestId,
        userId: user.id,
        error,
      });
    });

    console.info('[auth.verify-email] account verified', {
      requestId,
      email: normalizedEmail,
      userId: user.id,
    });

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
    console.error('[auth.verify-email] unhandled error', {
      requestId,
      error,
    });
    return NextResponse.json(
      { success: false, error: 'Đã xảy ra lỗi. Vui lòng thử lại sau' },
      { status: 500 },
    );
  }
}
