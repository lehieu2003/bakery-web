export type RegistrationState = 'NEW' | 'PENDING' | 'VERIFIED';

type ExistingUser = {
  emailVerifiedAt: Date | null;
};

export function getRegistrationState(
  existingUser: ExistingUser | null,
): RegistrationState {
  if (!existingUser) {
    return 'NEW';
  }

  if (existingUser.emailVerifiedAt) {
    return 'VERIFIED';
  }

  return 'PENDING';
}

