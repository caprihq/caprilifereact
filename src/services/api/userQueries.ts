import { useQuery } from '@tanstack/react-query'

import { base44 } from './base44Client'
import { queryKeys } from './queryKeys'
import { QUERY_DEFAULTS } from '@/config'
import type { User } from '@/types/entities'

/**
 * The signed-in user.
 *
 * Shared infrastructure, not a feature's: tasks, profile, commitments and the
 * plan gate all need it. Keeping it inside `features/tasks` is why profile and
 * commitments both reached into the tasks feature.
 *
 * **This is the single source of truth for identity.** The auth store holds only
 * flow status — previously an AuthContext and this query both called
 * `auth.me()`, giving two copies of the same user that could drift.
 */
export const useCurrentUser = () =>
  useQuery({
    queryKey: queryKeys.currentUser,
    queryFn: async (): Promise<User> => (await base44.auth.me()) as User,
    staleTime: QUERY_DEFAULTS.userStaleTime,
  })
