import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that need authentication (pages only, not API)
// /admin is login page, only protect /admin/* sub-routes
const protectedAdminSubRoutes = [
  '/admin/dashboard',
  '/admin/products',
  '/admin/categories',
  '/admin/orders',
  '/admin/customers',
  '/admin/banners',
  '/admin/settings',
  '/admin/membership',
];
const protectedUserRoutes = ['/account', '/orders'];
const authRoutes = ['/login', '/register', '/admin']; // /admin is admin login page

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get session cookie
  const sessionToken = request.cookies.get('bakery_session')?.value;

  // Check route types
  const isAdminSubRoute = protectedAdminSubRoutes.some((route) =>
    pathname.startsWith(route),
  );
  const isProtectedRoute = protectedUserRoutes.some((route) =>
    pathname.startsWith(route),
  );
  const isAuthRoute = authRoutes.some((route) => pathname === route);

  // If accessing protected route without session cookie → redirect to login
  if (isAdminSubRoute && !sessionToken) {
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
    /*
     * Match pages that need protection
     * /admin is login page, sub-routes are protected
     */
    '/admin',
    '/admin/dashboard/:path*',
    '/admin/products/:path*',
    '/admin/categories/:path*',
    '/admin/orders/:path*',
    '/admin/customers/:path*',
    '/admin/banners/:path*',
    '/admin/settings/:path*',
    '/admin/membership/:path*',
    '/account/:path*',
    '/orders/:path*',
    '/login',
    '/register',
  ],
};
