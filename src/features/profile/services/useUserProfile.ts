import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { base44 } from '@/services/api'
import { reportError } from '@/services'
import { useCurrentUser } from '@/services/api'
import { queryKeys } from '@/services/api'
import type { User } from '@/types/entities'

/**
 * Read and update the signed-in user's profile.
 *
 * Only fields the user genuinely owns are writable. `plan`, `role` and the
 * subscription/APNs fields are server-managed — base44/entities/User.jsonc
 * documents them as "server-side write only", and the RevenueCat webhook is
 * the sole writer of `plan`.
 */
export type EditableProfile = Pick<
  User,
  | 'display_name'
  | 'timezone'
  | 'work_hours_start'
  | 'work_hours_end'
  | 'preferred_task_duration'
  | 'energy_peak_hours'
  | 'context_switch_tolerance'
  | 'notification_enabled'
  | 'notification_quiet_hours_start'
  | 'notification_quiet_hours_end'
>

export const useUserProfile = () => {
  const queryClient = useQueryClient()
  const { data: user, isLoading, isError, refetch } = useCurrentUser()

  const update = useCallback(
    async (changes: Partial<EditableProfile>): Promise<boolean> => {
      try {
        await base44.auth.updateMe(changes)
        await queryClient.invalidateQueries({ queryKey: queryKeys.currentUser })
        return true
      } catch (error) {
        reportError(error, 'updateProfile')
        return false
      }
    },
    [queryClient],
  )

  return { user, isLoading, isError, refetch: () => void refetch(), update }
}
