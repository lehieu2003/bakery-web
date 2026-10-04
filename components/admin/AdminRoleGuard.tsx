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
          if (!cancelled) router.replace('/');
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
