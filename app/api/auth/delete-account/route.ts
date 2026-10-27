import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { OrderStatus } from '@prisma/client';
import { getCurrentUser, getCurrentUserFromRequest } from '@/lib/session';
import { hashPassword, verifyPassword } from '@/lib/password';
import { verifyOtp } from '@/lib/otp';
import { prisma } from '@/lib/prisma';

/**
 * Account deletion (Google Play / App Store requirement, Nghị định 13/2023).
 *
 * The user row is anonymized rather than removed: orders and reviews keep a
 * required link to it, and orders are retained for accounting. Everything
 * personal (name, phone, email, addresses, wishlist, cart, devices, points)
 * is erased and every session is revoked.
 */

/** Orders that still need the customer's contact details. */
export const OPEN_ORDER_STATUSES: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'READY',
];

type DeleteAccountUser = {
  id: string;
  email: string;
  role: 'ADMIN' | 'CUSTOMER';
};

type DeleteAccountDeps = {
  getCurrentUser: () => Promise<DeleteAccountUser | null>;
  getPasswordHash: (userId: string) => Promise<string | null>;
  verifyPassword: (password: string, hash: string) => Promise<boolean>;
  verifyDeleteOtp: (
    email: string,
    otp: string,
  ) => Promise<{ success: boolean; message: string }>;
  countOpenOrders: (userId: string) => Promise<number>;
  anonymizeUser: (userId: string) => Promise<void>;
};

/**
 * Confirmed with the OTP from POST /api/auth/delete-account/otp — the only
 * way for accounts created through Google sign-in, which have no password —
 * or, for app versions that predate it, with the account password.
 */
type DeleteAccountBody = { password?: unknown; otp?: unknown };

export function deletedUserEmail(userId: string) {
  // `.invalid` is reserved (RFC 2606): never deliverable, never collides.
  return `deleted-${userId}@deleted.invalid`;
}

/**
 * What is left of the user row. The Google link goes too: it identifies the
 * person, and a later Google sign-in must start a fresh account instead of
 * finding this deactivated one.
 */
export function anonymizedUserData(userId: string, unusablePassword: string) {
  return {
    email: deletedUserEmail(userId),
    password: unusablePassword,
    googleId: null,
    name: null,
    phone: null,
    points: 0,
    memberLevel: 'SILVER' as const,
    emailVerifiedAt: null,
    isActive: false,
  };
}

const defaultDeps: DeleteAccountDeps = {
  getCurrentUser,
  getPasswordHash: async (userId) => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });
    return user?.password ?? null;
  },
  verifyPassword,
  verifyDeleteOtp: (email, otp) => verifyOtp(email, 'DELETE_ACCOUNT', otp),
  countOpenOrders: (userId) =>
    prisma.order.count({
      where: { userId, status: { in: OPEN_ORDER_STATUSES } },
    }),
  anonymizeUser: async (userId) => {
    // Unusable password: random, never returned to anyone.
    const password = await hashPassword(crypto.randomBytes(32).toString('hex'));

    await prisma.$transaction([
      prisma.session.deleteMany({ where: { userId } }),
      prisma.address.deleteMany({ where: { userId } }),
      prisma.wishlist.deleteMany({ where: { userId } }),
      prisma.cart.deleteMany({ where: { userId } }),
      prisma.deviceToken.deleteMany({ where: { userId } }),
      prisma.user.update({
        where: { id: userId },
        data: anonymizedUserData(userId, password),
      }),
    ]);
  },
};

export async function handleDeleteAccountRequest(
  body: DeleteAccountBody,
  deps: DeleteAccountDeps = defaultDeps,
) {
  const user = await deps.getCurrentUser();
  if (!user) {
    return {
      status: 401,
      body: { success: false, error: 'Chưa đăng nhập' },
    };
  }

  // Deleting the shop owner's account would lock everyone out of admin.
  if (user.role === 'ADMIN') {
    return {
      status: 403,
      body: {
        success: false,
        error: 'Không thể xóa tài khoản quản trị viên',
      },
    };
  }

  const field = (name: 'password' | 'otp') =>
    typeof body === 'object' && body !== null && typeof body[name] === 'string'
      ? body[name]
      : '';
  const otp = field('otp');
  const password = field('password');

  if (otp) {
    const otpResult = await deps.verifyDeleteOtp(user.email, otp);
    if (!otpResult.success) {
      return {
        status: 400,
        body: { success: false, error: otpResult.message },
      };
    }
  } else if (password) {
    const hash = await deps.getPasswordHash(user.id);
    if (!hash || !(await deps.verifyPassword(password, hash))) {
      return {
        status: 400,
        body: { success: false, error: 'Mật khẩu không đúng' },
      };
    }
  } else {
    return {
      status: 400,
      body: { success: false, error: 'Vui lòng nhập mã xác nhận đã gửi đến email' },
    };
  }

  const openOrders = await deps.countOpenOrders(user.id);
  if (openOrders > 0) {
    return {
      status: 409,
      body: {
        success: false,
        error:
          'Bạn còn đơn hàng đang xử lý. Vui lòng chờ đơn hoàn tất hoặc hủy đơn trước khi xóa tài khoản.',
        data: { openOrders },
      },
    };
  }

  await deps.anonymizeUser(user.id);

  return {
    status: 200,
    body: { success: true, data: { deleted: true } },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as DeleteAccountBody;
    // Bearer first: the mobile app authenticates with a token, not a cookie.
    const result = await handleDeleteAccountRequest(body, {
      ...defaultDeps,
      getCurrentUser: () => getCurrentUserFromRequest(request),
    });
    const response = NextResponse.json(result.body, { status: result.status });
    if (result.status === 200) {
      // Sessions are already gone server-side; drop the browser cookie too.
      response.cookies.delete('bakery_session');
    }
    return response;
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json(
      { success: false, error: 'Đã có lỗi xảy ra' },
      { status: 500 },
    );
  }
}
