import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedUserRoutes = ['/profile'];
const authRoutes = ['/auth', '/admin'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const sessionToken = request.cookies.get('bakery_session')?.value;
  const userRole = request.cookies.get('bakery_role')?.value;

  const isAdminRoute = pathname.startsWith('/admin/') && pathname !== '/admin';
  const isProtectedUserRoute = protectedUserRoutes.some((route) =>
    pathname.startsWith(route),
  );
  const isAuthRoute = authRoutes.includes(pathname);

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

  if (isProtectedUserRoute && !sessionToken) {
    const url = new URL('/auth', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && sessionToken) {
    if (pathname === '/admin' && userRole === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }

    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const proxyConfig = {
  matcher: ['/admin/:path*', '/profile/:path*', '/auth'],
};
