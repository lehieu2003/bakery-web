'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type MeResponse = {
  success: boolean;
  data?: {
    user?: {
      role?: string;
    };
  };
};

/**
 * Client-side role gate for admin pages.
 *
 * The middleware cannot verify the user's role safely (it must not trust a
 * client-writable cookie), so it only gates on session presence. Admin pages
 * use this guard to verify the real role via GET /api/auth/me: non-admins are
 * redirected home and the admin UI is never rendered for them. Admin data
 * itself stays protected server-side by requireAdmin() on /api/admin/* routes.
 */
export default function AdminRoleGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verifyAdmin() {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });

        if (!response.ok) {
          // Signed out (expired, or signed out by another device): back to
          // the admin sign-in. /api/auth/me dropped the dead cookie, so the
          // proxy no longer bounces /admin/login to the dashboard.
          if (!cancelled) {
            router.replace(response.status === 401 ? '/admin/login' : '/');
          }
          return;
        }

        const payload = (await response.json()) as MeResponse;

        if (payload?.data?.user?.role !== 'ADMIN') {
          if (!cancelled) router.replace('/');
          return;
        }

        if (!cancelled) setVerified(true);
      } catch {
        if (!cancelled) router.replace('/');
      }
    }

    verifyAdmin();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!verified) {
    return null;
  }

  return <>{children}</>;
}
