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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    // Validate email
    if (!email) {
      return NextResponse.json({ error: 'Email là bắt buộc' }, { status: 400 });
    }

    const validation = validateEmail(email);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.message }, { status: 400 });
    }

    const normalizedEmail = validation.normalized!;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email đã được đăng ký' },
        { status: 400 },
      );
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
          error: emailRateLimitResult.message,
          retryAfter: emailRateLimitResult.retryAfter,
        },
        { status: 429 },
      );
    }

    // Cooldown check
    const cooldownResult = await checkCooldown(normalizedEmail);
    if (!cooldownResult.allowed) {
      return NextResponse.json(
        {
          error: cooldownResult.message,
          retryAfter: cooldownResult.retryAfter,
        },
        { status: 429 },
      );
    }

    // Generate OTP
    const otp = generateOtp();

    // Store OTP in database
    await createOtpVerification(normalizedEmail, 'REGISTER', otp);

    // Send OTP via email
    try {
      await emailService.sendOtp(normalizedEmail, otp);
    } catch (error) {
      console.error('Failed to send OTP email:', error);
      return NextResponse.json(
        { error: 'Không thể gửi email. Vui lòng thử lại sau' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: 'OTP đã được gửi đến email của bạn',
      email: normalizedEmail,
      expiresIn: 300, // 5 minutes
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi. Vui lòng thử lại sau' },
      { status: 500 },
    );
  }
}
