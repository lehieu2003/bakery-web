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

/**
 * Register's success payload, identical for new, pending and already
 * verified emails so the response cannot be used to find accounts.
 */
export function registerOtpSentData(email: string) {
  return {
    message: 'Nếu email hợp lệ, OTP đã được gửi',
    email,
    expiresIn: 300,
    pending: true,
  };
}

const REGISTER_OTP_INVALID = 'OTP không hợp lệ hoặc đã hết hạn';

/**
 * Register verify only applies to a pending account. Unknown and already
 * verified emails get the same error a wrong OTP gets, so the endpoint does
 * not reveal account state before the OTP is checked.
 */
export function registerVerifyStateError(existingUser: ExistingUser | null): string | null {
  return getRegistrationState(existingUser) === 'PENDING' ? null : REGISTER_OTP_INVALID;
}

