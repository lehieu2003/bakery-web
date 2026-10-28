import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';

type MeRouteDeps = {
  getCurrentUser: typeof getCurrentUser;
  updateUserProfile: (args: {
    userId: string;
    data: { name?: string | null; phone?: string | null };
  }) => Promise<{
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    role: 'ADMIN' | 'CUSTOMER';
    memberLevel: 'SILVER' | 'GOLD' | 'PLATINUM';
    points: number;
    emailVerifiedAt: Date | null;
    isActive: boolean;
  }>;
};

type UpdateProfileBody = {
  name?: unknown;
  phone?: unknown;
};

const defaultDeps: MeRouteDeps = {
  getCurrentUser,
  updateUserProfile: async ({ userId, data }) =>
    prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        memberLevel: true,
        points: true,
        emailVerifiedAt: true,
        isActive: true,
      },
    }),
};

function normalizeName(input: unknown) {
  if (input === undefined) return { ok: true as const, value: undefined };
  if (typeof input !== 'string') {
    return { ok: false as const, error: 'Tên không hợp lệ' };
  }

  const trimmed = input.trim();
  if (!trimmed) return { ok: true as const, value: null };
  if (trimmed.length < 2 || trimmed.length > 100) {
    return { ok: false as const, error: 'Tên phải từ 2 đến 100 ký tự' };
  }

  return { ok: true as const, value: trimmed };
}

function normalizePhone(input: unknown) {
  if (input === undefined) return { ok: true as const, value: undefined };
  if (typeof input !== 'string') {
    return { ok: false as const, error: 'Số điện thoại không hợp lệ' };
  }

  const trimmed = input.trim();
  if (!trimmed) return { ok: true as const, value: null };

  const phoneRegex = /^[0-9+\-\s]{8,20}$/;
  if (!phoneRegex.test(trimmed)) {
    return { ok: false as const, error: 'Số điện thoại không hợp lệ' };
  }

  return { ok: true as const, value: trimmed };
}

function toUserResponse(user: {
  id: string;
  email: string;
  name: string | null;
  phone?: string | null;
  role: 'ADMIN' | 'CUSTOMER';
  memberLevel?: 'SILVER' | 'GOLD' | 'PLATINUM';
  points?: number;
  emailVerifiedAt: Date | null;
  isActive?: boolean;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone ?? null,
    role: user.role,
    memberLevel: user.memberLevel,
    points: user.points,
    emailVerifiedAt: user.emailVerifiedAt,
    isActive: user.isActive ?? true,
  };
}

export async function handleGetCurrentUserRequest(deps: MeRouteDeps = defaultDeps) {
  const user = await deps.getCurrentUser();

  if (!user) {
    return {
      status: 401,
      body: { success: false, error: 'Chưa đăng nhập' },
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      data: {
        user: toUserResponse(user),
      },
    },
  };
}

export async function handleUpdateProfileRequest(
  body: UpdateProfileBody,
  deps: MeRouteDeps = defaultDeps,
) {
  if (
    typeof body !== 'object' ||
    body === null ||
    Array.isArray(body)
  ) {
    return {
      status: 400,
      body: { success: false, error: 'Payload không hợp lệ' },
    };
  }

  const user = await deps.getCurrentUser();

  if (!user) {
    return {
      status: 401,
      body: { success: false, error: 'Chưa đăng nhập' },
    };
  }

  const normalizedName = normalizeName(body.name);
  if (!normalizedName.ok) {
    return {
      status: 400,
      body: { success: false, error: normalizedName.error },
    };
  }

  const normalizedPhone = normalizePhone(body.phone);
  if (!normalizedPhone.ok) {
    return {
      status: 400,
      body: { success: false, error: normalizedPhone.error },
    };
  }

  if (normalizedName.value === undefined && normalizedPhone.value === undefined) {
    return {
      status: 400,
      body: { success: false, error: 'Không có dữ liệu cần cập nhật' },
    };
  }

  const updatedUser = await deps.updateUserProfile({
    userId: user.id,
    data: {
      ...(normalizedName.value !== undefined ? { name: normalizedName.value } : {}),
      ...(normalizedPhone.value !== undefined
        ? { phone: normalizedPhone.value }
        : {}),
    },
  });

  return {
    status: 200,
    body: {
      success: true,
      data: {
        user: toUserResponse(updatedUser),
      },
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const result = await handleGetCurrentUserRequest();
    const response = NextResponse.json(result.body, { status: result.status });
    // A session cookie that no longer signs in (expired, revoked by a sign-in
    // on another device) goes, so the cookie-only proxy stops treating the
    // browser as signed in.
    if (result.status === 401 && request.cookies.get('bakery_session')) {
      response.cookies.delete('bakery_session');
    }
    return response;
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      { success: false, error: 'Đã có lỗi xảy ra' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as UpdateProfileBody;
    const result = await handleUpdateProfileRequest(body);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { success: false, error: 'Đã có lỗi xảy ra' },
      { status: 500 },
    );
  }
}
