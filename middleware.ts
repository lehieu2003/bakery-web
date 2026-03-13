import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedUserRoutes = ['/account', '/orders'];
const authRoutes = ['/login', '/register', '/admin'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const sessionToken = request.cookies.get('bakery_session')?.value;
  const userRole = request.cookies.get('bakery_role')?.value;

  const isAdminRoute = pathname.startsWith('/admin/') && pathname !== '/admin';

  const isProtectedUserRoute = protectedUserRoutes.some((route) =>
    pathname.startsWith(route),
  );

  const isAuthRoute = authRoutes.includes(pathname);

  // Protect admin routes
  if (isAdminRoute) {
    if (!sessionToken) {
      const url = new URL('/admin', request.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    if (userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Protect user routes
  if (isProtectedUserRoute && !sessionToken) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Prevent logged-in users from accessing auth pages
  if (isAuthRoute && sessionToken) {
    if (pathname === '/admin' && userRole === 'ADMIN') {
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
