import { prisma } from './prisma';

/**
 * Rate limiter using database storage
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // Time window in milliseconds
}

// Rate limit configurations
export const RATE_LIMITS = {
  OTP_SEND_PER_IP: { maxRequests: 10, windowMs: 60 * 60 * 1000 }, // 10 per hour per IP
  OTP_SEND_PER_EMAIL: { maxRequests: 5, windowMs: 60 * 60 * 1000 }, // 5 per hour per email
  OTP_SEND_COOLDOWN: { maxRequests: 1, windowMs: 60 * 1000 }, // 1 per minute (cooldown)
  CHAT_PER_IP: { maxRequests: 10, windowMs: 5 * 60 * 1000 }, // 10 per 5 minutes per IP
  ORDERS_PER_IP: { maxRequests: 5, windowMs: 10 * 60 * 1000 }, // 5 per 10 minutes per IP
};

/**
 * Check rate limit using OTP verification table
 */
export async function checkRateLimit(
  identifier: string,
  type: string,
  config: RateLimitConfig,
): Promise<{ allowed: boolean; retryAfter?: number; message?: string }> {
  const windowStart = new Date(Date.now() - config.windowMs);

  // Count requests within the time window
  const count = await prisma.otpVerification.count({
    where: {
      email: identifier,
      createdAt: { gte: windowStart },
    },
  });

  if (count >= config.maxRequests) {
    // Find the oldest request in the window
    const oldestRequest = await prisma.otpVerification.findFirst({
      where: {
        email: identifier,
        createdAt: { gte: windowStart },
      },
      orderBy: { createdAt: 'asc' },
    });

    const retryAfter = oldestRequest
      ? Math.ceil(
          (oldestRequest.createdAt.getTime() + config.windowMs - Date.now()) /
            1000,
        )
      : Math.ceil(config.windowMs / 1000);

    return {
      allowed: false,
      retryAfter,
      message: `Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau ${Math.ceil(retryAfter / 60)} phút`,
    };
  }

  return { allowed: true };
}

/**
 * Check cooldown (last request time)
 */
export async function checkCooldown(
  email: string,
  cooldownSeconds: number = 60,
): Promise<{ allowed: boolean; retryAfter?: number; message?: string }> {
  const lastOtp = await prisma.otpVerification.findFirst({
    where: { email },
    orderBy: { createdAt: 'desc' },
  });

  if (lastOtp) {
    const timeSinceLastOtp = Date.now() - lastOtp.createdAt.getTime();
    const cooldownMs = cooldownSeconds * 1000;

    if (timeSinceLastOtp < cooldownMs) {
      const retryAfter = Math.ceil((cooldownMs - timeSinceLastOtp) / 1000);
      return {
        allowed: false,
        retryAfter,
        message: `Vui lòng đợi ${retryAfter} giây trước khi gửi lại OTP`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Validate email address
 */
export function validateEmail(email: string): {
  valid: boolean;
  normalized?: string;
  message?: string;
} {
  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return {
      valid: false,
      message: 'Địa chỉ email không hợp lệ',
    };
  }

  // Normalize email (lowercase)
  const normalized = email.toLowerCase().trim();

  return {
    valid: true,
    normalized,
  };
}

/**
 * Get client IP from request (works with proxies)
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return 'unknown';
}

// ============================================================================
// In-memory IP rate limiting (chat / order creation)
// ============================================================================
// Sliding window, synchronous, no external store. Per-instance by design:
// horizontal deployments need a shared store (Redis) — see the deferred
// limiter work. Deliberately never awaits, so it cannot wedge a request the
// way a failed external store can.

interface IpRateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const ipRateLimitStore = new Map<string, number[]>();
const MAX_TRACKED_IPS = 10_000;

export function checkIpRateLimit(
  ip: string,
  scope: string,
  config: IpRateLimitConfig,
  now: () => number = Date.now,
): { allowed: boolean; retryAfterSec: number } {
  const key = `${scope}:${ip}`;
  const current = now();
  const windowStart = current - config.windowMs;
  const recent = (ipRateLimitStore.get(key) ?? []).filter(
    (timestamp) => timestamp > windowStart,
  );

  if (recent.length >= config.maxRequests) {
    ipRateLimitStore.set(key, recent);
    return {
      allowed: false,
      retryAfterSec: Math.max(
        1,
        Math.ceil((recent[0] + config.windowMs - current) / 1000),
      ),
    };
  }

  recent.push(current);
  ipRateLimitStore.set(key, recent);

  if (ipRateLimitStore.size > MAX_TRACKED_IPS) {
    const oldestKey = ipRateLimitStore.keys().next().value;
    if (oldestKey !== undefined) {
      ipRateLimitStore.delete(oldestKey);
    }
  }

  return { allowed: true, retryAfterSec: 0 };
}

export function enforceIpRateLimit(
  request: Request,
  scope: string,
  config: IpRateLimitConfig,
  now: () => number = Date.now,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const ip = getClientIp(request);
  const result = checkIpRateLimit(ip, scope, config, now);
  return result.allowed
    ? { ok: true }
    : { ok: false, retryAfterSec: result.retryAfterSec };
}

/** Clears the in-memory limiter store — test isolation only. */
export function __resetIpRateLimitForTests() {
  ipRateLimitStore.clear();
}
