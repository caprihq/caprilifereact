import { useCallback, useState } from 'react'

import { useFeedback } from '@/hooks/useFeedback'
import { reportError, track } from '@/services'
import { friendlyMessage } from '@/utils'
import type { PlanScope, Unplaced } from '../logic/unplacedReason'
import { retimed, withSuggestion } from '../logic/suggestionEdits'
import type { Conflict, Occupied } from '../logic/suggestionEdits'
import {
  NO_META,
  PLAN_FAILED,
  emptyPlanNoticeFor,
  fetchPlan,
  invokeReschedule,
  partsOf,
  planMetaFrom,
} from '../services/autoSchedulePlan'
import type { PlanMeta, Suggestion } from '../services/autoSchedulePlan'

export type { PlanMeta, Suggestion }

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

export const useAutoSchedule = () => {
  const { show } = useFeedback()
  const [running, setRunning] = useState(false)
  const [suggestions, setSuggestions] = useState<readonly Suggestion[]>([])
  const [unplaced, setUnplaced] = useState<readonly Unplaced[]>([])
  const [meta, setMeta] = useState<PlanMeta>(NO_META)
  const [conflicts, setConflicts] = useState<readonly Conflict[]>([])
  const [occupied, setOccupied] = useState<readonly Occupied[]>([])
  const [scope, setScope] = useState<PlanScope>('today')

  /**
   * Ask for a plan. Returns what came back so the caller can present it.
   *
   * With a task id it is an overlap fix: that one task, planned alone, without AI.
   */
  const run = useCallback(
    async (rescheduleTaskId?: string, ahead: PlanScope = 'today') => {
      setRunning(true)
      setScope(ahead)
      try {
        // `ai: true` opts this build into AI planning. Older builds send nothing and
        // keep the faster rules planner until they are updated (see the backend's
        // rollout.ts).
        const response = await fetchPlan(rescheduleTaskId, ahead)
        const parts = partsOf(response.data)
        const next = parts.suggestions
        setSuggestions(next)
        setUnplaced(parts.unplaced)
        setMeta(planMetaFrom(response.data))
        setConflicts(parts.conflicts)
        setOccupied(parts.occupied)
        track({ name: 'auto_schedule_run', params: { suggested: next.length } })

        const notice = emptyPlanNoticeFor(response.data, next, ahead)
        if (notice) show(notice)
        return next
      } catch (error) {
        reportError(error, 'autoScheduleTasks')
        show({ message: friendlyMessage(error, PLAN_FAILED), tone: 'error' })
        setUnplaced([])
        setMeta(NO_META)
        return []
      } finally {
        setRunning(false)
      }
    },
    [show],
  )

  const dismiss = useCallback((taskId: string) => {
    setSuggestions((current) => current.filter((entry) => entry.task_id !== taskId))
  }, [])

  /** "Find a new time" for a clash on this screen: the answer joins the list. */
  const reschedule = useCallback(
    async (taskId: string) => {
      try {
        const response = await invokeReschedule(taskId)
        const [found] = response.data?.suggestions ?? []
        setConflicts((current) => current.filter((c) => c.task_id !== taskId))
        if (found) setSuggestions((current) => withSuggestion(current, found))
        else setUnplaced((current) => [...(response.data?.unplaced ?? []), ...current])
      } catch (error) {
        reportError(error, 'autoScheduleTasks:reschedule')
        show({ message: "Couldn't find a new time right now.", tone: 'error' })
      }
    },
    [show],
  )

  /** A time the person picked themselves, keeping the suggestion's length. */
  const retime = useCallback((taskId: string, start: Date) => {
    setSuggestions((current) =>
      current.map((s) => (s.task_id === taskId ? retimed(s, start) : s)),
    )
  }, [])

  return {
    run,
    running,
    scope,
    suggestions,
    unplaced,
    meta,
    dismiss,
    conflicts,
    occupied,
    reschedule,
    retime,
  }
}
