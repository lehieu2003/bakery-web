import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { generateOtp, createOtpVerification } from '@/lib/otp';
import { emailService } from '@/lib/email';
import { hashPassword } from '@/lib/password';
import {
  checkAuthRateLimit,
  checkRateLimit,
  checkCooldown,
  validateEmail,
  RATE_LIMITS,
} from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';
import { getRegistrationState } from '@/lib/auth/registration-utils';

export async function POST(request: Request) {
  const ipRateLimit = checkAuthRateLimit(request, 'auth-register');
  if (ipRateLimit) {
    return NextResponse.json(
      { success: false, error: 'Quá nhiều lần thử. Vui lòng thử lại sau.' },
      {
        status: ipRateLimit.status,
        headers: { 'Retry-After': String(ipRateLimit.retryAfterSec) },
      },
    );
  }

  const requestId = randomUUID();

  try {
    const body = await request.json();
    const { email } = body;

    // Validate email
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email là bắt buộc' },
        { status: 400 },
      );
    }

    const validation = validateEmail(email);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.message },
        { status: 400 },
      );
    }

    const normalizedEmail = validation.normalized!;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    const registrationState = getRegistrationState(existingUser);
    if (registrationState === 'VERIFIED') {
      console.warn('[auth.register] ignore register for verified account', {
        requestId,
        email: normalizedEmail,
      });
      // Do not reveal account existence details.
      return NextResponse.json({
        success: true,
        data: {
          message: 'Nếu email hợp lệ, OTP đã được gửi',
          email: normalizedEmail,
        },
      });
    }

    // Rate limiting - per email
    const emailRateLimitResult = await checkRateLimit(
      normalizedEmail,
      'email',
      RATE_LIMITS.OTP_SEND_PER_EMAIL,
    );
    if (!emailRateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: emailRateLimitResult.message,
          data: { retryAfter: emailRateLimitResult.retryAfter },
        },
        { status: 429 },
      );
    }

    // Cooldown check
    const cooldownResult = await checkCooldown(normalizedEmail);
    if (!cooldownResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: cooldownResult.message,
          data: { retryAfter: cooldownResult.retryAfter },
        },
        { status: 429 },
      );
    }

    // Create pending account for first registration attempt.
    if (registrationState === 'NEW') {
      const tempPassword = await hashPassword(randomUUID());
      await prisma.user.create({
        data: {
          email: normalizedEmail,
          password: tempPassword,
          role: 'CUSTOMER',
          isActive: false,
          emailVerifiedAt: null,
        },
      });
    }

    // Generate OTP
    const otp = generateOtp();

    // Store OTP in database
    await createOtpVerification(normalizedEmail, 'REGISTER', otp);

    // Send OTP via email
    try {
      await emailService.sendOtp(normalizedEmail, otp);
    } catch (error) {
      console.error('[auth.register] failed to send otp', {
        requestId,
        email: normalizedEmail,
        error,
      });
      return NextResponse.json(
        { success: false, error: 'Không thể gửi email. Vui lòng thử lại sau' },
        { status: 500 },
      );
    }

    console.info('[auth.register] otp issued', {
      requestId,
      email: normalizedEmail,
      registrationState,
    });

    return NextResponse.json({
      success: true,
      data: {
        message: 'OTP đã được gửi đến email của bạn',
        email: normalizedEmail,
        expiresIn: 300,
        pending: true,
      },
    });
  } catch (error) {
    console.error('[auth.register] unhandled error', {
      requestId,
      error,
    });
    return NextResponse.json(
      { success: false, error: 'Đã xảy ra lỗi. Vui lòng thử lại sau' },
      { status: 500 },
    );
  }
}
