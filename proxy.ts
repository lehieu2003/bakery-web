import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedUserRoutes = ['/profile'];

const CSP =
  "default-src 'self'; img-src 'self' data: blob: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self' data: https:; connect-src 'self' https: ws: wss:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";

function applySecurityHeaders(response: NextResponse, request: NextRequest) {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()',
  );
  response.headers.set('Content-Security-Policy', CSP);

  const forwardedProto = request.headers
    .get('x-forwarded-proto')
    ?.split(',')[0]
    ?.trim();
  const isHttps =
    request.nextUrl.protocol === 'https:' || forwardedProto === 'https';

  if (isHttps) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    );
  }

  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const sessionToken = request.cookies.get('bakery_session')?.value;
  const userRole = request.cookies.get('bakery_role')?.value;

  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');
  const isAdminLoginRoute = pathname === '/admin/login';
  const isProtectedUserRoute = protectedUserRoutes.some((route) =>
    pathname.startsWith(route),
  );

  if (isAdminRoute && !isAdminLoginRoute) {
    if (!sessionToken) {
      const url = new URL('/admin/login', request.url);
      url.searchParams.set('redirect', pathname);
      return applySecurityHeaders(NextResponse.redirect(url), request);
    }

    if (userRole !== 'ADMIN') {
      return applySecurityHeaders(
        NextResponse.redirect(new URL('/', request.url)),
        request,
      );
    }
  }

  if (isProtectedUserRoute && !sessionToken) {
    const url = new URL('/auth', request.url);
    url.searchParams.set('redirect', pathname);
    return applySecurityHeaders(NextResponse.redirect(url), request);
  }

  if (isAdminLoginRoute && sessionToken && userRole === 'ADMIN') {
    return applySecurityHeaders(
      NextResponse.redirect(new URL('/admin/dashboard', request.url)),
      request,
    );
  }

  return applySecurityHeaders(NextResponse.next(), request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
