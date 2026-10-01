import { prisma } from './prisma';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { canUseAuthenticatedSession, isSessionExpired } from './auth/session-utils';
import { hasPolicyAccess } from './authorization-policy';

const SESSION_COOKIE_NAME = 'bakery_session';
const SESSION_EXPIRY_DAYS = 30;
const USER_SELECT = {
  id: true,
  email: true,
  name: true,
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
) {
  const token = generateSessionToken();
  const expiresAt = new Date(
    Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  );

  const session = await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
      userAgent,
      ipAddress,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          memberLevel: true,
          points: true,
          emailVerifiedAt: true,
          isActive: true,
        },
      },
    },
  });

  return session;
}

/**
 * Set session cookie
 */
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60,
    path: '/',
  });
}

/**
 * Get session from cookie
 */
export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return getSessionByToken(token);
}

async function getSessionByToken(token: string) {
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: { select: USER_SELECT },
    },
  });

  if (!session) {
    return null;
  }

  // A revoked session (consumed by refresh rotation) can never authenticate.
  if (session.revokedAt) {
    return null;
  }

  // Check if session has expired
  if (isSessionExpired(session.expiresAt)) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  if (!canUseAuthenticatedSession(session.user)) {
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
  const user = await requireAuth();

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
    await prisma.session.deleteMany({ where: { token } });
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

