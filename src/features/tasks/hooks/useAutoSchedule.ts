import { useCallback, useState } from 'react'

import { useFeedback } from '@/hooks/useFeedback'
import { base44 } from '@/services/api'
import { reportError } from '@/services'
import { friendlyMessage } from '@/utils'
import type { Task } from '@/types/entities'
import { emptyPlanNotice } from '../logic/autoScheduleNotice'

/**
 * Smart auto-scheduling.
 *
 * **The backend only suggests.** `autoScheduleTasks` returns up to five
 * `{ task_id, suggested_time, reason, task }` entries and writes nothing; the web
 * client applies them one at a time as the user accepts. This hook used to invoke
 * the function, throw the response away and announce "Scheduled N tasks" — so the
 * app claimed to have planned the day while the database was untouched, and the
 * plan vanished on the next refresh.
 *
 * The plan gate is enforced by the backend (403 `upgrade_required`); the client
 * check upstream of this only avoids a pointless round trip.
 */

export type Suggestion = {
  readonly task_id: string
  readonly suggested_time: string
  readonly reason?: string
  readonly task?: Task
}

type AutoScheduleResponse = {
  readonly data?: {
    readonly suggestions?: readonly Suggestion[]
    /** Why the plan is empty, as a code the app turns into copy. */
    readonly reason?: string
    readonly work_hours?: { readonly start?: number; readonly end?: number }
    /** The backend's log line. Never shown — see `autoScheduleNotice`. */
    readonly debug?: string
  }
}

export const useAutoSchedule = () => {
  const { show } = useFeedback()
  const [running, setRunning] = useState(false)
  const [suggestions, setSuggestions] = useState<readonly Suggestion[]>([])

  /** Ask for a plan. Returns what came back so the caller can present it. */
  const run = useCallback(async (): Promise<readonly Suggestion[]> => {
    setRunning(true)
    try {
      const response = (await base44.functions.invoke(
        'autoScheduleTasks',
        {},
      )) as AutoScheduleResponse

      const next = response.data?.suggestions ?? []
      setSuggestions(next)

      if (next.length === 0) {
        show(
          emptyPlanNotice({
            reason: response.data?.reason,
            workHours: response.data?.work_hours,
          }),
        )
      }
      return next
    } catch (error) {
      reportError(error, 'autoScheduleTasks')
      show({
        message: friendlyMessage(error, "CAPRI couldn't build a plan right now. Please try again."),
        tone: 'error',
      })
      return []
    } finally {
      setRunning(false)
    }
  }, [show])

  const dismiss = useCallback((taskId: string) => {
    setSuggestions((current) => current.filter((entry) => entry.task_id !== taskId))
  }, [])

  return { run, running, suggestions, dismiss }
}
