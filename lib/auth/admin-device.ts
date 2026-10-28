import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { emailService } from '@/lib/email';
import { generateOtp, hashOtp } from '@/lib/otp';

/**
 * Admin accounts sign in from one trusted device per platform: one browser
 * and one phone. Another device has to confirm with a code emailed to the
 * admin, and then replaces the old device, whose sessions are revoked.
 * Customers are not affected.
 */

export type ClientPlatform = 'web' | 'mobile';

/** Browser device id: httpOnly, minted on the first sign-in attempt. */
export const DEVICE_COOKIE = 'bakery_device';
/** The app sends its device id (kept in secure storage) and platform. */
export const DEVICE_ID_HEADER = 'x-device-id';
export const CLIENT_PLATFORM_HEADER = 'x-client-platform';

const DEVICE_ID_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
const DEVICE_COOKIE_MAX_AGE_SEC = 400 * 24 * 60 * 60;

/** Admin sessions are shorter than customers' 30 days on the web. */
export const ADMIN_SESSION_DAYS: Record<ClientPlatform, number> = {
  web: 7,
  mobile: 30,
};
export const LOGIN_CHALLENGE_TTL_MINUTES = 10;
export const LOGIN_CHALLENGE_MAX_ATTEMPTS = 5;
/**
 * New-device codes per account per window. A correct password resets the
 * per-IP login limit, so without this whoever holds the password could
 * mail-bomb the admin and collect unlimited guesses.
 */
export const LOGIN_CHALLENGES_PER_WINDOW = 5;
export const LOGIN_CHALLENGE_WINDOW_MINUTES = 15;

export function hashDeviceId(deviceId: string): string {
  return crypto.createHash('sha256').update(deviceId).digest('hex');
}

export type ClientDevice = {
  platform: ClientPlatform;
  /** Null for an app build too old to send one: never trusted. */
  deviceId: string | null;
  /** A browser device id minted for this request; set it as a cookie. */
  mintedCookie: string | null;
};

type RequestLike = {
  headers: { get(name: string): string | null };
  cookies: { get(name: string): { value: string } | undefined };
};

/** The app's device, from its headers (app-only endpoints). */
export function resolveAppDevice(headers: RequestLike['headers']): ClientDevice {
  const header = headers.get(DEVICE_ID_HEADER)?.trim() ?? '';
  return {
    platform: 'mobile',
    deviceId: DEVICE_ID_PATTERN.test(header) ? header : null,
    mintedCookie: null,
  };
}

/** Which client is signing in, and its device id. */
export function resolveClientDevice(request: RequestLike): ClientDevice {
  const declared = request.headers.get(CLIENT_PLATFORM_HEADER)?.trim();
  const userAgent = request.headers.get('user-agent') ?? '';
  // The app's HTTP client identifies as "Dart/…"; builds before device ids
  // send no platform header but are still the app, not a browser.
  if (declared === 'mobile' || userAgent.startsWith('Dart/')) {
    return resolveAppDevice(request.headers);
  }

  const cookie = request.cookies.get(DEVICE_COOKIE)?.value ?? '';
  if (DEVICE_ID_PATTERN.test(cookie)) {
    return { platform: 'web', deviceId: cookie, mintedCookie: null };
  }
  const minted = crypto.randomBytes(24).toString('base64url');
  return { platform: 'web', deviceId: minted, mintedCookie: minted };
}

export const DEVICE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: DEVICE_COOKIE_MAX_AGE_SEC,
  path: '/',
};

/** "a***n@gmail.com", so the screen says where the code went. */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const head = local[0];
  const tail = local.length > 2 ? local[local.length - 1] : '';
  return `${head}***${tail}@${domain}`;
}

/** Short device description for emails and the device list. */
export function describeDevice(platform: ClientPlatform, userAgent?: string | null) {
  const ua = userAgent ?? '';
  if (platform === 'mobile') return 'Ứng dụng điện thoại';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Chrome\//.test(ua)
      ? 'Chrome'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Safari\//.test(ua)
          ? 'Safari'
          : 'Trình duyệt';
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /Mac OS X/.test(ua) && !/Mobile/.test(ua)
      ? 'macOS'
      : /Android/.test(ua)
        ? 'Android'
        : /iPhone|iPad/.test(ua)
          ? 'iOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : null;
  return os ? `${browser} trên ${os}` : browser;
}

export type SessionBinding = {
  platform: ClientPlatform;
  deviceIdHash: string;
  expiresInDays: number;
};

type SignInUser = { id: string; email: string; role: string };

export type SignInContext = {
  user: SignInUser;
  device: ClientDevice;
  userAgent?: string;
  ipAddress?: string;
};

export type AdminDeviceDeps = {
  now: () => Date;
  findTrustedDevice: (
    userId: string,
    platform: ClientPlatform,
  ) => Promise<{ deviceIdHash: string } | null>;
  countRecentChallenges: (userId: string, since: Date) => Promise<number>;
  createChallenge: (data: {
    userId: string;
    platform: ClientPlatform;
    deviceIdHash: string;
    otpHash: string;
    userAgent?: string;
    ipAddress?: string;
    expiresAt: Date;
  }) => Promise<{ id: string }>;
  sendChallengeEmail: (args: {
    to: string;
    code: string;
    device: string;
    ipAddress?: string;
    at: Date;
  }) => Promise<boolean>;
  /** Revokes the user's live sessions on [platform] (and unbound ones). */
  revokePlatformSessions: (userId: string, platform: ClientPlatform) => Promise<void>;
  touchTrustedDevice: (
    userId: string,
    platform: ClientPlatform,
    lastIp?: string,
  ) => Promise<void>;
};

export type SignInDecision =
  | { kind: 'session'; binding: SessionBinding | null }
  | {
      kind: 'challenge';
      challengeId: string;
      maskedEmail: string;
      expiresAt: Date;
    }
  /** An app build without device ids cannot complete an admin sign-in. */
  | { kind: 'update_app' }
  | { kind: 'rate_limited' };

/**
 * Whether this sign-in (password already checked) gets a session now, or
 * needs the emailed code first. A trusted admin sign-in replaces the other
 * sessions on the same platform: one browser, one phone.
 */
export async function decideSignIn(
  ctx: SignInContext,
  deps: AdminDeviceDeps = prismaAdminDeviceDeps,
): Promise<SignInDecision> {
  if (ctx.user.role !== 'ADMIN') return { kind: 'session', binding: null };

  const { platform, deviceId } = ctx.device;
  if (!deviceId) return { kind: 'update_app' };
  const deviceIdHash = hashDeviceId(deviceId);

  const trusted = await deps.findTrustedDevice(ctx.user.id, platform);
  if (trusted && trusted.deviceIdHash === deviceIdHash) {
    await deps.revokePlatformSessions(ctx.user.id, platform);
    await deps.touchTrustedDevice(ctx.user.id, platform, ctx.ipAddress);
    return {
      kind: 'session',
      binding: {
        platform,
        deviceIdHash,
        expiresInDays: ADMIN_SESSION_DAYS[platform],
      },
    };
  }

  const now = deps.now();
  const windowStart = new Date(
    now.getTime() - LOGIN_CHALLENGE_WINDOW_MINUTES * 60 * 1000,
  );
  const recent = await deps.countRecentChallenges(ctx.user.id, windowStart);
  if (recent >= LOGIN_CHALLENGES_PER_WINDOW) return { kind: 'rate_limited' };

  const code = generateOtp();
  const expiresAt = new Date(
    now.getTime() + LOGIN_CHALLENGE_TTL_MINUTES * 60 * 1000,
  );
  const challenge = await deps.createChallenge({
    userId: ctx.user.id,
    platform,
    deviceIdHash,
    otpHash: hashOtp(code),
    userAgent: ctx.userAgent,
    ipAddress: ctx.ipAddress,
    expiresAt,
  });
  await deps.sendChallengeEmail({
    to: ctx.user.email,
    code,
    device: describeDevice(platform, ctx.userAgent),
    ipAddress: ctx.ipAddress,
    at: now,
  });
  return {
    kind: 'challenge',
    challengeId: challenge.id,
    maskedEmail: maskEmail(ctx.user.email),
    expiresAt,
  };
}

export type VerifyDeps = {
  now: () => Date;
  findChallenge: (id: string) => Promise<{
    id: string;
    userId: string;
    platform: string;
    deviceIdHash: string;
    otpHash: string;
    attempts: number;
    expiresAt: Date;
    usedAt: Date | null;
    userAgent: string | null;
    user: SignInUser & { isActive: boolean; emailVerifiedAt: Date | null };
  } | null>;
  recordFailedAttempt: (id: string) => Promise<void>;
  /**
   * Marks the challenge used, makes its device the trusted one for the
   * platform and revokes the platform's other sessions — atomically.
   * False when the challenge was already used (a concurrent verify won).
   */
  trustDevice: (args: {
    challengeId: string;
    userId: string;
    platform: ClientPlatform;
    deviceIdHash: string;
    label: string;
    lastIp?: string;
    at: Date;
  }) => Promise<boolean>;
  sendNewDeviceAlert: (args: {
    to: string;
    device: string;
    ipAddress?: string;
    at: Date;
  }) => Promise<boolean>;
};

export type VerifyResult =
  | { ok: true; user: SignInUser; binding: SessionBinding }
  | { ok: false; status: 400 | 410 | 429; error: string };

const INVALID_CODE = 'Mã xác minh không đúng hoặc đã hết hạn';

/**
 * Completes an admin sign-in from a new device with the emailed code. The
 * request must come from the same device that started it.
 */
export async function verifySignInChallenge(
  input: { challengeId: string; code: string; device: ClientDevice; ipAddress?: string },
  deps: VerifyDeps = prismaVerifyDeps,
): Promise<VerifyResult> {
  const challenge = await deps.findChallenge(input.challengeId);
  const now = deps.now();
  if (!challenge || challenge.usedAt || challenge.expiresAt < now) {
    return { ok: false, status: 410, error: INVALID_CODE };
  }
  if (challenge.attempts >= LOGIN_CHALLENGE_MAX_ATTEMPTS) {
    return {
      ok: false,
      status: 429,
      error: 'Nhập sai quá nhiều lần. Vui lòng đăng nhập lại để nhận mã mới.',
    };
  }
  const deviceId = input.device.deviceId;
  if (
    !deviceId ||
    input.device.platform !== challenge.platform ||
    hashDeviceId(deviceId) !== challenge.deviceIdHash
  ) {
    // Another device is trying to use this code.
    await deps.recordFailedAttempt(challenge.id);
    return { ok: false, status: 400, error: INVALID_CODE };
  }
  if (!/^\d{6}$/.test(input.code) || hashOtp(input.code) !== challenge.otpHash) {
    await deps.recordFailedAttempt(challenge.id);
    return { ok: false, status: 400, error: INVALID_CODE };
  }
  if (!challenge.user.isActive || !challenge.user.emailVerifiedAt) {
    return { ok: false, status: 400, error: INVALID_CODE };
  }

  const platform = challenge.platform as ClientPlatform;
  const device = describeDevice(platform, challenge.userAgent);
  const trusted = await deps.trustDevice({
    challengeId: challenge.id,
    userId: challenge.userId,
    platform,
    deviceIdHash: challenge.deviceIdHash,
    label: device,
    lastIp: input.ipAddress,
    at: now,
  });
  if (!trusted) return { ok: false, status: 410, error: INVALID_CODE };

  await deps.sendNewDeviceAlert({
    to: challenge.user.email,
    device,
    ipAddress: input.ipAddress,
    at: now,
  });

  return {
    ok: true,
    user: challenge.user,
    binding: {
      platform,
      deviceIdHash: challenge.deviceIdHash,
      expiresInDays: ADMIN_SESSION_DAYS[platform],
    },
  };
}

/** Admin sessions are valid only when bound to a device. */
export function isAdminSessionBound(session: {
  platform: string | null;
  deviceIdHash: string | null;
  user: { role: string };
}): boolean {
  if (session.user.role !== 'ADMIN') return true;
  return !!session.platform && !!session.deviceIdHash;
}

// --- Prisma + email wiring -------------------------------------------------

function formatTime(at: Date) {
  return at.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const revokePlatformSessions = async (userId: string, platform: ClientPlatform) => {
  await prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
      OR: [{ platform }, { platform: null }],
    },
    data: { revokedAt: new Date() },
  });
};

export const prismaAdminDeviceDeps: AdminDeviceDeps = {
  now: () => new Date(),
  findTrustedDevice: (userId, platform) =>
    prisma.trustedDevice.findUnique({
      where: { userId_platform: { userId, platform } },
      select: { deviceIdHash: true },
    }),
  countRecentChallenges: (userId, since) =>
    prisma.loginChallenge.count({ where: { userId, createdAt: { gte: since } } }),
  createChallenge: (data) =>
    prisma.loginChallenge.create({ data, select: { id: true } }),
  sendChallengeEmail: ({ to, code, device, ipAddress, at }) =>
    emailService.send(
      to,
      `Mã xác minh đăng nhập quản trị: ${code}`,
      `<p>Có yêu cầu đăng nhập tài khoản quản trị Phương Loan Bakery từ một thiết bị mới.</p>
       <p><strong>Thiết bị:</strong> ${escapeHtml(device)}<br/>
       <strong>IP:</strong> ${escapeHtml(ipAddress ?? 'không rõ')}<br/>
       <strong>Lúc:</strong> ${escapeHtml(formatTime(at))}</p>
       <p>Mã xác minh: <strong style="font-size:20px;letter-spacing:4px">${code}</strong>
       (hết hạn sau ${LOGIN_CHALLENGE_TTL_MINUTES} phút).</p>
       <p>Nếu không phải bạn, <strong>đừng đưa mã này cho ai</strong> và đổi mật khẩu ngay.</p>`,
    ),
  revokePlatformSessions,
  touchTrustedDevice: async (userId, platform, lastIp) => {
    await prisma.trustedDevice.update({
      where: { userId_platform: { userId, platform } },
      data: { lastUsedAt: new Date(), lastIp },
    });
  },
};

export const prismaVerifyDeps: VerifyDeps = {
  now: () => new Date(),
  findChallenge: (id) =>
    prisma.loginChallenge.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        platform: true,
        deviceIdHash: true,
        otpHash: true,
        attempts: true,
        expiresAt: true,
        usedAt: true,
        userAgent: true,
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
            emailVerifiedAt: true,
          },
        },
      },
    }),
  recordFailedAttempt: async (id) => {
    await prisma.loginChallenge.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });
  },
  trustDevice: ({ challengeId, userId, platform, deviceIdHash, label, lastIp, at }) =>
    prisma.$transaction(async (tx) => {
      const used = await tx.loginChallenge.updateMany({
        where: { id: challengeId, usedAt: null },
        data: { usedAt: at },
      });
      if (used.count === 0) return false;
      await tx.trustedDevice.upsert({
        where: { userId_platform: { userId, platform } },
        create: { userId, platform, deviceIdHash, label, lastIp, lastUsedAt: at },
        update: { deviceIdHash, label, lastIp, lastUsedAt: at, createdAt: at },
      });
      await tx.session.updateMany({
        where: {
          userId,
          revokedAt: null,
          OR: [{ platform }, { platform: null }],
        },
        data: { revokedAt: at },
      });
      return true;
    }),
  sendNewDeviceAlert: ({ to, device, ipAddress, at }) =>
    emailService.send(
      to,
      'Thiết bị mới đã đăng nhập tài khoản quản trị',
      `<p>Tài khoản quản trị Phương Loan Bakery vừa được xác minh trên một thiết bị mới.
       Thiết bị cũ cùng loại đã bị đăng xuất.</p>
       <p><strong>Thiết bị:</strong> ${escapeHtml(device)}<br/>
       <strong>IP:</strong> ${escapeHtml(ipAddress ?? 'không rõ')}<br/>
       <strong>Lúc:</strong> ${escapeHtml(formatTime(at))}</p>
       <p>Nếu không phải bạn, hãy đổi mật khẩu và mật khẩu email ngay.</p>`,
    ),
};

// --- Route helpers ---------------------------------------------------------

/**
 * The response for a sign-in that gets no session yet: the code step, an
 * app too old for it, or too many codes. Null when a session is issued.
 */
export function pendingSignInResponse(decision: SignInDecision): {
  status: number;
  body: Record<string, unknown>;
} | null {
  switch (decision.kind) {
    case 'session':
      return null;
    case 'challenge':
      return {
        status: 202,
        body: {
          success: true,
          data: {
            requiresVerification: true,
            challengeId: decision.challengeId,
            email: decision.maskedEmail,
            expiresAt: decision.expiresAt.toISOString(),
          },
        },
      };
    case 'update_app':
      return {
        status: 403,
        body: {
          success: false,
          error:
            'Vui lòng cập nhật ứng dụng lên bản mới nhất để đăng nhập tài khoản quản trị.',
        },
      };
    case 'rate_limited':
      return {
        status: 429,
        body: {
          success: false,
          error: 'Đã gửi quá nhiều mã xác minh. Vui lòng thử lại sau 15 phút.',
        },
      };
  }
}

/** Keeps a newly minted browser device id. */
export function setDeviceCookie(
  response: { cookies: { set: (name: string, value: string, options: typeof DEVICE_COOKIE_OPTIONS) => unknown } },
  device: ClientDevice,
) {
  if (device.mintedCookie) {
    response.cookies.set(DEVICE_COOKIE, device.mintedCookie, DEVICE_COOKIE_OPTIONS);
  }
}
