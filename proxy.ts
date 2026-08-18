import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedUserRoutes = ['/profile'];
const authRoutes = ['/auth', '/admin/login'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const sessionToken = request.cookies.get('bakery_session')?.value;
  const userRole = request.cookies.get('bakery_role')?.value;

  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');
  const isAdminLoginRoute = pathname === '/admin/login';
  const isProtectedUserRoute = protectedUserRoutes.some((route) =>
    pathname.startsWith(route),
  );
  const isAuthRoute = authRoutes.includes(pathname);

  if (isAdminRoute && !isAdminLoginRoute) {
    if (!sessionToken) {
      const url = new URL('/admin/login', request.url);
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

  if (isAdminLoginRoute && sessionToken && userRole === 'ADMIN') {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/profile/:path*', '/auth'],
};
