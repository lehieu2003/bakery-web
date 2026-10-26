import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import type { NextRequest } from 'next/server';

export const GOOGLE_OAUTH_STATE_COOKIE = 'google_oauth_state';

export function getAppUrl(request?: NextRequest): string {
  if (request) {
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const proto =
      request.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
    if (host) {
      return `${proto}://${host}`.replace(/\/$/, '');
    }
    return request.nextUrl.origin.replace(/\/$/, '');
  }
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}

export function generateOAuthState(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function getGoogleOAuthUrl(appUrl: string, state: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID is not configured');
  }

  const redirectUri = `${appUrl}/api/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(
  code: string,
  appUrl: string,
): Promise<{ access_token: string; id_token?: string }> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured');
  }

  const redirectUri = `${appUrl}/api/auth/google/callback`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to exchange code with Google: ${response.status} ${errorBody}`);
  }

  return response.json();
}

export type GoogleUserInfo = {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
};

export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user info from Google: ${response.statusText}`);
  }

  return response.json();
}

export async function upsertGoogleUser(info: GoogleUserInfo) {
  const normalizedEmail = info.email.trim().toLowerCase();

  // 1. Check if user with this googleId already exists
  let user = await prisma.user.findUnique({
    where: { googleId: info.sub },
  });

  if (user) {
    if (!user.isActive) {
      throw new Error('Tài khoản này đã bị khóa.');
    }
    return user;
  }

  // 2. Check if user with this email already exists
  user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (user) {
    if (!user.isActive) {
      throw new Error('Tài khoản này đã bị khóa.');
    }
    // Link googleId and ensure email is verified
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        googleId: info.sub,
        emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
        name: user.name || info.name,
      },
    });
    return user;
  }

  // 3. Create new user
  user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      googleId: info.sub,
      name: info.name || normalizedEmail.split('@')[0],
      emailVerifiedAt: new Date(),
      role: 'CUSTOMER',
      memberLevel: 'SILVER',
      isActive: true,
    },
  });

  return user;
}

