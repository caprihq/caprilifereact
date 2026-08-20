import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { useFeedback } from '@/hooks/useFeedback'
import { base44 } from '@/services/api'
import { reportError } from '@/services'
import { queryKeys } from '@/services/api'

/**
 * Smart auto-scheduling.
 *
 * The backend (base44/functions/autoScheduleTasks) does the work and enforces
 * the plan gate itself, returning 403 `upgrade_required` — the client check is
 * only there to avoid a pointless round trip.
 */
type Suggestion = { readonly task_id: string; readonly suggested_time: string }

export const useAutoSchedule = () => {
  const queryClient = useQueryClient()
  const { show } = useFeedback()
  const [running, setRunning] = useState(false)

  const run = useCallback(async () => {
    setRunning(true)
    try {
      const response = (await base44.functions.invoke('autoScheduleTasks', {})) as {
        data?: { suggestions?: Suggestion[]; debug?: string }
      }

      const suggestions = response.data?.suggestions ?? []
      if (suggestions.length === 0) {
        show({ message: response.data?.debug ?? 'No free slots found this week.' })
        return
      }

      show({ message: `Scheduled ${String(suggestions.length)} tasks.` })
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasksAll })
    } catch (error) {
      reportError(error, 'autoScheduleTasks')
      show({ message: "Couldn't build a plan right now.", isError: true })
    } finally {
      setRunning(false)
    }
  }, [queryClient, show])

  return { run, running }
}
