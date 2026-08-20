import { QueryClient } from '@tanstack/react-query'

import { QUERY_DEFAULTS } from '@/config'

/**
 * The app's single QueryClient.
 *
 * It lived in `App.tsx`, which meant nothing outside the component tree could
 * reach it — and sign-out needs to. Every cached query is data belonging to the
 * session that fetched it, so tearing a session down has to drop the cache; a
 * service importing the app root to do that would invert the dependency.
 *
 * Kept here rather than in a store: React Query owns its own cache, and wrapping
 * it in Zustand would create a second source of truth for server data (§4).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: QUERY_DEFAULTS.retry,
      staleTime: QUERY_DEFAULTS.staleTime,
      refetchOnWindowFocus: false,
    },
  },
})

/**
 * Drop every cached query. Called when a session ends, by sign-out and by a 401.
 *
 * In-flight fetches are cancelled first. Without that, a request already on the
 * wire can resolve after the clear and repopulate the cache with the previous
 * user's data — the exact leak this exists to prevent.
 */
export const clearQueryCache = async (): Promise<void> => {
  await queryClient.cancelQueries()
  queryClient.clear()
}
