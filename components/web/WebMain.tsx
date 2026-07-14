'use client';

import { usePathname } from 'next/navigation';
import { type ReactNode } from 'react';

type WebMainProps = {
  children: ReactNode;
};

export default function WebMain({ children }: WebMainProps) {
  const pathname = usePathname();
  const isHome = pathname === '/';

  return (
    <main
      className={
        isHome
          ? 'min-h-screen w-full bg-background'
          : 'min-h-screen bg-background max-w-7xl mx-auto w-full px-4 lg:px-8'
      }
    >
      {children}
    </main>
  );
}
