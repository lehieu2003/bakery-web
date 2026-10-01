type SessionUser = {
  emailVerifiedAt: Date | null;
  isActive: boolean;
};

export function canUseAuthenticatedSession(user: SessionUser): boolean {
  if (!user.isActive) {
    return false;
  }

  if (!user.emailVerifiedAt) {
    return false;
  }

  return true;
}

export function isSessionExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt < now;
}

type SessionLike = {
  revokedAt: Date | null;
  expiresAt: Date;
  user: { isActive: boolean; emailVerifiedAt: Date | null };
};

/**
 * The single authentication decision for a session row: revoked sessions
 * (consumed by refresh rotation) can never authenticate, nor can expired
 * sessions or users that are inactive / unverified.
 */
export function isSessionUsable(
  session: SessionLike,
  now: Date = new Date(),
): boolean {
  if (session.revokedAt !== null) return false;
  if (isSessionExpired(session.expiresAt, now)) return false;
  return canUseAuthenticatedSession(session.user);
}
