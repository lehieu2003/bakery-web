import { NextRequest, NextResponse } from 'next/server';
import { checkAuthRateLimit, getClientIp } from '@/lib/rate-limit';
import { checkCredentialRequest } from '@/lib/auth/request-origin';
import {
  createSession,
  setSessionCookie,
  signInSuccessBody,
} from '@/lib/session';
import {
  resolveClientDevice,
  verifySignInChallenge,
} from '@/lib/auth/admin-device';

/**
 * Second step of an admin sign-in from a new device: the code emailed by
 * POST /api/auth/login (or Google sign-in). Must come from the same device;
 * on success that device becomes the trusted one for its platform.
 */
export async function POST(request: NextRequest) {
  const rateLimit = checkAuthRateLimit(request, 'auth-login');
  if (rateLimit) {
    return NextResponse.json(
      { success: false, error: 'Quá nhiều lần thử. Vui lòng thử lại sau.' },
      {
        status: rateLimit.status,
        headers: { 'Retry-After': String(rateLimit.retryAfterSec) },
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
    const body = (await request.json().catch(() => null)) as {
      challengeId?: unknown;
      otp?: unknown;
    } | null;
    const challengeId =
      typeof body?.challengeId === 'string' ? body.challengeId.trim() : '';
    const otp = typeof body?.otp === 'string' ? body.otp.trim() : '';
    if (!challengeId || !otp) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng nhập mã xác minh' },
        { status: 400 },
      );
    }

    const clientIp = getClientIp(request);
    const result = await verifySignInChallenge({
      challengeId,
      code: otp,
      device: resolveClientDevice(request),
      ipAddress: clientIp,
    });
    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status },
      );
    }

    const session = await createSession(
      result.user.id,
      request.headers.get('user-agent') || undefined,
      clientIp,
      result.binding,
    );
    await setSessionCookie(session.token, result.binding.expiresInDays);
    return NextResponse.json(
      signInSuccessBody(session, 'Đã xác minh thiết bị'),
    );
  } catch (error) {
    console.error('Login verify error:', error);
    return NextResponse.json(
      { success: false, error: 'Đã có lỗi xảy ra. Vui lòng thử lại sau' },
      { status: 500 },
    );
  }
}
