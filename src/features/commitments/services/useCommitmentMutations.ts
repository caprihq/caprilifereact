import { useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { CommitmentEntity } from '@/services/api'
import { optimisticList, restoreList } from '@/services/api/optimisticCache'
import type { ListSnapshot } from '@/services/api/optimisticCache'
import { reportError } from '@/services'
import { queryKeys } from '@/services/api'
import type { Commitment } from '@/types/entities'

/**
 * Delete a commitment, optimistically.
 *
 * The web version invalidated a hand-written `["commitments", email]` key from
 * inside the sheet component; the shared `queryKeys` factory is used here so a
 * key can only be wrong in one place.
 *
 * Removal writes the cache before the request goes out, so the row leaves the
 * timeline at once rather than lingering long enough for the user to try again.
 *
 * There is no create. Commitments are now written by the calendar import alone;
 * appointments entered by hand are tasks with the Scheduled event switch on, which
 * is one form rather than two and produces something that can be completed and
 * reminded about.
 */

export const useCommitmentMutations = (
  userEmail: string | null,
  onError?: (message: string) => void,
) => {
  const queryClient = useQueryClient()
  const key = queryKeys.commitments(userEmail)

  const rollback = useCallback(
    (snapshot: ListSnapshot<Commitment> | undefined, error: unknown, label: string) => {
      restoreList(queryClient, key, snapshot)
      reportError(error, label)
    },
    [queryClient, key],
  )

  /**
   * Refetch once the request has settled, success or failure.
   *
   * On success this is what swaps the pending row for the saved one, so its real
   * id arrives and it becomes deletable.
   */
  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: key })
  }, [queryClient, key])

  const deleteCommitment = useMutation({
    mutationFn: (id: string) => CommitmentEntity().delete(id),
    onMutate: (id) =>
      optimisticList<Commitment>(queryClient, key, (rows) => rows.filter((c) => c.id !== id)),
    onError: (error, _id, snapshot) => {
      rollback(snapshot, error, 'deleteCommitment')
      onError?.("Commitment wasn't deleted.")
    },
    onSettled: invalidate,
  })

  return { deleteCommitment }
}
