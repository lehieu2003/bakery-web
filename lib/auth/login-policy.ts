type LoginCandidate = {
  password: string | null;
  emailVerifiedAt: Date | null;
  isActive: boolean;
};

export function canAuthenticateWithPassword(user: LoginCandidate): boolean {
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
