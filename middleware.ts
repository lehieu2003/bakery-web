import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

const protectedAdminRoutes = ['/admin', '/api/admin'];
const protectedRoutes = ['/account', '/orders'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the route requires authentication
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route),
  );
  const isAdminRoute = protectedAdminRoutes.some((route) =>
    pathname.startsWith(route),
  );

  if (!isProtectedRoute && !isAdminRoute) {
    return NextResponse.next();
  }

  // Get session cookie
  const sessionToken = request.cookies.get('bakery_session')?.value;

  if (!sessionToken) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }
    // Redirect to login page
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Verify session
  try {
    const session = await prisma.session.findUnique({
      where: { token: sessionToken },
      include: {
        user: {
          select: {
            id: true,
            role: true,
            isActive: true,
          },
        },
      },
    });

    if (!session || session.expiresAt < new Date() || !session.user.isActive) {
      if (pathname.startsWith('/api')) {
        return NextResponse.json(
          { success: false, error: 'Session expired' },
          { status: 401 },
        );
      }
      const url = new URL('/login', request.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    // Check admin access
    if (isAdminRoute && session.user.role !== 'ADMIN') {
      if (pathname.startsWith('/api')) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Admin access required' },
          { status: 403 },
        );
      }
      return NextResponse.redirect(new URL('/403', request.url));
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    if (pathname.startsWith('/api')) {
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 },
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/account/:path*',
    '/orders/:path*',
  ],
};
