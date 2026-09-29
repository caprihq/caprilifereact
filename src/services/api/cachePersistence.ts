import { dehydrate, hydrate } from '@tanstack/react-query'

import { logWarn } from '@/utils'
import { decodeSnapshot, encodeSnapshot, isPersistable } from './cacheSnapshot'
import { readCacheSnapshot, writeCacheSnapshot } from './cacheStore'
import { queryClient } from './queryClient'

/**
 * Keeps the query cache across launches, so the app opens on the last known
 * tasks instead of a spinner — and, with no signal, on something rather than an
 * error.
 *
 * Two halves: `hydrateQueryCache` reads the snapshot in before the first render,
 * `startCachePersistence` writes it back as the cache changes.
 *
 * Hand-rolled rather than `@tanstack/react-query-persist-client`, which exists
 * for asynchronous storage and gates the tree behind a restore promise — a
 * loading flash on every launch. MMKV is synchronous, so the restore can simply
 * happen first, and `dehydrate`/`hydrate` are part of the core library already
 * installed.
 */

/**
 * How long to wait before writing.
 *
 * The cache fires an event per query transition, so a single screen load emits
 * a burst of them. Coalescing to one write a second turns a dozen serialisations
 * of the whole task list into one.
 */
const SAVE_DELAY_MS = 1_000

let restored = false
let pendingSave: ReturnType<typeof setTimeout> | null = null

/**
 * Load the saved cache. Safe to call more than once; only the first does work.
 *
 * Runs before the tree renders, which is why it must not throw: a corrupt
 * snapshot has to cost a network fetch, not the launch.
 *
 * There is no check for *whose* data this is, and none is needed — every key is
 * namespaced by the user's email, so another account's rows sit under a key
 * nothing will look up. Signing out clears the snapshot outright.
 */
export const hydrateQueryCache = (): void => {
  if (restored) return
  restored = true

  try {
    const state = decodeSnapshot(readCacheSnapshot(), Date.now())
    if (state) hydrate(queryClient, state)
  } catch (error) {
    logWarn('[cache] saved data could not be restored; starting empty', error)
  }
}

/**
 * Write the cache down.
 *
 * Only successful queries, and only the keys worth keeping: a failed query would
 * otherwise be restored as a failure and shown as an error on a launch that had
 * not yet tried anything. Mutations are excluded — replaying a half-finished
 * write on next launch is how a task gets created twice.
 */
const save = (): void => {
  try {
    const state = dehydrate(queryClient, {
      shouldDehydrateQuery: (query) =>
        query.state.status === 'success' && isPersistable(query.queryKey),
      shouldDehydrateMutation: () => false,
    })
    writeCacheSnapshot(encodeSnapshot(state, Date.now()))
  } catch (error) {
    logWarn('[cache] could not save the current data for offline use', error)
  }
}

/**
 * Begin mirroring cache changes to disk. Returns the teardown.
 *
 * Shaped like `startFocusBridge` so `App` can hand it straight to `useEffect`.
 */
export const startCachePersistence = (): (() => void) => {
  const unsubscribe = queryClient.getQueryCache().subscribe(() => {
    if (pendingSave) return
    pendingSave = setTimeout(() => {
      pendingSave = null
      save()
    }, SAVE_DELAY_MS)
  })

  return () => {
    unsubscribe()
    if (pendingSave) {
      clearTimeout(pendingSave)
      pendingSave = null
    }
  }
}
