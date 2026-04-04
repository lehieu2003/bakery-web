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
