import { base44 } from '@/services/api'
import type { Task } from '@/types/entities'
import { emptyPlanNotice } from '../logic/autoScheduleNotice'
import type { PlanNotice } from '../logic/autoScheduleNotice'
import type { PlanScope, Unplaced } from '../logic/unplacedReason'
import type { Conflict, Occupied } from '../logic/suggestionEdits'

/**
 * What `autoScheduleTasks` takes and returns, and how the app reads it.
 *
 * Split from `useAutoSchedule` so the hook holds only its state (§3.2).
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

export const NO_META: PlanMeta = { moreToPlan: 0 }

export type AutoScheduleResponse = {
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
export const invokeReschedule = async (taskId: string): Promise<AutoScheduleResponse> =>
  (await base44.functions.invoke('autoScheduleTasks', {
    reschedule_task_id: taskId,
  })) as AutoScheduleResponse

/**
 * The plan, or one task's new time.
 *
 * Today first. Plan My Day used to propose a whole week at once, so asking for help
 * with today pushed work onto Thursday. Later days are a second, optional step for
 * when today is full. A backend that predates `scope` plans the week, as before.
 */
export const fetchPlan = async (
  rescheduleTaskId: string | undefined,
  scope: PlanScope,
): Promise<AutoScheduleResponse> =>
  rescheduleTaskId
    ? invokeReschedule(rescheduleTaskId)
    : ((await base44.functions.invoke('autoScheduleTasks', {
        ai: true,
        scope,
      })) as AutoScheduleResponse)

/** The lists in a response, each defaulting to empty. */
export const partsOf = (data: AutoScheduleResponse['data']) => ({
  suggestions: data?.suggestions ?? [],
  unplaced: data?.unplaced ?? [],
  conflicts: data?.conflicts ?? [],
  occupied: data?.occupied ?? [],
})

/** The plan's metadata, from whatever the backend sent. An older backend sends none. */
export const planMetaFrom = (data: AutoScheduleResponse['data']): PlanMeta => ({
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

/** What to say when a plan comes back empty, or null when the screen already says it. */
export const emptyPlanNoticeFor = (
  data: AutoScheduleResponse['data'],
  suggestions: readonly Suggestion[],
  scope: PlanScope,
): PlanNotice | null =>
  announcesEmptyPlan(data, suggestions)
    ? emptyPlanNotice({ reason: data?.reason, workHours: data?.work_hours, scope })
    : null

export const PLAN_FAILED = "CAPRI couldn't build a plan right now. Please try again."
