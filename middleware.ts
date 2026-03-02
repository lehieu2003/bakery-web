import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that need authentication (pages only, not API)
const protectedAdminRoutes = ['/admin'];
const protectedUserRoutes = ['/account', '/orders'];
const authRoutes = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get session cookie
  const sessionToken = request.cookies.get('bakery_session')?.value;

  // Check route types
  const isAdminRoute = protectedAdminRoutes.some((route) =>
    pathname.startsWith(route),
  );
  const isProtectedRoute = protectedUserRoutes.some((route) =>
    pathname.startsWith(route),
  );
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // If accessing protected route without session cookie → redirect to login
  if ((isAdminRoute || isProtectedRoute) && !sessionToken) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // If already has session and accessing auth routes → redirect to home
  if (isAuthRoute && sessionToken) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match pages that need protection
     * API routes are NOT included here - they handle auth themselves
     */
    '/admin/:path*',
    '/account/:path*',
    '/orders/:path*',
    '/login',
    '/register',
  ],
};
