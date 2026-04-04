import { NextRequest, NextResponse } from 'next/server';
import { validateEmail, getClientIp } from '@/lib/rate-limit';
import { verifyPassword } from '@/lib/password';
import { createSession, setSessionCookie } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { canAuthenticateWithPassword } from '@/lib/auth/login-policy';

/**
 * Login with email + password (no OTP required)
 * Only for users who have already verified their email during registration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email và mật khẩu là bắt buộc' },
        { status: 400 },
      );
    }

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return NextResponse.json(
        { success: false, error: emailValidation.message },
        { status: 400 },
      );
    }

    const normalizedEmail = emailValidation.normalized!;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email hoặc mật khẩu không đúng',
        },
        { status: 401 },
      );
    }

    // Keep login failures generic to avoid exposing account state details.
    if (!canAuthenticateWithPassword(user)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email hoặc mật khẩu không đúng',
        },
        { status: 401 },
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email hoặc mật khẩu không đúng',
        },
        { status: 401 },
      );
    }

    // Create session
    const clientIp = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || undefined;

    const session = await createSession(user.id, userAgent, clientIp);

    // Set session cookie (for server-side validation)
    await setSessionCookie(session.token);

    return NextResponse.json({
      success: true,
      data: {
        message: 'Đăng nhập thành công',
        token: session.token, // Access token for frontend
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          role: session.user.role,
          memberLevel: session.user.memberLevel,
          points: session.user.points,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Đã có lỗi xảy ra. Vui lòng thử lại sau',
      },
      { status: 500 },
    );
  }
}

