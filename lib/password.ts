import crypto from 'crypto';

/**
 * Hash password using PBKDF2
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Generate salt
    const salt = crypto.randomBytes(16).toString('hex');

    // Hash password with salt using PBKDF2
    crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
      if (err) reject(err);
      resolve(salt + ':' + derivedKey.toString('hex'));
    });
  });
}

/**
 * Verify password against hash
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(':');

    crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
      if (err) reject(err);
      resolve(key === derivedKey.toString('hex'));
    });
  });
}

export const MIN_PASSWORD_LENGTH = 8;

/**
 * Validate password strength — the one policy for registration and reset.
 */
export function validatePassword(password: string): {
  valid: boolean;
  message?: string;
} {
  if (!password) {
    return { valid: false, message: 'Mật khẩu không được để trống' };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      message: `Mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự`,
    };
  }

  if (password.length > 100) {
    return {
      valid: false,
      message: 'Mật khẩu không được quá 100 ký tự',
    };
  }

  // Optional: Check for common weak passwords
  const weakPasswords = ['123456', 'password', '123456789', '12345678'];
  if (weakPasswords.includes(password.toLowerCase())) {
    return {
      valid: false,
      message: 'Mật khẩu quá yếu. Vui lòng chọn mật khẩu khác',
    };
  }

  return { valid: true };
}
