import { prisma } from './prisma';
import type { UserRole } from '@prisma/client';
import crypto from 'crypto';
import { cookies, headers } from 'next/headers';
import type { NextRequest } from 'next/server';
import {
  canUseAuthenticatedSession,
  isSessionExpired,
  isSessionUsable,
} from './auth/session-utils';
import { hashSessionToken } from './auth/session-hash';
import { hasPolicyAccess } from './authorization-policy';
import { isAdminSessionBound, type SessionBinding } from './auth/admin-device';

export { hashSessionToken };

const SESSION_COOKIE_NAME = 'bakery_session';
const SESSION_EXPIRY_DAYS = 30;
/**
 * The user a session carries: what `/api/auth/me` and the login responses
 * return. Keep profile fields here, or the app shows them empty and a later
 * profile save sends the blank back.
 */
export const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  memberLevel: true,
  points: true,
  emailVerifiedAt: true,
  isActive: true,
} as const;

/**
 * Generate a secure random token
 */
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create a new session for a user
 */
export async function createSession(
  userId: string,
  userAgent?: string,
  ipAddress?: string,
  /** Admin sessions: the trusted device they belong to, and a shorter life. */
  binding?: SessionBinding | null,
) {
  const token = generateSessionToken();
  const expiryDays = binding?.expiresInDays ?? SESSION_EXPIRY_DAYS;
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

  const session = await prisma.session.create({
    data: {
      userId,
      // Only the hash is persisted; `token` below stays the raw value.
      token: hashSessionToken(token),
      expiresAt,
      userAgent,
      ipAddress,
      platform: binding?.platform,
      deviceIdHash: binding?.deviceIdHash,
    },
    include: {
      user: { select: USER_SELECT },
    },
  });

  // Callers hand `session.token` to the client (cookie + JSON body), so the
  // returned object must carry the RAW token, never the stored hash.
  return { ...session, token };
}

/** The JSON body of a successful sign-in (web cookie + app Bearer token). */
export function signInSuccessBody(
  session: Awaited<ReturnType<typeof createSession>>,
  message: string,
) {
  return {
    success: true,
    data: {
      message,
      token: session.token,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        phone: session.user.phone,
        role: session.user.role,
        memberLevel: session.user.memberLevel,
        points: session.user.points,
      },
    },
  };
}

/**
 * Set session cookie
 */
export async function setSessionCookie(
  token: string,
  expiresInDays: number = SESSION_EXPIRY_DAYS,
) {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: expiresInDays * 24 * 60 * 60,
    path: '/',
  });
}

/**
 * Resolve which presented token identifies the session: Bearer first
 * (non-browser clients, e.g. the mobile app), then the session cookie.
 * Malformed/empty Bearer values fall back to the cookie rather than
 * authenticating.
 */
export function pickSessionToken(
  authorizationHeader: string | null | undefined,
  cookieToken: string | null | undefined,
): string | null {
  const raw = authorizationHeader ?? '';
  if (raw.startsWith('Bearer ')) {
    const token = raw.slice(7).trim();
    if (token) {
      return token;
    }
  }
  return cookieToken || null;
}

/**
 * Get session from cookie
 */
export async function getSession() {
  let authorizationHeader: string | null = null;
  try {
    const headerStore = await headers();
    authorizationHeader = headerStore.get('authorization');
  } catch {
    // headers() is unavailable outside a request scope (scripts, some RSC
    // contexts) — cookie-only fallback, the pre-Bearer behavior.
  }

  const cookieStore = await cookies();
  const token = pickSessionToken(
    authorizationHeader,
    cookieStore.get(SESSION_COOKIE_NAME)?.value,
  );
  if (!token) {
    return null;
  }

  return getSessionByToken(token);
}

async function getSessionByToken(token: string) {
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token: hashSessionToken(token) },
    include: {
      user: { select: USER_SELECT },
    },
  });

  if (!session) {
    return null;
  }

  // Single authentication decision: revoked (consumed by refresh rotation),
  // expired, or inactive/unverified users can never authenticate — nor an
  // admin session not bound to a trusted device (issued before device
  // trust, or forged around it).
  if (!isSessionUsable(session) || !isAdminSessionBound(session)) {
    // Expired sessions are garbage-collected; revoked sessions are kept so
    // a later replay can still be detected (revoke-all defense).
    if (!session.revokedAt && isSessionExpired(session.expiresAt)) {
      await prisma.session.delete({ where: { id: session.id } });
    }
    return null;
  }

  return session;
}

/**
 * Get current user from session
 */
export async function getCurrentUser() {
  const session = await getSession();
  return session?.user || null;
}

/**
 * Get current user from Authorization Bearer token first, then fallback to cookie session.
 * Useful for non-browser clients (e.g. mobile apps) that cannot rely on httpOnly cookies.
 */
export async function getCurrentUserFromRequest(request: NextRequest) {
  const authHeader =
    request.headers.get('authorization') ??
    request.headers.get('Authorization');
  const bearerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : '';

  if (bearerToken) {
    const session = await getSessionByToken(bearerToken);
    if (session?.user) {
      return session.user;
    }
  }

  return getCurrentUser();
}

/**
 * Require authentication (throw if not authenticated)
 */
export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
}

/**
 * Require admin role
 */
export async function requireAdmin() {
  return assertAdminAccess(await requireAuth());
}

/**
 * The admin guard decision, extracted for direct testing: every
 * /api/admin/* route is protected by exactly this check.
 */
export function assertAdminAccess<T extends { role: UserRole }>(user: T): T {
  if (!user) {
    throw new Error('Unauthorized');
  }

  if (!hasPolicyAccess(user.role, 'ADMIN_ONLY')) {
    throw new Error('Forbidden: Admin access required');
  }

  return user;
}

/**
 * Delete session (logout)
 */
export async function deleteSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await prisma.session.deleteMany({
      where: { token: hashSessionToken(token) },
    });
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Delete all sessions for a user
 */
export async function deleteAllUserSessions(userId: string) {
  await prisma.session.deleteMany({ where: { userId } });
}

/**
 * Cleanup expired sessions
 */
export async function cleanupExpiredSessions() {
  await prisma.session.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
}

