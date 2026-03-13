import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedUserRoutes = ['/account', '/orders'];
const authRoutes = ['/login', '/register', '/admin']; // /admin is admin login page

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get session cookie
  const sessionToken = request.cookies.get('bakery_session')?.value;

  const isAdminRoute = pathname.startsWith('/admin') && pathname !== '/admin';

  const isProtectedRoute = protectedUserRoutes.some((route) =>
    pathname.startsWith(route),
  );
  const isAuthRoute = authRoutes.some((route) => pathname === route);

  // If accessing protected route without session cookie → redirect to login
  if (isAdminRoute && !sessionToken) {
    const url = new URL('/admin', request.url); // Admin login page
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  if (isProtectedRoute && !sessionToken) {
    const url = new URL('/login', request.url); // User login page
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // If already has session and accessing auth routes → redirect appropriately
  if (isAuthRoute && sessionToken) {
    if (pathname === '/admin') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/account/:path*',
    '/orders/:path*',
    '/login',
    '/register',
  ],
};
