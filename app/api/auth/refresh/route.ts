import { NextRequest, NextResponse } from 'next/server';
import {
  createPrismaRotationDeps,
  rotateSession,
  type RotateSessionResult,
} from '@/lib/auth/session-rotation';
import { setSessionCookie, hashSessionToken } from '@/lib/session';

type SessionTokenSource = { token: string; source: 'cookie' | 'bearer' };

export type RefreshRouteDeps = {
  readSessionToken: (request: Request) => SessionTokenSource | null;
  rotateSession: (input: { token: string }) => Promise<RotateSessionResult>;
  setSessionCookie: (token: string) => Promise<void>;
  revokeSessionByToken: (token: string) => Promise<void>;
  clearSessionCookie: () => Promise<void>;
};

/**
 * Reads the session token for refresh: the Authorization Bearer header first
 * (mobile clients), then the httpOnly session cookie (web clients).
 */
export function readSessionTokenFromRequest(
  request: Request,
): SessionTokenSource | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) return { token: bearer, source: 'bearer' };
  }

  const cookie = request.headers.get('cookie');
  if (!cookie) return null;
  const match = cookie.match(/(?:^|;\s*)bakery_session=([^;]+)/);
  return match
    ? { token: decodeURIComponent(match[1]), source: 'cookie' }
    : null;
}

type HandlerResult = {
  status: number;
  body: {
    success: boolean;
    data?: { token: string; expiresAt: string };
    error?: string;
  };
};

export async function handleRefreshRequest(
  request: Request,
  deps: RefreshRouteDeps = defaultDeps,
): Promise<HandlerResult> {
  const sessionToken = deps.readSessionToken(request);

  if (!sessionToken) {
    return { status: 401, body: { success: false, error: 'Unauthorized' } };
  }

  const result = await deps.rotateSession({ token: sessionToken.token });

  if (result.status === 'replayed') {
    return {
      status: 401,
      body: {
        success: false,
        error: 'Phát hiện dùng lại token. Mọi phiên đăng nhập đã bị thu hồi.',
      },
    };
  }

  if (result.status !== 'rotated') {
    return { status: 401, body: { success: false, error: 'Unauthorized' } };
  }

  if (sessionToken.source === 'cookie') {
    await deps.setSessionCookie(result.token);
  }

  return {
    status: 200,
    body: {
      success: true,
      data: {
        token: result.token,
        expiresAt: result.expiresAt.toISOString(),
      },
    },
  };
}

const defaultDeps: RefreshRouteDeps = {
  readSessionToken: readSessionTokenFromRequest,
  rotateSession: (input) => rotateSession(input, createPrismaRotationDeps()),
  setSessionCookie,
  revokeSessionByToken: async (token) => {
    const { prisma } = await import('@/lib/prisma');
    await prisma.session.deleteMany({
      where: { token: hashSessionToken(token) },
    });
  },
  clearSessionCookie: async () => {
    const { deleteSession } = await import('@/lib/session');
    await deleteSession();
  },
};

export async function POST(request: NextRequest) {
  try {
    const result = await handleRefreshRequest(request, defaultDeps);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Refresh error:', error);
    return NextResponse.json(
      { success: false, error: 'Không làm mới được phiên đăng nhập' },
      { status: 500 },
    );
  }
}
