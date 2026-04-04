import { NextResponse } from 'next/server';
import { generateOtp, createOtpVerification } from '@/lib/otp';
import { emailService } from '@/lib/email';
import {
  checkRateLimit,
  checkCooldown,
  validateEmail,
  RATE_LIMITS,
} from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';
import { buildResetPasswordRequestSuccessData } from '@/lib/auth/reset-password-utils';

type ResetPasswordRequestBody = {
  email?: string;
};

type ResetPasswordRequestDeps = {
  validateEmail: typeof validateEmail;
  checkRateLimit: typeof checkRateLimit;
  checkCooldown: typeof checkCooldown;
  findUserByEmail: (email: string) => Promise<{ id: string } | null>;
  generateOtp: typeof generateOtp;
  createOtpVerification: typeof createOtpVerification;
  sendOtp: (email: string, otp: string) => Promise<unknown>;
};

const defaultDeps: ResetPasswordRequestDeps = {
  validateEmail,
  checkRateLimit,
  checkCooldown,
  findUserByEmail: async (email) =>
    prisma.user.findUnique({
      where: { email },
      select: { id: true },
    }),
  generateOtp,
  createOtpVerification,
  sendOtp: (email, otp) => emailService.sendOtp(email, otp),
};

export async function handleResetPasswordRequest(
  body: ResetPasswordRequestBody,
  deps: ResetPasswordRequestDeps = defaultDeps,
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

  const { email } = body;

  if (!email) {
    return {
      status: 400,
      body: { success: false, error: 'Email là bắt buộc' },
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

  const emailRateLimitResult = await deps.checkRateLimit(
    normalizedEmail,
    'email',
    RATE_LIMITS.OTP_SEND_PER_EMAIL,
  );
  if (!emailRateLimitResult.allowed) {
    return {
      status: 429,
      body: {
        success: false,
        error: emailRateLimitResult.message,
        data: { retryAfter: emailRateLimitResult.retryAfter },
      },
    };
  }

  const cooldownResult = await deps.checkCooldown(normalizedEmail);
  if (!cooldownResult.allowed) {
    return {
      status: 429,
      body: {
        success: false,
        error: cooldownResult.message,
        data: { retryAfter: cooldownResult.retryAfter },
      },
    };
  }

  // Always write OTP request state to make throttling effective
  // for both existing and non-existing emails.
  const otp = deps.generateOtp();
  await deps.createOtpVerification(normalizedEmail, 'RESET_PASSWORD', otp);

  const existingUser = await deps.findUserByEmail(normalizedEmail);

  if (!existingUser) {
    return {
      status: 200,
      body: {
        success: true,
        data: buildResetPasswordRequestSuccessData(normalizedEmail),
      },
    };
  }

  try {
    await deps.sendOtp(normalizedEmail, otp);
  } catch (error) {
    console.error('Failed to send OTP email:', error);
    return {
      status: 500,
      body: {
        success: false,
        error: 'Không thể gửi email. Vui lòng thử lại sau',
      },
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      data: buildResetPasswordRequestSuccessData(normalizedEmail),
    },
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ResetPasswordRequestBody;
    const result = await handleResetPasswordRequest(body);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Đã xảy ra lỗi. Vui lòng thử lại sau',
      },
      { status: 500 },
    );
  }
}
