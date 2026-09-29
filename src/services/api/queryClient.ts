import { QueryClient } from '@tanstack/react-query'

import { QUERY_DEFAULTS } from '@/config'
import { CACHE_MAX_AGE_MS } from './cacheSnapshot'
import { clearCacheSnapshot } from './cacheStore'

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
      /**
       * Meaningful now that `appFocus.ts` bridges `AppState` into React Query's
       * focus manager. Without that bridge this option is inert in React Native —
       * there is no `window.focus` to listen for — which is why it read `false`.
       */
      refetchOnWindowFocus: true,
      /**
       * Matched to how long a saved snapshot is trusted.
       *
       * The default drops a query five minutes after the last component using it
       * unmounts. Restored data would therefore be collected before the user
       * reached the screen it belongs to, and the next save would write it out
       * again without that query — the offline cache would quietly thin itself
       * to only whatever had been looked at in the last five minutes.
       */
      gcTime: CACHE_MAX_AGE_MS,
    },
  },
})

/**
 * Drop every cached query. Called when a session ends, by sign-out and by a 401.
 *
 * In-flight fetches are cancelled first. Without that, a request already on the
 * wire can resolve after the clear and repopulate the cache with the previous
 * user's data — the exact leak this exists to prevent.
 *
 * The saved copy on disk goes with it. Memory alone is no longer the whole
 * cache: leaving the snapshot behind would put the previous user's tasks on the
 * next launch's first frame.
 */
export const clearQueryCache = async (): Promise<void> => {
  await queryClient.cancelQueries()
  queryClient.clear()
  clearCacheSnapshot()
}
