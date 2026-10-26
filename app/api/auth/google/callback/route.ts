import { NextRequest, NextResponse } from 'next/server';
import {
  exchangeGoogleCode,
  fetchGoogleUserInfo,
  getAppUrl,
  GOOGLE_OAUTH_STATE_COOKIE,
  upsertGoogleUser,
} from '@/lib/auth/google-oauth';
import { createSession } from '@/lib/session';
import { getClientIp } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const appUrl = getAppUrl(request);

  if (error) {
    console.error('Google OAuth returned error:', error);
    return NextResponse.redirect(`${appUrl}/auth?error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/auth?error=invalid_request`);
  }

  // Validate state from cookie against state in query
  const savedState = request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${appUrl}/auth?error=state_mismatch`);
  }

  try {
    // 1. Exchange code for access token
    const tokenData = await exchangeGoogleCode(code, appUrl);

    // 2. Fetch user profile from Google
    const googleUser = await fetchGoogleUserInfo(tokenData.access_token);

    if (!googleUser.email) {
      return NextResponse.redirect(`${appUrl}/auth?error=no_email_provided`);
    }

    // 3. Find or create user in database
    const user = await upsertGoogleUser(googleUser);

    // 4. Create session
    const userAgent = request.headers.get('user-agent') || undefined;
    const clientIp = getClientIp(request);
    const { token } = await createSession(user.id, userAgent, clientIp);

    // 5. Build response redirecting to home page and set session cookie
    const response = NextResponse.redirect(`${appUrl}/`);

    // Delete oauth state cookie
    response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);

    // Set bakery_session cookie
    response.cookies.set('bakery_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return response;
  } catch (err: unknown) {
    console.error('Google OAuth callback error:', err);
    const message = err instanceof Error ? err.message : 'callback_failed';
    return NextResponse.redirect(`${appUrl}/auth?error=${encodeURIComponent(message)}`);
  }
}

