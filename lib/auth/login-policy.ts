type LoginCandidate = {
  password: string | null;
  emailVerifiedAt: Date | null;
  isActive: boolean;
};

export function canAuthenticateWithPassword<T extends LoginCandidate>(
  user: T,
): user is T & { password: string } {
  if (!user.password) {
    return false;
  }

  if (!user.isActive) {
    return false;
  }

  if (!user.emailVerifiedAt) {
    return false;
  }

  return true;
}
