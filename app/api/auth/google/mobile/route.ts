import { NextRequest, NextResponse } from 'next/server';
import { fetchGoogleUserInfo, upsertGoogleUser } from '@/lib/auth/google-oauth';
import { createSession, setSessionCookie } from '@/lib/session';
import { getClientIp } from '@/lib/rate-limit';

interface MobileGoogleAuthBody {
  idToken?: string;
  accessToken?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MobileGoogleAuthBody;
    const { idToken, accessToken } = body;

    if (!idToken && !accessToken) {
      return NextResponse.json(
        { success: false, error: 'Thiếu idToken hoặc accessToken của Google' },
        { status: 400 },
      );
    }

    let googleUser: { sub: string; email: string; name?: string; picture?: string };

    if (idToken) {
      // Verify idToken with Google tokeninfo
      const tokenInfoRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
      );

      if (!tokenInfoRes.ok) {
        return NextResponse.json(
          { success: false, error: 'idToken không hợp lệ hoặc đã hết hạn' },
          { status: 401 },
        );
      }

      const tokenInfo = (await tokenInfoRes.json()) as {
        sub?: string;
        email?: string;
        name?: string;
        picture?: string;
      };

      if (!tokenInfo.sub || !tokenInfo.email) {
        return NextResponse.json(
          { success: false, error: 'Không tìm thấy thông tin email từ Google' },
          { status: 400 },
        );
      }

      googleUser = {
        sub: tokenInfo.sub,
        email: tokenInfo.email,
        name: tokenInfo.name,
        picture: tokenInfo.picture,
      };
    } else {
      // Verify via accessToken
      googleUser = await fetchGoogleUserInfo(accessToken!);
    }

    // Upsert user in database
    const user = await upsertGoogleUser(googleUser);

    // Create session
    const userAgent = request.headers.get('user-agent') || undefined;
    const clientIp = getClientIp(request);
    const session = await createSession(user.id, userAgent, clientIp);

    // Set cookie if possible
    await setSessionCookie(session.token);

    return NextResponse.json({
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
    });
  } catch (error: unknown) {
    console.error('Mobile Google Auth error:', error);
    const message = error instanceof Error ? error.message : 'Đã có lỗi xảy ra khi xác thực Google';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
