import { useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { CommitmentEntity } from '@/services/api'
import { reportError } from '@/services'
import { queryKeys } from '@/services/api'
import type { Commitment } from '@/types/entities'

/**
 * Create and delete commitments.
 *
 * The web version invalidated a hand-written `["commitments", email]` key from
 * inside the sheet component; the shared `queryKeys` factory is used here so a
 * key can only be wrong in one place.
 */

export const useCommitmentMutations = (
  userEmail: string | null,
  onError?: (message: string) => void,
) => {
  const queryClient = useQueryClient()
  const key = queryKeys.commitments(userEmail)

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: key })
  }, [queryClient, key])

  const createCommitment = useMutation({
    mutationFn: (data: Partial<Commitment>) => CommitmentEntity().create(data),
    onError: (error) => {
      reportError(error, 'createCommitment')
      onError?.("Your commitment wasn't saved.")
    },
    onSettled: invalidate,
  })

  const deleteCommitment = useMutation({
    mutationFn: (id: string) => CommitmentEntity().delete(id),
    onError: (error) => {
      reportError(error, 'deleteCommitment')
      onError?.("Commitment wasn't deleted.")
    },
    onSettled: invalidate,
  })

  return { createCommitment, deleteCommitment }
}
