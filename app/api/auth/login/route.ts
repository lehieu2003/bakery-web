import { NextRequest, NextResponse } from 'next/server';
import {
  checkAuthRateLimit,
  getClientIp,
  resetIpRateLimit,
  validateEmail,
} from '@/lib/rate-limit';
import { verifyPassword } from '@/lib/password';
import {
  createSession,
  setSessionCookie,
  signInSuccessBody,
} from '@/lib/session';
import {
  decideSignIn,
  pendingSignInResponse,
  resolveClientDevice,
  setDeviceCookie,
} from '@/lib/auth/admin-device';
import { prisma } from '@/lib/prisma';
import { canAuthenticateWithPassword } from '@/lib/auth/login-policy';
import { checkCredentialRequest } from '@/lib/auth/request-origin';

/**
 * Login with email + password (no OTP required)
 * Only for users who have already verified their email during registration
 */
export async function POST(request: NextRequest) {
  const authRateLimit = checkAuthRateLimit(request, 'auth-login');
  if (authRateLimit) {
    return NextResponse.json(
      { success: false, error: 'Quá nhiều lần thử. Vui lòng thử lại sau.' },
      {
        status: authRateLimit.status,
        headers: { 'Retry-After': String(authRateLimit.retryAfterSec) },
      },
    );
  }

  const credentialCheck = checkCredentialRequest(request);
  if (!credentialCheck.ok) {
    return NextResponse.json(
      { success: false, error: 'Yêu cầu không hợp lệ' },
      { status: credentialCheck.status },
    );
  }

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

    // Credentials verified — clear this IP's failed-login counter so the
    // auth-login budget only accumulates failed attempts.
    const clientIp = getClientIp(request);
    resetIpRateLimit(clientIp, 'auth-login');

    const userAgent = request.headers.get('user-agent') || undefined;

    // Admins: a session only from their trusted device for this platform;
    // another device gets an emailed code first (lib/auth/admin-device.ts).
    const device = resolveClientDevice(request);
    const decision = await decideSignIn({
      user,
      device,
      userAgent,
      ipAddress: clientIp,
    });
    const pending = pendingSignInResponse(decision);
    if (pending) {
      const response = NextResponse.json(pending.body, { status: pending.status });
      setDeviceCookie(response, device);
      return response;
    }
    const binding = decision.kind === 'session' ? decision.binding : null;

    const session = await createSession(user.id, userAgent, clientIp, binding);

    // Set session cookie (for server-side validation)
    await setSessionCookie(session.token, binding?.expiresInDays);

    const response = NextResponse.json(
      signInSuccessBody(session, 'Đăng nhập thành công'),
    );
    setDeviceCookie(response, device);
    return response;
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

