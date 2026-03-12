/**
 * React Query Provider
 * Provides React Query client to the application
 */

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Don't refetch on window focus by default
            refetchOnWindowFocus: false,
            // Retry failed requests 1 time
            retry: 1,
            // Consider data stale after 1 minute
            staleTime: 60 * 1000,
            // Keep cache in memory for 24 hours so navigating between pages
            // does not garbage-collect data and force a re-fetch
            gcTime: 24 * 60 * 60 * 1000,
          },
          mutations: {
            // Retry failed mutations 0 times
            retry: 0,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}

export default QueryProvider;
