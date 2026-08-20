import { useQuery } from '@tanstack/react-query'

import { TaskEntity, queryKeys } from '@/services/api'
import type { Task } from '@/types/entities'

/**
 * Task reads.
 *
 * Scoped by `created_by` to match the entity rules in
 * base44/entities/Task.jsonc — the server enforces it too, but filtering here
 * keeps payloads small.
 *
 * Sorted by `-priority_score` server-side, which is the order the list and the
 * filter bar preserve.
 *
 * Commitment and calendar reads used to live in this file, which is why the
 * commitments feature imported from the tasks feature. They now belong to
 * commitments, and `useCurrentUser` is shared infrastructure in services/api.
 */
export const useTasks = (userEmail: string | null) =>
  useQuery({
    queryKey: queryKeys.tasks(userEmail),
    enabled: !!userEmail,
    queryFn: async (): Promise<readonly Task[]> =>
      TaskEntity().filter({ created_by: userEmail }, '-priority_score'),
  })
