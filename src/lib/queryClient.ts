import { QueryClient } from '@tanstack/react-query';

// Single shared cache for the whole app. Exported as a module singleton so
// non-component code (e.g. lib/events.ts) can invalidate queries too.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Public catalogue data changes infrequently; keep it fresh for a few
      // seconds so tab switches / remounts are instant without refetching.
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Stable query keys shared across hooks and invalidation call sites.
export const queryKeys = {
  hotels: ['hotels'] as const,
  rooms: ['rooms'] as const,
  media: (parentId: string) => ['media', parentId] as const,
  availability: (checkIn: string, checkOut: string) => ['availability', checkIn, checkOut] as const,
};
