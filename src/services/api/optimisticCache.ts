import type { QueryClient, QueryKey } from '@tanstack/react-query'

/**
 * Snapshot-and-rollback for a cached list.
 *
 * A mutation that waits for the server before touching the screen reads as a
 * frozen app: the row a user just tapped stays as it was for as long as the
 * round trip takes, and on a slow connection they tap again. Writing the change
 * into the cache first makes the screen answer immediately; the snapshot is what
 * makes that safe, because a rejected write has somewhere to go back to.
 *
 * Generic over the row type so tasks and commitments share one implementation
 * rather than two copies that can drift apart. `useTaskCrud` predates this and
 * still carries its own; it is the next thing to fold in here.
 */

/**
 * The rollback point. `previous` is explicitly `| undefined` rather than an
 * optional property: `exactOptionalPropertyTypes` distinguishes "absent" from
 * "present and undefined", and a first-load cache legitimately has nothing yet.
 */
export type ListSnapshot<T> = { readonly previous: readonly T[] | undefined }

/**
 * Apply `update` to the cached list at `key` and return the rollback point.
 *
 * In-flight fetches are cancelled first. Without that, a request already on the
 * wire resolves after the optimistic write and overwrites it with the pre-change
 * server list — the change would appear, then visibly undo itself.
 */
export const optimisticList = async <T>(
  queryClient: QueryClient,
  key: QueryKey,
  update: (rows: readonly T[]) => readonly T[],
): Promise<ListSnapshot<T>> => {
  await queryClient.cancelQueries({ queryKey: key })
  const previous = queryClient.getQueryData<readonly T[]>(key)
  queryClient.setQueryData<readonly T[]>(key, (old = []) => update(old))
  return { previous }
}

/**
 * Put the list back as it was.
 *
 * A missing snapshot is not an error: there was no cached list to restore, and
 * the `onSettled` invalidation will fetch the truth regardless.
 */
export const restoreList = <T>(
  queryClient: QueryClient,
  key: QueryKey,
  snapshot: ListSnapshot<T> | undefined,
): void => {
  if (snapshot?.previous) queryClient.setQueryData(key, snapshot.previous)
}
