import { QueryClient } from '@tanstack/react-query';
 
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000,
      // Keep results in cache long enough to survive reloads / offline use.
      gcTime: 24 * 60 * 60 * 1000, // 24h
      // Serve cached data immediately when offline instead of pausing forever.
      networkMode: 'offlineFirst',
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});
