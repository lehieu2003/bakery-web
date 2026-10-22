import crypto from 'crypto';
import { NextResponse } from 'next/server';
import type { OrderStatus } from '@prisma/client';
import { getCurrentUser } from '@/lib/session';
import { hashPassword, verifyPassword } from '@/lib/password';
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
  role: 'ADMIN' | 'CUSTOMER';
};

type DeleteAccountDeps = {
  getCurrentUser: () => Promise<DeleteAccountUser | null>;
  getPasswordHash: (userId: string) => Promise<string | null>;
  verifyPassword: (password: string, hash: string) => Promise<boolean>;
  countOpenOrders: (userId: string) => Promise<number>;
  anonymizeUser: (userId: string) => Promise<void>;
};

type DeleteAccountBody = { password?: unknown };

export function deletedUserEmail(userId: string) {
  // `.invalid` is reserved (RFC 2606): never deliverable, never collides.
  return `deleted-${userId}@deleted.invalid`;
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
        data: {
          email: deletedUserEmail(userId),
          password,
          name: null,
          phone: null,
          points: 0,
          memberLevel: 'SILVER',
          emailVerifiedAt: null,
          isActive: false,
        },
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

  const password =
    typeof body === 'object' && body !== null && typeof body.password === 'string'
      ? body.password
      : '';
  if (!password) {
    return {
      status: 400,
      body: { success: false, error: 'Vui lòng nhập mật khẩu để xác nhận' },
    };
  }

  const hash = await deps.getPasswordHash(user.id);
  if (!hash || !(await deps.verifyPassword(password, hash))) {
    return {
      status: 400,
      body: { success: false, error: 'Mật khẩu không đúng' },
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

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as DeleteAccountBody;
    const result = await handleDeleteAccountRequest(body);
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
