import { clearQueryCache, queryClient } from './queryClient'

/**
 * Cached queries belong to the session that fetched them. Sign out and back in
 * as someone else on the same device and the new session was starting out
 * against the previous user's tasks, commitments and user record, until each
 * query happened to refetch.
 */

afterEach(() => {
  queryClient.clear()
})

describe('clearQueryCache', () => {
  it('removes cached data from the previous session', async () => {
    queryClient.setQueryData(['tasks'], [{ id: 't1', title: 'Previous user task' }])
    queryClient.setQueryData(['currentUser'], { id: 'u1', email: 'previous@example.com' })
    expect(queryClient.getQueryCache().getAll()).toHaveLength(2)

    await clearQueryCache()

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
    expect(queryClient.getQueryData(['tasks'])).toBeUndefined()
    expect(queryClient.getQueryData(['currentUser'])).toBeUndefined()
  })

  /**
   * The subtle one. A fetch already on the wire can resolve *after* the cache is
   * cleared and write the old session's data straight back in, which is why the
   * cancel comes first.
   */
  it('does not let an in-flight fetch repopulate the cache after the clear', async () => {
    let release: (value: string) => void = () => undefined
    const inFlight = new Promise<string>((resolve) => {
      release = resolve
    })

    const fetching = queryClient.fetchQuery({
      queryKey: ['tasks'],
      queryFn: () => inFlight,
      // Without this, cancellation is retried rather than abandoned.
      retry: false,
    })

    await clearQueryCache()
    release('previous user data')
    // The fetch rejects once cancelled; the point is what it leaves behind.
    await fetching.catch(() => undefined)

    expect(queryClient.getQueryData(['tasks'])).toBeUndefined()
  })

  it('is safe to call when nothing is cached — sign-out must always complete', async () => {
    await expect(clearQueryCache()).resolves.toBeUndefined()
  })
})
