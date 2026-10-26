import { NextRequest, NextResponse } from 'next/server';
import {
  generateOAuthState,
  getAppUrl,
  getGoogleOAuthUrl,
  GOOGLE_OAUTH_STATE_COOKIE,
} from '@/lib/auth/google-oauth';

export async function GET(request: NextRequest) {
  try {
    const appUrl = getAppUrl(request);
    const state = generateOAuthState();
    const googleAuthUrl = getGoogleOAuthUrl(appUrl, state);

    const response = NextResponse.redirect(googleAuthUrl);

    // Save CSRF state in cookie for 10 minutes
    response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 10, // 10 minutes
    });

    return response;
  } catch (error) {
    console.error('Google OAuth init error:', error);
    return NextResponse.redirect(new URL('/auth?error=google_init_failed', request.url));
  }
}

