import { NextRequest, NextResponse } from 'next/server';
import { generateOtp, createOtpVerification } from '@/lib/otp';
import { emailService } from '@/lib/email';
import {
  checkAuthRateLimit,
  checkCooldown,
  checkRateLimit,
  RATE_LIMITS,
} from '@/lib/rate-limit';
import { getCurrentUserFromRequest } from '@/lib/session';

/**
 * Sends the code that confirms account deletion to the signed-in account's
 * email. It works for every account — including those created through
 * Google sign-in, which have no password to confirm with.
 */

type DeleteAccountOtpUser = {
  id: string;
  email: string;
  role: 'ADMIN' | 'CUSTOMER';
};

type DeleteAccountOtpDeps = {
  getCurrentUser: () => Promise<DeleteAccountOtpUser | null>;
  checkRateLimit: (
    email: string,
  ) => Promise<{ allowed: boolean; retryAfter?: number; message?: string }>;
  checkCooldown: (
    email: string,
  ) => Promise<{ allowed: boolean; retryAfter?: number; message?: string }>;
  generateOtp: () => string;
  createOtpVerification: (email: string, purpose: 'DELETE_ACCOUNT', otp: string) => Promise<unknown>;
  sendOtp: (email: string, otp: string) => Promise<unknown>;
};

function defaultDeps(request: NextRequest): DeleteAccountOtpDeps {
  return {
    getCurrentUser: () => getCurrentUserFromRequest(request),
    checkRateLimit: (email) =>
      checkRateLimit(email, 'email', RATE_LIMITS.OTP_SEND_PER_EMAIL),
    checkCooldown: (email) => checkCooldown(email),
    generateOtp,
    createOtpVerification,
    sendOtp: (email, otp) => emailService.sendOtp(email, otp),
  };
}

export async function handleDeleteAccountOtpRequest(deps: DeleteAccountOtpDeps) {
  const user = await deps.getCurrentUser();
  if (!user) {
    return { status: 401, body: { success: false, error: 'Chưa đăng nhập' } };
  }

  // Same rule as the deletion itself: the shop owner's account stays.
  if (user.role === 'ADMIN') {
    return {
      status: 403,
      body: { success: false, error: 'Không thể xóa tài khoản quản trị viên' },
    };
  }

  for (const check of [deps.checkRateLimit, deps.checkCooldown]) {
    const result = await check(user.email);
    if (!result.allowed) {
      return {
        status: 429,
        body: {
          success: false,
          error: result.message ?? 'Vui lòng thử lại sau',
          data: { retryAfter: result.retryAfter },
        },
      };
    }
  }

  const otp = deps.generateOtp();
  await deps.createOtpVerification(user.email, 'DELETE_ACCOUNT', otp);

  try {
    await deps.sendOtp(user.email, otp);
  } catch (error) {
    console.error('Failed to send delete-account OTP:', error);
    return {
      status: 500,
      body: { success: false, error: 'Không thể gửi email. Vui lòng thử lại sau' },
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      data: { message: 'Mã xác nhận đã được gửi đến email của bạn', expiresIn: 300 },
    },
  };
}

// POST /api/auth/delete-account/otp
export async function POST(request: NextRequest) {
  const ipRateLimit = checkAuthRateLimit(request, 'auth-otp');
  if (ipRateLimit) {
    return NextResponse.json(
      { success: false, error: 'Quá nhiều lần thử. Vui lòng thử lại sau.' },
      {
        status: ipRateLimit.status,
        headers: { 'Retry-After': String(ipRateLimit.retryAfterSec) },
      },
    );
  }

  try {
    const result = await handleDeleteAccountOtpRequest(defaultDeps(request));
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Delete account OTP error:', error);
    return NextResponse.json(
      { success: false, error: 'Đã có lỗi xảy ra' },
      { status: 500 },
    );
  }
}
