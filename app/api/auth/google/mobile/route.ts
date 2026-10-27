import { NextRequest, NextResponse } from 'next/server';
import { getAllowedGoogleAudiences, upsertGoogleUser } from '@/lib/auth/google-oauth';
import { createSession, setSessionCookie } from '@/lib/session';
import { checkAuthRateLimit, getClientIp } from '@/lib/rate-limit';

interface MobileGoogleAuthBody {
  idToken?: unknown;
}

type GoogleMobileAuthDeps = {
  getAllowedAudiences: () => string[];
  /** Google's tokeninfo claims for a valid ID token, or null when Google rejects it. */
  fetchTokenInfo: (idToken: string) => Promise<Record<string, string> | null>;
  upsertGoogleUser: (info: {
    sub: string;
    email: string;
    name?: string;
    picture?: string;
    email_verified: boolean;
  }) => Promise<{ id: string }>;
  createSession: (
    userId: string,
    userAgent?: string,
    ipAddress?: string,
  ) => Promise<{
    token: string;
    user: {
      id: string;
      email: string;
      name: string | null;
      role: string;
      memberLevel: string;
      points: number;
    };
  }>;
  setSessionCookie: (token: string) => Promise<void>;
};

const defaultDeps: GoogleMobileAuthDeps = {
  getAllowedAudiences: getAllowedGoogleAudiences,
  fetchTokenInfo: async (idToken) => {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    );
    return response.ok ? ((await response.json()) as Record<string, string>) : null;
  },
  upsertGoogleUser,
  createSession,
  setSessionCookie,
};

type HandlerResult = {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
};

function invalidToken(): HandlerResult {
  return {
    status: 401,
    body: { success: false, error: 'idToken không hợp lệ hoặc đã hết hạn' },
  };
}

export async function handleGoogleMobileAuthRequest(
  request: Request,
  deps: GoogleMobileAuthDeps = defaultDeps,
): Promise<HandlerResult> {
  const rateLimit = checkAuthRateLimit(request, 'auth-login');
  if (rateLimit) {
    return {
      status: rateLimit.status,
      body: { success: false, error: 'Quá nhiều lần thử. Vui lòng thử lại sau.' },
      headers: { 'Retry-After': String(rateLimit.retryAfterSec) },
    };
  }

  const body = (await request.json().catch(() => ({}))) as MobileGoogleAuthBody;
  // Only ID tokens carry an audience we can check. Access tokens from any
  // Google app would pass the userinfo endpoint, so they are not accepted.
  if (typeof body.idToken !== 'string' || !body.idToken) {
    return {
      status: 400,
      body: { success: false, error: 'Thiếu idToken của Google' },
    };
  }

  const allowedAudiences = deps.getAllowedAudiences();
  if (allowedAudiences.length === 0) {
    console.error('Mobile Google Auth: GOOGLE_CLIENT_ID is not configured');
    return {
      status: 500,
      body: { success: false, error: 'Đăng nhập Google chưa được cấu hình' },
    };
  }

  const tokenInfo = await deps.fetchTokenInfo(body.idToken);
  if (!tokenInfo) return invalidToken();

  // An ID token Google issued to another app must not sign in here.
  if (!tokenInfo.aud || !allowedAudiences.includes(tokenInfo.aud)) {
    return invalidToken();
  }

  // tokeninfo returns claims as strings.
  if (tokenInfo.email_verified !== 'true') {
    return {
      status: 401,
      body: { success: false, error: 'Email Google chưa được xác thực' },
    };
  }

  if (!tokenInfo.sub || !tokenInfo.email) {
    return {
      status: 400,
      body: { success: false, error: 'Không tìm thấy thông tin email từ Google' },
    };
  }

  const user = await deps.upsertGoogleUser({
    sub: tokenInfo.sub,
    email: tokenInfo.email,
    name: tokenInfo.name,
    picture: tokenInfo.picture,
    email_verified: true,
  });

  const userAgent = request.headers.get('user-agent') || undefined;
  const session = await deps.createSession(user.id, userAgent, getClientIp(request));

  // Set cookie if possible
  await deps.setSessionCookie(session.token);

  return {
    status: 200,
    body: {
      success: true,
      data: {
        message: 'Đăng nhập Google thành công',
        token: session.token,
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          role: session.user.role,
          memberLevel: session.user.memberLevel,
          points: session.user.points,
        },
      },
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const result = await handleGoogleMobileAuthRequest(request);
    return NextResponse.json(result.body, {
      status: result.status,
      headers: result.headers,
    });
  } catch (error: unknown) {
    console.error('Mobile Google Auth error:', error);
    const message = error instanceof Error ? error.message : 'Đã có lỗi xảy ra khi xác thực Google';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
