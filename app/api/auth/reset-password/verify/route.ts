import { NextResponse } from 'next/server';
import { verifyOtp } from '@/lib/otp';
import { checkAuthRateLimit, validateEmail } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';
import { hashPassword, validatePassword } from '@/lib/password';
import {
  applyPasswordReset,
  buildResetPasswordVerifySuccessData,
  sanitizeResetPasswordVerifyError,
} from '@/lib/auth/reset-password-utils';

type ResetPasswordVerifyRequestBody = {
  email?: string;
  otp?: string;
  newPassword?: string;
};

type ResetPasswordVerifyDeps = {
  validateEmail: typeof validateEmail;
  verifyOtp: typeof verifyOtp;
  findUserByEmail: (email: string) => Promise<{ id: string } | null>;
  hashPassword: typeof hashPassword;
  applyPasswordReset: typeof applyPasswordReset;
};

const defaultDeps: ResetPasswordVerifyDeps = {
  validateEmail,
  verifyOtp,
  findUserByEmail: async (email) =>
    prisma.user.findUnique({
      where: { email },
      select: { id: true },
    }),
  hashPassword,
  applyPasswordReset: (client, userId, passwordHash) =>
    applyPasswordReset(client, userId, passwordHash),
};

export async function handleResetPasswordVerifyRequest(
  body: ResetPasswordVerifyRequestBody,
  deps: ResetPasswordVerifyDeps = defaultDeps,
) {
  if (
    typeof body !== 'object' ||
    body === null ||
    Array.isArray(body)
  ) {
    return {
      status: 400,
      body: { success: false, error: 'Payload không hợp lệ' },
    };
  }

  const { email, otp, newPassword } = body;

  if (!email || !otp || !newPassword) {
    return {
      status: 400,
      body: { success: false, error: 'Email, OTP và mật khẩu mới là bắt buộc' },
    };
  }

  const validation = deps.validateEmail(email);
  if (!validation.valid) {
    return {
      status: 400,
      body: { success: false, error: validation.message },
    };
  }

  const normalizedEmail = validation.normalized!;

  const passwordCheck = validatePassword(newPassword);
  if (!passwordCheck.valid) {
    return {
      status: 400,
      body: { success: false, error: passwordCheck.message },
    };
  }

  const otpResult = await deps.verifyOtp(normalizedEmail, 'RESET_PASSWORD', otp);
  if (!otpResult.success) {
    return {
      status: 400,
      body: {
        success: false,
        error: sanitizeResetPasswordVerifyError(otpResult.message),
      },
    };
  }

  const user = await deps.findUserByEmail(normalizedEmail);

  if (!user) {
    return {
      status: 400,
      body: {
        success: false,
        error: sanitizeResetPasswordVerifyError('Người dùng không tồn tại'),
      },
    };
  }

  const passwordHash = await deps.hashPassword(newPassword);
  await deps.applyPasswordReset(prisma, user.id, passwordHash);

  return {
    status: 200,
    body: {
      success: true,
      data: buildResetPasswordVerifySuccessData(),
    },
  };
}

export async function POST(request: Request) {
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
    const body = (await request.json()) as ResetPasswordVerifyRequestBody;
    const result = await handleResetPasswordVerifyRequest(body);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Reset password verify error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Đã xảy ra lỗi. Vui lòng thử lại sau',
      },
      { status: 500 },
    );
  }
}
