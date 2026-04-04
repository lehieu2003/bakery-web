export const RESET_PASSWORD_EXPIRES_IN_SECONDS = 300;

const RESET_PASSWORD_GENERIC_MESSAGE = 'Nếu email tồn tại, OTP đã được gửi';
const RESET_PASSWORD_VERIFY_SUCCESS_MESSAGE =
  'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại';
const RESET_PASSWORD_VERIFY_INVALID_REQUEST_MESSAGE =
  'Yêu cầu đặt lại mật khẩu không hợp lệ';

type ResetPasswordTransactionClient = {
  user: {
    update: (args: {
      where: { id: string };
      data: { password: string };
    }) => Promise<unknown>;
  };
  session: {
    deleteMany: (args: { where: { userId: string } }) => Promise<unknown>;
  };
};

type ResetPasswordPrismaClient = {
  $transaction: <T>(
    callback: (tx: ResetPasswordTransactionClient) => Promise<T>,
  ) => Promise<T>;
};

export function buildResetPasswordRequestSuccessData(email: string) {
  return {
    message: RESET_PASSWORD_GENERIC_MESSAGE,
    email: email.trim().toLowerCase(),
    expiresIn: RESET_PASSWORD_EXPIRES_IN_SECONDS,
  };
}

export function buildResetPasswordVerifySuccessData() {
  return {
    message: RESET_PASSWORD_VERIFY_SUCCESS_MESSAGE,
  };
}

export function sanitizeResetPasswordVerifyError(error: string) {
  const normalized = error.toLowerCase();
  if (normalized.includes('không tồn tại') || normalized.includes('does not exist')) {
    return RESET_PASSWORD_VERIFY_INVALID_REQUEST_MESSAGE;
  }

  return error;
}

export async function applyPasswordReset(
  prismaClient: ResetPasswordPrismaClient,
  userId: string,
  passwordHash: string,
) {
  await prismaClient.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { password: passwordHash },
    });

    await tx.session.deleteMany({
      where: { userId },
    });
  });
}
