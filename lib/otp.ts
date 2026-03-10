import crypto from 'crypto';
import { prisma } from './prisma';
import { OtpPurpose } from '@prisma/client';

const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;

/**
 * Generate a random 6-digit OTP
 */
export function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Hash OTP using SHA-256
 */
export function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

/**
 * Verify if provided OTP matches the hash
 */
export function verifyOtpHash(otp: string, hash: string): boolean {
  return hashOtp(otp) === hash;
}

/**
 * Create and store OTP verification record
 */
export async function createOtpVerification(
  email: string,
  purpose: OtpPurpose,
  otp: string,
) {
  const otpHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Check if there's a recent OTP for this email/purpose
  const existing = await prisma.otpVerification.findFirst({
    where: {
      email,
      purpose,
      expiresAt: { gte: new Date() },
      usedAt: null,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (existing) {
    // Update the existing record
    return await prisma.otpVerification.update({
      where: { id: existing.id },
      data: {
        otpHash,
        expiresAt,
        attempts: 0, // Reset attempts on resend
      },
    });
  }

  // Create new record
  return await prisma.otpVerification.create({
    data: {
      email,
      purpose,
      otpHash,
      expiresAt,
    },
  });
}

/**
 * Verify OTP for an email and purpose
 */
export async function verifyOtp(
  email: string,
  purpose: OtpPurpose,
  otp: string,
): Promise<{
  success: boolean;
  message: string;
}> {
  // Find the most recent valid OTP record
  const record = await prisma.otpVerification.findFirst({
    where: {
      email,
      purpose,
      usedAt: null,
      expiresAt: { gte: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) {
    return {
      success: false,
      message: 'OTP không hợp lệ hoặc đã hết hạn',
    };
  }

  // Check if locked due to too many attempts
  if (record.attempts >= MAX_ATTEMPTS) {
    return {
      success: false,
      message: `Đã nhập sai quá nhiều lần. Vui lòng yêu cầu OTP mới`,
    };
  }

  // Check if OTP has expired
  if (record.expiresAt < new Date()) {
    return {
      success: false,
      message: 'OTP đã hết hạn. Vui lòng yêu cầu OTP mới',
    };
  }

  // Verify OTP hash
  const isValid = verifyOtpHash(otp, record.otpHash);

  if (!isValid) {
    // Increment attempts
    const newAttempts = record.attempts + 1;

    await prisma.otpVerification.update({
      where: { id: record.id },
      data: { attempts: newAttempts },
    });

    const attemptsRemaining = Math.max(0, MAX_ATTEMPTS - newAttempts);
    return {
      success: false,
      message:
        attemptsRemaining > 0
          ? `OTP không đúng. Còn ${attemptsRemaining} lần thử`
          : `Đã nhập sai quá nhiều lần. Vui lòng yêu cầu OTP mới`,
    };
  }

  // OTP is valid - mark as used
  await prisma.otpVerification.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return {
    success: true,
    message: 'Xác thực thành công',
  };
}

/**
 * Cleanup expired OTP records
 */
export async function cleanupExpiredOtps() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  await prisma.otpVerification.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() }, usedAt: { not: null } },
        { createdAt: { lt: oneDayAgo } },
      ],
    },
  });
}
