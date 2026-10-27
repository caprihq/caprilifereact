import { useCallback, useState } from 'react'

import { useFeedback } from '@/hooks/useFeedback'
import { base44 } from '@/services/api'
import { reportError, track } from '@/services'
import { friendlyMessage } from '@/utils'
import type { Task } from '@/types/entities'
import { emptyPlanNotice } from '../logic/autoScheduleNotice'
import type { Unplaced } from '../logic/unplacedReason'
import { retimed, withSuggestion } from '../logic/suggestionEdits'
import type { Conflict, Occupied } from '../logic/suggestionEdits'

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
  /** The end the planner reserved — see `windowForSuggestion`. */
  readonly suggested_end?: string
  /** Present only when CAPRI inferred the length; saved on accept. */
  readonly estimated_minutes?: number
  readonly reason?: string
  /** `ai` when CAPRI's model proposed the time, `rules` when its own planner did. */
  readonly source?: 'ai' | 'rules'
  readonly task?: Task
}

/** How the plan was made, for the caption above it. */
export type PlanMeta = {
  /** `ok`, or why the model was not used: `daily_limit`, `unavailable`, … */
  readonly aiStatus?: string
  /** Placeable tasks left for another pass. */
  readonly moreToPlan: number
}

const NO_META: PlanMeta = { moreToPlan: 0 }

type AutoScheduleResponse = {
  readonly data?: {
    readonly suggestions?: readonly Suggestion[]
    /**
     * Tasks that could not be placed, each with a code saying why.
     *
     * Read rather than discarded: showing four suggestions and saying nothing about
     * the other eight reads as a broken feature, not as a full week.
     */
    readonly unplaced?: readonly Unplaced[]
    /** Why the plan is empty, as a code the app turns into copy. */
    readonly reason?: string
    readonly work_hours?: { readonly start?: number; readonly end?: number }
    /** The backend's log line. Never shown — see `autoScheduleNotice`. */
    readonly debug?: string
    readonly ai_status?: string
    readonly more_to_plan?: number
    readonly conflicts?: readonly Conflict[]
    readonly occupied?: readonly Occupied[]
  }
}

/** One task's new time, for an overlap fix: planned alone, without AI. */
const invokeReschedule = async (taskId: string): Promise<AutoScheduleResponse> =>
  (await base44.functions.invoke('autoScheduleTasks', { reschedule_task_id: taskId })) as AutoScheduleResponse

/** The whole plan, or one task's new time. */
const fetchPlan = async (rescheduleTaskId?: string): Promise<AutoScheduleResponse> =>
  rescheduleTaskId
    ? invokeReschedule(rescheduleTaskId)
    : ((await base44.functions.invoke('autoScheduleTasks', { ai: true })) as AutoScheduleResponse)

/** The lists in a response, each defaulting to empty. */
const partsOf = (data: AutoScheduleResponse['data']) => ({
  suggestions: data?.suggestions ?? [],
  unplaced: data?.unplaced ?? [],
  conflicts: data?.conflicts ?? [],
  occupied: data?.occupied ?? [],
})

/** The plan's metadata, from whatever the backend sent. An older backend sends none. */
const planMetaFrom = (data: AutoScheduleResponse['data']): PlanMeta => ({
  ...(data?.ai_status ? { aiStatus: data.ai_status } : {}),
  moreToPlan: data?.more_to_plan ?? 0,
})

/**
 * Whether an empty plan needs a toast.
 *
 * Not when the screen already explains it: with nothing suggested but tasks listed
 * under Needs attention, each with its reason, a generic "CAPRI found no time"
 * toast on top contradicts the list. A reason code (list clear, week full) still
 * gets its message.
 */
const announcesEmptyPlan = (
  data: AutoScheduleResponse['data'],
  suggestions: readonly Suggestion[],
): boolean =>
  suggestions.length === 0 && (!!data?.reason || (data?.unplaced ?? []).length === 0)

export const useAutoSchedule = () => {
  const { show } = useFeedback()
  const [running, setRunning] = useState(false)
  const [suggestions, setSuggestions] = useState<readonly Suggestion[]>([])
  const [unplaced, setUnplaced] = useState<readonly Unplaced[]>([])
  const [meta, setMeta] = useState<PlanMeta>(NO_META)
  const [conflicts, setConflicts] = useState<readonly Conflict[]>([])
  const [occupied, setOccupied] = useState<readonly Occupied[]>([])

  /**
   * Ask for a plan. Returns what came back so the caller can present it.
   *
   * With a task id it is an overlap fix: that one task, planned alone, without AI.
   */
  const run = useCallback(async (rescheduleTaskId?: string): Promise<readonly Suggestion[]> => {
    setRunning(true)
    try {
      // `ai: true` opts this build into AI planning. Older builds send nothing and
      // keep the faster rules planner until they are updated (see the backend's
      // rollout.ts).
      const response = await fetchPlan(rescheduleTaskId)
      const parts = partsOf(response.data)
      const next = parts.suggestions
      setSuggestions(next)
      setUnplaced(parts.unplaced)
      setMeta(planMetaFrom(response.data))
      setConflicts(parts.conflicts)
      setOccupied(parts.occupied)
      track({ name: 'auto_schedule_run', params: { suggested: next.length } })

      if (announcesEmptyPlan(response.data, next)) {
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
      setUnplaced([])
      setMeta(NO_META)
      return []
    } finally {
      setRunning(false)
    }
  }, [show])

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
    setSuggestions((current) => current.map((s) => (s.task_id === taskId ? retimed(s, start) : s)))
  }, [])

  return { run, running, suggestions, unplaced, meta, dismiss, conflicts, occupied, reschedule, retime }
}
