import { NextRequest, NextResponse } from 'next/server';
import { deleteSession } from '@/lib/session';
import { readSessionTokenFromRequest } from '@/app/api/auth/refresh/route';
import { prisma } from '@/lib/prisma';

type LogoutRouteDeps = {
  readPresentedToken: (
    request: Request,
  ) => { token: string; source: 'cookie' | 'bearer' } | null;
  deleteServerSession: () => Promise<void>;
  revokeSessionByToken: (token: string) => Promise<void>;
  clearSessionCookie: () => Promise<void>;
};

const defaultDeps: LogoutRouteDeps = {
  readPresentedToken: readSessionTokenFromRequest,
  deleteServerSession: deleteSession,
  revokeSessionByToken: async (token) => {
    await prisma.session.deleteMany({ where: { token } });
  },
  clearSessionCookie: async () => {
    await deleteSession();
  },
};

export async function handleLogoutRequest(
  request: Request,
  deps: LogoutRouteDeps = defaultDeps,
): Promise<{ status: number; body: { success: boolean; data?: unknown; error?: string } }> {
  // Rule 3: logout revokes the token on BOTH sides — the presented token is
  // killed server-side (cookie session via deleteSession, Bearer token via
  // explicit revoke) and the client cookie is cleared.
  const presented = deps.readPresentedToken(request);

  await deps.deleteServerSession();
  if (presented?.source === 'bearer') {
    await deps.revokeSessionByToken(presented.token);
  } else {
    await deps.clearSessionCookie();
  }

  return {
    status: 200,
    body: { success: true, data: { message: 'Đăng xuất thành công' } },
  };
}

export async function POST(request: NextRequest) {
  try {
    const result = await handleLogoutRequest(request);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Đã có lỗi xảy ra' },
      { status: 500 },
    );
  }
}
